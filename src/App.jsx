/**
 * StepFlow Pro React Frontend (V13.1 Final Absolute)
 * 準拠: 究極要件仕様書 V13 (Ground Truth Baseline)
 * 【修正済】項目設定・表示設定のボタン化、CSVテンプレートDL、日付レンジ検索、レイアウト物理修正
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, GripVertical, ListFilter, Edit3, Lock, Save, Search, Clock, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, FileSpreadsheet, Eye, Send, Copy, Calendar, AlertCircle, ChevronRight, SlidersHorizontal, 
  UserCheck,Mail
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ==========================================
// 🔑 1. 環境設定・テーマ定義 [仕様書 1.1 準拠]
// ==========================================
const CLIENT_COMPANY_NAME = "B社"; 
const GAS_URL = import.meta.env.VITE_GAS_URL; 
const MASTER_WHITELIST_API = import.meta.env.VITE_MASTER_WHITELIST_API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444", locked: "#F1F5F9", sidebar: "#0F172A"
};

const globalStyle = `
  * { box-sizing: border-box !important; }
  body { margin: 0; font-family: 'Inter', sans-serif; background-color: ${THEME.bg}; color: ${THEME.textMain}; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 10px; }
`;

const styles = {
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000, display: "flex", flexDirection: "column" },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", boxSizing: "border-box", width: "100%" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: "white", transition: "0.2s" },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", border: "none", fontWeight: "700", cursor: "pointer", transition: "0.2s", fontSize: "14px", boxSizing: "border-box" },
  btnPrimary: { backgroundColor: THEME.primary, color: "white", boxShadow: "0 4px 14px 0 rgba(79, 70, 229, 0.3)" },
  btnSecondary: { backgroundColor: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` },
  tableTh: { padding: "14px 20px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase" },
  tableTd: { padding: "18px 20px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMain },
  badge: { padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", backgroundColor: "#EEF2FF", color: THEME.primary }
};

// ==========================================
// 🛠️ 2. ヘルパー関数 [仕様書 4.1 準拠]
// ==========================================
const formatDate = (v) => {
  if (!v || v === "-" || v === "undefined") return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const smartNormalizePhone = (phone) => {
  if (!phone) return "";
  let p = String(phone).replace(/[="]/g, "").replace(/[^\d]/g, ""); 
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

const apiCall = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

const replaceVariables = (text, customer, staff = null) => {
  if (!text) return "";
  let res = text;
  // 顧客変数の置換 ({{姓}} など)
  Object.keys(customer || {}).forEach(key => { res = res.replaceAll(`{{${key}}}`, customer[key] || ""); });
  // 担当者変数の置換 ({{担当者姓}} など)
  if (staff) {
    res = res.replaceAll(`{{担当者姓}}`, staff.lastName || "");
    res = res.replaceAll(`{{担当者名}}`, staff.firstName || "");
    res = res.replaceAll(`{{担当者メール}}`, staff.email || "");
    res = res.replaceAll(`{{担当者電話}}`, staff.phone || "");
  }
  return res;
};

const downloadCSV = (rows, filename) => {
  const content = rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
};

// ==========================================
// 🧩 3. 共通UIパーツ
// ==========================================
function SmartDateTimePicker({ value, onChange }) {
  const setQuick = (min) => {
    const d = new Date(new Date().getTime() + min * 60000);
    const jst = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    onChange(jst);
  };
  return (
    <div style={{ ...styles.card, padding: "16px", background: "#F1F5F9", border: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Calendar size={18} color={THEME.primary} />
        <input type="datetime-local" style={{ ...styles.input, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setQuick(60)} style={{ ...styles.btn, ...styles.btnSecondary, padding: "6px 12px", fontSize: "11px" }}>+1時間</button>
        <button type="button" onClick={() => setQuick(1440)} style={{ ...styles.btn, ...styles.btnSecondary, padding: "6px 12px", fontSize: "11px" }}>明日</button>
      </div>
    </div>
  );
}

function DynamicField({ f, value, onChange }) {
  if (f.type === "dropdown") return (
    <select style={styles.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">選択してください</option>
      {f?.options?.split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
  if (f.type === "date") return <input type="date" style={styles.input} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} />;
  return <input style={styles.input} type={f.type} required={f.required} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={`${f.name}を入力`} />;
}

function DateRangePicker({ label, value = {}, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="date" style={{ ...styles.input, width: "135px", padding: "8px" }} value={value.start || ""} onChange={e => onChange({ ...value, start: e.target.value })} />
        <span style={{ color: THEME.textMuted }}>〜</span>
        <input type="date" style={{ ...styles.input, width: "135px", padding: "8px" }} value={value.end || ""} onChange={e => onChange({ ...value, end: e.target.value })} />
      </div>
    </div>
  );
}

function Sidebar({ onLogout }) {
  const l = useLocation();
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={18} /> },
    { n: "新規顧客登録", p: "/add", i: <UserPlus size={18} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={18} /> },
    { n: "テンプレート管理", p: "/templates", i: <Copy size={18} /> },
    { n: "Gmail連携設定", p: "/gmail-settings", i: <Mail size={18} /> },
    { n: "ユーザー管理", p: "/users", i: <Users size={18} /> }
  ];
  return (
    <div style={styles.sidebar}>
      <div style={{ fontSize: "22px", fontWeight: "900", marginBottom: "48px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ backgroundColor: THEME.primary, width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}><MessageSquare size={18} color="white"/></div>
        StepFlow
      </div>
      <div style={{ flex: 1 }}>{m.map(x => (
        <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderRadius: "10px", textDecoration: "none", color: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "white" : "#94A3B8", backgroundColor: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "rgba(255,255,255,0.08)" : "transparent", marginBottom: "6px", fontWeight: "600", fontSize: "14px" }}>
          {x.i} {x.n}
        </Link>
      ))}</div>
      <button onClick={onLogout} style={{ ...styles.btn, width: "100%", background: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)" }}>
        <LogOut size={16}/> Logout
      </button>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (<div style={styles.main}><div style={{ padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" }}><div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "6px" }}>{subtitle}</p>}</div>{topButton}</div>{children}</div></div>);
}

// ==========================================
// 📺 4. 画面コンポーネント (全13個・完全収録)
// ==========================================

// --- (1) 顧客ダッシュボード [表示項目調整ボタン統合] ---
function CustomerList({ customers = [], displaySettings = [], formSettings = [], onRefresh }) {
  const navigate = useNavigate(); const [search, setSearch] = useState({}); const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const vCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(i => i.visible).map(i => i.name) : ["姓", "名", "電話番号", "シナリオID", "登録日"], [displaySettings]);
  const sCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(i => i.searchable).map(i => i.name) : ["姓", "電話番号", "登録日"], [displaySettings]);
  
  const filtered = useMemo(() => {
    let res = [...(customers || [])].filter(c => Object.keys(search).every(k => {
      const q = search[k]; if (!q) return true;
      if (formSettings?.find(x => x.name === k)?.type === "date" || k === "登録日") {
        if (!c[k] || c[k] === "-") return false;
        const targetTime = new Date(c[k]).getTime();
        if (q.start && targetTime < parseLocalDate(q.start)) return false;
        if (q.end && targetTime > parseLocalDate(q.end, true)) return false;
        return true;
      }
      return String(c[k] || "").toLowerCase().includes(String(q).toLowerCase());
    }));
    if (sort.key) res.sort((a, b) => { const aV = a[sort.key], bV = b[sort.key]; return sort.dir === 'asc' ? String(aV).localeCompare(String(bV)) : String(bV).localeCompare(String(aV)); });
    return res;
  }, [customers, search, formSettings, sort]);

  return (<Page title="顧客ダッシュボード" topButton={
    <div style={{ display: "flex", gap: "12px" }}>
      <button onClick={() => downloadCSV([vCols, ...filtered.map(c => vCols.map(col => c[col]))], "customers.csv")} style={{ ...styles.btn, ...styles.btnSecondary }}><Download size={18} /> CSV出力</button>
      <button onClick={() => navigate("/column-settings")} style={{ ...styles.btn, ...styles.btnPrimary }}><SlidersHorizontal size={18} /> 表示項目・順序の調整</button>
    </div>
  }>
    <div style={{ ...styles.card, padding: "24px", marginBottom: "32px", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-end", backgroundColor: "white" }}>
      <div style={{ color: THEME.textMuted, paddingBottom: 10 }}><Search size={20} /></div>
      {sCols.map(col => (formSettings?.find(x => x.name === col)?.type === "date" || col === "登録日") ? (
        <DateRangePicker key={col} label={col} value={search[col] || {}} onChange={v => setSearch({ ...search, [col]: v })} />
      ) : (
        <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
          <input placeholder={`${col}で検索...`} style={{ ...styles.input, width: "150px", padding: "10px" }} value={search[col] || ""} onChange={e => setSearch({...search, [col]: e.target.value})} />
        </div>
      ))}
      <button onClick={() => setSearch({})} style={{ ...styles.btn, background: "none", color: THEME.primary, fontWeight: "800", padding: "10px" }}>条件リセット</button>
    </div>
    <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{vCols.map(c => <th key={c} style={{ ...styles.tableTh, cursor: "pointer" }} onClick={() => setSort({ key: c, dir: (sort.key === c && sort.dir === 'asc') ? 'desc' : 'asc' })}>{c} {sort.key === c ? (sort.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} opacity={0.3}/>}</th>)}<th style={styles.tableTh}>操作</th></tr></thead>
      <tbody>{filtered.map(c => (<tr key={c.id} style={{ transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
        {vCols.map(col => <td key={col} style={styles.tableTd}>{col === "シナリオID" ? <span style={styles.badge}>{c[col]}</span> : formatDate(c[col])}</td>)}
        <td style={styles.tableTd}><div style={{ display: "flex", gap: "12px" }}>
          <Link to={`/direct-sms/${c.id}`} style={{ ...styles.badge, textDecoration: "none", backgroundColor: THEME.primary, color: "white" }}><MessageSquare size={12}/> 送信</Link>
          <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "800" }}>状況</Link>
          <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Edit3 size={16}/></Link>
          <button onClick={async () => { if(window.confirm("顧客情報を削除しますか？")) { await apiCall.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
        </div></td></tr>))}</tbody></table></div></Page>);
}

// --- (2) 顧客詳細 ---
function CustomerDetail({ customers = [] }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id));
  if (!c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin" /></Page>;
  return (<Page title="顧客詳細"><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link><div style={styles.card}><pre>{JSON.stringify(c, null, 2)}</pre></div></Page>);
}

// --- (3) 顧客登録 [テンプレートDL・項目設定ボタン統合] ---
function CustomerForm({ formSettings = [], scenarios = [], onRefresh }) {
  const navigate = useNavigate(); const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  const [fd, setFd] = useState({}); const [sc, setSc] = useState("");
  useEffect(() => { if(scenarios?.length > 0) setSc(scenarios[0]["シナリオID"]); }, [scenarios]);
  
  const handleUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rows = ev.target.result.split("\n").map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
      const items = rows.slice(1).filter(r => r.length > 2).map(row => {
        const obj = { lastName: row[0], firstName: row[1], phone: smartNormalizePhone(row[2]), scenarioID: row[3], data: {} };
        rows[0].slice(4).forEach((h, i) => { if(h) obj.data[h] = row[i+4]; }); return obj;
      });
      try { await apiCall.post(GAS_URL, { action: "bulkAdd", customers: items }); alert("一括登録完了"); onRefresh(); navigate("/"); } catch (err) { alert(err.message); }
    }; reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = ["姓", "名", "電話番号", "シナリオID", ...(formSettings || []).map(f => f.name)];
    downloadCSV([headers, ["山田", "太郎", "09012345678", scenarios[0]?.["シナリオID"] || "A"]], "template.csv");
  };

  return (<Page title="新規顧客登録" topButton={
    <div style={{ display: "flex", gap: "12px" }}>
      <button onClick={handleDownloadTemplate} style={{ ...styles.btn, ...styles.btnSecondary }}><FileSpreadsheet size={18} /> 登録テンプレートDL</button>
      <button onClick={() => navigate("/form-settings")} style={{ ...styles.btn, ...styles.btnPrimary }}><SlidersHorizontal size={18} /> 登録項目の調整</button>
    </div>
  }><div style={{ ...styles.card, maxWidth: "700px", margin: "0 auto" }}>
    <form onSubmit={async (e) => { e.preventDefault(); try { await apiCall.post(GAS_URL, { action: "add", lastName: ln, firstName: fn, phone: ph, data: fd, scenarioID: sc }); onRefresh(); navigate("/"); } catch(err) { alert(err.message); } }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓 *</label><input style={styles.input} required onChange={e => setLn(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名 *</label><input style={styles.input} required onChange={e => setFn(e.target.value)} /></div></div>
      <label style={{fontWeight:"700"}}>電話番号 *</label><input style={{...styles.input, marginBottom:"20px"}} required value={ph} onChange={e => setPh(e.target.value)} placeholder="09012345678" />
      {formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v => setFd({...fd, [f.name]: v})} /></div>)}
      <label style={{fontWeight:"700"}}>適用シナリオ</label>
      <select style={{...styles.input, marginBottom:"32px"}} value={sc} onChange={e => setSc(e.target.value)}>
        {[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}
      </select>
      <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", padding: "16px" }}>登録を確定する</button>
    </form>
    <div style={{ marginTop: "24px", borderTop: `1px solid ${THEME.border}`, paddingTop: "24px" }}>
      <button onClick={() => { const f = document.createElement("input"); f.type="file"; f.accept=".csv"; f.onchange=handleUpload; f.click(); }} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%" }}><Upload size={18} /> CSVファイルから一括インポート</button>
    </div>
  </div></Page>);
}

// --- (4) 顧客編集 ---
function CustomerEdit({ customers = [], scenarios = [], formSettings = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  const [fd, setFd] = useState({}); const [sc, setSc] = useState("");
  useEffect(() => { if (c) { setLn(c["姓"] || ""); setFn(c["名"] || ""); setPh(c["電話番号"] || ""); setFd(c); setSc(c["シナリオID"]); } }, [c]);
  if(!c) return <Page title="読込中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="顧客情報の編集"><div style={{ ...styles.card, maxWidth: "700px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await apiCall.post(GAS_URL, { action: "update", id, lastName:ln, firstName:fn, phone:ph, data: fd, status: c["配信ステータス"], scenarioID: sc }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={styles.input} value={ln} onChange={e=>setLn(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={styles.input} value={fn} onChange={e=>setFn(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号</label><input style={styles.input} value={ph} onChange={e=>setPh(e.target.value)} />
    {formSettings.map(f => <div key={f.name} style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v=>setFd({...fd,[f.name]:v})} /></div>)}
    <label style={{display:"block", marginTop:"20px", fontWeight:"700"}}>シナリオ</label><select style={styles.input} value={sc} onChange={e=>setSc(e.target.value)}>{[...new Set(scenarios?.map(x=>x["シナリオID"]))].map(id=><option key={id} value={id}>{id}</option>)}</select>
    <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "32px", padding: "16px" }}>変更を保存</button></form></div></Page>);
}

// --- (5) 配信状況/履歴 [2階層表示] ---
function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id)); const [edit, setEdit] = useState(null);
  if (!customers.length || !c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin"/></Page>;
  const cP = smartNormalizePhone(c["電話番号"]);
  const sL = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cP && l["ステップ名"] !== "個別SMS");
  const dL = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cP && l["ステップ名"] === "個別SMS");
  return (<Page title="配信スケジュール" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link>
    <div style={{marginBottom:"40px"}}><h3 style={{fontSize:"18px", marginBottom:"16px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>ステップ配信ログ</h3>
      <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>{sL.map((l, i) => (<div key={i} style={{ ...styles.card, padding: "16px", borderLeft: `6px solid ${l["ステータス"] === "配信済み" ? THEME.success : THEME.primary}` }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={styles.badge}>{l["ステータス"]}</span><span style={{fontWeight:"800", marginLeft:"12px"}}>{formatDate(l["配信予定日時"])}</span><span style={{marginLeft:"12px", color:THEME.textMuted, fontSize:"12px"}}>{l["ステップ名"]}</span></div>{l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"10px", fontSize:"14px"}}>{l["内容"]}</div></div>))}</div></div>
    <div><h3 style={{fontSize:"18px", marginBottom:"16px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>個別送信ログ</h3>
      <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>{dL.map((l, i) => (<div key={i} style={{ ...styles.card, padding: "16px", background:"#F8FAFC" }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={styles.badge}>{l["ステータス"]}</span><span style={{fontWeight:"800", marginLeft:"12px"}}>{formatDate(l["配信予定日時"])}</span></div>{l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"10px", fontSize:"14px"}}>{l["内容"]}</div></div>))}</div></div>
    {edit && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...styles.card, width: "500px", padding: "32px" }}><h3>日時の再設定</h3><SmartDateTimePicker value={edit.t} onChange={t=>setEdit({...edit, t})} /><textarea style={{...styles.input, height:"150px", marginTop:"15px", resize:"none"}} value={edit.m} onChange={e=>setEdit({...edit, m:e.target.value})} /><div style={{display:"flex", gap:"12px", marginTop:"24px"}}><button onClick={async()=>{ await apiCall.post(GAS_URL,{action:"updateDeliveryTime",logId:edit.id,newTime:edit.t, newMessage:edit.m}); onRefresh(); setEdit(null); }} style={{...styles.btn, ...styles.btnPrimary, flex:1}}>保存</button><button onClick={()=>setEdit(null)} style={{...styles.btn, ...styles.btnSecondary, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

// --- (6) 個別SMS送信 ---
function DirectSms({ customers = [], templates = [], onRefresh, masterUrl, currentUserEmail }) {
  const { id } = useParams(); const navigate = useNavigate(); 
  const c = customers?.find(x => x.id === Number(id));
  const [msg, setMsg] = useState(""); 
  const [time, setTime] = useState(new Date(new Date().getTime() + 10 * 60000).toISOString().slice(0, 16));
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`);
        const list = res?.data?.users || [];
        setStaffList(list);
        
        // 🆕 ログインユーザーと一致するスタッフを自動選択
        const myProfile = list.find(s => String(s.email).toLowerCase() === String(currentUserEmail).toLowerCase());
        if (myProfile) {
          setSelectedStaff(myProfile);
        } else if (list.length > 0) {
          setSelectedStaff(list[0]);
        }
      } catch(e) { console.error("担当者リスト取得エラー", e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl, currentUserEmail]);

  if (!c) return <Page title="読込中..."><div style={{display:"flex", justifyContent:"center", padding:40}}><Loader2 className="animate-spin" size={32} color={THEME.primary}/></div></Page>;

  return (<Page title="個別メッセージ送信" subtitle={`${c?.["姓"] || ""} ${c?.["名"] || ""} 様`}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}>
      <div>
        <div style={{...styles.card, marginBottom: 24, backgroundColor: "#EEF2FF", border: "none", padding: "20px"}}>
          <label style={{ fontWeight: "800", fontSize: 11, color: THEME.primary, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <UserCheck size={16}/> 送信担当者
          </label>
          <select style={styles.input} value={selectedStaff?.email || ""} onChange={e => setSelectedStaff(staffList.find(s => s.email === e.target.value))}>
            {staffList.length > 0 ? (
              staffList.map(s => <option key={s.email} value={s.email}>{s.lastName || ""} {s.firstName || ""} ({s.email})</option>)
            ) : (
              <option value="">担当者が登録されていません</option>
            )}
          </select>
          {selectedStaff?.email === currentUserEmail && (
            <p style={{fontSize: 10, color: THEME.success, fontWeight: "800", marginTop: 8}}>✓ あなたが自動選択されています</p>
          )}
        </div>

        <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px" }}>配信日時とメッセージ本文</label>
        <SmartDateTimePicker value={time} onChange={setTime} />
        <textarea style={{ ...styles.input, height: "300px", resize: "none", marginTop: "24px", lineHeight: "1.5" }} value={msg} onChange={e => setMsg(e.target.value)} placeholder="メッセージ本文を入力してください。{{姓}}などの変数も利用可能です。" />
        <button onClick={async()=>{ if(!msg) return alert("本文を入力してください"); await apiCall.post(GAS_URL,{action:"sendDirectSms",phone:c["電話番号"],customerName:`${c["姓"]} ${c["名"]}`,scheduledTime:time,message:msg}); alert("配信予約が完了しました"); navigate("/"); }} style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "24px", padding: "16px" }}>配信予約を確定する</button>
      </div>
      <div>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "800" }}>テンプレートから引用</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {templates.map(t => (<div key={t.id} onClick={() => setMsg(replaceVariables(t.content, c, selectedStaff))} style={{ ...styles.card, padding: "16px", cursor: "pointer", border: `1px solid ${THEME.border}`, transition:"0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=THEME.border}>
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "4px" }}>{t.name}</div>
            <div style={{ fontSize: "12px", color: THEME.textMuted, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.content}</div>
          </div>))}
        </div>
      </div>
    </div></Page>);
}

// --- (7) テンプレート管理 ---
function TemplateManager({ templates = [], onRefresh }) {
  const [modal, setModal] = useState({ open: false, data: { id: "", name: "", content: "" } });
  
  // 🆕 プリセットテキストをプロ仕様に拡充
  const PRESET_CONTENT = 
    "{{姓}} {{名}} 様\n\n[ここにメッセージ本文を入力してください]\n\n" +
    "--------------------------\n" +
    "担当：{{担当者姓}}\n" +
    "電話：{{担当者電話}}\n" +
    "メール：{{担当者メール}}";

  return (<Page title="テンプレート管理" topButton={<button onClick={() => setModal({ open: true, data: { id: "", name: "", content: PRESET_CONTENT } })} style={{ ...styles.btn, ...styles.btnPrimary }}><Plus size={18}/> 新規追加</button>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>{templates.map(t => (<div key={t.id} style={styles.card}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><h3 style={{ margin: 0, fontSize: "16px" }}>{t.name}</h3><div style={{ display: "flex", gap: "8px" }}><button onClick={() => setModal({ open: true, data: t })} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={16}/></button><button onClick={async() => { if(window.confirm("削除？")){ await apiCall.post(GAS_URL, { action: "deleteTemplate", id: t.id }); onRefresh(); }}} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button></div></div><pre style={{ fontSize: "13px", color: THEME.textMuted, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: "12px", borderRadius: "8px", lineHeight: "1.6" }}>{t.content}</pre></div>))}</div>
    {modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
      <div style={{ ...styles.card, width: "600px" }}>
        <h3>テンプレートの編集</h3>
        <form onSubmit={async(e)=>{e.preventDefault(); await apiCall.post(GAS_URL,{action:"saveTemplate",...modal.data}); setModal({open:false}); onRefresh();}}>
          <label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 6, display: "block"}}>テンプレート名</label>
          <input style={{ ...styles.input, marginBottom: "16px" }} value={modal.data.name} onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})} placeholder="例：反響御礼" required />
          
          <label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 6, display: "block"}}>本文（[...] の部分を書き換えてください）</label>
          <textarea style={{ ...styles.input, height: "300px", resize: "none", marginBottom: "20px", lineHeight: "1.6" }} value={modal.data.content} onChange={e => setModal({...modal, data: {...modal.data, content: e.target.value}})} required />
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}>テンプレートを保存</button>
            <button type="button" onClick={() => setModal({ open: false })} style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>)}</Page>);
}

// --- (8) シナリオ一覧 ---
function ScenarioList({ scenarios = [], onRefresh }) {
  const g = (scenarios || []).reduce((acc, item) => { (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item); return acc; }, {});
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{...styles.btn, ...styles.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規作成</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
    {Object.entries(g).map(([id, steps]) => (
      <div key={id} style={{ ...styles.card, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "32px", flexGrow: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "8px 16px", borderRadius: "12px", fontWeight: "900", fontSize: "18px" }}>{id}</div>
            <button onClick={async()=>{if(window.confirm("削除？")){await apiCall.post(GAS_URL,{action:"deleteScenario",scenarioID:id});onRefresh();}}} style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none" }}><Trash2 size={18}/></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: THEME.textMuted, fontSize: "14px", marginBottom: "24px" }}><Clock size={16} /> {steps.length} ステップ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {steps.sort((a,b)=>a["ステップ数"]-b["ステップ数"]).slice(0,3).map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary }}></div>
                <span style={{ fontWeight: "800", minWidth: "40px" }}>{st["経過日数"]}日後</span>
                <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 24px 24px 24px" }}>
          <Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", textDecoration: "none", justifyContent: "space-between" }}>
            <span>配信ステップを編集</span><ChevronRight size={18} />
          </Link>
        </div>
      </div>
    ))}</div></Page>);
}

// --- (9) シナリオ編集 ---
function ScenarioForm({ scenarios = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const [name, setName] = useState("");
  const [st, setSt] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id); setName(dId);
      const ex = (scenarios || []).filter(item => item["シナリオID"] === dId).sort((a,b)=>a["ステップ数"]-b["ステップ数"]);
      if (ex.length) setSt(ex.map(item => ({ elapsedDays: item["経過日数"], deliveryHour: item["配信時間"], message: item["message"] })));
    }
  }, [id, scenarios]);

  return (<Page title={id ? "シナリオ編集" : "新規作成"} topButton={<button onClick={async()=>{setSaving(true); try{await apiCall.post(GAS_URL,{action:"saveScenario",scenarioID:name,steps:st}); onRefresh(); nav("/scenarios");}catch(e){alert(e.message)}finally{setSaving(false)}}} disabled={saving} style={{...styles.btn, ...styles.btnPrimary}}>{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 保存</button>}>
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        <div style={{ ...styles.card, marginBottom: "40px" }}>
          <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>シナリオID</label>
          <input style={{ ...styles.input, fontSize: "18px", fontWeight: "700" }} value={name} onChange={e=>setName(e.target.value)} disabled={!!id} placeholder="ID..." />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {st.map((item, idx) => (
            <div key={idx} style={{ ...styles.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: "900" }}>STEP {idx+1}</span>
                <button onClick={()=>setSt(st.filter((_, i)=>i !== idx))} style={{ color: "#94A3B8", background: "none", border: "none" }}><Trash2 size={20}/></button>
              </div>
              <div style={{ padding: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div><label style={{fontWeight:900, fontSize:12}}><Calendar size={14}/> 経過日数</label><div style={{position:"relative"}}><input style={{...styles.input, fontWeight:700}} type="number" value={item.elapsedDays} onChange={e=>{const n=[...st];n[idx].elapsedDays=e.target.value;setSt(n)}}/><span style={{position:"absolute", right:16, top:12, color:THEME.textMuted}}>日後</span></div></div>
                  <div><label style={{fontWeight:900, fontSize:12}}><Clock size={14}/> 配信時間</label><div style={{position:"relative"}}><input style={{...styles.input, fontWeight:700}} type="number" min="0" max="23" value={item.deliveryHour} onChange={e=>{const n=[...st];n[idx].deliveryHour=e.target.value;setSt(n)}}/><span style={{position:"absolute", right:16, top:12, color:THEME.textMuted}}>時</span></div></div>
                </div>
                <textarea style={{ ...styles.input, height: "140px", resize: "none" }} value={item.message} onChange={e=>{const n=[...st];n[idx].message=e.target.value;setSt(n)}} placeholder="メッセージ..." />
                <div style={{ textAlign: "right", marginTop: 10, fontSize: 12, fontWeight: 800, color: item.message.length > 70 ? THEME.danger : THEME.textMuted }}>{item.message.length}文字 {item.message.length > 70 && "(長文SMS)"}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>setSt([...st,{elapsedDays:1,deliveryHour:10,message:""}])} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", height: "64px", borderStyle: "dashed", marginTop: "40px" }}><Plus size={24}/> ステップ追加</button>
      </div>
    </Page>);
}

// --- (10) 表示設定 [ドラッグ＆ドロップ復元] ---
function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh }) {
  const nav = useNavigate(); const [items, setItems] = useState([]); const [drag, setDrag] = useState(null);
  useEffect(() => { 
    const base = ["姓", "名", "電話番号", "シナリオID", "登録日"]; 
    const all = [...base, ...(formSettings || []).map(f => f.name)]; 
    let init; if (displaySettings?.length > 0) {
      const ex = displaySettings.map(d => d.name);
      const mis = all.filter(p => !ex.includes(p)).map(n => ({ name: n, visible: true, searchable: true }));
      init = [...displaySettings, ...mis];
    } else { init = all.map(n => ({ name: n, visible: true, searchable: true })); }
    setItems(init);
  }, [displaySettings, formSettings]);

  const onDragOver = (e, i) => { e.preventDefault(); if (drag===null||drag===i) return; const n = [...items]; const d = n.splice(drag, 1)[0]; n.splice(i, 0, d); setDrag(i); setItems(n); };
  
  return (<Page title="表示項目の調整" topButton={<button onClick={() => nav("/")} style={styles.btnSecondary}>ダッシュボードへ戻る</button>}><div style={{ maxWidth: "700px" }}>
    <div style={{marginBottom:24, padding:16, backgroundColor:"#EEF2FF", borderRadius:12, fontSize:13, color:THEME.primary, fontWeight:600}}>ドラッグ＆ドロップで表示順を並び替え、チェックボックスで表示/非表示を切り替えられます。</div>
    {items.map((it, i) => (<div key={it.name} draggable onDragStart={()=>setDrag(i)} onDragOver={(e)=>onDragOver(e,i)} onDragEnd={()=>setDrag(null)} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", backgroundColor: "white", border: `1px solid ${drag === i ? THEME.primary : THEME.border}`, borderRadius: "12px", marginBottom: "8px", cursor: "grab" }}><GripVertical size={18} color={THEME.textMuted} /><div style={{ flex: 1, fontWeight: "600" }}>{it.name}</div><label style={{fontSize:12}}><input type="checkbox" checked={it.visible} onChange={()=>{const n=[...items];n[i].visible=!n[i].visible;setItems(n)}} /> 表示</label><label style={{fontSize:12, marginLeft:16}}><input type="checkbox" checked={it.searchable} onChange={()=>{const n=[...items];n[i].searchable=!n[i].searchable;setItems(n)}} /> 検索</label></div>))}
    <button onClick={async()=>{await apiCall.post(GAS_URL,{action:"saveDisplaySettings",settings:items}); alert("保存完了"); nav("/"); onRefresh(); }} style={{...styles.btn, ...styles.btnPrimary, width:"100%", marginTop:"32px"}}>設定を保存して反映</button>
  </div></Page>);
}

// --- (11) 項目定義 [仕様書 3.6 復旧・強化版] ---
function FormSettings({ formSettings = [], onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const nav = useNavigate();
  return (<Page title="登録項目の定義" topButton={<button onClick={() => nav("/add")} style={styles.btnSecondary}>登録画面へ戻る</button>}><div style={{ maxWidth: "850px" }}>
    <div style={{marginBottom:32, padding:20, backgroundColor:"#FFF7ED", borderRadius:12, border:`1px solid #FFEDD5`}}>
      <div style={{display:"flex", gap:12, color:"#C2410C", fontWeight:800, marginBottom:8}}><AlertCircle size={18}/> 重要な注意事項</div>
      <p style={{fontSize:13, color:"#9A3412", lineHeight:1.6}}>ここで項目を追加・同期すると、スプレッドシートの「顧客リスト」に新しい列が自動作成されます。既存項目の名前を変更するとデータの整合性が失われる可能性があるため、慎重に行ってください。</p>
    </div>
    {["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...styles.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px"}}>項目名</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px"}}>形式</label><div>テキスト (固定)</div></div></div>))}
    {items.map((x, i) => (<div key={i} style={{ ...styles.card, marginBottom: "12px", display: "flex", gap: "15px", alignItems: "center" }}><GripVertical size={20} color={THEME.border} /><div style={{flex:2}}><label style={{fontSize:11}}>項目名</label><input style={styles.input} value={x.name} onChange={e=>{const n=[...items];n[i].name=e.target.value;setItems(n)}} /></div><div style={{flex:1.5}}><label style={{fontSize:11}}>形式</label><select style={styles.input} value={x.type} onChange={e=>{const n=[...items];n[i].type=e.target.value;setItems(n)}}><option value="text">テキスト</option><option value="date">日付</option><option value="dropdown">選択肢</option></select></div><button onClick={()=>{const n=items.filter((_,idx)=>idx !== i);setItems(n)}} style={{color:THEME.danger, background:"none", border:"none", marginTop:16}}><Trash2 size={20}/></button></div>))}
    <button onClick={()=>setItems([...items,{name:"",type:"text",required:true}])} style={{...styles.btn, ...styles.btnSecondary, width:"100%", borderStyle:"dashed", marginTop:20}}>+ 新しい入力項目を追加</button>
    <button onClick={async()=>{await apiCall.post(GAS_URL,{action:"saveFormSettings",settings:items}); alert("スプレッドシートとの同期が完了しました"); onRefresh(); nav("/add"); }} style={{...styles.btn, ...styles.btnPrimary, width:"100%", marginTop:"40px"}}>項目定義を同期する</button>
  </div></Page>);
}

// --- (12) ユーザー管理 ---
function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); 
  const [modal, setModal] = useState({ open: false, mode: "add", data: { lastName: "", firstName: "", email: "", phone: "" } });
  const [loading, setLoading] = useState(true);
  
  const f = useCallback(async () => { 
    setLoading(true);
    try { 
      const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); 
      setUsers(res?.data?.users || []); 
    } catch(e) { console.error("データ取得エラー:", e); } 
    finally { setLoading(false); }
  }, [masterUrl]);
  
  useEffect(() => { f(); }, [f]);

  const sub = async (e) => {
    e.preventDefault();
    // 🆕 ゼロ落ち防止: 確実に文字列に変換してからシングルクォートを付加
    const targetPhone = String(modal.data.phone || "");
    const submissionData = {
      ...modal.data,
      phone: targetPhone.startsWith("'") ? targetPhone : "'" + targetPhone
    };
    
    try {
      await apiCall.post(masterUrl, { 
        action: modal.mode === "add" ? "addUser" : "editUser", 
        company: CLIENT_COMPANY_NAME, 
        ...submissionData 
      });
      setModal({ open: false });
      f();
    } catch(err) {
      alert("保存に失敗しました: " + err.message);
    }
  };

  return (<Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { lastName: "", firstName: "", email: "", phone: "" } })} style={{ ...styles.btn, ...styles.btnPrimary }}><Plus size={18} /> 新規登録</button>}>
    <div style={{ ...styles.card, padding: 0 }}>
      {loading ? (
        <div style={{padding: 40, textAlign: "center"}}><Loader2 className="animate-spin" size={32} color={THEME.primary} /></div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={styles.tableTh}>名前</th><th style={styles.tableTh}>メール</th><th style={styles.tableTh}>電話番号</th><th style={{...styles.tableTh, textAlign:"right"}}>操作</th></tr></thead>
          <tbody>
            {users && users.length > 0 ? (
              users.map((u, i) => (
                <tr key={i}>
                  <td style={styles.tableTd}>{u.lastName || ""} {u.firstName || ""}</td>
                  <td style={styles.tableTd}>{u.email || ""}</td>
                  {/* 🆕 ホワイトアウト対策: 確実に String() に変換してから replace を実行 */}
                  <td style={styles.tableTd}>{String(u.phone || "").replace(/^'/, "")}</td>
                  <td style={{...styles.tableTd, textAlign:"right"}}><button onClick={async()=>{if(window.confirm("このユーザーを削除しますか？")){await apiCall.post(masterUrl,{action:"deleteUser",company:CLIENT_COMPANY_NAME,email:u.email});f();}}} style={{background:"none", border:"none", color:THEME.danger, cursor:"pointer"}}><Trash2 size={16}/></button></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{...styles.tableTd, textAlign:"center", padding:40, color:THEME.textMuted, fontSize: "14px"}}>登録済みのユーザーはいません</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
    {modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
      <div style={{ ...styles.card, width: "500px" }}>
        <h3 style={{marginBottom: 20}}>担当者情報の登録</h3>
        <form onSubmit={sub}>
          <div style={{display:"flex", gap: 12, marginBottom: 15}}>
            <div style={{flex: 1}}><label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted}}>姓</label><input style={styles.input} value={modal.data.lastName} onChange={e=>setModal({...modal, data:{...modal.data, lastName:e.target.value}})} placeholder="宮野" required /></div>
            <div style={{flex: 1}}><label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted}}>名</label><input style={styles.input} value={modal.data.firstName} onChange={e=>setModal({...modal, data:{...modal.data, firstName:e.target.value}})} placeholder="太郎" required /></div>
          </div>
          <div style={{marginBottom: 15}}><label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted}}>Googleメールアドレス</label><input style={styles.input} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email:e.target.value}})} placeholder="example@gmail.com" required /></div>
          <div style={{marginBottom: 20}}><label style={{fontSize: 11, fontWeight: 800, color: THEME.textMuted}}>直通電話番号（0から入力）</label><input style={styles.input} value={modal.data.phone} onChange={e=>setModal({...modal, data:{...modal.data, phone:e.target.value}})} placeholder="09012345678" required /></div>
          <div style={{ display: "flex", gap: 10 }}><button type="submit" style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}>この内容で保存</button><button type="button" onClick={() => setModal({ open: false })} style={{ ...styles.btn, ...styles.btnSecondary, flex: 1 }}>キャンセル</button></div>
        </form>
      </div>
    </div>)}</Page>);
}

