import React, { useState, useRef, useEffect } from "react";
import { THEME } from "../lib/constants";
import { Check, ChevronDown } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── 選択肢を構築 ──────────────────────────────────────
  const options = [
    { value: "", label: "未割当" },
    ...(staffList.length > 0 ? [
      { value: "__sep_personal__", label: "── 個人で指定 ──", disabled: true },
      ...staffList.map(s => ({
        value: s.email,
        label: `${s.lastName} ${s.firstName}`.trim(),
      })),
    ] : []),
    ...(groups.length > 0 ? [
      {
        value: "__sep_group__",
        label: deferred
          ? "── グループから割り当て（登録時に自動選出）──"
          : "── グループから割り当て ──",
        disabled: true,
      },
      ...groups.map(g => ({
        value: `group:${g["グループID"]}`,
        label: g["グループ名"],
        isGroup: true,
      })),
    ] : []),
  ];

  const displayValue = value || "";
  const selected = options.find(o => o.value === displayValue);
  const displayLabel = selected?.label || "未割当";
  const isPlaceholder = !displayValue;
  const isGroupSelected = displayValue.startsWith("group:");

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* トリガーボタン */}
      <button
        id={inputId}
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "11px 14px",
          border: `1px solid ${open ? THEME.primary : THEME.border}`,
          borderRadius: "12px", backgroundColor: "white",
          color: isPlaceholder ? THEME.textMuted : THEME.textMain,
          fontSize: "14px", fontWeight: 700,
          cursor: "pointer", boxSizing: "border-box",
          outline: "none", transition: "border-color 0.15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
          {isGroupSelected && <span style={{ fontSize: 13 }}>👥</span>}
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0, marginLeft: 6, opacity: 0.5,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {/* ドロップダウンリスト */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          backgroundColor: "white", borderRadius: "12px",
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          zIndex: 500, overflow: "hidden",
          maxHeight: 260, overflowY: "auto",
        }}>
          {options.map((opt) => {
            if (opt.disabled) {
              // セパレーター行
              return (
                <div
                  key={opt.value}
                  style={{
                    padding: "8px 14px 4px",
                    fontSize: 11, fontWeight: 800,
                    color: THEME.textMuted,
                    backgroundColor: "#F8FAFC",
                    borderTop: "1px solid #F1F5F9",
                    userSelect: "none",
                  }}
                >
                  {opt.label}
                </div>
              );
            }
            const isActive = opt.value === displayValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "10px 14px",
                  border: "none",
                  backgroundColor: isActive ? `${THEME.primary}15` : "transparent",
                  color: isActive ? THEME.primary : THEME.textMain,
                  fontSize: "14px", fontWeight: isActive ? 800 : 700,
                  cursor: "pointer", textAlign: "left", boxSizing: "border-box",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {opt.isGroup && <span style={{ fontSize: 13 }}>👥</span>}
                  {opt.label}
                </span>
                {isActive && <Check size={13} color={THEME.primary} />}
              </button>
            );
          })}
        </div>
      )}

      {/* deferred モードでグループが選ばれているとき、説明バッジを表示 */}
      {deferred && isGroupSelected && (() => {
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