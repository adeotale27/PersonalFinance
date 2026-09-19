import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { apiError } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=anon, obj=user
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nivara_token");
    if (!token) { setUser(false); setChecking(false); return; }
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem("nivara_token"); setUser(false); })
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("nivara_token", data.access_token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiError(e) };
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("nivara_token");
    setUser(false);
    window.location.href = "/login";
  }, []);

  return <AuthCtx.Provider value={{ user, checking, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
