import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, GripVertical, ListFilter, Edit3, Lock, Save, Search, Clock, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, FileSpreadsheet, Eye
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ==========================================
// ⚠️ 環境・テーマ設定
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

// --- 要件2: JST日時フォーマット統一 (YYYY/MM/DD HH:mm) ---
const formatDate = (dStr) => {
  if (!dStr || dStr === "-" || dStr === "undefined") return "-";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const smartNormalizePhone = (phone) => {
  if (!phone) return "";
  let p = String(phone).replace(/[^\d]/g, ""); 
  if (p.length === 10 && /^[1-9]/.test(p)) p = "0" + p;
  return p;
};

const parseLocalDate = (dateStr, isEnd = false) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isEnd) date.setHours(23, 59, 59, 999); else date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const api = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

const downloadCSV = (rows, filename) => {
  const content = rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
};

// --- コンポーネント: 共通部品 ---
function DynamicField({ f, value, onChange }) {
  if (f.type === "dropdown") return (
    <select style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">選択してください</option>
      {f?.options?.split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
  if (f.type === "date") return <input type="date" style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} />;
  return <input style={s.input} type={f.type} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={`${f.name}を入力`} />;
}

// --- レイアウト ---
function Sidebar({ onLogout }) {
  const l = useLocation();
  const m = [{ n: "ダッシュボード", p: "/", i: <LayoutDashboard size={18} /> }, { n: "新規登録", p: "/add", i: <UserPlus size={18} /> }, { n: "シナリオ管理", p: "/scenarios", i: <Settings size={18} /> }, { n: "ユーザー管理", p: "/users", i: <Users size={18} /> }];
  return (
    <div style={s.sidebar}>
      <div style={{ fontSize: "20px", fontWeight: "800", marginBottom: "40px", display: "flex", alignItems: "center", gap: "10px" }}><MessageSquare size={20}/> StepFlow</div>
      <div style={{ flex: 1 }}>{m.map(x => (<Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", textDecoration: "none", color: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "white" : "#94A3B8", backgroundColor: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "rgba(255,255,255,0.1)" : "transparent", marginBottom: "4px", fontWeight: "500" }}>{x.i} {x.n}</Link>))}</div>
      <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "#1E293B", color: "#F8FAFC" }}><LogOut size={16}/> Logout</button>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (<div style={s.main}><div style={{ padding: "40px 60px", maxWidth: "1400px", margin: "0 auto" }}><div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontSize: "28px", fontWeight: "800" }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted, fontSize: "14px", marginTop: "4px" }}>{subtitle}</p>}</div>{topButton}</div>{children}</div></div>);
}

