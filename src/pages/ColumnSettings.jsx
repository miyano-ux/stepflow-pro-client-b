import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GripVertical, Eye, EyeOff,
  Search, Loader2, AlertTriangle, CheckCircle2, ArrowLeft
} from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// ⚙️ ColumnSettings - 表示・検索項目設定
// ==========================================
// displaySettings はユーザー個別に localStorage で管理
// GAS への保存は不要（onSaveDisplaySettings 経由で App.jsx に伝える）

const localStyles = {
  main:       { minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card:       { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, padding: "16px 20px", display: "flex", gap: "16px", alignItems: "center", marginBottom: "10px", transition: "all 0.2s", position: "relative" },
  badge:      { fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#EEF2FF", color: THEME.primary, marginLeft: "8px" },
};

export default function ColumnSettings({ displaySettings = [], formSettings = [], onSaveDisplaySettings, onRefresh }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  // マスター同期ロジック: formSettings をマスターとして displaySettings を従属
  useEffect(() => {
    const essential = ["姓", "名", "電話番号", "シナリオID", "登録日", "対応ステータス", "担当者メール"];
    const fromMaster = (formSettings || []).map(f => f.name);
    const allMasterNames = Array.from(new Set([...essential, ...fromMaster]));

    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      if (d.name && !currentMap.has(d.name)) {
        currentMap.set(d.name, { name: d.name, visible: d.visible !== false, searchable: d.searchable !== false });
      }
    });

    const synchronized = allMasterNames.map(name =>
      currentMap.get(name) || { name, visible: true, searchable: true }
    );
    setItems(synchronized);
  }, [displaySettings, formSettings]);

  // ドラッグ＆ドロップ
  const onDragStart = (idx) => setDragIdx(idx);
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const n = [...items];
    const d = n.splice(dragIdx, 1)[0];
    n.splice(i, 0, d);
    setDragIdx(i);
    setItems(n);
  };
  const onDragEnd = () => setDragIdx(null);

  // 保存: GAS不要・localStorage に保存して即反映
  const handleSave = () => {
    setSaving(true);
    try {
      onSaveDisplaySettings(items); // App.jsx の saveDisplaySettings を呼ぶ
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={localStyles.main}>
      <header style={{ marginBottom: "40px" }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 12 }}
        >
          <ArrowLeft size={18} /> ダッシュボードへ戻る
        </button>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
          表示・検索項目の設定
        </h1>
        <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 8 }}>
          設定はあなたのアカウントに個別に保存されます。他のユーザーには影響しません。
        </p>
      </header>

      <div style={{ maxWidth: "800px" }}>
        {/* 説明バナー */}
        <div style={{ marginBottom: 32, padding: "16px 20px", backgroundColor: "#EEF2FF", borderRadius: "14px", display: "flex", gap: "14px", alignItems: "flex-start", border: `1px solid ${THEME.border}` }}>
          <AlertTriangle color={THEME.primary} size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "13px", color: THEME.textMain, lineHeight: "1.6" }}>
            「項目設定」をマスターとして同期しています。ここでの変更は<strong>あなたの画面のみ</strong>に適用されます。
            表示順・表示/非表示・検索対象をカスタマイズできます。
          </div>
        </div>

        {/* 項目リスト */}
        <div style={{ marginBottom: "32px" }}>
          {items.map((it, i) => (
            <div
              key={it.name}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              style={{
                ...localStyles.card,
                opacity: dragIdx === i ? 0.5 : 1,
                border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                backgroundColor: dragIdx === i ? "#F5F3FF" : "white",
                cursor: "grab",
              }}
            >
              <GripVertical size={20} color={THEME.textMuted} />

              <div style={{ flex: 1, fontWeight: "800", color: THEME.textMain, display: "flex", alignItems: "center" }}>
                {it.name}
                {["姓", "電話番号", "対応ステータス"].includes(it.name) && (
                  <span style={localStyles.badge}>必須項目</span>
                )}
              </div>

              <div style={{ display: "flex", gap: "24px" }}>
                <button
                  onClick={() => { const n = [...items]; n[i] = { ...n[i], visible: !n[i].visible }; setItems(n); }}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: "800", fontSize: "13px" }}
                >
                  {it.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  {it.visible ? "表示中" : "非表示"}
                </button>

                <button
                  onClick={() => { const n = [...items]; n[i] = { ...n[i], searchable: !n[i].searchable }; setItems(n); }}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: "800", fontSize: "13px" }}
                >
                  <Search size={18} />
                  {it.searchable ? "検索可" : "検索不可"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>
    </div>
  );
}