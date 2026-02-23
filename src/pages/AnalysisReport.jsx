import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BarChart3, Users, Filter, Loader2, ChevronDown } from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981",
  colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF", "#94A3B8"]
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", marginBottom: "32px" },
  // 🆕 崩れを防止するカスタムセレクトコンテナ
  selectContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    backgroundColor: "white",
    padding: "0 16px",
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    height: "44px",
    minWidth: "240px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },
  select: {
    width: "100%",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: "14px",
    fontWeight: "700",
    color: THEME.textMain,
    appearance: "none", // デフォルトの矢印を消す
    cursor: "pointer",
    zIndex: 1
  },
  chartArea: { height: "320px", display: "flex", alignItems: "flex-end", gap: "20px", padding: "20px 0", borderBottom: `2px solid ${THEME.border}`, marginBottom: "12px" },
  bar: { flex: 1, borderRadius: "6px 6px 0 0", position: "relative", transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)" },
  percentageBar: { display: "flex", height: "40px", borderRadius: "10px", overflow: "hidden", width: "100%", backgroundColor: "#E2E8F0", marginTop: "12px" }
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

  // 🆕 強化されたフィルタリングと集計ロジック
  const reportData = useMemo(() => {
    const filtered = customers.filter(c => {
      if (!filterStaff) return true;
      // 双方をトリミング・小文字化して比較（データ不整合を吸収）
      const targetEmail = String(filterStaff).trim().toLowerCase();
      const customerEmail = String(c["担当者メール"] || "").trim().toLowerCase();
      return targetEmail === customerEmail;
    });

    const total = filtered.length;

    return statuses.map((st, i) => {
      const count = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name).length;
      const ratio = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return { name: st.name, count, ratio: parseFloat(ratio), color: THEME.colors[i % THEME.colors.length] };
    });
  }, [customers, statuses, filterStaff]);

  const maxCount = Math.max(...reportData.map(d => d.count), 1);
  const totalCases = reportData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>分析レポート</h1>
            <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "4px" }}>案件フェーズの分布と成果をリアルタイム分析</p>
          </div>
          
          <div style={styles.selectContainer}>
            <Users size={18} color={THEME.textMuted} style={{ marginRight: "10px" }} />
            <select 
              style={styles.select} 
              value={filterStaff} 
              onChange={e => setFilterStaff(e.target.value)}
            >
              <option value="">全ての担当者</option>
              {staffList.map(s => (
                <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
              ))}
            </select>
            <ChevronDown size={18} color={THEME.textMuted} style={{ position: "absolute", right: "12px", pointerEvents: "none" }} />
          </div>
        </header>

        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>フェーズ別分布 ({totalCases}件)</h3>
          </div>
          
          <div style={styles.chartArea}>
            {reportData.map(d => (
              <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{ 
                    ...styles.bar, 
                    height: `${(d.count / maxCount) * 100}%`,
                    backgroundColor: d.color,
                    minHeight: d.count > 0 ? "8px" : "2px"
                  }}>
                    {d.count > 0 && (
                      <div style={{ position: "absolute", top: "-25px", left: "50%", transform: "translateX(-50%)", fontWeight: "900", color: d.color, fontSize: "13px" }}>
                        {d.count}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, textAlign: "center", height: "50px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {d.name}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "40px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "800", color: THEME.textMuted, marginBottom: "12px" }}>構成比率</h4>
            <div style={styles.percentageBar}>
              {reportData.map(d => d.ratio > 0 && (
                <div 
                  key={d.name} 
                  style={{ width: `${d.ratio}%`, backgroundColor: d.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: "900" }}
                >
                  {d.ratio > 8 ? `${d.ratio}%` : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}