import React, { useState } from "react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 📝 PromptFieldsModal
// ステータス変更後に追加で管理項目を確認するポップアップ
// ==========================================

const selectStyle = {
  width: "100%", padding: "11px 16px", borderRadius: 10,
  border: `1px solid #E2E8F0`, fontSize: 14, fontWeight: 700,
  outline: "none", backgroundColor: "white", color: "#1E293B",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  cursor: "pointer", boxSizing: "border-box",
};

export default function PromptFieldsModal({
  newStatus,        // 変更先ステータス名
  promptFields = [], // ["契約種別", "流入元", "担当者メール"]
  sources = [],
  contractTypes = [],
  staffList = [],
  onConfirm,        // (values: { [key]: value }) => void
  onSkip,           // () => void
}) {
  const [values, setValues] = useState({});

  if (promptFields.length === 0) return null;

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const renderField = (key) => {
    switch (key) {
      case "契約種別":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>契約種別</div>
            <select style={selectStyle} value={values["契約種別"] || ""} onChange={e => set("契約種別", e.target.value)}>
              <option value="">未選択</option>
              {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        );
      case "流入元":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>流入元</div>
            <select style={selectStyle} value={values["流入元"] || ""} onChange={e => set("流入元", e.target.value)}>
              <option value="">未選択</option>
              {sources.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        );
      case "担当者メール":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>担当者</div>
            <select style={selectStyle} value={values["担当者メール"] || ""} onChange={e => set("担当者メール", e.target.value)}>
              <option value="">未選択</option>
              {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2500, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, padding: "36px 40px", width: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>
            管理項目の更新
          </h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: THEME.primary }}>「{newStatus}」</strong> への変更に伴い、
            以下の項目を更新できます。<br />
            <span style={{ fontSize: 12 }}>（未選択のままスキップも可能です）</span>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {promptFields.map(renderField)}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onConfirm(values)}
            style={{ flex: 2, padding: 13, borderRadius: 10, border: "none", backgroundColor: THEME.primary, color: "white", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
          >
            更新して完了
          </button>
          <button
            onClick={onSkip}
            style={{ flex: 1, padding: 13, borderRadius: 10, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}