import React, { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Send, UserCircle, Calendar } from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 📋 CustomerStatusList - ステータス別顧客リスト
// ==========================================
// /status-list/won      → 成約リスト
// /status-list/dormant  → 休眠リスト
// /status-list/lost     → 失注リスト

const PAGE_CONFIG = {
  won:     { emoji: "🏆", label: "成約",  color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" },
  dormant: { emoji: "🌙", label: "休眠",  color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  lost:    { emoji: "🗑",  label: "失注",  color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5" },
};

const formatDate = (v) => {
  if (!v || v === "-") return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())}`;
};

export default function CustomerStatusList({ customers = [], statuses = [], staffList = [] }) {
  const { type } = useParams(); // "won" | "dormant" | "lost"
  const navigate = useNavigate();
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.won;

  // ステータス名を statuses 配列から特定（末尾3つが 成約・休眠・失注）
  const wonLabel     = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel    = statuses[statuses.length - 1]?.name || "失注";
  const targetLabel  = type === "won" ? wonLabel : type === "dormant" ? dormantLabel : lostLabel;

  const list = useMemo(() =>
    customers.filter((c) => (c["対応ステータス"] || "").trim() === targetLabel.trim()),
    [customers, targetLabel]
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg }}>
      <div style={{ padding: "40px 64px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* ヘッダー */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={18} /> 戻る
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: config.bg, border: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
            {config.emoji}
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.textMain, margin: 0 }}>
              {config.label}リスト
            </h1>
            <p style={{ color: THEME.textMuted, fontSize: 14, margin: "4px 0 0" }}>
              {list.length} 名
            </p>
          </div>

          {/* 他のリストへのタブ */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {[
              { key: "won",     label: "🏆 成約" },
              { key: "dormant", label: "🌙 休眠" },
              { key: "lost",    label: "🗑 失注" },
            ].map(({ key, label }) => (
              <Link
                key={key}
                to={`/status-list/${key}`}
                style={{
                  padding: "8px 16px", borderRadius: 10, fontWeight: 800, fontSize: 13,
                  textDecoration: "none",
                  backgroundColor: type === key ? PAGE_CONFIG[key].bg : "white",
                  color: type === key ? PAGE_CONFIG[key].color : THEME.textMuted,
                  border: `1px solid ${type === key ? PAGE_CONFIG[key].border : THEME.border}`,
                  transition: "all 0.15s",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* リスト */}
        {list.length === 0 ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "80px", textAlign: "center", color: THEME.textMuted }}>
            {config.label}の顧客はいません
          </div>
        ) : (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC" }}>
                  {["顧客名", "担当者", "シナリオ", "登録日", "操作"].map((h) => (
                    <th key={h} style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, color: THEME.textMuted, textAlign: "left", borderBottom: `1px solid ${THEME.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const staff = staffList.find((s) => s.email === c["担当者メール"]);
                  return (
                    <tr
                      key={c.id}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                      style={{ transition: "0.1s" }}
                    >
                      {/* 顧客名 */}
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: THEME.textMain }}>
                          {c["姓"]} {c["名"]} 様
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                          {c["電話番号"] || "-"}
                        </div>
                      </td>
                      {/* 担当者 */}
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textMuted }}>
                          <UserCircle size={14} color={THEME.primary} />
                          {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                        </div>
                      </td>
                      {/* シナリオ */}
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <span style={{ fontSize: 12, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "3px 10px", borderRadius: 6, fontWeight: 800 }}>
                          {c["シナリオID"] || "-"}
                        </span>
                      </td>
                      {/* 登録日 */}
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: THEME.textMuted }}>
                          <Calendar size={13} /> {formatDate(c["登録日"])}
                        </div>
                      </td>
                      {/* 操作 */}
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link
                            to={`/detail/${c.id}`}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", backgroundColor: "#EEF2FF", color: THEME.primary, borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none" }}
                          >
                            <ExternalLink size={13} /> 詳細
                          </Link>
                          <Link
                            to={`/direct-sms/${c.id}`}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", backgroundColor: "#F0FDF4", color: "#16A34A", borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none" }}
                          >
                            <Send size={13} /> SMS
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}