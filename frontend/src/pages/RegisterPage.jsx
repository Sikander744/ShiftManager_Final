import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { validateRegister, hasErrors } from "../utils/validation";
import { Alert, Field } from "../components/ui";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" }
];

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const found = validateRegister(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/login", { replace: true, state: { registered: true } });
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
        <h2>Join your team on ShiftManager.</h2>
        <p>See your shifts, request leave and get notified when anything changes.</p>
      </section>

      <section className="auth-card">
        <h1>Create employee account</h1>
        <p className="muted">Manager accounts are set up by an administrator.</p>
        <Alert type="error">{serverError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map((f) => (
            <Field key={f.name} id={f.name} label={f.label} error={errors[f.name]} hint={f.hint}>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                value={form[f.name]}
                onChange={handleChange}
                aria-invalid={Boolean(errors[f.name])}
                aria-describedby={errors[f.name] ? `${f.name}-error` : undefined}
              />
            </Field>
          ))}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
