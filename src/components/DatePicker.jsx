import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 📅 DatePicker - カスタム日付入力コンポーネント
// ==========================================

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/**
 * テーマに合わせたカスタム日付ピッカー
 * @param {string} value - "YYYY-MM-DD" 形式の値
 * @param {function} onChange - 値変更コールバック
 * @param {boolean} required - 必須かどうか
 * @param {string} placeholder - プレースホルダー
 */
function DatePicker({ value, onChange, required, placeholder = "日付を選択" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 表示用の年月（カレンダーのナビゲーション用）
  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 月を移動
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // カレンダーの日付グリッドを生成
  const getDays = () => {
    const first = new Date(viewYear, viewMonth, 1).getDay(); // 月初の曜日
    const last = new Date(viewYear, viewMonth + 1, 0).getDate(); // 月末日
    const days = [];
    for (let i = 0; i < first; i++) days.push(null); // 空白
    for (let d = 1; d <= last; d++) days.push(d);
    return days;
  };

  // 日付選択
  const handleSelect = (day) => {
    if (!day) return;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  // クリア
  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  // 表示テキスト
  const displayText = parsed
    ? `${parsed.getFullYear()}年${MONTHS[parsed.getMonth()]}${parsed.getDate()}日`
    : "";

  // 選択中の日かどうか
  const isSelected = (day) => {
    if (!day || !parsed) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  };

  // 今日かどうか
  const isToday = (day) => {
    if (!day) return false;
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* 入力欄（クリックで開く） */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          ...styles.input,
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
          color: displayText ? THEME.textMain : THEME.textMuted,
          borderColor: open ? THEME.primary : undefined,
          boxShadow: open ? `0 0 0 3px ${THEME.primary}22` : undefined,
        }}
      >
        <Calendar size={16} color={open ? THEME.primary : THEME.textMuted} />
        <span style={{ flex: 1, fontSize: 14 }}>
          {displayText || placeholder}
        </span>
        {displayText && (
          <X
            size={14}
            color={THEME.textMuted}
            onClick={handleClear}
            style={{ cursor: "pointer", flexShrink: 0 }}
          />
        )}
      </div>

      {/* カレンダーポップオーバー */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          zIndex: 2000,
          backgroundColor: "white",
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 12px 32px rgba(91, 79, 206, 0.15)",
          padding: "20px",
          width: "300px",
        }}>

          {/* ヘッダー：年月ナビゲーション */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={prevMonth} style={navBtnStyle}>
              <ChevronLeft size={16} color={THEME.textMuted} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 15, color: THEME.textMain }}>
              {viewYear}年 {MONTHS[viewMonth]}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>
              <ChevronRight size={16} color={THEME.textMuted} />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 800,
                color: i === 0 ? "#EF4444" : i === 6 ? "#3B82F6" : THEME.textMuted,
                padding: "4px 0",
              }}>
                {w}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {getDays().map((day, i) => {
              const selected = isSelected(day);
              const todayFlag = isToday(day);
              const isSun = day && (new Date(viewYear, viewMonth, day).getDay() === 0);
              const isSat = day && (new Date(viewYear, viewMonth, day).getDay() === 6);

              return (
                <div
                  key={i}
                  onClick={() => handleSelect(day)}
                  style={{
                    textAlign: "center",
                    padding: "7px 0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: selected ? 800 : todayFlag ? 700 : 400,
                    cursor: day ? "pointer" : "default",
                    backgroundColor: selected ? THEME.primary : todayFlag ? "#EEF2FF" : "transparent",
                    color: selected
                      ? "white"
                      : isSun ? "#EF4444"
                      : isSat ? "#3B82F6"
                      : THEME.textMain,
                    border: todayFlag && !selected ? `1.5px solid ${THEME.primary}` : "1.5px solid transparent",
                    transition: "all 0.1s",
                  }}
                  onMouseEnter={e => {
                    if (day && !selected) e.currentTarget.style.backgroundColor = "#F0EFF9";
                  }}
                  onMouseLeave={e => {
                    if (day && !selected) e.currentTarget.style.backgroundColor = todayFlag ? "#EEF2FF" : "transparent";
                  }}
                >
                  {day || ""}
                </div>
              );
            })}
          </div>

          {/* 今日ボタン */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${THEME.border}` }}>
            <button
              onClick={() => {
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const dd = String(today.getDate()).padStart(2, "0");
                onChange(`${today.getFullYear()}-${mm}-${dd}`);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                backgroundColor: "white",
                color: THEME.primary,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              今日を選択
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "6px",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default DatePicker;