// --- (13) Appメイン [認証 & ルーティング] ---
function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [], templates: [] , gmailSettings: []});
  const [load, setLoad] = useState(true); const [user, setUser] = useState(() => { const sUser = localStorage.getItem("sf_user"); return sUser ? JSON.parse(sUser) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}`); setD(res?.data || {}); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><style>{globalStyle}</style><div style={{ ...styles.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)" }}><MessageSquare color="white" size={32} /></div><h1 style={{fontSize:28, fontWeight:900, marginBottom:10}}>StepFlow</h1><p style={{fontSize:14, color:THEME.textMuted, marginBottom:40}}>マーケティングSMS・配信管理 [V13.1]</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><style>{globalStyle}</style><Router><div style={{ display: "flex" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} /><Routes>
    <Route path="/" element={<CustomerList customers={d?.customers} displaySettings={d?.displaySettings} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/column-settings" element={<ColumnSettings displaySettings={d?.displaySettings} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d?.customers} scenarios={d?.scenarios} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/detail/:id" element={<CustomerDetail customers={d?.customers} />} />
    <Route path="/direct-sms/:id" element={<DirectSms customers={d?.customers} templates={d?.templates} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />
    <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} />} />
    <Route path="/gmail-settings" element={<GmailSettings gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}


/** 
 * (14)GmailSettings コンポーネント (V15 拡張案)
 * 役割: 受信メールのパースルールをUIから設定する
 */
function GmailSettings({ gmailSettings = [], scenarios = [], onRefresh }) {
  const [modal, setModal] = useState({ open: false, data: { to: "", from: "", subject: "", nameKey: "氏名：", phoneKey: "電話番号：", scenarioID: "" } });
  const [testBody, setTestBody] = useState("");
  const [parsePreview, setParsePreview] = useState(null);

  // 抽出テスト実行
  const testParse = () => {
    if (!testBody) return alert("テスト用の本文を入力してください");
    // ユーザーが指定したキーに基づいて正規表現を作成
    const nameRegex = new RegExp(modal.data.nameKey + "\\s*(.+)");
    const phoneRegex = new RegExp(modal.data.phoneKey + "\\s*([\\d-]+)");
    const nameMatch = testBody.match(nameRegex);
    const phoneMatch = testBody.match(phoneRegex);
    setParsePreview({
      name: nameMatch ? nameMatch[1].trim() : "抽出失敗",
      phone: phoneMatch ? phoneMatch[1].trim() : "抽出失敗"
    });
  };

  return (<Page title="Gmail自動取り込み設定" subtitle="通知メールの形式に合わせて抽出ルールを定義します">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
      {gmailSettings.map((s, i) => (
        <div key={i} style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ ...styles.badge, backgroundColor: THEME.primary, color: "white" }}>設定 {i + 1}</span>
            <button onClick={async () => { if(window.confirm("この設定を削除しますか？")){ await apiCall.post(GAS_URL, { action: "deleteGmailSetting", id: i }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={18}/></button>
          </div>
          <div style={{ fontSize: "14px", display: "grid", gap: "8px" }}>
            <div style={{display:"flex", justifyContent:"space-between"}}><span style={{color:THEME.textMuted}}>送信元(from):</span><span style={{fontWeight:700}}>{s.from}</span></div>
            <div style={{display:"flex", justifyContent:"space-between"}}><span style={{color:THEME.textMuted}}>件名キーワード:</span><span style={{fontWeight:700}}>{s.subject}</span></div>
            <div style={{ marginTop: "12px", padding: "12px", background: "#F8FAFC", borderRadius: "10px", border: `1px solid ${THEME.border}` }}>
              <div style={{fontSize:11, fontWeight:800, color:THEME.primary, marginBottom:8}}>抽出キーワード</div>
              <div>氏名： <strong>{s.nameKey}</strong> の後ろ</div>
              <div>電話： <strong>{s.phoneKey}</strong> の後ろ</div>
            </div>
            <div style={{marginTop:8, textAlign:"right"}}><span style={styles.badge}>適用：シナリオ {s.scenarioID}</span></div>
          </div>
        </div>
      ))}
      <button onClick={() => setModal({ ...modal, open: true })} style={{ ...styles.card, border: `2px dashed ${THEME.border}`, minHeight: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", cursor: "pointer", color: THEME.textMuted, transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=THEME.border}>
        <Plus size={40} /> <span style={{fontWeight:800}}>新しいルールを追加</span>
      </button>
    </div>

    {modal.open && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
        <div style={{ ...styles.card, width: "900px", display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px", padding: "32px" }}>
          <div>
            <h3 style={{marginTop: 0, marginBottom: 24}}>取り込みルールの作成</h3>
            <div style={{display:"grid", gap:16}}>
              <div><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>送信元アドレス (from)</label><input style={styles.input} value={modal.data.from} onChange={e => setModal({...modal, data: {...modal.data, from: e.target.value}})} placeholder="info@assessment-site.com" /></div>
              <div><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>件名のキーワード (この文字を含むメールを対象にする)</label><input style={styles.input} value={modal.data.subject} onChange={e => setModal({...modal, data: {...modal.data, subject: e.target.value}})} placeholder="反響通知" /></div>
              
              <div style={{display: "flex", gap: 16, marginTop: 8}}>
                <div style={{flex: 1}}><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>氏名の前の文字</label><input style={styles.input} value={modal.data.nameKey} onChange={e => setModal({...modal, data: {...modal.data, nameKey: e.target.value}})} /></div>
                <div style={{flex: 1}}><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>電話の前の文字</label><input style={styles.input} value={modal.data.phoneKey} onChange={e => setModal({...modal, data: {...modal.data, phoneKey: e.target.value}})} /></div>
              </div>

              <div><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>自動適用するシナリオ</label>
                <select style={styles.input} value={modal.data.scenarioID} onChange={e => setModal({...modal, data: {...modal.data, scenarioID: e.target.value}})}>
                  <option value="">選択してください</option>
                  {[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{display:"flex", gap:12, marginTop:32}}>
              <button onClick={async() => { 
  if(!modal.data.from || !modal.data.scenarioID) return alert("送信元とシナリオは必須です"); 
  try {
    await apiCall.post(GAS_URL, { action: "saveGmailSetting", ...modal.data }); 
    setModal({open: false}); 
    onRefresh(); 
    alert("設定をスプレッドシートに保存しました");
  } catch(e) {
    alert("保存に失敗しました。GAS側の更新を確認してください。");
  }
}} style={{ ...styles.btn, ...styles.btnPrimary, flex:1 }}>設定を保存する</button>
              <button onClick={() => setModal({open: false})} style={{ ...styles.btn, ...styles.btnSecondary, width: "120px" }}>キャンセル</button>
            </div>
          </div>

          <div style={{ borderLeft: `1px solid ${THEME.border}`, paddingLeft: "32px", backgroundColor: "#F8FAFC", margin: "-32px", padding: "32px" }}>
            <h4 style={{marginTop: 0, display:"flex", alignItems: "center", gap:8}}><AlertCircle size={18} color={THEME.primary}/> 抽出テスト</h4>
            <p style={{fontSize: 12, color: THEME.textMuted, marginBottom: 16}}>実際のメール本文を貼り付けて、正しく抽出できるか確認してください。</p>
            <textarea style={{ ...styles.input, height: "180px", resize: "none", fontSize: "12px" }} value={testBody} onChange={e => setTestBody(e.target.value)} placeholder="氏名：宮野 太郎&#13;&#10;電話番号：090-1234-5678" />
            <button onClick={testParse} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", marginTop: "12px", backgroundColor: "white" }}>テスト実行</button>
            
            {parsePreview && (
              <div style={{ marginTop: "24px", padding: "16px", background: "white", borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
                <div style={{fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 12, borderBottom: `1px solid ${THEME.bg}`, paddingBottom: 4}}>テスト結果</div>
                <div style={{fontSize: 13, marginBottom: 8}}>氏名: <span style={{fontWeight: 700, color: parsePreview.name === "抽出失敗" ? THEME.danger : THEME.textMain}}>{parsePreview.name}</span></div>
                <div style={{fontSize: 13}}>電話: <span style={{fontWeight: 700, color: parsePreview.phone === "抽出失敗" ? THEME.danger : THEME.textMain}}>{parsePreview.phone}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </Page>);
}

export default App;