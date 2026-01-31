import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Edit3, Plus, Save, Loader2, LogOut, Users, X, GripVertical, ListFilter, Eye, Calendar, Check
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ⚠️ 設定
const CLIENT_COMPANY_NAME = "B社";
const GAS_URL = "https://script.google.com/macros/s/AKfycbwFVcroo9001k-6_yX6ccwemrIPbv0Da_OlA20gvLL23lXdSE6CPJJQidpQPN8cOCE/exec"; 
const MASTER_WHITELIST_API = "https://script.google.com/macros/s/AKfycbyHgp0QFGMHBKOdohWQ4kLH-qM1khFwwESmpEveW-oXhtFg5Np85ZTDeXrpRXKnTNzm3g/exec";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const THEME = {
  primary: "#4F46E5", primaryLight: "#EEF2FF", sidebar: "#0F172A", 
  bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444",
};

const s = {
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000 },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden", padding: "32px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "15px", marginBottom: "20px", outline: "none", boxSizing: "border-box" },
  btn: { backgroundColor: THEME.primary, color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" },
  popover: { position: "absolute", top: "100%", right: 0, backgroundColor: "white", border: `1px solid ${THEME.border}`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: "16px", zIndex: 100, minWidth: "200px" }
};

const api = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

// --- ヘルパー：電話番号バリデーション ---
const validateTel = (val) => {
  const clean = val.replace(/[-()\s]/g, "");
  return /^0\d{9,10}$/.test(clean);
};

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "22px", fontWeight: "800", marginBottom: "48px" }}>
        <div style={{ backgroundColor: THEME.primary, padding: "8px", borderRadius: "8px" }}><MessageSquare size={22} color="white" /></div> StepFlow
      </div>
      <div style={{ flex: 1 }}>{m.map(x => (
        <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", textDecoration: "none", color: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? "white" : "#94A3B8", backgroundColor: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? THEME.primary : "transparent", marginBottom: "8px", fontWeight: "600" }}>{x.i} {x.n}</Link>
      ))}</div>
      <div style={{ marginTop: "auto", borderTop: `1px solid #1E293B`, paddingTop: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <img src={user.picture} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
          <span style={{ fontSize: "13px" }}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "#1E293B" }}><LogOut size={16} /> Logout</button>
      </div>
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

