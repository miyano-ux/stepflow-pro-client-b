import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, MousePointerClick, Users, Zap, ExternalLink, Clock, Loader2 } from "lucide-react";

// App.jsxのテーマと色を合わせる
const THEME = {
  primary: "#4F46E5",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  success: "#10B981",
  danger: "#EF4444"
};

const styles = {
  // 🆕 サイドバーの幅 260px 分の余白を作る
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "40px" },
  statCard: { backgroundColor: THEME.card, padding: "24px", borderRadius: "16px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  feedItem: { 
    display: "flex", alignItems: "center", gap: "16px", padding: "20px", 
    backgroundColor: THEME.card, borderRadius: "12px", marginBottom: "12px",
    borderLeft: "4px solid transparent", border: `1px solid ${THEME.border}`, transition: "0.3s"
  },
  activePulse: { borderLeft: `4px solid ${THEME.success}`, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.1)" }
};

export default function TrackingDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/t/stats');
      const sorted = res.data.sort((a, b) => new Date(b.last_clicked_at || 0) - new Date(a.last_clicked_at || 0));
      setLogs(sorted);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, []);

  const totalSent = logs.length;
  const totalClicked = logs.filter(l => parseInt(l.click_count) > 0).length;
  const ctr = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;

  const isHot = (dateStr) => {
    if (!dateStr) return false;
    const diff = new Date() - new Date(dateStr);
    return diff < 5 * 60 * 1000;
  };

  if (loading && logs.length === 0) {
    return (
      <div style={{ ...styles.main, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color={THEME.primary} size={48} />
      </div>
    );
  }

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <Activity color={THEME.success} /> トラッキング実況
          </h1>
          <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "6px" }}>10秒おきに最新のクリック状況を自動更新中</p>
        </header>

        <div style={styles.grid}>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>総送信数</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{totalSent} <span style={{ fontSize: "14px" }}>件</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>ユニーククリック</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{totalClicked} <span style={{ fontSize: "14px" }}>名</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>クリック率 (CTR)</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: THEME.primary }}>{ctr} <span style={{ fontSize: "14px" }}>%</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>稼働ステータス</div>
            <div style={{ color: THEME.success, fontWeight: "800", display: "flex", alignItems: "center", gap: 6, fontSize: "18px" }}>
              <Zap size={16} fill={THEME.success} /> 正常稼働中
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "1000px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px" }}>最新のアクティビティ</h2>
          {logs.filter(l => l.last_clicked_at).map(log => {
            const hot = isHot(log.last_clicked_at);
            return (
              <div key={log.tracking_id} style={{ ...styles.feedItem, ...(hot ? styles.activePulse : {}) }}>
                <div style={{ backgroundColor: hot ? THEME.success : "#F1F5F9", padding: "12px", borderRadius: "12px" }}>
                  <MousePointerClick size={24} color={hot ? "white" : THEME.primary} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: "900", fontSize: "16px" }}>{log.customer_name}</span>
                    {hot && <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "900" }}>HOT</span>}
                  </div>
                  <div style={{ color: THEME.textMuted, fontSize: "13px", marginTop: "4px", display: "flex", gap: "16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> {log.last_clicked_at}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={14} /> 累計 {log.click_count} 回クリック</span>
                  </div>
                </div>
                <a href={log.original_url} target="_blank" rel="noreferrer" style={{ color: THEME.primary }}>
                  <ExternalLink size={20} />
                </a>
              </div>
            );
          })}
          {logs.filter(l => l.last_clicked_at).length === 0 && (
            <div style={{ textAlign: "center", padding: "80px", color: THEME.textMuted, backgroundColor: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}` }}>
              クリック履歴がまだありません。トラッキングURLを送信してみましょう！
            </div>
          )}
        </div>
      </div>
    </div>
  );
}