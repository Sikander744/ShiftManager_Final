/** Small reusable UI components. */
import { useEffect, useRef } from "react";

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Alert({ type = "info", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">🗓️</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function StatCard({ label, value, tone = "primary", hint }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? "–"}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

/** Field wrapper: label + input + accessible error message. */
export function Field({ id, label, error, children, hint }) {
  return (
    <div className={`field ${error ? "field-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && (
        <small className="field-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

/** Accessible confirmation dialog used before destructive actions. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger", onConfirm, onCancel, busy }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-message">{message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Banner shown when data comes from the offline cache. */
export function CachedNotice({ cachedAt }) {
  if (!cachedAt) return null;
  return (
    <Alert type="warning">
      Offline mode – showing data saved on {new Date(cachedAt).toLocaleString("en-NZ")}. Changes are disabled until you reconnect.
    </Alert>
  );
}
