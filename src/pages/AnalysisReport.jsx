import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Users, Activity, Zap, Trophy, Ghost, Moon, ExternalLink, ArrowRight
} from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";
import { useState } from "react";

// ==========================================
// 📊 AnalysisReport - 営業分析レポート
// ==========================================

const THEME = {
  ...APP_THEME,
  colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"]
};

const S = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  card:    { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)", marginBottom: "32px" },
  grid:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "32px" },
  chartArea: { height: "280px", display: "flex", alignItems: "flex-end", gap: "16px", paddingBottom: "16px", borderBottom: `2px solid ${THEME.border}` },
  feedScroll: { height: "340px", overflowY: "auto", padding: "4px" },
  feedItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", backgroundColor: "#F8FAFC", marginBottom: "8px" },
};

export default function AnalysisReport({ customers = [], statuses = [], trackingLogs = [], staffList = [] }) {
  const [filterStaff, setFilterStaff] = useState("");

  // ステータスの役割定義（末尾3つ = 成約・休眠・失注）
  const wonLabel     = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel    = statuses[statuses.length - 1]?.name || "失注";

  // 担当者フィルタ済み顧客
  const filtered = useMemo(() =>
    customers.filter((c) => !filterStaff || c["担当者メール"] === filterStaff),
    [customers, filterStaff]
  );

  // ── 成功パスの案件分布 ──────────────────────────────
  // 成約・休眠・失注を除いた「進行中ステータス」のみカウント
  // ※ 成約もゴールなので含める場合は successPathStatuses に wonLabel を残す
  const successPathData = useMemo(() => {
    // 進行中ステータス（休眠・失注を除く）
    const inProgressStatuses = statuses.filter(
      (st) => st.name !== dormantLabel && st.name !== lostLabel
    );
    const firstStatusName = inProgressStatuses[0]?.name || "";

    return inProgressStatuses.map((st, i) => {
      const count = filtered.filter((c) => {
        const cur = (c["対応ステータス"] || "").trim();
        // ステータス未設定の顧客は先頭ステータスに計上
        const effective = cur || firstStatusName;
        return effective === st.name;
      }).length;
      return { name: st.name, count, color: THEME.colors[i % THEME.colors.length] };
    });
  }, [filtered, statuses, dormantLabel, lostLabel]);

  const maxCount = Math.max(...successPathData.map((d) => d.count), 1);

  // ── フィード ──────────────────────────────────────
  const getActivityFeed = (isDormant) =>
    trackingLogs.filter((log) => {
      const c = customers.find((c) => c.id === log.customerId);
      if (!c) return false;
      const st = c["対応ステータス"];
      return isDormant
        ? st === dormantLabel
        : st !== dormantLabel && st !== lostLabel && st !== wonLabel;
    }).slice(0, 20);

  // ── ステータス別サマリ ────────────────────────────
  const countByStatus = (label) =>
    filtered.filter((c) => (c["対応ステータス"] || "").trim() === label.trim()).length;

  const summaryCards = [
    { label: wonLabel,     emoji: "🏆", color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", type: "won"     },
    { label: dormantLabel, emoji: "🌙", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", type: "dormant" },
    { label: lostLabel,    emoji: "🗑",  color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", type: "lost"    },
  ];

  return (
    <div style={S.main}>
      <div style={S.wrapper}>

        {/* ヘッダー */}
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Zap size={30} color={THEME.primary} fill={THEME.primary} />
              <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: 0 }}>営業分析・実況</h1>
            </div>
            <p style={{ color: THEME.textMuted, fontSize: 15 }}>成功パスの案件分布とリアルタイムの顧客アクション</p>
          </div>
          {/* 担当者フィルタ（共通キャッシュを使用） */}
          <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
        </header>

        {/* 1. 成功パス棒グラフ */}
        <div style={S.card}>
          <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={20} color={THEME.primary} /> 成功パスの案件分布
          </h3>
          <div style={S.chartArea}>
            {successPathData.map((d) => (
              <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{
                    width: "60%", borderRadius: "8px 8px 2px 2px",
                    backgroundColor: d.color,
                    height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0)}%`,
                    transition: "height 0.8s ease", position: "relative", minHeight: d.count > 0 ? 8 : 0,
                  }}>
                    <span style={{ position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)", fontWeight: 900, color: d.color, fontSize: 14 }}>
                      {d.count > 0 ? d.count : ""}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", color: THEME.textMain }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 成約・休眠・失注 サマリカード → 専用リストページへリンク */}
        <div style={S.grid}>
          {summaryCards.map(({ label, emoji, color, bg, border, type }) => {
            const count = countByStatus(label);
            return (
              <Link
                key={type}
                to={`/status-list/${type}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    backgroundColor: "white", borderRadius: 20, border: `1px solid ${border}`,
                    padding: "28px 28px 20px", transition: "all 0.2s", cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 28px ${color}25`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 4 }}>{label}リスト</div>
                      <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>名</div>
                    </div>
                    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color }}>
                      リストを見る <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 3. フィード（進行中 vs 休眠再浮上） */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div style={S.card}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 20, color: THEME.primary }}>⚡ 進行中のアクティビティ</h3>
            <div style={S.feedScroll}>
              {getActivityFeed(false).length === 0 ? (
                <div style={{ textAlign: "center", color: THEME.textMuted, padding: 40 }}>データがありません</div>
              ) : getActivityFeed(false).map((log, i) => (
                <div key={i} style={S.feedItem}>
                  <div style={{ padding: 8, backgroundColor: "#EEF2FF", borderRadius: 8, color: THEME.primary, flexShrink: 0 }}><Zap size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{customers.find((c) => c.id === log.customerId)?.姓} 様</div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>{log.pageTitle || "ページ閲覧"} · {log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 20, color: "#D97706" }}>🌙 休眠顧客の再浮上</h3>
            <div style={S.feedScroll}>
              {getActivityFeed(true).length === 0 ? (
                <div style={{ textAlign: "center", color: THEME.textMuted, padding: 40 }}>データがありません</div>
              ) : getActivityFeed(true).map((log, i) => (
                <div key={i} style={S.feedItem}>
                  <div style={{ padding: 8, backgroundColor: "#FFFBEB", borderRadius: 8, color: "#D97706", flexShrink: 0 }}><Moon size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{customers.find((c) => c.id === log.customerId)?.姓} 様</div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>{log.pageTitle || "ページ閲覧"} · {log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}