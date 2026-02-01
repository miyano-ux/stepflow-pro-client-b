import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, X, GripVertical, ListFilter, Calendar, Edit3, Lock, Search, Clock
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

const CLIENT_COMPANY_NAME = "B社"; 
const GAS_URL = "https://script.google.com/macros/s/AKfycbwFVcroo9001k-6_yX6ccwemrIPbv0Da_OlA20gvLL23lXdSE6CPJJQidpQPN8cOCE/exec"; 
const MASTER_WHITELIST_API = "https://script.google.com/macros/s/AKfycbyHgp0QFGMHBKOdohWQ4kLH-qM1khFwwESmpEveW-oXhtFg5Np85ZTDeXrpRXKnTNzm3g/exec";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444", locked: "#F1F5F9"
};

const s = {
  sidebar: { width: "260px", backgroundColor: "#0F172A", color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000, display: "flex", flexDirection: "column" },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden", padding: "32px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "15px", marginBottom: "20px", outline: "none", boxSizing: "border-box" },
  btn: { backgroundColor: THEME.primary, color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", borderBottom: `1px solid ${THEME.border}`, textAlign: "left" },
  tableTd: { padding: "16px 24px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}` },
  popover: { position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: `1px solid ${THEME.border}`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: "16px", zIndex: 100, minWidth: "220px" }
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
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={20} /> },
    { n: "新規登録", p: "/add", i: <UserPlus size={20} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={20} /> },
    { n: "ユーザー管理", p: "/users", i: <Users size={20} /> },
  ];
  return (
    <div style={s.sidebar}>
      <div style={{ fontSize: "22px", fontWeight: "800", marginBottom: "48px", display: "flex", alignItems: "center", gap: "10px" }}><MessageSquare /> StepFlow</div>
      <div style={{ flex: 1 }}>{m.map(x => (
        <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", textDecoration: "none", color: l.pathname === x.p ? "white" : "#94A3B8", backgroundColor: l.pathname === x.p ? THEME.primary : "transparent", marginBottom: "8px", fontWeight: "600" }}>{x.i} {x.n}</Link>
      ))}</div>
      <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "#1E293B" }}>Logout</button>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (
    <div style={s.main}><div style={{ padding: "48px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><h1 style={{ fontSize: "32px", fontWeight: "800" }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted }}>{subtitle}</p>}</div>
        {topButton}
      </div>
      {children}
    </div></div>
  );
}

// --- 顧客リスト (検索・操作ボタン復元版) ---
function CustomerList({ customers, formSettings, onRefresh }) {
  const [visibleCols, setVisibleCols] = useState(() => JSON.parse(localStorage.getItem("sf_cols_final") || '["姓", "名", "電話番号"]'));
  const [showColMenu, setShowColMenu] = useState(false);
  const [search, setSearch] = useState({});

  useEffect(() => localStorage.setItem("sf_cols_final", JSON.stringify(visibleCols)), [visibleCols]);

  const filtered = useMemo(() => customers.filter(c => Object.keys(search).every(key => !search[key] || String(c[key] || "").toLowerCase().includes(search[key].toLowerCase()))), [customers, search]);

  return (
    <Page title="顧客ダッシュボード" topButton={<button onClick={() => setShowColMenu(!showColMenu)} style={{ ...s.btn, background: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` }}><ListFilter size={18} /> 表示項目</button>}>
      {/* 検索バー */}
      <div style={{ ...s.card, padding: "20px", marginBottom: "24px", background: "#F1F5F9", display: "flex", gap: "15px", alignItems: "center" }}>
        <Search size={18} color={THEME.textMuted} />
        <input placeholder="姓で検索..." style={{ ...s.input, width: "150px", marginBottom: 0 }} onChange={e => setSearch({...search, "姓": e.target.value})} />
        {formSettings.filter(f => f.type === "dropdown").map(f => (
          <select key={f.name} style={{ ...s.input, width: "150px", marginBottom: 0 }} onChange={e => setSearch({...search, [f.name]: e.target.value})}>
            <option value="">{f.name}：全て</option>
            {f.options?.split(",").map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>
      {showColMenu && <div style={{ ...s.popover, top: "160px" }}>{["姓", "名", "電話番号", ...formSettings.map(f => f.name)].map(col => (<label key={col} style={{ display: "flex", gap: "10px", marginBottom: "10px", cursor: "pointer" }}><input type="checkbox" checked={visibleCols.includes(col)} onChange={() => setVisibleCols(v => v.includes(col) ? v.filter(n => n !== col) : [...v, col])} /> {col}</label>))}</div>}
      <div style={{ ...s.card, padding: 0 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{visibleCols.map(c => <th key={c} style={s.tableTh}>{c}</th>)}<th style={s.tableTh}>操作</th></tr></thead><tbody>{filtered.map(c => (
        <tr key={c.id}>
          {visibleCols.map(col => <td key={col} style={s.tableTd}>{c[col] || "-"}</td>)}
          <td style={s.tableTd}><div style={{ display: "flex", gap: "15px" }}>
            <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}><Clock size={16}/> 状況</Link>
            <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "4px" }}><Edit3 size={16}/> 編集</Link>
            <button onClick={async () => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
          </div></td>
        </tr>
      ))}</tbody></table></div>
    </Page>
  );
}

// --- フォーム部品 ---
function DynamicField({ f, value, onChange }) {
  if (f.type === "dropdown") return <select style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)}><option value="">選択してください</option>{f.options?.split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>;
  return <input style={s.input} type={f.type} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={`${f.name}を入力`} />;
}

// --- 新規登録 ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const n = useNavigate();
  const [lastName, setLastName] = useState(""); const [firstName, setFirstName] = useState(""); const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({}); const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if(scenarios.length > 0) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);
  const sub = async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); n("/"); };
  return (
    <Page title="新規顧客登録" topButton={<button onClick={() => n("/form-settings")} style={{ ...s.btn, background: THEME.bg, color: THEME.primary, border: `1px solid ${THEME.border}` }}>項目を調整</button>}>
      <div style={{ ...s.card, maxWidth: "650px" }}><form onSubmit={sub}>
        <div style={{ display: "flex", gap: "20px" }}><div style={{ flex: 1 }}><label>姓</label><input style={s.input} required onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label>名</label><input style={s.input} required onChange={e => setFirstName(e.target.value)} /></div></div>
        <label>電話番号</label><input style={s.input} required onChange={e => setPhone(e.target.value)} />
        {formSettings.map(f => <div key={f.name}><label>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFormData({...formData, [f.name]: val})} /></div>)}
        <label>適用シナリオ</label><select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}</select>
        <button type="submit" style={{ ...s.btn, width: "100%" }}>登録する</button>
      </form></div>
    </Page>
  );
}

// --- 編集 (UI統一版) ---
function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers.find(x => x.id === Number(id));
  const [lastName, setL] = useState(""); const [firstName, setF] = useState(""); const [phone, setP] = useState("");
  const [formData, setFD] = useState({}); const [scenarioID, setS] = useState("");
  useEffect(() => { if (c) { setL(c["姓"] || ""); setF(c["名"] || ""); setP(c["電話番号"] || ""); setFD(c); setS(c.シナリオID); } }, [c]);
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="顧客情報の編集">
      <div style={{ ...s.card, maxWidth: "650px" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName, firstName, phone, data: formData, status: c.配信ステータス, scenarioID }); onRefresh(); nav("/"); }}>
        <div style={{ display: "flex", gap: "20px" }}><div style={{ flex: 1 }}><label>姓</label><input style={s.input} value={lastName} onChange={e => setL(e.target.value)} /></div><div style={{ flex: 1 }}><label>名</label><input style={s.input} value={firstName} onChange={e => setF(e.target.value)} /></div></div>
        <label>電話番号</label><input style={s.input} value={phone} onChange={e => setP(e.target.value)} />
        {formSettings.map(f => <div key={f.name}><label>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFD({...formData, [f.name]: val})} /></div>)}
        <label>適用シナリオ</label><select style={s.input} value={scenarioID} onChange={e => setS(e.target.value)}>{[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}</select>
        <button type="submit" style={{ ...s.btn, width: "100%" }}>保存する</button>
      </form></div>
    </Page>
  );
}

// --- 配信状況 (スケジュール取得安定化) ---
function CustomerSchedule({ customers, deliveryLogs, onRefresh }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  const [editLog, setEditLog] = useState(null);
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  const myLogs = deliveryLogs.filter(log => cleanPhone(log.電話番号) === cleanPhone(c["電話番号"]));
  return (
    <Page title="配信スケジュール" subtitle={`${c["姓"]}${c["名"]} 様`}>
      <Link to="/" style={{ display: "block", marginBottom: "20px", color: THEME.primary, fontWeight: "700" }}>← 戻る</Link>
      {myLogs.length > 0 ? myLogs.map((log, i) => (
        <div key={i} style={{ ...s.card, marginBottom: "15px", borderLeft: `6px solid ${log.ステータス === "配信済み" ? THEME.success : THEME.primary}`, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div><span style={s.badge}>{log.ステータス}</span><div style={{ marginTop: "8px", fontWeight: "800" }}>{new Date(log.配信予定日時).toLocaleString('ja-JP')}</div></div>
            {log.ステータス === "配信待ち" && <button onClick={() => setEditLog(log)} style={{ color: THEME.primary, border: "none", background: "none", cursor: "pointer", fontWeight: "700" }}>日時変更</button>}
          </div>
          <div style={{ marginTop: "12px", fontSize: "14px", whiteSpace: "pre-wrap" }}>{log.内容}</div>
        </div>
      )) : <div style={s.card}>データがありません。</div>}
      {editLog && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.card, width: "400px" }}><h3>日時の調整</h3><input type="datetime-local" style={s.input} onChange={e => setEditLog({...editLog, t: e.target.value})} />
            <div style={{ display: "flex", gap: "10px" }}><button onClick={async () => { await api.post(GAS_URL, { action: "updateDeliveryTime", logId: editLog.ログID, newTime: editLog.t }); onRefresh(); setEditLog(null); }} style={s.btn}>保存</button><button onClick={() => setEditLog(null)} style={{ ...s.btn, background: THEME.bg, color: THEME.textMain }}>閉じる</button></div>
          </div>
        </div>
      )}
    </Page>
  );
}

// --- 項目設定・シナリオ管理・UserManager・Appメイン (指示通りの完全統合版) ---
function FormSettings({ formSettings, onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const [dragIdx, setDragIdx] = useState(null); const nav = useNavigate();
  return (<Page title="項目の調整"><div style={{ maxWidth: "800px" }}>
    {["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px", color:THEME.textMuted}}>固定項目</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px", color:THEME.textMuted}}>形式</label><div>テキスト</div></div><div style={{ width: "100px", textAlign: "center" }}><label style={{fontSize:"11px", color:THEME.textMuted}}>必須</label><div style={{fontSize: "12px", color: THEME.success, fontWeight: "800"}}>固定</div></div></div>))}
    <div style={{ marginTop: "30px", marginBottom: "15px", fontWeight: "800" }}>追加項目の設定</div>
    {items.map((x, i) => (<div key={i} draggable onDragStart={() => setDragIdx(i)} onDragEnter={() => { const n = [...items]; const it = n.splice(dragIdx, 1)[0]; n.splice(i, 0, it); setItems(n); setDragIdx(i); }} onDragOver={e => e.preventDefault()} style={{ ...s.card, marginBottom: "12px", padding: "16px 24px", display: "flex", gap: "15px", alignItems: "center", cursor: "grab" }}>
      <GripVertical size={20} color={THEME.border} /><div style={{ flex: 2 }}><input style={{...s.input, marginBottom: 0}} value={x.name} onChange={e => { const n=[...items]; n[i].name=e.target.value; setItems(n); }} /></div><div style={{ flex: 1.5 }}><select style={{...s.input, marginBottom: 0}} value={x.type} onChange={e => { const n=[...items]; n[i].type=e.target.value; setItems(n); }}><option value="text">テキスト</option><option value="tel">番号</option><option value="dropdown">プルダウン</option><option value="date">日付</option></select></div>
      {x.type === "dropdown" && <div style={{ flex: 2 }}><input style={{...s.input, marginBottom: 0}} placeholder="A,B,C" value={x.options || ""} onChange={e => { const n=[...items]; n[i].options=e.target.value; setItems(n); }} /></div>}
      <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none" }}><Trash2 size={20}/></button>
    </div>))}
    <button onClick={() => setItems([...items, { name: "", type: "text", required: true, options: "" }])} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted }}>+ 項目追加</button>
    <button onClick={async () => { await api.post(GAS_URL, { action: "saveFormSettings", settings: items }); onRefresh(); nav("/add"); }} style={{ ...s.btn, width: "100%", marginTop: "20px" }}>保存して同期</button>
  </div></Page>);
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const nav = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (editId) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, deliveryHour: s.配信時間, message: s.message }))); } }, [editId, scenarios]);
  return (<Page title="シナリオ編集"><div style={s.card}><label>シナリオ名</label><input style={s.input} value={id} onChange={e=>setId(e.target.value)} disabled={!!editId} />
    {steps.map((x, i) => (<div key={i} style={{ padding: "20px", background: "#F8FAFC", marginBottom: "15px", borderRadius: "16px", border: `1px solid ${THEME.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}><span style={{ fontWeight: "900", color: THEME.primary }}>STEP {i + 1}</span><button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{color:THEME.danger, background:"none", border:"none"}}>削除</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}><div><label>配信日</label><input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} /></div><div><label>配信時間</label><input type="number" style={s.input} value={x.deliveryHour} onChange={e=>{ const n=[...steps]; n[i].deliveryHour=e.target.value; setSteps(n); }} /></div></div><textarea style={{ ...s.input, height: "100px" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} /></div>))}
    <button onClick={() => setSteps([...steps, { elapsedDays: 1, deliveryHour: 10, message: "" }])} style={{ ...s.btn, background: "none", color: THEME.primary, border: `1px solid ${THEME.primary}`, width: "100%", marginBottom: "15px" }}>+ 追加</button>
    <button onClick={async () => { if(!id) return alert("名必須"); setIsSaving(true); const cRes = await axios.get(`${GAS_URL}?mode=countAffected&scenarioID=${id}`); if (window.confirm(`${cRes.data.count}名の予約も更新されます。？`)) { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); onRefresh(); nav("/scenarios"); } setIsSaving(false); }} disabled={isSaving} style={{ ...s.btn, width: "100%" }}>保存して反映</button>
  </div></Page>);
}

