import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, GripVertical, ListFilter, Edit3, Lock, Search, Clock
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ==========================================
// ⚠️ 環境設定
// ==========================================
const CLIENT_COMPANY_NAME = "B社"; 
const GAS_URL = "https://script.google.com/macros/s/AKfycbwFVcroo9001k-6_yX6ccwemrIPbv0Da_OlA20gvLL23lXdSE6CPJJQidpQPN8cOCE/exec"; 
const MASTER_WHITELIST_API = "https://script.google.com/macros/s/AKfycbyHgp0QFGMHBKOdohWQ4kLH-qM1khFwwESmpEveW-oXhtFg5Np85ZTDeXrpRXKnTNzm3g/exec";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444", locked: "#F1F5F9", sidebar: "#0F172A"
};

const s = {
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000, display: "flex", flexDirection: "column" },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "12px", border: `1px solid ${THEME.border}`, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${THEME.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box" },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 18px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", transition: "0.2s", fontSize: "14px" },
  btnPrimary: { backgroundColor: THEME.primary, color: "white" },
  btnSecondary: { backgroundColor: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` },
  tableTh: { padding: "12px 20px", color: THEME.textMuted, fontSize: "11px", fontWeight: "700", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase" },
  tableTd: { padding: "16px 20px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMain },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", backgroundColor: "#EEF2FF", color: THEME.primary }
};

const api = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

const cleanPhone = (v) => String(v || "").replace(/[^\d]/g, "");

// --- レイアウト ---
function Sidebar({ onLogout, user }) {
  const l = useLocation();
  const m = [{ n: "ダッシュボード", p: "/", i: <LayoutDashboard size={18} /> }, { n: "新規登録", p: "/add", i: <UserPlus size={18} /> }, { n: "シナリオ管理", p: "/scenarios", i: <Settings size={18} /> }, { n: "ユーザー管理", p: "/users", i: <Users size={18} /> }];
  return (
    <div style={s.sidebar}>
      <div style={{ fontSize: "20px", fontWeight: "800", marginBottom: "40px", display: "flex", alignItems: "center", gap: "10px" }}><MessageSquare size={20}/> StepFlow</div>
      <div style={{ flex: 1 }}>{m.map(x => (<Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", textDecoration: "none", color: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? "white" : "#94A3B8", backgroundColor: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? "rgba(255,255,255,0.1)" : "transparent", marginBottom: "4px", fontWeight: "500" }}>{x.i} {x.n}</Link>))}</div>
      <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "#1E293B", color: "#F8FAFC" }}><LogOut size={16}/> Logout</button>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (<div style={s.main}><div style={{ padding: "40px 60px", maxWidth: "1300px", margin: "0 auto" }}><div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontSize: "28px", fontWeight: "800" }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted, marginTop: "4px" }}>{subtitle}</p>}</div>{topButton}</div>{children}</div></div>);
}

// --- 共通部品 ---
function DynamicField({ f, value, onChange }) {
  if (f.type === "dropdown") return <select style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)}><option value="">選択してください</option>{f.options?.split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>;
  return <input style={s.input} type={f.type} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={`${f.name}を入力`} />;
}

// --- 顧客リスト (並び替え完全修正・動的検索) ---
function CustomerList({ customers, formSettings, onRefresh }) {
  const [visibleCols, setVisibleCols] = useState(() => JSON.parse(localStorage.getItem("sf_cols_v13") || '["姓", "名", "電話番号", "シナリオID"]'));
  const [tempCols, setTempCols] = useState(visibleCols);
  const [showColMenu, setShowColMenu] = useState(false);
  const [search, setSearch] = useState({});
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => localStorage.setItem("sf_cols_v13", JSON.stringify(visibleCols)), [visibleCols]);

  const filtered = useMemo(() => customers.filter(c => Object.keys(search).every(key => !search[key] || String(c[key] || "").toLowerCase().includes(search[key].toLowerCase()))), [customers, search]);

  // 🆕 ドラッグ＆ドロップロジックの修正
  const onDragStart = (e, index) => {
    setDragIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, index) => {
    e.preventDefault(); // これがないと入れ替えが起きない
    if (dragIdx === null || dragIdx === index) return;
    
    const newList = [...tempCols];
    const draggedItem = newList[dragIdx];
    newList.splice(dragIdx, 1);
    newList.splice(index, 0, draggedItem);
    
    setDragIdx(index);
    setTempCols(newList);
  };

  return (
    <Page title="顧客ダッシュボード" topButton={<button onClick={() => { setTempCols(visibleCols); setShowColMenu(true); }} style={{ ...s.btn, ...s.btnSecondary }}><ListFilter size={18} /> 表示・順序設定</button>}>
      {showColMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ ...s.card, width: "400px", marginBottom: 0 }}>
            <h3 style={{ marginTop: 0 }}>項目の表示設定</h3>
            <p style={{ fontSize: "12px", color: THEME.textMuted, marginBottom: "20px" }}>項目をドラッグして順序を入れ替えられます</p>
            <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "24px" }}>
              {["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)].map((col, i) => (
                <div key={col} 
                  draggable 
                  onDragStart={(e) => onDragStart(e, i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDragEnd={() => setDragIdx(null)}
                  style={{ 
                    display: "flex", alignItems: "center", gap: "12px", padding: "12px", 
                    border: `1px solid ${dragIdx === i ? THEME.primary : THEME.border}`, 
                    borderRadius: "8px", marginBottom: "8px", backgroundColor: "white", 
                    cursor: "grab", opacity: dragIdx === i ? 0.5 : 1, transform: dragIdx === i ? "scale(1.02)" : "scale(1)", transition: "0.1s"
                  }}>
                  <GripVertical size={16} color={THEME.textMuted} />
                  <input type="checkbox" checked={tempCols.includes(col)} onChange={() => setTempCols(v => v.includes(col) ? v.filter(n => n !== col) : [...v, col])} />
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>{col}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => { setVisibleCols(tempCols); setShowColMenu(false); }} style={{ ...s.btn, ...s.btnPrimary, flex: 1 }}>設定を適用</button>
              <button onClick={() => setShowColMenu(false)} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 動的検索バー */}
      <div style={{ ...s.card, padding: "16px 20px", marginBottom: "24px", background: "#F1F5F9", border: "none", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <Search size={18} color={THEME.textMuted} />
        {visibleCols.map(col => {
          const f = formSettings.find(x => x.name === col);
          if (f?.type === "dropdown") return <select key={col} style={{ ...s.input, width: "160px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: e.target.value})}><option value="">{col}: 全て</option>{f.options?.split(",").map(o => <option key={o} value={o}>{o}</option>)}</select>;
          return <input key={col} placeholder={`${col}...`} style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: e.target.value})} />;
        })}
      </div>

      <div style={{ ...s.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{visibleCols.map(c => <th key={c} style={s.tableTh}>{c}</th>)}<th style={s.tableTh}>操作</th></tr></thead>
          <tbody>{filtered.map(c => (
            <tr key={c.id}>
              {visibleCols.map(col => <td key={col} style={s.tableTd}>{col === "シナリオID" ? <span style={s.badge}>{c[col]}</span> : (c[col] || "-")}</td>)}
              <td style={s.tableTd}><div style={{ display: "flex", gap: "15px" }}>
                <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "700" }}>状況</Link>
                <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}>編集</Link>
                <button onClick={async () => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

// --- 画面：配信スケジュール (プリセット編集) ---
function CustomerSchedule({ customers, deliveryLogs, onRefresh }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  const [editLog, setEditLog] = useState(null);
  if(!c) return <Page title="Loading..."><Loader2 size={24} className="animate-spin" /></Page>;
  const myLogs = deliveryLogs.filter(log => cleanPhone(log.電話番号) === cleanPhone(c["電話番号"]));

  const startEdit = (log) => {
    const d = new Date(log.配信予定日時);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditLog({ ...log, t: localISOTime, m: log.内容 });
  };

  return (<Page title="配信スケジュール" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link><div style={{display:"flex", flexDirection:"column", gap:"16px"}}>{myLogs.map((log, i) => (<div key={i} style={{ ...s.card, borderLeft: `6px solid ${log.ステータス === "配信済み" ? THEME.success : THEME.primary}`, padding: "20px" }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{log.ステータス}</span><div style={{fontWeight:"800", marginTop:"8px"}}>{new Date(log.配信予定日時).toLocaleString()}</div></div>{log.ステータス === "配信待ち" && <button onClick={()=>startEdit(log)} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"15px", whiteSpace:"pre-wrap", fontSize:"14px"}}>{log.内容}</div></div>))}</div>
  {editLog && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "500px", marginBottom: 0 }}><h3>配信内容の調整</h3><div style={{marginBottom:"15px"}}><label style={{fontSize:"12px"}}>配信日時</label><input type="datetime-local" style={s.input} value={editLog.t} onChange={e=>setEditLog({...editLog, t:e.target.value})} /></div><div style={{marginBottom:"20px"}}><label style={{fontSize:"12px"}}>メッセージ内容</label><textarea style={{...s.input, height:"150px", resize:"none"}} value={editLog.m} onChange={e=>setEditLog({...editLog, m:e.target.value})} /></div><div style={{display:"flex", gap:"10px"}}><button onClick={async()=>{await api.post(GAS_URL,{action:"updateDeliveryTime",logId:editLog.ログID,newTime:editLog.t, newMessage:editLog.m}); onRefresh(); setEditLog(null);}} style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button onClick={()=>setEditLog(null)} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

// --- 画面：新規登録 (項目調整ボタンあり) ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [lastName, setLastName] = useState(""); const [firstName, setFirstName] = useState(""); const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({}); const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if(scenarios.length > 0) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);
  return (<Page title="新規顧客登録" topButton={<button onClick={() => navigate("/form-settings")} style={{ ...s.btn, ...s.btnSecondary }}>項目を調整</button>}><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); navigate("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>姓</label><input style={s.input} required value={lastName} onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>名</label><input style={s.input} required value={firstName} onChange={e => setFirstName(e.target.value)} /></div></div>
    <div style={{ marginBottom: "20px" }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>電話番号</label><input style={s.input} required value={phone} onChange={e => setPhone(e.target.value)} /></div>
    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: "24px", marginTop: "10px" }}>{formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFormData({...formData, [f.name]: val})} /></div>)}</div>
    <label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>適用シナリオ</label><select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}</select>
    <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>登録する</button></form></div></Page>);
}

// --- 他コンポーネント (指示通りの完全統合版) ---
function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers.find(x => x.id === Number(id));
  const [lastName, setL] = useState(""); const [firstName, setF] = useState(""); const [phone, setP] = useState("");
  const [formData, setFD] = useState({}); const [scenarioID, setS] = useState("");
  useEffect(() => { if (c) { setL(c["姓"] || ""); setF(c["名"] || ""); setP(c["電話番号"] || ""); setFD(c); setS(c.シナリオID); } }, [c]);
  if(!c) return <Page title="Loading..."><Loader2 size={48} className="animate-spin" /></Page>;
  return (<Page title="情報の編集"><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName, firstName, phone, data: formData, status: c.配信ステータス, scenarioID }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={s.input} value={lastName} onChange={e => setL(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={s.input} value={firstName} onChange={e => setF(e.target.value)} /></div></div>
    <div style={{ marginBottom: "20px" }}><label style={{fontWeight:"700"}}>電話番号</label><input style={s.input} value={phone} onChange={e => setP(e.target.value)} /></div>
    {formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFD({...formData, [f.name]: val})} /></div>)}
    <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>保存</button></form></div></Page>);
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } });
  const fetchUsers = useCallback(async () => { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res.data.users); }, [masterUrl]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const sub = async (e) => { e.preventDefault(); await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetchUsers(); };
  return (<Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18} /> 追加</button>}><div style={{ ...s.card, padding: 0 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th><th style={{...s.tableTh, textAlign:"right"}}>操作</th></tr></thead><tbody>{users.map((u, i) => (<tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td><td style={{...s.tableTd, textAlign:"right"}}><div style={{display:"flex", gap:"10px", justifyContent:"flex-end"}}><button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{background:"none", border:"none", color:THEME.primary, cursor:"pointer", fontWeight:"600"}}>編集</button><button onClick={async()=>{if(window.confirm("削除？")){await api.post(masterUrl,{action:"deleteUser",company:CLIENT_COMPANY_NAME,email:u.email});fetchUsers();}}} style={{background:"none", border:"none", color:THEME.danger, cursor:"pointer"}}><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>{modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "400px", marginBottom: 0 }}><h3>追加・編集</h3><form onSubmit={sub}><input style={{...s.input, marginBottom:"15px"}} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} placeholder="名前" required /><input style={{...s.input, marginBottom:"15px"}} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} placeholder="メール" required /><div style={{ display: "flex", gap: "10px" }}><button type="submit" style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button type="button" onClick={()=>setModal({open:false})} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></form></div></div>)}</Page>);
}

function FormSettings({ formSettings, onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const nav = useNavigate();
  return (<Page title="項目の調整"><div style={{ maxWidth: "850px" }}>{["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px"}}>項目名</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px"}}>形式</label><div>テキスト</div></div><div style={{ width: "100px", textAlign: "center" }}><label style={{fontSize:"11px"}}>必須</label><div style={{fontSize: "12px", color: THEME.success, fontWeight: "800"}}>固定</div></div></div>))}
  <div style={{ marginTop: "30px", marginBottom: "15px", fontWeight: "800" }}>追加項目</div>{items.map((x, i) => (<div key={i} style={{ ...s.card, marginBottom: "12px", padding: "16px 24px", display: "flex", gap: "15px", alignItems: "center" }}><GripVertical size={20} color={THEME.border} /><div style={{ flex: 2 }}><input style={{...s.input, marginBottom: 0}} value={x.name} onChange={e => { const n=[...items]; n[i].name=e.target.value; setItems(n); }} /></div><div style={{ flex: 1.5 }}><select style={{...s.input, marginBottom: 0}} value={x.type} onChange={e => { const n=[...items]; n[i].type=e.target.value; setItems(n); }}><option value="text">テキスト</option><option value="tel">番号</option><option value="dropdown">プルダウン</option><option value="date">日付</option></select></div>
  {x.type === "dropdown" && <div style={{ flex: 2 }}><input style={{...s.input, marginBottom: 0}} placeholder="A,B,C" value={x.options || ""} onChange={e => { const n=[...items]; n[i].options=e.target.value; setItems(n); }} /></div>}<button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none", cursor:"pointer" }}><Trash2 size={20}/></button></div>))}
  <button onClick={() => setItems([...items, { name: "", type: "text", required: true, options: "" }])} style={{ ...s.btn, ...s.btnSecondary, width: "100%" }}>+ 追加</button><button onClick={async () => { await api.post(GAS_URL, { action: "saveFormSettings", settings: items }); onRefresh(); nav("/add"); }} style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "32px", padding:"14px" }}>同期する</button></div></Page>);
}

function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{...s.btn, ...s.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>{Object.entries(grouped).map(([id, steps]) => (<div key={id} style={s.card}><div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px"}}><div><h3 style={{margin:0, fontSize:"18px"}}>{id}</h3><span style={{fontSize:"13px", color:THEME.textMuted}}>{steps.length} ステップ</span></div><button onClick={()=>del(id)} style={{color:THEME.danger, background:"none", border:"none", cursor:"pointer"}}><Trash2 size={18}/></button></div><Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, ...s.btnSecondary, width: "100%", textDecoration: "none" }}>構成を編集</Link></div>))}</div></Page>);
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const nav = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (editId) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, deliveryHour: s.配信時間, message: s.message }))); } }, [editId, scenarios]);
  return (<Page title="シナリオ編集"><div style={{ ...s.card, maxWidth: "800px" }}><label>シナリオ名</label><input style={s.input} value={id} onChange={e=>setId(e.target.value)} disabled={!!editId} />
    {steps.map((x, i) => (<div key={i} style={{ padding: "24px", background: "#F8FAFC", marginBottom: "15px", borderRadius: "16px", border: `1px solid ${THEME.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}><span style={{ fontWeight: "900" }}>STEP {i + 1}</span><button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{color:THEME.danger, background:"none", border:"none", cursor:"pointer"}}>削除</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}><div><label style={{fontSize:"12px"}}>配信日</label><input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} /></div><div><label style={{fontSize:"12px"}}>時間(0-23)</label><input type="number" style={s.input} value={x.deliveryHour} onChange={e=>{ const n=[...steps]; n[i].deliveryHour=e.target.value; setSteps(n); }} /></div></div><textarea style={{ ...s.input, height: "100px", resize:"none" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} /></div>))}
    <button onClick={() => setSteps([...steps, { elapsedDays: 1, deliveryHour: 10, message: "" }])} style={{ ...s.btn, ...s.btnSecondary, width: "100%", marginBottom: "15px" }}>+ 追加</button>
    <button onClick={async () => { if(!id) return alert("名必須"); setIsSaving(true); try { const cRes = await axios.get(`${GAS_URL}?mode=countAffected&scenarioID=${id}`); if (window.confirm(`${cRes.data.count}名の予約も更新されます。？`)) { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); alert("完了"); nav("/scenarios"); } } finally { setIsSaving(false); } }} disabled={isSaving} style={{ ...s.btn, ...s.btnPrimary, width: "100%" }}>保存</button></div></Page>);
}

// --- App メイン ---
export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], deliveryLogs: [] });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => { const saved = localStorage.getItem("sf_user"); return saved ? JSON.parse(saved) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><MessageSquare color="white" size={32} /></div><h1>StepFlow</h1><p style={{ color: THEME.textMuted, marginBottom: "32px" }}>管理者ログイン</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Router><div style={{ display: "flex", fontFamily: "'Inter', sans-serif" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} user={user} /><Routes>
    <Route path="/" element={<CustomerList customers={d.customers} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} deliveryLogs={d.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}