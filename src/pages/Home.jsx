import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";

const API_BASE = "";

function VoteBar({ forVotes, againstVotes }) {
  const total = forVotes + againstVotes;
  const forPct = total > 0 ? Math.round((forVotes / total) * 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: "#00f5d4",
            fontSize: 12,
            fontFamily: "'Space Mono',monospace",
            fontWeight: 700,
          }}
        >
          FOR {forPct}%
        </span>
        <span
          style={{
            color: "#ff6b6b",
            fontSize: 12,
            fontFamily: "'Space Mono',monospace",
            fontWeight: 700,
          }}
        >
          {100 - forPct}% AGAINST
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "#1a1a2e",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${forPct}%`,
            background: "linear-gradient(90deg,#00f5d4,#00b4d8)",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          style={{
            width: `${100 - forPct}%`,
            background: "linear-gradient(90deg,#ff6b6b,#e84393)",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>
    </div>
  );
}

function DebateCard({ debate, index }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/debate/${debate.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 16,
        padding: "24px 28px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${debate.categoryColor}33`
          : "none",
        animationDelay: `${index * 0.08}s`,
        animation: "fadeSlideIn 0.5s ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              background: `${debate.categoryColor}22`,
              color: debate.categoryColor,
              border: `1px solid ${debate.categoryColor}44`,
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontFamily: "'Space Mono',monospace",
            }}
          >
            {debate.category}
          </span>
          {debate.hot && (
            <span
              style={{
                fontSize: 11,
                color: "#ff6b6b",
                fontFamily: "'Space Mono',monospace",
              }}
            >
              🔥 TRENDING
            </span>
          )}
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.3)",
            fontSize: 12,
            fontFamily: "'Space Mono',monospace",
          }}
        >
          {debate.timeAgo}
        </span>
      </div>

      <h3
        style={{
          color: "#ffffff",
          fontSize: 18,
          fontFamily: "'Playfair Display',Georgia,serif",
          fontWeight: 700,
          lineHeight: 1.4,
          margin: "0 0 20px 0",
          letterSpacing: -0.3,
        }}
      >
        {debate.title}
      </h3>

      <VoteBar forVotes={debate.for} againstVotes={debate.against} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          <span
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              fontFamily: "'Space Mono',monospace",
            }}
          >
            💬 {debate.opinions} opinions
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              fontFamily: "'Space Mono',monospace",
            }}
          >
            🗳 {(debate.for + debate.against).toLocaleString()} votes
          </span>
        </div>
        <span
          style={{
            color: debate.categoryColor,
            fontSize: 12,
            fontFamily: "'Space Mono',monospace",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          Enter debate →
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("access"));
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [debates, setDebates] = useState([]);
  const [sort, setSort] = useState("hot"); // hot | new | top
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loadingDebates, setLoadingDebates] = useState(true);

  const displayCategories = [
    { name: "All", color: "#ffffff" },
    ...(categories || []),
  ];

  const filtered = debates;

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/debates/categories/`);
        if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setCategories(json);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDebates = async () => {
      setLoadingDebates(true);
      try {
        const url = new URL(`${API_BASE}/api/debates/topics/`, window.location.origin);
        url.searchParams.set("sort", sort);

        if (activeCategory !== "All") {
          url.searchParams.set("category", activeCategory);
        }
        if (searchQuery.trim()) {
          url.searchParams.set("q", searchQuery.trim());
        }

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Debates fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setDebates(json);
      } catch (e) {
        if (!cancelled) setDebates([]);
      } finally {
        if (!cancelled) setLoadingDebates(false);
      }
    };

    loadDebates();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, sort, searchQuery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080f",
        fontFamily: "'Space Grotesk',sans-serif",
        color: "#ffffff",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(3deg)} }
        @keyframes glow  { 0%,100%{box-shadow:0 0 20px rgba(0,245,212,0.3)} 50%{box-shadow:0 0 40px rgba(0,245,212,0.6)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        input::placeholder{color:rgba(255,255,255,0.25)} input:focus{outline:none}
      `}</style>

      {/* Background orbs */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(0,245,212,0.08) 0%,transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(255,107,107,0.07) 0%,transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "40%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(162,155,254,0.07) 0%,transparent 70%)",
            animation: "float 12s ease-in-out infinite",
          }}
        />
      </div>

      <Navbar />

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 24px 80px",
        }}
      >
        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 56,
            animation: "fadeSlideIn 0.6s ease both",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "rgba(0,245,212,0.1)",
              border: "1px solid rgba(0,245,212,0.25)",
              borderRadius: 100,
              padding: "5px 16px",
              marginBottom: 24,
              fontSize: 12,
              fontFamily: "'Space Mono',monospace",
              color: "#00f5d4",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            🎙 5,400+ Active Debates
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: "clamp(36px,5vw,58px)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              marginBottom: 18,
              background:
                "linear-gradient(180deg,#ffffff 30%,rgba(255,255,255,0.5) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Where Opinions
            <br />
            Find Their Echo
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 16,
              fontWeight: 300,
              maxWidth: 480,
              margin: "0 auto 32px",
              lineHeight: 1.7,
            }}
          >
            Structured debates. Real arguments. Choose a side and make your
            voice heard.
          </p>

          {/* Search */}
          <div
            style={{
              display: "flex",
              gap: 10,
              maxWidth: 480,
              margin: "0 auto",
              background: searchFocused
                ? "rgba(255,255,255,0.07)"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${searchFocused ? "rgba(0,245,212,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 12,
              padding: "4px 4px 4px 16px",
              transition: "all 0.25s",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 16,
                alignSelf: "center",
              }}
            >
              🔍
            </span>
            <input
              placeholder="Search debates..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontSize: 15,
                fontFamily: "'Space Grotesk',sans-serif",
                padding: "10px 0",
              }}
            />
            <button
              style={{
                background: "linear-gradient(135deg,#00f5d4,#00b4d8)",
                border: "none",
                color: "#08080f",
                borderRadius: 9,
                padding: "10px 20px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 14,
              }}
            >
              Search
            </button>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
            marginBottom: 48,
            animation: "fadeSlideIn 0.6s ease 0.1s both",
          }}
        >
          {[
            { label: "Debates Today", value: "284", icon: "⚡" },
            { label: "Active Users", value: "12.4K", icon: "👥" },
            { label: "Votes Cast", value: "891K", icon: "🗳" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "18px 22px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 12,
                  marginTop: 2,
                  fontFamily: "'Space Mono',monospace",
                  letterSpacing: 0.5,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Category filter */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 32,
            animation: "fadeSlideIn 0.6s ease 0.15s both",
          }}
        >
          {displayCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              style={{
                background:
                  activeCategory === cat.name
                    ? `${cat.color}22`
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeCategory === cat.name ? cat.color + "66" : "rgba(255,255,255,0.08)"}`,
                color:
                  activeCategory === cat.name
                    ? cat.color
                    : "rgba(255,255,255,0.5)",
                borderRadius: 8,
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Space Grotesk',sans-serif",
                transition: "all 0.2s",
              }}
            >
              {cat.name}
            </button>
          ))}
          <button
            onClick={() => navigate("/categories")}
            style={{
              marginLeft: "auto",
              background:
                "linear-gradient(135deg,rgba(0,245,212,0.15),rgba(0,180,216,0.15))",
              border: "1px solid rgba(0,245,212,0.3)",
              color: "#00f5d4",
              borderRadius: 8,
              padding: "7px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            + Start a Debate
          </button>
        </div>

        {/* Section header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {activeCategory === "All"
              ? "Trending Debates"
              : `${activeCategory} Debates`}
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "Hot", value: "hot" },
              { label: "New", value: "new" },
              { label: "Top", value: "top" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                style={{
                  border:
                    sort === s.value ? "1px solid rgba(255,107,107,0.3)" : "1px solid transparent",
                  background: sort === s.value ? "rgba(255,107,107,0.15)" : "transparent",
                  color: sort === s.value ? "#ff6b6b" : "rgba(255,255,255,0.3)",
                  borderRadius: 6,
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'Space Mono',monospace",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingDebates ? (
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              Loading debates...
            </div>
          ) : (
            filtered.map((debate, i) => (
              <DebateCard key={debate.id} debate={debate} index={i} />
            ))
          )}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 56,
            background:
              "linear-gradient(135deg,rgba(0,245,212,0.1) 0%,rgba(162,155,254,0.1) 100%)",
            border: "1px solid rgba(0,245,212,0.2)",
            borderRadius: 20,
            padding: "40px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            animation: "fadeSlideIn 0.6s ease 0.5s both",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {isLoggedIn ? "Ready for your next argument?" : "Ready to make your case?"}
            </h3>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {isLoggedIn
                ? "Pick a debate, share your stance, and keep the conversation moving."
                : "Join thousands of debaters. Pick a side. Defend it."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => navigate("/categories")}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)",
                padding: "12px 24px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "'Space Grotesk',sans-serif",
              }}
            >
              Browse Debates
            </button>
            {!isLoggedIn ? (
              <button
                onClick={() => navigate("/register")}
                style={{
                  background: "linear-gradient(135deg,#00f5d4,#00b4d8)",
                  border: "none",
                  color: "#08080f",
                  padding: "12px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                Create Account →
              </button>
            ) : (
              <button
                onClick={() => navigate("/categories")}
                style={{
                  background: "linear-gradient(135deg,#00f5d4,#00b4d8)",
                  border: "none",
                  color: "#08080f",
                  padding: "12px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Space Grotesk',sans-serif",
                }}
              >
                Start a Topic →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
