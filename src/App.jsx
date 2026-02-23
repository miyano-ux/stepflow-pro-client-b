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
  UserCheck, Mail, Columns, ListTodo, UserCircle,
  ChevronLeft, Check, X ,Activity, Zap,BarChart3
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import TrackingDashboard from "./pages/TrackingDashboard";
import AnalysisReport from "./pages/AnalysisReport.js";

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
  badge: { padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", backgroundColor: "#EEF2FF", color: THEME.primary },
  label: { display: "block", fontSize: "12px", fontWeight: "800", color: THEME.textMuted, marginBottom: "8px" },
  inputGroup: { display: "flex", flexDirection: "column" }
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
  // 🆕 メニューを統合・整理
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={18} /> },
    { n: "案件カンバン", p: "/kanban", i: <Columns size={18} /> },
    { n: "反響取り込み", p: "/response-import", i: <Mail size={18} /> }, // Gmail設定とエラーを統合
    { n: "新規顧客登録", p: "/add", i: <UserPlus size={18} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={18} /> },
    { n: "テンプレート管理", p: "/templates", i: <Copy size={18} /> },
    { n: "ユーザー管理", p: "/users", i: <Users size={18} /> },
    { n: "トラッキング実況", p: "/tracking", i: <Activity size={18} /> }
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


