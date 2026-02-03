/**
 * StepFlow Pro React Frontend (V12 Final Supreme Edition)
 * 準拠: 究極要件仕様書 V12 (Absolute Master Edition)
 * 【修正済】項目追加調整機能の復元、日付レンジ検索の統合、レイアウト崩れの物理修正
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, GripVertical, ListFilter, Edit3, Lock, Save, Search, Clock, ArrowUpDown, ArrowUp, ArrowDown, Download, Upload, FileSpreadsheet, Eye, Send, Copy, Calendar, AlertCircle, ChevronRight
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
  primary: "#4F46E5", 
  bg: "#F8FAFC", 
  card: "#FFFFFF", 
  textMain: "#1E293B", 
  textMuted: "#64748B", 
  border: "#E2E8F0", 
  success: "#10B981", 
  danger: "#EF4444", 
  locked: "#F1F5F9", 
  sidebar: "#0F172A"
};

// レイアウト崩れ（ボタン突き出し）を物理的に防ぐためのグローバルスタイル
const globalStyle = `
  * { box-sizing: border-box !important; }
  body { margin: 0; font-family: 'Inter', sans-serif; background-color: ${THEME.bg}; }
`;

const s = {
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

const api = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

const replaceVariables = (text, customer) => {
  if (!text) return "";
  let res = text;
  Object.keys(customer).forEach(key => { res = res.replaceAll(`{{${key}}}`, customer[key] || ""); });
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
    <div style={{ ...s.card, padding: "16px", background: "#F1F5F9", border: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <Calendar size={18} color={THEME.primary} />
        <input type="datetime-local" style={{ ...s.input, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setQuick(60)} style={{ ...s.btn, ...s.btnSecondary, padding: "6px 12px", fontSize: "11px" }}>+1時間</button>
        <button type="button" onClick={() => setQuick(1440)} style={{ ...s.btn, ...s.btnSecondary, padding: "6px 12px", fontSize: "11px" }}>明日</button>
      </div>
    </div>
  );
}

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

// 🆕 日付レンジ検索パーツ [仕様書 3.1]
function DateRangePicker({ label, value = {}, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="date" style={{ ...s.input, width: "140px" }} value={value.start || ""} onChange={e => onChange({ ...value, start: e.target.value })} />
        <span style={{ color: THEME.textMuted }}>〜</span>
        <input type="date" style={{ ...s.input, width: "140px" }} value={value.end || ""} onChange={e => onChange({ ...value, end: e.target.value })} />
      </div>
    </div>
  );
}

// ==========================================
// 📺 4. 各画面コンポーネント (全13個)
// ==========================================

// --- (1) 顧客ダッシュボード [日付レンジ検索実装] ---
function CustomerList({ customers = [], displaySettings = [], formSettings = [], onRefresh }) {
  const navigate = useNavigate(); const [search, setSearch] = useState({}); const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const visibleCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(s => s.visible).map(s => s.name) : ["姓", "名", "電話番号", "シナリオID", "登録日"], [displaySettings]);
  const searchableCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(s => s.searchable).map(s => s.name) : ["姓", "電話番号", "登録日"], [displaySettings]);
  
  const filtered = useMemo(() => {
    let res = [...(customers || [])].filter(c => Object.keys(search).every(k => {
      const q = search[k]; if (!q) return true;
      if (formSettings.find(x => x.name === k)?.type === "date" || k === "登録日") {
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

  return (<Page title="顧客ダッシュボード" topButton={<div style={{ display: "flex", gap: "12px" }}><button onClick={() => downloadCSV([visibleCols, ...filtered.map(c => visibleCols.map(col => c[col]))], "export.csv")} style={{ ...s.btn, ...s.btnSecondary }}><Download size={18} /> CSV出力</button><button onClick={() => navigate("/column-settings")} style={{ ...s.btn, ...s.btnSecondary }}><ListFilter size={18} /> 表示設定</button></div>}>
    <div style={{ ...s.card, padding: "24px", marginBottom: "32px", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-end", backgroundColor: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: THEME.textMuted, marginRight: "4px" }}><Search size={20} /></div>
      {searchableCols.map(col => {
        const isDate = formSettings.find(x => x.name === col)?.type === "date" || col === "登録日";
        return isDate ? (
          <DateRangePicker key={col} label={col} value={search[col] || {}} onChange={val => setSearch({ ...search, [col]: val })} />
        ) : (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
            <input placeholder={`${col}で検索...`} style={{ ...s.input, width: "160px" }} value={search[col] || ""} onChange={e => setSearch({...search, [col]: e.target.value})} />
          </div>
        );
      })}
      <button onClick={() => setSearch({})} style={{ ...s.btn, background: "none", color: THEME.primary, fontWeight: "800" }}>リセット</button>
    </div>
    <div style={{ ...s.card, padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{visibleCols.map(c => <th key={c} style={{ ...s.tableTh, cursor: "pointer" }} onClick={() => setSort({ key: c, dir: (sort.key === c && sort.dir === 'asc') ? 'desc' : 'asc' })}>{c} {sort.key === c ? (sort.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} opacity={0.3}/>}</th>)}<th style={s.tableTh}>操作</th></tr></thead>
      <tbody>{filtered.map(c => (<tr key={c.id} style={{ transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
        {visibleCols.map(col => <td key={col} style={s.tableTd}>{col === "シナリオID" ? <span style={s.badge}>{c[col]}</span> : formatDate(c[col])}</td>)}
        <td style={s.tableTd}><div style={{ display: "flex", gap: "12px" }}>
          <Link to={`/direct-sms/${c.id}`} style={{ ...s.badge, textDecoration: "none", backgroundColor: THEME.primary, color: "white" }}><MessageSquare size={12}/> SMS</Link>
          <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "800" }}>履歴</Link>
          <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Edit3 size={16}/></Link>
          <button onClick={async () => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
        </div></td></tr>))}</tbody></table></div></Page>);
}

// --- (2) 顧客詳細 ---
function CustomerDetail({ customers = [], formSettings = [] }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id));
  if (!customers.length || !c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin" /></Page>;
  const fields = [{ label: "姓", value: c["姓"] }, { label: "名", value: c["名"] }, { label: "電話番号", value: c["電話番号"] }, { label: "シナリオID", value: c["シナリオID"], isBadge: true }, { label: "登録日", value: formatDate(c["登録日"]) }, { label: "ステータス", value: c["配信ステータス"] }, ...formSettings.map(f => ({ label: f.name, value: f.type === "date" ? formatDate(c[f.name]) : (c[f.name] || "-") }))];
  return (<Page title="顧客詳細情報" subtitle="登録データの確認"><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link><div style={{ ...s.card, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "32px", padding: "40px" }}>{fields.map((f, i) => (<div key={i} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}><label style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "800", display: "block", marginBottom: "4px" }}>{f.label}</label><div style={{ fontWeight: "600", fontSize: "16px" }}>{f.isBadge ? <span style={s.badge}>{f.value}</span> : f.value}</div></div>))}</div></Page>);
}

// --- (3) 新規顧客登録 (CSV/テンプレート) ---
function CustomerForm({ formSettings = [], scenarios = [], onRefresh }) {
  const navigate = useNavigate(); const [lastName, setLastName] = useState(""); const [firstName, setFirstName] = useState(""); const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({}); const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if(scenarios?.length > 0) setScenarioID(scenarios[0]["シナリオID"]); }, [scenarios]);
  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rows = ev.target.result.split("\n").map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
      const customers = rows.slice(1).filter(r => r.length > 2).map(row => {
        const obj = { lastName: row[0], firstName: row[1], phone: smartNormalizePhone(row[2]), scenarioID: row[3], data: {} };
        rows[0].slice(4).forEach((h, i) => { if(h) obj.data[h] = row[i+4]; }); return obj;
      });
      try { await api.post(GAS_URL, { action: "bulkAdd", customers }); alert("登録完了"); onRefresh(); navigate("/"); } catch (err) { alert(err.message); }
    }; reader.readAsText(file);
  };
  const handleDownloadTemplate = () => {
    const headers = ["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)];
    downloadCSV([headers], "customer_import_template.csv");
  };
  return (<Page title="新規顧客登録" topButton={<div style={{ display: "flex", gap: "10px" }}>
    <button onClick={handleDownloadTemplate} style={{ ...s.btn, ...s.btnSecondary }}><FileSpreadsheet size={18} /> 雛形</button>
    <button onClick={() => { const f = document.createElement("input"); f.type="file"; f.accept=".csv"; f.onchange=(e)=>handleFileUpload(e); f.click(); }} style={{ ...s.btn, ...s.btnPrimary }}><Upload size={18} /> CSV登録</button>
  </div>}><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); try { await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); navigate("/"); } catch(err) { alert(err.message); } }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓 *</label><input style={s.input} required onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名 *</label><input style={s.input} required onChange={e => setFirstName(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号 *</label><input style={{...s.input, marginBottom:"20px"}} required value={phone} onChange={e => setPhone(e.target.value)} placeholder="090..." />{formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={v => setFormData({...formData, [f.name]: v})} /></div>)}
    <label style={{fontWeight:"700"}}>シナリオ</label><select style={{...s.input, marginBottom:"32px"}} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}</select><button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>確定</button></form></div></Page>);
}

// --- (4) 顧客編集 ---
function CustomerEdit({ customers = [], scenarios = [], formSettings = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  const [fd, setFd] = useState({}); const [sc, setSc] = useState("");
  useEffect(() => { if (c) { setLn(c["姓"] || ""); setFn(c["名"] || ""); setPh(c["電話番号"] || ""); setFd(c); setSc(c["シナリオID"]); } }, [c]);
  if(!c) return <Page title="読込中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="顧客情報の編集"><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName:ln, firstName:fn, phone:ph, data: fd, status: c["配信ステータス"], scenarioID: sc }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={s.input} value={ln} onChange={e=>setLn(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={s.input} value={fn} onChange={e=>setFn(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号</label><input style={s.input} value={ph} onChange={e=>setPh(e.target.value)} />{formSettings.map(f => <div key={f.name} style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v=>setFd({...fd,[f.name]:v})} /></div>)}
    <label style={{display:"block", marginTop:"20px", fontWeight:"700"}}>シナリオ</label><select style={s.input} value={sc} onChange={e=>setSc(e.target.value)}>{[...new Set(scenarios?.map(x=>x["シナリオID"]))].map(id=><option key={id} value={id}>{id}</option>)}</select><button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "32px", padding: "14px" }}>保存</button></form></div></Page>);
}

// --- (5) 配信状況/ログ ---
function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id)); const [edit, setEdit] = useState(null);
  if (!customers.length || !c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin"/></Page>;
  const cPhone = smartNormalizePhone(c["電話番号"]);
  const scenarioLogs = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cPhone && l["ステップ名"] !== "個別SMS");
  const directLogs = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cPhone && l["ステップ名"] === "個別SMS");
  return (<Page title="配信状況" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← 戻る</Link>
    <div style={{marginBottom:"40px"}}><h3 style={{fontSize:"18px", marginBottom:"16px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>ステップ配信</h3>
      <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>{scenarioLogs.map((l, i) => (<div key={i} style={{ ...s.card, padding: "16px", borderLeft: `6px solid ${l["ステータス"] === "配信済み" ? THEME.success : THEME.primary}` }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{l["ステータス"]}</span><span style={{fontWeight:"800", marginLeft:"12px"}}>{formatDate(l["配信予定日時"])}</span><span style={{marginLeft:"12px", color:THEME.textMuted, fontSize:"12px"}}>{l["ステップ名"]}</span></div>{l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"10px", fontSize:"14px"}}>{l["内容"]}</div></div>))}</div></div>
    {edit && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "500px", padding: "32px" }}><h3>予定の調整</h3><SmartDateTimePicker value={edit.t} onChange={t=>setEdit({...edit, t})} /><textarea style={{...s.input, height:"150px", marginTop:"15px", resize:"none"}} value={edit.m} onChange={e=>setEdit({...edit, m:e.target.value})} /><div style={{display:"flex", gap:"12px", marginTop:"24px"}}><button onClick={async()=>{ await api.post(GAS_URL,{action:"updateDeliveryTime",logId:edit.id,newTime:edit.t, newMessage:edit.m}); onRefresh(); setEdit(null); }} style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button onClick={()=>setEdit(null)} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

// --- (6) 個別SMS送信 ---
function DirectSms({ customers = [], templates = [], onRefresh }) {
  const { id } = useParams(); const navigate = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [msg, setMsg] = useState(""); const [time, setTime] = useState(new Date(new Date().getTime() + 10 * 60000).toISOString().slice(0, 16));
  if (!customers.length || !c) return <Page title="読込中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="個別SMS送信" subtitle={`${c["姓"]} ${c["名"]} 様へ`}><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}><div><label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>予定日時</label><SmartDateTimePicker value={time} onChange={setTime} /><textarea style={{ ...s.input, height: "300px", resize: "none", marginTop: "24px" }} value={msg} onChange={e => setMsg(e.target.value)} placeholder="本文..." /><button onClick={async()=>{ await api.post(GAS_URL,{action:"sendDirectSms",phone:c["電話番号"],customerName:`${c["姓"]} ${c["名"]}`,scheduledTime:time,message:msg}); alert("予約完了"); navigate("/"); }} style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "24px" }}>確定</button></div>
        <div><h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>テンプレート</h3><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{templates.map(t => (<div key={t.id} onClick={() => setMsg(replaceVariables(t.content, c))} style={{ ...s.card, padding: "16px", cursor: "pointer", border: `1px solid ${THEME.border}`, transition:"0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=THEME.border}><div style={{ fontWeight: "700", fontSize: "14px" }}>{t.name}</div><div style={{ fontSize: "12px", color: THEME.textMuted, marginTop:"4px" }}>{t.content.slice(0, 50)}...</div></div>))}</div></div></div></Page>);
}

// --- (7) テンプレート管理 ---
function TemplateManager({ templates = [], onRefresh }) {
  const [modal, setModal] = useState({ open: false, data: { id: "", name: "", content: "" } });
  return (<Page title="テンプレート管理" topButton={<button onClick={() => setModal({ open: true, data: { id: "", name: "", content: "{{姓}} {{名}} 様\n" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18}/> 新規追加</button>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>{templates.map(t => (<div key={t.id} style={s.card}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><h3 style={{ margin: 0, fontSize: "16px" }}>{t.name}</h3><div style={{ display: "flex", gap: "8px" }}><button onClick={() => setModal({ open: true, data: t })} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={16}/></button><button onClick={async() => { if(window.confirm("削除？")){ await api.post(GAS_URL, { action: "deleteTemplate", id: t.id }); onRefresh(); }}} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button></div></div><pre style={{ fontSize: "13px", color: THEME.textMuted, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: "12px", borderRadius: "8px" }}>{t.content}</pre></div>))}</div>
    {modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "600px" }}><h3>編集</h3><form onSubmit={async(e)=>{e.preventDefault(); await api.post(GAS_URL,{action:"saveTemplate",...modal.data}); setModal({open:false}); onRefresh();}}><input style={{ ...s.input, marginBottom: "16px" }} value={modal.data.name} onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})} required /><textarea style={{ ...s.input, height: "200px", resize: "none", marginBottom: "20px" }} value={modal.data.content} onChange={e => setModal({...modal, data: {...modal.data, content: e.target.value}})} required /><div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ ...s.btn, ...s.btnPrimary, flex: 1 }}>保存</button><button type="button" onClick={() => setModal({ open: false })} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>閉じる</button></div></form></div></div>)}</Page>);
}

// --- (8) シナリオ一覧 ---
function ScenarioList({ scenarios = [], onRefresh }) {
  const grouped = scenarios.reduce((acc, s_item) => { (acc[s_item["シナリオID"]] = acc[s_item["シナリオID"]] || []).push(s_item); return acc; }, {});
  return (<Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{...s.btn, ...s.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規作成</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
    {Object.entries(grouped).map(([id, steps]) => (
      <div key={id} style={{ ...s.card, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "32px", flexGrow: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "8px 16px", borderRadius: "12px", fontWeight: "900", fontSize: "18px" }}>{id}</div>
            <button onClick={async()=>{if(window.confirm("削除？")){await api.post(GAS_URL,{action:"deleteScenario",scenarioID:id});onRefresh();}}} style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}><Trash2 size={18}/></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: THEME.textMuted, fontSize: "14px", fontWeight: "600", marginBottom: "24px" }}><Clock size={16} /> {steps.length} ステップ</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {steps.sort((a,b)=>a["ステップ数"]-b["ステップ数"]).map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: THEME.textMain }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary }}></div>
                <span style={{ fontWeight: "800", minWidth: "40px" }}>{st["経過日数"]}日後</span>
                <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 24px 24px 24px", boxSizing: "border-box" }}>
          <Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ ...s.btn, ...s.btnSecondary, width: "100%", textDecoration: "none", justifyContent: "space-between", padding: "14px 20px" }}>
            <span>編集する</span><ChevronRight size={18} />
          </Link>
        </div>
      </div>
    ))}</div></Page>);
}

// --- (9) シナリオ編集 (突き出し/崩れ修正版) ---
function ScenarioForm({ scenarios = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const [name, setName] = useState("");
  const [st, setSt] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id);
      setName(dId);
      const ex = scenarios.filter(s_item => s_item["シナリオID"] === dId).sort((a,b)=>a["ステップ数"]-b["ステップ数"]);
      if (ex.length) setSt(ex.map(s_item => ({ elapsedDays: s_item["経過日数"], deliveryHour: s_item["配信時間"], message: s_item["message"] })));
    }
  }, [id, scenarios]);

  const handleSave = async () => {
    if (!name.trim()) return alert("名前を入力！");
    setSaving(true);
    try {
      await api.post(GAS_URL, { action: "saveScenario", scenarioID: name, steps: st });
      alert("完了"); onRefresh(); nav("/scenarios");
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <Page title={id ? "編集" : "作成"} topButton={<button onClick={handleSave} disabled={saving} style={{...s.btn, ...s.btnPrimary}}>
      {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} 保存</button>}
    >
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        <div style={{ ...s.card, marginBottom: "40px" }}>
          <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>シナリオ名</label>
          <input style={{ ...s.input, fontSize: "18px", fontWeight: "700" }} value={name} onChange={e=>setName(e.target.value)} disabled={!!id} placeholder="ID..." />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {st.map((s_item, i) => (
            <div key={i} style={{ ...s.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: "900" }}>STEP {i+1}</span>
                <button onClick={()=>setSt(st.filter((_,idx)=>idx !== i))} style={{ color: "#94A3B8", background: "none", border: "none" }}><Trash2 size={20}/></button>
              </div>
              <div style={{ padding: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div><label style={{fontWeight:900, fontSize:12}}><Calendar size={14}/> 経過日数</label><div style={{position:"relative"}}><input style={{...s.input, fontWeight:700}} type="number" value={s_item.elapsedDays} onChange={e=>{const n=[...st];n[i].elapsedDays=e.target.value;setSt(n)}}/><span style={{position:"absolute", right:16, top:12, color:THEME.textMuted}}>日後</span></div></div>
                  <div><label style={{fontWeight:900, fontSize:12}}><Clock size={14}/> 配信時間</label><div style={{position:"relative"}}><input style={{...s.input, fontWeight:700}} type="number" min="0" max="23" value={s_item.deliveryHour} onChange={e=>{const n=[...st];n[i].deliveryHour=e.target.value;setSt(n)}}/><span style={{position:"absolute", right:16, top:12, color:THEME.textMuted}}>時</span></div></div>
                </div>
                <textarea style={{ ...s.input, height: "140px", resize: "none" }} value={s_item.message} onChange={e=>{const n=[...st];n[i].message=e.target.value;setSt(n)}} />
                <div style={{ textAlign: "right", marginTop: 10, fontSize: 12, fontWeight: 800, color: s_item.message.length > 70 ? THEME.danger : THEME.textMuted }}>{s_item.message.length}文字 {s_item.message.length > 70 && "(長文料金)"}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>setSt([...st,{elapsedDays:1,deliveryHour:10,message:""}])} style={{ ...s.btn, ...s.btnSecondary, width: "100%", height: "64px", borderStyle: "dashed", marginTop: "40px" }}><Plus size={24}/> ステップ追加</button>
      </div>
    </Page>);
}

// --- (10) 表示項目調整 ---
function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh }) {
  const nav = useNavigate(); const [items, setItems] = useState([]); const [drag, setDrag] = useState(null);
  useEffect(() => { const base = ["姓", "名", "電話番号", "シナリオID", "登録日"]; const allP = [...base, ...formSettings.map(f => f.name)]; let init; if (displaySettings?.length > 0) { const ex = displaySettings.map(d => d.name); const mis = allP.filter(p => !ex.includes(p)).map(n => ({ name: n, visible: true, searchable: true })); init = [...displaySettings, ...mis]; } else { init = allP.map(n => ({ name: n, visible: true, searchable: true })); } setItems(init); }, [displaySettings, formSettings]);
  const onDragOver = (e, i) => { e.preventDefault(); if (drag===null||drag===i) return; const n = [...items]; const d = n.splice(drag, 1)[0]; n.splice(i, 0, d); setDrag(i); setItems(n); };
  return (<Page title="表示項目の調整"><div style={{ maxWidth: "700px" }}>{items.map((it, i) => (<div key={it.name} draggable onDragStart={()=>setDrag(i)} onDragOver={(e)=>onDragOver(e,i)} onDragEnd={()=>setDrag(null)} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", backgroundColor: "white", border: `1px solid ${drag === i ? THEME.primary : THEME.border}`, borderRadius: "12px", marginBottom: "8px", cursor: "grab" }}><GripVertical size={18} color={THEME.textMuted} /><div style={{ flex: 1, fontWeight: "600" }}>{it.name}</div><input type="checkbox" checked={it.visible} onChange={()=>{const n=[...items];n[i].visible=!n[i].visible;setItems(n)}} />表示 <input type="checkbox" checked={it.searchable} style={{marginLeft:"20px"}} onChange={()=>{const n=[...items];n[i].searchable=!n[i].searchable;setItems(n)}} />検索 </div>))}<button onClick={async()=>{await api.post(GAS_URL,{action:"saveDisplaySettings",settings:items}); alert("完了"); nav("/"); onRefresh(); }} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"24px"}}>保存</button></div></Page>);
}

// ==========================================
// 🚀 11. 【復旧版】項目調整機能 (FormSettings) [仕様書 3.6]
// ==========================================
function FormSettings({ formSettings = [], onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const nav = useNavigate();
  return (<Page title="カスタム項目の調整" subtitle="顧客登録フォームに表示する項目を定義します"><div style={{ maxWidth: "850px" }}>{["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px"}}>項目名</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px"}}>形式</label><div>テキスト (固定)</div></div></div>))}{items.map((x, i) => (<div key={i} style={{ ...s.card, marginBottom: "12px", display: "flex", gap: "15px", alignItems: "center" }}><GripVertical size={20} color={THEME.border} /><div style={{flex:2}}><label style={{fontSize:11}}>項目名</label><input style={s.input} value={x.name} onChange={e=>{const n=[...items];n[i].name=e.target.value;setItems(n)}} /></div><div style={{flex:1.5}}><label style={{fontSize:11}}>形式</label><select style={s.input} value={x.type} onChange={e=>{const n=[...items];n[i].type=e.target.value;setItems(n)}}><option value="text">テキスト</option><option value="date">日付</option><option value="dropdown">プルダウン</option></select></div><button onClick={()=>{const n=items.filter((_,idx)=>idx !== i);setItems(n)}} style={{color:THEME.danger, background:"none", border:"none", marginTop:16}}><Trash2 size={20}/></button></div>))}<button onClick={()=>setItems([...items,{name:"",type:"text",required:true}])} style={{...s.btn, ...s.btnSecondary, width:"100%", borderStyle:"dashed", marginTop:20}}>+ 新しい項目を追加</button><button onClick={async()=>{await api.post(GAS_URL,{action:"saveFormSettings",settings:items}); alert("同期完了"); onRefresh(); nav("/add"); }} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"32px"}}>設定をスプレッドシートと同期 [仕様書 3.3]</button></div></Page>);
}

// --- (12) ユーザー管理 ---
function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "" } });
  const fetch = useCallback(async () => { try{ const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res?.data?.users || []); }catch(e){console.error(e)} }, [masterUrl]);
  useEffect(() => { fetch(); }, [fetch]);
  const sub = async (e) => { e.preventDefault(); await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetch(); };
  return (<Page title="権限ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18} /> 追加</button>}><div style={{ ...s.card, padding: 0 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th><th style={{...s.tableTh, textAlign:"right"}}>操作</th></tr></thead><tbody>{users.map((u, i) => (<tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td><td style={{...s.tableTd, textAlign:"right"}}><div style={{display:"flex", gap:"10px", justifyContent:"flex-end"}}><button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{background:"none", border:"none", color:THEME.primary, cursor:"pointer"}}>編集</button><button onClick={async()=>{if(window.confirm("削除？")){await api.post(masterUrl,{action:"deleteUser",company:CLIENT_COMPANY_NAME,email:u.email});fetch();}}} style={{background:"none", border:"none", color:THEME.danger, cursor:"pointer"}}><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>{modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "400px" }}><h3>編集</h3><form onSubmit={sub}><input style={{...s.input, marginBottom:"15px"}} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} placeholder="名前" required /><input style={{...s.input, marginBottom:"15px"}} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} placeholder="メール" required /><div style={{ display: "flex", gap: "10px" }}><button type="submit" style={{ ...s.btn, ...s.btnPrimary, flex: 1 }}>保存</button><button type="button" onClick={() => setModal({ open: false })} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>閉じる</button></div></form></div></div>)}</Page>);
}

// --- (13) Appメイン ---
function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [], templates: [] });
  const [load, setLoad] = useState(true); const [user, setUser] = useState(() => { const saved = localStorage.getItem("sf_user"); return saved ? JSON.parse(saved) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}`); setD(res.data); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><style>{globalStyle}</style><div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px" }}><MessageSquare color="white" size={32} /></div><h1>StepFlow</h1><p style={{marginBottom:40}}>SMS配信・管理 [V12 Ultimate]</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><style>{globalStyle}</style><Router><div style={{ display: "flex" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} /><Routes>
    <Route path="/" element={<CustomerList customers={d.customers} displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/column-settings" element={<ColumnSettings displaySettings={d.displaySettings} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} deliveryLogs={d.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} formSettings={d.formSettings} />} />
    <Route path="/direct-sms/:id" element={<DirectSms customers={d.customers} templates={d.templates} onRefresh={refresh} />} />
    <Route path="/templates" element={<TemplateManager templates={d.templates} onRefresh={refresh} />} />
    <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}

export default App;