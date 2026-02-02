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
// 🔑 究極要件仕様書 V12 準拠：環境設定
// ==========================================
const CLIENT_COMPANY_NAME = "B社"; 
const GAS_URL = import.meta.env.VITE_GAS_URL; 
const MASTER_WHITELIST_API = import.meta.env.VITE_MASTER_WHITELIST_API;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const THEME = {
  primary: "#4F46E5", bg: "#F1F5F9", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444", locked: "#F8FAFC", sidebar: "#0F172A"
};

const s = {
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000, display: "flex", flexDirection: "column" },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: "white", transition: "0.2s" },
  btn: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 20px", borderRadius: "10px", border: "none", fontWeight: "700", cursor: "pointer", transition: "0.2s", fontSize: "14px" },
  btnPrimary: { backgroundColor: THEME.primary, color: "white", boxShadow: "0 4px 14px 0 rgba(79, 70, 229, 0.39)" },
  btnSecondary: { backgroundColor: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` },
  tableTh: { padding: "14px 20px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" },
  tableTd: { padding: "18px 20px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMain },
  badge: { padding: "4px 12px", borderRadius: "99px", fontSize: "11px", fontWeight: "800", backgroundColor: "#EEF2FF", color: THEME.primary }
};

// --- ヘルパー関数 ---
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

// --- コンポーネント: UI部品 ---

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
        <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(10,0,0,0); setQuick((d.getTime()-new Date().getTime())/60000); }} style={{ ...s.btn, ...s.btnSecondary, padding: "6px 12px", fontSize: "11px" }}>明日10時</button>
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

// --- ページ共通部品 ---

function Sidebar({ onLogout }) {
  const l = useLocation();
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={18} /> },
    { n: "新規登録", p: "/add", i: <UserPlus size={18} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={18} /> },
    { n: "テンプレート管理", p: "/templates", i: <Copy size={18} /> },
    { n: "ユーザー管理", p: "/users", i: <Users size={18} /> }
  ];
  return (
    <div style={s.sidebar}>
      <div style={{ fontSize: "22px", fontWeight: "900", marginBottom: "48px", display: "flex", alignItems: "center", gap: "12px", letterSpacing: "-0.02em" }}>
        <div style={{ backgroundColor: THEME.primary, width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={18} color="white"/>
        </div>
        StepFlow
      </div>
      <div style={{ flex: 1 }}>{m.map(x => (
        <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", borderRadius: "10px", textDecoration: "none", color: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "white" : "#94A3B8", backgroundColor: (l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p))) ? "rgba(255,255,255,0.08)" : "transparent", marginBottom: "6px", fontWeight: "600", fontSize: "14px", transition: "0.2s" }}>
          {x.i} {x.n}
        </Link>
      ))}</div>
      <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)" }}>
        <LogOut size={16}/> Logout
      </button>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (<div style={s.main}><div style={{ padding: "48px 64px", maxWidth: "1400px", margin: "0 auto" }}><div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, letterSpacing: "-0.03em" }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "6px", fontWeight: "500" }}>{subtitle}</p>}</div>{topButton}</div>{children}</div></div>);
}

// --- 1. 顧客ダッシュボード ---
function CustomerList({ customers = [], displaySettings = [], formSettings = [], onRefresh }) {
  const navigate = useNavigate(); const [search, setSearch] = useState({}); const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const visibleCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(s => s.visible).map(s => s.name) : ["姓", "名", "電話番号", "シナリオID", "登録日"], [displaySettings]);
  const searchableCols = useMemo(() => displaySettings?.length > 0 ? displaySettings.filter(s => s.searchable).map(s => s.name) : ["姓", "電話番号"], [displaySettings]);
  const filtered = useMemo(() => {
    let res = [...(customers || [])].filter(c => Object.keys(search).every(k => {
      const q = search[k]; if (!q) return true;
      if (formSettings.find(x => x.name === k)?.type === "date" || k === "登録日") {
        if (!c[k] || c[k] === "-") return false;
        const t = new Date(c[k]).getTime();
        if (q.start && t < parseLocalDate(q.start)) return false;
        if (q.end && t > parseLocalDate(q.end, true)) return false;
        return true;
      }
      return String(c[k] || "").toLowerCase().includes(String(q).toLowerCase());
    }));
    if (sort.key) res.sort((a, b) => { const aV = a[sort.key], bV = b[sort.key]; return sort.dir === 'asc' ? String(aV).localeCompare(String(bV)) : String(bV).localeCompare(String(aV)); });
    return res;
  }, [customers, search, formSettings, sort]);

  return (<Page title="顧客ダッシュボード" topButton={<div style={{ display: "flex", gap: "12px" }}><button onClick={() => downloadCSV([visibleCols, ...filtered.map(c => visibleCols.map(col => c[col]))], "export.csv")} style={{ ...s.btn, ...s.btnSecondary }}><Download size={18} /> CSV出力</button><button onClick={() => navigate("/column-settings")} style={{ ...s.btn, ...s.btnSecondary }}><ListFilter size={18} /> 表示設定</button></div>}>
    <div style={{ ...s.card, padding: "24px", marginBottom: "32px", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-end", backgroundColor: "white" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", color: THEME.textMuted, marginRight: "10px" }}><Search size={20} /></div>
      {searchableCols.map(col => (<div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted }}>{col}</label><input placeholder={`${col}...`} style={{ ...s.input, width: "160px" }} onChange={e => setSearch({...search, [col]: e.target.value})} /></div>))}
      <button onClick={() => setSearch({})} style={{ ...s.btn, background: "none", color: THEME.primary, fontWeight: "800", padding: "10px" }}>リセット</button>
    </div>
    <div style={{ ...s.card, padding: 0, overflow: "hidden" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{visibleCols.map(c => <th key={c} style={{ ...s.tableTh, cursor: "pointer" }} onClick={() => setSort({ key: c, dir: (sort.key === c && sort.dir === 'asc') ? 'desc' : 'asc' })}>{c} {sort.key === c ? (sort.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} opacity={0.3}/>}</th>)}<th style={s.tableTh}>操作</th></tr></thead>
      <tbody>{filtered.map(c => (<tr key={c.id} style={{ transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
        {visibleCols.map(col => <td key={col} style={s.tableTd}>{col === "シナリオID" ? <span style={s.badge}>{c[col]}</span> : formatDate(c[col])}</td>)}
        <td style={s.tableTd}><div style={{ display: "flex", gap: "12px" }}>
          <Link to={`/direct-sms/${c.id}`} style={{ ...s.badge, textDecoration: "none", backgroundColor: THEME.primary, color: "white" }}><MessageSquare size={12}/> SMS</Link>
          <Link to={`/schedule/${c.id}`} style={{ textDecoration: "none", color: THEME.primary, fontWeight: "800", fontSize: "13px" }}>履歴</Link>
          <Link to={`/detail/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Eye size={16}/></Link>
          <Link to={`/edit/${c.id}`} style={{ textDecoration: "none", color: THEME.textMuted }}><Edit3 size={16}/></Link>
          <button onClick={async () => { if(window.confirm("顧客と予定をすべて削除しますか？")) { await api.post(GAS_URL, { action: "delete", id: c.id }); onRefresh(); } }} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
        </div></td></tr>))}</tbody></table></div></Page>);
}

