import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { authFetch, getAccessToken, logoutAndRedirect } from "../lib/auth";

const API_BASE = "";

export default function Category() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [categories, setCategories] = useState([]);
  const [debates, setDebates] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDebates, setLoadingDebates] = useState(true);
  const accessToken = getAccessToken();
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicDescription, setNewTopicDescription] = useState("");
  const [newTopicCategory, setNewTopicCategory] = useState("");
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [suggestCategoryName, setSuggestCategoryName] = useState("");
  const [suggestCategoryDescription, setSuggestCategoryDescription] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const activeCategory = categories.find((c) => c.name === selected);
  const displayCategories = [
    { name: "All", color: "#ffffff", icon: "💬", debates: 0, description: "" },
    ...(categories || []),
  ];

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
      } finally {
        if (!cancelled) setLoadingCategories(false);
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
        url.searchParams.set("sort", "hot");
        if (selected) url.searchParams.set("category", selected);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Debates fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setDebates(json);
      } catch {
        if (!cancelled) setDebates([]);
      } finally {
        if (!cancelled) setLoadingDebates(false);
      }
    };
    loadDebates();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div style={{
      minHeight: "100vh", background: "#08080f",
      fontFamily: "'Space Grotesk',sans-serif", color: "#ffffff"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40, animation: "fadeSlideIn 0.5s ease both" }}>
          <h1 style={{
            fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,42px)",
            fontWeight: 900, marginBottom: 10
          }}>
            {selected ? `${activeCategory?.icon || ""} ${selected}` : "All Categories"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
            {selected ? activeCategory?.description : "Browse debates by topic — find what matters to you"}
          </p>
        </div>

        {accessToken && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px" }}>
              <h3 style={{ marginBottom: 10 }}>Create Debate Topic</h3>
              <input value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} placeholder="Topic title" style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#fff" }} />
              <textarea value={newTopicDescription} onChange={(e) => setNewTopicDescription(e.target.value)} placeholder="Description" rows={2} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#fff" }} />
              <div style={{ position: "relative", marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setTopicPickerOpen((v) => !v)}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${topicPickerOpen ? "rgba(0,245,212,0.45)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: newTopicCategory ? "#f0ecff" : "rgba(240,236,255,0.35)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "'Space Grotesk',sans-serif",
                  }}
                >
                  <span>{newTopicCategory || "Select category"}</span>
                  <span style={{ color: "rgba(240,236,255,0.5)", fontSize: 11 }}>{topicPickerOpen ? "▴" : "▾"}</span>
                </button>
                {topicPickerOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "rgba(12,12,22,0.98)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    overflow: "hidden",
                    zIndex: 20,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                    maxHeight: 220,
                    overflowY: "auto",
                  }}>
                    {categories.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setNewTopicCategory(c.name);
                          setTopicPickerOpen(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          background: newTopicCategory === c.name ? "rgba(0,245,212,0.12)" : "transparent",
                          border: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          color: newTopicCategory === c.name ? "#00f5d4" : "rgba(240,236,255,0.85)",
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          fontFamily: "'Space Grotesk',sans-serif",
                        }}
                      >
                        {c.icon ? `${c.icon} ` : ""}{c.name}
                      </button>
                    ))}
                    {categories.length === 0 && (
                      <div style={{ padding: "10px 12px", color: "rgba(240,236,255,0.45)", fontSize: 12 }}>
                        No categories available.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={async () => {
                setActionMessage("");
                const res = await authFetch(`${API_BASE}/api/debates/topics/create/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: newTopicTitle.trim(), description: newTopicDescription.trim(), category: newTopicCategory }),
                });
                if (res.status === 401) return logoutAndRedirect(navigate);
                if (!res.ok) return setActionMessage("Could not submit topic.");
                setNewTopicTitle(""); setNewTopicDescription(""); setNewTopicCategory("");
                setActionMessage("Topic submitted for admin approval.");
              }} style={{ background: "linear-gradient(135deg,#00f5d4,#00b4d8)", border: "none", color: "#08080f", padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                Submit Topic
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px" }}>
              <h3 style={{ marginBottom: 10 }}>Suggest New Category</h3>
              <input value={suggestCategoryName} onChange={(e) => setSuggestCategoryName(e.target.value)} placeholder="Category name" style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#fff" }} />
              <textarea value={suggestCategoryDescription} onChange={(e) => setSuggestCategoryDescription(e.target.value)} placeholder="Description (optional)" rows={2} style={{ width: "100%", marginBottom: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px", color: "#fff" }} />
              <button onClick={async () => {
                setActionMessage("");
                const res = await authFetch(`${API_BASE}/api/debates/categories/suggest/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: suggestCategoryName.trim(), description: suggestCategoryDescription.trim() }),
                });
                if (res.status === 401) return logoutAndRedirect(navigate);
                if (!res.ok) return setActionMessage("Could not submit category suggestion.");
                setSuggestCategoryName(""); setSuggestCategoryDescription("");
                setActionMessage("Category suggestion submitted for admin review.");
              }} style={{ background: "transparent", border: "1px solid rgba(0,245,212,0.45)", color: "#00f5d4", padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
                Suggest Category
              </button>
            </div>
          </div>
        )}
        {actionMessage && (
          <div style={{ marginBottom: 18, color: "rgba(240,236,255,0.75)", fontSize: 13 }}>{actionMessage}</div>
        )}

        {/* Category pills */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40,
          animation: "fadeSlideIn 0.5s ease 0.05s both"
        }}>
          <button onClick={() => setSelected(null)} style={{
            background: !selected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${!selected ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
            color: !selected ? "#ffffff" : "rgba(255,255,255,0.4)",
            borderRadius: 8, padding: "8px 18px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.2s",
          }}>All</button>
          {displayCategories
            .filter((c) => c.name !== "All")
            .map((cat) => (
              <button key={cat.name} onClick={() => setSelected(cat.name === selected ? null : cat.name)} style={{
                background: selected === cat.name ? `${cat.color}22` : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected === cat.name ? cat.color + "55" : "rgba(255,255,255,0.08)"}`,
                color: selected === cat.name ? cat.color : "rgba(255,255,255,0.45)",
                borderRadius: 8, padding: "8px 18px", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.2s",
              }}>{cat.icon} {cat.name} <span style={{ opacity: 0.5, fontSize: 11 }}>({cat.debates})</span></button>
            ))}
        </div>

        {/* Category cards grid (only when nothing selected) */}
        {!selected && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            gap: 16, marginBottom: 48, animation: "fadeSlideIn 0.5s ease 0.1s both"
          }}>
            {loadingCategories ? (
              <div style={{ gridColumn: "1 / -1", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Loading categories...</div>
            ) : (
              categories.map((cat) => (
                <div key={cat.name} onClick={() => setSelected(cat.name)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid rgba(255,255,255,0.07)`,
                    borderRadius: 14, padding: "24px 22px", cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${cat.color}11`;
                    e.currentTarget.style.borderColor = `${cat.color}44`;
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{cat.icon}</div>
                  <h3 style={{
                    fontFamily: "'Playfair Display',serif", fontSize: 18,
                    fontWeight: 700, marginBottom: 6, color: "#ffffff"
                  }}>{cat.name}</h3>
                  <p style={{
                    color: "rgba(255,255,255,0.35)", fontSize: 12,
                    lineHeight: 1.5, marginBottom: 14
                  }}>{cat.description}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      color: cat.color, fontSize: 12,
                      fontFamily: "'Space Mono',monospace", fontWeight: 700
                    }}>
                      {cat.debates} debates
                    </span>
                    <span style={{ color: cat.color, fontSize: 14 }}>→</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Debates list */}
        <div>
          <h2 style={{
            fontFamily: "'Playfair Display',serif", fontSize: 20,
            fontWeight: 700, marginBottom: 20, color: "rgba(255,255,255,0.85)"
          }}>
            {selected ? `${debates.length} Debates in ${selected}` : "All Debates"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loadingDebates ? (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Loading debates...</div>
            ) : (
              debates.map((debate, i) => {
                const total = debate.for + debate.against;
                const forPct = total > 0 ? Math.round((debate.for / total) * 100) : 0;
                return (
                  <div key={debate.id} onClick={() => navigate(`/debate/${debate.id}`)}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderLeft: `3px solid ${debate.categoryColor}`,
                      borderRadius: 14, padding: "20px 24px", cursor: "pointer",
                      transition: "all 0.2s",
                      animationDelay: `${i * 0.06}s`, animation: "fadeSlideIn 0.4s ease both",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.055)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{
                          background: `${debate.categoryColor}22`, color: debate.categoryColor,
                          border: `1px solid ${debate.categoryColor}44`,
                          borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                          letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Space Mono',monospace",
                        }}>{debate.category}</span>
                        {debate.hot && <span style={{ fontSize: 10, color: "#ff6b6b", fontFamily: "'Space Mono',monospace" }}>🔥 HOT</span>}
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{debate.timeAgo}</span>
                    </div>
                    <h3 style={{
                      fontFamily: "'Playfair Display',serif", fontSize: 16,
                      fontWeight: 700, lineHeight: 1.4, marginBottom: 14, color: "#ffffff"
                    }}>
                      {debate.title}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "#00f5d4", fontSize: 11, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>FOR {forPct}%</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#1a1a2e", overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${forPct}%`, background: "linear-gradient(90deg,#00f5d4,#00b4d8)", borderRadius: "2px 0 0 2px" }} />
                        <div style={{ width: `${100 - forPct}%`, background: "linear-gradient(90deg,#ff6b6b,#e84393)", borderRadius: "0 2px 2px 0" }} />
                      </div>
                      <span style={{ color: "#ff6b6b", fontSize: 11, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{100 - forPct}% AGN</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "'Space Mono',monospace", marginLeft: 8 }}>
                        💬 {debate.opinions}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
