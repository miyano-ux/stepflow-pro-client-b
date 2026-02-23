import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BarChart3, Users, Filter, ChevronRight, Loader2 } from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  filterBar: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" },
  chartContainer: { display: "flex", gap: "8px", alignItems: "flex-end", height: "400px", padding: "40px 0", overflowX: "auto" },
  barWrapper: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", minWidth: "120px" },
  bar: { width: "80%", borderRadius: "8px 8px 0 0", position: "relative", transition: "height 0.5s ease" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, marginTop: "40px" },
  tableTh: { padding: "14px 20px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase" },
  tableTd: { padding: "18px 20px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMain }
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

  // フィルタリングと集計
  const reportData = useMemo(() => {
    const filtered = customers.filter(c => !filterStaff || c["担当者メール"] === filterStaff);
    const totalCount = filtered.length;

    return statuses.map((st, idx) => {
      const count = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name).length;
      // Mazrica風の「維持率」計算（前のステップとの比率など）
      const ratio = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
      return { ...st, count, ratio };
    });
  }, [customers, statuses, filterStaff]);

  const maxCount = Math.max(...reportData.map(d => d.count), 1);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
              <BarChart3 color={THEME.primary} /> 分析レポート
            </h1>
            <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "6px" }}>全顧客のステータス遷移と担当者別パフォーマンスを可視化</p>
          </div>
          
          <div style={styles.filterBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "white", padding: "8px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}` }}>
              <Users size={16} color={THEME.textMuted} />
              <select 
                style={{ border: "none", outline: "none", fontSize: "14px", fontWeight: "600", color: THEME.textMain }}
                value={filterStaff} 
                onChange={e => setFilterStaff(e.target.value)}
              >
                <option value="">全ての担当営業</option>
                {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div style={styles.card}>
          <h3 style={{ fontSize: "16px", fontWeight: "800", marginBottom: "32px", display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={18} /> ステータス別案件分布
          </h3>

          {/* Mazrica風の遷移グラフ */}
          <div style={styles.chartContainer}>
            {reportData.map((d, i) => (
              <div key={d.name} style={styles.barWrapper}>
                <div style={{ fontSize: "12px", fontWeight: "800", color: THEME.primary }}>{d.count} 件</div>
                <div 
                  style={{ 
                    ...styles.bar, 
                    height: `${(d.count / maxCount) * 100}%`,
                    backgroundColor: i % 2 === 0 ? THEME.primary : "#818CF8",
                    opacity: 0.8 + (i * 0.05)
                  }} 
                >
                  <div style={{ position: "absolute", top: "-25px", left: "50%", transform: "translateX(-50%)", fontSize: "10px", fontWeight: "900", color: THEME.textMuted }}>
                    {d.ratio}%
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: "700", textAlign: "center", height: "40px", display: "flex", alignItems: "center" }}>
                  {d.name}
                </div>
              </div>
            ))}
          </div>

          {/* 詳細データテーブル */}
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableTh}>フェーズ</th>
                <th style={styles.tableTh}>案件維持率 (%)</th>
                <th style={styles.tableTh}>件数</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map(d => (
                <tr key={d.name}>
                  <td style={{ ...styles.tableTd, fontWeight: "700" }}>{d.name}</td>
                  <td style={styles.tableTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ flex: 1, height: "8px", backgroundColor: "#E2E8F0", borderRadius: "4px", overflow: "hidden", maxWidth: "200px" }}>
                        <div style={{ height: "100%", width: `${d.ratio}%`, backgroundColor: THEME.primary }} />
                      </div>
                      <span style={{ fontWeight: "800" }}>{d.ratio}%</span>
                    </div>
                  </td>
                  <td style={{ ...styles.tableTd, fontWeight: "800" }}>{d.count} <span style={{ fontSize: "12px", fontWeight: "400" }}>件</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}