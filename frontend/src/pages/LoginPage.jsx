import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { validateLogin, hasErrors } from "../utils/validation";
import { Alert, Field } from "../components/ui";

export default function LoginPage() {
  const { user, login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const registered = location.state?.registered;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const found = validateLogin(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (error) {
      setServerError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <img src="/icons/icon-512.png" alt="" width="96" height="96" />
        <h2>Rosters and leave, all in one place.</h2>
        <p>Managers plan shifts and approve leave. Employees always see their latest roster – even offline.</p>
      </section>

      <section className="auth-card">
        <h1>Sign in</h1>
        <p className="muted">Welcome back to ShiftManager</p>

        {registered && <Alert type="success">Account created – please sign in.</Alert>}
        {sessionMessage && <Alert type="warning">{sessionMessage}</Alert>}
        <Alert type="error">{serverError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          <Field id="email" label="Email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
          </Field>
          <Field id="password" label="Password" error={errors.password}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New employee? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}
