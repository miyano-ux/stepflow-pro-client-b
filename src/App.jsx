import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Edit3, ChevronRight, Plus, Save, Loader2, LogOut, Users, X, CheckCircle2, ListFilter
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
  btn: { backgroundColor: THEME.primary, color: "white", padding: "12px 24px", borderRadius: "10px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 },
};

const api = {
  post: async (url, data) => {
    const res = await axios.post(url, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

// --- レイアウト ---
function Sidebar({ onLogout, user }) {
  const l = useLocation();
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={20} /> },
    { n: "新規登録", p: "/add", i: <UserPlus size={20} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={20} /> },
    { n: "フォーム設定", p: "/form-settings", i: <ListFilter size={20} /> },
    { n: "ユーザー管理", p: "/users", i: <Users size={20} /> },
  ];
  return (
    <div style={s.sidebar}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "22px", fontWeight: "800", marginBottom: "48px" }}>
        <div style={{ backgroundColor: THEME.primary, padding: "8px", borderRadius: "8px" }}><MessageSquare size={22} color="white" /></div> StepFlow
      </div>
      <div style={{ flex: 1 }}>
        {m.map(x => (
          <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", textDecoration: "none", color: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? "white" : "#94A3B8", backgroundColor: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? THEME.primary : "transparent", marginBottom: "8px", fontWeight: "600" }}>
            {x.i} {x.n}
          </Link>
        ))}
      </div>
      <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: `1px solid #1E293B` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <img src={user.picture} style={{ width: "32px", height: "32px", borderRadius: "50%" }} alt="profile" />
          <div style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "10px", backgroundColor: "#1E293B", color: "#94A3B8", border: "none", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", fontWeight: "600" }}>
          <LogOut size={16} /> ログアウト
        </button>
      </div>
    </div>
  );
}

function Page({ title, subtitle, children }) {
  return (
    <div style={s.main}><div style={{ padding: "48px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", color: THEME.textMain, margin: "0 0 8px 0" }}>{title}</h1>
        {subtitle && <p style={{ color: THEME.textMuted, fontSize: "16px" }}>{subtitle}</p>}
      </div>
      {children}
    </div></div>
  );
}

