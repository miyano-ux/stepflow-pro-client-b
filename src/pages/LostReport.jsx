import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";

const THEME = APP_THEME;
const BAR_COLORS = ["#EF4444","#F97316","#EAB308","#84CC16","#06B6D4","#8B5CF6","#EC4899","#6B7280"];

export default function LostReport({ customers = [], statuses = [], staffList = [] }) {
  const navigate  = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");

  const lostStatus = statuses.find(s => s.terminalType === "lost") || statuses[statuses.length - 1];
  const lostLabel  = lostStatus?.name || "失注";

  // 担当者フィルタ済みの失注顧客
  const lostCustomers = useMemo(() =>
    customers.filter(c =>
      (c["対応ステータス"] || "").trim() === lostLabel &&
      (!filterStaff || c["担当者メール"] === filterStaff)
    ),
    [customers, lostLabel, filterStaff]
  );

  // 失注理由集計
  const reasonData = useMemo(() => {
    const map = {};
    lostCustomers.forEach(c => {
      const r = (c["失注理由"] || "理由未記入").trim();
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [lostCustomers]);

  const maxCount = Math.max(...reasonData.map(d => d.count), 1);
  const totalLost = lostCustomers.length;

  // 担当者別失注数
  const byStaff = useMemo(() => {
    const map = {};
    customers.filter(c => (c["対応ステータス"] || "").trim() === lostLabel).forEach(c => {
      const email = c["担当者メール"] || "未割当";
      map[email] = (map[email] || 0) + 1;
    });
    return Object.entries(map)
      .map(([email, count]) => {
        const staff = staffList.find(s => s.email === email);
        return { name: staff ? `${staff.lastName} ${staff.firstName}` : (email === "未割当" ? "未割当" : email), count };
      })
      .sort((a, b) => b.count - a.count);
  }, [customers, lostLabel, staffList]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 56px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ヘッダー */}
        <header style={{ marginBottom: 36 }}>
          <button onClick={() => navigate("/analysis")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 14, padding: 0 }}>
            <ChevronLeft size={16} /> レポート一覧に戻る
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <Trash2 size={24} color="#DC2626" />
                <h1 style={{ fontSize: 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>失注・ロスト分析</h1>
              </div>
              <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>失注理由のランキングと担当者別内訳</p>
            </div>
            <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
          </div>
        </header>

        {/* サマリ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
          {[
            { label: "失注総数", value: totalLost, unit: "件", color: "#DC2626", bg: "#FEF2F2" },
            { label: "失注率", value: customers.length > 0 ? `${Math.round(customers.filter(c => (c["対応ステータス"] || "").trim() === lostLabel).length / customers.length * 100)}%` : "–", unit: "", color: "#D97706", bg: "#FFFBEB" },
            { label: "理由記録率", value: lostCustomers.length > 0 ? `${Math.round(lostCustomers.filter(c => c["失注理由"]).length / lostCustomers.length * 100)}%` : "–", unit: "", color: "#059669", bg: "#ECFDF5" },
          ].map(({ label, value, unit, color, bg }) => (
            <div key={label} style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color }}>{value}<span style={{ fontSize: 14, marginLeft: 2 }}>{unit}</span></div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* 失注理由ランキング */}
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain, marginBottom: 24 }}>失注理由ランキング</div>
            {reasonData.length === 0 ? (
              <div style={{ textAlign: "center", color: THEME.textMuted, padding: 40 }}>
                {filterStaff ? "この担当者の失注データがありません" : "失注データがありません"}
              </div>
            ) : (
              reasonData.map((d, i) => (
                <div key={d.reason} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: "white", backgroundColor: BAR_COLORS[i % BAR_COLORS.length], width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.textMain }}>{d.reason}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 900, color: BAR_COLORS[i % BAR_COLORS.length] }}>
                      {d.count}件 <span style={{ fontSize: 11, fontWeight: 600, color: THEME.textMuted }}>({totalLost > 0 ? Math.round(d.count / totalLost * 100) : 0}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 10, backgroundColor: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${(d.count / maxCount) * 100}%`, height: "100%", backgroundColor: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 99, transition: "width 0.7s ease" }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 担当者別失注数 */}
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain, marginBottom: 20 }}>担当者別失注数</div>
            {byStaff.map((d, i) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${THEME.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: THEME.textMain }}>{d.count}<span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 2 }}>件</span></span>
              </div>
            ))}
            {byStaff.length === 0 && <div style={{ textAlign: "center", color: THEME.textMuted, padding: 30 }}>データなし</div>}
          </div>
        </div>
      </div>
    </div>
  );
}