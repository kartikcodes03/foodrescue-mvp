import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Empty, Err, StatusBadge, useLocate, usePoll } from "../ui";

export default function Volunteer() {
  const { user, updateUser } = useAuth();
  const { locate, busy } = useLocate();
  const [avail, setAvail] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [route, setRoute] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setAvail(await api("/donations/available"));
    setTasks(await api("/donations/tasks"));
    setRoute(user.lat != null ? await api("/donations/route").catch(() => null) : null);
  };
  usePoll(load, 6000, [user.lat]);

  const act = (id, action) => api(`/donations/${id}/${action}`, { method: "POST" }).then(load).catch((e) => setErr(e.message));
  const setLoc = async () => {
    try { const p = await locate(); updateUser(await api("/auth/me/location", { method: "PUT", body: p })); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Volunteer tasks</h1>
        <button className="btn-ghost" disabled={busy} onClick={setLoc}>{user.lat != null ? "Update my location" : "Set my location"}</button>
      </div>
      <Err msg={err} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-bold">Open pickups near you</h2>
          {avail.length === 0 && <Empty>No open pickups right now. New ones appear here as soon as they are matched.</Empty>}
          {avail.map((d) => (
            <div key={d.id} className="card">
              <p className="font-bold">{d.food_name} · {d.quantity} servings</p>
              <p className="text-sm text-ink/60">{d.donor_name} → {d.ngo_name}{d.distance_km != null && ` · ${d.distance_km} km from you`}</p>
              <button className="btn mt-3" onClick={() => act(d.id, "accept")}>Accept task</button>
            </div>))}
        </section>

        <section className="space-y-3">
          <h2 className="font-bold">My tasks</h2>
          {tasks.length === 0 && <Empty>You have no active tasks.</Empty>}
          {tasks.map((d) => (
            <div key={d.id} className="card">
              <div className="flex items-center justify-between"><p className="font-bold">{d.food_name}</p><StatusBadge status={d.status} /></div>
              <p className="text-sm text-ink/60">Pickup: {d.donor_name}{d.address && `, ${d.address}`}<br />Drop: {d.ngo_name}{d.ngo_address && `, ${d.ngo_address}`}</p>
              {d.status === "assigned" && <button className="btn mt-3" onClick={() => act(d.id, "pickup")}>Mark picked up</button>}
              {d.status === "picked_up" && <button className="btn mt-3" onClick={() => act(d.id, "deliver")}>Mark delivered</button>}
            </div>))}
        </section>
      </div>

      {route?.stops?.length > 0 && (
        <section className="card">
          <h2 className="font-bold">Suggested route · {route.total_km} km · about {route.total_min} min</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            {route.stops.map((s, i) => (
              <li key={i}><b>{s.type === "pickup" ? "Pick up" : "Drop"}</b> {s.food} at {s.place} <span className="text-ink/60">({s.leg_km} km, ETA {s.eta_min} min)</span></li>))}
          </ol>
        </section>)}
    </div>
  );
}
