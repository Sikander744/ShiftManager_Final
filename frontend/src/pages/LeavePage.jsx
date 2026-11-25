import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { leaveApi } from "../api/services";
import { describeError } from "../api/client";
import useCachedResource from "../hooks/useCachedResource";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { Alert, CachedNotice, ConfirmDialog, EmptyState, Field, Spinner, StatusBadge } from "../components/ui";
import { daysBetween, formatDate, hasErrors, todayISO, validateLeave } from "../utils/validation";

const EMPTY_FORM = { startDate: "", endDate: "", reason: "" };

export default function LeavePage() {
  const { isManager } = useAuth();
  return isManager ? <ManagerLeave /> : <EmployeeLeave />;
}

/* ---------------- Employee: create / view / edit / cancel ---------------- */
function EmployeeLeave() {
  const online = useOnlineStatus();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { data: leaves, loading, error, cachedAt, reload } = useCachedResource(
    "my-leave",
    async () => (await leaveApi.list()).leaves
  );
  // Read-only while offline OR while showing cached data (server unreachable)
  const canEdit = online && !cachedAt;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  };

  const startEdit = (leave) => {
    setEditingId(leave._id);
    setForm({ startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const found = validateLeave(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSaving(true);
    const payload = { ...form, reason: form.reason.trim() };
    try {
      if (editingId) {
        await leaveApi.update(editingId, payload);
        setMessage({ type: "success", text: "Leave request updated." });
      } else {
        await leaveApi.create(payload);
        setMessage({ type: "success", text: "Leave request submitted. Your manager has been notified." });
      }
      resetForm();
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await leaveApi.cancel(toCancel._id);
      setMessage({ type: "success", text: "Leave request cancelled." });
      if (editingId === toCancel._id) resetForm();
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setCancelling(false);
      setToCancel(null);
    }
  };

  const days = daysBetween(form.startDate, form.endDate);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My leave</h1>
          <p className="muted">Submit leave requests and track your manager’s decisions.</p>
        </div>
      </div>

      {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <div className="grid-sidebar">
        <section className="card" aria-labelledby="leave-form-title">
          <h2 id="leave-form-title">{editingId ? "Edit pending request" : "Request leave"}</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <Field id="startDate" label="Start date" error={errors.startDate}>
                <input id="startDate" name="startDate" type="date" min={editingId ? undefined : todayISO()}
                  value={form.startDate} onChange={handleChange} aria-invalid={Boolean(errors.startDate)} />
              </Field>
              <Field id="endDate" label="End date" error={errors.endDate}>
                <input id="endDate" name="endDate" type="date" min={form.startDate || undefined}
                  value={form.endDate} onChange={handleChange} aria-invalid={Boolean(errors.endDate)} />
              </Field>
            </div>
            {days > 0 && <p className="muted">{days} day{days > 1 ? "s" : ""} requested</p>}
            <Field id="reason" label="Reason" error={errors.reason} hint={`${form.reason.length}/500 characters`}>
              <textarea id="reason" name="reason" rows={4} maxLength={500} value={form.reason}
                onChange={handleChange} aria-invalid={Boolean(errors.reason)} />
            </Field>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !canEdit}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Submit request"}
              </button>
              {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel edit</button>}
            </div>
            {!online && <small className="muted">You are offline – changes are disabled.</small>}
          </form>
        </section>

        <section className="card" aria-labelledby="leave-history-title">
          <div className="card-header">
            <h2 id="leave-history-title">Request history</h2>
            <span className="muted">{leaves ? `${leaves.length} request(s)` : ""}</span>
          </div>
          <CachedNotice cachedAt={cachedAt} />
          {error && <Alert type="error">{describeError(error)}</Alert>}
          {loading && !leaves && <Spinner label="Loading leave requests..." />}
          {leaves && leaves.length === 0 && <EmptyState title="No leave requests yet">Use the form to submit your first request.</EmptyState>}

          {leaves && leaves.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Decision</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id} className={editingId === l._id ? "row-active" : ""}>
                      <td data-label="Dates">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                      <td data-label="Days">{daysBetween(l.startDate, l.endDate)}</td>
                      <td data-label="Reason" className="reason-cell">{l.reason}</td>
                      <td data-label="Status"><StatusBadge status={l.status} /></td>
                      <td data-label="Decision" className="muted">
                        {l.reviewedAt ? `${l.reviewedBy?.name || "Manager"}, ${new Date(l.reviewedAt).toLocaleDateString("en-NZ")}` : "—"}
                      </td>
                      <td className="actions">
                        {l.status === "pending" ? (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(l)} disabled={!canEdit}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setToCancel(l)} disabled={!canEdit}>Cancel</button>
                          </>
                        ) : (
                          <span className="muted small">Final</span>
                        )}
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
        open={Boolean(toCancel)}
        title="Cancel this leave request?"
        message={toCancel ? `${formatDate(toCancel.startDate)} to ${formatDate(toCancel.endDate)} will be removed.` : ""}
        confirmLabel="Cancel request"
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

/* ---------------- Manager: review all requests ---------------- */
const TABS = ["pending", "approved", "rejected", "all"];

function ManagerLeave() {
  const online = useOnlineStatus();
  const [tab, setTab] = useState("pending");
  const [message, setMessage] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data: leaves, loading, error, cachedAt, reload } = useCachedResource(
    `manager-leave:${tab}`,
    async () => (await leaveApi.list(tab === "all" ? {} : { status: tab })).leaves
  );
  const canEdit = online && !cachedAt;

  const confirmReview = async () => {
    setBusy(true);
    try {
      await leaveApi.review(review.leave._id, review.status);
      setMessage({ type: "success", text: `Request ${review.status}. ${review.leave.employeeId?.name} has been notified.` });
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setBusy(false);
      setReview(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leave approvals</h1>
          <p className="muted">Review leave requests from your team. Decisions are final.</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Filter by status">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <CachedNotice cachedAt={cachedAt} />
      {error && <Alert type="error">{describeError(error)}</Alert>}
      {loading && !leaves && <Spinner label="Loading leave requests..." />}

      {leaves && (
        <section className="card">
          {leaves.length === 0 ? (
            <EmptyState title={`No ${tab === "all" ? "" : tab} requests`}>Nothing to show for this filter.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Employee</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Submitted</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td data-label="Employee"><strong>{l.employeeId?.name}</strong><br /><span className="muted small">{l.employeeId?.email}</span></td>
                      <td data-label="Dates">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                      <td data-label="Days">{daysBetween(l.startDate, l.endDate)}</td>
                      <td data-label="Reason" className="reason-cell">{l.reason}</td>
                      <td data-label="Status"><StatusBadge status={l.status} /></td>
                      <td data-label="Submitted" className="muted">{new Date(l.createdAt).toLocaleDateString("en-NZ")}</td>
                      <td className="actions">
                        {l.status === "pending" ? (
                          <>
                            <button className="btn btn-success btn-sm" disabled={!canEdit} onClick={() => setReview({ leave: l, status: "approved" })}>Approve</button>
                            <button className="btn btn-danger btn-sm" disabled={!canEdit} onClick={() => setReview({ leave: l, status: "rejected" })}>Reject</button>
                          </>
                        ) : (
                          <span className="muted small">by {l.reviewedBy?.name || "manager"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(review)}
        title={review?.status === "approved" ? "Approve leave?" : "Reject leave?"}
        message={review ? `${review.leave.employeeId?.name}: ${formatDate(review.leave.startDate)} to ${formatDate(review.leave.endDate)} – “${review.leave.reason}”. This decision is final.` : ""}
        confirmLabel={review?.status === "approved" ? "Approve" : "Reject"}
        tone={review?.status === "approved" ? "success" : "danger"}
        busy={busy}
        onConfirm={confirmReview}
        onCancel={() => setReview(null)}
      />
    </>
  );
}
