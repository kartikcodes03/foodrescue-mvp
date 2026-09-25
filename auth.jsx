import { createContext, useContext, useState } from "react";
import { api } from "./api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  const save = ({ access_token, user }) => {
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
    return user;
  };
  const login = async (body) => save(await api("/auth/login", { method: "POST", body }));
  const register = async (body) => save(await api("/auth/register", { method: "POST", body }));
  const updateUser = (u) => { localStorage.setItem("user", JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.clear(); setUser(null); };

  return <Ctx.Provider value={{ user, login, register, logout, updateUser }}>{children}</Ctx.Provider>;
}
