import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, X, GripVertical, ListFilter, Check
} from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

// ==========================================
// ⚠️ 設定
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
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000, display: "flex", flexDirection: "column" },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden", padding: "32px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "15px", marginBottom: "20px", outline: "none", boxSizing: "border-box" },
  btn: { backgroundColor: THEME.primary, color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", fontWeight: "700", borderBottom: `1px solid ${THEME.border}`, textAlign: "left" },
  tableTd: { padding: "16px 24px", fontSize: "14px", borderBottom: `1px solid ${THEME.border}` },
  actionLink: { fontSize: "13px", fontWeight: "700", color: THEME.primary, textDecoration: "none", cursor: "pointer" }
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
      <div style={{ marginTop: "auto", borderTop: `1px solid #1E293B`, paddingTop: "20px", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          {user.picture && <img src={user.picture} style={{ width: "32px", height: "32px", borderRadius: "50%" }} alt="" />}
          <span style={{ fontSize: "13px", color: "white", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
        </div>
        <button onClick={onLogout} style={{ ...s.btn, width: "100%", background: "#1E293B", color: "white" }}><LogOut size={16} /> Logout</button>
      </div>
    </div>
  );
}

function Page({ title, subtitle, children, topButton }) {
  return (
    <div style={s.main}><div style={{ padding: "48px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><h1 style={{ fontSize: "32px", fontWeight: "800", color: THEME.textMain }}>{title}</h1>{subtitle && <p style={{ color: THEME.textMuted, marginTop: "8px" }}>{subtitle}</p>}</div>
        {topButton}
      </div>
      {children}
    </div></div>
  );
}

// --- 画面：顧客ダッシュボード ---
function CustomerList({ customers, formSettings, onRefresh }) {
  const [visibleCols, setVisibleCols] = useState(formSettings.length > 0 ? formSettings.slice(0, 2).map(f => f.name) : []);
  const [showColMenu, setShowColMenu] = useState(false);
  
  useEffect(() => {
    if (visibleCols.length === 0 && formSettings.length > 0) {
      setVisibleCols(formSettings.slice(0, 2).map(f => f.name));
    }
  }, [formSettings]);

  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "delete", id }); onRefresh(); }};
  
  return (
    <Page title="顧客ダッシュボード" topButton={
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowColMenu(!showColMenu)} style={{ ...s.btn, background: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` }}><ListFilter size={18} /> 表示項目</button>
        {showColMenu && (
          <div style={{ ...s.popover, width: "220px", padding: "20px" }}>
            <div style={{ fontWeight: "800", marginBottom: "12px", fontSize: "13px" }}>表示列の選択</div>
            {formSettings.map(f => (
              <label key={f.name} style={{ display: "flex", gap: "10px", marginBottom: "10px", cursor: "pointer", fontSize: "14px", color: THEME.textMain }}>
                <input type="checkbox" checked={visibleCols.includes(f.name)} onChange={() => setVisibleCols(prev => prev.includes(f.name) ? prev.filter(n => n !== f.name) : [...prev, f.name])} /> {f.name}
              </label>
            ))}
          </div>
        )}
      </div>
    }>
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#F8FAFC" }}>
            <tr>
              {visibleCols.map(col => <th key={col} style={s.tableTh}>{col}</th>)}
              <th style={s.tableTh}>ステータス</th>
              <th style={{ ...s.tableTh, textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>{customers.map((c, i) => (
            <tr key={i}>
              {visibleCols.map(col => <td key={col} style={{ ...s.tableTd, fontWeight: "600" }}>{c[col] || "-"}</td>)}
              <td style={s.tableTd}><span style={{ ...s.badge, backgroundColor: THEME.primaryLight, color: THEME.primary }}>{c.配信ステータス}</span></td>
              <td style={{ ...s.tableTd, textAlign: "right" }}>
                <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", alignItems: "center" }}>
                  <Link to={`/detail/${c.id}`} style={s.actionLink}>詳細</Link>
                  <Link to={`/schedule/${c.id}`} style={s.actionLink}>スケジュール</Link>
                  <Link to={`/edit/${c.id}`} style={{ ...s.actionLink, color: THEME.textMuted }}>編集</Link>
                  <button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger }}><Trash2 size={18}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

// --- 画面：新規登録 ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  const [errors, setErrors] = useState({});
  useEffect(() => { if(scenarios.length > 0) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);
  const sub = async (e) => {
    e.preventDefault();
    const newErrors = {};
    formSettings.forEach(f => { if (f.type === "tel" && formData[f.name] && !validateTel(formData[f.name])) newErrors[f.name] = "電話番号が正しくありません"; });
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
    try { await api.post(GAS_URL, { action: "add", data: formData, scenarioID }); onRefresh(); navigate("/"); } catch (err) { alert("エラー"); }
  };
  return (
    <Page title="新規顧客登録" topButton={<button onClick={() => navigate("/form-settings")} style={{ ...s.btn, background: THEME.bg, color: THEME.primary, border: `1px solid ${THEME.primary}` }}><ListFilter size={18} /> 項目調整</button>}>
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={sub}>
          {formSettings.map(f => (
            <div key={f.name}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{f.name} {f.required && "*"}</label>
              <input style={{ ...s.input, borderColor: errors[f.name] ? THEME.danger : THEME.border }} type={f.type} required={f.required} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} placeholder={`${f.name}を入力`} />
              {errors[f.name] && <p style={{ color: THEME.danger, fontSize: "12px", marginTop: "-15px", marginBottom: "15px" }}>{errors[f.name]}</p>}
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px" }}>登録する</button>
        </form>
      </div>
    </Page>
  );
}

// --- 画面：項目設定 (Googleフォーム風DND) ---
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
    <Page title="項目の調整" subtitle="ドラッグして並び替え、保存すると即座に反映されます">
      <div style={{ maxWidth: "700px" }}>
        {items.map((x, i) => (
          <div key={i} draggable onDragStart={() => setDragIdx(i)} onDragEnter={() => handleDragEnter(i)} onDragOver={e => e.preventDefault()} style={{ ...s.card, marginBottom: "12px", padding: "16px", display: "flex", gap: "12px", alignItems: "center", cursor: "grab", border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}` }}>
            <GripVertical size={20} color={THEME.border} />
            <input style={{ ...s.input, marginBottom: 0, flex: 2 }} value={x.name} onChange={e => updateItem(i, "name", e.target.value)} />
            <select style={{ ...s.input, marginBottom: 0, flex: 1 }} value={x.type} onChange={e => updateItem(i, "type", e.target.value)}>
              <option value="text">テキスト</option><option value="tel">電話番号</option><option value="email">メール</option><option value="date">日付</option>
            </select>
            <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={20}/></button>
          </div>
        ))}
        <button onClick={() => setItems([...items, { name: "", type: "text", required: true }])} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, marginBottom: "20px" }}>+ 新規項目追加</button>
        <button onClick={save} style={{ ...s.btn, width: "100%" }}>保存してシートへ同期</button>
      </div>
    </Page>
  );
}

