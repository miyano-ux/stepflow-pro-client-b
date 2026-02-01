import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, GripVertical, ListFilter, Edit3, Lock, Search, Clock, Save, ArrowLeft, Calendar as CalendarIcon
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

function Page({ title, children, topButton }) {
  return (<div style={s.main}><div style={{ padding: "40px 60px", maxWidth: "1300px", margin: "0 auto" }}><div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}><div><h1 style={{ fontSize: "28px", fontWeight: "800" }}>{title}</h1></div>{topButton}</div>{children}</div></div>);
}

// --- 顧客リスト (レンジ検索・検索項目分離対応) ---
function CustomerList({ customers, displaySettings, formSettings, onRefresh }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({});

  // 表示列と検索列の取得
  const visibleCols = useMemo(() => {
    if (displaySettings?.length > 0) return displaySettings.filter(s => s.visible).map(s => s.name);
    return ["姓", "名", "電話番号", "シナリオID"];
  }, [displaySettings]);

  const searchableCols = useMemo(() => {
    if (displaySettings?.length > 0) return displaySettings.filter(s => s.searchable).map(s => s.name);
    return ["姓", "電話番号"];
  }, [displaySettings]);

  // 🆕 検索フィルタロジック (日付レンジ対応)
  const filtered = useMemo(() => {
    return customers.filter(c => {
      return Object.keys(search).every(key => {
        const query = search[key];
        if (!query) return true;

        const fieldType = formSettings.find(f => f.name === key)?.type;
        const val = String(c[key] || "");

        if (fieldType === "date") {
          // 日付レンジ検索
          const targetDate = new Date(val).getTime();
          if (query.start && targetDate < new Date(query.start).getTime()) return false;
          if (query.end && targetDate > new Date(query.end).getTime()) return false;
          return true;
        } else if (fieldType === "dropdown") {
          // プルダウン完全一致
          return val === query;
        } else {
          // テキスト部分一致
          return val.toLowerCase().includes(query.toLowerCase());
        }
      });
    });
  }, [customers, search, formSettings]);

  return (
    <Page title="顧客ダッシュボード" topButton={<button onClick={() => navigate("/column-settings")} style={{ ...s.btn, ...s.btnSecondary }}><ListFilter size={18} /> 表示・検索項目設定</button>}>
      
      {/* 🆕 動的・多機能検索バー */}
      <div style={{ ...s.card, padding: "20px", marginBottom: "24px", background: "#F1F5F9", border: "none", display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ width: "100%", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700" }}>
          <Search size={16} /> フィルター条件
        </div>
        {searchableCols.map(col => {
          const f = formSettings.find(x => x.name === col);
          
          if (f?.type === "date") {
            return (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input type="date" style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: {...(search[col]||{}), start: e.target.value}})} />
                  <span style={{ fontSize: "12px" }}>～</span>
                  <input type="date" style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: {...(search[col]||{}), end: e.target.value}})} />
                </div>
              </div>
            );
          }
          if (f?.type === "dropdown") {
            return (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
                <select style={{ ...s.input, width: "150px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: e.target.value})}>
                  <option value="">全て</option>
                  {f.options?.split(",").map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          }
          return (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
              <input placeholder={`${col}で検索...`} style={{ ...s.input, width: "140px", marginBottom: 0 }} onChange={e => setSearch({...search, [col]: e.target.value})} />
            </div>
          );
        })}
        <button onClick={() => setSearch({})} style={{ fontSize: "12px", color: THEME.primary, background: "none", border: "none", cursor: "pointer", fontWeight: "700", paddingBottom: "10px" }}>リセット</button>
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

// --- 🆕 画面：表示・検索設定 (項目分離・順序設定画面) ---
function ColumnSettings({ displaySettings, formSettings, onRefresh }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (displaySettings?.length > 0) {
      setItems(displaySettings);
    } else {
      const defaults = ["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)].map(name => ({ name, visible: true, searchable: true }));
      setItems(defaults);
    }
  }, [displaySettings, formSettings]);

  const onDragStart = (e, index) => { setDragIdx(index); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, index) => {
    e.preventDefault(); if (dragIdx === null || dragIdx === index) return;
    const newList = [...items]; const item = newList.splice(dragIdx, 1)[0]; newList.splice(index, 0, item);
    setDragIdx(index); setItems(newList);
  };

  const handleSave = async () => {
    try {
      await api.post(GAS_URL, { action: "saveDisplaySettings", settings: items });
      alert("設定を保存しました"); onRefresh(); navigate("/");
    } catch (e) { alert("失敗"); }
  };

  return (
    <Page title="表示と検索のカスタマイズ">
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", padding: "0 20px 10px 60px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800" }}>
            <div style={{ flex: 1 }}>項目名</div>
            <div style={{ width: "80px", textAlign: "center" }}>表 示</div>
            <div style={{ width: "80px", textAlign: "center" }}>検 索</div>
          </div>
          {items.map((it, i) => (
            <div key={it.name} draggable onDragStart={(e) => onDragStart(e, i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={() => setDragIdx(null)}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", backgroundColor: "white", border: `1px solid ${dragIdx === i ? THEME.primary : THEME.border}`, borderRadius: "12px", marginBottom: "8px", cursor: "grab", opacity: dragIdx === i ? 0.5 : 1 }}>
              <GripVertical size={18} color={THEME.textMuted} />
              <div style={{ flex: 1, fontWeight: "600", fontSize: "14px" }}>{it.name}</div>
              <div style={{ width: "80px", display: "flex", justifyContent: "center" }}>
                <input type="checkbox" checked={it.visible} onChange={() => { const n = [...items]; n[i].visible = !n[i].visible; setItems(n); }} style={{ width: "18px", height: "18px" }} />
              </div>
              <div style={{ width: "80px", display: "flex", justifyContent: "center" }}>
                <input type="checkbox" checked={it.searchable} onChange={() => { const n = [...items]; n[i].searchable = !n[i].searchable; setItems(n); }} style={{ width: "18px", height: "18px" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "15px" }}>
          <button onClick={handleSave} style={{ ...s.btn, ...s.btnPrimary, flex: 2, padding: "16px" }}><Save size={20}/> サーバーへ保存して反映</button>
          <button onClick={() => navigate("/")} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>戻る</button>
        </div>
      </div>
    </Page>
  );
}

// --- 他コンポーネント (指示通りの完全統合版) ---
function DynamicField({ f, value, onChange }) {
  if (f.type === "dropdown") return <select style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)}><option value="">選択してください</option>{f?.options?.split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>;
  if (f.type === "date") return <input type="date" style={s.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} />;
  return <input style={s.input} type={f.type} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={`${f.name || "項目"}を入力`} />;
}

function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const n = useNavigate();
  const [lastName, setLastName] = useState(""); const [firstName, setFirstName] = useState(""); const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({}); const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if(scenarios.length > 0) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);
  return (<Page title="新規顧客登録" topButton={<button onClick={() => n("/form-settings")} style={{ ...s.btn, ...s.btnSecondary }}>項目を調整</button>}><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); n("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>姓</label><input style={s.input} required onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>名</label><input style={s.input} required onChange={e => setFirstName(e.target.value)} /></div></div>
    <div style={{ marginBottom: "20px" }}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>電話番号</label><input style={s.input} required onChange={e => setPhone(e.target.value)} /></div>
    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: "24px" }}>{formSettings.filter(f => f.name).map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700", display:"block", marginBottom:"8px"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFormData({...formData, [f.name]: val})} /></div>)}</div>
    <label style={{fontWeight:"700"}}>シナリオ</label><select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}</select>
    <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>登録する</button></form></div></Page>);
}

function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers.find(x => x.id === Number(id));
  const [lastName, setL] = useState(""); const [firstName, setF] = useState(""); const [phone, setP] = useState("");
  const [formData, setFD] = useState({}); const [scenarioID, setS] = useState("");
  useEffect(() => { if (c) { setL(c["姓"] || ""); setF(c["名"] || ""); setP(c["電話番号"] || ""); setFD(c); setS(c.シナリオID); } }, [c]);
  if(!c) return <Page title="Loading..."><Loader2 size={48} className="animate-spin" /></Page>;
  return (<Page title="情報の編集"><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName, firstName, phone, data: formData, status: c.配信ステータス, scenarioID }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={s.input} value={lastName} onChange={e => setL(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={s.input} value={firstName} onChange={e => setF(e.target.value)} /></div></div>
    <div style={{ marginBottom: "20px" }}><label style={{fontWeight:"700"}}>電話番号</label><input style={s.input} value={phone} onChange={e => setP(e.target.value)} /></div>
    {formSettings.filter(f => f.name).map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={val => setFD({...formData, [f.name]: val})} /></div>)}
    <button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>保存</button></form></div></Page>);
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "" } });
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
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{...s.btn, ...s.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>{Object.entries(grouped).map(([id, steps]) => (<div key={id} style={s.card}><div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px"}}><div><h3 style={{margin:0, fontSize:"18px"}}>{id}</h3><span style={{fontSize:"13px", color:THEME.textMuted}}>{steps.length} ステップ</span></div><button onClick={async()=>{if(window.confirm("削除？")){await api.post(GAS_URL,{action:"deleteScenario",scenarioID:id});onRefresh();}}} style={{color:THEME.danger, background:"none", border:"none", cursor:"pointer"}}><Trash2 size={18}/></button></div><Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, backgroundColor: "white", border: `1px solid ${THEME.border}`, color: THEME.textMain, width: "100%", textDecoration: "none" }}>構成を編集</Link></div>))}</div></Page>);
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const nav = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (editId) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, deliveryHour: s.配信時間, message: s.message }))); } }, [editId, scenarios]);
  return (<Page title="シナリオ編集"><div style={{ ...s.card, maxWidth: "800px" }}><label>シナリオ名</label><input style={s.input} value={id} onChange={e=>setId(e.target.value)} disabled={!!editId} />
    {steps.map((x, i) => (<div key={i} style={{ padding: "24px", background: "#F8FAFC", marginBottom: "15px", borderRadius: "16px", border: `1px solid ${THEME.border}` }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}><span style={{ fontWeight: "900" }}>STEP {i + 1}</span><button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{color:THEME.danger, background:"none", border:"none", cursor:"pointer"}}>削除</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}><div><label>配信日</label><input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} /></div><div><label>配信時間</label><input type="number" style={s.input} value={x.deliveryHour} onChange={e=>{ const n=[...steps]; n[i].deliveryHour=e.target.value; setSteps(n); }} /></div></div><textarea style={{ ...s.input, height: "100px", resize:"none" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} /></div>))}
    <button onClick={() => setSteps([...steps, { elapsedDays: 1, deliveryHour: 10, message: "" }])} style={{ ...s.btn, ...s.btnSecondary, width: "100%", marginBottom: "15px" }}>+ 追加</button>
    <button onClick={async () => { if(!id) return alert("名必須"); setIsSaving(true); try { const cRes = await axios.get(`${GAS_URL}?mode=countAffected&scenarioID=${id}`); if (window.confirm(`${cRes.data.count}名の予約も一括更新されます。よろしいですか？`)) { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); alert("更新完了"); nav("/scenarios"); } } finally { setIsSaving(false); } }} disabled={isSaving} style={{ ...s.btn, ...s.btnPrimary, width: "100%" }}>保存</button></div></Page>);
}

