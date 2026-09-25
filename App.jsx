import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Donor from "./pages/Donor";
import Ngo from "./pages/Ngo";
import Volunteer from "./pages/Volunteer";
import Admin from "./pages/Admin";

// Role-based route guard
function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="border-b border-ink/10 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-extrabold text-leaf">FoodRescue</Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            {user ? (
              <>
                <Link to={`/${user.role}`} className="hover:text-leaf">My {user.role} page</Link>
                <span className="text-ink/60">{user.name}</span>
                <button className="btn-ghost" onClick={logout}>Log out</button>
              </>
            ) : (
              <><Link to="/login">Log in</Link><Link to="/register" className="btn">Join</Link></>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/donor" element={<Guard role="donor"><Donor /></Guard>} />
          <Route path="/ngo" element={<Guard role="ngo"><Ngo /></Guard>} />
          <Route path="/volunteer" element={<Guard role="volunteer"><Volunteer /></Guard>} />
          <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
        </Routes>
      </main>
    </>
  );
}