// --- フォーム設定画面 ---
function FormSettings({ formSettings, onRefresh }) {
  const [items, setItems] = useState(formSettings || []);
  const [load, setLoad] = useState(false);

  const addItem = () => setItems([...items, { name: "", type: "text", required: true }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => {
    const n = [...items];
    n[i][key] = val;
    setItems(n);
  };

  const save = async () => {
    if (items.some(x => !x.name)) return alert("項目名を入力してください");
    setLoad(true);
    try {
      await api.post(GAS_URL, { action: "saveFormSettings", settings: items });
      alert("保存完了。シートの見出しも更新されました。");
      onRefresh();
    } catch (e) { alert("保存失敗"); }
    finally { setLoad(false); }
  };

  return (
    <Page title="フォーム設定" subtitle="登録画面の入力項目を自由にカスタマイズします">
      <div style={{ maxWidth: "700px" }}>
        {items.map((x, i) => (
          <div key={i} style={{ ...s.card, marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center", padding: "20px" }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: "12px", fontWeight: "700" }}>項目名</label>
              <input style={{ ...s.input, marginBottom: 0 }} value={x.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="例: メールアドレス" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: "700" }}>形式</label>
              <select style={{ ...s.input, marginBottom: 0 }} value={x.type} onChange={e => updateItem(i, "type", e.target.value)}>
                <option value="text">テキスト</option>
                <option value="email">メールアドレス</option>
                <option value="tel">電話番号</option>
                <option value="date">日付</option>
                <option value="number">数値</option>
              </select>
            </div>
            <div style={{ flex: 0.5, textAlign: "center" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", display: "block" }}>必須</label>
              <input type="checkbox" checked={x.required} onChange={e => updateItem(i, "required", e.target.checked)} />
            </div>
            <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={20}/></button>
          </div>
        ))}
        <button onClick={addItem} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, marginBottom: "20px" }}>+ 項目を追加</button>
        <button onClick={save} disabled={load} style={{ ...s.btn, width: "100%" }}>{load ? "同期中..." : "設定を保存してシートへ同期"}</button>
      </div>
    </Page>
  );
}

// --- 新規登録画面 (動的フォーム) ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  const ids = [...new Set(scenarios.map(x => x.シナリオID))];

  useEffect(() => { if(ids.length) setScenarioID(ids[0]); }, [ids]);

  const sub = async (e) => {
    e.preventDefault();
    try {
      await api.post(GAS_URL, { action: "add", data: formData, scenarioID });
      alert("登録完了");
      onRefresh();
      navigate("/");
    } catch (err) { alert("登録エラー"); }
  };

  return (
    <Page title="新規顧客登録" subtitle="設定された項目に基づいてフォームが生成されます">
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={sub}>
          {formSettings.map((item, i) => (
            <div key={i}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>
                {item.name} {item.required && <span style={{ color: THEME.danger }}>*</span>}
              </label>
              <input 
                style={s.input}
                type={item.type}
                required={item.required}
                placeholder={`${item.name}を入力`}
                onChange={e => setFormData({ ...formData, [item.name]: e.target.value })}
              />
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {ids.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%" }}>登録する</button>
        </form>
      </div>
    </Page>
  );
}

// --- 顧客リスト画面 (動的カラム対応) ---
function CustomerList({ customers, scenarios, formSettings, onRefresh }) {
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "delete", id }); onRefresh(); }};
  // 表示する動的カラム（最初の2つまで）
  const dynamicCols = formSettings.slice(0, 2).map(fs => fs.name);

  return (
    <Page title="顧客ダッシュボード" subtitle="最新の配信ステータス一覧">
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}` }}>
            <tr>
              {dynamicCols.map(col => <th key={col} style={{ padding: "20px 24px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700", textAlign: "left" }}>{col}</th>)}
              <th style={{ padding: "20px 24px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700", textAlign: "left" }}>シナリオ</th>
              <th style={{ padding: "20px 24px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700", textAlign: "left" }}>ステータス</th>
              <th style={{ padding: "20px 24px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700", textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>{customers.map((c, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              {dynamicCols.map(col => <td key={col} style={{ padding: "20px 24px", fontWeight: "600" }}>{c[col] || "-"}</td>)}
              <td style={{ padding: "20px 24px" }}>{c.シナリオID}</td>
              <td style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: c.配信ステータス === "停止中" ? THEME.danger : THEME.success }} />
                  {c.配信ステータス}
                </div>
              </td>
              <td style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", gap: "16px", fontWeight: "700" }}>
                  <Link to={`/detail/${c.id}`} style={{ color: THEME.primary, textDecoration: "none" }}>詳細</Link>
                  <Link to={`/edit/${c.id}`} style={{ color: THEME.textMuted, textDecoration: "none" }}>編集</Link>
                  <button onClick={() => del(c.id)} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}>削除</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

// --- 編集画面 (動的フォーム対応) ---
function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const c = customers.find(x => x.id === Number(id));
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("");
  const [scenarioID, setScenarioID] = useState("");
  const ids = [...new Set(scenarios.map(x => x.シナリオID))];

  useEffect(() => {
    if (c) {
      setFormData(c);
      setStatus(c.配信ステータス);
      setScenarioID(c.シナリオID);
    }
  }, [c]);

  const onUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post(GAS_URL, { action: "update", id, data: formData, status, scenarioID });
      await onRefresh(); nav("/");
    } catch(e) { alert("更新失敗"); }
  };

  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="情報の編集">
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={onUpdate}>
          {formSettings.map((item, i) => (
            <div key={i}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{item.name}</label>
              <input 
                style={s.input}
                type={item.type}
                required={item.required}
                value={formData[item.name] || ""}
                onChange={e => setFormData({ ...formData, [item.name]: e.target.value })}
              />
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {ids.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>ステータス</label>
          <select style={s.input} value={status} onChange={e => setStatus(e.target.value)}>
            {["新規受付","予約完了","配信済み","停止中"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%" }}>保存する</button>
        </form>
      </div>
    </Page>
  );
}

// --- ユーザー管理画面 ---
function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]);
  const [load, setLoad] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`);
      setUsers(res.data.users);
    } catch (e) { console.error(e); } finally { setLoad(false); }
  }, [masterUrl]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = modal.mode === "add" ? "addUser" : "editUser";
    try {
      await api.post(masterUrl, { action, company: CLIENT_COMPANY_NAME, ...modal.data });
      setModal({ ...modal, open: false });
      fetchUsers();
    } catch (e) { alert("エラー"); }
  };

  const deleteUser = async (email) => {
    if (!window.confirm("削除しますか？")) return;
    try {
      await api.post(masterUrl, { action: "deleteUser", company: CLIENT_COMPANY_NAME, email });
      fetchUsers();
    } catch (e) { alert("削除失敗"); }
  };

  return (
    <Page title="ユーザー管理" subtitle="アクセス許可メンバーの管理">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
        <button style={s.btn} onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })}><UserPlus size={20} /> 追加</button>
      </div>
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#F8FAFC" }}><th style={{ padding: "16px 24px", textAlign: "left" }}>氏名</th><th style={{ padding: "16px 24px", textAlign: "left" }}>メール</th><th style={{ padding: "16px 24px", textAlign: "left" }}>操作</th></tr></thead>
          <tbody>{users.map((u, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              <td style={{ padding: "16px 24px" }}>{u.name}</td>
              <td style={{ padding: "16px 24px" }}>{u.email}</td>
              <td style={{ padding: "16px 24px" }}><div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{ background: "none", border: "none", color: THEME.primary }}><Edit3 size={18} /></button>
                <button onClick={() => deleteUser(u.email)} style={{ background: "none", border: "none", color: THEME.danger }}><Trash2 size={18} /></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {modal.open && (
        <div style={s.modalOverlay}>
          <div style={{ ...s.card, width: "400px" }}>
            <h3>{modal.mode === "add" ? "メンバー追加" : "編集"}</h3>
            <form onSubmit={handleSubmit}>
              <input style={s.input} placeholder="氏名" required value={modal.data.name} onChange={e => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} />
              <input style={s.input} placeholder="メール" type="email" required value={modal.data.email} onChange={e => setModal({ ...modal, data: { ...modal.data, email: e.target.value } })} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" style={s.btn}>保存</button>
                <button type="button" onClick={() => setModal({ ...modal, open: false })} style={{ ...s.btn, background: THEME.bg, color: THEME.textMain }}>閉じる</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}

// --- シナリオ管理 (既存維持) ---
function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (
    <Page title="シナリオ管理">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}><Link to="/scenarios/new" style={s.btn}>新規作成</Link></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {Object.entries(grouped).map(([id, steps]) => (
          <div key={id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}><h3>{id}</h3><button onClick={() => del(id)} style={{ color: THEME.danger, border: "none", background: "none" }}><Trash2 size={20}/></button></div>
            <Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, width: "100%", background: THEME.bg, color: THEME.textMain }}>編集</Link>
          </div>
        ))}
      </div>
    </Page>
  );
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const navigate = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, message: "" }]);
  useEffect(() => { if (editId && scenarios.length > 0) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数); if (ex.length > 0) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, message: s.message }))); } }, [editId, scenarios]);
  const save = async () => { try { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); await onRefresh(); navigate("/scenarios"); } catch (e) { alert("失敗"); } };
  return (
    <Page title="シナリオ編集">
      <input style={s.input} value={id} onChange={e=>setId(e.target.value)} placeholder="シナリオID" disabled={!!editId} />
      {steps.map((x, i) => (
        <div key={i} style={{ padding: "20px", background: "#F8FAFC", marginBottom: "10px", borderRadius: "10px" }}>
          <label>経過日数</label><input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} />
          <label>メッセージ</label><textarea style={{ ...s.input, height: "80px" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} />
        </div>
      ))}
      <button onClick={() => setSteps([...steps, { elapsedDays: 1, message: "" }])}>+ ステップ追加</button>
      <button onClick={save} style={{ ...s.btn, width: "100%", marginTop: "20px" }}>保存</button>
    </Page>
  );
}

