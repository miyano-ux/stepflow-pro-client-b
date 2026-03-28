import React, { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

const toLocalDate = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const buildValue = (dateStr, hh, mm) =>
  `${dateStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

const TIME_PRESETS = [
  { label: "9:00",  hh: 9,  mm: 0 },
  { label: "10:00", hh: 10, mm: 0 },
  { label: "12:00", hh: 12, mm: 0 },
  { label: "14:00", hh: 14, mm: 0 },
  { label: "17:00", hh: 17, mm: 0 },
  { label: "19:00", hh: 19, mm: 0 },
  { label: "21:00", hh: 21, mm: 0 },
];

function SmartDateTimePicker({ value, onChange }) {
  const now = new Date();
  const today    = toLocalDate(now);
  const tomorrow = toLocalDate(new Date(now.getTime() + 86400000));
  const dayAfter = toLocalDate(new Date(now.getTime() + 172800000));

  const [showCustomTime, setShowCustomTime] = useState(false);

  const selectedDate = value ? value.slice(0, 10) : today;
  // "HH:mm" 形式
  const selectedTime = value ? value.slice(11, 16) : "10:00";
  const selectedHH   = parseInt(selectedTime.slice(0, 2));
  const selectedMM   = parseInt(selectedTime.slice(3, 5));

  const isPresetTime     = TIME_PRESETS.some((p) => p.hh === selectedHH && p.mm === selectedMM);
  const isCustomDate     = ![today, tomorrow, dayAfter].includes(selectedDate);
  const isCustomTimeOpen = showCustomTime || !isPresetTime;

  const handleDateChange = (e) => {
    if (e.target.value) onChange(buildValue(e.target.value, selectedHH, selectedMM));
  };

  const handleDateBtn = (dateStr) => onChange(buildValue(dateStr, selectedHH, selectedMM));

  const handleTimePreset = (hh, mm) => {
    setShowCustomTime(false);
    onChange(buildValue(selectedDate, hh, mm));
  };

  // ★ value 制御: 入力中も onChange で親を更新
  const handleCustomTimeChange = (e) => {
    if (!e.target.value) return;
    const [hh, mm] = e.target.value.split(":").map(Number);
    if (!isNaN(hh) && !isNaN(mm)) onChange(buildValue(selectedDate, hh, mm));
  };

  const DATE_OPTIONS = [
    { label: "今日",   value: today    },
    { label: "明日",   value: tomorrow },
    { label: "明後日", value: dayAfter },
  ];

  const btnBase = {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", padding: "8px 14px", borderRadius: "10px",
    fontWeight: "700", cursor: "pointer", transition: "0.15s",
    fontSize: "13px", boxSizing: "border-box", flex: "0 0 auto",
  };
  const activeBtn   = { backgroundColor: THEME.primary, color: "white", border: "none", boxShadow: "0 4px 10px rgba(91,79,206,0.3)" };
  const inactiveBtn = { backgroundColor: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` };

  // 自由入力フィールドの共通スタイル
  const freeInputBase = {
    borderRadius: "10px", fontSize: "13px",
    boxSizing: "border-box", transition: "border 0.15s",
    cursor: "pointer",          // ← クリックできることを示す
    outline: "none",
  };
  // ACTIVE（カスタム選択中）スタイル
  const freeInputActive = {
    border: `2px solid ${THEME.primary}`,
    backgroundColor: "white",
    color: THEME.textMain,
  };
  // 非アクティブ（プリセット選択中）スタイル
  const freeInputInactive = {
    border: `1px solid ${THEME.border}`,
    backgroundColor: "white",
    color: THEME.textMuted,
  };

  return (
    <div style={{
      backgroundColor: "#F8F7FF",
      borderRadius: "16px",
      border: `1px solid ${THEME.border}`,
      padding: "20px",
      boxSizing: "border-box",
      width: "100%",
    }}>

      {/* ── 配信日 ─────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Calendar size={14} color={THEME.primary} />
        <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          配信日
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {DATE_OPTIONS.map((opt) => (
          <button key={opt.value} type="button"
            onClick={() => handleDateBtn(opt.value)}
            style={{ ...btnBase, ...(selectedDate === opt.value && !isCustomDate ? activeBtn : inactiveBtn) }}
          >
            {opt.label}
          </button>
        ))}

        {/* 自由入力 date — value 制御で常に同期、クリック可能 */}
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          style={{
            ...freeInputBase,
            ...(isCustomDate ? freeInputActive : freeInputInactive),
            flex: 1, minWidth: 0,
            padding: "8px 12px",
          }}
        />
      </div>

      {/* ── 配信時刻 ───────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Clock size={14} color={THEME.primary} />
        <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          配信時刻
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TIME_PRESETS.map((p) => {
          const isActive = !showCustomTime && selectedHH === p.hh && selectedMM === p.mm;
          return (
            <button key={p.label} type="button"
              onClick={() => handleTimePreset(p.hh, p.mm)}
              style={{ ...btnBase, ...(isActive ? activeBtn : inactiveBtn) }}
            >
              {p.label}
            </button>
          );
        })}
        <button type="button"
          onClick={() => setShowCustomTime((v) => !v)}
          style={{ ...btnBase, ...(isCustomTimeOpen ? activeBtn : inactiveBtn) }}
        >
          カスタム
        </button>
      </div>

      {/* 自由入力 time — value制御 + showPicker() で全体クリック対応 */}
      {isCustomTimeOpen && (
        <input
          type="time"
          value={selectedTime}
          onChange={handleCustomTimeChange}
          onClick={(e) => { try { e.target.showPicker(); } catch (_) {} }}
          style={{
            ...freeInputBase,
            ...freeInputActive,
            width: "100%",
            fontSize: "14px",
            padding: "10px 16px",
            marginTop: 12,
            cursor: "pointer",
          }}
        />
      )}
    </div>
  );
}

export default SmartDateTimePicker;