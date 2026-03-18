import React, { useState, useRef, useEffect } from "react";
import { THEME } from "../lib/constants";
import { Check, ChevronDown } from "lucide-react";

/**
 * CustomSelect - ネイティブselectの代替カスタムコンポーネント
 * @param {string} value - 現在の値
 * @param {Array<{value, label, disabled}>} options - 選択肢
 * @param {function} onChange - 値変更コールバック
 * @param {string} color - アクセントカラー（省略時はTHEME.primary）
 * @param {string} placeholder - 未選択時のラベル
 */
export default function CustomSelect({ value, options = [], onChange, color, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const accentColor = color || THEME.primary;
  const selected = options.find(o => o.value === value);
  const displayLabel = selected?.label || placeholder || "選択してください";
  const isPlaceholder = !selected;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "11px 14px",
          border: `1px solid ${open ? accentColor : THEME.border}`,
          borderRadius: "12px", backgroundColor: "white",
          color: isPlaceholder ? THEME.textMuted : THEME.textMain,
          fontSize: "14px", fontWeight: 700,
          cursor: "pointer", boxSizing: "border-box",
          outline: "none", transition: "border-color 0.15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, marginLeft: 6, opacity: 0.5,
            transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
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
          maxHeight: 240, overflowY: "auto",
        }}>
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "10px 14px",
                  border: "none", backgroundColor: isActive ? `${accentColor}15` : "transparent",
                  color: opt.disabled ? "#aaa" : isActive ? accentColor : THEME.textMain,
                  fontSize: "14px", fontWeight: isActive ? 800 : 700,
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                  textAlign: "left", boxSizing: "border-box",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!opt.disabled && !isActive) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                onMouseLeave={e => { if (!opt.disabled && !isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>{opt.label}</span>
                {isActive && <Check size={13} color={accentColor} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}