import React from "react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 👥 StaffGroupSelect
//
// deferred=false（デフォルト）: 即時モード
//   グループ選択時にすぐ assignGroup を呼んで担当者メールをセット
//   → CustomerDetail の担当者変更に使用
//
// deferred=true: 遅延モード
//   グループ選択時は "group:グループID" という文字列をそのままセット
//   実際の割り当ては呼び出し元（CustomerForm の submit 時など）が行う
//   → CustomerForm / GmailSettings に使用
// ==========================================

export default function StaffGroupSelect({
  value, onChange, staffList = [], groups = [], inputId, deferred = false,
}) {
  const handleChange = (e) => {
    // deferred モードでは何もせずそのまま親に渡す（group:xxx も含め）
    onChange(e.target.value);
  };

  // 表示用: value が "group:xxx" のとき、グループ名を選択状態に見せる
  const displayValue = value || "";

  return (
    <div>
      <select
        id={inputId}
        style={styles.input}
        value={displayValue}
        onChange={handleChange}
      >
        <option value="">未割当</option>

        {staffList.length > 0 && (
          <optgroup label="── 個人で指定 ──">
            {staffList.map(s => (
              <option key={s.email} value={s.email}>
                {s.lastName} {s.firstName}
              </option>
            ))}
          </optgroup>
        )}

        {groups.length > 0 && (
          <optgroup label={deferred ? "── グループから割り当て（登録時に自動選出）──" : "── グループから割り当て ──"}>
            {groups.map(g => (
              <option key={g["グループID"]} value={`group:${g["グループID"]}`}>
                👥 {g["グループ名"]}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* deferred モードでグループが選ばれているとき、説明バッジを表示 */}
      {deferred && displayValue.startsWith("group:") && (() => {
        const gid = displayValue.replace("group:", "");
        const grp = groups.find(g => g["グループID"] === gid);
        return grp ? (
          <div style={{
            marginTop: 6, padding: "5px 12px",
            backgroundColor: "#EEF2FF", borderRadius: 8,
            fontSize: 12, fontWeight: 700, color: THEME.primary,
          }}>
            👥 {grp["グループ名"]} のメンバーに自動割り当て（登録時に決定）
          </div>
        ) : null;
      })()}
    </div>
  );
}