import { useEffect, useState } from "react";
import { api } from "../api";
import Dashboard from "./Dashboard";

export default function Admin() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api("/auth/users").then(setUsers); }, []);
  return (
    <div className="space-y-8">
      <Dashboard />
      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-bold">All users ({users.length})</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-ink/10"><th className="py-2">Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id} className="border-b border-ink/5"><td className="py-2">{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
