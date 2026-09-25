import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Empty, Err, StatusBadge, useLocate, usePoll } from "../ui";

export default function Donor() {
  const { user } = useAuth();
  const { locate, busy } = useLocate();
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ food_name: "", category: "cooked", quantity: 20, expiry: "", address: user.address || "", lat: user.lat, lng: user.lng });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const load = async () => setList(await api("/donations/mine"));
  usePoll(load, 8000);

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      await api("/donations", { method: "POST", body: {
        food_name: f.food_name, category: f.category, quantity: Number(f.quantity),
        expiry_time: new Date(f.expiry).toISOString(), address: f.address, lat: f.lat, lng: f.lng } });
      setF({ ...f, food_name: "" }); load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <form onSubmit={submit} className="card space-y-3 md:col-span-2">
        <h1 className="text-xl font-extrabold">Post surplus food</h1>
        <div><label className="label">What food is it?</label><input className="input" required value={f.food_name} onChange={set("food_name")} placeholder="Veg biryani" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Servings</label><input type="number" min="1" className="input" required value={f.quantity} onChange={set("quantity")} /></div>
          <div><label className="label">Type</label>
            <select className="input" value={f.category} onChange={set("category")}>
              <option value="cooked">Cooked</option><option value="packaged">Packaged</option><option value="produce">Produce</option><option value="bakery">Bakery</option>
            </select></div>
        </div>
        <div><label className="label">Safe to eat until</label><input type="datetime-local" className="input" required value={f.expiry} onChange={set("expiry")} /></div>
        <div><label className="label">Pickup address</label><input className="input" value={f.address} onChange={set("address")} /></div>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => locate().then((p) => setF({ ...f, ...p })).catch((e) => setErr(e.message))}>
          {f.lat ? `Pickup pin set (${(+f.lat).toFixed(3)}, ${(+f.lng).toFixed(3)})` : "Use my current location"}
        </button>
        <Err msg={err} />
        <button className="btn w-full">Post donation</button>
      </form>

      <section className="space-y-3 md:col-span-3">
        <h2 className="text-xl font-extrabold">My donations</h2>
        {list.length === 0 && <Empty>Nothing posted yet. Your first donation is matched to a nearby NGO automatically.</Empty>}
        {list.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold">{d.food_name} · {d.quantity} servings</p>
              <p className="text-sm text-ink/60">{d.ngo_name ? `Going to ${d.ngo_name}` : "Looking for an NGO"}{d.volunteer_name && ` · Volunteer: ${d.volunteer_name}`}</p></div>
            <StatusBadge status={d.status} />
          </div>))}
      </section>
    </div>
  );
}
