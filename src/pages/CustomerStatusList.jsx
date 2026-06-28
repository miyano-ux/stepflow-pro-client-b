import React, { useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ExternalLink, Send, UserCircle, Calendar } from "lucide-react";
import { THEME } from "../lib/constants";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// 📋 CustomerStatusList - ステータス別顧客リスト
// ==========================================
// /status-list/won      → 成約リスト
// /status-list/dormant  → 休眠リスト
// /status-list/lost     → 失注リスト

const PAGE_CONFIG = {
  won:      { emoji: "🏆", label: "成約",  color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" },
  dormant:  { emoji: "🌙", label: "休眠",  color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" },
  lost:     { emoji: "🗑",  label: "失注",  color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5" },
  excluded: { emoji: "🚫", label: "除外",  color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
  fixed:    { emoji: "🔑", label: "受託",  color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD" },
  default:  { emoji: "📋", label: "",      color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
};

const formatDate = (v) => {
  if (!v || v === "-") return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())}`;
};

export default function CustomerStatusList({ customers = [], statuses = [], staffList = [] }) {
  const { type, name } = useParams(); // type: "won"|"dormant"|"lost" | name: encodeURIComponent(ステータス名)
  const navigate = useNavigate();
  const location = useLocation();

  // ステータス名ベース（新ルート /status-list/by-name/:name）
  const byName = type === "by-name";
  const decodedName = byName ? decodeURIComponent(name || "") : null;

  // terminalType ベース（旧ルート /status-list/:type）
  const matchedStatus = !byName
    ? statuses.find(s => s.terminalType === type)
    : statuses.find(s => s.name === decodedName);

  const targetLabel = byName
    ? decodedName
    : matchedStatus?.name || (type === "won" ? "成約" : type === "dormant" ? "休眠" : "失注");

  const terminalType = matchedStatus?.terminalType || (byName ? "" : type);
  const configKey = matchedStatus?.isFixed
    ? "fixed"
    : terminalType === "excluded"
    ? "excluded"
    : (PAGE_CONFIG[terminalType] ? terminalType : "default");
  const config = PAGE_CONFIG[configKey];

  const list = useMemo(() =>
    customers.filter((c) => (c["対応ステータス"] || "").trim() === (targetLabel || "").trim()),
    [customers, targetLabel]
  );

  const { isMobile } = useWindowWidth();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg }}>
      <div style={{ padding: isMobile ? "20px 16px" : "40px 64px", maxWidth: "1200px", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ヘッダー */}
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 20, padding: 0 }}
        >
          <ArrowLeft size={18} /> 戻る
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{ width: isMobile ? 44 : 56, height: isMobile ? 44 : 56, borderRadius: 16, backgroundColor: config.bg, border: `1px solid ${config.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 22 : 28, flexShrink: 0 }}>
            {config.emoji}
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: THEME.textMain, margin: 0 }}>
              {targetLabel}リスト
            </h1>
            <p style={{ color: THEME.textMuted, fontSize: 14, margin: "4px 0 0" }}>
              {list.length} 名
            </p>
          </div>
        </div>

        {/* リスト */}
        {list.length === 0 ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: isMobile ? "40px 20px" : "80px", textAlign: "center", color: THEME.textMuted }}>
            {targetLabel}の顧客はいません
          </div>
        ) : isMobile ? (
          /* モバイル：カード形式 */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((c) => {
              const staff = staffList.find((s) => s.email === c["担当者メール"]);
              const statusDef = statuses.find(s => s.name === (c["対応ステータス"] || "").trim());
              const stColor = statusDef?.isFixed
                ? { bg: "#F0F9FF", text: "#0EA5E9" }
                : statusDef?.terminalType === "won" ? { bg: "#DCFCE7", text: "#16A34A" }
                : statusDef?.terminalType === "lost" ? { bg: "#FEE2E2", text: "#DC2626" }
                : statusDef?.terminalType === "excluded" ? { bg: "#F3F4F6", text: "#6B7280" }
                : { bg: "#FEF3C7", text: "#D97706" };
              return (
                <div key={c.id} style={{ backgroundColor: "white", borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <Link to={`/detail/${c.id}`} state={{ from: location.pathname }} style={{ fontWeight: 900, fontSize: 15, color: THEME.primary, textDecoration: "underline", textUnderlineOffset: 3 }}>
                        {c["姓"]} {c["名"]} 様
                      </Link>
                      <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>{c["電話番号"] || "-"}</div>
                    </div>
                    <span style={{ fontSize: 11, backgroundColor: stColor.bg, color: stColor.text, padding: "3px 8px", borderRadius: 6, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {c["対応ステータス"] || "-"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textMuted, display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <UserCircle size={13} color={THEME.primary} />
                      {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={13} /> {formatDate(c["登録日"])}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link to={`/detail/${c.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", backgroundColor: "#EEF2FF", color: THEME.primary, borderRadius: 8, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
                      <ExternalLink size={13} /> 詳細
                    </Link>
                    <Link to={`/direct-sms/${c.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", backgroundColor: "#F0FDF4", color: "#16A34A", borderRadius: 8, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
                      <Send size={13} /> SMS
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* PC/タブレット：テーブル形式 */
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: "#F8FAFC" }}>
                  {["顧客名", "対応ステータス", "担当者", "シナリオ", "登録日", "操作"].map((h) => (
                    <th key={h} style={{ padding: "14px 20px", fontSize: 11, fontWeight: 800, color: THEME.textMuted, textAlign: "left", borderBottom: `1px solid ${THEME.border}`, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const staff = staffList.find((s) => s.email === c["担当者メール"]);
                  const statusDef = statuses.find(s => s.name === (c["対応ステータス"] || "").trim());
                  const stColor = statusDef?.isFixed
                    ? { bg: "#F0F9FF", text: "#0EA5E9" }
                    : statusDef?.terminalType === "won" ? { bg: "#DCFCE7", text: "#16A34A" }
                    : statusDef?.terminalType === "lost" ? { bg: "#FEE2E2", text: "#DC2626" }
                    : statusDef?.terminalType === "excluded" ? { bg: "#F3F4F6", text: "#6B7280" }
                    : { bg: "#FEF3C7", text: "#D97706" };
                  return (
                    <tr key={c.id} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")} style={{ transition: "0.1s" }}>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>
                          <Link to={`/detail/${c.id}`} state={{ from: location.pathname }} style={{ color: THEME.primary, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                            {c["姓"]} {c["名"]} 様
                          </Link>
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>{c["電話番号"] || "-"}</div>
                      </td>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <span style={{ fontSize: 12, backgroundColor: stColor.bg, color: stColor.text, padding: "4px 10px", borderRadius: 8, fontWeight: 800, whiteSpace: "nowrap" }}>
                          {c["対応ステータス"] || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: THEME.textMuted }}>
                          <UserCircle size={14} color={THEME.primary} />
                          {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <span style={{ fontSize: 12, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "3px 10px", borderRadius: 6, fontWeight: 800 }}>
                          {c["シナリオID"] || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: THEME.textMuted }}>
                          <Calendar size={13} /> {formatDate(c["登録日"])}
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", borderBottom: `1px solid ${THEME.border}` }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Link to={`/detail/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", backgroundColor: "#EEF2FF", color: THEME.primary, borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>
                            <ExternalLink size={13} /> 詳細
                          </Link>
                          <Link to={`/direct-sms/${c.id}`} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", backgroundColor: "#F0FDF4", color: "#16A34A", borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>
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