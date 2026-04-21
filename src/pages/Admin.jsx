import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import { authFetch, logoutAndRedirect } from "../lib/auth";

const API_BASE = "";

function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const created = new Date(isoString);
  const diffMs = Date.now() - created.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return mins <= 1 ? "1m ago" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours <= 1 ? "1h ago" : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days <= 1 ? "1d ago" : `${days}d ago`;
}

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const accessToken = localStorage.getItem("access");

  const [pending, setPending] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    pending_topics: 0,
    pending_categories: 0,
    approved_topics: 0,
    approved_categories: 0,
    total_users: 0,
    active_users: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryCreateName, setCategoryCreateName] = useState("");
  const [categoryCreateDescription, setCategoryCreateDescription] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryEditName, setCategoryEditName] = useState("");
  const [categoryEditDescription, setCategoryEditDescription] = useState("");

  const authHeaders = useMemo(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const loadAll = async () => {
    if (!accessToken) {
      setError("Admin access requires login.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [statsRes, pendingRes, opinionsRes, usersRes, categoriesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/admin/stats/`, { headers: authHeaders }),
        authFetch(`${API_BASE}/api/admin/pending-topics/`, { headers: authHeaders }),
        authFetch(`${API_BASE}/api/admin/opinions/recent/?limit=50`, { headers: authHeaders }),
        authFetch(`${API_BASE}/api/admin/users/`, { headers: authHeaders }),
        authFetch(`${API_BASE}/api/admin/categories/`, { headers: authHeaders }),
      ]);

      const all = [statsRes, pendingRes, opinionsRes, usersRes, categoriesRes];
      const firstBad = all.find((r) => !r.ok);
      if (firstBad) {
        if (firstBad.status === 401) return logoutAndRedirect(navigate);
        const json = await firstBad.json().catch(() => ({}));
        const detail = json?.detail || `Request failed (${firstBad.status})`;
        throw new Error(String(detail));
      }

      const statsJson = await statsRes.json();
      const pendingJson = await pendingRes.json();
      const opinionsJson = await opinionsRes.json();
      const usersJson = await usersRes.json();
      const categoriesJson = await categoriesRes.json();

      setStats(statsJson);
      setPending(
        (pendingJson || []).map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          author: t.author,
          submitted: formatTimeAgo(t.submittedAt),
        }))
      );
      setOpinions(
        (opinionsJson || []).map((o) => ({
          id: o.id,
          author: o.author,
          text: o.content,
          debate: o.debate,
          reason: `${o.reason} (${o.reportCount})`,
          timeAgo: formatTimeAgo(o.createdAt),
        }))
      );
      setUsers(
        (usersJson || []).map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.roleLabel,
          debates: u.debates,
          status: u.status,
        }))
      );
      setCategories(
        (categoriesJson || []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          status: c.status,
          suggestedBy: c.suggestedBy || null,
          createdAt: c.created_at ? formatTimeAgo(c.created_at) : "",
        }))
      );
    } catch (e) {
      setError(e?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const approveTopic = async (id) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/topics/${id}/approve/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Approve failed (${res.status})`));
      return;
    }
    setPending((p) => p.filter((t) => t.id !== id));
  };

  const rejectTopic = async (id) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/topics/${id}/reject/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Reject failed (${res.status})`));
      return;
    }
    setPending((p) => p.filter((t) => t.id !== id));
  };

  const deleteOpinion = async (id) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/opinions/${id}/`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    if (!res.ok && res.status !== 204) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Delete failed (${res.status})`));
      return;
    }
    setOpinions((f) => f.filter((o) => o.id !== id));
  };

  const dismissFlag = (id) => setOpinions((f) => f.filter((o) => o.id !== id));

  const banUser = async (id, value) => {
    setError("");
    const res = await authFetch(`${API_BASE}/api/admin/users/${id}/ban/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ value }),
    });
    if (res.status === 401) return logoutAndRedirect(navigate);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Ban failed (${res.status})`));
      return;
    }
    await loadAll();
  };

  const suspendUser = async (id, value) => {
    setError("");
    const res = await authFetch(`${API_BASE}/api/admin/users/${id}/suspend/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ value }),
    });
    if (res.status === 401) return logoutAndRedirect(navigate);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Suspend failed (${res.status})`));
      return;
    }
    await loadAll();
  };

  const createCategory = async () => {
    setError("");
    const name = categoryCreateName.trim();
    const description = categoryCreateDescription.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name, description }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Create failed (${res.status})`));
      return;
    }

    setCategoryCreateName("");
    setCategoryCreateDescription("");
    await loadAll();
  };

  const startEditingCategory = (c) => {
    setEditingCategoryId(c.id);
    setCategoryEditName(c.name || "");
    setCategoryEditDescription(c.description || "");
    setError("");
  };

  const saveCategoryUpdate = async () => {
    if (!editingCategoryId) return;
    setError("");

    const name = categoryEditName.trim();
    const description = categoryEditDescription.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/categories/${editingCategoryId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name, description }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Update failed (${res.status})`));
      return;
    }

    setEditingCategoryId(null);
    await loadAll();
  };

  const approveCategory = async (categoryId) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/categories/${categoryId}/approve/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Approve failed (${res.status})`));
      return;
    }
    await loadAll();
  };

  const rejectCategory = async (categoryId) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/categories/${categoryId}/reject/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Reject failed (${res.status})`));
      return;
    }
    await loadAll();
  };

  const deleteCategory = async (categoryId) => {
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/categories/${categoryId}/`, {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    if (!res.ok && res.status !== 204) {
      const json = await res.json().catch(() => ({}));
      setError(String(json?.detail || `Delete failed (${res.status})`));
      return;
    }
    await loadAll();
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "topics", label: "Pending Topics", icon: "⏳", badge: pending.length },
    { key: "flagged", label: "Moderate Opinions", icon: "🚩", badge: opinions.length },
    { key: "users", label: "Users", icon: "👥" },
    { key: "categories", label: "Categories", icon: "📚", badge: categories.filter((c) => c.status === "pending").length },
  ];

  const STATS = [
    { label: "Pending Reviews", value: String(stats.pending_topics), icon: "⏳", color: "#F9C784" },
    { label: "Pending Categories", value: String(stats.pending_categories), icon: "📚", color: "#B5A8D5" },
    { label: "Approved Debates", value: String(stats.approved_topics), icon: "💬", color: "#7EC8C8" },
    { label: "Total Users", value: String(stats.total_users), icon: "👥", color: "#F4A7B9" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#1a1625", fontFamily: "'Space Grotesk',sans-serif", color: "#f0ecff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>
      <Navbar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, animation: "fadeSlideIn 0.5s ease both" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(244,167,185,0.12)", border: "1px solid rgba(244,167,185,0.25)", borderRadius: 8, padding: "4px 12px", marginBottom: 12, fontSize: 11, fontFamily: "'Space Mono',monospace", color: "#F4A7B9", letterSpacing: 1.2 }}>🛡 ADMIN PANEL</div>
            <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, marginBottom: 6, color: "#f0ecff" }}>Moderation Dashboard</h1>
            <p style={{ color: "rgba(240,236,255,0.4)", fontSize: 14 }}>Manage topics, users, and content quality</p>
          </div>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(240,236,255,0.5)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}>← Back to Site</button>
        </div>

        {error && (
          <div style={{ marginBottom: 18, background: "rgba(244,167,185,0.1)", border: "1px solid rgba(244,167,185,0.25)", borderRadius: 12, padding: "12px 14px", color: "#F4A7B9", fontSize: 13, fontFamily: "'Space Mono',monospace" }}>
            {error} {error.includes("login") ? "Go to Login page and sign in with an admin account." : ""}
          </div>
        )}

        {loading && (
          <div style={{ marginBottom: 18, color: "rgba(240,236,255,0.35)", fontSize: 13, fontFamily: "'Space Mono',monospace" }}>
            Loading admin data...
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 36, animation: "fadeSlideIn 0.5s ease 0.05s both" }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}20`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Lora',serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: "rgba(240,236,255,0.35)", fontSize: 12, marginTop: 3, fontFamily: "'Space Mono',monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, animation: "fadeSlideIn 0.5s ease 0.1s both" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? "rgba(255,255,255,0.08)" : "transparent", border: `1px solid ${tab === t.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`, color: tab === t.key ? "#f0ecff" : "rgba(240,236,255,0.4)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 7, transition: "all 0.2s" }}>
              {t.icon} {t.label}
              {t.badge > 0 && <span style={{ background: "#F4A7B9", color: "#1a1625", borderRadius: 100, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, animation: "fadeSlideIn 0.4s ease both" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
              <h3 style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#f0ecff" }}>⏳ Awaiting Approval ({pending.length})</h3>
              {pending.length === 0 ? <p style={{ color: "rgba(240,236,255,0.3)", fontSize: 13 }}>All clear! No pending topics.</p>
                : pending.slice(0, 2).map((t) => (
                  <div key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12, marginBottom: 12 }}>
                    <p style={{ color: "rgba(240,236,255,0.8)", fontSize: 13, marginBottom: 6, lineHeight: 1.4 }}>{t.title}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(240,236,255,0.35)", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>by {t.author} · {t.submitted}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => approveTopic(t.id)} style={{ background: "rgba(126,200,200,0.15)", border: "1px solid rgba(126,200,200,0.3)", color: "#7EC8C8", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>✓</button>
                        <button onClick={() => rejectTopic(t.id)} style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.3)", color: "#F4A7B9", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>✗</button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
              <h3 style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#f0ecff" }}>🚩 Opinions for Moderation ({opinions.length})</h3>
              {opinions.length === 0 ? <p style={{ color: "rgba(240,236,255,0.3)", fontSize: 13 }}>No opinions loaded.</p>
                : opinions.slice(0, 2).map((f) => (
                  <div key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12, marginBottom: 12 }}>
                    <p style={{ color: "rgba(240,236,255,0.6)", fontSize: 12, marginBottom: 6, fontStyle: "italic", lineHeight: 1.4 }}>"{f.text.slice(0, 80)}..."</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ background: "rgba(244,167,185,0.1)", color: "#F4A7B9", border: "1px solid rgba(244,167,185,0.2)", borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "'Space Mono',monospace" }}>{f.reason}</span>
                      <button onClick={() => deleteOpinion(f.id)} style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.3)", color: "#F4A7B9", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Delete</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* PENDING TOPICS */}
        {tab === "topics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeSlideIn 0.4s ease both" }}>
            {pending.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,236,255,0.3)", fontFamily: "'Space Mono',monospace" }}>✓ No pending topics!</div>
              : pending.map((t) => (
                <div key={t.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, marginRight: 20 }}>
                      <span style={{ background: "rgba(249,199,132,0.15)", color: "#F9C784", border: "1px solid rgba(249,199,132,0.3)", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: "'Space Mono',monospace", display: "inline-block", marginBottom: 10, textTransform: "uppercase" }}>{t.category}</span>
                      <h3 style={{ fontFamily: "'Lora',serif", fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#f0ecff" }}>{t.title}</h3>
                      <span style={{ color: "rgba(240,236,255,0.35)", fontSize: 12, fontFamily: "'Space Mono',monospace" }}>Submitted by {t.author} · {t.submitted}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => approveTopic(t.id)} style={{ background: "rgba(126,200,200,0.15)", border: "1px solid rgba(126,200,200,0.35)", color: "#7EC8C8", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>✓ Approve</button>
                      <button onClick={() => rejectTopic(t.id)} style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.35)", color: "#F4A7B9", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>✗ Reject</button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* FLAGGED */}
        {tab === "flagged" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeSlideIn 0.4s ease both" }}>
            {opinions.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,236,255,0.3)", fontFamily: "'Space Mono',monospace" }}>No opinions to moderate.</div>
              : opinions.map((f) => (
                <div key={f.id} style={{ background: "rgba(244,167,185,0.04)", border: "1px solid rgba(244,167,185,0.15)", borderRadius: 14, padding: "22px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <span style={{ color: "#f0ecff", fontSize: 14, fontWeight: 600 }}>{f.author}</span>
                      <span style={{ color: "rgba(240,236,255,0.35)", fontSize: 12, fontFamily: "'Space Mono',monospace", marginLeft: 10 }}>in "{f.debate}" · {f.timeAgo}</span>
                    </div>
                    <span style={{ background: "rgba(244,167,185,0.15)", color: "#F4A7B9", border: "1px solid rgba(244,167,185,0.3)", borderRadius: 5, padding: "2px 10px", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{f.reason}</span>
                  </div>
                  <p style={{ color: "rgba(240,236,255,0.6)", fontSize: 14, lineHeight: 1.6, marginBottom: 16, fontStyle: "italic" }}>"{f.text}"</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => deleteOpinion(f.id)} style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.35)", color: "#F4A7B9", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>🗑 Delete</button>
                    <button onClick={() => dismissFlag(f.id)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(240,236,255,0.4)", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}>Dismiss</button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                {["Username", "Email", "Role", "Debates", "Status", "Action"].map((h) => (
                  <span key={h} style={{ color: "rgba(240,236,255,0.35)", fontSize: 11, fontFamily: "'Space Mono',monospace", letterSpacing: 1, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {users.map((user) => (
                <div key={user.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
                  <span style={{ color: "#f0ecff", fontSize: 14, fontWeight: 600 }}>{user.username}</span>
                  <span style={{ color: "rgba(240,236,255,0.4)", fontSize: 13 }}>{user.email}</span>
                  <span style={{ color: user.role === "Admin" ? "#F9C784" : "rgba(240,236,255,0.4)", fontSize: 12, fontFamily: "'Space Mono',monospace" }}>{user.role}</span>
                  <span style={{ color: "rgba(240,236,255,0.5)", fontSize: 13 }}>{user.debates}</span>
                  <span style={{ background: user.status === "Active" ? "rgba(126,200,200,0.12)" : user.status === "Suspended" ? "rgba(249,199,132,0.12)" : "rgba(244,167,185,0.12)", color: user.status === "Active" ? "#7EC8C8" : user.status === "Suspended" ? "#F9C784" : "#F4A7B9", border: `1px solid ${user.status === "Active" ? "rgba(126,200,200,0.25)" : user.status === "Suspended" ? "rgba(249,199,132,0.25)" : "rgba(244,167,185,0.25)"}`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontFamily: "'Space Mono',monospace", display: "inline-block" }}>{user.status}</span>
                  {user.role !== "Admin" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {user.status !== "Suspended" && (
                        <button
                          onClick={() => suspendUser(user.id, true)}
                          style={{ background: "transparent", border: "1px solid rgba(126,200,200,0.25)", color: "rgba(126,200,200,0.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}
                        >
                          Suspend
                        </button>
                      )}
                      {user.status !== "Banned" && (
                        <button
                          onClick={() => banUser(user.id, true)}
                          style={{ background: "transparent", border: "1px solid rgba(244,167,185,0.25)", color: "rgba(244,167,185,0.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}
                        >
                          Ban
                        </button>
                      )}
                      {user.status === "Suspended" && (
                        <button
                          onClick={() => suspendUser(user.id, false)}
                          style={{ background: "transparent", border: "1px solid rgba(126,200,200,0.25)", color: "rgba(126,200,200,0.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}
                        >
                          Unsuspend
                        </button>
                      )}
                      {user.status === "Banned" && (
                        <button
                          onClick={() => banUser(user.id, false)}
                          style={{ background: "transparent", border: "1px solid rgba(126,200,200,0.25)", color: "rgba(126,200,200,0.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Space Mono',monospace" }}
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "rgba(240,236,255,0.15)", fontSize: 11 }}>—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeSlideIn 0.4s ease both" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
              <h3 style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 700, marginBottom: 14, color: "#f0ecff" }}>Create Category</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={categoryCreateName}
                  onChange={(e) => setCategoryCreateName(e.target.value)}
                  placeholder="Category name"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#f0ecff", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", outline: "none" }}
                />
                <textarea
                  value={categoryCreateDescription}
                  onChange={(e) => setCategoryCreateDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#f0ecff", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", resize: "vertical", outline: "none" }}
                />
                <button
                  onClick={createCategory}
                  style={{ background: "linear-gradient(135deg,#7EC8C8,#a8dede)", border: "none", color: "#1a1625", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'Space Grotesk',sans-serif" }}
                >
                  Create
                </button>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
              <h3 style={{ fontFamily: "'Lora',serif", fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#f0ecff" }}>All Categories</h3>

              {categories.length === 0 ? (
                <div style={{ color: "rgba(240,236,255,0.3)", fontSize: 13, fontFamily: "'Space Mono',monospace" }}>No categories found.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {categories.map((c) => (
                    <div key={c.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          {editingCategoryId === c.id ? (
                            <>
                              <input
                                value={categoryEditName}
                                onChange={(e) => setCategoryEditName(e.target.value)}
                                style={{ width: "100%", marginBottom: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#f0ecff", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", outline: "none" }}
                              />
                              <textarea
                                value={categoryEditDescription}
                                onChange={(e) => setCategoryEditDescription(e.target.value)}
                                rows={3}
                                style={{ width: "100%", marginBottom: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#f0ecff", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif", resize: "vertical", outline: "none" }}
                              />
                            </>
                          ) : (
                            <>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                                <span style={{ color: "#f0ecff", fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                                <span style={{ color: "rgba(240,236,255,0.35)", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{c.createdAt ? `Created ${c.createdAt}` : ""}</span>
                                <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,236,255,0.5)", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{c.status}</span>
                              </div>
                              {c.description ? <p style={{ color: "rgba(240,236,255,0.6)", fontSize: 13, lineHeight: 1.6 }}>{c.description}</p> : <p style={{ color: "rgba(240,236,255,0.25)", fontSize: 13, lineHeight: 1.6 }}>No description.</p>}
                            </>
                          )}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 220 }}>
                          {editingCategoryId === c.id ? (
                            <>
                              <button
                                onClick={saveCategoryUpdate}
                                style={{ background: "linear-gradient(135deg,#7EC8C8,#a8dede)", border: "none", color: "#1a1625", borderRadius: 10, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(240,236,255,0.5)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditingCategory(c)}
                                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(240,236,255,0.5)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCategory(c.id)}
                                style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.3)", color: "#F4A7B9", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Delete
                              </button>
                            </>
                          )}

                          {c.status === "pending" && editingCategoryId !== c.id && (
                            <>
                              <button
                                onClick={() => approveCategory(c.id)}
                                style={{ background: "rgba(126,200,200,0.15)", border: "1px solid rgba(126,200,200,0.35)", color: "#7EC8C8", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectCategory(c.id)}
                                style={{ background: "rgba(244,167,185,0.15)", border: "1px solid rgba(244,167,185,0.35)", color: "#F4A7B9", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
