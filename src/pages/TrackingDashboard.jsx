import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, MousePointerClick, Users, Percent, Zap, ExternalLink, Clock } from "lucide-react";

const THEME = {
  primary: "#4F46E5",
  danger: "#EF4444",
  success: "#10B981",
  bg: "#0F172A", // 集中しやすいようにダークな背景を採用
  card: "#1E293B",
  text: "#F8FAFC"
};

const styles = {
  container: { minHeight: "100vh", backgroundColor: THEME.bg, color: THEME.text, padding: "40px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "40px" },
  statCard: { backgroundColor: THEME.card, padding: "24px", borderRadius: "16px", border: "1px solid #334155" },
  feedItem: { 
    display: "flex", alignItems: "center", gap: "16px", padding: "20px", 
    backgroundColor: THEME.card, borderRadius: "12px", marginBottom: "12px",
    borderLeft: "4px solid transparent", transition: "0.3s"
  },
  activePulse: { borderLeft: `4px solid ${THEME.success}`, boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)" }
};

export default function TrackingDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/t/stats');
      // クリック日時が新しい順にソート
      const sorted = res.data.sort((a, b) => new Date(b.last_clicked_at || 0) - new Date(a.last_clicked_at || 0));
      setLogs(sorted);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 10000); // 10秒おきに自動更新
    return () => clearInterval(timer);
  }, []);

  // 統計計算
  const totalSent = logs.length;
  const totalClicked = logs.filter(l => parseInt(l.click_count) > 0).length;
  const ctr = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0;

  // 5分以内のクリックを「ホット」と判定
  const isHot = (dateStr) => {
    if (!dateStr) return false;
    const diff = new Date() - new Date(dateStr);
    return diff < 5 * 60 * 1000;
  };

  return (
    <div style={styles.container}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "900", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <Activity color={THEME.success} className="animate-pulse" /> URLクリック・ライブフィード
          </h1>
          <p style={{ color: "#94A3B8", marginTop: "8px" }}>10秒おきに最新のクリック状況を自動更新中</p>
        </div>
      </header>

      <div style={styles.grid}>
        <div style={styles.statCard}>
          <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>総送信数</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{totalSent} <span style={{ fontSize: "14px" }}>件</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>ユニーククリック</div>
          <div style={{ fontSize: "32px", fontWeight: "900" }}>{totalClicked} <span style={{ fontSize: "14px" }}>名</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>クリック率 (CTR)</div>
          <div style={{ fontSize: "32px", fontWeight: "900", color: THEME.primary }}>{ctr} <span style={{ fontSize: "14px" }}>%</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={{ color: "#94A3B8", fontSize: "12px", fontWeight: "800", marginBottom: "8px" }}>稼働ステータス</div>
          <div style={{ color: THEME.success, fontWeight: "800", display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={16} fill={THEME.success} /> 正常稼働中
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1000px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>最新のアクティビティ</h2>
        {logs.filter(l => l.last_clicked_at).map(log => {
          const hot = isHot(log.last_clicked_at);
          return (
            <div key={log.tracking_id} style={{ ...styles.feedItem, ...(hot ? styles.activePulse : {}) }}>
              <div style={{ backgroundColor: hot ? THEME.success : "#334155", padding: "12px", borderRadius: "12px" }}>
                <MousePointerClick size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontWeight: "900", fontSize: "16px" }}>{log.customer_name}</span>
                  {hot && <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "900" }}>HOT</span>}
                </div>
                <div style={{ color: "#94A3B8", fontSize: "13px", marginTop: "4px", display: "flex", gap: "16px" }}>
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
      </div>
    </div>
  );
}