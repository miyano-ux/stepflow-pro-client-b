import React from "react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 📅 DateRangePicker - 日付範囲選択コンポーネント
// ==========================================

/**
 * 開始日〜終了日を選択する日付範囲入力コンポーネント
 * @param {string} label - フィールドのラベル
 * @param {{ start: string, end: string }} value - 現在の日付範囲 { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @param {function} onChange - 値変更時のコールバック（新しい { start, end } オブジェクトを渡す）
 */
function DateRangePicker({ label, value = {}, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>

      {/* ラベル */}
      <label
        style={{
          fontSize: "11px",
          fontWeight: "800",
          color: THEME.textMuted,
        }}
      >
        {label}
      </label>

      {/* 日付入力 */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="date"
          style={{ ...styles.input, width: "135px", padding: "8px" }}
          value={value.start || ""}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
        />
        <span style={{ color: THEME.textMuted }}>〜</span>
        <input
          type="date"
          style={{ ...styles.input, width: "135px", padding: "8px" }}
          value={value.end || ""}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
        />
      </div>

    </div>
  );
}

export default DateRangePicker;