// --- 顧客リスト ---
function CustomerList({ customers = [], displaySettings = [], formSettings = [], onRefresh }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const visibleCols = useMemo(() => {
    if (displaySettings?.length > 0) return displaySettings.filter(s => s.visible).map(s => s.name);
    return ["姓", "名", "電話番号", "シナリオID", "登録日"];
  }, [displaySettings]);

  const searchableCols = useMemo(() => {
    if (displaySettings?.length > 0) return displaySettings.filter(s => s.searchable).map(s => s.name);
    return ["姓", "電話番号"];
  }, [displaySettings]);

  const filteredAndSorted = useMemo(() => {
    let res = [...customers].filter(c => {
      return Object.keys(search).every(key => {
        const query = search[key]; if (!query) return true;
        const val = c[key];
        const f = formSettings.find(x => x.name === key);
        if (f?.type === "date" || key === "登録日") {
          if (!val || val === "-") return false;
          const target = new Date(val).getTime();
          const start = query.start ? parseLocalDate(query.start) : null;
          const end = query.end ? parseLocalDate(query.end, true) : null;
          if (start && target < start) return false;
          if (end && target > end) return false;
          return true;
        }
        return String(val || "").toLowerCase().includes(String(query).toLowerCase());
      });
    });
    if (sortConfig.key) {
      res.sort((a, b) => {
        const aV = a[sortConfig.key], bV = b[sortConfig.key];
        const isD = formSettings.find(x => x.name === sortConfig.key)?.type === "date" || sortConfig.key === "登録日";
        if (isD) return sortConfig.direction === 'asc' ? new Date(aV) - new Date(bV) : new Date(bV) - new Date(aV);
        return sortConfig.direction === 'asc' ? String(aV).localeCompare(String(bV)) : String(bV).localeCompare(String(aV));
      });
    }
    return res;
  }, [customers, search, formSettings, sortConfig]);

  return (
    <Page title="顧客ダッシュボード" topButton={
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => downloadCSV([visibleCols, ...filteredAndSorted.map(c => visibleCols.map(col => c[col]))], "export.csv")} style={{ ...s.btn, ...s.btnSecondary }}><Download size={18} /> CSV出力</button>
        <button onClick={() => navigate("/column-settings")} style={{ ...s.btn, ...s.btnSecondary }}><ListFilter size={18} /> 表示設定</button>
      </div>
    }>
      <div style={{ ...s.card, padding: "20px", marginBottom: "24px", background: "#F1F5F9", border: "none", display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <Search size={18} color={THEME.textMuted} />
        {searchableCols.map(col => {
          const f = formSettings.find(x => x.name === col);
          if (f?.type === "date" || col === "登録日") return (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: "11px", fontWeight: "800" }}>{col}</label>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input type="date" style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: {...(search[col]||{}), start: e.target.value}})} />
                <span>～</span>
                <input type="date" style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: {...(search[col]||{}), end: e.target.value}})} />
              </div>
            </div>
          );
          return <div key={col} style={{ display: "flex", flexDirection: "column", gap: 4 }}><label style={{ fontSize: "11px", fontWeight: "800" }}>{col}</label><input placeholder={`${col}...`} style={{ ...s.input, width: "130px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: e.target.value})} /></div>;
        })}
        <button onClick={() => setSearch({})} style={{ fontSize: "12px", color: THEME.primary, background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}>リセット</button>
      </div>
      <div style={{ ...s.card, padding: 0, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{visibleCols.map(c => <th key={c} style={{ ...s.tableTh, cursor: "pointer" }} onClick={() => setSortConfig({ key: c, direction: (sortConfig.key === c && sortConfig.direction === 'asc') ? 'desc' : 'asc' })}>{c} {sortConfig.key === c ? (sortConfig.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} opacity={0.3}/>}</th>)}<th style={s.tableTh}>操作</th></tr></thead>
        <tbody>{filteredAndSorted.map(c => (
          <tr key={c.id}>{visibleCols.map(col => {
            const isD = formSettings.find(x => x.name === col)?.type === "date" || col === "登録日";
            return <td key={col} style={s.tableTd}>{col === "シナリオID" ? <span style={s.badge}>{c[col]}</span> : (isD ? formatDate(c[col]) : (c[col] || "-"))}</td>;
          })}
            <td style={s.tableTd}><div style={{ display: "flex", gap: "15px" }}>
              <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "700" }}>状況</Link>
              <Link to={`/detail/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Eye size={16}/></Link>
              <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Edit3 size={16}/></Link>
              <button onClick={async () => { if(window.confirm("顧客と予定をすべて削除しますか？")) { await api.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
            </div></td></tr>
        ))}</tbody></table></div>
    </Page>
  );
}

// --- 登録・詳細 ---
function CustomerDetail({ customers = [], formSettings = [] }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id));
  if (!customers.length || !c) return <Page title="読み込み中..."><Loader2 size={24} className="animate-spin" /></Page>;
  const fields = [
    { label: "姓", value: c["姓"] }, { label: "名", value: c["名"] }, { label: "電話番号", value: c["電話番号"] },
    { label: "シナリオID", value: c["シナリオID"], isBadge: true }, { label: "登録日", value: formatDate(c["登録日"]) }, { label: "配信ステータス", value: c["配信ステータス"] },
    ...formSettings.map(f => ({ label: f.name, value: f.type === "date" ? formatDate(c[f.name]) : (c[f.name] || "-") }))
  ];
  return (
    <Page title="顧客詳細情報">
      <Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link>
      <div style={{ ...s.card, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "32px", padding: "40px" }}>
        {fields.map((f, i) => (<div key={i} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
          <label style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "800", display: "block", marginBottom: "4px" }}>{f.label}</label>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>{f.isBadge ? <span style={s.badge}>{f.value}</span> : f.value}</div>
        </div>))}
      </div>
    </Page>
  );
}

// --- 顧客登録・編集 (UX統一) ---
function CustomerForm({ formSettings = [], scenarios = [], onRefresh }) {
  const navigate = useNavigate(); const fileInputRef = useRef(null);
  const [lastName, setLastName] = useState(""); const [firstName, setFirstName] = useState(""); const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({}); const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if(scenarios?.length > 0) setScenarioID(scenarios[0]["シナリオID"]); }, [scenarios]);
  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rows = ev.target.result.split("\n").map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
      const customers = rows.slice(1).filter(r => r.length > 2).map(row => {
        const obj = { lastName: row[0], firstName: row[1], phone: smartNormalizePhone(row[2]), scenarioID: row[3], data: {} };
        rows[0].slice(4).forEach((h, i) => { obj.data[h] = row[i+4]; }); return obj;
      });
      try { await api.post(GAS_URL, { action: "bulkAdd", customers }); alert("一括登録完了"); onRefresh(); navigate("/"); } catch (err) { alert(err.message); }
    }; reader.readAsText(file);
  };
  return (
    <Page title="新規顧客登録" topButton={<div style={{ display: "flex", gap: "10px" }}>
      <button onClick={() => downloadCSV([["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)], ["山田", "太郎", "'09012345678", scenarios[0]?.["シナリオID"] || "A"]], "template.csv")} style={{ ...s.btn, ...s.btnSecondary }}><FileSpreadsheet size={18} /> テンプレート</button>
      <button onClick={() => fileInputRef.current.click()} style={{ ...s.btn, ...s.btnPrimary }}><Upload size={18} /> CSV一括登録</button>
      <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} />
    </div>}>
      <div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}>
        <form onSubmit={async (e) => { e.preventDefault(); try { await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); navigate("/"); } catch(err) { alert(err.message); } }}>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>姓 *</label><input style={s.input} required onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>名 *</label><input style={s.input} required onChange={e => setFirstName(e.target.value)} /></div></div>
          <div style={{ marginBottom: "20px" }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>電話番号 *</label><input style={s.input} required value={phone} onChange={e => setPhone(e.target.value)} placeholder="09012345678" /></div>
          {formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={v => setFormData({...formData, [f.name]: v})} /></div>)}
          <label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>適用シナリオ</label><select style={{...s.input, marginBottom:"32px"}} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}</select>
          <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>顧客を登録</button>
        </form>
      </div>
    </Page>
  );
}

function CustomerEdit({ customers = [], scenarios = [], formSettings = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [lName, setL] = useState(""); const [fName, setF] = useState(""); const [phone, setP] = useState("");
  const [fd, setFD] = useState({}); const [sId, setS] = useState("");
  useEffect(() => { if (c) { setL(c["姓"] || ""); setF(c["名"] || ""); setP(c["電話番号"] || ""); setFD(c); setS(c["シナリオID"]); } }, [c]);
  if(!c) return <Page title="読み込み中..."><Loader2 size={48} className="animate-spin" /></Page>;
  return (<Page title="顧客情報の編集"><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}>
    <form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName:lName, firstName:fName, phone, data: fd, status: c["配信ステータス"], scenarioID: sId }); onRefresh(); nav("/"); }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={s.input} value={lName} onChange={e=>setL(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={s.input} value={fName} onChange={e=>setF(e.target.value)} /></div></div>
      <label style={{fontWeight:"700"}}>電話番号</label><input style={s.input} value={phone} onChange={e=>setP(e.target.value)} />
      {formSettings.map(f => <div key={f.name} style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v=>setFD({...fd,[f.name]:v})} /></div>)}
      <div style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>シナリオ</label><select style={s.input} value={sId} onChange={e=>setS(e.target.value)}>{[...new Set(scenarios?.map(x=>x["シナリオID"]))].map(id=><option key={id} value={id}>{id}</option>)}</select></div>
      <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "32px", padding: "14px" }}>変更を保存</button>
    </form></div></Page>);
}

// --- 配信状況・表示設定 (要件3: 登録日統合) ---
function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh }) {
  const navigate = useNavigate(); const [items, setItems] = useState([]); const [dragIdx, setDragIdx] = useState(null);
  useEffect(() => { 
    // 要件3: 登録日を管理項目に確実に含めるロジック
    const baseItems = ["姓", "名", "電話番号", "シナリオID", "登録日"];
    const allPossible = [...baseItems, ...formSettings.map(f => f.name)];
    
    let initial;
    if (displaySettings?.length > 0) {
      // 既存設定にあるもの
      const existingNames = displaySettings.map(d => d.name);
      // 既存設定にないが基本項目にあるものを補完
      const missing = allPossible.filter(p => !existingNames.includes(p)).map(name => ({ name, visible: true, searchable: true }));
      initial = [...displaySettings, ...missing];
    } else {
      initial = allPossible.map(name => ({ name, visible: true, searchable: true }));
    }
    setItems(initial);
  }, [displaySettings, formSettings]);

  const onDragOver = (e, i) => { e.preventDefault(); if (dragIdx===null||dragIdx===i) return; const n = [...items]; const d = n.splice(dragIdx, 1)[0]; n.splice(i, 0, d); setDragIdx(i); setItems(n); };
  return (<Page title="表示項目の調整"><div style={{ maxWidth: "700px" }}>
    <div style={{ display: "flex", padding: "0 20px 10px 60px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800" }}><div style={{ flex: 1 }}>項目名</div><div style={{ width: "80px", textAlign: "center" }}>表示</div><div style={{ width: "80px", textAlign: "center" }}>検索</div></div>
    {items.map((it, i) => (<div key={it.name} draggable onDragStart={()=>setDragIdx(i)} onDragOver={(e)=>onDragOver(e,i)} onDragEnd={()=>setDragIdx(null)} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", backgroundColor: "white", border: `1px solid ${dragIdx === i ? THEME.primary : THEME.border}`, borderRadius: "12px", marginBottom: "8px", cursor: "grab", opacity: dragIdx === i ? 0.5 : 1 }}>
        <GripVertical size={18} color={THEME.textMuted} /><div style={{ flex: 1, fontWeight: "600" }}>{it.name}</div>
        <input type="checkbox" checked={it.visible} onChange={()=>{const n=[...items];n[i].visible=!n[i].visible;setItems(n)}} />
        <input type="checkbox" checked={it.searchable} style={{marginLeft:"60px"}} onChange={()=>{const n=[...items];n[i].searchable=!n[i].searchable;setItems(n)}} />
    </div>))}
    <button onClick={async()=>{await api.post(GAS_URL,{action:"saveDisplaySettings",settings:items});alert("保存完了");onRefresh();navigate("/")}} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"24px"}}>順序と表示を保存</button></div></Page>);
}

function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id)); const [editLog, setEditLog] = useState(null);
  if (!customers.length || !c) return <Page title="読み込み中..."><Loader2 size={24} className="animate-spin" /></Page>;
  const myLogs = (deliveryLogs || []).filter(log => smartNormalizePhone(log["電話番号"]) === smartNormalizePhone(c["電話番号"]));
  return (<Page title="配信状況" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link>
      <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>{myLogs.length > 0 ? myLogs.map((log, i) => (
        <div key={i} style={{ ...s.card, borderLeft: `6px solid ${log["ステータス"] === "配信済み" ? THEME.success : THEME.primary}`, padding: "20px" }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{log["ステータス"]}</span><div style={{fontWeight:"800", marginTop:"8px"}}>{formatDate(log["配信予定日時"])}</div></div>
          {log["ステータス"] === "配信待ち" && <button onClick={()=>{ const d = new Date(log["配信予定日時"]); setEditLog({ id: log["ログID"], t: new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: log["内容"] }); }} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div>
          <div style={{marginTop:"15px", whiteSpace:"pre-wrap", fontSize:"14px", color:THEME.textMain}}>{log["内容"]}</div></div>)) : <div style={{ ...s.card, textAlign: "center", color: THEME.textMuted }}>予定はありません</div>}
      </div>{editLog && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
        <div style={{ ...s.card, width: "500px", padding: "32px" }}><h3>予定の調整</h3><input type="datetime-local" style={{...s.input, marginTop:"8px"}} value={editLog.t} onChange={e=>setEditLog({...editLog, t:e.target.value})} /><textarea style={{...s.input, height:"150px", marginTop:"8px", resize:"none"}} value={editLog.m} onChange={e=>setEditLog({...editLog, m:e.target.value})} /><div style={{display:"flex", gap:"12px", marginTop:"32px"}}><button onClick={async()=>{ await api.post(GAS_URL,{action:"updateDeliveryTime",logId:editLog.id,newTime:editLog.t, newMessage:editLog.m}); onRefresh(); setEditLog(null); }} style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button onClick={()=>setEditLog(null)} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

// --- 管理コンポーネント (Scenario, Form, UserManager) ---
function ScenarioList({ scenarios = [], onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s["シナリオID"]] = acc[s["シナリオID"]] || []).push(s); return acc; }, {});
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{...s.btn, ...s.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規作成</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>{Object.entries(grouped).map(([id, steps]) => (<div key={id} style={s.card}><div style={{display:"flex", justifyContent:"space-between"}}><h3>{id}</h3><button onClick={async()=>{if(window.confirm("削除？")){await api.post(GAS_URL,{action:"deleteScenario",scenarioID:id});onRefresh();}}} style={{color:THEME.danger, background:"none", border:"none"}}><Trash2 size={18}/></button></div><Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ ...s.btn, ...s.btnSecondary, width: "100%", textDecoration: "none", marginTop:"15px" }}>構成を編集</Link></div>))}</div></Page>);
}
function ScenarioForm({ scenarios = [], onRefresh }) {
  const { id: editId } = useParams(); const navigate = useNavigate(); const [name, setName] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  useEffect(() => { if (editId) { const dId = decodeURIComponent(editId); setName(dId); const ex = scenarios.filter(s => s["シナリオID"] === dId).sort((a,b) => a["ステップ数"] - b["ステップ数"]); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s["経過日数"], deliveryHour: s["配信時間"], message: s["message"] }))); } }, [editId, scenarios]);
  return (<Page title={editId ? "シナリオ編集" : "新規作成"}><div style={{ ...s.card, maxWidth: "800px" }}><label style={{fontWeight:"700"}}>シナリオ名</label><input style={{...s.input, marginBottom:"30px"}} value={name} onChange={e=>setName(e.target.value)} disabled={!!editId} />
    {steps.map((st, i) => (<div key={i} style={{ padding: "20px", background: "#F8FAFC", marginBottom: "20px", borderRadius: "12px", border: `1px solid ${THEME.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}><span style={{ fontWeight: "900" }}>STEP {i + 1}</span><button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{color:THEME.danger, background:"none", border:"none"}}><Trash2 size={16}/></button></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}><div><label>経過日数</label><input type="number" style={s.input} value={st.elapsedDays} onChange={e=>{const n=[...steps];n[i].elapsedDays=e.target.value;setSteps(n)}} /></div><div><label>時間</label><input type="number" style={s.input} value={st.deliveryHour} onChange={e=>{const n=[...steps];n[i].deliveryHour=e.target.value;setSteps(n)}} /></div></div><textarea style={{ ...s.input, height: "100px", marginTop:"15px" }} value={st.message} onChange={e=>{const n=[...steps];n[i].message=e.target.value;setSteps(n)}} /></div>))}
    <button onClick={() => setSteps([...steps, { elapsedDays: 1, deliveryHour: 10, message: "" }])} style={{ ...s.btn, ...s.btnSecondary, width: "100%", marginBottom: "20px" }}>+ 追加</button><button onClick={async ()=>{await api.post(GAS_URL,{action:"saveScenario",scenarioID:name,steps});alert("完了");onRefresh();navigate("/scenarios")}} style={{...s.btn, ...s.btnPrimary, width:"100%"}}>保存</button></div></Page>);
}
function FormSettings({ formSettings = [], onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const nav = useNavigate();
  return (<Page title="追加項目の調整"><div style={{ maxWidth: "850px" }}>{["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px"}}>項目名</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px"}}>形式</label><div>テキスト</div></div></div>))}
    {items.map((x, i) => (<div key={i} style={{ ...s.card, marginBottom: "12px", display: "flex", gap: "15px", alignItems: "center" }}><GripVertical size={20} color={THEME.border} /><input style={{...s.input, flex: 2}} value={x.name} onChange={e=>{const n=[...items];n[i].name=e.target.value;setItems(n)}} /><select style={{...s.input, flex: 1.5}} value={x.type} onChange={e=>{const n=[...items];n[i].type=e.target.value;setItems(n)}}><option value="text">テキスト</option><option value="tel">番号</option><option value="dropdown">プルダウン</option><option value="date">日付</option></select><button onClick={()=>{const n=items.filter((_,idx)=>idx!==i);setItems(n)}} style={{color:THEME.danger, background:"none", border:"none"}}><Trash2 size={20}/></button></div>))}
    <button onClick={()=>setItems([...items,{name:"",type:"text",required:true}])} style={{...s.btn, ...s.btnSecondary, width:"100%", borderStyle:"dashed"}}>+ 追加項目</button><button onClick={async()=>{await api.post(GAS_URL,{action:"saveFormSettings",settings:items});onRefresh();nav("/add")}} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"32px"}}>同期する</button></div></Page>);
}
function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "" } });
  const fetch = useCallback(async () => { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res?.data?.users || []); }, [masterUrl]);
  useEffect(() => { fetch(); }, [fetch]);
  const sub = async (e) => { e.preventDefault(); await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetch(); };
  return (<Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18} /> 追加</button>}><div style={{ ...s.card, padding: 0 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th><th style={{...s.tableTh, textAlign:"right"}}>操作</th></tr></thead><tbody>{users.map((u, i) => (<tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td><td style={{...s.tableTd, textAlign:"right"}}><div style={{display:"flex", gap:"10px", justifyContent:"flex-end"}}><button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{background:"none", border:"none", color:THEME.primary, cursor:"pointer", fontWeight:"600"}}>編集</button><button onClick={async()=>{if(window.confirm("削除？")){await api.post(masterUrl,{action:"deleteUser",company:CLIENT_COMPANY_NAME,email:u.email});fetch();}}} style={{background:"none", border:"none", color:THEME.danger, cursor:"pointer"}}><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>
  {modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "400px" }}><h3>管理者の編集</h3><form onSubmit={sub}><input style={{...s.input, marginBottom:"15px"}} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} placeholder="名前" required /><input style={{...s.input, marginBottom:"15px"}} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} placeholder="メール" required /><div style={{ display: "flex", gap: "10px" }}><button type="submit" style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button type="button" onClick={()=>setModal({open:false})} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></form></div></div>)}</Page>);
}

// --- App メイン ---
export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [] });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => { const saved = localStorage.getItem("sf_user"); return saved ? JSON.parse(saved) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } catch (e) { console.error(e); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><MessageSquare color="white" size={32} /></div><h1>StepFlow</h1><p style={{ color: THEME.textMuted, marginBottom: "32px" }}>管理者ログイン</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Router><div style={{ display: "flex", fontFamily: "'Inter', sans-serif" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} /><Routes>
    <Route path="/" element={<CustomerList customers={d.customers} displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/column-settings" element={<ColumnSettings displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} deliveryLogs={d.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} formSettings={d.formSettings} />} />
    <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}