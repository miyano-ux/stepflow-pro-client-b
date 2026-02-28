import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  GripVertical, Trash2, Plus, Save, ArrowLeft, 
  Trophy, Moon, Trash, LayoutGrid, CheckCircle2, Loader2
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", warning: "#F59E0B", danger: "#EF4444"
};

// 🆕 ホワイトアウトを防止するため styles を確実に定義
const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "840px", margin: "0 auto" },
  section: { marginBottom: "40px" },
  sectionTitle: { fontSize: "18px", fontWeight: "900", color: THEME.textMain, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "16px", display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  fixedCard: { backgroundColor: "#F1F5F9", borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "20px", display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" },
  input: { flex: 1, border: "1px solid transparent", outline: "none", fontSize: "15px", fontWeight: "700", color: THEME.textMain, padding: "8px 12px", borderRadius: "8px", backgroundColor: "transparent" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", fontWeight: "800", marginBottom: "24px", padding: "8px 0" }
};

export default function StatusSettings({ statuses = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState([]); 
  const [wonLabel, setWonLabel] = useState("成約");
  const [dormantLabel, setDormantLabel] = useState("休眠");
  const [lostLabel, setLostLabel] = useState("失注");
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statuses.length >= 3) {
      const all = statuses.map(s => s.name);
      setLostLabel(all.pop());    
      setDormantLabel(all.pop()); 
      setWonLabel(all.pop());     
      setPipeline(all);           
    }
  }, [statuses]);

  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const n = [...pipeline];
    const d = n.splice(dragIdx, 1)[0];
    n.splice(i, 0, d);
    setDragIdx(i);
    setPipeline(n);
  };

  const handleSave = async () => {
    if (pipeline.some(x => !x.trim()) || !wonLabel.trim() || !dormantLabel.trim() || !lostLabel.trim()) {
      return alert("空の項目があります");
    }
    setSaving(true);
    const finalStatuses = [...pipeline, wonLabel, dormantLabel, lostLabel];
    try {
      await axios.post(gasUrl, 
        JSON.stringify({ action: "saveStatuses", statuses: finalStatuses }), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );
      await onRefresh();
      alert("設定を保存しました。");
    } catch (e) {
      alert("通信エラー");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <button onClick={() => navigate("/kanban")} style={styles.backBtn}>
          <ArrowLeft size={18} /> カンバンに戻る
        </button>

        <header style={{ marginBottom: "48px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>ステータス設定</h1>
        </header>

        <div style={styles.section}>
          <div style={styles.sectionTitle}><LayoutGrid size={20} color={THEME.primary} /> 営業フェーズ（可変）</div>
          {pipeline.map((it, i) => (
            <div key={i} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={() => setDragIdx(null)}
              style={{ ...styles.card, opacity: dragIdx === i ? 0.5 : 1, border: dragIdx === i ? `1px solid ${THEME.primary}` : `1px solid ${THEME.border}` }}>
              <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
              <input style={styles.input} value={it} onChange={e => { const n = [...pipeline]; n[i] = e.target.value; setPipeline(n); }} />
              <button onClick={() => setPipeline(pipeline.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button onClick={() => setPipeline([...pipeline, "新規フェーズ"])} style={{ width: "100%", padding: "16px", borderRadius: "12px", border: `2px dashed ${THEME.border}`, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
            <Plus size={20} /> 新しいフェーズを追加
          </button>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}><CheckCircle2 size={20} color={THEME.success} /> 終着ステータス（固定）</div>
          <div style={styles.fixedCard}>
            <div style={{ backgroundColor: THEME.success, padding: 10, borderRadius: 12, color: "white" }}><Trophy size={24} /></div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", fontWeight: "900", color: THEME.textMuted }}>目的：成約</label>
              <input style={styles.input} value={wonLabel} onChange={e => setWonLabel(e.target.value)} />
            </div>
          </div>
          <div style={styles.fixedCard}>
            <div style={{ backgroundColor: THEME.warning, padding: 10, borderRadius: 12, color: "white" }}><Moon size={24} /></div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", fontWeight: "900", color: THEME.textMuted }}>目的：休眠</label>
              <input style={styles.input} value={dormantLabel} onChange={e => setDormantLabel(e.target.value)} />
            </div>
          </div>
          <div style={styles.fixedCard}>
            <div style={{ backgroundColor: THEME.danger, padding: 10, borderRadius: 12, color: "white" }}><Trash size={24} /></div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", fontWeight: "900", color: THEME.textMuted }}>目的：失注</label>
              <input style={styles.input} value={lostLabel} onChange={e => setLostLabel(e.target.value)} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "20px", borderRadius: "16px", border: "none", backgroundColor: THEME.primary, color: "white", fontSize: "18px", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />} 設定を保存して反映
        </button>
      </div>
    </div>
  );
}