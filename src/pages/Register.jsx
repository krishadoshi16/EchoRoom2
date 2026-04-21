import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form,    setForm]    = useState({ username:"", email:"", password:"", confirm:"" });
  const [focused, setFocused] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const extractError = (json, status) => {
    if (!json || typeof json !== "object") return `Register failed (${status})`;
    if (typeof json.detail === "string") return json.detail;
    const prioritized = ["confirm_password", "username", "email", "password", "non_field_errors"];
    for (const key of prioritized) {
      const v = json[key];
      if (Array.isArray(v) && v[0]) return String(v[0]);
      if (typeof v === "string" && v) return v;
    }
    for (const value of Object.values(json)) {
      if (Array.isArray(value) && value[0]) return String(value[0]);
      if (typeof value === "string" && value) return value;
    }
    return `Register failed (${status})`;
  };

  const handleRegister = () => {
    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields."); return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match."); return;
    }

    setError("");
    setLoading(true);
    setSuccess(false);

    const API_BASE = "";
    fetch(`${API_BASE}/api/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.username,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(extractError(json, res.status));
        }
        return json;
      })
      .then((json) => {
        if (json?.access) localStorage.setItem("access", json.access);
        if (json?.refresh) localStorage.setItem("refresh", json.refresh);
        localStorage.removeItem("is_admin");
        setLoading(false);
        setSuccess(true);
        navigate("/");
      })
      .catch((e) => {
        setLoading(false);
        setError(String(e?.message || e));
      });
  };

  const fields = [
    { key:"username", label:"Username",         type:"text",     placeholder:"debater_pro" },
    { key:"email",    label:"Email",             type:"email",    placeholder:"you@example.com" },
    { key:"password", label:"Password",          type:"password", placeholder:"••••••••" },
    { key:"confirm",  label:"Confirm Password",  type:"password", placeholder:"••••••••" },
  ];

  if (success) return (
    <div style={{
      minHeight:"100vh", background:"#08080f",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Space Grotesk',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Grotesk:wght@400;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes popIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
      `}</style>
      <div style={{
        textAlign:"center", background:"rgba(255,255,255,0.03)",
        border:"1px solid rgba(0,245,212,0.2)", borderRadius:24,
        padding:"60px 48px", width:"100%", maxWidth:420,
        animation:"popIn 0.4s ease both", boxShadow:"0 40px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize:56, marginBottom:20 }}>🎙️</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28,
          fontWeight:900, color:"#ffffff", marginBottom:10 }}>Welcome to EchoRoom!</h2>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:15, marginBottom:32, lineHeight:1.6 }}>
          Your voice is ready to be heard.<br/>Pick a debate and jump in.
        </p>
        <button onClick={() => navigate("/")} style={{
          background:"linear-gradient(135deg,#00f5d4,#00b4d8)", border:"none",
          color:"#08080f", padding:"14px 36px", borderRadius:10,
          fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif",
        }}>Start Debating →</button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh", background:"#08080f",
      fontFamily:"'Space Grotesk',sans-serif",
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        input::placeholder{color:rgba(255,255,255,0.2)} input:focus{outline:none}
      `}</style>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", top:"10%", right:"15%", width:320, height:320, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(162,155,254,0.08) 0%,transparent 70%)", animation:"float 9s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"20%", left:"8%", width:280, height:280, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,245,212,0.07) 0%,transparent 70%)", animation:"float 11s ease-in-out infinite reverse" }} />
      </div>

      <div style={{
        position:"relative", zIndex:1,
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)",
        borderRadius:24, padding:"48px 44px", width:"100%", maxWidth:440,
        animation:"fadeUp 0.5s ease both", boxShadow:"0 40px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div onClick={() => navigate("/")} style={{ display:"inline-flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:20 }}>
            <div style={{ width:34, height:34, borderRadius:10,
              background:"linear-gradient(135deg,#00f5d4,#00b4d8)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:17, fontWeight:900, color:"#08080f" }}>E</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900,
              background:"linear-gradient(90deg,#ffffff,rgba(255,255,255,0.6))",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>EchoRoom</span>
          </div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#ffffff", marginBottom:6 }}>
            Create your account
          </h2>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:14 }}>Join the debate. Pick a side.</p>
        </div>

        {error && (
          <div style={{ background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.3)",
            borderRadius:8, padding:"10px 14px", marginBottom:16,
            color:"#ff6b6b", fontSize:13, fontFamily:"'Space Mono',monospace" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ display:"block", color:"rgba(255,255,255,0.5)", fontSize:11,
                fontFamily:"'Space Mono',monospace", letterSpacing:1.2, textTransform:"uppercase", marginBottom:7 }}>
                {label}
              </label>
              <input type={type} value={form[key]} onChange={(e) => update(key, e.target.value)}
                onFocus={() => setFocused(key)} onBlur={() => setFocused("")}
                placeholder={placeholder}
                style={{ width:"100%", background:"rgba(255,255,255,0.04)",
                  border:`1px solid ${focused===key ? "rgba(0,245,212,0.5)" : "rgba(255,255,255,0.09)"}`,
                  borderRadius:10, padding:"12px 15px", color:"#ffffff", fontSize:14,
                  fontFamily:"'Space Grotesk',sans-serif", transition:"border-color 0.2s" }} />
            </div>
          ))}

          <button onClick={handleRegister} style={{
            marginTop:6,
            background: loading ? "rgba(0,245,212,0.4)" : "linear-gradient(135deg,#00f5d4,#00b4d8)",
            border:"none", color:"#08080f", padding:"14px", borderRadius:10,
            fontSize:15, fontWeight:700, cursor:"pointer",
            fontFamily:"'Space Grotesk',sans-serif", transition:"all 0.2s",
          }}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </div>

        <p style={{ textAlign:"center", color:"rgba(255,255,255,0.35)", fontSize:14, marginTop:24 }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}
            style={{ color:"#00f5d4", cursor:"pointer", fontWeight:600 }}>Log in</span>
        </p>
      </div>
    </div>
  );
}