// --- 画面：顧客詳細 (全項目表示) ---
function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="顧客詳細情報">
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", textDecoration: "none", color: THEME.primary, fontWeight: "700" }}>← 一覧へ戻る</Link>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          {formSettings.map(f => (
            <div key={f.name} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>{f.name}</div>
              <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px", color: THEME.textMain }}>{c[f.name] || "-"}</div>
            </div>
          ))}
          <div style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>登録日</div>
            <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px", color: THEME.textMain }}>{c.登録日 ? new Date(c.登録日).toLocaleString('ja-JP') : "-"}</div>
          </div>
          <div style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>現在のステータス</div>
            <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px", color: THEME.primary }}>{c.配信ステータス}</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// --- 画面：配信スケジュール (不具合修正版) ---
function CustomerSchedule({ customers, scenarios }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c || !scenarios) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  
  const mySteps = scenarios.filter(s => s.シナリオID === c.シナリオID).sort((a,b) => a.ステップ数 - b.ステップ数);
  
  const calcDate = (regStr, days) => {
    if (!regStr) return "日付不明";
    const dt = new Date(regStr);
    dt.setDate(dt.getDate() + Number(days));
    return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <Page title="配信スケジュール" subtitle={`${c[Object.keys(c)[1]] || "顧客"} 様へのスケジュール`}>
      <Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, fontWeight: "700", textDecoration: "none" }}>← 一覧へ戻る</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {mySteps.length > 0 ? mySteps.map((st, i) => (
          <div key={i} style={{ ...s.card, borderLeft: `6px solid ${THEME.primary}`, display: "flex", gap: "40px" }}>
            <div style={{ minWidth: "180px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>配信予定日</div>
              <div style={{ fontSize: "18px", fontWeight: "800" }}>{calcDate(c.登録日, st.経過日数)}</div>
              <div style={{ fontSize: "13px", color: THEME.primary, marginTop: "4px", fontWeight: "600" }}>登録から {st.経過日数} 日後</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700", marginBottom: "8px" }}>STEP {st.ステップ数} メッセージ</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: "15px", lineHeight: "1.6", color: THEME.textMain }}>{st.message}</div>
            </div>
          </div>
        )) : <div style={s.card}>このシナリオには配信ステップが設定されていません。</div>}
      </div>
    </Page>
  );
}