// --- 8. シナリオ管理 (デザインアップグレード版) ---
function ScenarioList({ scenarios = [], onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s["シナリオID"]] = acc[s["シナリオID"]] || []).push(s); return acc; }, {});
  return (<Page title="シナリオ管理" subtitle="自動配信のスケジュールを管理します" topButton={<Link to="/scenarios/new" style={{...s.btn, ...s.btnPrimary, textDecoration:"none"}}><Plus size={18}/> 新規作成</Link>}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
    {Object.entries(grouped).map(([id, steps]) => (
      <div key={id} style={{ ...s.card, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", padding: "32px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "8px 16px", borderRadius: "12px", fontWeight: "900", fontSize: "18px" }}>{id}</div>
            <button onClick={async()=>{if(window.confirm("このシナリオを完全に削除しますか？")){await api.post(GAS_URL,{action:"deleteScenario",scenarioID:id});onRefresh();}}} style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}><Trash2 size={18}/></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: THEME.textMuted, fontSize: "14px", fontWeight: "600", marginBottom: "24px" }}>
             <Clock size={16} /> {steps.length} ステップの配信構成
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
            {steps.slice(0, 3).sort((a,b)=>a["ステップ数"]-b["ステップ数"]).map((st, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px", color: THEME.textMain }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary }}></div>
                <span style={{ fontWeight: "700", minWidth: "40px" }}>{st["経過日数"]}日後</span>
                <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
              </div>
            ))}
            {steps.length > 3 && <div style={{ fontSize: "12px", color: THEME.textMuted, paddingLeft: "18px" }}>他 {steps.length - 3} 件のステップ...</div>}
          </div>
        </div>
        <Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ ...s.btn, ...s.btnSecondary, width: "100%", textDecoration: "none", justifyContent: "space-between", padding: "14px 20px" }}>
          <span>構成を編集する</span>
          <ChevronRight size={18} />
        </Link>
      </div>
    ))}</div></Page>);
}