function CustomerDetail({ customers, scenarios }) {
  const { id } = useParams(); const c = customers.find(x => x.id === Number(id));
  if(!c || !scenarios) return <Page title="読み込み中..."><div>Loading...</div></Page>;
  const mySteps = scenarios.filter(s => s.シナリオID === c.シナリオID);
  const calcDate = (reg, d) => { const dt = new Date(reg); dt.setDate(dt.getDate() + Number(d)); return dt.toLocaleDateString('ja-JP'); };
  return (
    <Page title={`${c.顧客氏名 || "詳細"} 様`}>
      <Link to="/" style={{ display: "block", marginBottom: "20px" }}>← 戻る</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {mySteps.map((s, i) => (
          <div key={i} style={{ ...s.card, borderLeft: `6px solid ${THEME.primary}` }}>
            <div style={{ fontWeight: "800", marginBottom: "8px" }}>STEP {s.ステップ数} ({calcDate(c.登録日, s.経過日数)}配信)</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{s.message}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// --- App メイン ---
export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [] });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(null); 
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    if(!user) return;
    try { 
      const res = await axios.get(`${GAS_URL}?mode=api`); 
      setD(res.data); 
    } catch (e) { console.error(e); } finally { setLoad(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleLoginSuccess = async (res) => {
    const decoded = jwtDecode(res.credential);
    setChecking(true);
    try {
      const check = await axios.get(`${MASTER_WHITELIST_API}?action=login&email=${decoded.email}`);
      if (check.data.allowed) { setUser(decoded); } 
      else { alert(`未登録: ${decoded.email}`); }
    } catch (error) { alert("認証エラー"); } finally { setChecking(false); }
  };

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}>
          <div style={{ ...s.card, textAlign: "center", width: "400px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "800" }}>StepFlow Login</h1>
            <p style={{ color: THEME.textMuted, marginBottom: "32px" }}>{checking ? "確認中..." : "ログインしてください"}</p>
            {!checking && <GoogleLogin onSuccess={handleLoginSuccess} useOneTap />}
          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={48} color={THEME.primary} className="animate-spin" /></div>;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div style={{ display: "flex", fontFamily: "Inter, sans-serif" }}>
          <Sidebar onLogout={() => setUser(null)} user={user} />
          <Routes>
            <Route path="/" element={<CustomerList customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/add" element={<CustomerForm scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} scenarios={d.scenarios} />} />
            <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
            <Route path="/form-settings" element={<FormSettings formSettings={d.formSettings} onRefresh={refresh} />} />
            <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} />} />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}