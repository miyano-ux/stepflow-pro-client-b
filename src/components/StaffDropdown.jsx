import React, { useState, useEffect, useRef } from "react";
import { UserCircle, Users, ChevronDown, Check } from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 👤 StaffDropdown - 担当者選択ドロップダウン
// ==========================================
// KanbanBoard・AnalysisReport 等で共通使用

export function StaffDropdown({ staffList = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = staffList.find((s) => s.email === value);
  const label = selected ? `${selected.lastName} ${selected.firstName}` : "全ての担当者";
  const options = [
    { email: "", label: "全ての担当者" },
    ...staffList.map((s) => ({ email: s.email, label: `${s.lastName} ${s.firstName}` })),
  ];

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          backgroundColor: "#FFF", border: `1px solid ${open ? THEME.primary : THEME.border}`,
          borderRadius: 12, padding: "0 14px", height: 42, minWidth: 200, cursor: "pointer",
          boxShadow: open ? `0 0 0 3px ${THEME.primary}20` : "none",
          transition: "all 0.15s",
        }}
      >
        {selected ? (
          <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <UserCircle size={16} color={THEME.primary} />
          </div>
        ) : (
          <Users size={15} color={THEME.textMuted} />
        )}
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 800, color: THEME.textMain, whiteSpace: "nowrap" }}>
          {label}
        </span>
        <ChevronDown size={15} color={THEME.textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 1000,
          backgroundColor: "#FFF", borderRadius: 16, border: `1px solid ${THEME.border}`,
          boxShadow: "0 16px 32px rgba(0,0,0,0.12)", minWidth: 220, overflow: "hidden",
        }}>
          <div style={{ padding: "6px" }}>
            {options.map((opt) => {
              const isActive = opt.email === value;
              return (
                <button
                  key={opt.email}
                  onClick={() => { onChange(opt.email); setOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                    backgroundColor: isActive ? "#EEF2FF" : "transparent",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  {opt.email ? (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: isActive ? "#C7D2FE" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <UserCircle size={17} color={THEME.primary} />
                    </div>
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Users size={14} color={THEME.textMuted} />
                    </div>
                  )}
                  <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: isActive ? 900 : 700, color: isActive ? THEME.primary : THEME.textMain }}>
                    {opt.label}
                  </span>
                  {isActive && <Check size={14} color={THEME.primary} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}