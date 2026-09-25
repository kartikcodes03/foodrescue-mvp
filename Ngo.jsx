import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Empty, Err, StatusBadge, useLocate, usePoll } from "../ui";

export default function Ngo() {
  const { user, updateUser } = useAuth();
  const { locate, busy } = useLocate();
  const [needs, setNeeds] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [f, setF] = useState({ servings_needed: 50, category: "any" });
  const [err, setErr] = useState("");
  const load = async () => { setNeeds(await api("/needs/mine")); setIncoming(await api("/donations/incoming")); };
  usePoll(load, 8000);

  const setLoc = async () => {
    try { const p = await locate(); updateUser(await api("/auth/me/location", { method: "PUT", body: p })); }
    catch (e) { setErr(e.message); }
  };
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try { await api("/needs", { method: "POST", body: { ...f, servings_needed: Number(f.servings_needed) } }); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="space-y-4 md:col-span-2">
        {user.lat == null && (
          <div className="card border-mango"><p className="mb-2 text-sm font-semibold">Set your NGO location so we can match nearby food.</p>
            <button className="btn-ghost" disabled={busy} onClick={setLoc}>Use my current location</button></div>)}
        <form onSubmit={submit} className="card space-y-3">
          <h1 className="text-xl font-extrabold">Request food</h1>
          <div><label className="label">Servings needed</label><input type="number" min="1" className="input" value={f.servings_needed} onChange={(e) => setF({ ...f, servings_needed: e.target.value })} /></div>
          <div><label className="label">Food type</label>
            <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              <option value="any">Any</option><option value="cooked">Cooked</option><option value="packaged">Packaged</option><option value="produce">Produce</option><option value="bakery">Bakery</option>
            </select></div>
          <Err msg={err} />
          <button className="btn w-full">Post request</button>
        </form>
        <div className="card"><h2 className="mb-2 font-bold">My requests</h2>
          {needs.length === 0 ? <Empty>No requests yet.</Empty> : needs.map((n) => (
            <div key={n.id} className="mb-2 text-sm"><b>{n.servings_received}/{n.servings_needed}</b> servings · {n.category} · {n.status}
              <div className="mt-1 h-1.5 rounded bg-ink/10"><div className="h-1.5 rounded bg-leaf" style={{ width: `${Math.min(100, (n.servings_received / n.servings_needed) * 100)}%` }} /></div></div>))}
        </div>
      </div>

      <section className="space-y-3 md:col-span-3">
        <h2 className="text-xl font-extrabold">Incoming donations</h2>
        {incoming.length === 0 && <Empty>Nothing matched yet. Post a request and matching donations will show up here.</Empty>}
        {incoming.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold">{d.food_name} · {d.quantity} servings</p>
              <p className="text-sm text-ink/60">From {d.donor_name}{d.volunteer_name && ` · Volunteer: ${d.volunteer_name}`}</p></div>
            <StatusBadge status={d.status} />
          </div>))}
      </section>
    </div>
  );
}