// --- ダッシュボード (動的カラム選択 & 全機能復旧) ---
function CustomerList({ customers, formSettings, onRefresh }) {
  const [visibleCols, setVisibleCols] = useState(formSettings.slice(0, 2).map(f => f.name));
  const [showColMenu, setShowColMenu] = useState(false);
  const navigate = useNavigate();

  const toggleCol = (name) => {
    setVisibleCols(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "delete", id }); onRefresh(); }};

  return (
    <Page title="顧客ダッシュボード" subtitle="配信管理と進捗状況" topButton={
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowColMenu(!showColMenu)} style={{ ...s.btn, background: THEME.card, color: THEME.textMain, border: `1px solid ${THEME.border}` }}>
          <ListFilter size={18} /> 表示項目
        </button>
        {showColMenu && (
          <div style={s.popover}>
            <div style={{ fontWeight: "700", marginBottom: "12px", fontSize: "13px" }}>表示する列を選択</div>
            {formSettings.map(f => (
              <label key={f.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", cursor: "pointer", fontSize: "14px" }}>
                <input type="checkbox" checked={visibleCols.includes(f.name)} onChange={() => toggleCol(f.name)} /> {f.name}
              </label>
            ))}
            <button onClick={() => setShowColMenu(false)} style={{ ...s.btn, width: "100%", padding: "6px", fontSize: "12px", marginTop: "8px" }}>閉じる</button>
          </div>
        )}
      </div>
    }>
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#F8FAFC", borderBottom: `1px solid ${THEME.border}` }}>
            <tr>
              {visibleCols.map(col => <th key={col} style={{ padding: "16px 24px", color: THEME.textMuted, fontSize: "12px" }}>{col}</th>)}
              <th style={{ padding: "16px 24px", color: THEME.textMuted, fontSize: "12px" }}>ステータス</th>
              <th style={{ padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>{customers.map((c, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              {visibleCols.map(col => <td key={col} style={{ padding: "16px 24px", fontWeight: "600", fontSize: "14px" }}>{c[col] || "-"}</td>)}
              <td style={{ padding: "16px 24px" }}><span style={{ ...s.badge, backgroundColor: THEME.primaryLight, color: THEME.primary }}>{c.配信ステータス}</span></td>
              <td style={{ padding: "16px 24px", textAlign: "right" }}>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Link to={`/detail/${c.id}`} title="詳細"><Eye size={18} color={THEME.textMuted}/></Link>
                  <Link to={`/schedule/${c.id}`} title="スケジュール"><Calendar size={18} color={THEME.primary}/></Link>
                  <Link to={`/edit/${c.id}`} title="編集"><Edit3 size={18} color={THEME.textMuted}/></Link>
                  <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={18} color={THEME.danger}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

// --- 顧客詳細 (全項目確認) ---
function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="顧客詳細情報">
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", textDecoration: "none", color: THEME.primary, fontWeight: "700" }}>← ダッシュボードへ戻る</Link>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {formSettings.map(f => (
            <div key={f.name} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700", marginBottom: "4px" }}>{f.name}</div>
              <div style={{ fontSize: "16px", fontWeight: "600" }}>{c[f.name] || "-"}</div>
            </div>
          ))}
          <div style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700", marginBottom: "4px" }}>登録日</div>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>{new Date(c.登録日).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// --- 配信スケジュール確認 ---
function CustomerSchedule({ customers, scenarios }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  const mySteps = scenarios.filter(s => s.シナリオID === c.シナリオID);
  const calcDate = (reg, d) => { const dt = new Date(reg); dt.setDate(dt.getDate() + Number(d)); return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); };
  return (
    <Page title="配信スケジュール" subtitle={`${c[Object.keys(c)[1]] || "顧客"} 様へのSMS配信予定`}>
      <Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, fontWeight: "700", textDecoration: "none" }}>← 戻る</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {mySteps.map((st, i) => (
          <div key={i} style={{ ...s.card, borderLeft: `6px solid ${THEME.primary}`, display: "flex", gap: "40px" }}>
            <div style={{ minWidth: "150px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted }}>配信予定日</div>
              <div style={{ fontSize: "18px", fontWeight: "800" }}>{calcDate(c.登録日, st.経過日数)}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: THEME.primary, fontWeight: "800" }}>STEP {st.ステップ数}</div>
              <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "15px" }}>{st.message}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// --- 新規登録 (バリデーション強化) ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  const [errors, setErrors] = useState({});
  const ids = [...new Set(scenarios.map(x => x.シナリオID))];

  useEffect(() => { if(ids.length) setScenarioID(ids[0]); }, [ids]);

  const sub = async (e) => {
    e.preventDefault();
    // 🆕 バリデーションチェック
    const newErrors = {};
    formSettings.forEach(f => {
      if (f.type === "tel" && formData[f.name] && !validateTel(formData[f.name])) {
        newErrors[f.name] = "有効な電話番号（10-11桁）を入力してください";
      }
    });
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    try {
      await api.post(GAS_URL, { action: "add", data: formData, scenarioID });
      alert("登録完了"); onRefresh(); navigate("/");
    } catch (err) { alert("エラー"); }
  };

  return (
    <Page title="新規顧客登録" topButton={<button onClick={() => navigate("/form-settings")} style={{ ...s.btn, background: THEME.bg, color: THEME.primary, border: `1px solid ${THEME.primary}` }}>項目調整</button>}>
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={sub}>
          {formSettings.map(item => (
            <div key={item.name}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{item.name} {item.required && "*"}</label>
              <input style={{ ...s.input, borderColor: errors[item.name] ? THEME.danger : THEME.border }} type={item.type} required={item.required} placeholder={`${item.name}を入力`} onChange={e => setFormData({ ...formData, [item.name]: e.target.value })} />
              {errors[item.name] && <p style={{ color: THEME.danger, fontSize: "12px", marginTop: "-15px", marginBottom: "15px" }}>{errors[item.name]}</p>}
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{ids.map(id => <option key={id} value={id}>{id}</option>)}</select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px" }}>登録する</button>
        </form>
      </div>
    </Page>
  );
}

// --- 項目調整 (前回のDNDロジック維持) ---
function FormSettings({ formSettings, onRefresh }) {
  const [items, setItems] = useState(formSettings || []);
  const [dragIdx, setDragIdx] = useState(null);
  const navigate = useNavigate();
  const addItem = () => setItems([...items, { name: "", type: "text", required: true }]);
  const updateItem = (i, k, v) => { const n = [...items]; n[i][k] = v; setItems(n); };
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragEnter = (i) => {
    if (dragIdx === i) return;
    const n = [...items]; const item = n.splice(dragIdx, 1)[0]; n.splice(i, 0, item);
    setDragIdx(i); setItems(n);
  };
  const save = async () => {
    try { await api.post(GAS_URL, { action: "saveFormSettings", settings: items }); onRefresh(); navigate("/add"); } catch (e) { alert("失敗"); }
  };
  return (
    <Page title="項目調整" subtitle="項目の追加・削除・並び替え">
      <div style={{ maxWidth: "700px" }}>
        {items.map((x, i) => (
          <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragOver={e => e.preventDefault()} style={{ ...s.card, marginBottom: "12px", display: "flex", gap: "12px", alignItems: "center", cursor: "grab" }}>
            <GripVertical size={20} color={THEME.border} />
            <input style={{ ...s.input, marginBottom: 0, flex: 2 }} value={x.name} onChange={e => updateItem(i, "name", e.target.value)} />
            <select style={{ ...s.input, marginBottom: 0, flex: 1 }} value={x.type} onChange={e => updateItem(i, "type", e.target.value)}>
              <option value="text">テキスト</option><option value="tel">電話番号</option><option value="email">メール</option><option value="date">日付</option>
            </select>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: THEME.danger }}><Trash2 size={20}/></button>
          </div>
        ))}
        <button onClick={addItem} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, marginBottom: "20px" }}>+ 追加</button>
        <button onClick={save} style={{ ...s.btn, width: "100%" }}>保存して同期</button>
      </div>
    </Page>
  );
}

// --- 他（編集、シナリオ、UserManager等は既存維持） ---
// ※文字数制限のためAppコンポーネントでのルート定義にまとめます

function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const c = customers.find(x => x.id === Number(id));
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("");
  const [scenarioID, setScenarioID] = useState("");
  useEffect(() => { if (c) { setFormData(c); setStatus(c.配信ステータス); setScenarioID(c.シナリオID); } }, [c]);
  const onUpdate = async (e) => {
    e.preventDefault();
    try { await api.post(GAS_URL, { action: "update", id, data: formData, status, scenarioID }); onRefresh(); nav("/"); } catch(e) { alert("失敗"); }
  };
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="情報の編集">
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={onUpdate}>
          {formSettings.map(f => (
            <div key={f.name}><label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{f.name}</label>
            <input style={s.input} type={f.type} value={formData[f.name] || ""} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} /></div>
          ))}
          <select style={s.input} value={status} onChange={e => setStatus(e.target.value)}>{["新規受付","予約完了","配信済み","停止中"].map(x => <option key={x} value={x}>{x}</option>)}</select>
          <button type="submit" style={{ ...s.btn, width: "100%" }}>保存</button>
        </form>
      </div>
    </Page>
  );
}

// --- App メイン ---
export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [] });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    if(!user) return;
    try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } catch (e) { console.error(e); } finally { setLoad(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleLoginSuccess = async (res) => {
    const decoded = jwtDecode(res.credential);
    try {
      const check = await axios.get(`${MASTER_WHITELIST_API}?action=login&email=${decoded.email}`);
      if (check.data.allowed) setUser(decoded); else alert("未登録");
    } catch (e) { alert("エラー"); }
  };

  if (!user) return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}>
        <div style={s.card}><h1>StepFlow</h1><GoogleLogin onSuccess={handleLoginSuccess} /></div>
      </div>
    </GoogleOAuthProvider>
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div style={{ display: "flex" }}>
          <Sidebar onLogout={() => setUser(null)} user={user} />
          <Routes>
            <Route path="/" element={<CustomerList customers={d.customers} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} formSettings={d.formSettings} />} />
            <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} scenarios={d.scenarios} />} />
            <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

// 他の不足コンポーネント(ScenarioList等)は以前のロジックを統合して実行してください