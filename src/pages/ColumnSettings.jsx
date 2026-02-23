import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GripVertical, Save, ArrowLeft, Eye, EyeOff, Search, Loader2, Info } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", success: "#10B981" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "16px 20px", display: "flex", gap: "16px", alignItems: "center", marginBottom: "10px", transition: "0.2s" }
};

export default function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 🆕 正規化ロジック：項目設定をマスターとして、表示設定をクリーンアップ
    const essential = ["姓", "名", "対応ステータス", "担当者メール", "電話番号", "シナリオID", "登録日"];
    const masterNames = (formSettings || []).map(f => f.name);
    
    // 全ての「あるべき項目」の重複なきリスト
    const allMasterNames = Array.from(new Set([...essential, ...masterNames]));

    // 現在の「表示設定」を名前をキーにしてMap化（重複を自動排除）
    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      if (!currentMap.has(d.name)) { currentMap.set(d.name, d); }
    });

    // マスターリストをベースに、表示順・設定を再構築
    const normalized = allMasterNames.map(name => {
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
      await axios.post(gasUrl, JSON.stringify({ action: "saveDisplaySettings", settings: items }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      alert("不整合を修正して保存しました。");
      onRefresh(); navigate("/");
    } catch (e) { alert("保存失敗"); } finally { setSaving(false); }
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
            項目設定シートと同期しています。重複は自動的に排除され、新しい項目は末尾に追加されます。
          </div>
        </div>

        {items.map((it, i) => (
          <div key={it.name} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={() => setDragIdx(null)}
            style={{ ...styles.card, opacity: dragIdx === i ? 0.5 : 1, border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}` }}>
            <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
            <div style={{ flex: 1, fontWeight: "800", color: THEME.textMain }}>{it.name}</div>
            <div style={{ display: "flex", gap: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", fontWeight: "700", cursor: "pointer", color: it.visible ? THEME.primary : THEME.textMuted }}>
                <input type="checkbox" checked={it.visible} onChange={() => { const n = [...items]; n[i].visible = !n[i].visible; setItems(n); }} />
                {it.visible ? <Eye size={16}/> : <EyeOff size={16}/>} 表示
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", fontWeight: "700", cursor: "pointer", color: it.searchable ? THEME.success : THEME.textMuted }}>
                <input type="checkbox" checked={it.searchable} onChange={() => { const n = [...items]; n[i].searchable = !n[i].searchable; setItems(n); }} />
                <Search size={16}/> 検索
              </label>
            </div>
          </div>
        ))}

        <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "16px", borderRadius: "12px", backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 32 }}>
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />} 設定を保存して反映
        </button>
      </div>
    </div>
  );
}