function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={s.btn}><Plus size={18}/> 新規</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>{Object.entries(grouped).map(([id, steps]) => (<div key={id} style={s.card}><div style={{display:"flex", justifyContent:"space-between"}}><h3>{id}</h3><button onClick={async () => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); } }} style={{background:"none", border:"none", color:THEME.danger}}><Trash2 size={18}/></button></div><Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, width: "100%", background: THEME.bg, color: THEME.textMain, border:`1px solid ${THEME.border}`, textDecoration:"none", marginTop:"15px" }}>編集</Link></div>))}</div></Page>);
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]);
  const fetchUsers = useCallback(async () => { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res.data.users); }, [masterUrl]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  return (<Page title="ユーザー管理"><div style={s.card}><table style={{width:"100%"}}><thead><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th></tr></thead><tbody>{users.map((u, i) => (<tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td></tr>))}</tbody></table></div></Page>);
}

function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  if(!c) return <div>Loading...</div>;
  return (<Page title="詳細情報"><Link to="/" style={{display:"block", marginBottom:"20px"}}>← 戻る</Link><div style={s.card}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>{["姓", "名", "電話番号", ...formSettings.map(f => f.name)].map(f => (<div key={f} style={{borderBottom:`1px solid ${THEME.border}`, paddingBottom:"10px"}}><label style={{fontSize:"12px", color:THEME.textMuted}}>{f}</label><div style={{fontWeight:"600"}}>{c[f] || "-"}</div></div>))}</div></div></Page>);
}

export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], deliveryLogs: [] });
  const [load, setLoad] = useState(true); const [user, setUser] = useState(null); 
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } catch (e) { console.error(e); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><div style={{ ...s.card, textAlign: "center", width: "400px" }}><h1 style={{marginBottom: "30px"}}>StepFlow</h1><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => setUser(jwtDecode(res.credential))} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Router><div style={{ display: "flex", fontFamily: "Inter, sans-serif" }}><Sidebar onLogout={() => setUser(null)} user={user} /><Routes>
    <Route path="/" element={<CustomerList customers={d.customers} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} formSettings={d.formSettings} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} deliveryLogs={d.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}