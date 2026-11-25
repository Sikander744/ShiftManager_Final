import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { leaveApi, shiftApi, userApi } from "../api/services";
import { describeError } from "../api/client";
import useCachedResource from "../hooks/useCachedResource";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { Alert, CachedNotice, ConfirmDialog, EmptyState, Spinner, StatCard, StatusBadge } from "../components/ui";
import { daysBetween, formatDate, shiftHours, todayISO } from "../utils/validation";

export default function DashboardPage() {
  const { isManager } = useAuth();
  return isManager ? <ManagerDashboard /> : <EmployeeDashboard />;
}

function ManagerDashboard() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const [message, setMessage] = useState(null);
  const [pendingReview, setPendingReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, cachedAt, reload } = useCachedResource("manager-dashboard", async () => {
    const [stats, shifts, leaves] = await Promise.all([
      userApi.stats(),
      shiftApi.list({ from: todayISO() }),
      leaveApi.list({ status: "pending" })
    ]);
    return { stats, shifts: shifts.shifts, leaves: leaves.leaves };
  });
  // Read-only while offline OR while showing cached data (server unreachable)
  const canEdit = online && !cachedAt;

  const confirmReview = async () => {
    setBusy(true);
    try {
      await leaveApi.review(pendingReview.leave._id, pendingReview.status);
      setMessage({ type: "success", text: `Leave request ${pendingReview.status}.` });
      await reload();
    } catch (err) {
      setMessage({ type: "error", text: describeError(err) });
    } finally {
      setBusy(false);
      setPendingReview(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Manager dashboard</h1>
          <p className="muted">Kia ora {user.name} – here is today’s overview.</p>
        </div>
        <Link to="/shifts" className="btn btn-primary">+ Create shift</Link>
      </div>

      <CachedNotice cachedAt={cachedAt} />
      {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {error && <Alert type="error">{describeError(error)}</Alert>}
      {loading && !data && <Spinner label="Loading dashboard..." />}

      {data && (
        <>
          <section className="stats-grid" aria-label="Summary statistics">
            <StatCard label="Total employees" value={data.stats.totalEmployees} />
            <StatCard label="Upcoming shifts" value={data.stats.upcomingShifts} tone="info" hint="From today onwards" />
            <StatCard label="Pending leave" value={data.stats.pendingLeaves} tone="warning" hint="Awaiting your decision" />
          </section>

          <div className="grid-2">
            <section className="card">
              <div className="card-header">
                <h2>Upcoming shifts</h2>
                <Link to="/shifts">Manage</Link>
              </div>
              {data.shifts.length === 0 ? (
                <EmptyState title="No upcoming shifts">Create a shift to start building the roster.</EmptyState>
              ) : (
                <ul className="list">
                  {data.shifts.slice(0, 6).map((s) => (
                    <li key={s._id} className="list-item">
                      <div>
                        <strong>{s.employeeId?.name || "Unknown employee"}</strong>
                        <span className="muted">{formatDate(s.date)} · {s.location}</span>
                      </div>
                      <span className="time-pill">{s.startTime}–{s.endTime}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Pending leave requests</h2>
                <Link to="/leave">View all</Link>
              </div>
              {data.leaves.length === 0 ? (
                <EmptyState title="All caught up">There are no leave requests waiting for review.</EmptyState>
              ) : (
                <ul className="list">
                  {data.leaves.slice(0, 6).map((l) => (
                    <li key={l._id} className="list-item list-item-wrap">
                      <div>
                        <strong>{l.employeeId?.name}</strong>
                        <span className="muted">
                          {formatDate(l.startDate)} → {formatDate(l.endDate)} ({daysBetween(l.startDate, l.endDate)} day/s)
                        </span>
                        <span className="reason">“{l.reason}”</span>
                      </div>
                      <div className="actions">
                        <button className="btn btn-success btn-sm" disabled={!canEdit}
                          onClick={() => setPendingReview({ leave: l, status: "approved" })}>Approve</button>
                        <button className="btn btn-danger btn-sm" disabled={!canEdit}
                          onClick={() => setPendingReview({ leave: l, status: "rejected" })}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingReview)}
        title={pendingReview?.status === "approved" ? "Approve leave?" : "Reject leave?"}
        message={pendingReview ? `${pendingReview.leave.employeeId?.name}: ${formatDate(pendingReview.leave.startDate)} to ${formatDate(pendingReview.leave.endDate)}. This decision is final and the employee will be notified.` : ""}
        confirmLabel={pendingReview?.status === "approved" ? "Approve" : "Reject"}
        tone={pendingReview?.status === "approved" ? "success" : "danger"}
        busy={busy}
        onConfirm={confirmReview}
        onCancel={() => setPendingReview(null)}
      />
    </>
  );
}

function EmployeeDashboard() {
  const { user } = useAuth();
  const { data, loading, error, cachedAt } = useCachedResource("employee-dashboard", async () => {
    const [shifts, leaves] = await Promise.all([shiftApi.list({ from: todayISO() }), leaveApi.list()]);
    return { shifts: shifts.shifts, leaves: leaves.leaves };
  });

  const next = data?.shifts[0];
  const counts = (data?.leaves || []).reduce((acc, l) => ({ ...acc, [l.status]: (acc[l.status] || 0) + 1 }), {});
  const weekHours = (data?.shifts || []).slice(0, 7).reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted">Your roster and leave at a glance.</p>
        </div>
        <Link to="/leave" className="btn btn-primary">+ Request leave</Link>
      </div>

      <CachedNotice cachedAt={cachedAt} />
      {error && <Alert type="error">{describeError(error)}</Alert>}
      {loading && !data && <Spinner label="Loading your dashboard..." />}

      {data && (
        <>
          <section className="next-shift card" aria-label="Next scheduled shift">
            <span className="eyebrow">Next shift</span>
            {next ? (
              <>
                <h2>{formatDate(next.date)}</h2>
                <p className="next-shift-time">{next.startTime} – {next.endTime}</p>
                <p className="muted">📍 {next.location}</p>
              </>
            ) : (
              <p>No upcoming shifts scheduled.</p>
            )}
          </section>

          <section className="stats-grid" aria-label="Summary statistics">
            <StatCard label="Upcoming shifts" value={data.shifts.length} tone="info" />
            <StatCard label="Hours (next 7 shifts)" value={weekHours.toFixed(1)} />
            <StatCard label="Pending leave" value={counts.pending || 0} tone="warning" />
            <StatCard label="Approved leave" value={counts.approved || 0} tone="success" />
          </section>

          <div className="grid-2">
            <section className="card">
              <div className="card-header"><h2>My upcoming shifts</h2><Link to="/shifts">View all</Link></div>
              {data.shifts.length === 0 ? (
                <EmptyState title="No shifts yet">Your manager has not rostered you on yet.</EmptyState>
              ) : (
                <ul className="list">
                  {data.shifts.slice(0, 5).map((s) => (
                    <li key={s._id} className="list-item">
                      <div><strong>{formatDate(s.date)}</strong><span className="muted">{s.location}</span></div>
                      <span className="time-pill">{s.startTime}–{s.endTime}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="card-header"><h2>My leave requests</h2><Link to="/leave">Manage</Link></div>
              {data.leaves.length === 0 ? (
                <EmptyState title="No leave requests">Submit a request from the leave page.</EmptyState>
              ) : (
                <ul className="list">
                  {data.leaves.slice(0, 5).map((l) => (
                    <li key={l._id} className="list-item">
                      <div><strong>{formatDate(l.startDate)} → {formatDate(l.endDate)}</strong><span className="muted">{l.reason}</span></div>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
