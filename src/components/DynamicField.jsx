import React from "react";
import { styles } from "../lib/styles";
import DatePicker from "./DatePicker";
import CustomSelect from "./CustomSelect";

// ==========================================
// 🔧 DynamicField - フォーム項目動的レンダリングコンポーネント
// ==========================================

/**
 * 項目定義（formSettings）に基づいて適切な入力フィールドを動的に描画する
 * @param {object} f - 項目定義オブジェクト { name, type, required, options }
 * @param {string} value - 現在の値
 * @param {function} onChange - 値変更時のコールバック
 */
function DynamicField({ f, value, onChange, fieldId }) {
  // ドロップダウン（選択肢型）
  if (f.type === "dropdown") {
    const opts = [
      { value: "", label: "選択してください" },
      ...(f?.options?.split(",").map(opt => ({ value: opt.trim(), label: opt.trim() })) || []),
    ];
    return <CustomSelect value={value || ""} onChange={onChange} options={opts} />;
  }

  // 日付型 → カスタムDatePickerを使用
  if (f.type === "date") {
    return (
      <DatePicker
        id={fieldId}
        value={value || ""}
        onChange={onChange}
        required={f.required}
        placeholder={`${f.name}を選択`}
      />
    );
  }

  // テキスト・email・その他 → すべて通常テキスト入力として扱う
  return (
    <input
      id={fieldId}
      style={styles.input}
      type="text"
      required={f.required}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`${f.name}を入力`}
    />
  );
}

export default DynamicField;