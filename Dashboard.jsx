import { useState } from "react";
import { api } from "../api";
import { STATUS, StatusBadge, usePoll } from "../ui";

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [recent, setRecent] = useState([]);
  usePoll(async () => {
    const [a, b] = await Promise.all([api("/dashboard/stats"), api("/dashboard/recent")]);
    setS(a); setRecent(b);
  }, 5000);

  const num = (v) => (s ? Number(v).toLocaleString() : "–");
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold text-ink/60">Meals rescued so far</p>
        <p className="text-7xl font-extrabold tracking-tight text-leaf">{num(s?.meals_rescued)}</p>
        <p className="mt-2 max-w-prose text-ink/70">Surplus food from donors, delivered to NGOs by volunteers. This page refreshes every few seconds.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        {[["NGOs served", s?.ngos_served], ["Active donors", s?.donors_active], ["Volunteers on the road", s?.volunteers_active], ["CO₂ avoided (est. kg)", s?.co2_saved_kg]].map(([k, v]) => (
          <div key={k} className="card"><p className="text-3xl font-extrabold">{num(v)}</p><p className="text-sm text-ink/60">{k}</p></div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Donation pipeline</h2>
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS).map((k) => (
            <div key={k} className="min-w-[8rem] flex-1 rounded-lg bg-paper p-3">
              <p className="text-2xl font-extrabold">{s?.by_status?.[k] ?? 0}</p><StatusBadge status={k} />
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Latest activity</h2>
        {recent.length === 0 ? <p className="text-sm text-ink/60">No donations yet. Donors can post the first one.</p> :
          <ul className="divide-y divide-ink/10">
            {recent.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><b>{d.food_name}</b> ({d.quantity} servings) from {d.donor}{d.ngo && <> to {d.ngo}</>}</span>
                <StatusBadge status={d.status} />
              </li>))}
          </ul>}
      </section>
    </div>
  );
}
