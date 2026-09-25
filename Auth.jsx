import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Err, useLocate } from "../ui";

export default function Auth({ mode }) {
  const isReg = mode === "register";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const { locate, busy } = useLocate();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "donor", phone: "", address: "", lat: null, lng: null });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const u = isReg ? await register(f) : await login({ email: f.email, password: f.password });
      nav(`/${u.role}`);
    } catch (e) { setErr(e.message); }
  };

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">{isReg ? "Join FoodRescue" : "Log in"}</h1>
      {isReg && <>
        <div><label className="label">Name / organisation</label><input className="input" required value={f.name} onChange={set("name")} /></div>
        <div><label className="label">I am a</label>
          <select className="input" value={f.role} onChange={set("role")}>
            <option value="donor">Donor (restaurant, hostel, event)</option>
            <option value="ngo">NGO</option><option value="volunteer">Volunteer</option>
          </select></div>
      </>}
      <div><label className="label">Email</label><input type="email" className="input" required value={f.email} onChange={set("email")} /></div>
      <div><label className="label">Password</label><input type="password" minLength={6} className="input" required value={f.password} onChange={set("password")} /></div>
      {isReg && <>
        <div><label className="label">Address</label><input className="input" value={f.address} onChange={set("address")} /></div>
        <button type="button" className="btn-ghost" disabled={busy}
          onClick={() => locate().then((p) => setF({ ...f, ...p })).catch((e) => setErr(e.message))}>
          {f.lat ? `Location saved (${f.lat.toFixed(3)}, ${f.lng.toFixed(3)})` : "Use my current location"}
        </button>
      </>}
      <Err msg={err} />
      <button className="btn w-full">{isReg ? "Create account" : "Log in"}</button>
      <p className="text-sm text-ink/70">{isReg ? <>Already a member? <Link className="font-semibold text-leaf" to="/login">Log in</Link></> : <>New here? <Link className="font-semibold text-leaf" to="/register">Create an account</Link></>}</p>
    </form>
  );
}
