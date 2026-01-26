import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { LayoutDashboard, UserPlus, Settings, MessageSquare, Trash2, Edit3, ChevronRight, Plus, Minus, Save, Calendar, Eye, Loader2 } from "lucide-react";

// ⚠️ あなたのGAS URL (/exec)
const GAS_URL = "https://script.google.com/macros/s/AKfycbyQOb52pH34LRU-JK06x3eZKA6i5KCF83pTKiw5kFsbH1nnwmMaRBeU3gyhZLrwd1RxMQ/exec"; 

const THEME = {
  primary: "#4F46E5", sidebar: "#0F172A", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444",
};

const s = {
  sidebar: { width: "260px", backgroundColor: THEME.sidebar, color: "white", height: "100vh", position: "fixed", top: 0, left: 0, padding: "32px 24px", boxSizing: "border-box", zIndex: 1000 },
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, boxSizing: "border-box" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden", padding: "32px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${THEME.border}`, fontSize: "15px", marginBottom: "20px", outline: "none", boxSizing: "border-box" },
  btn: { backgroundColor: THEME.primary, color: "white", padding: "14px 28px", borderRadius: "10px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" },
  badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }
};

const api = {
  post: async (data) => {
    const res = await axios.post(GAS_URL, data, { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
  }
};

// --- レイアウト ---
function Sidebar() {
  const l = useLocation();
  const m = [
    { n: "ダッシュボード", p: "/", i: <LayoutDashboard size={20} /> },
    { n: "新規登録", p: "/add", i: <UserPlus size={20} /> },
    { n: "シナリオ管理", p: "/scenarios", i: <Settings size={20} /> },
  ];
  return (
    <div style={s.sidebar}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "22px", fontWeight: "800", marginBottom: "48px" }}>
        <div style={{ backgroundColor: THEME.primary, padding: "8px", borderRadius: "8px" }}><MessageSquare size={22} color="white" /></div> StepFlow
      </div>
      {m.map(x => (
        <Link key={x.p} to={x.p} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", borderRadius: "12px", textDecoration: "none", color: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? "white" : "#94A3B8", backgroundColor: l.pathname === x.p || (x.p !== "/" && l.pathname.startsWith(x.p)) ? THEME.primary : "transparent", marginBottom: "8px", fontWeight: "600" }}>
          {x.i} {x.n}
        </Link>
      ))}
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

// --- 画面：ダッシュボード ---
function CustomerList({ customers, scenarios, onRefresh }) {
  const del = async (id) => { if(window.confirm("削除しますか？")) { await api.post({ action: "delete", id }); onRefresh(); }};
  return (
    <Page title="顧客ダッシュボード" subtitle="配信進捗と顧客ステータスの管理">
      <div style={{ ...s.card, padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}` }}>
            <tr>{["顧客名", "シナリオ", "進捗", "ステータス", "操作"].map(h => <th key={h} style={{ padding: "20px 24px", color: THEME.textMuted, fontSize: "13px", fontWeight: "700" }}>{h}</th>)}</tr>
          </thead>
          <tbody>{customers.map((c, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${THEME.border}` }}>
              <td style={{ padding: "20px 24px", fontWeight: "600" }}>{c.顧客氏名}</td>
              <td style={{ padding: "20px 24px", color: THEME.textMuted }}>{c.シナリオID}</td>
              <td style={{ padding: "20px 24px" }}><span style={{ ...s.badge, backgroundColor: THEME.primaryLight, color: THEME.primary }}>STEP 1</span></td>
              <td style={{ padding: "20px 24px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: c.配信ステータス === "停止中" ? THEME.danger : THEME.success }} />{c.配信ステータス}</div></td>
              <td style={{ padding: "20px 24px" }}><div style={{ display: "flex", gap: "16px", fontWeight: "700", fontSize: "14px" }}>
                <Link to={`/detail/${i}`} style={{ color: THEME.primary, textDecoration: "none" }}>スケジュール</Link>
                <Link to={`/edit/${i}`} style={{ color: THEME.textMuted, textDecoration: "none" }}>編集</Link>
                <button onClick={() => del(i)} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", fontWeight: "700", padding: 0 }}>削除</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

// --- 画面：スケジュール詳細（復旧版） ---
function CustomerDetail({ customers, scenarios }) {
  const { id } = useParams();
  const c = customers[id];
  if(!c || !scenarios) return <Page title="読み込み中..."><div>Loading...</div></Page>;
  const mySteps = scenarios.filter(s => s.シナリオID === c.シナリオID);
  const calcDate = (reg, d) => { const dt = new Date(reg); dt.setDate(dt.getDate() + Number(d)); return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); };
  return (
    <Page title={`${c.顧客氏名} 様`} subtitle="詳細な配信スケジュールとメッセージ内容">
      <Link to="/" style={{ color: THEME.primary, textDecoration: "none", fontWeight: "700", marginBottom: "32px", display: "inline-flex", alignItems: "center", gap: "8px" }}>← 戻る</Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {mySteps.map((s, i) => (
          <div key={i} style={{ ...s.card, borderLeft: `6px solid ${THEME.primary}`, display: "flex", gap: "40px" }}>
            <div style={{ minWidth: "160px" }}>
              <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700", marginBottom: "4px" }}>配信予定日</div>
              <div style={{ fontSize: "18px", fontWeight: "800" }}>{calcDate(c.登録日, s.経過日数)}</div>
              <div style={{ fontSize: "14px", color: THEME.primary, fontWeight: "700", marginTop: "4px" }}>登録から{s.経過日数}日後</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "800", color: THEME.textMuted, marginBottom: "8px" }}>STEP {s.ステップ数}</div>
              <div style={{ fontSize: "15px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{s.message}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// --- 画面：シナリオ一覧（詳細/編集ボタン追加） ---
function ScenarioList({ scenarios, onRefresh }) {
  const grouped = scenarios.reduce((acc, s) => { (acc[s.シナリオID] = acc[s.シナリオID] || []).push(s); return acc; }, {});
  const del = async (id) => { if(window.confirm(`シナリオ「${id}」を削除しますか？`)) { await api.post({ action: "deleteScenario", scenarioID: id }); onRefresh(); }};
  return (
    <Page title="シナリオ管理" subtitle="配信メッセージとスケジュールのマスター設定">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <Link to="/scenarios/new" style={{ ...s.btn, textDecoration: "none" }}><Plus size={20} /> 新規シナリオ作成</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {Object.entries(grouped).map(([id, steps]) => (
          <div key={id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>{id}</h3>
                <span style={{ fontSize: "14px", color: THEME.textMuted, fontWeight: "600" }}>全 {steps.length} ステップ設定済み</span>
              </div>
              <button onClick={() => del(id)} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer" }}><Trash2 size={20}/></button>
            </div>
            <div style={{ display: "flex", gap: "12px", borderTop: `1px solid ${THEME.border}`, paddingTop: "16px" }}>
              <Link to={`/scenarios/edit/${id}`} style={{ ...s.btn, flex: 1, padding: "10px", fontSize: "13px", backgroundColor: THEME.bg, color: THEME.textMain }}>
                <Edit3 size={16} /> 詳細・編集
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// --- 画面：シナリオ作成/編集フォーム（統合版） ---
function ScenarioForm({ scenarios, onRefresh }) {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [steps, setSteps] = useState([{ elapsedDays: 1, message: "" }]);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (editId && scenarios.length > 0) {
      setId(editId);
      const existing = scenarios.filter(s => s.シナリオID === editId).sort((a,b) => a.ステップ数 - b.ステップ数);
      if (existing.length > 0) {
        setSteps(existing.map(s => ({ elapsedDays: s.経過日数, message: s.message })));
      }
    }
  }, [editId, scenarios]);

  const save = async () => {
    if(!id.trim()) return alert("名前を入力してください");
    setLoad(true);
    try {
      await api.post({ action: "saveScenario", scenarioID: id, steps });
      await onRefresh(); navigate("/scenarios");
    } catch (e) { alert("保存失敗"); }
    finally { setLoad(false); }
  };

  return (
    <Page title={editId ? `シナリオの編集: ${editId}` : "新規シナリオ作成"}>
      <Link to="/scenarios" style={{ color: THEME.primary, textDecoration: "none", fontWeight: "700", marginBottom: "24px", display: "inline-flex", alignItems: "center", gap: "8px" }}>← 戻る</Link>
      <div style={{ ...s.card, maxWidth: "700px" }}>
        <label style={{ fontWeight: "800", display: "block", marginBottom: "8px" }}>シナリオ名</label>
        <input style={{ ...s.input, fontSize: "18px", fontWeight: "700" }} value={id} onChange={e=>setId(e.target.value)} disabled={editId} placeholder="シナリオIDを入力" />
        
        {steps.map((x, i) => (
          <div key={i} style={{ backgroundColor: "#F8FAFC", padding: "24px", borderRadius: "12px", marginBottom: "20px", border: `1px solid ${THEME.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ color: THEME.primary, fontWeight: "900" }}>STEP {i+1}</span>
              {steps.length > 1 && <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", fontWeight: "700" }}>削除</button>}
            </div>
            <label style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", display: "block" }}>経過日数（登録日の何日後か）</label>
            <input type="number" style={s.input} value={x.elapsedDays} onChange={e=>{ const n=[...steps]; n[i].elapsedDays=e.target.value; setSteps(n); }} />
            <label style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", display: "block" }}>メッセージ内容</label>
            <textarea style={{ ...s.input, height: "100px", resize: "none" }} value={x.message} onChange={e=>{ const n=[...steps]; n[i].message=e.target.value; setSteps(n); }} />
          </div>
        ))}
        <button onClick={() => setSteps([...steps, { elapsedDays: 1, message: "" }])} style={{ width: "100%", padding: "12px", border: `2px dashed ${THEME.border}`, background: "none", cursor: "pointer", marginBottom: "24px", color: THEME.textMuted, fontWeight: "700" }}>+ ステップ追加</button>
        <button onClick={save} disabled={load} style={{ ...s.btn, width: "100%" }}>{load ? "保存中..." : "保存する"}</button>
      </div>
    </Page>
  );
}

