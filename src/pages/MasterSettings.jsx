import React from "react";
import { Link } from "react-router-dom";
import { Settings, Globe, FileText, MessageSquare, ChevronRight } from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 🗂 MasterSettings - 管理項目設定ハブ
// ==========================================

function Section({ icon, title, linkTo, linkLabel, children }) {
  return (
    <div style={{
      backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 20, overflow: "hidden",
    }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${THEME.border}`, backgroundColor: "#FAFBFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: THEME.primary }}>{icon}</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain }}>{title}</span>
        </div>
        <Link
          to={linkTo}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: THEME.primary, textDecoration: "none", padding: "7px 16px", backgroundColor: "#EEF2FF", borderRadius: 99 }}
        >
          {linkLabel} <ChevronRight size={14} />
        </Link>
      </div>
      {/* 本文 */}
      <div style={{ padding: "16px 24px" }}>
        {children}
      </div>
    </div>
  );
}

function TagList({ items, color = THEME.primary, emptyText = "未設定" }) {
  if (!items || items.length === 0) {
    return <span style={{ fontSize: 13, color: THEME.textMuted, fontStyle: "italic" }}>{emptyText}</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 99, backgroundColor: `${color}15`, color }}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function MasterSettings({ statuses = [], sources = [], contractTypes = [], scenarios = [] }) {
  const flowStatuses = statuses.filter(s => s.terminalType !== "dormant" && s.terminalType !== "lost");
  const terminalStatuses = statuses.filter(s => s.terminalType === "dormant" || s.terminalType === "lost");
  const scenarioIds = [...new Set(scenarios.map(s => s["シナリオID"]).filter(Boolean))];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 48px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>管理項目設定</h1>
        <p style={{ fontSize: 14, color: THEME.textMuted, margin: "0 0 32px" }}>各設定の現在の内容を確認し、編集画面に移動できます。</p>

        {/* ステータス設定 */}
        <Section icon={<Settings size={18} />} title="ステータス設定" linkTo="/status-settings" linkLabel="設定を編集">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>フロー列</div>
            <TagList items={flowStatuses.map(s => s.scenarioId ? `${s.name} (▶${s.scenarioId})` : s.name)} />
          </div>
          {terminalStatuses.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>終点ステータス</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {terminalStatuses.map((s, i) => (
                  <span key={i} style={{ fontSize: 13, fontWeight: 700, padding: "4px 14px", borderRadius: 99, backgroundColor: s.terminalType === "dormant" ? "#FEF3C7" : "#FEE2E2", color: s.terminalType === "dormant" ? "#92400E" : "#991B1B" }}>
                    {s.terminalType === "dormant" ? "🌙" : "🗑"} {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* 流入元設定 */}
        <Section icon={<Globe size={18} />} title="流入元設定" linkTo="/sources" linkLabel="設定を編集">
          <TagList items={sources.map(s => `${s.name}（${s.count}件）`)} color="#0891B2" emptyText="流入元が登録されていません" />
        </Section>

        {/* 契約種別設定 */}
        <Section icon={<FileText size={18} />} title="契約種別設定" linkTo="/contract-types" linkLabel="設定を編集">
          <TagList items={contractTypes} color="#7C3AED" emptyText="契約種別が登録されていません" />
        </Section>

        {/* シナリオ設定 */}
        <Section icon={<MessageSquare size={18} />} title="シナリオ設定" linkTo="/scenarios" linkLabel="設定を編集">
          <TagList items={scenarioIds} color="#059669" emptyText="シナリオが登録されていません" />
        </Section>
      </div>
    </div>
  );
}