import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  BarChart3, Users, ChevronDown, Loader2, 
  Activity, Zap, Trophy, Ghost, User, ExternalLink 
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
  colors: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"]
};

const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)", marginBottom: "32px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" },
  
  // セレクトボックス (V34.0 規格)
  selectContainer: { position: "relative", display: "flex", alignItems: "center", backgroundColor: "#FFFFFF", padding: "0 18px", borderRadius: "14px", border: `1px solid ${THEME.border}`, height: "52px", minWidth: "280px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
  select: { width: "100%", border: "none", outline: "none", backgroundColor: "transparent", fontSize: "15px", fontWeight: "800", color: THEME.textMain, appearance: "none", cursor: "pointer", zIndex: 2 },
  
  // グラフ・リスト
  chartArea: { height: "280px", display: "flex", alignItems: "flex-end", gap: "24px", paddingBottom: "16px", borderBottom: `2px solid ${THEME.border}` },
  feedScroll: { height: "400px", overflowY: "auto", padding: "4px" },
  listScroll: { height: "350px", overflowY: "auto" },
  
  // フィード・行
  feedItem: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", backgroundColor: "#F8FAFC", marginBottom: "8px", border: "1px solid transparent", transition: "0.2s" },
  customerLink: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: "12px", backgroundColor: "white", border: `1px solid ${THEME.border}`, marginBottom: "10px", cursor: "pointer", textDecoration: "none", color: THEME.textMain, transition: "0.2s" }
};

export default function AnalysisReport({ customers = [], statuses = [], trackingLogs = [], masterUrl }) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);

  // ステータスの役割定義 (V34.0 予約語)
  const wonStatusName = statuses[statuses.length - 3]?.name; // 成約
  const dormantStatusName = statuses[statuses.length - 2]?.name; // 休眠
  const lostStatusName = statuses[statuses.length - 1]?.name; // 失注

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=B社`);
        setStaffList(res?.data?.users || []);
      } catch (e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl]);

  // 1. 成功パスのみの統計データ (休眠・失注を除外)
  const successPathData = useMemo(() => {
    const successPathStatuses = statuses.filter(st => st.name !== dormantStatusName && st.name !== lostStatusName);
    const filtered = customers.filter(c => !filterStaff || String(c["担当者メール"]).toLowerCase() === filterStaff.toLowerCase());
    
    return successPathStatuses.map((st, i) => ({
      name: st.name,
      count: filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name).length,
      color: THEME.colors[i % THEME.colors.length]
    }));
  }, [customers, statuses, filterStaff, dormantStatusName, lostStatusName]);

  const maxCount = Math.max(...successPathData.map(d => d.count), 1);

  // 2. フィード用データ (営業プロセス中 vs 休眠中)
  const getFeed = (isDormant) => {
    return trackingLogs.filter(log => {
      const customer = customers.find(c => c.id === log.customerId);
      if (!customer) return false;
      const status = customer["対応ステータス"];
      return isDormant ? status === dormantStatusName : (status !== dormantStatusName && status !== lostStatusName && status !== wonStatusName);
    }).slice(0, 20); // 直近20件
  };

  // 3. 成約・失注リスト用
  const getCustomerByStatus = (statusName) => {
    return customers.filter(c => c["対応ステータス"] === statusName && (!filterStaff || String(c["担当者メール"]).toLowerCase() === filterStaff.toLowerCase()));
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        {/* ヘッダー */}
        <header style={{ marginBottom: "48px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
              <Zap size={32} color={THEME.primary} fill={THEME.primary} />
              <h1 style={{ fontSize: "36px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>営業分析・実況</h1>
            </div>
            <p style={{ color: THEME.textMuted, fontSize: "16px", fontWeight: "500" }}>成功パスの案件分布と、リアルタイムの顧客アクション</p>
          </div>
          
          <div style={styles.selectContainer}>
            <Users size={20} color={THEME.textMuted} style={{ marginRight: "12px" }} />
            <select style={styles.select} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
              <option value="">全ての担当営業を表示</option>
              {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
            </select>
            <ChevronDown size={22} color={THEME.textMuted} style={{ position: "absolute", right: "18px", pointerEvents: "none" }} />
          </div>
        </header>

        {/* 1. 成功パス・棒グラフ */}
        <div style={styles.card}>
          <h3 style={{ fontSize: "18px", fontWeight: "900", marginBottom: "32px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={20} color={THEME.primary} /> 成功パスの案件分布
          </h3>
          <div style={styles.chartArea}>
            {successPathData.map(d => (
              <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "12px" }}>
                  <div style={{ 
                    width: "60%", borderRadius: "8px 8px 2px 2px", backgroundColor: d.color,
                    height: `${(d.count / maxCount) * 100}%`, transition: "height 0.8s ease", position: "relative"
                  }}>
                    {d.count > 0 && <span style={{ position: "absolute", top: "-28px", left: "50%", transform: "translateX(-50%)", fontWeight: "900", color: d.color }}>{d.count}</span>}
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: "800", textAlign: "center", color: THEME.textMain }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. フィードセクション (営業プロセス vs 休眠) */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "20px", color: THEME.primary }}>⚡ 進行中のアクティビティ</h3>
            <div style={styles.feedScroll}>
              {getFeed(false).map((log, i) => (
                <div key={i} style={styles.feedItem}>
                  <div style={{ padding: "8px", backgroundColor: "#EEF2FF", borderRadius: "8px", color: THEME.primary }}><Zap size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "800", fontSize: "13px" }}>{customers.find(c => c.id === log.customerId)?.姓} 様</div>
                    <div style={{ fontSize: "11px", color: THEME.textMuted }}>{log.pageTitle || "ページ閲覧"} - {log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "20px", color: THEME.warning }}>🌙 休眠顧客の再浮上</h3>
            <div style={styles.feedScroll}>
              {getFeed(true).map((log, i) => (
                <div key={i} style={styles.feedItem}>
                  <div style={{ padding: "8px", backgroundColor: "#FFFBEB", borderRadius: "8px", color: THEME.warning }}><Ghost size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "800", fontSize: "13px" }}>{customers.find(c => c.id === log.customerId)?.姓} 様</div>
                    <div style={{ fontSize: "11px", color: THEME.textMuted }}>{log.pageTitle || "ページ閲覧"} - {log.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 成約／失注リスト */}
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "24px", color: THEME.success, display: "flex", alignItems: "center", gap: "8px" }}>
              <Trophy size={20} /> {wonStatusName || "成約"} 一覧
            </h3>
            <div style={styles.listScroll}>
              {getCustomerByStatus(wonStatusName).map(c => (
                <a key={c.id} onClick={() => navigate(`/customers/${c.id}`)} style={styles.customerLink}>
                  <div style={{ fontWeight: "800" }}>{c.姓} {c.名} <span style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "500", marginLeft: "8px" }}>{c.登録日}</span></div>
                  <ExternalLink size={16} color={THEME.border} />
                </a>
              ))}
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ fontSize: "17px", fontWeight: "900", marginBottom: "24px", color: THEME.danger, display: "flex", alignItems: "center", gap: "8px" }}>
              <Ghost size={20} /> {lostStatusName || "失注"} 一覧
            </h3>
            <div style={styles.listScroll}>
              {getCustomerByStatus(lostStatusName).map(c => (
                <a key={c.id} onClick={() => navigate(`/customers/${c.id}`)} style={styles.customerLink}>
                  <div style={{ fontWeight: "800" }}>{c.姓} {c.名} <span style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "500", marginLeft: "8px" }}>{c.登録日}</span></div>
                  <ExternalLink size={16} color={THEME.border} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}