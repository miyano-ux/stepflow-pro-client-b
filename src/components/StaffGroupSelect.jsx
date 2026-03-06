import React, { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";

// ==========================================
// 👥 StaffGroupSelect
// 担当者（個人）またはグループから選択するドロップダウン
// グループ選択時はGASの assignGroup を呼んで自動でメールをセット
// ==========================================

export default function StaffGroupSelect({ value, onChange, staffList = [], groups = [], label = "担当者", inputId }) {
  const [loading, setLoading] = useState(false);
  const [assignedName, setAssignedName] = useState(null); // グループ割り当て後の表示名

  const handleChange = async (e) => {
    const val = e.target.value;

    // グループ選択（"group:グループID" 形式）
    if (val.startsWith("group:")) {
      const groupId = val.replace("group:", "");
      setLoading(true);
      setAssignedName(null);
      try {
        const res = await apiCall.post(GAS_URL, { action: "assignGroup", groupId });
        if (res?.email) {
          onChange(res.email);
          // 割り当て先の名前を表示
          const staff = staffList.find(s => s.email === res.email);
          if (staff) setAssignedName(`${staff.lastName} ${staff.firstName}`);
        } else {
          alert(res?.message || "割り当てに失敗しました");
        }
      } catch {
        alert("通信エラーが発生しました");
      } finally {
        setLoading(false);
      }
      return;
    }

    // 個人選択（またはリセット）
    setAssignedName(null);
    onChange(val);
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        <select
          id={inputId}
          style={{ ...styles.input, paddingRight: loading ? 40 : undefined }}
          value={value || ""}
          onChange={handleChange}
          disabled={loading}
        >
          {/* 個人選択 */}
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

          {/* グループ選択 */}
          {groups.length > 0 && (
            <optgroup label="── グループから割り当て ──">
              {groups.map(g => (
                <option key={g["グループID"]} value={`group:${g["グループID"]}`}>
                  👥 {g["グループ名"]}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {loading && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <Loader2 size={16} className="animate-spin" color={THEME.primary} />
          </div>
        )}
      </div>

      {/* グループ割り当て後の通知 */}
      {assignedName && (
        <div style={{
          marginTop: 6, padding: "6px 12px",
          backgroundColor: "#EEF2FF", borderRadius: 8,
          fontSize: 12, fontWeight: 700, color: THEME.primary,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Users size={13} />
          グループ割り当て → {assignedName}
        </div>
      )}
    </div>
  );
}