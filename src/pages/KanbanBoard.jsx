import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Columns, ListTodo, UserCircle, MessageSquare, 
  Trophy, Moon, Trash2, ChevronDown, Loader2, Users 
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", warning: "#F59E0B", danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column" },
  wrapper: { padding: "40px 40px 0", flex: 1, display: "flex", flexDirection: "column" },
  selectContainer: { position: "relative", display: "flex", alignItems: "center", backgroundColor: "#FFFFFF", padding: "0 14px", borderRadius: "12px", border: `1px solid ${THEME.border}`, height: "42px", minWidth: "220px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  select: { width: "100%", border: "none", outline: "none", backgroundColor: "transparent", fontSize: "13px", fontWeight: "800", color: THEME.textMain, appearance: "none", cursor: "pointer", zIndex: 1 },
  kanbanContainer: { display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "24px", flex: 1, alignItems: "flex-start" },
  column: { minWidth: "310px", width: "310px", backgroundColor: "#EDF2F7", borderRadius: "20px", padding: "16px", minHeight: "60vh", border: "1px solid #E2E8F0" },
  card: { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", transition: "0.2s", border: "2px solid transparent" },
  bottomBar: { position: "sticky", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(12px)", padding: "20px 40px", borderTop: `1px solid ${THEME.border}`, display: "flex", gap: "24px", justifyContent: "center", zIndex: 10 },
  specialZone: { flex: 1, maxWidth: "320px", height: "70px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "900", fontSize: "15px", border: "3px dashed transparent", transition: "all 0.3s ease" }
};

export default function KanbanBoard({ customers = [], statuses = [], onRefresh, masterUrl, gasUrl, companyName }) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId] = useState(null);

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

  // 🆕 最後から3つを「終着ラベル」として取得
  const wonLabel = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel = statuses[statuses.length - 1]?.name || "失注";
  const terminalNames = [wonLabel, dormantLabel, lostLabel];

  // 🆕 上部カラムには終着ラベル以外を表示
  const flowingStatuses = statuses.filter(st => !terminalNames.includes(st.name));

  const onDragStart = (e, customerId) => {
    e.dataTransfer.setData("customerId", customerId);
    setDraggingId(customerId);
  };
  const onDragEnd = () => setDraggingId(null);
  const onDragOver = (e) => e.preventDefault();

  const onDrop = async (e, newStatus) => {
    const cid = e.dataTransfer.getData("customerId");
    if (!cid) return;
    setDraggingId(null);

    const updated = localCustomers.map(c => String(c.id) === String(cid) ? { ...c, "対応ステータス": newStatus } : c);
    setLocalCustomers(updated);

    try {
      // 🆕 同期エラーを解消する送信形式
      await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: String(cid), status: newStatus }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      onRefresh();
    } catch (err) {
      onRefresh();
    }
  };

  const filtered = localCustomers.filter(c => !filterStaff || c["担当者メール"] === filterStaff);

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>案件管理カンバン</h1>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button onClick={() => navigate("/status-settings")} style={{ backgroundColor: "#FFF", border: `1px solid ${THEME.border}`, padding: "10px 20px", borderRadius: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><ListTodo size={18} /> ステータス調整</button>
            <div style={styles.selectContainer}>
              <Users size={16} color={THEME.textMuted} style={{ marginRight: 8 }} />
              <select style={styles.select} value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
                <option value="">全ての担当者</option>
                {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
              </select>
              <ChevronDown size={16} color={THEME.textMuted} style={{ position: "absolute", right: "12px", pointerEvents: "none" }} />
            </div>
          </div>
        </header>

        <div style={styles.kanbanContainer}>
          {flowingStatuses.map(st => {
            const colCustomers = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name);
            return (
              <div key={st.name} onDragOver={onDragOver} onDrop={(e) => onDrop(e, st.name)} style={styles.column}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "900", color: THEME.textMain }}>{st.name}</h3>
                  <span style={{ backgroundColor: THEME.primary, color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900" }}>{colCustomers.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {colCustomers.map(c => (
                    <div key={c.id} draggable onDragStart={(e) => onDragStart(e, c.id)} onDragEnd={onDragEnd} style={{ ...styles.card, borderColor: draggingId === c.id ? THEME.primary : "transparent", opacity: draggingId === c.id ? 0.4 : 1 }}>
                      <div style={{ fontWeight: "900", marginBottom: "10px", fontSize: "15px" }}>{c["姓"]} {c["名"]} 様</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 5 }}><UserCircle size={14} color={THEME.primary}/> {staffList.find(s => s.email === c["担当者メール"])?.lastName || "未割当"}</div>
                        <Link to={`/direct-sms/${c.id}`} style={{ color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px", borderRadius: "8px" }}><MessageSquare size={14}/></Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.bottomBar}>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, wonLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#ECFDF5" : "#F9FAFB", color: THEME.success, borderColor: draggingId ? THEME.success : THEME.border }}>
          <Trophy size={22} /> {wonLabel}
        </div>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, dormantLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#FFFBEB" : "#F9FAFB", color: THEME.warning, borderColor: draggingId ? THEME.warning : THEME.border }}>
          <Moon size={22} /> {dormantLabel}
        </div>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, lostLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#FEF2F2" : "#F9FAFB", color: THEME.danger, borderColor: draggingId ? THEME.danger : THEME.border }}>
          <Trash2 size={22} /> {lostLabel}
        </div>
      </div>
    </div>
  );
}