import React from "react";
import { smsUnits } from "../lib/utils";

// ==========================================
// 🔢 SmsCountHint - SMS文字数・送信通数の目安表示
// ==========================================
// 【C1-015／案B】SMSは本文の文字数で課金通数が変わる
//（全角: 1〜70=1通／71〜134=2通／135〜201=3通…、半角英数字のみ: 160/153区切り）。
// 編集中に通数を可視化し、意図せず2通以上になるテンプレートの量産を防ぐ。
//
// 使い分け（案B）:
//   exact=true  … 変数置換後の本文を渡す（DirectSms の resolvedMsg）
//                 ＝実際に送信・課金される文字数そのもの
//   exact=false … テンプレート原文を渡す（TemplateManager / ScenarioForm）
//                 ＝概算。{{姓}} 等の変数は置換後に文字数が増減するため
//                   境界付近（70/134/201文字前後）では通数が変わり得る
//
// 通数計算は lib/utils.js の smsUnits を使用
//（GAS gas_updated.js / license_gas.js の smsUnits_ と同一ロジック。
//   CRLF→LF 正規化も送信時の _normalizeSmsBody と同一）。
export default function SmsCountHint({ text, exact = false, style = {} }) {
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  const len = s.length;
  const units = len === 0 ? 0 : smsUnits(s);
  const warn = units >= 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", ...style }}>
      <span
        title="全角: 1〜70文字=1通／71〜134=2通／135〜201=3通（半角英数字のみの本文は160文字=1通）"
        style={{
          fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 99,
          color: warn ? "#B45309" : "#475569",
          backgroundColor: warn ? "#FFFBEB" : "#F1F5F9",
          border: `1px solid ${warn ? "#FDE68A" : "#E2E8F0"}`,
          whiteSpace: "nowrap",
        }}
      >
        {exact ? "送信" : "目安"} {len}文字・{units}通
      </span>
      <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, lineHeight: 1.5 }}>
        {exact
          ? "全角70文字=1通／〜134文字=2通／〜201文字=3通"
          : "変数（{{姓}} 等）は置換後に増減します（全角70文字=1通／〜134=2通／〜201=3通）"}
      </span>
    </div>
  );
}