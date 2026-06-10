import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("vr_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("vr_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("vr_token", data.token);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      localStorage.setItem("vr_token", data.token);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("vr_token");
    setUser(null);
  };

  const updateProfile = async (payload) => {
    try {
      const { data } = await api.patch("/auth/profile", payload);
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, updateProfile, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
