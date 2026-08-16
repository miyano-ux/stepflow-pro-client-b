import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Activity, MousePointerClick, Users, Zap, Clock, Loader2, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { useWindowWidth } from "../lib/useWindowWidth";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B",
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444",
  warning: "#F59E0B",
};

const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  statCard: { backgroundColor: THEME.card, padding: "24px", borderRadius: "16px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  feedItem: {
    display: "flex", alignItems: "center", gap: "16px", padding: "20px",
    backgroundColor: THEME.card, borderRadius: "12px", marginBottom: "12px",
    border: `1px solid ${THEME.border}`, transition: "0.3s",
  }
};

// 集計は本体GASの毎分バッチが更新するため、10秒間隔で叩く意味がない。
// 60秒に緩め、非表示タブでは止める。
const POLL_INTERVAL_MS = 60 * 1000;
const MIN_REFETCH_MS   = 20 * 1000;
const HOT_WINDOW_MS    = 60 * 60 * 1000;  // 顧客詳細のHOT判定と同一

export default function TrackingDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const { isMobile } = useWindowWidth();

  const inFlight    = useRef(false);
  const lastFetchAt = useRef(0);

  const fetchStats = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res  = await axios.get("/api/t/stats");
      const data = res.data;
      if (!data || data.status !== "success") throw new Error(data?.message || "取得に失敗しました");
      setStats(data);
      setUpdatedAt(data.generatedAt || "");
      setError(null);
    } catch (e) {
      console.error("[tracking] 集計の取得に失敗", e);
      setError(e?.response?.data?.message || e.message || "集計の取得に失敗しました");
    } finally {
      lastFetchAt.current = Date.now();
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetchStats();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.hidden) return;
      if (Date.now() - lastFetchAt.current < MIN_REFETCH_MS) return;
      fetchStats();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchStats]);

  const totals    = stats?.totals || { links: 0, clickedLinks: 0, clicks: 0, customers: 0, clickedCustomers: 0 };
  const customers = stats?.customers || [];

  // 顧客反応率：送信対象の顧客のうち何名が反応したか。
  // （旧実装は「反応した顧客数 ÷ 送信リンク数」で分母と分子の単位が違っていた）
  const ctr = totals.customers > 0
    ? ((totals.clickedCustomers / totals.customers) * 100).toFixed(1)
    : "0.0";

  const isHot = (dateStr) => {
    if (!dateStr) return false;
    const t = new Date(String(dateStr).replace(/-/g, "/")).getTime();
    if (isNaN(t)) return false;
    return (Date.now() - t) < HOT_WINDOW_MS;
  };

  if (loading && !stats) {
    return (
      <div style={{ ...styles.main, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color={THEME.primary} size={48} />
      </div>
    );
  }

  return (
    <div style={styles.main}>
      <div style={{ padding: isMobile ? "20px 16px" : "48px 64px", maxWidth: "1440px", margin: "0 auto", boxSizing: "border-box" }}>

        <header style={{ marginBottom: isMobile ? "24px" : "40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: isMobile ? "22px" : "32px", fontWeight: "900", color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
            <Activity color={THEME.success} /> トラッキング実況
          </h1>
          <button
            onClick={fetchStats}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: `1px solid ${THEME.border}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: THEME.textMuted, fontSize: 12,
            }}
          >
            <RefreshCw size={13} /> 更新
          </button>
        </header>

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            backgroundColor: "#FEF2F2", border: `1px solid #FECACA`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 20,
            color: "#B91C1C", fontSize: 13,
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{error}{stats && "（表示中の数値は取得できた時点のものです）"}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "12px" : "24px", marginBottom: isMobile ? "24px" : "40px" }}>
          <div style={{ ...styles.statCard, padding: isMobile ? "16px" : "24px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>総送信リンク数</div>
            <div style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "900" }}>{totals.links} <span style={{ fontSize: "14px" }}>件</span></div>
          </div>
          <div style={{ ...styles.statCard, padding: isMobile ? "16px" : "24px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>反応した顧客数</div>
            <div style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "900" }}>
              {totals.clickedCustomers} <span style={{ fontSize: "14px" }}>名</span>
              <span style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 700, marginLeft: 6 }}>/ {totals.customers}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, padding: isMobile ? "16px" : "24px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>顧客反応率</div>
            <div style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "900", color: THEME.primary }}>{ctr} <span style={{ fontSize: "14px" }}>%</span></div>
          </div>
          <div style={{ ...styles.statCard, padding: isMobile ? "16px" : "24px" }}>
            <div style={{ color: THEME.textMuted, fontSize: "11px", fontWeight: "800", marginBottom: "8px" }}>システム状態</div>
            {error ? (
              <div style={{ color: THEME.warning, fontWeight: "800", display: "flex", alignItems: "center", gap: 6, fontSize: "16px" }}>
                <AlertTriangle size={15} /> 取得エラー
              </div>
            ) : (
              <div style={{ color: THEME.success, fontWeight: "800", display: "flex", alignItems: "center", gap: 6, fontSize: "18px" }}>
                <Zap size={16} fill={THEME.success} /> 稼働中
              </div>
            )}
            {updatedAt && (
              <div style={{ fontSize: 10, color: THEME.textMuted, marginTop: 6 }}>{updatedAt} 時点</div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: "1000px" }}>
          <h2 style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: "800", marginBottom: "8px" }}>顧客ごとの最新リアクション</h2>
          <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 0, marginBottom: 20 }}>
            直近{stats?.windowDays || 30}日間・最大{customers.length}件を表示しています。集計は1分ごとに更新されます。
            {stats?.truncated && "（件数が多いため最新分のみ表示）"}
          </p>

          {customers.length === 0 ? (
            <div style={{ ...styles.statCard, textAlign: "center", padding: "48px 24px", color: THEME.textMuted, fontSize: 13 }}>
              まだクリックされたリンクがありません
            </div>
          ) : customers.map(stat => {
            const hot = isHot(stat.lastClickedAt);
            return (
              <div key={stat.id} style={{ ...styles.feedItem, borderLeft: hot ? `4px solid ${THEME.danger}` : `4px solid ${THEME.border}`, gap: isMobile ? "12px" : "16px", padding: isMobile ? "14px 16px" : "20px" }}>
                <div style={{ backgroundColor: hot ? THEME.danger : "#F1F5F9", padding: isMobile ? "8px" : "12px", borderRadius: "12px", flexShrink: 0 }}>
                  <MousePointerClick size={isMobile ? 18 : 24} color={hot ? "white" : THEME.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <Link to={`/detail/${stat.id}`} style={{ fontWeight: "900", fontSize: isMobile ? "15px" : "18px", color: THEME.primary, textDecoration: "none" }}>
                      {stat.name || "(名前未設定)"} 様
                    </Link>
                    {hot && <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: "900", flexShrink: 0 }}>HOT!</span>}
                  </div>
                  <div style={{ color: THEME.textMuted, fontSize: "12px", marginTop: "4px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 2 : "16px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {stat.lastClickedAt || "-"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={13} /> 累計 {stat.totalClicks} 回</span>
                  </div>
                </div>
                <Link to={`/detail/${stat.id}`} style={{ color: THEME.textMuted, flexShrink: 0 }}>
                  <ChevronRight size={20} />
                </Link>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}