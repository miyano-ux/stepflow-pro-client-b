import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  GripVertical, Save, ArrowLeft, Eye, EyeOff, 
  Search, Loader2, Info, LayoutGrid
} from "lucide-react";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { 
    backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, 
    padding: "16px 20px", display: "flex", gap: "16px", alignItems: "center", 
    marginBottom: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "0.2s" 
  },
  btnPrimary: { 
    backgroundColor: THEME.primary, color: "white", border: "none", padding: "16px 32px", 
    borderRadius: "12px", fontWeight: "900", cursor: "pointer", display: "flex", 
    alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)" 
  }
};

export default function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1. システム必須項目 + 項目設定(formSettings) からマスターリストを作成
    const essential = ["姓", "名", "対応ステータス", "担当者メール", "電話番号", "シナリオID", "登録日"];
    const fromMaster = (formSettings || []).map(f => f.name);
    
    // Setを使用して重複を排除した全項目リスト
    const allNames = Array.from(new Set([...essential, ...fromMaster]));

    // 2. 現在の表示設定をMap化 (重複をこの時点で排除)
    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      if (!currentMap.has(d.name)) {
        currentMap.set(d.name, d);
      }
    });

    // 3. マスターリストに基づいて、現在の設定をマージ。存在しないものは新規追加
    const normalized = allNames.map(name => {
      const existing = currentMap.get(name);
      return {
        name: name,
        visible: existing ? existing.visible : true,
        searchable: existing ? existing.searchable : true
      };
    });

    setItems(normalized);
  }, [displaySettings, formSettings]);

  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const n = [...items];
    const d = n.splice(dragIdx, 1)[0];
    n.splice(i, 0, d);
    setDragIdx(i);
    setItems(n);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // GAS側へは純粋なオブジェクト配列を送信
      await axios.post(gasUrl, 
        JSON.stringify({ action: "saveDisplaySettings", settings: items }), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );
      alert("設定を保存しました。");
      onRefresh();
      navigate("/");
    } catch (e) {
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.main}>
      <header style={{ marginBottom: "40px" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 12 }}>
          <ArrowLeft size={18} /> ダッシュボードへ戻る
        </button>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>表示項目の調整</h1>
      </header>

      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: 32, padding: "20px", backgroundColor: "#EEF2FF", borderRadius: "16px", display: "flex", gap: "16px" }}>
          <Info color={THEME.primary} size={24} />
          <div style={{ fontSize: "14px", color: "#3730A3", fontWeight: "600", lineHeight: "1.5" }}>
            ドラッグ＆ドロップで表示順を並び替え、チェックボックスで表示/非表示を切り替えられます。<br />
            ここでの順序がダッシュボードの左からの並び順になります。
          </div>
        </div>

        <div style={{ marginBottom: 40 }}>
          {items.map((it, i) => (
            <div 
              key={it.name}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              style={{ 
                ...styles.card, 
                opacity: dragIdx === i ? 0.5 : 1,
                border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                backgroundColor: dragIdx === i ? "#F5F3FF" : "white"
              }}
            >
              <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
              <div style={{ flex: 1, fontWeight: "800", color: THEME.textMain }}>{it.name}</div>
              
              <div style={{ display: "flex", gap: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", fontWeight: "700", cursor: "pointer", color: it.visible ? THEME.primary : THEME.textMuted }}>
                  <input type="checkbox" checked={it.visible} onChange={() => { const n = [...items]; n[i].visible = !n[i].visible; setItems(n); }} />
                  {it.visible ? "表示" : "非表示"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", fontWeight: "700", cursor: "pointer", color: it.searchable ? THEME.success : THEME.textMuted }}>
                  <input type="checkbox" checked={it.searchable} onChange={() => { const n = [...items]; n[i].searchable = !n[i].searchable; setItems(n); }} />
                  検索対象
                </label>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving} 
          style={{ ...styles.btnPrimary, width: "100%" }}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />}
          設定を保存してダッシュボードに反映
        </button>
      </div>
    </div>
  );
}