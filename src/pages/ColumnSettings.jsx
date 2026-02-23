import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GripVertical, Save, ArrowLeft, Eye, EyeOff, Search, Loader2, Info, AlertTriangle } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", success: "#10B981" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "16px 20px", display: "flex", gap: "16px", alignItems: "center", marginBottom: "10px", transition: "0.2s" },
  btnPrimary: { backgroundColor: THEME.primary, color: "white", border: "none", padding: "16px 32px", borderRadius: "12px", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.4)" }
};

export default function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 🆕 強制正規化ロジック (image_d44cde / image_d4cf86 対策)
    
    // 1. システム必須項目と「項目設定(formSettings)」から、あるべき唯一の項目リストを作成
    const essential = ["姓", "名", "電話番号", "シナリオID", "登録日", "対応ステータス", "担当者メール"];
    const masterNames = (formSettings || []).map(f => f.name);
    
    // 全ての名前をマージし、Setを使って「名前の重複」を物理的に消去
    const allUniqueNames = Array.from(new Set([...essential, ...masterNames]));

    // 2. 現在の「表示設定(displaySettings)」をMap化し、重複を排除して最新設定を保持
    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      // 最初に見つかった設定を優先し、同じ名前の2回目以降は無視することで重複を消去
      if (d.name && !currentMap.has(d.name)) {
        currentMap.set(d.name, {
          name: d.name,
          visible: d.visible === undefined ? true : d.visible,
          searchable: d.searchable === undefined ? true : d.searchable
        });
      }
    });

    // 3. マスターリストを走査し、設定があれば適用、なければデフォルト値で作成
    const normalized = allUniqueNames.map(name => {
      const existing = currentMap.get(name);
      return existing || { name: name, visible: true, searchable: true };
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
    if (!gasUrl || gasUrl === "undefined") return alert("環境変数エラー: gasUrlが未定義です");
    setSaving(true);
    try {
      // 🆕 クリーンな（重複のない）リストをGASへ送信し、シートを上書きさせる
      await axios.post(gasUrl, JSON.stringify({ action: "saveDisplaySettings", settings: items }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      alert("不整合を解消し、正規化された設定を保存しました。");
      onRefresh();
      navigate("/");
    } catch (e) {
      alert("保存失敗。GAS側の実行ログを確認してください。");
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
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>表示・検索項目の正規化</h1>
      </header>

      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: 32, padding: "20px", backgroundColor: "#FEF2F2", borderRadius: "16px", display: "flex", gap: "16px", border: "1px solid #FEE2E2" }}>
          <AlertTriangle color={THEME.danger} size={24} />
          <div style={{ fontSize: "14px", color: "#991B1B", fontWeight: "600", lineHeight: "1.5" }}>
            「項目設定」シートをマスターとして同期しています。<br />
            保存すると、スプレッドシート上の重複行は自動的に1行に統合（クリーニング）されます。
          </div>
        </div>

        {items.map((it, i) => (
          <div key={it.name} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={() => setDragIdx(null)}
            style={{ ...styles.card, opacity: dragIdx === i ? 0.5 : 1, border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`, backgroundColor: dragIdx === i ? "#F5F3FF" : "white" }}>
            <GripVertical size={20} color={THEME.textMuted} style={{ cursor: "grab" }} />
            <div style={{ flex: 1, fontWeight: "800", color: THEME.textMain }}>{it.name}</div>
            <div style={{ display: "flex", gap: "24px" }}>
              <button onClick={() => { const n = [...items]; n[i].visible = !n[i].visible; setItems(n); }} 
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: "700", fontSize: "13px" }}>
                {it.visible ? <Eye size={18} /> : <EyeOff size={18} />} 表示
              </button>
              <button onClick={() => { const n = [...items]; n[i].searchable = !n[i].searchable; setItems(n); }} 
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: "700", fontSize: "13px" }}>
                <Search size={18} /> 検索
              </button>
            </div>
          </div>
        ))}

        <button onClick={handleSave} disabled={saving} style={{ ...styles.btnPrimary, width: "100%", marginTop: "32px" }}>
          {saving ? <Loader2 className="animate-spin" /> : <Save size={22} />} 
          データを修復して保存
        </button>
      </div>
    </div>
  );
}