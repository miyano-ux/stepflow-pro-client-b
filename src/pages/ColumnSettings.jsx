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

const localStyles = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card:    { backgroundColor: "white", borderRadius: "12px", border: `1px solid ${THEME.border}`, padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center", marginBottom: "8px", transition: "all 0.2s", position: "relative" },
  badge:   { fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#EEF2FF", color: THEME.primary, marginLeft: "8px" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" },
};

// 営業管理系固定項目（内部キー → 表示ラベル）
const SALES_FIELDS = [
  { key: "対応ステータス", label: "対応ステータス" },
  { key: "流入元",         label: "流入元" },
  { key: "担当者メール",   label: "担当者" },
  { key: "シナリオID",     label: "適用シナリオ" },
];
const SALES_KEYS = SALES_FIELDS.map(f => f.key);

// デフォルト項目（姓・名・電話番号・登録日・メールアドレス）
const DEFAULT_FIELDS = ["氏名", "電話番号", "登録日", "メールアドレス"];

// 必須バッジを付ける項目
const REQUIRED_KEYS = ["姓", "電話番号", "対応ステータス"];

// 内部キーから表示ラベルを返す
const getLabel = (key) => SALES_FIELDS.find(f => f.key === key)?.label || key;

export default function ColumnSettings({ displaySettings = [], formSettings = [], onSaveDisplaySettings }) {
  const navigate = useNavigate();

  // セクションごとの items
  const [salesItems,   setSalesItems]   = useState([]);
  const [defaultItems, setDefaultItems] = useState([]);
  const [customItems,  setCustomItems]  = useState([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      if (d.name) currentMap.set(d.name, { visible: d.visible !== false, searchable: d.searchable !== false });
    });

    const toItem = (key) => ({
      key,
      visible:    currentMap.get(key)?.visible    ?? true,
      searchable: currentMap.get(key)?.searchable ?? true,
    });

    // ① 営業管理：固定順
    setSalesItems(SALES_KEYS.map(toItem));

    // ② デフォルト項目：固定順（姓・名は氏名として統合表示）
    // displaySettings に "姓" または "名" がある場合は "氏名" の visible/searchable に使う
    const fullNameVisible    = currentMap.get("姓")?.visible    ?? currentMap.get("氏名")?.visible    ?? true;
    const fullNameSearchable = currentMap.get("姓")?.searchable ?? currentMap.get("氏名")?.searchable ?? true;
    setDefaultItems(DEFAULT_FIELDS.map(k =>
      k === "氏名"
        ? { key: "氏名", visible: fullNameVisible, searchable: fullNameSearchable }
        : toItem(k)
    ));

    // ③ カスタム項目：formSettings の順
    const customKeys = (formSettings || [])
      .map(f => f.name)
      .filter(n => !SALES_KEYS.includes(n) && !DEFAULT_FIELDS.includes(n));
    setCustomItems(customKeys.map(toItem));

  }, [displaySettings, formSettings]);

  // 保存：3セクションをまとめて onSaveDisplaySettings に渡す
  const handleSave = () => {
    setSaving(true);
    try {
      // 「氏名」仮想列を 姓・名 の両方として展開して保存
    const expanded = [...salesItems, ...defaultItems, ...customItems].flatMap(it => {
      if (it.key === "氏名") return [
        { name: "姓",  visible: it.visible, searchable: it.searchable },
        { name: "名",  visible: it.visible, searchable: it.searchable },
      ];
      return [{ name: it.key, visible: it.visible, searchable: it.searchable }];
    });
    const merged = expanded;
      onSaveDisplaySettings(merged);
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  // ── セクションの行レンダリング ──────────────────
  const renderRow = (it, setItems, idx, draggable = false) => (
    <div
      key={it.key}
      style={{
        ...localStyles.card,
        cursor: draggable ? "grab" : "default",
      }}
    >
      {draggable
        ? <GripVertical size={18} color={THEME.border} />
        : <div style={{ width: 18 }} />}

      <div style={{ flex: 1, fontWeight: 800, color: THEME.textMain, display: "flex", alignItems: "center", fontSize: 14 }}>
        {getLabel(it.key)}
        {REQUIRED_KEYS.includes(it.key) && (
          <span style={localStyles.badge}>必須項目</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <button
          onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, visible: !x.visible } : x))}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
        >
          {it.visible ? <Eye size={17} /> : <EyeOff size={17} />}
          {it.visible ? "表示中" : "非表示"}
        </button>
        <button
          onClick={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, searchable: !x.searchable } : x))}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
        >
          <Search size={17} />
          {it.searchable ? "検索可" : "検索不可"}
        </button>
      </div>
    </div>
  );

  // カスタム項目のドラッグ
  const [dragIdx, setDragIdx] = useState(null);
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const n = [...customItems];
    const d = n.splice(dragIdx, 1)[0];
    n.splice(i, 0, d);
    setDragIdx(i);
    setCustomItems(n);
  };
  const onDragEnd = () => setDragIdx(null);

  return (
    <div style={localStyles.main}>
      <header style={{ marginBottom: 40 }}>
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 12 }}
        >
          <ArrowLeft size={18} /> ダッシュボードへ戻る
        </button>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: 0 }}>
          表示・検索項目の設定
        </h1>
        <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 8 }}>
          設定はあなたのアカウントに個別に保存されます。他のユーザーには影響しません。
        </p>
      </header>

      <div style={{ maxWidth: 800 }}>
        {/* 説明バナー */}
        <div style={{ marginBottom: 32, padding: "16px 20px", backgroundColor: "#EEF2FF", borderRadius: 14, display: "flex", gap: 14, alignItems: "flex-start", border: `1px solid ${THEME.border}` }}>
          <AlertTriangle color={THEME.primary} size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: THEME.textMain, lineHeight: 1.6 }}>
            「項目設定」をマスターとして同期しています。ここでの変更は<strong>あなたの画面のみ</strong>に適用されます。
            表示順・表示/非表示・検索対象をカスタマイズできます。
          </div>
        </div>

        {/* ① 営業管理項目 */}
        <div style={localStyles.section}>
          <p style={localStyles.sectionTitle}>① 営業管理項目</p>
          {salesItems.map((it, i) => renderRow(it, setSalesItems, i, false))}
        </div>

        {/* ② デフォルト項目 */}
        <div style={localStyles.section}>
          <p style={localStyles.sectionTitle}>② デフォルト項目</p>
          {defaultItems.map((it, i) => renderRow(it, setDefaultItems, i, false))}
        </div>

        {/* ③ カスタム項目 */}
        <div style={localStyles.section}>
          <p style={localStyles.sectionTitle}>③ カスタム項目</p>
          {customItems.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: THEME.textMuted, fontSize: 13, border: `1.5px dashed ${THEME.border}`, borderRadius: 12 }}>
              カスタム項目はまだ登録されていません
            </div>
          ) : (
            customItems.map((it, i) => (
              <div
                key={it.key}
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
                <GripVertical size={18} color={THEME.textMuted} />
                <div style={{ flex: 1, fontWeight: 800, color: THEME.textMain, fontSize: 14 }}>{it.key}</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <button
                    onClick={() => setCustomItems(prev => prev.map((x, j) => j === i ? { ...x, visible: !x.visible } : x))}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
                  >
                    {it.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                    {it.visible ? "表示中" : "非表示"}
                  </button>
                  <button
                    onClick={() => setCustomItems(prev => prev.map((x, j) => j === i ? { ...x, searchable: !x.searchable } : x))}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
                  >
                    <Search size={17} />
                    {it.searchable ? "検索可" : "検索不可"}
                  </button>
                </div>
              </div>
            ))
          )}
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