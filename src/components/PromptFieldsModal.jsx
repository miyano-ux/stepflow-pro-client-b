import React, { useState } from "react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "./CustomSelect";

// ==========================================
// 📝 PromptFieldsModal
// ステータス変更後に追加で管理項目を確認するポップアップ
// ==========================================

export default function PromptFieldsModal({
  newStatus,         // 変更先ステータス名
  promptFields = [], // ["契約種別", "流入元", "担当者メール"]
  sources = [],
  contractTypes = [],
  staffList = [],
  currentValues = {}, // 現在のフォームデータ（初期値として使用）
  onConfirm,         // (values: { [key]: value }) => void
  onSkip,            // () => void
}) {
  const [values, setValues] = useState(currentValues);

  if (promptFields.length === 0) return null;

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const renderField = (key) => {
    switch (key) {
      case "契約種別":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>契約種別</div>
            <CustomSelect
              value={values["契約種別"] || ""}
              onChange={v => set("契約種別", v)}
              placeholder="未選択"
              options={[
                { value: "", label: "未選択" },
                ...contractTypes.map(t => ({ value: t, label: t })),
              ]}
            />
          </div>
        );
      case "流入元":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>流入元</div>
            <CustomSelect
              value={values["流入元"] || ""}
              onChange={v => set("流入元", v)}
              placeholder="未選択"
              options={[
                { value: "", label: "未選択" },
                ...sources.map(s => ({ value: s.name, label: s.name })),
              ]}
            />
          </div>
        );
      case "担当者メール":
        return (
          <div key={key}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>担当者</div>
            <CustomSelect
              value={values["担当者メール"] || ""}
              onChange={v => set("担当者メール", v)}
              placeholder="未選択"
              options={[
                { value: "", label: "未選択" },
                ...staffList.map(s => ({ value: s.email, label: `${s.lastName} ${s.firstName}` })),
              ]}
            />
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