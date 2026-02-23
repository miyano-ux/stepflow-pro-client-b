import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, Calendar, Save, Loader2, ArrowLeft, MessageSquare } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", marginBottom: "32px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", transition: "0.2s" },
  label: { display: "block", fontSize: "13px", fontWeight: "900", color: THEME.textMuted, marginBottom: "8px" },
  btn: { padding: "12px 24px", borderRadius: "12px", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: "none" }
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
      const ex = (scenarios || [])
        .filter(item => item["シナリオID"] === dId)
        .sort((a, b) => a["ステップ数"] - b["ステップ数"]);
      if (ex.length) {
        setSt(ex.map(item => ({
          elapsedDays: item["経過日数"],
          deliveryHour: item["配信時間"],
          message: item["message"]
        })));
      }
    }
  }, [id, scenarios]);

  const handleSave = async () => {
    if (!name) return alert("シナリオIDを入力してください");
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({
        action: "saveScenario",
        scenarioID: name,
        steps: st
      }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      onRefresh();
      navigate("/scenarios");
    } catch (e) {
      alert("保存に失敗しました: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.main}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <button onClick={() => navigate("/scenarios")} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 8 }}>
            <ArrowLeft size={18} /> 一覧に戻る
          </button>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
            {id ? "シナリオ編集" : "新規シナリオ作成"}
          </h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ ...styles.btn, backgroundColor: THEME.primary, color: "white" }}>
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
          設定を保存
        </button>
      </header>

      <div style={{ maxWidth: "850px" }}>
        <div style={styles.card}>
          <label style={styles.label}>シナリオID（識別名称）</label>
          <input 
            style={{ ...styles.input, fontSize: "18px", fontWeight: "700" }} 
            value={name} 
            onChange={e => setName(e.target.value)} 
            disabled={!!id} 
            placeholder="例：売却反響自動追客" 
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {st.map((item, idx) => (
            <div key={idx} style={{ ...styles.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: "900", fontSize: "14px" }}>STEP {idx + 1}</span>
                <button onClick={() => setSt(st.filter((_, i) => i !== idx))} style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 size={20} />
                </button>
              </div>
              <div style={{ padding: "32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
                  <div>
                    <label style={styles.label}><Calendar size={14} /> 配信タイミング</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...styles.input, fontWeight: 700 }} type="number" value={item.elapsedDays} onChange={e => { const n = [...st]; n[idx].elapsedDays = e.target.value; setSt(n); }} />
                      <span style={{ position: "absolute", right: 16, top: 12, color: THEME.textMuted, fontSize: "14px" }}>日後</span>
                    </div>
                  </div>
                  <div>
                    <label style={styles.label}><Clock size={14} /> 配信時間</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...styles.input, fontWeight: 700 }} type="number" min="0" max="23" value={item.deliveryHour} onChange={e => { const n = [...st]; n[idx].deliveryHour = e.target.value; setSt(n); }} />
                      <span style={{ position: "absolute", right: 16, top: 12, color: THEME.textMuted, fontSize: "14px" }}>時頃</span>
                    </div>
                  </div>
                </div>
                <label style={styles.label}><MessageSquare size={14} /> SMS本文</label>
                <textarea 
                  style={{ ...styles.input, height: "140px", resize: "none", lineHeight: "1.6" }} 
                  value={item.message} 
                  onChange={e => { const n = [...st]; n[idx].message = e.target.value; setSt(n); }} 
                  placeholder="メッセージ本文を入力..." 
                />
                <div style={{ textAlign: "right", marginTop: 10, fontSize: "12px", fontWeight: "800", color: item.message.length > 70 ? THEME.danger : THEME.textMuted }}>
                  {item.message.length}文字 {item.message.length > 70 && "⚠️ 70文字超（長文SMS料金適用）"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setSt([...st, { elapsedDays: 1, deliveryHour: 10, message: "" }])} 
          style={{ ...styles.btn, backgroundColor: "white", border: `2px dashed ${THEME.border}`, width: "100%", height: "64px", justifyContent: "center", marginTop: "24px", color: THEME.textMuted }}
        >
          <Plus size={24} /> 新しいステップを追加
        </button>
      </div>
    </div>
  );
}