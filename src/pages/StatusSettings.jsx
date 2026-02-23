import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  GripVertical, Trash2, Plus, Save, Info, 
  ArrowLeft, Loader2, ChevronUp
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", warning: "#F59E0B", danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "800px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "16px", display: "flex", gap: "12px", alignItems: "center", transition: "0.2s" },
  input: { flex: 1, border: "none", outline: "none", fontSize: "15px", fontWeight: "700", color: THEME.textMain, padding: "8px 12px", borderRadius: "8px" },
  backBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", fontWeight: "700", marginBottom: "24px", padding: "8px 0" }
};

// 🆕 固定すべき「終着ステータス」の定義
const TERMINAL_NAMES = ["成約", "休眠", "失注"];

export default function StatusSettings({ statuses = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [drag, setDrag] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statuses.length > 0) {
      setItems(statuses.map(s => s.name));
    }
  }, [statuses]);

  // 🆕 並び替え（固定フェーズは動かさない運用も可能ですが、一旦自由移動を保持）
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (drag === null || drag === i) return;
    const n = [...items];
    const d = n.splice(drag, 1)[0];
    n.splice(i, 0, d);
    setDrag(i);
    setItems(n);
  };

  // 🆕 固定フェーズの直前に新規追加するロジック
  const addNewPhase = () => {
    const n = [...items];
    // 最初の「成約・休眠・失注」が出現する位置を探す
    const terminalIdx = n.findIndex(name => TERMINAL_NAMES.includes(name));
    const insertIdx = terminalIdx !== -1 ? terminalIdx : n.length;
    n.splice(insertIdx, 0, "新規フェーズ");
    setItems(n);
  };

  const handleSave = async () => {
    if (items.some(x => !x?.trim())) return alert("空のステータス名があります");
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "saveStatuses", statuses: items }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      await onRefresh();
      alert("保存しました。カンバンに反映されます。");
    } catch (e) { alert("保存失敗"); } finally { setSaving(false); }
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <button onClick={() => navigate("/kanban")} style={styles.backBtn}>
          <ArrowLeft size={18} /> カンバンに戻る
        </button>

        <header style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>ステータス設定</h1>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((it, i) => {
            const isTerminal = TERMINAL_NAMES.includes(it); // 🆕 名前で厳密に判定

            return (
              <div key={i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={() => setDrag(null)}
                style={{ ...styles.card, backgroundColor: drag === i ? "#F5F3FF" : "white", border: drag === i ? `1px solid ${THEME.primary}` : `1px solid ${THEME.border}` }}>
                <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
                <input style={{ ...styles.input, backgroundColor: "transparent" }} value={it} onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n); }} />
                
                {isTerminal ? (
                  <span style={{ fontSize: "10px", fontWeight: "900", padding: "4px 8px", backgroundColor: "#F1F5F9", color: THEME.textMuted, borderRadius: "4px" }}>固定フェーズ</span>
                ) : (
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer" }}>
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 🆕 固定フェーズの上に差し込むボタン */}
        <button onClick={addNewPhase} style={{ width: "100%", height: "56px", marginTop: "24px", borderRadius: "16px", border: `2px dashed ${THEME.border}`, color: THEME.textMuted, fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <Plus size={20}/> 固定フェーズの上に新規フェーズを追加
        </button>

        <button onClick={handleSave} disabled={saving} style={{ width: "100%", height: "60px", marginTop: "40px", borderRadius: "16px", border: "none", backgroundColor: THEME.primary, color: "white", fontSize: "18px", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)" }}>
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />} 設定を保存
        </button>
      </div>
    </div>
  );
}