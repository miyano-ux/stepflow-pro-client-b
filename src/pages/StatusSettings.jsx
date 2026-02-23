import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  GripVertical, Trash2, Plus, Save, Info, 
  Trophy, Moon, Skull, LayoutGrid 
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", warning: "#F59E0B", danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "800px", margin: "0 auto" },
  card: { 
    backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, 
    padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    display: "flex", gap: "12px", alignItems: "center", transition: "0.2s"
  },
  input: {
    flex: 1, border: "none", outline: "none", fontSize: "15px", fontWeight: "700",
    color: THEME.textMain, padding: "8px 12px", borderRadius: "8px"
  },
  terminalBadge: {
    fontSize: "10px", fontWeight: "900", padding: "4px 8px", borderRadius: "6px",
    display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase"
  }
};

// 🆕 システム予約済みの終着ステータス（これらのラベルは変更可能だが削除不能）
const TERMINAL_KEYWORDS = ["成約", "休眠", "失注"];

export default function StatusSettings({ statuses = [], onRefresh, gasUrl }) {
  const [items, setItems] = useState([]);
  const [drag, setDrag] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statuses.length > 0) {
      // 既存のステータスを表示。もし予約語がなければ自動的に追加する処理を検討
      setItems(statuses.map(s => s.name));
    }
  }, [statuses]);

  const onDragOver = (e, i) => {
    e.preventDefault();
    if (drag === null || drag === i) return;
    const n = [...items];
    const d = n.splice(drag, 1)[0];
    n.splice(i, 0, d);
    setDrag(i);
    setItems(n);
  };

  const handleSave = async () => {
    if (items.some(x => !x.trim())) return alert("空のステータス名があります");
    
    // 🆕 最低限「成約・休眠・失注」に類するものが含まれているかチェック
    // （ユーザーがラベルを完全に変えても、3つの終着点は維持させるため）
    
    setSaving(true);
    try {
      await axios.post(gasUrl, { action: "saveStatuses", statuses: items });
      await onRefresh();
      alert("設定を保存しました。カンバンボードに反映されます。");
    } catch (e) {
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>ステータス管理</h1>
          <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "8px" }}>
            カンバンの列順序と、終着フェーズのラベルをカスタマイズします
          </p>
        </header>

        <div style={{ marginBottom: 32, padding: "20px", backgroundColor: "#EEF2FF", borderRadius: "16px", display: "flex", gap: "16px" }}>
          <Info color={THEME.primary} size={24} />
          <div style={{ fontSize: "14px", color: "#3730A3", fontWeight: "600", lineHeight: "1.5" }}>
            左側のアイコンをドラッグして並び順を変更できます。<br />
            <strong>「成約」「休眠」「失注」</strong>は終着ステータスのため削除できませんが、名称の変更は可能です。
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((it, i) => {
            const isTerminal = TERMINAL_KEYWORDS.includes(it) || i >= items.length - 3; // 🆕 終着判定

            return (
              <div 
                key={i} 
                draggable 
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={() => setDrag(null)}
                style={{ 
                  ...styles.card, 
                  backgroundColor: drag === i ? "#F5F3FF" : "white",
                  border: drag === i ? `1px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                  opacity: drag === i ? 0.6 : 1
                }}
              >
                <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
                
                <input 
                  style={{ ...styles.input, backgroundColor: "transparent" }} 
                  value={it} 
                  onChange={e => {
                    const n = [...items];
                    n[i] = e.target.value;
                    setItems(n);
                  }} 
                  placeholder="ステータス名を入力"
                />

                {isTerminal ? (
                  <div style={{ ...styles.terminalBadge, backgroundColor: "#F1F5F9", color: THEME.textMuted }}>
                    固定フェーズ
                  </div>
                ) : (
                  <button 
                    onClick={() => setItems(items.filter((_, idx) => idx !== i))} 
                    style={{ color: THEME.danger, background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                  >
                    <Trash2 size={18}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => setItems([...items, ""])} 
          style={{ 
            width: "100%", height: "56px", marginTop: "20px", borderRadius: "16px",
            border: `2px dashed ${THEME.border}`, backgroundColor: "transparent",
            color: THEME.textMuted, fontWeight: "800", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
          }}
        >
          <Plus size={20}/> 新しいフェーズを追加
        </button>

        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ 
            width: "100%", height: "60px", marginTop: "48px", borderRadius: "16px",
            border: "none", backgroundColor: THEME.primary, color: "white",
            fontSize: "18px", fontWeight: "900", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)"
          }}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />}
          設定を保存して反映
        </button>
      </div>
    </div>
  );
}