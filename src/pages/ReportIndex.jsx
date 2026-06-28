import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, GitBranch, Trash2, Activity, ChevronRight } from "lucide-react";
import { THEME } from "../lib/constants";
import { useWindowWidth } from "../lib/useWindowWidth";

const REPORTS = [
  {
    path: "/analysis/sales",
    icon: <BarChart3 size={28} color="#4F46E5" />,
    bg: "#EEF2FF", border: "#C7D2FE",
    title: "営業進捗レポート",
    desc: "成功パスの案件分布・棒グラフのドリルダウンで顧客一覧表示",
  },
  {
    path: "/analysis/source",
    icon: <GitBranch size={28} color="#0891B2" />,
    bg: "#ECFEFF", border: "#A5F3FC",
    title: "流入経路評価",
    desc: "到達率・費用対効果・成約金額ROI・専任率ランキングを流入元別に集計",
  },
  {
    path: "/analysis/status",
    icon: <Activity size={28} color="#0891B2" />,
    bg: "#ECFEFF", border: "#A5F3FC",
    title: "営業ステータス分析",
    desc: "流入元ごとのステータス到達件数・到達割合・平均到達日数（レポート集計有効ステータスのみ）",
  },
  {
    path: "/analysis/lost",
    icon: <Trash2 size={28} color="#DC2626" />,
    bg: "#FEF2F2", border: "#FECACA",
    title: "失注・ロスト分析",
    desc: "失注理由のランキングと営業別フィルタ",
  },
];

export default function ReportIndex() {
  const { isMobile } = useWindowWidth();
  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: isMobile ? "20px 16px" : "48px 64px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: isMobile ? 24 : 40 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>分析レポート</h1>
          {!isMobile && <p style={{ color: THEME.textMuted, fontSize: 15, margin: 0 }}>レポートを選択してください</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 16 }}>
          {REPORTS.map(r => (
            <Link key={r.path} to={r.path} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: isMobile ? 16 : 24,
                  backgroundColor: "white", borderRadius: isMobile ? 14 : 20,
                  border: `1px solid ${THEME.border}`,
                  padding: isMobile ? "16px 18px" : "28px 32px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.18s", cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: isMobile ? 12 : 16, backgroundColor: r.bg, border: `1px solid ${r.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {r.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, color: THEME.textMain, marginBottom: isMobile ? 0 : 4 }}>{r.title}</div>
                  {!isMobile && <div style={{ fontSize: 13, color: THEME.textMuted }}>{r.desc}</div>}
                </div>
                <ChevronRight size={isMobile ? 16 : 20} color={THEME.textMuted} style={{ flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}