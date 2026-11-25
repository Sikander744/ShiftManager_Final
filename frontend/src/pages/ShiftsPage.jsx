import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { shiftApi, userApi } from "../api/services";
import { describeError } from "../api/client";
import useCachedResource from "../hooks/useCachedResource";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { Alert, CachedNotice, ConfirmDialog, EmptyState, Field, Spinner } from "../components/ui";
import { formatDate, hasErrors, shiftHours, todayISO, validateShift } from "../utils/validation";

const EMPTY_FORM = { employeeId: "", date: "", startTime: "09:00", endTime: "17:00", location: "" };

export default function ShiftsPage() {
  const { isManager } = useAuth();
  return isManager ? <ManagerShifts /> : <EmployeeShifts />;
}

/* ---------------- Manager: full CRUD ---------------- */
function ManagerShifts() {
  const online = useOnlineStatus();
  const [filters, setFilters] = useState({ employeeId: "", from: todayISO(), to: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [employees, setEmployees] = useState([]);

  const { data: shifts, loading, error, cachedAt, reload } = useCachedResource(
    `manager-shifts:${filters.employeeId}:${filters.from}:${filters.to}`,
    async () => (await shiftApi.list(filters)).shifts
  );
  // Read-only while offline OR while showing cached data (server unreachable)
  const canEdit = online && !cachedAt;

  useEffect(() => {
    userApi.employees().then((d) => setEmployees(d.employees)).catch(() => setEmployees([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  };

  const startEdit = (shift) => {
    setEditingId(shift._id);
    setForm({
      employeeId: shift.employeeId?._id || "",
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      location: shift.location
    });
    setErrors({});
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const found = validateShift(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    const payload = { ...form, location: form.location.trim() };
    try {
      if (editingId) {
        await shiftApi.update(editingId, payload);
        setMessage({ type: "success", text: "Shift updated. The employee has been notified." });
      } else {
        await shiftApi.create(payload);
        setMessage({ type: "success", text: "Shift created. The employee has been notified." });
      }
      resetForm();
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await shiftApi.remove(toDelete._id);
      setMessage({ type: "success", text: "Shift deleted." });
      if (editingId === toDelete._id) resetForm();
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Shift management</h1>
          <p className="muted">Create, update and remove shifts. Overlapping shifts are blocked automatically.</p>
        </div>
      </div>

      {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="grid-sidebar">
        <section className="card" aria-labelledby="shift-form-title">
          <h2 id="shift-form-title">{editingId ? "Edit shift" : "Create shift"}</h2>
          <form onSubmit={handleSubmit} noValidate>
            <Field id="employeeId" label="Employee" error={errors.employeeId}>
              <select id="employeeId" name="employeeId" value={form.employeeId} onChange={handleChange}
                aria-invalid={Boolean(errors.employeeId)}>
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                ))}
              </select>
            </Field>
            <Field id="date" label="Date" error={errors.date}>
              <input id="date" name="date" type="date" value={form.date} onChange={handleChange}
                aria-invalid={Boolean(errors.date)} />
            </Field>
            <div className="form-row">
              <Field id="startTime" label="Start time" error={errors.startTime}>
                <input id="startTime" name="startTime" type="time" value={form.startTime} onChange={handleChange}
                  aria-invalid={Boolean(errors.startTime)} />
              </Field>
              <Field id="endTime" label="End time" error={errors.endTime}>
                <input id="endTime" name="endTime" type="time" value={form.endTime} onChange={handleChange}
                  aria-invalid={Boolean(errors.endTime)} />
              </Field>
            </div>
            <Field id="location" label="Location" error={errors.location} hint="e.g. Front Desk, Kitchen, Warehouse">
              <input id="location" name="location" type="text" maxLength={100} value={form.location}
                onChange={handleChange} aria-invalid={Boolean(errors.location)} />
            </Field>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !canEdit}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create shift"}
              </button>
              {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel edit</button>}
            </div>
            {!online && <small className="muted">You are offline – changes are disabled.</small>}
          </form>
        </section>

        <section className="card" aria-labelledby="shift-list-title">
          <div className="card-header">
            <h2 id="shift-list-title">Roster</h2>
            <span className="muted">{shifts ? `${shifts.length} shift(s)` : ""}</span>
          </div>

          <div className="filters" role="search">
            <label>
              <span>Employee</span>
              <select value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
                <option value="">All employees</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
              </select>
            </label>
            <label>
              <span>From</span>
              <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </label>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => setFilters({ employeeId: "", from: "", to: "" })}>Show all</button>
          </div>

          <CachedNotice cachedAt={cachedAt} />
          {error && <Alert type="error">{describeError(error)}</Alert>}
          {loading && !shifts && <Spinner label="Loading shifts..." />}
          {shifts && shifts.length === 0 && <EmptyState title="No shifts found">Try changing the filters or create a new shift.</EmptyState>}

          {shifts && shifts.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Employee</th><th>Time</th><th>Hours</th><th>Location</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s._id} className={editingId === s._id ? "row-active" : ""}>
                      <td data-label="Date">{formatDate(s.date)}</td>
                      <td data-label="Employee">{s.employeeId?.name || "Unknown"}</td>
                      <td data-label="Time"><span className="time-pill">{s.startTime}–{s.endTime}</span></td>
                      <td data-label="Hours">{shiftHours(s.startTime, s.endTime).toFixed(1)}</td>
                      <td data-label="Location">{s.location}</td>
                      <td className="actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)} disabled={!canEdit}
                          aria-label={`Edit shift for ${s.employeeId?.name} on ${s.date}`}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setToDelete(s)} disabled={!canEdit}
                          aria-label={`Delete shift for ${s.employeeId?.name} on ${s.date}`}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this shift?"
        message={toDelete ? `${toDelete.employeeId?.name} · ${formatDate(toDelete.date)} · ${toDelete.startTime}–${toDelete.endTime} at ${toDelete.location}. This cannot be undone.` : ""}
        confirmLabel="Delete shift"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

/* ---------------- Employee: read-only own shifts ---------------- */
function EmployeeShifts() {
  const [showPast, setShowPast] = useState(false);
  const { data: shifts, loading, error, cachedAt } = useCachedResource(
    "my-shifts",
    async () => (await shiftApi.list()).shifts
  );

  const today = todayISO();
  const visible = useMemo(
    () => (shifts || []).filter((s) => (showPast ? s.date < today : s.date >= today)),
    [shifts, showPast, today]
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My shifts</h1>
          <p className="muted">Your roster is saved on this device so you can check it offline.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Shift period">
          <button role="tab" aria-selected={!showPast} className={!showPast ? "active" : ""} onClick={() => setShowPast(false)}>Upcoming</button>
          <button role="tab" aria-selected={showPast} className={showPast ? "active" : ""} onClick={() => setShowPast(true)}>Past</button>
        </div>
      </div>

      <CachedNotice cachedAt={cachedAt} />
      {error && <Alert type="error">{describeError(error)}</Alert>}
      {loading && !shifts && <Spinner label="Loading your shifts..." />}

      {shifts && (
        <section className="card">
          {visible.length === 0 ? (
            <EmptyState title={showPast ? "No past shifts" : "No upcoming shifts"}>
              {showPast ? "Completed shifts will appear here." : "New shifts from your manager will appear here."}
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Hours</th><th>Location</th><th>Last changed</th></tr></thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s._id}>
                      <td data-label="Date">{formatDate(s.date)}</td>
                      <td data-label="Time"><span className="time-pill">{s.startTime}–{s.endTime}</span></td>
                      <td data-label="Hours">{shiftHours(s.startTime, s.endTime).toFixed(1)}</td>
                      <td data-label="Location">{s.location}</td>
                      <td data-label="Last changed" className="muted">
                        {new Date(s.updatedAt).toLocaleString("en-NZ")}
                        {s.updatedAt !== s.createdAt && <span className="badge badge-info">changed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
