import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);

    const API_BASE = "";
    fetch(`${API_BASE}/api/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = json?.detail || `Login failed (${res.status})`;
          throw new Error(detail);
        }
        if (json?.access) localStorage.setItem("access", json.access);
        if (json?.refresh) localStorage.setItem("refresh", json.refresh);
        if (json?.access) {
          const adminRes = await fetch(`${API_BASE}/api/admin/stats/`, {
            headers: { Authorization: `Bearer ${json.access}` },
          });
          if (adminRes.ok) localStorage.setItem("is_admin", "true");
          else localStorage.removeItem("is_admin");
        }
        return json;
      })
      .then(() => {
        setLoading(false);
        navigate("/");
      })
      .catch((e) => {
        setLoading(false);
        setError(String(e?.message || e));
      });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#08080f",
      fontFamily: "'Space Grotesk',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        input::placeholder{color:rgba(255,255,255,0.2)} input:focus{outline:none}
      `}</style>

      {/* Blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "15%", left: "10%", width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(0,245,212,0.07) 0%,transparent 70%)", animation: "float 8s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute", bottom: "15%", right: "10%", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(255,107,107,0.06) 0%,transparent 70%)", animation: "float 10s ease-in-out infinite reverse"
        }} />
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 24, padding: "48px 44px", width: "100%", maxWidth: 420,
        animation: "fadeUp 0.5s ease both", boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#00f5d4,#00b4d8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900, color: "#08080f"
            }}>E</div>
            <span style={{
              fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900,
              background: "linear-gradient(90deg,#ffffff,rgba(255,255,255,0.6))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>EchoRoom</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>
            Welcome back
          </h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>Log in to continue debating</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            color: "#ff6b6b", fontSize: 13, fontFamily: "'Space Mono',monospace"
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{
              display: "block", color: "rgba(255,255,255,0.5)", fontSize: 11,
              fontFamily: "'Space Mono',monospace", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7
            }}>
              Username
            </label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused("username")} onBlur={() => setFocused("")}
              placeholder="your_username"
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: `1px solid ${focused === "username" ? "rgba(0,245,212,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 10, padding: "13px 16px", color: "#ffffff", fontSize: 15,
                fontFamily: "'Space Grotesk',sans-serif", transition: "border-color 0.2s"
              }} />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <label style={{
                color: "rgba(255,255,255,0.5)", fontSize: 11,
                fontFamily: "'Space Mono',monospace", letterSpacing: 1.2, textTransform: "uppercase"
              }}>
                Password
              </label>
              <span style={{ color: "#00f5d4", fontSize: 12, cursor: "pointer", fontFamily: "'Space Mono',monospace" }}>
                Forgot?
              </span>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
              placeholder="••••••••"
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: `1px solid ${focused === "password" ? "rgba(0,245,212,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 10, padding: "13px 16px", color: "#ffffff", fontSize: 15,
                fontFamily: "'Space Grotesk',sans-serif", transition: "border-color 0.2s"
              }} />
          </div>

          <button onClick={handleLogin} style={{
            marginTop: 8,
            background: loading ? "rgba(0,245,212,0.4)" : "linear-gradient(135deg,#00f5d4,#00b4d8)",
            border: "none", color: "#08080f", padding: "14px", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.2s",
          }}>
            {loading ? "Logging in..." : "Log In →"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "'Space Mono',monospace" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}
            style={{ color: "#00f5d4", cursor: "pointer", fontWeight: 600 }}>Sign up free</span>
        </p>
      </div>
    </div>
  );
}
