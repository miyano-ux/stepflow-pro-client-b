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

  // 【A2-031】数値型 → 数字・小数点以外を入力時点で除去する。
  //   全角数字は半角へ変換して受け付ける（utils.js smartNormalizePhone と同方針）。
  //   "1.2.3" 等の不正形は入力段では防げないため、保存時検証
  //   （CustomerForm.jsx handleSubmit / CustomerDetail.jsx handleSave）と二段構えにする。
  if (f.type === "number") {
    return (
      <input
        id={fieldId}
        style={styles.input}
        type="text"
        inputMode="decimal"
        required={f.required}
        value={value || ""}
        onChange={(e) => {
          const v = e.target.value
            .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
            .replace(/[^0-9.]/g, "");
          onChange(v);
        }}
        placeholder={`${f.name}を入力（半角数字）`}
      />
    );
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