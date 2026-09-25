import { useEffect, useState } from "react";

export const STATUS = {
  available: ["Finding an NGO", "bg-ink/10 text-ink"],
  matched: ["Needs a volunteer", "bg-mango/25 text-ink"],
  assigned: ["Volunteer on the way", "bg-sky-100 text-sky-900"],
  picked_up: ["In transit", "bg-sky-200 text-sky-900"],
  delivered: ["Delivered", "bg-leaf-soft text-leaf-dark"],
  expired: ["Expired", "bg-red-100 text-red-800"],
};

export function StatusBadge({ status }) {
  const [text, cls] = STATUS[status] || [status, "bg-ink/10"];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

// callback fn har `ms` par chalata hai (live updates ke liye polling)
export function usePoll(fn, ms = 5000, deps = []) {
  useEffect(() => {
    let alive = true;
    const run = () => fn().catch(() => {});
    run();
    const t = setInterval(() => alive && run(), ms);
    return () => { alive = false; clearInterval(t); };
  }, deps); // eslint-disable-line
}

export function useLocate() {
  const [busy, setBusy] = useState(false);
  const locate = () => new Promise((resolve, reject) => {
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { setBusy(false); reject(new Error("Location permission denied")); },
    );
  });
  return { locate, busy };
}

export const Err = ({ msg }) => (msg ? <p role="alert" className="text-sm font-semibold text-red-700">{msg}</p> : null);
export const Empty = ({ children }) => <p className="rounded-lg border border-dashed border-ink/20 p-4 text-sm text-ink/60">{children}</p>;
