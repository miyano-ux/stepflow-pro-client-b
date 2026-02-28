import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // 🆕 遷移用にインポート
import axios from "axios";
import { Activity, MousePointerClick, Users, Zap, ExternalLink, Clock, Loader2, ChevronRight } from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444"
};

const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "40px" },
  statCard: { backgroundColor: THEME.card, padding: "24px", borderRadius: "16px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  feedItem: { 
    display: "flex", alignItems: "center", gap: "16px", padding: "20px", 
    backgroundColor: THEME.card, borderRadius: "12px", marginBottom: "12px",
    border: `1px solid ${THEME.border}`, transition: "0.3s"
  }
};

export default function TrackingDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/t/stats');
      setLogs(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, []);

  // 🆕 顧客ごとにデータを集約するロジック
  const customerStats = React.useMemo(() => {
    const statsMap = {};
    
    logs.forEach(log => {
      const cid = log.customer_id;
      if (!cid || parseInt(log.click_count) === 0) return;

      if (!statsMap[cid]) {
        statsMap[cid] = {
          id: cid,
          name: log.customer_name,
          totalClicks: 0,
          lastClickedAt: log.last_clicked_at,
          originalUrls: []
        };
      }
      
      statsMap[cid].totalClicks += parseInt(log.click_count);
      // 最新のクリック時刻を保持
      if (new Date(log.last_clicked_at) > new Date(statsMap[cid].lastClickedAt)) {
        statsMap[cid].lastClickedAt = log.last_clicked_at;
      }
    });

    // 配列に変換して最新クリック順に並び替え
    return Object.values(statsMap).sort((a, b) => new Date(b.lastClickedAt) - new Date(a.lastClickedAt));
  }, [logs]);

  // 上部統計の計算
  const totalSent = logs.length;
  const totalClicked = customerStats.length; // 🆕 集約した顧客数
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
        </header>

        <div style={styles.grid}>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>総送信リンク数</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{totalSent} <span style={{ fontSize: "14px" }}>件</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>ユニーク顧客数</div>
            <div style={{ fontSize: "28px", fontWeight: "900" }}>{totalClicked} <span style={{ fontSize: "14px" }}>名</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>顧客反応率 (CTR)</div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: THEME.primary }}>{ctr} <span style={{ fontSize: "14px" }}>%</span></div>
          </div>
          <div style={styles.statCard}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>システム状態</div>
            <div style={{ color: THEME.success, fontWeight: "800", display: "flex", alignItems: "center", gap: 6, fontSize: "18px" }}>
              <Zap size={16} fill={THEME.success} /> 稼働中
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "1000px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px" }}>顧客ごとの最新リアクション</h2>
          {customerStats.map(stat => {
            const hot = isHot(stat.lastClickedAt);
            return (
              <div key={stat.id} style={{ ...styles.feedItem, borderLeft: hot ? `4px solid ${THEME.danger}` : `4px solid ${THEME.border}` }}>
                <div style={{ backgroundColor: hot ? THEME.danger : "#F1F5F9", padding: "12px", borderRadius: "12px" }}>
                  <MousePointerClick size={24} color={hot ? "white" : THEME.primary} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* 🆕 顧客名をクリックで詳細へ */}
                    <Link to={`/detail/${stat.id}`} style={{ fontWeight: "900", fontSize: "18px", color: THEME.primary, textDecoration: "none" }}>
                      {stat.name} 様
                    </Link>
                    {hot && <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "900" }}>HOT!</span>}
                  </div>
                  <div style={{ color: THEME.textMuted, fontSize: "13px", marginTop: "4px", display: "flex", gap: "16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> 最終クリック: {stat.lastClickedAt}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={14} /> 累計 {stat.totalClicks} 回クリック</span>
                  </div>
                </div>
                <Link to={`/detail/${stat.id}`} style={{ color: THEME.textMuted }}>
                  <ChevronRight size={24} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}