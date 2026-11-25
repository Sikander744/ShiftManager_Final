import { useEffect, useState } from "react";
import { enablePush, disablePush, getCurrentSubscription, isPushSupported } from "../services/pushService";

/** Navbar button that turns push notifications on/off for this browser. */
export default function NotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    getCurrentSubscription()
      .then((sub) => setEnabled(Boolean(sub) && Notification.permission === "granted"))
      .catch(() => setEnabled(false));
  }, [supported]);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush();
        setEnabled(true);
        setMessage("Notifications enabled");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  return (
    <span className="notif-wrap">
      <button
        type="button"
        className={`btn btn-sm ${enabled ? "btn-success" : "btn-ghost"}`}
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        title={enabled ? "Disable push notifications" : "Enable push notifications"}
      >
        {enabled ? "🔔 On" : "🔕 Notifications"}
      </button>
      {message && <span className="notif-msg" role="status">{message}</span>}
    </span>
  );
}
