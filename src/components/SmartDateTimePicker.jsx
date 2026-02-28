import React from "react";
import { Calendar } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 📅 SmartDateTimePicker - 日時選択コンポーネント
// ==========================================

/**
 * クイック選択ボタン付きの日時入力コンポーネント
 * @param {string} value - 現在の日時値（"YYYY-MM-DDTHH:mm" 形式）
 * @param {function} onChange - 値変更時のコールバック
 */
function SmartDateTimePicker({ value, onChange }) {
  /**
   * 現在時刻から指定分後の日時をセットする
   * @param {number} min - 加算する分数
   */
  const setQuick = (min) => {
    const d = new Date(new Date().getTime() + min * 60000);
    const jst = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    onChange(jst);
  };

  return (
    <div
      style={{
        ...styles.card,
        padding: "16px",
        background: "#F1F5F9",
        border: "none",
      }}
    >
      {/* 日時入力フィールド */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <Calendar size={18} color={THEME.primary} />
        <input
          type="datetime-local"
          style={{ ...styles.input, flex: 1 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {/* クイック選択ボタン */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setQuick(60)}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            padding: "6px 12px",
            fontSize: "11px",
          }}
        >
          +1時間
        </button>
        <button
          type="button"
          onClick={() => setQuick(1440)}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            padding: "6px 12px",
            fontSize: "11px",
          }}
        >
          明日
        </button>
      </div>
    </div>
  );
}

export default SmartDateTimePicker;