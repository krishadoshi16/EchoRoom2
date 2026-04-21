import { useNavigate, useLocation } from "react-router-dom";
import { clearSession } from "../lib/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("access"));
  const isAdmin = localStorage.getItem("is_admin") === "true";

  const navLinks = [
    { label: "Browse",     path: "/" },
    { label: "Categories", path: "/categories" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link-btn:hover { color: #ffffff !important; background: rgba(255,255,255,0.08) !important; }
        .nav-login:hover   { border-color: rgba(255,255,255,0.4) !important; color: #ffffff !important; }
        .nav-join:hover    { opacity: 0.88; transform: translateY(-1px); }
      `}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: "rgba(8,8,15,0.92)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 64,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>

        {/* Logo */}
        <div onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #00f5d4, #00b4d8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 900, color: "#08080f",
          }}>E</div>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22, fontWeight: 900, letterSpacing: -0.5,
            background: "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.65))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>EchoRoom</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: "flex", gap: 4 }}>
          {navLinks.map((link) => (
            <button key={link.label} className="nav-link-btn"
              onClick={() => navigate(link.path)}
              style={{
                background: isActive(link.path) ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: isActive(link.path) ? "#ffffff" : "rgba(255,255,255,0.45)",
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                fontSize: 14, fontWeight: 500,
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}>
              {link.label}
            </button>
          ))}
          {isAdmin && (
            <button
              className="nav-link-btn"
              onClick={() => navigate("/admin")}
              style={{
                background: isActive("/admin") ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: isActive("/admin") ? "#ffffff" : "rgba(255,255,255,0.45)",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}
            >
              Admin
            </button>
          )}
          {isLoggedIn && (
            <button
              className="nav-link-btn"
              onClick={() => navigate("/profile")}
              style={{
                background: isActive("/profile") ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: isActive("/profile") ? "#ffffff" : "rgba(255,255,255,0.45)",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "all 0.2s",
              }}
            >
              Profile
            </button>
          )}
        </div>

        {/* Auth */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!isLoggedIn ? (
            <>
              <button className="nav-login" onClick={() => navigate("/login")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.65)", padding: "8px 18px", borderRadius: 8,
                  cursor: "pointer", fontSize: 14,
                  fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
                }}>Log in</button>
              <button className="nav-join" onClick={() => navigate("/register")}
                style={{
                  background: "linear-gradient(135deg, #00f5d4, #00b4d8)",
                  border: "none", color: "#08080f", padding: "8px 20px", borderRadius: 8,
                  cursor: "pointer", fontSize: 14, fontWeight: 700,
                  fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
                }}>Join Now</button>
            </>
          ) : (
            <button
              className="nav-login"
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.65)", padding: "8px 18px", borderRadius: 8,
                cursor: "pointer", fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