// --- (1) 顧客ダッシュボード [V23.0 検索グリッド整理 & 操作列右固定版] ---
function CustomerList({ customers = [], displaySettings = [], formSettings = [], scenarios = [], statuses = [], masterUrl, onRefresh }) {
  const navigate = useNavigate(); 
  const [search, setSearch] = useState({}); 
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [staffList, setStaffList] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
  const [localCustomers, setLocalCustomers] = useState(customers);

  useEffect(() => { setLocalCustomers(customers); }, [customers]);
  useEffect(() => {
    const fetchStaff = async () => {
      if (!masterUrl) return;
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`);
        setStaffList(res?.data?.users || []);
      } catch(e) { console.error(e); }
    };
    fetchStaff();
  }, [masterUrl]);

  const vCols = useMemo(() => {
    let cols = displaySettings?.length > 0 ? displaySettings.filter(i => i.visible).map(i => i.name) : ["姓", "名", "対応ステータス", "担当者メール", "電話番号", "シナリオID", "日付", "登録日"];
    if (!cols.includes("対応ステータス")) cols.splice(2, 0, "対応ステータス");
    if (!cols.includes("担当者メール")) cols.splice(3, 0, "担当者メール");
    return cols;
  }, [displaySettings]);

  const sCols = useMemo(() => {
    const defaultSearch = ["姓", "シナリオID", "日付", "登録日"];
    return displaySettings?.length > 0 ? displaySettings.filter(i => i.searchable).map(i => i.name) : defaultSearch;
  }, [displaySettings]);
  
  const filtered = useMemo(() => {
    let res = [...(localCustomers || [])].filter(c => Object.keys(search).every(k => {
      const q = search[k]; if (!q || q === "") return true;
      if (formSettings?.find(x => x.name === k)?.type === "date" || k === "登録日" || k === "日付") {
        if (!q.start && !q.end) return true;
        if (!c[k] || c[k] === "-" || c[k] === "") return false;
        const targetTime = new Date(c[k]).getTime();
        if (q.start && targetTime < parseLocalDate(q.start)) return false;
        if (q.end && targetTime > parseLocalDate(q.end, true)) return false;
        return true;
      }
      return String(c[k] || "").toLowerCase().includes(String(q).toLowerCase());
    }));
    if (sort.key) {
      res.sort((a, b) => {
        const aV = a[sort.key] || "", bV = b[sort.key] || "";
        return sort.dir === 'asc' ? String(aV).localeCompare(String(bV), 'ja') : String(bV).localeCompare(String(aV), 'ja');
      });
    }
    return res;
  }, [localCustomers, search, formSettings, sort]);

  const handleExecuteChange = async () => {
    const { customer, field, newValue } = confirmModal;
    const optimisticData = localCustomers.map(c => c.id === customer.id ? { ...c, [field]: newValue } : c);
    setLocalCustomers(optimisticData);
    setConfirmModal({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
    try {
      const updatedData = { ...customer, [field]: newValue };
      await apiCall.post(GAS_URL, { 
        action: "update", id: customer.id, lastName: customer["姓"], firstName: customer["名"], 
        phone: customer["電話番号"], scenarioID: customer["シナリオID"], status: customer["配信ステータス"], data: updatedData 
      });
      onRefresh();
    } catch (e) { alert("更新に失敗しました"); onRefresh(); }
  };

  return (<Page title="顧客ダッシュボード" subtitle={`全 ${filtered.length} 名のリストを表示中`} topButton={
    <div style={{ display: "flex", gap: "12px" }}>
      <button onClick={() => downloadCSV([vCols, ...filtered.map(c => vCols.map(col => c[col]))], "customers.csv")} style={{ ...styles.btn, ...styles.btnSecondary, height: 40 }}><Download size={16} /> CSV出力</button>
      <button onClick={() => navigate("/column-settings")} style={{ ...styles.btn, ...styles.btnPrimary, height: 40 }}><SlidersHorizontal size={16} /> 表示設定</button>
    </div>
  }>
    {/* 🆕 4カラム固定の安定した検索パネル */}
    <div style={{ ...styles.card, padding: "28px", marginBottom: "32px", backgroundColor: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", alignItems: "flex-end" }}>
        {sCols.map(col => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
            {formSettings?.find(x => x.name === col)?.type === "date" || col === "登録日" || col === "日付" ? (
              <DateRangePicker value={search[col] || {}} onChange={v => setSearch({ ...search, [col]: v })} />
            ) : col === "シナリオID" ? (
              <select style={{ ...styles.input, height: 42, width: "100%" }} value={search[col] || ""} onChange={e => setSearch({...search, [col]: e.target.value})}>
                <option value="">すべて表示</option>
                {[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}
              </select>
            ) : (
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: 14, color: "#94A3B8" }} />
                <input placeholder={`${col}で検索...`} style={{ ...styles.input, paddingLeft: 38, height: 42, width: "100%" }} value={search[col] || ""} onChange={e => setSearch({...search, [col]: e.target.value})} />
              </div>
            )}
          </div>
        ))}
        {/* リセットボタンを常に最後のグリッドに配置するか、空いたスペースに配置 */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button onClick={() => setSearch({})} style={{ background: "none", border: "none", color: THEME.primary, fontWeight: "900", fontSize: "14px", cursor: "pointer", padding: "10px 0" }}>
            条件をクリア
          </button>
        </div>
      </div>
    </div>
    
    {/* 🆕 右側固定（操作列）対応テーブル */}
    <div style={{ ...styles.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}`, position: "relative" }}>
      <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 420px)" }} className="custom-scrollbar">
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "auto" }}>
          <thead>
            <tr>
              {vCols.map(c => (
                <th key={c} 
                  onClick={() => setSort({ key: c, dir: (sort.key === c && sort.dir === 'asc') ? 'desc' : 'asc' })}
                  style={{ 
                    ...styles.tableTh, 
                    position: "sticky", top: 0, zIndex: 10, backgroundColor: "#F8FAFC", 
                    cursor: "pointer", whiteSpace: "nowrap", minWidth: 140,
                    borderBottom: `1px solid ${THEME.border}`
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {c} {sort.key === c ? (sort.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} opacity={0.2}/>}
                  </div>
                </th>
              ))}
              {/* 🆕 操作列のヘッダーも固定 */}
              <th style={{ 
                ...styles.tableTh, 
                position: "sticky", top: 0, right: 0, zIndex: 20, 
                backgroundColor: "#F8FAFC", borderLeft: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`,
                width: 160, textAlign: "center", fontWeight: "900"
              }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id} style={{ backgroundColor: "white" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}>
                {vCols.map(col => {
                  if (col === "対応ステータス") return (
                    <td key={col} style={styles.tableTd}>
                      <select style={{ background: "#EEF2FF", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800, color: THEME.primary, cursor: "pointer", outline: "none" }}
                        value={c[col] || "未対応"} onChange={e => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] || "未対応" })}>
                        {statuses.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                      </select>
                    </td>
                  );
                  if (col === "担当者メール") return (
                    <td key={col} style={styles.tableTd}>
                      <select style={{ background: "#F1F5F9", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: THEME.textMain, cursor: "pointer", outline: "none" }}
                        value={c[col] || ""} onChange={e => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] || "未設定" })}>
                        <option value="">未割当</option>
                        {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
                      </select>
                    </td>
                  );
                  return (
                    <td key={col} style={{ ...styles.tableTd, whiteSpace: "nowrap" }}>
                      {col === "シナリオID" ? <span style={{ ...styles.badge, backgroundColor: "#EEF2FF", color: THEME.primary }}>{c[col]}</span> : (col === "登録日" || col === "日付" ? formatDate(c[col]) : c[col])}
                    </td>
                  );
                })}
                {/* 🆕 操作列のセルを固定（Sticky Right） */}
                <td style={{ 
                  ...styles.tableTd, 
                  position: "sticky", right: 0, zIndex: 5, 
                  backgroundColor: "inherit", borderLeft: `1px solid ${THEME.border}`,
                  textAlign: "center", padding: "12px"
                }}>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <Link to={`/direct-sms/${c.id}`} title="SMS送信" style={{ ...styles.btn, padding: "8px", backgroundColor: THEME.primary, color: "white", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={14}/></Link>
                    <Link to={`/schedule/${c.id}`} title="配信状況" style={{ ...styles.btn, padding: "8px", backgroundColor: "white", color: THEME.primary, border: `1px solid ${THEME.primary}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={14}/></Link>
                    <button onClick={async () => { if(window.confirm("顧客情報を削除しますか？")) { await apiCall.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ ...styles.btn, padding: "8px", backgroundColor: "transparent", color: THEME.danger, borderRadius: "10px" }}><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    
    {/* 確認モーダルは既存のまま維持 */}
    {confirmModal.open && (
      /* モーダルコード（前回の優れたデザインを継承） */
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
        <div style={{ ...styles.card, width: "400px", textAlign: "center", padding: "40px", borderRadius: 24, border: "none" }}>
          <div style={{ backgroundColor: "#EEF2FF", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><AlertCircle size={32} color={THEME.primary} /></div>
          <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>変更を確認</h3>
          <p style={{ fontSize: "14px", color: THEME.textMuted, marginBottom: 32 }}>{confirmModal.customer?.["姓"]}様の「{confirmModal.field === "担当者メール" ? "担当者" : "対応ステータス"}」を更新しますか？</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={handleExecuteChange} style={{ ...styles.btn, ...styles.btnPrimary, height: 48, fontSize: 15 }}>変更を実行する</button>
            <button onClick={() => setConfirmModal({ open: false, customer: null, field: "", newValue: "", oldValue: "" })} style={{ ...styles.btn, ...styles.btnSecondary, height: 48, border: "none" }}>キャンセル</button>
          </div>
        </div>
      </div>
    )}
  </Page>);
}

// --- (2) 顧客詳細 ---
function CustomerDetail({ customers = [] }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id));
  if (!c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin" /></Page>;
  return (<Page title="顧客詳細"><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link><div style={styles.card}><pre>{JSON.stringify(c, null, 2)}</pre></div></Page>);
}

// --- (3) 顧客登録 [テンプレートDL・項目設定ボタン統合] ---
// --- (3) 顧客登録 [営業進捗・担当紐付け版] ---
function CustomerForm({ formSettings = [], scenarios = [], statuses = [], masterUrl, onRefresh }) {
  const navigate = useNavigate(); const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  // 🆕 ステータスと担当者の初期値をfdにセット
  const [fd, setFd] = useState({ "対応ステータス": "未対応", "担当者メール": "" }); 
  const [sc, setSc] = useState("");
  const [staffList, setStaffList] = useState([]);

  useEffect(() => { 
    if(scenarios?.length > 0) setSc(scenarios[0]["シナリオID"]); 
    // 🆕 担当者（スタッフ）一覧を取得
    const fetchStaff = async () => {
      try { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setStaffList(res?.data?.users || []); } catch(e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [scenarios, masterUrl]);
  
  const handleUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rows = ev.target.result.split("\n").map(r => r.split(",").map(c => c.replace(/^"|"$/g, "").trim()));
      const items = rows.slice(1).filter(r => r.length > 2).map(row => {
        const obj = { lastName: row[0], firstName: row[1], phone: smartNormalizePhone(row[2]), scenarioID: row[3], data: { "対応ステータス": "未対応" } };
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
      
      {/* 🆕 営業管理セクション（担当者・ステータス） */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20, padding:20, background:"#F8FAFC", borderRadius:12, border:`1px solid ${THEME.border}`}}>
        <div><label style={{fontWeight:700, fontSize:12, color:THEME.primary}}>担当者</label><select style={styles.input} value={fd["担当者メール"]} onChange={e=>setFd({...fd, "担当者メール":e.target.value})}><option value="">未割当</option>{staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}</select></div>
        <div><label style={{fontWeight:700, fontSize:12, color:THEME.primary}}>対応ステータス</label><select style={styles.input} value={fd["対応ステータス"]} onChange={e=>setFd({...fd, "対応ステータス":e.target.value})}>{statuses.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}</select></div>
      </div>

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
// --- (4) 顧客編集 [営業進捗・担当紐付け版] ---
function CustomerEdit({ customers = [], scenarios = [], formSettings = [], statuses = [], masterUrl, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  const [fd, setFd] = useState({}); const [sc, setSc] = useState("");
  const [staffList, setStaffList] = useState([]);

  useEffect(() => { 
    if (c) { 
      setLn(c["姓"] || ""); 
      setFn(c["名"] || ""); 
      setPh(c["電話番号"] || ""); 
      // 既存データをセット。対応ステータスや担当者が未設定の場合のフォールバック
      setFd({ 
        ...c, 
        "対応ステータス": c["対応ステータス"] || "未対応",
        "担当者メール": c["担当者メール"] || ""
      }); 
      setSc(c["シナリオID"]); 
    }
    const fetchStaff = async () => {
      try { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setStaffList(res?.data?.users || []); } catch(e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [c, masterUrl]);

  if(!c) return <Page title="読込中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="顧客情報の編集"><div style={{ ...styles.card, maxWidth: "700px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await apiCall.post(GAS_URL, { action: "update", id, lastName:ln, firstName:fn, phone:ph, data: fd, status: c["配信ステータス"], scenarioID: sc }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={styles.input} value={ln} onChange={e=>setLn(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={styles.input} value={fn} onChange={e=>setFn(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号</label><input style={styles.input} value={ph} onChange={e=>setPh(e.target.value)} />
    
    {/* 🆕 営業管理セクション（担当者・ステータス） */}
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:20, padding:20, background:"#F8FAFC", borderRadius:12, border:`1px solid ${THEME.border}`}}>
      <div><label style={{fontWeight:700, fontSize:12, color:THEME.primary}}>担当者</label><select style={styles.input} value={fd["担当者メール"] || ""} onChange={e=>setFd({...fd, "担当者メール":e.target.value})}><option value="">未割当</option>{staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}</select></div>
      <div><label style={{fontWeight:700, fontSize:12, color:THEME.primary}}>対応ステータス</label><select style={styles.input} value={fd["対応ステータス"] || "未対応"} onChange={e=>setFd({...fd, "対応ステータス":e.target.value})}>{statuses.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}</select></div>
    </div>

    {formSettings.map(f => <div key={f.name} style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v=>setFd({...fd,[f.name]:v})} /></div>)}
    <label style={{display:"block", marginTop:"20px", fontWeight:"700"}}>シナリオ</label><select style={styles.input} value={sc} onChange={e=>setSc(e.target.value)}>{[...new Set(scenarios?.map(x=>x["シナリオID"]))].map(id=><option key={id} value={id}>{id}</option>)}</select>
    <button type="submit" style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "32px", padding: "16px" }}>変更を保存</button></form></div></Page>);
}

// --- (5) 配信状況/履歴 [編集モーダル完全復旧版] ---
function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const c = customers?.find(x => x.id === Number(id)); 
  const [edit, setEdit] = useState(null); // モーダル開閉と編集データを管理

  if (!customers.length || !c) return <Page title="読込中..."><Loader2 size={24} className="animate-spin"/></Page>;
  
  const cP = smartNormalizePhone(c["電話番号"]);
  const allLogs = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cP);
  
  // シナリオ配信の親ログ
  const scenarioParentLogs = allLogs.filter(l => !l["親ログID"] && l["ステップ名"] !== "個別SMS").sort((a, b) => new Date(a["配信予定日時"]) - new Date(b["配信予定日時"]));
  // 独立した個別SMSログ
  const pureIndividualLogs = allLogs.filter(l => !l["親ログID"] && l["ステップ名"] === "個別SMS").sort((a, b) => new Date(b["配信予定日時"]) - new Date(a["配信予定日時"]));

  const handleResend = (messageContent, logId, stepName) => {
    navigate(`/direct-sms/${id}`, { state: { prefilledMessage: messageContent, parentId: logId, parentStepName: stepName } });
  };

  // ログ1件を表示するカード部品
  const LogCard = ({ l, isNested = false }) => (
    <div style={{ 
      ...styles.card, padding: "16px", 
      marginLeft: isNested ? "40px" : "0", 
      marginTop: isNested ? "8px" : "16px",
      borderLeft: `6px solid ${l["ステータス"] === "配信済み" ? THEME.success : (l["ステータス"] === "エラー" ? THEME.danger : THEME.primary)}`,
      backgroundColor: isNested ? "#F8FAFC" : "white",
      position: "relative",
      boxShadow: isNested ? "none" : styles.card.boxShadow
    }}>
      {isNested && <div style={{ position: "absolute", left: "-24px", top: "-20px", width: "24px", height: "46px", borderLeft: "2px solid #CBD5E1", borderBottom: "2px solid #CBD5E1", borderRadius: "0 0 0 8px" }} />}
      
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <span style={{...styles.badge, backgroundColor: l["ステータス"] === "エラー" ? "#FEE2E2" : (l["ステータス"] === "配信済み" ? "#D1FAE5" : "#EEF2FF"), color: l["ステータス"] === "エラー" ? THEME.danger : (l["ステータス"] === "配信済み" ? THEME.success : THEME.primary)}}>
            {l["ステータス"]}
          </span>
          <span style={{fontWeight:"800", marginLeft:"12px", fontSize: "13px"}}>
            {l["完了日時"] ? `完了: ${formatDate(l["完了日時"])}` : `予定: ${formatDate(l["配信予定日時"])}`}
          </span>
          <span style={{marginLeft:"12px", color:THEME.textMuted, fontSize:"11px"}}>{l["ステップ名"]}</span>
        </div>
        <div>
          {l["ステータス"] === "エラー" && <button onClick={() => handleResend(l["内容"], l["ログID"], l["ステップ名"])} style={{...styles.badge, backgroundColor: THEME.danger, color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 12px"}}><Send size={10}/> 再送する</button>}
          {/* 🆕 編集ボタン：クリック時に edit ステートに値をセットし、モーダルを起動させる */}
          {l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:"800", padding: "4px 8px"}}>編集</button>}
        </div>
      </div>
      <div style={{marginTop:"8px", fontSize:"14px", color: THEME.textMain, whiteSpace: "pre-wrap", lineHeight: "1.5"}}>{l["内容"]}</div>
    </div>
  );

  return (
    <Page title="配信状況・履歴" subtitle={`${c["姓"]} ${c["名"]} 様`}>
      <Link to="/" style={{display:"inline-flex", alignItems:"center", gap: 8, marginBottom:"24px", color: THEME.primary, textDecoration:"none", fontWeight:"700", fontSize: "14px"}}>← 戻る</Link>
      
      <div style={{maxWidth: "850px"}}>
        <h3 style={{fontSize:"18px", marginBottom:"20px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>シナリオ配信タイムライン</h3>
        {scenarioParentLogs.map((pl) => (
          <div key={pl["ログID"]} style={{marginBottom: "24px"}}>
            <LogCard l={pl} />
            {allLogs.filter(cl => String(cl["親ログID"]) === String(pl["ログID"])).map(cl => (
              <LogCard key={cl["ログID"]} l={cl} isNested={true} />
            ))}
          </div>
        ))}

        <h3 style={{fontSize:"18px", marginTop: "48px", marginBottom: "20px", borderLeft:`4px solid ${THEME.textMuted}`, paddingLeft:"12px", color: THEME.textMuted}}>個別メッセージ履歴</h3>
        <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
          {pureIndividualLogs.map((il) => (
            <LogCard key={il["ログID"]} l={il} />
          ))}
          {pureIndividualLogs.length === 0 && <div style={{padding: "20px", color: THEME.textMuted, fontSize: "14px", textAlign: "center"}}>個別メッセージの履歴はありません</div>}
        </div>
      </div>

      {/* 🆕 編集モーダル：editステートがある場合のみ表示される（ここが欠落していた箇所です） */}
      {edit && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
          <div style={{ ...styles.card, width: "550px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{marginBottom: "24px", fontSize: "20px", fontWeight: "900"}}>配信予定の変更</h3>
            
            <label style={{fontSize: "12px", fontWeight: "800", color: THEME.textMuted, display: "block", marginBottom: "8px"}}>新しい配信予定日時</label>
            <SmartDateTimePicker value={edit.t} onChange={t=>setEdit({...edit, t})} />
            
            <label style={{fontSize: "12px", fontWeight: "800", color: THEME.textMuted, display: "block", marginTop: "24px", marginBottom: "8px"}}>メッセージ本文の編集</label>
            <textarea 
              style={{...styles.input, height:"180px", resize:"none", lineHeight: "1.6", fontSize: "14px"}} 
              value={edit.m} 
              onChange={e=>setEdit({...edit, m:e.target.value})} 
            />
            
            <div style={{display:"flex", gap:"12px", marginTop:"32px"}}>
              <button 
                onClick={async()=>{ 
                  try {
                    await apiCall.post(GAS_URL, { action: "updateDeliveryTime", logId: edit.id, newTime: edit.t, newMessage: edit.m }); 
                    alert("配信予定を更新しました");
                    onRefresh(); 
                    setEdit(null); 
                  } catch(e) { alert("更新に失敗しました: " + e.message); }
                }} 
                style={{...styles.btn, ...styles.btnPrimary, flex:1, height: "48px"}}
              >
                変更を確定して保存
              </button>
              <button 
                onClick={()=>setEdit(null)} 
                style={{...styles.btn, ...styles.btnSecondary, flex:1, height: "48px"}}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// --- (6) 個別SMS送信 [parentId 連携強化版] ---
function DirectSms({ customers = [], templates = [], onRefresh, masterUrl, currentUserEmail }) {
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const location = useLocation();
  const c = customers?.find(x => x.id === Number(id));
  
  const [msg, setMsg] = useState(location.state?.prefilledMessage || ""); 
  const [isConverting, setIsConverting] = useState(false); // 🆕 変換中ステート
  const parentId = location.state?.parentId || ""; 
  const parentStepName = location.state?.parentStepName || "個別SMS";

  const [time, setTime] = useState(new Date(new Date().getTime() + 10 * 60000).toISOString().slice(0, 16));
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // 🆕 URL検出用
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasUrl = urlRegex.test(msg);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`);
        const list = res?.data?.users || [];
        setStaffList(list);
        const myProfile = list.find(s => String(s.email).toLowerCase() === String(currentUserEmail).toLowerCase());
        if (myProfile) { setSelectedStaff(myProfile); } else if (list.length > 0) { setSelectedStaff(list[0]); }
      } catch(e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl, currentUserEmail]);

  // 🆕 トラッキングURL変換ロジック
  const handleConvertToTracking = async () => {
    const urls = msg.match(urlRegex);
    if (!urls) return;

    setIsConverting(true);
    let updatedMsg = msg;

    try {
      for (const url of urls) {
        // すでにトラッキング済みのURL（api/t/を含むもの）はスキップ
        if (url.includes('/api/t/')) continue;

        const res = await axios.post('/api/t/create', {
          originalUrl: url,
          customerId: c.id,
          customerName: `${c["姓"]} ${c["名"]}`
        });

        if (res.data.trackingUrl) {
          updatedMsg = updatedMsg.replace(url, res.data.trackingUrl);
        }
      }
      setMsg(updatedMsg);
    } catch (e) {
      console.error(e);
      alert("トラッキングURLへの変換に失敗しました。Vercelの環境変数BASE_URLが正しく設定されているか確認してください。");
    } finally {
      setIsConverting(false);
    }
  };

  if (!c) return <Page title="読込中..."><Loader2 className="animate-spin"/></Page>;

  return (<Page title="個別メッセージ送信" subtitle={`${c["姓"]} ${c["名"]} 様`}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}>
      <div>
        <div style={{...styles.card, marginBottom: 24, backgroundColor: "#EEF2FF", border: "none", padding: "20px"}}>
          <label style={{ fontWeight: "800", fontSize: 11, color: THEME.primary, display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><UserCheck size={16}/> 送信担当者</label>
          <select style={styles.input} value={selectedStaff?.email || ""} onChange={e => setSelectedStaff(staffList.find(s => s.email === e.target.value))}>
            {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
          </select>
        </div>

        <div style={{ position: "relative" }}>
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px" }}>配信内容</label>
          
          {/* 🆕 トラッキング変換ボタン：URLが含まれる場合のみ表示 */}
          {hasUrl && (
            <button 
              onClick={handleConvertToTracking}
              disabled={isConverting}
              style={{ 
                position: "absolute", right: 0, top: -5,
                ...styles.btn, backgroundColor: "white", color: THEME.primary, 
                border: `1px solid ${THEME.primary}`, padding: "4px 12px", height: "30px", fontSize: "12px"
              }}
            >
              {isConverting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              URLをトラッキング化
            </button>
          )}

          <SmartDateTimePicker value={time} onChange={setTime} />
          <textarea 
            style={{ ...styles.input, height: "300px", resize: "none", marginTop: "24px" }} 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            placeholder="メッセージを入力してください。URLを入力して上のボタンを押すとクリック計測が可能になります。"
          />
        </div>

        <button onClick={async()=>{ 
          if(!msg) return alert("本文を入力してください"); 
          await apiCall.post(GAS_URL, { 
            action:"sendDirectSms", 
            phone:c["電話番号"], 
            customerName:`${c["姓"]} ${c["名"]}`, 
            scheduledTime:time, 
            message:msg, 
            parentId: parentId,
            stepName: parentStepName 
          }); 
          alert("配信予約完了"); navigate("/"); onRefresh(); 
        }} style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "24px", height: "54px" }}>配信予約を確定する</button>
      </div>

      <div>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "800" }}>テンプレート</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => setMsg(replaceVariables(t.content, c, selectedStaff))} style={{ ...styles.card, padding: "16px", cursor: "pointer" }}>
              {t.name}
            </div>
          ))}
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
/**
 *  UserManager コンポーネント (V23.0 設計刷新版)
 * 役割: ユーザー一覧の表示と削除管理。登録・編集は別画面へ遷移。
 */
function UserManager({ masterUrl }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}&_t=${Date.now()}`);
      setUsers(res.data.users || []);
    } catch (e) {
      console.error("データ取得エラー", e);
    } finally {
      setLoading(false);
    }
  }, [masterUrl]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm("このユーザーを完全に削除しますか？この操作は取り消せません。")) return;
    try {
      // 🆕 削除失敗解消の鍵: MASTERプロキシへの認証として company を含める
      const payload = { 
        action: "delete", 
        id: String(id), 
        company: CLIENT_COMPANY_NAME 
      };
      
      const res = await axios.post(masterUrl, 
        JSON.stringify(payload), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );

      if (res.data.status === "success") {
        fetchUsers();
      } else {
        alert("削除に失敗しました: " + (res.data.message || "Action not handled"));
      }
    } catch (e) {
      alert("マスターサーバーとの通信に失敗しました");
    }
  };

  return (
    <Page title="ユーザー管理" topButton={
      <button onClick={() => navigate("/users/add")} style={{ ...styles.btn, ...styles.btnPrimary, height: 44, padding: "0 24px" }}>
        <UserPlus size={18} /> 新規ユーザーを登録
      </button>
    }>
      <div style={{ ...styles.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ backgroundColor: "#F8FAFC" }}>
              <th style={{ ...styles.tableTh, borderBottom: `1px solid ${THEME.border}` }}>氏名</th>
              <th style={{ ...styles.tableTh, borderBottom: `1px solid ${THEME.border}` }}>メールアドレス</th>
              <th style={{ ...styles.tableTh, borderBottom: `1px solid ${THEME.border}` }}>電話番号</th>
              <th style={{ ...styles.tableTh, borderBottom: `1px solid ${THEME.border}`, textAlign: "center", width: "140px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: 40, textAlign: "center" }}><Loader2 className="animate-spin" color={THEME.primary} /></td></tr>
            ) : users.length > 0 ? users.map((u, idx) => (
              <tr key={u.id} style={{ backgroundColor: idx % 2 === 0 ? "white" : "#FCFDFF" }}>
                <td style={{ ...styles.tableTd, fontWeight: "700" }}>{u.lastName} {u.firstName}</td>
                <td style={styles.tableTd}>{u.email}</td>
                <td style={styles.tableTd}>{String(u.phone || "-").replace(/'/g, "")}</td>
                <td style={{ ...styles.tableTd, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                    <button onClick={() => navigate(`/users/edit/${u.id}`, { state: { user: u } })} title="編集" style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer" }}>
                      <Edit3 size={18}/>
                    </button>
                    <button onClick={() => handleDelete(u.id)} title="削除" style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}>
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="4" style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>登録済みのスタッフはいません。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

// --- (13) Appメイン [認証 & ルーティング] ---
function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [], templates: [] , gmailSettings: [], importErrors: [], statuses: []});
  const [load, setLoad] = useState(true); const [user, setUser] = useState(() => { const sUser = localStorage.getItem("sf_user"); return sUser ? JSON.parse(sUser) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}`); setD(res?.data || {}); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><style>{globalStyle}</style><div style={{ ...styles.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)" }}><MessageSquare color="white" size={32} /></div><h1 style={{fontSize:28, fontWeight:900, marginBottom:10}}>StepFlow</h1><p style={{fontSize:14, color:THEME.textMuted, marginBottom:40}}>マーケティングSMS・配信管理 [V19.1]</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><style>{globalStyle}</style><Router><div style={{ display: "flex" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} /><Routes>
    <Route path="/" element={<CustomerList customers={d?.customers} displaySettings={d?.displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} onRefresh={refresh} />} />
    <Route path="/kanban" element={<KanbanBoard customers={d?.customers} statuses={d?.statuses} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} />} /> 
    <Route path="/status-settings" element={<StatusSettings statuses={d?.statuses} onRefresh={refresh} />} />
    <Route path="/column-settings" element={<ColumnSettings displaySettings={d?.displaySettings} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} onRefresh={refresh} />} />
    <Route path="/edit/:id" element={<CustomerEdit customers={d?.customers} scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} onRefresh={refresh} />} />
    <Route path="/schedule/:id" element={<CustomerSchedule customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
    <Route path="/detail/:id" element={<CustomerDetail customers={d?.customers} />} />
    <Route path="/direct-sms/:id" element={<DirectSms customers={d?.customers} templates={d?.templates} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />
    <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} />} />
    <Route path="/analysis" element={<AnalysisReport customers={d?.customers} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} />} />
    {/* 🆕 統合された反響取り込みポータル */}
    <Route path="/response-import" element={<ResponseImportPortal />} />
    <Route path="/gmail-settings" element={<GmailSettings gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/import-errors" element={<ImportErrorList errors={d?.importErrors} onRefresh={refresh} />} />
    
    <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} onRefresh={refresh} />} />
    <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} />} />
    <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
    <Route path="/users/add" element={<UserForm masterUrl={MASTER_WHITELIST_API} />} />
    <Route path="/users/edit/:id" element={<UserForm masterUrl={MASTER_WHITELIST_API} />} />
    <Route path="/tracking" element={<TrackingDashboard />} />
  </Routes></div></Router></GoogleOAuthProvider>);
}

/**
 * (14) GmailSettings コンポーネント (V16.1 項目動的抽出版)
 * 役割: フォーム設定(formSettings)と同期し、任意のカスタム項目の抽出ルールを定義する
 */
function GmailSettings({ gmailSettings = [], scenarios = [], formSettings = [], onRefresh }) {
  const [modal, setModal] = useState({ 
    open: false, 
    mode: "add", 
    id: null, 
    data: { from: "", subject: "", nameKey: "氏名：", phoneKey: "電話番号：", scenarioID: "", customKeys: {} } 
  });
  const [testBody, setTestBody] = useState("");
  const [parsePreview, setParsePreview] = useState(null);

  // 編集モード：カスタム項目のマッピングを含めてプリセット
  const handleEdit = (s, index) => {
    let ck = {};
    try {
      // GAS側でJSON文字列として保存されているカスタム項目の設定をパース
      ck = s["カスタム項目キー"] ? JSON.parse(s["カスタム項目キー"]) : {};
    } catch(e) { ck = {}; }

    setModal({
      open: true,
      mode: "edit",
      id: index,
      data: {
        from: s["送信元"] || "",
        subject: s["件名"] || "",
        nameKey: s["氏名キー"] || "氏名：",
        phoneKey: s["電話キー"] || "電話番号：",
        scenarioID: s["シナリオID"] || "",
        customKeys: ck // 🆕 カスタム項目の抽出設定
      }
    });
    setParsePreview(null);
  };

  // 抽出テスト実行（カスタム項目にも対応）
  const testParse = () => {
    if (!testBody) return alert("テスト用の本文を入力してください");
    try {
      const res = {
        name: (testBody.match(new RegExp(modal.data.nameKey + "\\s*(.+)")) || [])[1]?.trim() || "失敗",
        phone: (testBody.match(new RegExp(modal.data.phoneKey + "\\s*([\\d-]+)")) || [])[1]?.trim() || "失敗",
        customs: {}
      };
      // カスタム項目の抽出テスト
      Object.keys(modal.data.customKeys).forEach(key => {
        const k = modal.data.customKeys[key];
        if (k) {
          const m = testBody.match(new RegExp(k + "\\s*(.+)"));
          res.customs[key] = m ? m[1].trim() : "失敗";
        }
      });
      setParsePreview(res);
    } catch (e) {
      alert("抽出キーの形式が正しくありません");
    }
  };

  return (<Page title="Gmail自動取り込み設定" subtitle="フォーム設定の項目に合わせ、抽出ルールを定義できます">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
      {gmailSettings.map((s, i) => (
        <div key={i} style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ ...styles.badge, backgroundColor: THEME.primary, color: "white" }}>設定 {i + 1}</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => handleEdit(s, i)} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={18}/></button>
              <button onClick={async () => { if(window.confirm("削除しますか？")){ await apiCall.post(GAS_URL, { action: "deleteGmailSetting", id: i }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={18}/></button>
            </div>
          </div>
          <div style={{ fontSize: "14px", display: "grid", gap: "8px" }}>
            <div style={{display:"flex", justifyContent:"space-between"}}><span style={{color:THEME.textMuted}}>送信元:</span><span style={{fontWeight:700}}>{s["送信元"]}</span></div>
            <div style={{display:"flex", justifyContent:"space-between"}}><span style={{color:THEME.textMuted}}>件名キーワード:</span><span style={{fontWeight:700}}>{s["件名"]}</span></div>
            <div style={{ marginTop: "12px", padding: "12px", background: "#F8FAFC", borderRadius: "10px", border: `1px solid ${THEME.border}` }}>
              <div style={{fontSize:11, fontWeight:800, color:THEME.primary, marginBottom:8}}>主要項目</div>
              <div style={{fontSize:12}}>氏名: {s["氏名キー"]} | 電話: {s["電話キー"]}</div>
              
              {/* 🆕 カスタム項目の設定状況を表示 */}
              {s["カスタム項目キー"] && Object.keys(JSON.parse(s["カスタム項目キー"])).length > 0 && (
                <>
                  <div style={{fontSize:11, fontWeight:800, color:THEME.primary, marginTop:8, marginBottom:4}}>追加項目</div>
                  {Object.entries(JSON.parse(s["カスタム項目キー"])).map(([k, v]) => (
                    <div key={k} style={{fontSize:12}}>{k}: <span style={{color: THEME.textMuted}}>{v}</span></div>
                  ))}
                </>
              )}
            </div>
            <div style={{marginTop:8, textAlign:"right"}}><span style={{ ...styles.badge, backgroundColor: "#F1F5F9", color: THEME.primary }}>シナリオ: {s["シナリオID"]}</span></div>
          </div>
        </div>
      ))}
      <button onClick={() => setModal({ open: true, mode: "add", id: null, data: { from: "", subject: "", nameKey: "氏名：", phoneKey: "電話番号：", scenarioID: "", customKeys: {} } })} style={{ ...styles.card, border: `2px dashed ${THEME.border}`, minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", cursor: "pointer", color: THEME.textMuted, transition: "0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=THEME.border}>
        <Plus size={40} /> <span style={{fontWeight:800}}>新しいルールを追加</span>
      </button>
    </div>

    {modal.open && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
        <div style={{ ...styles.card, width: "950px", display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px", padding: "32px", maxHeight: "90vh", overflowY: "auto" }}>
          <div>
            <h3 style={{marginTop: 0, marginBottom: 24}}>{modal.mode === "add" ? "取り込みルールの作成" : "ルールの編集"}</h3>
            <div style={{display:"grid", gap:16}}>
              <div style={{display:"flex", gap:16}}>
                <div style={{flex:1}}><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>送信元アドレス</label><input style={styles.input} value={modal.data.from} onChange={e => setModal({...modal, data: {...modal.data, from: e.target.value}})} /></div>
                <div style={{flex:1}}><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>件名キーワード</label><input style={styles.input} value={modal.data.subject} onChange={e => setModal({...modal, data: {...modal.data, subject: e.target.value}})} /></div>
              </div>
              
              <div style={{padding: "16px", background: "#F1F5F9", borderRadius: "12px"}}>
                <div style={{fontSize: 11, fontWeight: 800, marginBottom: 12}}>項目の抽出用キーワード設定（その文字の「後ろ」を抽出します）</div>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
                  <div><label style={{fontSize:11}}>氏名</label><input style={styles.input} value={modal.data.nameKey} onChange={e => setModal({...modal, data: {...modal.data, nameKey: e.target.value}})} /></div>
                  <div><label style={{fontSize:11}}>電話番号</label><input style={styles.input} value={modal.data.phoneKey} onChange={e => setModal({...modal, data: {...modal.data, phoneKey: e.target.value}})} /></div>
                  
                  {/* フォーム設定にあるカスタム項目を動的にループ表示 */}
{formSettings.map(f => (
  <div key={f.name}>
    <label style={{fontSize:11}}>{f.name}</label>
    <input 
      style={styles.input} 
      value={modal.data.customKeys[f.name] || ""} 
      onChange={e => setModal({
        ...modal, 
        data: {
          ...modal.data, 
          customKeys: { ...modal.data.customKeys, [f.name]: e.target.value }
        }
      })} 
      /* 🆕 テンプレート文字列を使用して、項目名を自動挿入 */
      placeholder={`（例）${f.name}：`} 
    />
  </div>
))}
                </div>
              </div>

              <div><label style={{fontSize:11, fontWeight:800, color:THEME.textMuted}}>適用シナリオ</label>
                <select style={styles.input} value={modal.data.scenarioID} onChange={e => setModal({...modal, data: {...modal.data, scenarioID: e.target.value}})}>
                  <option value="">選択してください</option>
                  {[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </div>
            </div>
            
            <div style={{display:"flex", gap:12, marginTop:32}}>
              <button onClick={async() => { 
                if(!modal.data.from || !modal.data.scenarioID) return alert("送信元とシナリオは必須です"); 
                // カスタムキーをJSON化して送信
                const payload = { ...modal.data, customKeys: JSON.stringify(modal.data.customKeys) };
                await apiCall.post(GAS_URL, { action: "saveGmailSetting", id: modal.id, ...payload }); 
                setModal({ ...modal, open: false }); 
                onRefresh(); 
              }} style={{ ...styles.btn, ...styles.btnPrimary, flex:1 }}>保存</button>
              <button onClick={() => setModal({ ...modal, open: false })} style={{ ...styles.btn, ...styles.btnSecondary }}>キャンセル</button>
            </div>
          </div>

          <div style={{ borderLeft: `1px solid ${THEME.border}`, paddingLeft: "32px", backgroundColor: "#F8FAFC", margin: "-32px", padding: "32px" }}>
            <h4 style={{marginTop: 0}}><AlertCircle size={18} color={THEME.primary}/> テスト</h4>
            <textarea style={{ ...styles.input, height: "180px", fontSize: "12px" }} value={testBody} onChange={e => setTestBody(e.target.value)} placeholder="メール本文を貼り付け" />
            <button onClick={testParse} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", marginTop: "12px", backgroundColor: "white" }}>テスト実行</button>
            
            {parsePreview && (
              <div style={{ marginTop: "24px", padding: "16px", background: "white", borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
                <div style={{fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 8}}>抽出結果</div>
                <div style={{fontSize:13}}>氏名: {parsePreview.name}</div>
                <div style={{fontSize:13}}>電話: {parsePreview.phone}</div>
                {/* 🆕 カスタム項目のテスト結果も表示 */}
                {Object.entries(parsePreview.customs).map(([k, v]) => (
                  <div key={k} style={{fontSize:13}}>{k}: {v}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </Page>);
}

/**
 * (15) ImportErrorList コンポーネント
 * 役割: Gmailからの取り込みに失敗したメールを一覧表示し、原因特定を補助する
 */
function ImportErrorList({ errors = [], onRefresh }) {
  const [selected, setSelected] = useState(null);

  return (
    <Page title="取り込みエラーログ" subtitle="抽出に失敗したメールがここに表示されます。キーワード設定の修正に役立ててください。">
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <button onClick={async () => { if(window.confirm("全てのログを削除しますか？")){ await apiCall.post(GAS_URL, { action: "clearErrorLogs" }); onRefresh(); } }} style={{ ...styles.btn, ...styles.btnSecondary, color: THEME.danger }}>
          <Trash2 size={16} /> ログを全削除
        </button>
      </div>

      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={styles.tableTh}>日時</th>
              <th style={styles.tableTh}>件名 / 送信元</th>
              <th style={styles.tableTh}>エラー原因</th>
              <th style={{ ...styles.tableTh, textAlign: "right" }}>詳細</th>
            </tr>
          </thead>
          <tbody>
            {errors && errors.length > 0 ? (
              errors.sort((a,b) => new Date(b["日時"]) - new Date(a["日時"])).map((e, i) => (
                <tr key={i} style={{ transition: "0.2s" }} onMouseEnter={el => el.currentTarget.style.backgroundColor = THEME.bg} onMouseLeave={el => el.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={styles.tableTd}>{formatDate(e["日時"])}</td>
                  <td style={styles.tableTd}>
                    <div style={{ fontWeight: 700 }}>{e["件名"]}</div>
                    <div style={{ fontSize: "12px", color: THEME.textMuted }}>{e["送信元"]}</div>
                  </td>
                  <td style={styles.tableTd}>
                    <span style={{ color: THEME.danger, fontWeight: 800 }}>{e["エラー原因"]}</span>
                  </td>
                  <td style={{ ...styles.tableTd, textAlign: "right" }}>
                    <button onClick={() => setSelected(e)} style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer" }}>
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{ ...styles.tableTd, textAlign: "center", padding: 40, color: THEME.textMuted }}>現在、エラーログはありません。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2100 }}>
          <div style={{ ...styles.card, width: "800px", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3>メール本文の詳細確認</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕ 閉じる</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#F8FAFC", padding: "20px", borderRadius: "10px", whiteSpace: "pre-wrap", fontSize: "13px", color: THEME.textMain }}>
              {selected["内容"]}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

/**
 * (16) KanbanBoard コンポーネント (V18.3 楽観的更新・リアルタイムUI版)
 * 役割: 営業進捗を視覚的に管理。ドロップと同時にUIを即時反映し、バックグラウンドでGAS同期を行う。
 */
function KanbanBoard({ customers = [], statuses = [], onRefresh, masterUrl }) {
  const navigate = useNavigate(); // 🆕 遷移用
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [localCustomers, setLocalCustomers] = useState(customers);

  useEffect(() => { setLocalCustomers(customers); }, [customers]);
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`);
        setStaffList(res?.data?.users || []);
      } catch(e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl]);

  const onDragStart = (e, customerId) => e.dataTransfer.setData("customerId", customerId);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (e, newStatus) => {
    const cid = e.dataTransfer.getData("customerId");
    const updated = localCustomers.map(c => String(c.id) === String(cid) ? { ...c, "対応ステータス": newStatus } : c);
    setLocalCustomers(updated);
    try {
      await apiCall.post(GAS_URL, { action: "updateStatus", id: cid, status: newStatus });
      onRefresh();
    } catch (err) { alert("通信エラー"); onRefresh(); }
  };

  const filtered = localCustomers.filter(c => !filterStaff || c["担当者メール"] === filterStaff);

  return (
    <Page title="案件管理カンバン" topButton={
      <div style={{display:"flex", gap:16, alignItems:"center"}}>
        {/* 🆕 ステータス管理への導線ボタン */}
        <button onClick={() => navigate("/status-settings")} style={{ ...styles.btn, ...styles.btnSecondary }}>
          <ListTodo size={18} /> ステータス項目の調整
        </button>
        
        <div style={{ width: "1px", height: "24px", backgroundColor: THEME.border }}></div>

        <span style={{fontSize:12, fontWeight:800, color:THEME.textMuted}}>担当で絞り込み:</span>
        <select style={{...styles.input, width:200}} value={filterStaff} onChange={e=>setFilterStaff(e.target.value)}>
          <option value="">全ての担当者</option>
          {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
        </select>
      </div>
    }>
      <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "20px", alignItems: "flex-start" }}>
        {statuses.map(st => {
          const colCustomers = filtered.filter(c => (c["対応ステータス"] || "未対応") === st.name);
          return (
            <div key={st.name} onDragOver={onDragOver} onDrop={(e) => onDrop(e, st.name)} style={{ minWidth: "320px", backgroundColor: "#F1F5F9", borderRadius: "16px", padding: "16px", minHeight: "70vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 8px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "900", margin: 0 }}>{st.name}</h3>
                <span style={styles.badge}>{colCustomers.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {colCustomers.map(c => (
                  <div key={c.id} draggable onDragStart={(e) => onDragStart(e, c.id)} style={{ ...styles.card, padding: "16px", cursor: "grab", border: "1px solid transparent" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor="transparent"}>
                    <div style={{ fontWeight: "800", marginBottom: "8px", fontSize: "14px" }}>{c["姓"]} {c["名"]} 様</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                        <UserCircle size={12}/> {staffList.find(s => s.email === c["担当者メール"])?.lastName || "未割当"}
                      </div>
                      <Link to={`/direct-sms/${c.id}`} style={{ color: THEME.primary }}><MessageSquare size={14}/></Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/**
 * (17) StatusSettings コンポーネント (V18.2 ドラッグ＆ドロップ対応版)
 * 役割: カンバンボードの列順序を直感的に管理。
 */
function StatusSettings({ statuses = [], onRefresh }) {
  const [items, setItems] = useState(statuses.map(s => s.name) || []);
  const [drag, setDrag] = useState(null); // 🆕 ドラッグ中のインデックスを保持

  useEffect(() => { 
    if (statuses.length > 0) {
      setItems(statuses.map(s => s.name)); 
    }
  }, [statuses]);

  // 🆕 並び替えロジック
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (drag === null || drag === i) return;
    const n = [...items];
    const d = n.splice(drag, 1)[0]; // ドラッグ中の要素を削除
    n.splice(i, 0, d); // 重なっている位置に挿入
    setDrag(i); // ドラッグ中インデックスを更新
    setItems(n); // ステート更新
  };

  return (
    <Page title="ステータス管理" subtitle="ドラッグでカンバンの列順を入れ替え、保存して反映してください">
      <div style={{ maxWidth: "500px" }}>
        <div style={{marginBottom: 24, padding: 16, backgroundColor: "#EEF2FF", borderRadius: 12, fontSize: 13, color: THEME.primary, fontWeight: 600}}>
          左側のアイコンを掴んで上下に動かすと、カンバンの左からの並び順が変わります。
        </div>

        {items.map((it, i) => (
          <div 
            key={i} 
            draggable // 🆕 ドラッグ可能に設定
            onDragStart={() => setDrag(i)} // 🆕 ドラッグ開始
            onDragOver={(e) => onDragOver(e, i)} // 🆕 要素が重なった時
            onDragEnd={() => setDrag(null)} // 🆕 ドラッグ終了
            style={{ 
              ...styles.card, 
              marginBottom: "12px", 
              display: "flex", 
              gap: "12px", 
              alignItems: "center",
              cursor: "grab", // 🆕 掴めることを示すカーソル
              border: `1px solid ${drag === i ? THEME.primary : THEME.border}`, // 🆕 ドラッグ中を目立たせる
              backgroundColor: drag === i ? "#F5F3FF" : "white",
              transition: "0.2s"
            }}
          >
            <GripVertical size={18} color={THEME.textMuted} style={{ cursor: "grab" }} />
            <input 
              style={{ ...styles.input, backgroundColor: drag === i ? "#F5F3FF" : "white" }} 
              value={it} 
              onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n); }} 
              placeholder="ステータス名を入力"
            />
            <button 
              onClick={() => setItems(items.filter((_, idx) => idx !== i))} 
              style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", padding: "8px" }}
            >
              <Trash2 size={18}/>
            </button>
          </div>
        ))}

        <button 
          onClick={() => setItems([...items, ""])} 
          style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", borderStyle: "dashed", marginTop: "12px", height: "54px" }}
        >
          <Plus size={20}/> 新しいステータスを追加
        </button>

        <button 
          onClick={async () => { 
            if(items.some(x => !x.trim())) return alert("空のステータス名があります");
            await apiCall.post(GAS_URL, { action: "saveStatuses", statuses: items }); 
            onRefresh(); 
            alert("並び順と設定を保存しました。カンバンボードに反映されます。"); 
          }} 
          style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "40px", height: "54px" }}
        >
          設定を保存して反映
        </button>
      </div>
    </Page>
  );
}

/**
 * (18) ResponseImportPortal コンポーネント (🆕 新設)
 * 役割: 反響取り込みに関する機能を統合。ユーザーが「設定」か「エラー確認」かを選択する。
 */
function ResponseImportPortal() {
  const navigate = useNavigate();
  const menuItems = [
    {
      title: "Gmail自動取り込み設定",
      desc: "メールからの顧客自動登録ルールを作成・編集します",
      path: "/gmail-settings",
      icon: <Settings size={32} color={THEME.primary} />,
      color: "#EEF2FF"
    },
    {
      title: "取り込みエラーログ",
      desc: "キーワード不一致等で取り込めなかったメールを確認します",
      path: "/import-errors",
      icon: <AlertCircle size={32} color={THEME.danger} />,
      color: "#FEF2F2"
    }
  ];

  return (
    <Page title="反響取り込み管理" subtitle="自動取り込みの設定およびエラーの監視を行います">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", maxWidth: "900px", marginTop: "24px" }}>
        {menuItems.map(item => (
          <div 
            key={item.path} 
            onClick={() => navigate(item.path)}
            style={{ 
              ...styles.card, 
              padding: "40px", 
              cursor: "pointer", 
              textAlign: "center",
              transition: "0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = THEME.primary;
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = THEME.border;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ width: "80px", height: "80px", borderRadius: "20px", backgroundColor: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.icon}
            </div>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "900", marginBottom: "12px" }}>{item.title}</h3>
              <p style={{ color: THEME.textMuted, fontSize: "14px", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
            <div style={{ marginTop: "12px", color: THEME.primary, fontWeight: "800", fontSize: "14px", display: "flex", alignItems: "center", gap: 4 }}>
              管理画面を開く <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

/**
 * (19) UserForm コンポーネント (V23.1 ホワイトアウト解消・堅牢版)
 * 役割: ユーザーの新規登録および既存情報の編集。
 */
function UserForm({ masterUrl, onRefresh }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  // 初期データの安全なパース
  const [form, setForm] = useState(() => {
    if (id && location.state?.user) return location.state.user;
    return { email: "", company: CLIENT_COMPANY_NAME, lastName: "", firstName: "", phone: "" };
  });

  const handleSave = async () => {
    if (!form.email || !form.lastName) return alert("氏名とメールアドレスは必須です");
    
    setLoading(true);
    try {
      // 物理設計要件 4.2: 電話番号ゼロ落ち防止
      const finalPhone = form.phone ? (String(form.phone).startsWith("'") ? form.phone : "'" + form.phone) : "";
      
      const payload = {
        action: "save",
        id: id || "", 
        ...form,
        company: CLIENT_COMPANY_NAME, // 確実に現在の会社名をセット
        phone: finalPhone
      };

      const res = await axios.post(masterUrl, 
        JSON.stringify(payload), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );
      
      if (res.data.status === "success") {
        alert(id ? "ユーザー情報を更新しました" : "新しいユーザーを登録しました");
        navigate("/users");
      } else {
        alert("保存失敗: " + (res.data.message || "不明なエラー"));
      }
    } catch (e) {
      alert("通信エラーが発生しました。インターネット接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={id ? "ユーザー情報の編集" : "新規ユーザー登録"}>
      <button 
        onClick={() => navigate("/users")} 
        style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer", fontWeight: "800", marginBottom: "32px", display: "flex", alignItems: "center", gap: 8, padding: 0 }}
      >
        <ChevronLeft size={20}/> ユーザー一覧に戻る
      </button>

      <div style={{ ...styles.card, maxWidth: "600px", padding: "40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>姓 <span style={{color: THEME.danger}}>*</span></label>
              <input style={styles.input} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="例: 山田" />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>名</label>
              <input style={styles.input} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="例: 太郎" />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>メールアドレス <span style={{color: THEME.danger}}>*</span></label>
            <input 
              style={{ ...styles.input, backgroundColor: id ? THEME.bg : "white" }} 
              value={form.email} 
              onChange={e => setForm({ ...form, email: e.target.value })} 
              placeholder="example@stepflow.jp" 
              disabled={!!id} 
            />
            {id && <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 8 }}>※ メールアドレスは固有キーのため変更できません</p>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>電話番号</label>
            <input 
              style={styles.input} 
              value={String(form.phone || "").replace(/'/g, "")} 
              onChange={e => setForm({ ...form, phone: e.target.value })} 
              placeholder="09012345678" 
            />
          </div>

          <div style={{ marginTop: "16px", display: "flex", gap: "16px" }}>
            <button onClick={handleSave} disabled={loading} style={{ ...styles.btn, ...styles.btnPrimary, flex: 2, height: "54px", fontSize: "15px" }}>
              {loading ? <Loader2 className="animate-spin" size={20}/> : (id ? <Check size={20}/> : <UserPlus size={20}/>)}
              {id ? "変更を保存する" : "この内容で登録する"}
            </button>
            <button onClick={() => navigate("/users")} style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: "54px" }}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}

export default App;