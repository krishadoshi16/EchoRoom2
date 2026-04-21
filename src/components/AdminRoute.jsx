import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authFetch, clearSession, getAccessToken } from "../lib/auth";

const API_BASE = "";

export default function AdminRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }

      const res = await authFetch(`${API_BASE}/api/admin/stats/`);
      const ok = res.ok;
      if (ok) localStorage.setItem("is_admin", "true");
      if (!ok) localStorage.removeItem("is_admin");
      if (res.status === 401) clearSession();

      if (!cancelled) {
        setAllowed(ok);
        setChecking(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return children;
}