function CustomerSchedule({ customers, deliveryLogs, onRefresh }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  const [editLog, setEditLog] = useState(null);
  if(!c) return <Page title="Loading..."><Loader2 size={24} className="animate-spin" /></Page>;
  const myLogs = deliveryLogs.filter(log => cleanPhone(log.電話番号) === cleanPhone(c["電話番号"]));
  const startEdit = (log) => { const d = new Date(log.配信予定日時); const tzOffset = d.getTimezoneOffset() * 60000; const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16); setEditLog({ ...log, t: localISOTime, m: log.内容 }); };
  return (<Page title="状況" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link><div style={{display:"flex", flexDirection:"column", gap:"16px"}}>{myLogs.map((log, i) => (<div key={i} style={{ ...s.card, borderLeft: `6px solid ${log.ステータス === "配信済み" ? THEME.success : THEME.primary}`, padding: "20px", marginBottom: 0 }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{log.ステータス}</span><div style={{fontWeight:"800", marginTop:"8px"}}>{new Date(log.配信予定日時).toLocaleString()}</div></div>{log.ステータス === "配信待ち" && <button onClick={()=>startEdit(log)} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"15px", whiteSpace:"pre-wrap", fontSize:"14px"}}>{log.内容}</div></div>))}</div>
  {editLog && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "500px", marginBottom: 0 }}><h3>配信内容の個別調整</h3><div style={{marginBottom:"15px"}}><label style={{fontSize:"12px"}}>配信日時</label><input type="datetime-local" style={s.input} value={editLog.t} onChange={e=>setEditLog({...editLog, t:e.target.value})} /></div><div style={{marginBottom:"20px"}}><label style={{fontSize:"12px"}}>本文</label><textarea style={{...s.input, height:"150px", resize:"none"}} value={editLog.m} onChange={e=>setEditLog({...editLog, m:e.target.value})} /></div><div style={{display:"flex", gap:"12px"}}><button onClick={async()=>{await api.post(GAS_URL,{action:"updateDeliveryTime",logId:editLog.ログID,newTime:editLog.t, newMessage:editLog.m}); onRefresh(); setEditLog(null);}} style={{...s.btn, backgroundColor:THEME.primary, color:"white", flex:1}}>保存</button><button onClick={()=>setEditLog(null)} style={{...s.btn, backgroundColor:"white", border:`1px solid ${THEME.border}`, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  if(!c) return <div>Loading...</div>;
  return (<Page title="詳細情報"><Link to="/" style={{display:"block", marginBottom:"20px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link><div style={{...s.card, padding: "40px"}}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>{["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)].map(f => (<div key={f} style={{borderBottom:`1px solid ${THEME.border}`, paddingBottom:"12px"}}><label style={{fontSize:"11px", color:THEME.textMuted, fontWeight:"800"}}>{f}</label><div style={{fontWeight:"600", fontSize: "16px", marginTop:"4px"}}>{c[f] || "-"}</div></div>))}</div></div></Page>);
}

export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [] });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => { const saved = localStorage.getItem("sf_user"); return saved ? JSON.parse(saved) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px", marginBottom: 0 }}><div style={{ backgroundColor: THEME.primary, width: "56px", height: "56px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><MessageSquare color="white" size={32} /></div><h1>StepFlow</h1><p style={{ color: THEME.textMuted, marginBottom: "32px" }}>管理者ログイン</p><div style={{ display: "flex", justifyContent: "center" }}><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Router><div style={{ display: "flex", fontFamily: "'Inter', sans-serif" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} user={user} /><Routes>
    <Route path="/" element={<CustomerList customers={d.customers} displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/column-settings" element={<ColumnSettings displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
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