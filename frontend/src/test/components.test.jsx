import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../context/useAuth";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";
import { EmptyState, StatusBadge } from "../components/ui";

function renderWithAuth(ui, { user = null, login = vi.fn(), route = "/" } = {}) {
  const value = {
    user,
    isManager: user?.role === "manager",
    isEmployee: user?.role === "employee",
    login,
    register: vi.fn(),
    logout: vi.fn(),
    sessionMessage: ""
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("LoginPage", () => {
  test("shows validation messages and does not call the API when fields are empty", async () => {
    const login = vi.fn();
    renderWithAuth(<LoginPage />, { login });
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test("shows invalid email message", async () => {
    renderWithAuth(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });

  test("calls login with entered credentials", async () => {
    const login = vi.fn().mockResolvedValue({ role: "employee" });
    renderWithAuth(<LoginPage />, { login });
    await userEvent.type(screen.getByLabelText("Email"), "employee2@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith("employee2@example.com", "Password123!");
  });

  test("displays the server error message on failed login", async () => {
    const login = vi.fn().mockRejectedValue(new Error("Invalid email or password"));
    renderWithAuth(<LoginPage />, { login });
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });
});

describe("ProtectedRoute", () => {
  const routes = (
    <Routes>
      <Route path="/login" element={<p>Login screen</p>} />
      <Route path="/dashboard" element={<p>Dashboard screen</p>} />
      <Route path="/secret" element={<ProtectedRoute roles={["manager"]}><p>Manager only</p></ProtectedRoute>} />
    </Routes>
  );

  test("redirects anonymous users to login", () => {
    renderWithAuth(routes, { route: "/secret" });
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  test("redirects employees away from manager pages", () => {
    renderWithAuth(routes, { route: "/secret", user: { id: "1", name: "E", role: "employee" } });
    expect(screen.getByText("Dashboard screen")).toBeInTheDocument();
    expect(screen.queryByText("Manager only")).not.toBeInTheDocument();
  });

  test("allows managers", () => {
    renderWithAuth(routes, { route: "/secret", user: { id: "2", name: "M", role: "manager" } });
    expect(screen.getByText("Manager only")).toBeInTheDocument();
  });
});

describe("UI components", () => {
  test("StatusBadge renders the status with matching style", () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText("approved")).toHaveClass("badge-approved");
  });

  test("EmptyState shows title and message", () => {
    render(<EmptyState title="No shifts yet">Nothing rostered</EmptyState>);
    expect(screen.getByRole("heading", { name: "No shifts yet" })).toBeInTheDocument();
    expect(screen.getByText("Nothing rostered")).toBeInTheDocument();
  });
});
