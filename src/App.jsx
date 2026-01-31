import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Edit3, Plus, Save, Loader2, LogOut, Users, X, GripVertical, ListFilter, Eye, Calendar
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ==========================================
// ⚠️ 設定（環境に合わせて変更してください）
// ==========================================
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
          <img src={user.picture} style={{ width: "32px", height: "32px", borderRadius: "50%" }} alt="" />
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

// --- コンポーネント群 ---
function CustomerList({ customers, formSettings, onRefresh }) {
  const [visibleCols, setVisibleCols] = useState(formSettings.slice(0, 2).map(f => f.name));
  const [showColMenu, setShowColMenu] = useState(false);
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "delete", id }); onRefresh(); }};
  return (
    <Page title="ダッシュボード" topButton={
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowColMenu(!showColMenu)} style={{ ...s.btn, background: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` }}><ListFilter size={18} /> 表示項目</button>
        {showColMenu && (
          <div style={s.popover}>
            {formSettings.map(f => (
              <label key={f.name} style={{ display: "flex", gap: "10px", marginBottom: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={visibleCols.includes(f.name)} onChange={() => setVisibleCols(prev => prev.includes(f.name) ? prev.filter(n => n !== f.name) : [...prev, f.name])} /> {f.name}
              </label>
            ))}
          </div>
        )}
      </div>
    }>
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: "#F8FAFC", borderBottom: `1px solid ${THEME.border}` }}>
            <tr>
              {visibleCols.map(col => <th key={col} style={{ padding: "16px 24px" }}>{col}</th>)}
              <th>ステータス</th><th style={{ textAlign: "right", paddingRight: "24px" }}>操作</th>
            </tr>
          </thead>
          <tbody>{customers.map((c, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              {visibleCols.map(col => <td key={col} style={{ padding: "16px 24px" }}>{c[col] || "-"}</td>)}
              <td><span style={{ ...s.badge, backgroundColor: THEME.primaryLight, color: THEME.primary }}>{c.配信ステータス}</span></td>
              <td style={{ textAlign: "right", paddingRight: "24px" }}>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Link to={`/detail/${c.id}`}><Eye size={18} color={THEME.textMuted}/></Link>
                  <Link to={`/schedule/${c.id}`}><Calendar size={18} color={THEME.primary}/></Link>
                  <Link to={`/edit/${c.id}`}><Edit3 size={18} color={THEME.textMuted}/></Link>
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

function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  const [errors, setErrors] = useState({});
  useEffect(() => { if(scenarios.length) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);
  const sub = async (e) => {
    e.preventDefault();
    const newErrors = {};
    formSettings.forEach(f => { if (f.type === "tel" && formData[f.name] && !validateTel(formData[f.name])) newErrors[f.name] = "電話番号が正しくありません"; });
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    try { await api.post(GAS_URL, { action: "add", data: formData, scenarioID }); onRefresh(); navigate("/"); } catch (err) { alert("エラー"); }
  };
  return (
    <Page title="新規登録" topButton={<button onClick={() => navigate("/form-settings")} style={{ ...s.btn, background: THEME.bg, color: THEME.primary, border: `1px solid ${THEME.primary}` }}>項目調整</button>}>
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={sub}>
          {formSettings.map(f => (
            <div key={f.name}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{f.name} {f.required && "*"}</label>
              <input style={{ ...s.input, borderColor: errors[f.name] ? THEME.danger : THEME.border }} type={f.type} required={f.required} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} />
              {errors[f.name] && <p style={{ color: THEME.danger, fontSize: "12px", marginTop: "-15px", marginBottom: "15px" }}>{errors[f.name]}</p>}
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px" }}>登録</button>
        </form>
      </div>
    </Page>
  );
}

function FormSettings({ formSettings, onRefresh }) {
  const [items, setItems] = useState(formSettings || []);
  const [dragIdx, setDragIdx] = useState(null);
  const navigate = useNavigate();
  const updateItem = (i, k, v) => { const n = [...items]; n[i][k] = v; setItems(n); };
  const handleDragEnter = (i) => {
    if (dragIdx === i) return;
    const n = [...items]; const item = n.splice(dragIdx, 1)[0]; n.splice(i, 0, item);
    setDragIdx(i); setItems(n);
  };
  const save = async () => {
    try { await api.post(GAS_URL, { action: "saveFormSettings", settings: items }); onRefresh(); navigate("/add"); } catch (e) { alert("失敗"); }
  };
  return (
    <Page title="項目調整" subtitle="ドラッグで並び替え">
      <div style={{ maxWidth: "700px" }}>
        {items.map((x, i) => (
          <div key={i} draggable onDragStart={() => setDragIdx(i)} onDragEnter={() => handleDragEnter(i)} onDragOver={e => e.preventDefault()} style={{ ...s.card, marginBottom: "12px", display: "flex", gap: "12px", alignItems: "center", cursor: "grab" }}>
            <GripVertical size={20} color={THEME.border} />
            <input style={{ ...s.input, marginBottom: 0, flex: 2 }} value={x.name} onChange={e => updateItem(i, "name", e.target.value)} />
            <select style={{ ...s.input, marginBottom: 0, flex: 1 }} value={x.type} onChange={e => updateItem(i, "type", e.target.value)}>
              <option value="text">テキスト</option><option value="tel">電話番号</option><option value="email">メール</option><option value="date">日付</option>
            </select>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: THEME.danger }}><Trash2 size={20}/></button>
          </div>
        ))}
        <button onClick={() => setItems([...items, { name: "", type: "text", required: true }])} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, marginBottom: "20px" }}>+ 追加</button>
        <button onClick={save} style={{ ...s.btn, width: "100%" }}>保存して同期</button>
      </div>
    </Page>
  );
}

function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <div>Loading...</div>;
  return (
    <Page title="顧客詳細">
      <div style={s.card}>
        {formSettings.map(f => (
          <div key={f.name} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", color: THEME.textMuted }}>{f.name}</div>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>{c[f.name] || "-"}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function CustomerSchedule({ customers, scenarios }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <div>Loading...</div>;
  const mySteps = scenarios.filter(s => s.シナリオID === c.シナリオID);
  return (
    <Page title="スケジュール">
      {mySteps.map((st, i) => (
        <div key={i} style={{ ...s.card, marginBottom: "16px", borderLeft: `4px solid ${THEME.primary}` }}>
          <div style={{ fontWeight: "800" }}>STEP {st.ステップ数}</div>
          <p>{st.message}</p>
        </div>
      ))}
    </Page>
  );
}

function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const c = customers.find(x => x.id === Number(id));
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("");
  useEffect(() => { if (c) { setFormData(c); setStatus(c.配信ステータス); } }, [c]);
  const onUpdate = async (e) => {
    e.preventDefault();
    try { await api.post(GAS_URL, { action: "update", id, data: formData, status, scenarioID: c.シナリオID }); onRefresh(); nav("/"); } catch(e) { alert("失敗"); }
  };
  if(!c) return <div>Loading...</div>;
  return (
    <Page title="編集">
      <div style={s.card}>
        <form onSubmit={onUpdate}>
          {formSettings.map(f => (
            <div key={f.name}><label>{f.name}</label><input style={s.input} value={formData[f.name] || ""} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} /></div>
          ))}
          <select style={s.input} value={status} onChange={e => setStatus(e.target.value)}>{["新規受付","予約完了","配信済み","停止中"].map(x => <option key={x} value={x}>{x}</option>)}</select>
          <button type="submit" style={s.btn}>保存</button>
        </form>
      </div>
    </Page>
  );
}

function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm("削除？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (
    <Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={s.btn}>新規作成</Link>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {Object.entries(grouped).map(([id, steps]) => (
          <div key={id} style={s.card}>
            <h3>{id}</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, flex: 1 }}>編集</Link>
              <button onClick={() => del(id)} style={{ color: THEME.danger, background: "none", border: "none" }}><Trash2 size={20}/></button>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const navigate = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, message: "" }]);
  useEffect(() => { if (editId) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, message: s.message }))); } }, [editId, scenarios]);
  const save = async () => { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); onRefresh(); navigate("/scenarios"); };
  return (
    <Page title="シナリオ編集">
      <input style={s.input} value={id} onChange={e=>setId(e.target.value)} placeholder="ID" />
      {steps.map((x, i) => (
        <div key={i} style={{ ...s.card, marginBottom: "10px" }}>
          <input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} />
          <textarea style={s.input} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} />
        </div>
      ))}
      <button onClick={() => setSteps([...steps, { elapsedDays: 1, message: "" }])}>追加</button>
      <button onClick={save} style={s.btn}>保存</button>
    </Page>
  );
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } });
  const fetchUsers = useCallback(async () => { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res.data.users); }, [masterUrl]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const sub = async (e) => { e.preventDefault(); await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetchUsers(); };
  const del = async (e) => { if(window.confirm("削除？")) { await api.post(masterUrl, { action: "deleteUser", company: CLIENT_COMPANY_NAME, email: e }); fetchUsers(); } };
  return (
    <Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={s.btn}>追加</button>}>
      <div style={s.card}>
        {users.map((u, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <div>{u.name} ({u.email})</div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })}>編集</button>
              <button onClick={() => del(u.email)}>削除</button>
            </div>
          </div>
        ))}
      </div>
      {modal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={s.card}><form onSubmit={sub}>
            <input style={s.input} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} />
            <input style={s.input} value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} />
            <button type="submit">保存</button><button onClick={()=>setModal({open:false})}>閉じる</button>
          </form></div>
        </div>
      )}
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
  if (!user) return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}>
        <div style={{ ...s.card, textAlign: "center" }}>
          <h1>StepFlow Login</h1>
          <GoogleLogin onSuccess={(res) => setUser(jwtDecode(res.credential))} useOneTap />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={48} color={THEME.primary} className="animate-spin" /></div>;
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