// --- 他（新規登録・顧客編集） ---
function CustomerForm({ scenarios, onRefresh }) {
  const n = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", scenarioID: "" });
  const ids = [...new Set(scenarios.map(x => x.シナリオID))];
  useEffect(() => { if(ids.length && !f.scenarioID) setF(p => ({...p, scenarioID: ids[0]})); }, [ids]);
  const sub = async (e) => { e.preventDefault(); try { await api.post({ action: "add", ...f }); await onRefresh(); n("/"); } catch (err) { alert("登録エラー"); } };
  return (
    <Page title="新規顧客登録">
      <div style={{ ...s.card, maxWidth: "560px" }}>
        <form onSubmit={sub}>
          <input style={s.input} required onChange={e=>setF({...f, name: e.target.value})} placeholder="氏名" />
          <input style={s.input} required onChange={e=>setF({...f, phone: e.target.value})} placeholder="電話番号" />
          <select style={s.input} value={f.scenarioID} onChange={e=>setF({...f, scenarioID: e.target.value})}>
            {ids.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%" }}>登録する</button>
        </form>
      </div>
    </Page>
  );
}

function CustomerEdit({ customers, scenarios, onRefresh }) {
  const { id } = useParams(); const nav = useNavigate(); const c = customers[id];
  const [f, setF] = useState({ name: "", phone: "", status: "", scenarioID: "" });
  const ids = [...new Set(scenarios.map(x => x.シナリオID))];
  useEffect(() => { if (c) setF({ name: c.顧客氏名, phone: c.電話番号, status: c.配信ステータス, scenarioID: c.シナリオID }); }, [c]);
  const onUpdate = async (e) => { e.preventDefault(); try { await api.post({ action: "update", id, ...f }); await onRefresh(); nav("/"); } catch(e) { alert("更新失敗"); } };
  if(!c) return <Page title="Loading..."><div>読み込み中...</div></Page>;
  return (
    <Page title="情報の編集">
      <div style={{ ...s.card, maxWidth: "560px" }}>
        <form onSubmit={onUpdate}>
          <input style={s.input} value={f.name} onChange={e=>setF({...f, name: e.target.value})} />
          <input style={s.input} value={f.phone} onChange={e=>setF({...f, phone: e.target.value})} />
          <select style={s.input} value={f.scenarioID} onChange={e=>setF({...f, scenarioID: e.target.value})}>
            {ids.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
          <select style={s.input} value={f.status} onChange={e=>setF({...f, status: e.target.value})}>
            {["新規受付","予約完了","配信済み","停止中"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" style={{ ...s.btn, width: "100%" }}>保存</button>
        </form>
      </div>
    </Page>
  );
}

export default function App() {
  const [d, setD] = useState({ customers: [], scenarios: [] });
  const [load, setLoad] = useState(true);
  const refresh = useCallback(async () => {
    try { const res = await axios.get(`${GAS_URL}?mode=api`); setD(res.data); } catch (e) { console.error(e); } finally { setLoad(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  if(load) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg, fontFamily: "sans-serif" }}>
      <Loader2 size={48} color={THEME.primary} className="animate-spin" />
      <p style={{ marginTop: "16px", color: THEME.textMuted, fontWeight: "700" }}>データを同期しています...</p>
    </div>
  );

  return (
    <Router>
      <div style={{ display: "flex", fontFamily: "Inter, sans-serif" }}>
        <Sidebar />
        <Routes>
          <Route path="/" element={<CustomerList customers={d.customers} scenarios={d.scenarios} onRefresh={refresh} />} />
          <Route path="/add" element={<CustomerForm scenarios={d.scenarios} onRefresh={refresh} />} />
          <Route path="/edit/:id" element={<CustomerEdit customers={d.customers} scenarios={d.scenarios} onRefresh={refresh} />} />
          <Route path="/detail/:id" element={<CustomerDetail customers={d.customers} scenarios={d.scenarios} />} />
          <Route path="/scenarios" element={<ScenarioList scenarios={d.scenarios} onRefresh={refresh} />} />
          <Route path="/scenarios/new" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
          <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d.scenarios} onRefresh={refresh} />} />
        </Routes>
      </div>
    </Router>
  );
}