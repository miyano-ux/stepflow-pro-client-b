import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BarChart3, Users, Filter, LayoutGrid, Info, Loader2 } from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444",
  colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF", "#94A3B8"]
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "32px" },
  chartArea: { height: "350px", display: "flex", alignItems: "flex-end", gap: "20px", padding: "40px 20px 20px", borderBottom: `2px solid ${THEME.border}`, marginBottom: "12px" },
  bar: { flex: 1, borderRadius: "8px 8px 0 0", position: "relative", transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", justifyContent: "center" },
  percentageBar: { display: "flex", height: "48px", borderRadius: "12px", overflow: "hidden", width: "100%", backgroundColor: "#E2E8F0" }
};

export default function AnalysisReport({ customers = [], statuses = [], masterUrl }) {
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=B社`);
        setStaffList(res?.data?.users || []);
      } catch (e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl]);

// AnalysisReport.jsx (集計ロジック部分の抜粋)
const reportData = useMemo(() => {
  // 🆕 フィルターロジックの強化
  const filtered = customers.filter(c => {
    if (!filterStaff) return true;
    // 比較対象を両方小文字・空白除去して判定
    const staffEmail = String(filterStaff).trim().toLowerCase();
    const customerStaffEmail = String(c["担当者メール"] || "").trim().toLowerCase();
    return staffEmail === customerStaffEmail;
  });

  const total = filtered.length;

  return statuses.map((st, i) => {
    const count = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name).length;
    // 0件でもグラフの軸が消えないよう、計算を安定化
    const ratio = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    return { name: st.name, count, ratio: parseFloat(ratio), color: THEME.colors[i % THEME.colors.length] };
  });
}, [customers, statuses, filterStaff]);

  const maxCount = Math.max(...reportData.map(d => d.count), 1);
  const totalCases = reportData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>分析レポート</h1>
            <p style={{ color: THEME.textMuted, fontSize: "14px" }}>案件フェーズの分布と担当者別の成果を分析します</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, backgroundColor: "white", padding: "10px 20px", borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
            <Users size={18} color={THEME.textMuted} />
            <select style={{ border: "none", outline: "none", fontWeight: "700" }} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
              <option value="">全ての担当者</option>
              {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
            </select>
          </div>
        </header>

        {/* 1. 垂直棒グラフ (案件分布) */}
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>フェーズ別 案件数</h3>
            <span style={{ fontSize: "14px", color: THEME.textMuted }}>合計: <strong>{totalCases}</strong> 件</span>
          </div>
          
          <div style={styles.chartArea}>
            {reportData.map(d => (
              <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "8px" }}>
                  <div style={{ 
                    ...styles.bar, 
                    height: d.count > 0 ? `${(d.count / maxCount) * 100}%` : "4px",
                    backgroundColor: d.color,
                    minHeight: d.count > 0 ? "20px" : "4px"
                  }}>
                    <div style={{ position: "absolute", top: "-28px", fontWeight: "900", fontSize: "14px", color: d.color }}>{d.count}</div>
                  </div>
                </div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, textAlign: "center", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: "1.2" }}>
                  {d.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 100%内訳グラフ (ステータス比率) */}
        <div style={styles.card}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "24px" }}>ステータス構成比 (100%)</h3>
          <div style={styles.percentageBar}>
            {reportData.map(d => d.ratio > 0 && (
              <div 
                key={d.name} 
                style={{ width: `${d.ratio}%`, backgroundColor: d.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "900", transition: "0.5s" }}
                title={`${d.name}: ${d.ratio}%`}
              >
                {d.ratio > 5 && `${d.ratio}%`}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "24px" }}>
            {reportData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: d.color }} />
                <span style={{ fontSize: "13px", fontWeight: "700", color: THEME.textMain }}>{d.name}</span>
                <span style={{ fontSize: "13px", color: THEME.textMuted }}>{d.count}件 ({d.ratio}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}