// --- 画面：顧客情報編集 (ステータス編集の削除版) ---
function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const c = customers.find(x => x.id === Number(id));
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  
  useEffect(() => {
    if (c) { setFormData(c); setScenarioID(c.シナリオID); }
  }, [c]);

  const onUpdate = async (e) => {
    e.preventDefault();
    try {
      // 配信ステータスは既存のものを維持
      await api.post(GAS_URL, { action: "update", id, data: formData, status: c.配信ステータス, scenarioID });
      onRefresh(); nav("/");
    } catch(e) { alert("更新に失敗しました"); }
  };
  
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  
  return (
    <Page title="情報の編集" subtitle="動的項目の内容のみ修正可能です（ステータスは自動管理されます）">
      <div style={{ ...s.card, maxWidth: "600px" }}>
        <form onSubmit={onUpdate}>
          {formSettings.map(f => (
            <div key={f.name}>
              <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>{f.name}</label>
              <input style={s.input} type={f.type} value={formData[f.name] || ""} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} placeholder={`${f.name}を修正`} />
            </div>
          ))}
          <label style={{ fontWeight: "700", display: "block", marginBottom: "8px" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px" }}>保存する</button>
        </form>
      </div>
    </Page>
  );
}

// --- 画面：シナリオ管理 (デザイン復旧) ---
function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm("このシナリオを削除しますか？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (
    <Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{ ...s.btn, textDecoration: "none" }}><Plus size={18} /> 新規シナリオ作成</Link>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {Object.entries(grouped).map(([id, steps]) => (
          <div key={id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div><h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>{id}</h3><span style={{ fontSize: "13px", color: THEME.textMuted, fontWeight: "600" }}>{steps.length} ステップ設定済み</span></div>
              <button onClick={() => del(id)} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={20}/></button>
            </div>
            <Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, width: "100%", background: THEME.bg, color: THEME.textMain, textDecoration: "none", border: `1px solid ${THEME.border}` }}>詳細・編集</Link>
          </div>
        ))}
      </div>
    </Page>
  );
}

function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams(); const navigate = useNavigate();
  const [id, setId] = useState(""); const [steps, setSteps] = useState([{ elapsedDays: 1, message: "" }]);
  useEffect(() => { if (editId) { setId(editId); const ex = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数); if (ex.length) setSteps(ex.map(s => ({ elapsedDays: s.経過日数, message: s.message }))); } }, [editId, scenarios]);
  const save = async () => { try { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); onRefresh(); navigate("/scenarios"); } catch(e) { alert("保存に失敗しました"); } };
  return (
    <Page title={editId ? "シナリオ編集" : "新規シナリオ作成"}>
      <Link to="/scenarios" style={{ display: "block", marginBottom: "24px", color: THEME.primary, fontWeight: "700", textDecoration: "none" }}>← 戻る</Link>
      <div style={{ ...s.card, maxWidth: "700px" }}>
        <label style={{ fontWeight: "800", display: "block", marginBottom: "8px" }}>シナリオID</label>
        <input style={s.input} value={id} onChange={e=>setId(e.target.value)} placeholder="例: 予約フォロー" disabled={!!editId} />
        {steps.map((x, i) => (
          <div key={i} style={{ padding: "20px", background: "#F8FAFC", marginBottom: "15px", borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span style={{ fontWeight: "900", color: THEME.primary, fontSize: "13px" }}>STEP {i+1}</span>{steps.length > 1 && <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "12px" }}>削除</button>}</div>
            <label style={{ fontSize: "13px", fontWeight: "700", display: "block", marginBottom: "4px" }}>経過日数</label>
            <input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} />
            <label style={{ fontSize: "13px", fontWeight: "700", display: "block", marginBottom: "4px" }}>メッセージ内容</label>
            <textarea style={{ ...s.input, height: "100px", resize: "none" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} />
          </div>
        ))}
        <button onClick={() => setSteps([...steps, { elapsedDays: 1, message: "" }])} style={{ ...s.btn, background: "none", color: THEME.primary, border: `1px solid ${THEME.primary}`, width: "100%", marginBottom: "12px" }}>+ ステップ追加</button>
        <button onClick={save} style={{ ...s.btn, width: "100%" }}>設定を保存する</button>
      </div>
    </Page>
  );
}

