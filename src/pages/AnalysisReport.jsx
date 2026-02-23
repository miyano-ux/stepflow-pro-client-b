import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BarChart3, Users, Filter, Loader2, ChevronDown } from "lucide-react";

const THEME = {
  primary: "#4F46E5", 
  bg: "#F8FAFC", 
  card: "#FFFFFF", 
  textMain: "#1E293B", 
  textMuted: "#64748B", 
  border: "#E2E8F0", 
  success: "#10B981",
  colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF", "#94A3B8"]
};

const styles = {
  main: { 
    marginLeft: "260px", 
    width: "calc(100% - 260px)", 
    minHeight: "100vh", 
    backgroundColor: THEME.bg 
  },
  wrapper: { 
    padding: "48px 64px", 
    maxWidth: "1440px", 
    margin: "0 auto" 
  },
  card: { 
    backgroundColor: THEME.card, 
    borderRadius: "20px", // 角を丸めてモダンに
    border: `1px solid ${THEME.border}`, 
    padding: "40px", 
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)", // 柔らかい浮き出し
    marginBottom: "32px" 
  },
  // 🆕 プレミアム・セレクトコンテナ (真四角を廃止)
  selectContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: "0 18px",
    borderRadius: "14px", // 12pxから14pxへ変更
    border: `1px solid ${THEME.border}`,
    height: "52px",
    minWidth: "280px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },
  selectIconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#EEF2FF",
    marginRight: "12px",
    color: THEME.primary
  },
  select: {
    width: "100%",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: "15px",
    fontWeight: "800", // 文字を強調
    color: THEME.textMain,
    appearance: "none",
    cursor: "pointer",
    paddingRight: "28px",
    zIndex: 2,
    letterSpacing: "-0.01em"
  },
  chartArea: { 
    height: "320px", 
    display: "flex", 
    alignItems: "flex-end", 
    gap: "24px", 
    padding: "20px 0", 
    borderBottom: `2px solid ${THEME.border}`, 
    marginBottom: "16px" 
  },
  barContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    position: "relative"
  },
  bar: { 
    width: "70%",
    margin: "0 auto",
    borderRadius: "8px 8px 2px 2px", 
    position: "relative", 
    transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", // 弾むようなアニメーション
    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)"
  },
  percentageBar: { 
    display: "flex", 
    height: "52px", 
    borderRadius: "14px", 
    overflow: "hidden", 
    width: "100%", 
    backgroundColor: "#F1F5F9", 
    marginTop: "16px",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
  }
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

  const reportData = useMemo(() => {
    const filtered = customers.filter(c => {
      if (!filterStaff) return true;
      const targetEmail = String(filterStaff).trim().toLowerCase();
      const customerEmail = String(c["担当者メール"] || "").trim().toLowerCase();
      return targetEmail === customerEmail;
    });

    const total = filtered.length;

    return statuses.map((st, i) => {
      const count = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name).length;
      const ratio = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return { 
        name: st.name, 
        count, 
        ratio: parseFloat(ratio), 
        color: THEME.colors[i % THEME.colors.length] 
      };
    });
  }, [customers, statuses, filterStaff]);

  const maxCount = Math.max(...reportData.map(d => d.count), 1);
  const totalCases = reportData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "56px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
              <BarChart3 size={32} color={THEME.primary} strokeWidth={2.5} />
              <h1 style={{ fontSize: "36px", fontWeight: "900", color: THEME.textMain, margin: 0, letterSpacing: "-0.03em" }}>
                分析レポート
              </h1>
            </div>
            <p style={{ color: THEME.textMuted, fontSize: "16px", fontWeight: "500" }}>
              案件フェーズの分布と成果をリアルタイム分析
            </p>
          </div>
          
          {/* 🆕 ホバーエフェクト付きプレミアムセレクト */}
          <div 
            style={styles.selectContainer}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = THEME.primary;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 20px -5px rgba(79, 70, 229, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = THEME.border;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = styles.selectContainer.boxShadow;
            }}
          >
            <div style={styles.selectIconWrapper}>
              <Users size={20} strokeWidth={2.5} />
            </div>
            <select 
              style={styles.select} 
              value={filterStaff} 
              onChange={e => setFilterStaff(e.target.value)}
            >
              <option value="">全ての担当営業を表示</option>
              {staffList.map(s => (
                <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
              ))}
            </select>
            <ChevronDown size={22} color={THEME.textMuted} style={{ position: "absolute", right: "18px", pointerEvents: "none", strokeWidth: 2.5 }} />
          </div>
        </header>

        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
              フェーズ別 案件分布
            </h3>
            <div style={{ backgroundColor: "#F1F5F9", padding: "6px 16px", borderRadius: "30px", fontSize: "14px", fontWeight: "800", color: THEME.textMuted }}>
              合計 <span style={{ color: THEME.primary }}>{totalCases}</span> 件
            </div>
          </div>
          
          <div style={styles.chartArea}>
            {reportData.map(d => (
              <div key={d.name} style={styles.barContainer}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "8px" }}>
                  <div style={{ 
                    ...styles.bar, 
                    height: `${(d.count / maxCount) * 100}%`,
                    backgroundColor: d.color,
                    minHeight: d.count > 0 ? "12px" : "4px"
                  }}>
                    {d.count > 0 && (
                      <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", fontWeight: "900", color: d.color, fontSize: "14px" }}>
                        {d.count}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ 
                  fontSize: "12px", 
                  fontWeight: "800", 
                  color: THEME.textMain, 
                  textAlign: "center", 
                  height: "50px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  lineHeight: "1.2"
                }}>
                  {d.name}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "48px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "15px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>構成比率 (100%)</h4>
              <span style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>全フェーズの割合</span>
            </div>
            <div style={styles.percentageBar}>
              {reportData.map(d => d.ratio > 0 && (
                <div 
                  key={d.name} 
                  style={{ 
                    width: `${d.ratio}%`, 
                    backgroundColor: d.color, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    color: "white", 
                    fontSize: "12px", 
                    fontWeight: "900",
                    boxShadow: "inset 1px 0 0 rgba(255,255,255,0.1)"
                  }}
                  title={`${d.name}: ${d.ratio}%`}
                >
                  {d.ratio > 10 ? `${d.ratio}%` : ""}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}