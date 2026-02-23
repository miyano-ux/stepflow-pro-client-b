import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Calendar, Clock, Save, Loader2, ArrowLeft } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", marginBottom: "24px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none" }
};

export default function ScenarioForm({ scenarios = [], onRefresh, gasUrl }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [st, setSt] = useState([{ elapsedDays: 1, deliveryHour: 10, message: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id);
      setName(dId);
      const ex = (scenarios || []).filter(item => item["シナリオID"] === dId).sort((a,b)=>a["ステップ数"]-b["ステップ数"]);
      if (ex.length) setSt(ex.map(item => ({ elapsedDays: item["経過日数"], deliveryHour: item["配信時間"], message: item["message"] })));
    }
  }, [id, scenarios]);

  const handleSave = async () => {
    if (!name) return alert("シナリオ名を入力してください");
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "saveScenario", scenarioID: name, steps: st }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      onRefresh();
      navigate("/scenarios");
    } catch (e) { alert("保存失敗"); } finally { setSaving(false); }
  };

  return (
    <div style={styles.main}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <button onClick={() => navigate("/scenarios")} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 8 }}><ArrowLeft size={18}/> 戻る</button>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>{id ? "シナリオ編集" : "新規シナリオ作成"}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ backgroundColor: THEME.primary, color: "white", padding: "14px 28px", borderRadius: "12px", border: "none", fontWeight: "900", cursor: "pointer", display: "flex", gap: 10 }}>
          {saving ? <Loader2 className="animate-spin" /> : <Save size={20}/>} 保存
        </button>
      </header>

      <div style={{ maxWidth: "850px" }}>
        <div style={styles.card}>
          <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>シナリオ名（ID）</label>
          <input style={styles.input} value={name} onChange={e=>setName(e.target.value)} disabled={!!id} placeholder="例：売却反響自動追客" />
        </div>

        {st.map((item, idx) => (
          <div key={idx} style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
            <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontWeight: "900" }}>STEP {idx+1}</span>
              <button onClick={()=>setSt(st.filter((_, i)=>i !== idx))} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={20}/></button>
            </div>
            <div style={{ padding: "32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                <div><label style={{fontWeight:900, fontSize:12, display: "flex", gap: 6, marginBottom: 8}}><Calendar size={14}/> 経過日数</label><input style={styles.input} type="number" value={item.elapsedDays} onChange={e=>{const n=[...st];n[idx].elapsedDays=e.target.value;setSt(n)}}/></div>
                <div><label style={{fontWeight:900, fontSize:12, display: "flex", gap: 6, marginBottom: 8}}><Clock size={14}/> 配信時間</label><input style={styles.input} type="number" value={item.deliveryHour} onChange={e=>{const n=[...st];n[idx].deliveryHour=e.target.value;setSt(n)}}/></div>
              </div>
              <textarea style={{ ...styles.input, height: "140px", resize: "none" }} value={item.message} onChange={e=>{const n=[...st];n[idx].message=e.target.value;setSt(n)}} placeholder="本文..." />
            </div>
          </div>
        ))}

        <button onClick={()=>setSt([...st,{elapsedDays:1,deliveryHour:10,message:""}])} style={{ backgroundColor: "white", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, width: "100%", padding: "24px", borderRadius: "16px", cursor: "pointer", fontWeight: "800", display: "flex", justifyContent: "center", gap: 10 }}>
          <Plus size={24}/> ステップを追加
        </button>
      </div>
    </div>
  );
}