// --- 画面：ユーザー管理 (デザイン復旧版) ---
function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]);
  const [load, setLoad] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } });
  const fetchUsers = useCallback(async () => { try { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res.data.users); } catch (e) { console.error(e); } finally { setLoad(false); } }, [masterUrl]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const sub = async (e) => { e.preventDefault(); try { await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } }); fetchUsers(); } catch (e) { alert("エラー"); } };
  const del = async (email) => { if(window.confirm("このユーザーのアクセス権を削除しますか？")) { try { await api.post(masterUrl, { action: "deleteUser", company: CLIENT_COMPANY_NAME, email }); fetchUsers(); } catch (e) { alert("失敗"); } } };
  return (
    <Page title="ユーザー管理" subtitle="アプリへログインできるメンバーの管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "", oldEmail: "" } })} style={s.btn}><Plus size={18} /> メンバーを追加</button>}>
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#F8FAFC" }}>
            <tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メールアドレス</th><th style={{ ...s.tableTh, textAlign: "right" }}>操作</th></tr>
          </thead>
          <tbody>{users.map((u, i) => (
            <tr key={i}>
              <td style={{ ...s.tableTd, fontWeight: "700" }}>{u.name}</td>
              <td style={s.tableTd}>{u.email}</td>
              <td style={{ ...s.tableTd, textAlign: "right" }}>
                <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
                  <button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })} style={{ ...s.actionLink, border: "none", background: "none", padding: 0 }}>編集</button>
                  <button onClick={() => del(u.email)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger }}><Trash2 size={18}/></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {load && <div style={{ padding: "40px", textAlign: "center" }}><Loader2 size={32} className="animate-spin" color={THEME.primary} /></div>}
      </div>
      {modal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.card, width: "450px", position: "relative" }}>
            <button onClick={()=>setModal({open:false})} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
            <h3 style={{ marginTop: 0, marginBottom: "24px", fontSize: "20px" }}>{modal.mode === "add" ? "メンバーの新規追加" : "メンバー情報の編集"}</h3>
            <form onSubmit={sub}>
              <label style={{ fontSize: "14px", fontWeight: "700", display: "block", marginBottom: "8px" }}>名前</label>
              <input style={s.input} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} required placeholder="山田 太郎" />
              <label style={{ fontSize: "14px", fontWeight: "700", display: "block", marginBottom: "8px" }}>メールアドレス</label>
              <input style={s.input} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} required placeholder="example@gmail.com" />
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="submit" style={{ ...s.btn, flex: 1 }}>{modal.mode === "add" ? "追加する" : "更新する"}</button>
                <button type="button" onClick={()=>setModal({open:false})} style={{ ...s.btn, flex: 1, background: THEME.bg, color: THEME.textMain }}>キャンセル</button>
              </div>
            </form>
          </div>
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
        <div style={{ ...s.card, textAlign: "center", width: "400px", padding: "48px" }}>
          <div style={{ backgroundColor: THEME.primary, width: "56px", height: "56px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}><MessageSquare color="white" size={32} /></div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>StepFlow</h1>
          <p style={{ color: THEME.textMuted, marginBottom: "32px" }}>管理者アカウントでログイン</p>
          <GoogleLogin onSuccess={(res) => setUser(jwtDecode(res.credential))} useOneTap />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
  if(load) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}><Loader2 size={48} color={THEME.primary} className="animate-spin" /></div>;
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div style={{ display: "flex", fontFamily: "Inter, sans-serif" }}>
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