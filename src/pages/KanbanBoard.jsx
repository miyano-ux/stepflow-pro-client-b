import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Columns, ListTodo, UserCircle, MessageSquare, 
  Trophy, Moon, Trash2, ChevronRight, Loader2, Users 
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", warning: "#F59E0B", danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column" },
  wrapper: { padding: "40px 40px 0", flex: 1, display: "flex", flexDirection: "column" },
  kanbanContainer: { display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "24px", flex: 1, alignItems: "flex-start" },
  column: { minWidth: "300px", width: "300px", backgroundColor: "#EDF2F7", borderRadius: "16px", padding: "16px", minHeight: "65vh" },
  card: { backgroundColor: "#FFF", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", cursor: "grab", transition: "0.2s" },
  // 🆕 スペシャルゾーン（下部固定）のスタイル
  bottomBar: { 
    position: "sticky", bottom: 0, left: 0, right: 0, 
    backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)",
    padding: "24px 40px", borderTop: `1px solid ${THEME.border}`,
    display: "flex", gap: "24px", justifyContent: "center", zIndex: 10
  },
  specialZone: {
    flex: 1, maxWidth: "300px", height: "80px", borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
    fontWeight: "900", fontSize: "16px", border: "3px dashed transparent",
    transition: "all 0.3s ease"
  }
};

export default function KanbanBoard({ customers = [], statuses = [], onRefresh, masterUrl, gasUrl, companyName }) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId] = useState(null); // ドラッグ中のID

  useEffect(() => { setLocalCustomers(customers); }, [customers]);
  
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${companyName}`);
        setStaffList(res?.data?.users || []);
      } catch(e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl, companyName]);

  const onDragStart = (e, customerId) => {
    e.dataTransfer.setData("customerId", customerId);
    setDraggingId(customerId);
  };
  
  const onDragEnd = () => setDraggingId(null);
  const onDragOver = (e) => e.preventDefault();

  const onDrop = async (e, newStatus) => {
    const cid = e.dataTransfer.getData("customerId");
    setDraggingId(null);

    // 楽観的更新
    const updated = localCustomers.map(c => String(c.id) === String(cid) ? { ...c, "対応ステータス": newStatus } : c);
    setLocalCustomers(updated);

    try {
      // GAS側へ送信 (失注等の場合は、将来的にここでモーダルを表示する等のロジックを追加可能)
      await axios.post(gasUrl, { action: "updateStatus", id: cid, status: newStatus });
      onRefresh();
    } catch (err) {
      alert("同期に失敗しました。再読み込みします。");
      onRefresh();
    }
  };

  const filtered = localCustomers.filter(c => !filterStaff || c["担当者メール"] === filterStaff);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>案件管理カンバン</h1>
          
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button onClick={() => navigate("/status-settings")} style={{ backgroundColor: "#FFF", border: `1px solid ${THEME.border}`, padding: "10px 20px", borderRadius: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <ListTodo size={18} /> ステータス調整
            </button>
            <div style={{ position: "relative", display: "flex", alignItems: "center", backgroundColor: "white", padding: "0 12px", borderRadius: "10px", border: `1px solid ${THEME.border}`, height: "42px" }}>
              <Users size={16} color={THEME.textMuted} style={{ marginRight: 8 }} />
              <select style={{ border: "none", outline: "none", fontWeight: "700", fontSize: "13px" }} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
                <option value="">全ての担当者</option>
                {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
              </select>
            </div>
          </div>
        </header>

        {/* カンバンメインエリア */}
        <div style={styles.kanbanContainer}>
          {statuses.map(st => {
            const colCustomers = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name);
            return (
              <div key={st.name} onDragOver={onDragOver} onDrop={(e) => onDrop(e, st.name)} style={styles.column}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "900", color: THEME.textMain }}>{st.name}</h3>
                  <span style={{ backgroundColor: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", color: THEME.primary }}>{colCustomers.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {colCustomers.map(c => (
                    <div 
                      key={c.id} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, c.id)}
                      onDragEnd={onDragEnd}
                      style={{ 
                        ...styles.card, 
                        border: draggingId === c.id ? `2px solid ${THEME.primary}` : "2px solid transparent",
                        opacity: draggingId === c.id ? 0.5 : 1
                      }}
                    >
                      <div style={{ fontWeight: "900", marginBottom: "8px", fontSize: "14px" }}>{c["姓"]} {c["名"]} 様</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                          <UserCircle size={12}/> {staffList.find(s => s.email === c["担当者メール"])?.lastName || "未割当"}
                        </div>
                        <Link to={`/direct-sms/${c.id}`} style={{ color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px", borderRadius: "8px" }}>
                          <MessageSquare size={14}/>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🆕 最終結果スペシャルゾーン (Sticky Bottom) */}
      <div style={styles.bottomBar}>
        {/* 成約エリア */}
        <div 
          onDragOver={onDragOver} 
          onDrop={(e) => onDrop(e, "成約")}
          style={{ 
            ...styles.specialZone, 
            backgroundColor: "#ECFDF5", color: THEME.success,
            borderColor: draggingId ? THEME.success : "transparent",
            boxShadow: draggingId ? "0 0 20px rgba(16, 185, 129, 0.2)" : "none"
          }}
        >
          <Trophy size={24} /> 成約（売上確定）
        </div>

        {/* 休眠エリア */}
        <div 
          onDragOver={onDragOver} 
          onDrop={(e) => onDrop(e, "休眠")}
          style={{ 
            ...styles.specialZone, 
            backgroundColor: "#FFFBEB", color: THEME.warning,
            borderColor: draggingId ? THEME.warning : "transparent",
            boxShadow: draggingId ? "0 0 20px rgba(245, 158, 11, 0.2)" : "none"
          }}
        >
          <Moon size={24} /> 休眠（ナーチャリング）
        </div>

        {/* 失注エリア */}
        <div 
          onDragOver={onDragOver} 
          onDrop={(e) => onDrop(e, "失注")}
          style={{ 
            ...styles.specialZone, 
            backgroundColor: "#FEF2F2", color: THEME.danger,
            borderColor: draggingId ? THEME.danger : "transparent",
            boxShadow: draggingId ? "0 0 20px rgba(239, 68, 68, 0.2)" : "none"
          }}
        >
          <Trash2 size={24} /> 失注（履歴を残す）
        </div>
      </div>
    </div>
  );
}