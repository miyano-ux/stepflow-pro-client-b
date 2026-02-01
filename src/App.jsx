import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, 
  Plus, Loader2, LogOut, Users, X, GripVertical, ListFilter, Eye, Calendar, Edit3, Lock
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
  primary: "#4F46E5", primaryLight: "#EEF2FF", sidebar: "#0F172A", 
  bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444",
  locked: "#F1F5F9" // 固定項目用の背景色
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
  actionLink: { fontSize: "13px", fontWeight: "700", color: THEME.primary, textDecoration: "none", cursor: "pointer" },
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
  const [visibleCols, setVisibleCols] = useState(["姓", "名", "電話番号"]);
  const [showColMenu, setShowColMenu] = useState(false);
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "delete", id }); onRefresh(); }};
  return (
    <Page title="顧客ダッシュボード" topButton={
      <div style={{ position: "relative" }}>
        <button onClick={() => setShowColMenu(!showColMenu)} style={{ ...s.btn, background: "white", color: THEME.textMain, border: `1px solid ${THEME.border}` }}><ListFilter size={18} /> 表示項目</button>
        {showColMenu && (
          <div style={{ ...s.popover, width: "220px", padding: "20px" }}>
            <div style={{ fontWeight: "800", marginBottom: "12px", fontSize: "13px" }}>表示列の選択</div>
            {["姓", "名", "電話番号", ...formSettings.map(f => f.name)].map(colName => (
              <label key={colName} style={{ display: "flex", gap: "10px", marginBottom: "10px", cursor: "pointer", fontSize: "14px", color: THEME.textMain }}>
                <input type="checkbox" checked={visibleCols.includes(colName)} onChange={() => setVisibleCols(prev => prev.includes(colName) ? prev.filter(n => n !== colName) : [...prev, colName])} /> {colName}
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
              {visibleCols.map(col => <td key={col} style={{ ...s.tableTd, fontWeight: col === "姓" || col === "名" ? "700" : "400" }}>{c[col] || "-"}</td>)}
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

// --- 画面：新規登録 (姓・名を横並びブロック化) ---
function CustomerForm({ formSettings, scenarios, onRefresh }) {
  const navigate = useNavigate();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => { if(scenarios.length > 0) setScenarioID(scenarios[0].シナリオID); }, [scenarios]);

  const sub = async (e) => {
    e.preventDefault();
    if (!validateTel(phone)) return setErrors({ phone: "正しい電話番号を入力してください" });
    try {
      await api.post(GAS_URL, { action: "add", lastName, firstName, phone, data: formData, scenarioID });
      alert("登録完了"); onRefresh(); navigate("/");
    } catch (err) { alert("登録エラー"); }
  };

  return (
    <Page title="新規顧客登録" topButton={<button onClick={() => navigate("/form-settings")} style={{ ...s.btn, background: THEME.bg, color: THEME.primary, border: `1px solid ${THEME.primary}` }}><ListFilter size={18} /> 項目を調整</button>}>
      <div style={{ ...s.card, maxWidth: "650px" }}>
        <form onSubmit={sub}>
          {/* 姓名：横並びブロック */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "8px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px" }}>姓 <span style={{color: THEME.danger}}>*</span></label>
              <input style={s.input} required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="山田" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px" }}>名 <span style={{color: THEME.danger}}>*</span></label>
              <input style={s.input} required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="太郎" />
            </div>
          </div>

          <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px" }}>電話番号 <span style={{color: THEME.danger}}>*</span></label>
          <input style={{ ...s.input, borderColor: errors.phone ? THEME.danger : THEME.border }} required value={phone} onChange={e => setPhone(e.target.value)} placeholder="09012345678" />
          {errors.phone && <p style={{ color: THEME.danger, fontSize: "12px", marginTop: "-15px", marginBottom: "15px" }}>{errors.phone}</p>}

          <div style={{ borderTop: `1px solid ${THEME.border}`, margin: "10px 0 25px 0", paddingTop: "25px" }}>
            <h4 style={{ margin: "0 0 15px 0", color: THEME.textMuted }}>追加情報</h4>
            {formSettings.map(f => (
              <div key={f.name}>
                <label style={{ fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "14px" }}>{f.name} {f.required && "*"}</label>
                <input style={s.input} type={f.type} required={f.required} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} placeholder={`${f.name}を入力`} />
              </div>
            ))}
          </div>

          <label style={{ fontWeight: "800", display: "block", marginBottom: "8px", fontSize: "14px" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>
            {[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px", marginTop: "20px", fontSize: "16px" }}>顧客を登録する</button>
        </form>
      </div>
    </Page>
  );
}

// --- 画面：項目設定 (固定項目の可視化・上部配置) ---
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
    try { await api.post(GAS_URL, { action: "saveFormSettings", settings: items }); alert("設定を同期しました"); onRefresh(); navigate("/add"); } catch (e) { alert("失敗"); }
  };

  return (
    <Page title="項目の調整" subtitle="基本項目は固定されています。追加項目のみカスタマイズ可能です。">
      <div style={{ maxWidth: "800px" }}>
        
        {/* 🆕 固定項目の表示（ロックされたUI） */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", color: THEME.textMuted, marginBottom: "12px" }}>基本項目（固定）</h4>
          {["姓", "名", "電話番号"].map(fixed => (
            <div key={fixed} style={{ ...s.card, marginBottom: "8px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", backgroundColor: THEME.locked, border: `1px solid ${THEME.border}`, opacity: 0.7 }}>
              <Lock size={18} color={THEME.textMuted} />
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, display: "block" }}>項目名</label>
                <div style={{ fontWeight: "700", color: THEME.textMain }}>{fixed}</div>
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, display: "block" }}>形式</label>
                <div style={{ fontSize: "13px" }}>{fixed === "電話番号" ? "電話番号" : "テキスト"}</div>
              </div>
              <div style={{ minWidth: "50px", textAlign: "center" }}>
                <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, display: "block" }}>必須</label>
                <div style={{ fontSize: "12px", color: THEME.success, fontWeight: "800" }}>固定</div>
              </div>
              <div style={{ width: "36px" }} />
            </div>
          ))}
        </div>

        {/* カスタム項目の表示（DND可能） */}
        <div style={{ marginTop: "40px" }}>
          <h4 style={{ fontSize: "14px", color: THEME.primary, marginBottom: "12px" }}>追加項目（カスタマイズ可）</h4>
          {items.map((x, i) => (
            <div key={i} draggable onDragStart={() => setDragIdx(i)} onDragEnter={() => handleDragEnter(i)} onDragOver={e => e.preventDefault()} 
              style={{ ...s.card, marginBottom: "12px", padding: "16px 24px", display: "flex", gap: "20px", alignItems: "center", cursor: "grab", border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}` }}>
              <GripVertical size={20} color={THEME.border} />
              <div style={{ flex: 2 }}><label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>項目名</label><input style={{ ...s.input, marginBottom: 0 }} value={x.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="例: 住所" /></div>
              <div style={{ flex: 1.5 }}><label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>形式</label><select style={{ ...s.input, marginBottom: 0 }} value={x.type} onChange={e => updateItem(i, "type", e.target.value)}><option value="text">テキスト</option><option value="tel">電話番号</option><option value="email">メール</option><option value="date">日付</option></select></div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "50px" }}><label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted, marginBottom: "8px" }}>必須</label><input type="checkbox" style={{ width: "18px", height: "18px" }} checked={x.required} onChange={e => updateItem(i, "required", e.target.checked)} /></div>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={20}/></button>
            </div>
          ))}
          <button onClick={() => setItems([...items, { name: "", type: "text", required: true }])} style={{ ...s.btn, width: "100%", background: "none", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, marginBottom: "20px" }}>+ 新規項目を追加</button>
          <div style={{ display: "flex", gap: "15px", marginTop: "20px" }}>
            <button onClick={save} style={{ ...s.btn, flex: 2, padding: "16px" }}><Plus size={20} /> 設定を保存して同期</button>
            <button onClick={() => navigate("/add")} style={{ ...s.btn, flex: 1, background: THEME.bg, color: THEME.textMain }}>キャンセル</button>
          </div>
        </div>
      </div>
    </Page>
  );
}

// --- 画面：配信スケジュール ---
function CustomerSchedule({ customers, deliveryLogs, onRefresh }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  const [editingLog, setEditingLog] = useState(null);
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  const myLogs = deliveryLogs ? deliveryLogs.filter(log => String(log.電話番号).replace("'", "") === String(c["電話番号"]).replace("'", "")) : [];
  const handleTimeUpdate = async (logId, newTime) => {
    if (!newTime) return;
    try { await api.post(GAS_URL, { action: "updateDeliveryTime", logId, newTime }); alert("配信時間を変更しました"); setEditingLog(null); onRefresh(); } catch (e) { alert("失敗"); }
  };
  const getStyle = (s) => s === "配信済み" ? {c: THEME.success, b: "#ECFDF5"} : s === "エラー" ? {c: THEME.danger, b: "#FEF2F2"} : {c: THEME.textMuted, b: "#F8FAFC"};
  return (
    <Page title="配信スケジュール" subtitle={`${c["姓"]}${c["名"]} 様への配信状況`}>
      <Link to="/" style={{ display: "block", marginBottom: "24px", color: THEME.primary, fontWeight: "700", textDecoration: "none" }}>← 顧客一覧へ戻る</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {myLogs.length > 0 ? myLogs.map((log, i) => {
          const st = getStyle(log.ステータス);
          return (
            <div key={i} style={{ ...s.card, borderLeft: `6px solid ${st.c}`, padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}><span style={{ ...s.badge, backgroundColor: st.b, color: st.c }}>{log.ステータス}</span><span style={{ fontSize: "12px", color: THEME.textMuted }}>{log.ステップ名}</span></div>
                  <div style={{ fontSize: "18px", fontWeight: "800" }}>{new Date(log.配信予定日時).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {log.ステータス === "配信待ち" && <button onClick={() => setEditingLog(log)} style={{ ...s.actionLink, border: `1px solid ${THEME.primary}`, padding: "6px 12px", borderRadius: "6px" }}>日時を変更</button>}
              </div>
              <div style={{ marginTop: "16px", padding: "16px", background: THEME.bg, borderRadius: "10px", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{log.内容}</div>
            </div>
          );
        }) : <div style={s.card}>データがありません。新しく登録すると生成されます。</div>}
      </div>
      {editingLog && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.card, width: "400px" }}>
            <h3 style={{ marginTop: 0 }}>配信日時の調整</h3>
            <input type="datetime-local" style={{ ...s.input, marginTop: "16px" }} onChange={(e) => setEditingLog({ ...editingLog, temp: e.target.value })} />
            <div style={{ display: "flex", gap: "12px" }}><button onClick={() => handleTimeUpdate(editingLog.ログID, editingLog.temp)} style={{ ...s.btn, flex: 1 }}>変更を保存</button><button onClick={() => setEditingLog(null)} style={{ ...s.btn, flex: 1, background: THEME.bg, color: THEME.textMain }}>キャンセル</button></div>
          </div>
        </div>
      )}
    </Page>
  );
}

// --- 画面：顧客編集 ---
function CustomerEdit({ customers, scenarios, formSettings, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate();
  const c = customers.find(x => x.id === Number(id));
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState({});
  const [scenarioID, setScenarioID] = useState("");

  useEffect(() => {
    if (c) {
      setLastName(c["姓"] || ""); setFirstName(c["名"] || ""); setPhone(c["電話番号"] || "");
      setFormData(c); setScenarioID(c.シナリオID);
    }
  }, [c]);

  const onUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.post(GAS_URL, { action: "update", id, lastName, firstName, phone, data: formData, status: c.配信ステータス, scenarioID });
      onRefresh(); nav("/");
    } catch(e) { alert("失敗"); }
  };
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="顧客情報の編集">
      <div style={s.card}>
        <form onSubmit={onUpdate}>
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}><label style={{ fontWeight: "700" }}>姓</label><input style={s.input} value={lastName} onChange={e => setLastName(e.target.value)} /></div>
            <div style={{ flex: 1 }}><label style={{ fontWeight: "700" }}>名</label><input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
          </div>
          <label style={{ fontWeight: "700" }}>電話番号</label><input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} />
          {formSettings.map(f => (
            <div key={f.name}><label style={{ fontWeight: "700" }}>{f.name}</label><input style={s.input} value={formData[f.name] || ""} onChange={e => setFormData({ ...formData, [f.name]: e.target.value })} /></div>
          ))}
          <label style={{ fontWeight: "700" }}>適用シナリオ</label>
          <select style={s.input} value={scenarioID} onChange={e => setScenarioID(e.target.value)}>{[...new Set(scenarios.map(x => x.シナリオID))].map(id => <option key={id} value={id}>{id}</option>)}</select>
          <button type="submit" style={{ ...s.btn, width: "100%", padding: "16px" }}>変更を保存</button>
        </form>
      </div>
    </Page>
  );
}

// --- シナリオ・詳細・ユーザー管理 (既存維持) ---
function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post(GAS_URL, { action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (
    <Page title="シナリオ管理" topButton={<Link to="/scenarios/new" style={{ ...s.btn, textDecoration: "none" }}><Plus size={18} /> 新規作成</Link>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {Object.entries(grouped).map(([id, steps]) => (
          <div key={id} style={{ ...s.card, padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <div><h3 style={{ margin: 0, fontSize: "18px" }}>{id}</h3><span style={{ fontSize: "13px", color: THEME.textMuted }}>{steps.length} ステップ</span></div>
              <button onClick={() => del(id)} style={{ color: THEME.danger, background: "none", border: "none" }}><Trash2 size={20}/></button>
            </div>
            <Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, width: "100%", background: THEME.bg, color: THEME.textMain, border: `1px solid ${THEME.border}` }}>詳細・編集</Link>
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
  const save = async () => { if(!id) return alert("名前を入力してください"); try { await api.post(GAS_URL, { action: "saveScenario", scenarioID: id, steps }); onRefresh(); navigate("/scenarios"); } catch(e) { alert("失敗"); } };
  return (
    <Page title="シナリオの構成">
      <div style={s.card}>
        <label style={{fontWeight: "800"}}>シナリオ名</label>
        <input style={s.input} value={id} onChange={e=>setId(e.target.value)} disabled={!!editId} placeholder="例: 予約リマインド" />
        {steps.map((x, i) => (
          <div key={i} style={{ padding: "20px", background: "#F8FAFC", marginBottom: "15px", borderRadius: "12px", border: `1px solid ${THEME.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span style={{ fontWeight: "900", color: THEME.primary }}>STEP {i+1}</span>{steps.length > 1 && <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none" }}>削除</button>}</div>
            <label style={{fontSize: "12px"}}>経過日数 (登録日を0とする)</label>
            <input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} />
            <label style={{fontSize: "12px"}}>送信メッセージ</label>
            <textarea style={{ ...s.input, height: "100px", resize: "none" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} />
          </div>
        ))}
        <button onClick={() => setSteps([...steps, { elapsedDays: 1, message: "" }])} style={{ ...s.btn, background: "none", color: THEME.primary, border: `1px solid ${THEME.primary}`, width: "100%", marginBottom: "12px" }}>+ ステップを追加</button>
        <button onClick={save} style={{ ...s.btn, width: "100%" }}>保存</button>
      </div>
    </Page>
  );
}

function CustomerDetail({ customers, formSettings }) {
  const { id } = useParams();
  const c = customers.find(x => x.id === Number(id));
  if(!c) return <Page title="Loading..."><Loader2 className="animate-spin" /></Page>;
  return (
    <Page title="顧客詳細情報">
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", textDecoration: "none", color: THEME.primary, fontWeight: "700" }}>← 戻る</Link>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          {["姓", "名", "電話番号", ...formSettings.map(f => f.name)].map(f => (
            <div key={f} style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>{f}</div>
              <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>{c[f] || "-"}</div>
            </div>
          ))}
          <div style={{ borderBottom: `1px solid ${THEME.border}`, paddingBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700" }}>登録日時</div>
            <div style={{ fontSize: "16px", fontWeight: "600", marginTop: "4px" }}>{c.登録日 ? new Date(c.登録日).toLocaleString() : "-"}</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function UserManager({ masterUrl }) {
  const [users, setUsers] = useState([]);
  const [load, setLoad] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: { name: "", email: "", oldEmail: "" } });
  const fetchUsers = useCallback(async () => { try { const res = await axios.get(`${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`); setUsers(res.data.users); } catch (e) { console.error(e); } finally { setLoad(false); } }, [masterUrl]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const sub = async (e) => { e.preventDefault(); try { await api.post(masterUrl, { action: modal.mode === "add" ? "addUser" : "editUser", company: CLIENT_COMPANY_NAME, ...modal.data }); setModal({ open: false }); fetchUsers(); } catch (e) { alert("エラー"); } };
  return (
    <Page title="ユーザー管理" topButton={<button onClick={() => setModal({ open: true, mode: "add", data: { name: "", email: "" } })} style={s.btn}><Plus size={18} /> 追加</button>}>
      <div style={s.card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#F8FAFC" }}><tr><th style={s.tableTh}>名前</th><th style={s.tableTh}>メール</th><th style={{ ...s.tableTh, textAlign: "right" }}>操作</th></tr></thead>
          <tbody>{users.map((u, i) => (
            <tr key={i}><td style={s.tableTd}>{u.name}</td><td style={s.tableTd}>{u.email}</td><td style={{ ...s.tableTd, textAlign: "right" }}><button onClick={() => setModal({ open: true, mode: "edit", data: { name: u.name, email: u.email, oldEmail: u.email } })}>編集</button></td></tr>
          ))}</tbody>
        </table>
      </div>
      {modal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ ...s.card, width: "400px" }}>
            <h3>{modal.mode === "add" ? "メンバー追加" : "編集"}</h3>
            <form onSubmit={sub}>
              <input style={s.input} value={modal.data.name} onChange={e=>setModal({...modal, data:{...modal.data, name: e.target.value}})} required placeholder="氏名" />
              <input style={s.input} type="email" value={modal.data.email} onChange={e=>setModal({...modal, data:{...modal.data, email: e.target.value}})} required placeholder="メールアドレス" />
              <div style={{ display: "flex", gap: "10px" }}><button type="submit" style={s.btn}>保存</button><button onClick={()=>setModal({open:false})}>閉じる</button></div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}

// --- App メイン ---
export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [], formSettings: [], deliveryLogs: [] });
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
          <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "32px" }}>StepFlow</h1>
          <div style={{ display: "flex", justifyContent: "center" }}><GoogleLogin onSuccess={(res) => setUser(jwtDecode(res.credential))} useOneTap /></div>
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
            <Route path="/schedule/:id" element={<CustomerSchedule customers={d.customers} deliveryLogs={d.deliveryLogs} onRefresh={refresh} />} />
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