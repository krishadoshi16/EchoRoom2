import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { authFetch, logoutAndRedirect } from "../lib/auth";

const API_BASE = "";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ username: "", email: "", role: "registered" });
  const [activity, setActivity] = useState({ stats: { topics: 0, opinions: 0 }, recentTopics: [], recentOpinions: [] });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm_password: "" });

  const load = async () => {
    setLoading(true);
    setErr("");
    const [meRes, actRes] = await Promise.all([
      authFetch(`${API_BASE}/api/auth/me/`),
      authFetch(`${API_BASE}/api/auth/me/activity/`),
    ]);
    if (meRes.status === 401 || actRes.status === 401) return logoutAndRedirect(navigate);
    if (!meRes.ok || !actRes.ok) {
      setErr("Could not load profile data.");
      setLoading(false);
      return;
    }
    setProfile(await meRes.json());
    setActivity(await actRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = async () => {
    setErr("");
    setMsg("");
    const res = await authFetch(`${API_BASE}/api/auth/me/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username, email: profile.email }),
    });
    if (res.status === 401) return logoutAndRedirect(navigate);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.username?.[0] || j?.email?.[0] || "Profile update failed.");
      return;
    }
    setMsg("Profile updated successfully.");
  };

  const changePassword = async () => {
    setErr("");
    setMsg("");
    const res = await authFetch(`${API_BASE}/api/auth/change-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwords),
    });
    if (res.status === 401) return logoutAndRedirect(navigate);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(
        j?.current_password?.[0] ||
        j?.new_password?.[0] ||
        j?.confirm_password?.[0] ||
        j?.non_field_errors?.[0] ||
        "Password change failed."
      );
      return;
    }
    setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    setMsg("Password changed successfully.");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#08080f", color: "#fff" }}>
        <Navbar />
        <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px" }}>Loading profile...</main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>
      <Navbar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 10 }}>My Profile</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>Manage your account details and activity.</p>
        {msg && <div style={{ marginBottom: 12, color: "#00f5d4" }}>{msg}</div>}
        {err && <div style={{ marginBottom: 12, color: "#ff6b6b" }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Account Info</h3>
            <input value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff" }} />
            <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff" }} />
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 12 }}>Role: {profile.role}</div>
            <button onClick={updateProfile} style={{ background: "linear-gradient(135deg,#00f5d4,#00b4d8)", border: "none", color: "#08080f", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Save Profile</button>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Change Password</h3>
            <input type="password" placeholder="Current password" value={passwords.current_password} onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff" }} />
            <input type="password" placeholder="New password" value={passwords.new_password} onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff" }} />
            <input type="password" placeholder="Confirm new password" value={passwords.confirm_password} onChange={(e) => setPasswords((p) => ({ ...p, confirm_password: e.target.value }))} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, color: "#fff" }} />
            <button onClick={changePassword} style={{ background: "transparent", border: "1px solid rgba(0,245,212,0.45)", color: "#00f5d4", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Update Password</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 8 }}>My Debate Topics ({activity.stats.topics})</h3>
            {activity.recentTopics.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>No topics created yet.</p>
            ) : (
              activity.recentTopics.map((t) => (
                <div key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}>
                  <div>{t.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{t.category} · {t.status}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginBottom: 8 }}>My Opinions ({activity.stats.opinions})</h3>
            {activity.recentOpinions.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>No opinions posted yet.</p>
            ) : (
              activity.recentOpinions.map((o) => (
                <div key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }}>
                  <div style={{ color: "rgba(255,255,255,0.95)" }}>{o.debate}</div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{o.stance} · {o.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