// --- 9. シナリオ構成の編集 (V12 準拠・物理復旧対応版) ---
function ScenarioForm({ scenarios = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const [name, setName] = useState("");
  const [st, setSt] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id);
      setName(dId);
      const ex = scenarios.filter(s => s["シナリオID"] === dId).sort((a,b)=>a["ステップ数"]-b["ステップ数"]);
      if (ex.length) setSt(ex.map(s => ({ elapsedDays: s["経過日数"], deliveryHour: s["配信時間"], message: s["message"] })));
    }
  }, [id, scenarios]);

  const handleSave = async () => {
    if (!name.trim()) return alert("シナリオ名を入力してください");
    setSaving(true);
    try {
      await api.post(GAS_URL, { action: "saveScenario", scenarioID: name, steps: st });
      alert("保存に成功しました。顧客の配信予定が再計算されます。");
      onRefresh();
      nav("/scenarios");
    } catch (e) {
      alert("保存エラー: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page 
      title={id ? "シナリオ構成の編集" : "新規シナリオ作成"} 
      subtitle="登録日から起算した自動配信スケジュールを定義します"
      topButton={<button onClick={handleSave} disabled={saving} style={{...s.btn, ...s.btnPrimary, minWidth: "140px"}}>
        {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
        構成を保存
      </button>}
    >
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        {/* シナリオ名カード */}
        <div style={{ ...s.card, marginBottom: "40px", backgroundColor: "white" }}>
          <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>シナリオ名 (Scenario ID)</label>
          <div style={{ position: "relative" }}>
             <input style={{ ...s.input, fontSize: "18px", fontWeight: "700", padding: "16px 20px", color: id ? THEME.textMuted : THEME.textMain }} value={name} onChange={e=>setName(e.target.value)} disabled={!!id} placeholder="例: 初回サンクスメール" />
             {id && <div style={{ position: "absolute", right: "20px", top: "18px", color: THEME.textMuted }}><Lock size={20}/></div>}
          </div>
          {id && <p style={{ fontSize: "12px", color: THEME.textMuted, marginTop: "12px" }}>※ シナリオIDの変更はできません。変更が必要な場合は新規作成してください。</p>}
        </div>

        {/* ステップリスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {st.map((s_item, i) => (
            <div key={i} style={{ ...s.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}`, backgroundColor: "white" }}>
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", fontWeight: "900", fontSize: "14px" }}>
                   <span style={{ backgroundColor: THEME.primary, padding: "2px 10px", borderRadius: "6px" }}>STEP {i+1}</span>
                   {i === 0 ? "初期送付" : "継続フォロー"}
                </div>
                <button onClick={()=>setSt(st.filter((_,idx)=>idx !== i))} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={20}/></button>
              </div>
              
              <div style={{ padding: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "900", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}><Calendar size={16} color={THEME.primary}/> 経過日数</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...s.input, fontWeight: "700" }} type="number" value={s_item.elapsedDays} onChange={e=>{const n=[...st];n[i].elapsedDays=e.target.value;setSt(n)}} />
                      <span style={{ position: "absolute", right: "16px", top: "12px", color: THEME.textMuted, fontSize: "13px" }}>日後</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "900", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}><Clock size={16} color={THEME.primary}/> 配信時間</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...s.input, fontWeight: "700" }} type="number" min="0" max="23" value={s_item.deliveryHour} onChange={e=>{const n=[...st];n[i].deliveryHour=e.target.value;setSt(n)}} />
                      <span style={{ position: "absolute", right: "16px", top: "12px", color: THEME.textMuted, fontSize: "13px" }}>時頃</span>
                    </div>
                  </div>
                </div>

                <div>
                   <label style={{ fontSize: "12px", fontWeight: "900", color: THEME.textMuted, display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}><MessageSquare size={16} color={THEME.primary}/> メッセージ本文</label>
                   <textarea style={{ ...s.input, height: "140px", resize: "none", lineHeight: "1.6", fontSize: "15px" }} value={s_item.message} onChange={e=>{const n=[...st];n[i].message=e.target.value;setSt(n)}} placeholder="本文を入力... {{姓}} {{名}} が使えます" />
                   <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                      <div style={{ fontSize: "11px", color: THEME.textMuted }}>※ 改行もそのまま配信されます。</div>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: s_item.message.length > 70 ? THEME.danger : THEME.textMuted }}>
                        文字数: {s_item.message.length} {s_item.message.length > 70 && "(長文SMS適用)"}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={()=>setSt([...st,{elapsedDays:1,deliveryHour:10,message:""}])} style={{ ...s.btn, ...s.btnSecondary, width: "100%", height: "64px", borderStyle: "dashed", marginTop: "40px", borderSize: "2px", fontSize: "16px", color: THEME.textMuted }}>
          <Plus size={24}/> ステップを追加する
        </button>

        <div style={{ marginTop: "60px", padding: "32px", backgroundColor: "#FFFBEB", borderRadius: "16px", border: "1px solid #FEF3C7", display: "flex", gap: "20px" }}>
          <AlertCircle size={32} color="#D97706" />
          <div style={{ fontSize: "13px", color: "#92400E", lineHeight: "1.7" }}>
            <strong style={{ display: "block", marginBottom: "6px", fontSize: "15px" }}>配信予約の自動更新について</strong>
            構成を保存すると、このシナリオが設定されている全顧客の配信スケジュールが即座に再計算されます。
            すでに「配信済み」となっているステップは重複して送られることはありませんのでご安心ください。
          </div>
        </div>
      </div>
    </Page>);
}

// --- 他コンポーネント (CustomerDetail, CustomerSchedule, DirectSms, TemplateManager, ColumnSettings, FormSettings, UserManager, App) ---
// (これまでの App.jsx から変更がない部分は省略せずに結合します)

function CustomerDetail({ customers = [], formSettings = [] }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id));
  if (!customers.length || !c) return <Page title="中..."><Loader2 size={24} className="animate-spin" /></Page>;
  const fields = [{ label: "姓", value: c["姓"] }, { label: "名", value: c["名"] }, { label: "電話番号", value: c["電話番号"] }, { label: "シナリオID", value: c["シナリオID"], isBadge: true }, { label: "登録日", value: formatDate(c["登録日"]) }, { label: "ステータス", value: c["配信ステータス"] }, ...formSettings.map(f => ({ label: f.name, value: f.type === "date" ? formatDate(c[f.name]) : (c[f.name] || "-") }))];
  return (<Page title="顧客詳細情報" subtitle="登録データの確認"><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← 戻る</Link><div style={{ ...s.card, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "32px", padding: "40px" }}>{fields.map((f, i) => (<div key={i} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}><label style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "800", display: "block", marginBottom: "4px" }}>{f.label}</label><div style={{ fontWeight: "600", fontSize: "16px" }}>{f.isBadge ? <span style={s.badge}>{f.value}</span> : f.value}</div></div>))}</div></Page>);
}

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
      try { await api.post(GAS_URL, { action: "bulkAdd", customers }); alert("一括登録完了"); onRefresh(); navigate("/"); } catch (err) { alert(err.message); }
    }; reader.readAsText(file);
  };
  const handleDownloadTemplate = () => {
    const headers = ["姓", "名", "電話番号", "シナリオID", ...formSettings.map(f => f.name)];
    const sampleRow = ["山田", "太郎", "'09012345678", scenarios[0]?.["シナリオID"] || "A", ...formSettings.map(() => "")];
    downloadCSV([headers, sampleRow], "customer_import_template.csv");
  };
  return (<Page title="新規顧客登録" topButton={<div style={{ display: "flex", gap: "10px" }}>
    <button onClick={handleDownloadTemplate} style={{ ...s.btn, ...s.btnSecondary }}><FileSpreadsheet size={18} /> テンプレート</button>
    <button onClick={() => { const f = document.createElement("input"); f.type="file"; f.accept=".csv"; f.onchange=(e)=>handleFileUpload(e); f.click(); }} style={{ ...s.btn, ...s.btnPrimary }}><Upload size={18} /> CSV登録</button>
  </div>}><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); try { await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID }); onRefresh(); navigate("/"); } catch(err) { alert(err.message); } }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓 *</label><input style={s.input} required onChange={e => setLastName(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名 *</label><input style={s.input} required onChange={e => setFirstName(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号 *</label><input style={{...s.input, marginBottom:"20px"}} required value={phone} onChange={e => setPhone(e.target.value)} placeholder="09012345678" />{formSettings.map(f => <div key={f.name} style={{marginBottom:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={formData[f.name]} onChange={v => setFormData({...formData, [f.name]: v})} /></div>)}
    <label style={{fontWeight:"700"}}>適用シナリオ</label><select style={{...s.input, marginBottom:"32px"}} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios?.map(x => x["シナリオID"]))].map(id => <option key={id} value={id}>{id}</option>)}</select><button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", padding: "14px" }}>登録を確定</button></form></div></Page>);
}

function CustomerEdit({ customers = [], scenarios = [], formSettings = [], onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [ln, setLn] = useState(""); const [fn, setFn] = useState(""); const [ph, setPh] = useState("");
  const [fd, setFd] = useState({}); const [sc, setSc] = useState("");
  useEffect(() => { if (c) { setLn(c["姓"] || ""); setFn(c["名"] || ""); setPh(c["電話番号"] || ""); setFd(c); setSc(c["シナリオID"]); } }, [c]);
  if(!c) return <Page title="中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="顧客情報の編集"><div style={{ ...s.card, maxWidth: "650px", margin: "0 auto" }}><form onSubmit={async (e) => { e.preventDefault(); await api.post(GAS_URL, { action: "update", id, lastName:ln, firstName:fn, phone:ph, data: fd, status: c["配信ステータス"], scenarioID: sc }); onRefresh(); nav("/"); }}>
    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>姓</label><input style={s.input} value={ln} onChange={e=>setLn(e.target.value)} /></div><div style={{ flex: 1 }}><label style={{fontWeight:"700"}}>名</label><input style={s.input} value={fn} onChange={e=>setFn(e.target.value)} /></div></div>
    <label style={{fontWeight:"700"}}>電話番号</label><input style={s.input} value={ph} onChange={e=>setPh(e.target.value)} />{formSettings.map(f => <div key={f.name} style={{marginTop:"20px"}}><label style={{fontWeight:"700"}}>{f.name}</label><DynamicField f={f} value={fd[f.name]} onChange={v=>setFd({...fd,[f.name]:v})} /></div>)}
    <label style={{display:"block", marginTop:"20px", fontWeight:"700"}}>シナリオ</label><select style={s.input} value={sc} onChange={e=>setSc(e.target.value)}>{[...new Set(scenarios?.map(x=>x["シナリオID"]))].map(id=><option key={id} value={id}>{id}</option>)}</select><button type="submit" style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "32px", padding: "14px" }}>変更を保存</button></form></div></Page>);
}

function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const { id } = useParams(); const c = customers?.find(x => x.id === Number(id)); const [edit, setEdit] = useState(null);
  if (!customers.length || !c) return <Page title="中..."><Loader2 size={24} className="animate-spin"/></Page>;
  const cPhone = smartNormalizePhone(c["電話番号"]);
  const scenarioLogs = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cPhone && l["ステップ名"] !== "個別SMS");
  const directLogs = (deliveryLogs || []).filter(l => smartNormalizePhone(l["電話番号"]) === cPhone && l["ステップ名"] === "個別SMS");
  return (<Page title="配信状況" subtitle={`${c["姓"]}${c["名"]} 様`}><Link to="/" style={{display:"block", marginBottom:"24px", color:THEME.primary, textDecoration:"none", fontWeight:"700"}}>← ダッシュボードへ戻る</Link>
    <div style={{marginBottom:"40px"}}><h3 style={{fontSize:"18px", marginBottom:"16px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>ステップ配信（シナリオ）</h3>
      <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>{scenarioLogs.map((l, i) => (<div key={i} style={{ ...s.card, padding: "16px", borderLeft: `6px solid ${l["ステータス"] === "配信済み" ? THEME.success : THEME.primary}` }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{l["ステータス"]}</span><span style={{fontWeight:"800", marginLeft:"12px"}}>{formatDate(l["配信予定日時"])}</span><span style={{marginLeft:"12px", color:THEME.textMuted, fontSize:"12px"}}>{l["ステップ名"]}</span></div>{l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"10px", fontSize:"14px"}}>{l["内容"]}</div></div>))}</div></div>
    <div><h3 style={{fontSize:"18px", marginBottom:"16px", borderLeft:`4px solid ${THEME.primary}`, paddingLeft:"12px"}}>個別配信（メッセージ）</h3>
      <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>{directLogs.map((l, i) => (<div key={i} style={{ ...s.card, padding: "16px", background:"#F8FAFC" }}><div style={{display:"flex", justifyContent:"space-between"}}><div><span style={s.badge}>{l["ステータス"]}</span><span style={{fontWeight:"800", marginLeft:"12px"}}>{formatDate(l["配信予定日時"])}</span></div>{l["ステータス"] === "配信待ち" && <button onClick={()=>setEdit({ id: l["ログID"], t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), m: l["内容"] })} style={{color:THEME.primary, background:"none", border:"none", cursor:"pointer", fontWeight:"600"}}>編集</button>}</div><div style={{marginTop:"10px", fontSize:"14px"}}>{l["内容"]}</div></div>))}</div></div>
    {edit && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "500px", padding: "32px" }}><h3>予定の調整</h3><SmartDateTimePicker value={edit.t} onChange={t=>setEdit({...edit, t})} /><textarea style={{...s.input, height:"150px", marginTop:"15px", resize:"none"}} value={edit.m} onChange={e=>setEdit({...edit, m:e.target.value})} /><div style={{display:"flex", gap:"12px", marginTop:"24px"}}><button onClick={async()=>{ await api.post(GAS_URL,{action:"updateDeliveryTime",logId:edit.id,newTime:edit.t, newMessage:edit.m}); onRefresh(); setEdit(null); }} style={{...s.btn, ...s.btnPrimary, flex:1}}>保存</button><button onClick={()=>setEdit(null)} style={{...s.btn, ...s.btnSecondary, flex:1}}>閉じる</button></div></div></div>)}</Page>);
}

function DirectSms({ customers = [], templates = [], onRefresh }) {
  const { id } = useParams(); const navigate = useNavigate(); const c = customers?.find(x => x.id === Number(id));
  const [msg, setMsg] = useState(""); const [time, setTime] = useState(new Date(new Date().getTime() + 10 * 60000).toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  if (!customers.length || !c) return <Page title="中..."><Loader2 className="animate-spin"/></Page>;
  return (<Page title="個別SMS配信" subtitle={`${c["姓"]} ${c["名"]} 様へのメッセージ`}><Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, textDecoration: "none", fontWeight: "700" }}>← ダッシュボードへ戻る</Link>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}><div><label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>配信予定日時</label><SmartDateTimePicker value={time} onChange={setTime} /><textarea style={{ ...s.input, height: "300px", resize: "none", marginTop: "24px" }} value={msg} onChange={e => setMsg(e.target.value)} placeholder="本文を入力..." /><button onClick={async()=>{ if(!msg) return alert("本文空です"); setLoading(true); try{ await api.post(GAS_URL,{action:"sendDirectSms",phone:c["電話番号"],customerName:`${c["姓"]} ${c["名"]}`,scheduledTime:time,message:msg}); alert("予約完了"); navigate("/"); }catch(e){alert(e.message)}finally{setLoading(false)} }} disabled={loading} style={{ ...s.btn, ...s.btnPrimary, width: "100%", marginTop: "24px" }}>配信予約を確定</button></div>
        <div><h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>テンプレート</h3><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>{templates.map(t => (<div key={t.id} onClick={() => setMsg(replaceVariables(t.content, c))} style={{ ...s.card, padding: "16px", cursor: "pointer", border: `1px solid ${THEME.border}`, transition:"0.2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=THEME.primary} onMouseLeave={e=>e.currentTarget.style.borderColor=THEME.border}><div style={{ fontWeight: "700", fontSize: "14px" }}>{t.name}</div><div style={{ fontSize: "12px", color: THEME.textMuted, marginTop:"4px" }}>{t.content.slice(0, 50)}...</div></div>))}</div></div></div></Page>);
}

function TemplateManager({ templates = [], onRefresh }) {
  const [modal, setModal] = useState({ open: false, data: { id: "", name: "", content: "" } });
  return (<Page title="テンプレート管理" topButton={<button onClick={() => setModal({ open: true, data: { id: "", name: "", content: "{{姓}} {{名}} 様\n[ここに本文を入力してください]" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18}/> 新規追加</button>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>{templates.map(t => (<div key={t.id} style={s.card}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><h3 style={{ margin: 0, fontSize: "16px" }}>{t.name}</h3><div style={{ display: "flex", gap: "8px" }}><button onClick={() => setModal({ open: true, data: t })} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={16}/></button><button onClick={async() => { if(window.confirm("削除？")){ await api.post(GAS_URL, { action: "deleteTemplate", id: t.id }); onRefresh(); }}} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button></div></div><pre style={{ fontSize: "13px", color: THEME.textMuted, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: "12px", borderRadius: "8px" }}>{t.content}</pre></div>))}</div>
    {modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "600px" }}><h3>編集</h3><form onSubmit={async(e)=>{e.preventDefault(); await api.post(GAS_URL,{action:"saveTemplate",...modal.data}); alert("保存完了"); setModal({open:false}); onRefresh();}}><input style={{ ...s.input, marginBottom: "16px" }} value={modal.data.name} onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})} required /><textarea style={{ ...s.input, height: "200px", resize: "none", marginBottom: "20px" }} value={modal.data.content} onChange={e => setModal({...modal, data: {...modal.data, content: e.target.value}})} required /><div style={{ display: "flex", gap: "12px" }}><button type="submit" style={{ ...s.btn, ...s.btnPrimary, flex: 1 }}>保存</button><button type="button" onClick={() => setModal({ open: false })} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>閉じる</button></div></form></div></div>)}</Page>);
}

function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh }) {
  const nav = useNavigate(); const [items, setItems] = useState([]); const [drag, setDrag] = useState(null);
  useEffect(() => { const base = ["姓", "名", "電話番号", "シナリオID", "登録日"]; const allP = [...base, ...formSettings.map(f => f.name)]; let init; if (displaySettings?.length > 0) { const ex = displaySettings.map(d => d.name); const mis = allP.filter(p => !ex.includes(p)).map(n => ({ name: n, visible: true, searchable: true })); init = [...displaySettings, ...mis]; } else { init = allP.map(n => ({ name: n, visible: true, searchable: true })); } setItems(init); }, [displaySettings, formSettings]);
  const onDragOver = (e, i) => { e.preventDefault(); if (drag===null||drag===i) return; const n = [...items]; const d = n.splice(drag, 1)[0]; n.splice(i, 0, d); setDrag(i); setItems(n); };
  return (<Page title="表示項目の調整"><div style={{ maxWidth: "700px" }}>{items.map((it, i) => (<div key={it.name} draggable onDragStart={()=>setDrag(i)} onDragOver={(e)=>onDragOver(e,i)} onDragEnd={()=>setDrag(null)} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", backgroundColor: "white", border: `1px solid ${drag === i ? THEME.primary : THEME.border}`, borderRadius: "12px", marginBottom: "8px", cursor: "grab" }}><GripVertical size={18} color={THEME.textMuted} /><div style={{ flex: 1, fontWeight: "600" }}>{it.name}</div><input type="checkbox" checked={it.visible} onChange={()=>{const n=[...items];n[i].visible=!n[i].visible;setItems(n)}} />表示 <input type="checkbox" checked={it.searchable} style={{marginLeft:"20px"}} onChange={()=>{const n=[...items];n[i].searchable=!n[i].searchable;setItems(n)}} />検索 </div>))}<button onClick={async()=>{await api.post(GAS_URL,{action:"saveDisplaySettings",settings:items}); alert("完了"); nav("/"); onRefresh(); }} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"24px"}}>設定を保存</button></div></Page>);
}

function FormSettings({ formSettings = [], onRefresh }) {
  const [items, setItems] = useState(formSettings || []); const nav = useNavigate();
  return (<Page title="カスタム項目の調整"><div style={{ maxWidth: "850px" }}>{["姓", "名", "電話番号"].map(f => (<div key={f} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, opacity: 0.7 }}><Lock size={18} color={THEME.textMuted} /><div style={{ flex: 2 }}><label style={{fontSize:"11px"}}>項目名</label><div style={{fontWeight:"700"}}>{f}</div></div><div style={{ flex: 1.5 }}><label style={{fontSize:"11px"}}>形式</label><div>テキスト</div></div></div>))}{items.map((x, i) => (<div key={i} style={{ ...s.card, marginBottom: "12px", display: "flex", gap: "15px", alignItems: "center" }}><GripVertical size={20} color={THEME.border} /><input style={{...s.input, flex: 2}} value={x.name} onChange={e=>{const n=[...items];n[i].name=e.target.value;setItems(n)}} /><select style={{...s.input, flex: 1.5}} value={x.type} onChange={e=>{const n=[...items];n[i].type=e.target.value;setItems(n)}}><option value="text">テキスト</option><option value="date">日付</option><option value="dropdown">プルダウン</option></select><button onClick={()=>{const n=items.filter((_,idx)=>idx !== i);setItems(n)}} style={{color:THEME.danger, background:"none", border:"none"}}><Trash2 size={20}/></button></div>))}<button onClick={()=>setItems([...items,{name:"",type:"text",required:true}])} style={{...s.btn, ...s.btnSecondary, width:"100%", borderStyle:"dashed"}}>+ 追加項目</button><button onClick={async()=>{await api.post(GAS_URL,{action:"saveFormSettings",settings:items}); alert("完了"); nav("/add"); onRefresh(); }} style={{...s.btn, ...s.btnPrimary, width:"100%", marginTop:"32px"}}>同期</button></div></Page>);
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]); const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "" } });
  const fetch = useCallback(async () => { try{ const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res?.data?.users || []); }catch(e){console.error(e)} }, [masterUrl]);
  useEffect(() => { fetch(); }, [fetch]);
  const sub = async (e) => { e.preventDefault(); await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetch(); };
  return (<Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={{ ...s.btn, ...s.btnPrimary }}><Plus size={18} /> 追加</button>}><div style={{ ...s.card, padding: 0 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th><th style={{...s.tableTh, textAlign:"right"}}>操作</th></tr></thead><tbody>{users.map((u, i) => (<tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td><td style={{...s.tableTd, textAlign:"right"}}><div style={{display:"flex", gap:"10px", justifyContent:"flex-end"}}><button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{background:"none", border:"none", color:THEME.primary, cursor:"pointer", fontWeight:"600"}}>編集</button><button onClick={async()=>{if(window.confirm("削除？")){await api.post(masterUrl,{action:"deleteUser",company:CLIENT_COMPANY_NAME,email:u.email});fetch();}}} style={{background:"none", border:"none", color:THEME.danger, cursor:"pointer"}}><Trash2 size={16}/></button></div></td></tr>))}</tbody></table></div>{modal.open && (<div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}><div style={{ ...s.card, width: "400px" }}><h3>編集</h3><form onSubmit={sub}><input style={{...s.input, marginBottom:"15px"}} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} placeholder="名前" required /><input style={{...s.input, marginBottom:"15px"}} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} placeholder="メールアドレス" required /><div style={{ display: "flex", gap: "10px" }}><button type="submit" style={{ ...s.btn, ...s.btnPrimary, flex: 1 }}>保存</button><button type="button" onClick={() => setModal({ open: false })} style={{ ...s.btn, ...s.btnSecondary, flex: 1 }}>閉じる</button></div></form></div></div>)}</Page>);
}

function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], displaySettings: [], deliveryLogs: [], templates: [] });
  const [load, setLoad] = useState(true); const [user, setUser] = useState(() => { const saved = localStorage.getItem("sf_user"); return saved ? JSON.parse(saved) : null; });
  const refresh = useCallback(async () => { if(!user) return; try { const res = await axios.get(`${GAS_URL}`); setD(res.data); } finally { setLoad(false); } }, [user]);
  useEffect(() => { refresh(); }, [refresh]);
  if (!user) return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px" }}><div style={{ backgroundColor: THEME.primary, width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)" }}><MessageSquare color="white" size={32} /></div><h1 style={{fontSize:28, fontWeight:900, marginBottom:10, letterSpacing:"-0.03em"}}>StepFlow</h1><p style={{fontSize:14, color:THEME.textMuted, marginBottom:40, fontWeight:500}}>SMS配信マーケティング・プラットフォーム</p><GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleLogin onSuccess={(res) => { const dec = jwtDecode(res.credential); setUser(dec); localStorage.setItem("sf_user", JSON.stringify(dec)); }} /></GoogleOAuthProvider></div></div>);
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} className="animate-spin" color={THEME.primary} /></div>;
  return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><Router><div style={{ display: "flex", fontFamily: "'Inter', sans-serif" }}><Sidebar onLogout={() => { setUser(null); localStorage.removeItem("sf_user"); }} /><Routes>
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