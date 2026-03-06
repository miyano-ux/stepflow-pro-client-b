import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GripVertical, Eye, EyeOff,
  Search, Loader2, CheckCircle2, ArrowLeft
} from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// ⚙️ ColumnSettings - 表示・検索項目設定
// ==========================================

const localStyles = {
  main:  { minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card:  { backgroundColor: "white", borderRadius: "12px", border: `1px solid ${THEME.border}`, padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center", marginBottom: "8px", transition: "all 0.15s", position: "relative" },
  badge: { fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#EEF2FF", color: THEME.primary, marginLeft: "8px" },
};

// セクションタイトルのスタイル
const SectionTitle = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
    <span style={{ fontSize: 15, fontWeight: 900, color: THEME.textMain, letterSpacing: "-0.01em" }}>
      {children}
    </span>
    <div style={{ flex: 1, height: 1, backgroundColor: THEME.border }} />
  </div>
);

// 営業管理系固定項目（内部キー → 表示ラベル）
const SALES_FIELDS = [
  { key: "対応ステータス", label: "対応ステータス" },
  { key: "流入元",         label: "流入元" },
  { key: "担当者メール",   label: "担当者" },
  { key: "シナリオID",     label: "適用シナリオ" },
];
const SALES_KEYS = SALES_FIELDS.map(f => f.key);

const DEFAULT_FIELDS = ["氏名", "電話番号", "登録日", "メールアドレス"];
const REQUIRED_KEYS  = ["氏名", "電話番号", "対応ステータス"];
const getLabel = (key) => SALES_FIELDS.find(f => f.key === key)?.label || key;

// ドラッグ可能な汎用行コンポーネント
const DraggableRow = ({ it, idx, dragIdx, onDragStart, onDragOver, onDragEnd, onToggleVisible, onToggleSearchable }) => (
  <div
    draggable
    onDragStart={() => onDragStart(idx)}
    onDragOver={(e) => onDragOver(e, idx)}
    onDragEnd={onDragEnd}
    style={{
      ...localStyles.card,
      cursor: "grab",
      opacity: dragIdx === idx ? 0.45 : 1,
      border: dragIdx === idx ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
      backgroundColor: dragIdx === idx ? "#F5F3FF" : "white",
    }}
  >
    <GripVertical size={18} color={THEME.textMuted} style={{ flexShrink: 0 }} />
    <div style={{ flex: 1, fontWeight: 800, color: THEME.textMain, fontSize: 14, display: "flex", alignItems: "center" }}>
      {getLabel(it.key)}
      {REQUIRED_KEYS.includes(it.key) && (
        <span style={localStyles.badge}>必須項目</span>
      )}
    </div>
    <div style={{ display: "flex", gap: 20 }}>
      <button
        onClick={onToggleVisible}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
      >
        {it.visible ? <Eye size={17} /> : <EyeOff size={17} />}
        {it.visible ? "表示中" : "非表示"}
      </button>
      <button
        onClick={onToggleSearchable}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: 800, fontSize: 13 }}
      >
        <Search size={17} />
        {it.searchable ? "検索可" : "検索不可"}
      </button>
    </div>
  </div>
);

export default function ColumnSettings({ displaySettings = [], formSettings = [], onSaveDisplaySettings }) {
  const navigate = useNavigate();

  const [salesItems,   setSalesItems]   = useState([]);
  const [defaultItems, setDefaultItems] = useState([]);
  const [customItems,  setCustomItems]  = useState([]);
  const [saving, setSaving] = useState(false);

  // ドラッグ状態（セクションごと）
  const [dragSec, setDragSec] = useState(null); // "sales" | "default" | "custom"
  const [dragIdx, setDragIdx] = useState(null);

  const makeDragHandlers = (secKey, items, setItems) => ({
    onDragStart: (i) => { setDragSec(secKey); setDragIdx(i); },
    onDragOver: (e, i) => {
      e.preventDefault();
      if (dragSec !== secKey || dragIdx === null || dragIdx === i) return;
      const n = [...items];
      const d = n.splice(dragIdx, 1)[0];
      n.splice(i, 0, d);
      setDragIdx(i);
      setItems(n);
    },
    onDragEnd: () => { setDragSec(null); setDragIdx(null); },
  });

  useEffect(() => {
    // displaySettings に保存されている順序・表示設定をマップ化
    const currentMap = new Map();
    (displaySettings || []).forEach(d => {
      if (d.name) currentMap.set(d.name, { visible: d.visible !== false, searchable: d.searchable !== false });
    });
    const toItem = (key) => ({
      key,
      visible:    currentMap.get(key)?.visible    ?? true,
      searchable: currentMap.get(key)?.searchable ?? true,
    });

    // 保存済みの並び順を活かして各セクションを復元する
    // displaySettings に含まれるキーをセクション別に分類し、順序を維持
    const savedKeys = (displaySettings || []).map(d => d.name).filter(Boolean);

    // 管理項目：保存済み順 → 未登録キーを末尾に補完
    const savedSales = savedKeys.filter(k => SALES_KEYS.includes(k));
    const missingSales = SALES_KEYS.filter(k => !savedSales.includes(k));
    setSalesItems([...savedSales, ...missingSales].map(toItem));

    // デフォルト項目：姓・名 → 氏名として統合、保存済み順を復元
    const fullNameVisible    = currentMap.get("姓")?.visible    ?? currentMap.get("氏名")?.visible    ?? true;
    const fullNameSearchable = currentMap.get("姓")?.searchable ?? currentMap.get("氏名")?.searchable ?? true;
    // savedKeys 内で DEFAULT_FIELDS に対応するキーを順序付き取得（姓/名 → 氏名に変換）
    const savedDefaultRaw = savedKeys
      .map(k => (k === "姓" || k === "名") ? "氏名" : k)
      .filter(k => DEFAULT_FIELDS.includes(k));
    const savedDefault = Array.from(new Set(savedDefaultRaw)); // 氏名の重複を除去
    const missingDefault = DEFAULT_FIELDS.filter(k => !savedDefault.includes(k));
    setDefaultItems([...savedDefault, ...missingDefault].map(k =>
      k === "氏名"
        ? { key: "氏名", visible: fullNameVisible, searchable: fullNameSearchable }
        : toItem(k)
    ));

    // カスタム項目：保存済み順 → formSettings の順で補完
    const allFixed = new Set([...SALES_KEYS, ...DEFAULT_FIELDS, "姓", "名"]);
    const formCustomKeys = (formSettings || []).map(f => f.name).filter(k => !allFixed.has(k));
    const savedCustom = savedKeys.filter(k => formCustomKeys.includes(k));
    const missingCustom = formCustomKeys.filter(k => !savedCustom.includes(k));
    setCustomItems([...savedCustom, ...missingCustom].map(toItem));

  }, [displaySettings, formSettings]);

  const handleSave = () => {
    setSaving(true);
    try {
      const expanded = [...salesItems, ...defaultItems, ...customItems].flatMap(it => {
        if (it.key === "氏名") return [
          { name: "姓", visible: it.visible, searchable: it.searchable },
          { name: "名", visible: it.visible, searchable: it.searchable },
        ];
        return [{ name: it.key, visible: it.visible, searchable: it.searchable }];
      });
      onSaveDisplaySettings(expanded);
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (setItems, idx, key) =>
    setItems(prev => prev.map((x, i) => i === idx ? { ...x, [key]: !x[key] } : x));

  const salesDrag   = makeDragHandlers("sales",   salesItems,   setSalesItems);
  const defaultDrag = makeDragHandlers("default",  defaultItems, setDefaultItems);
  const customDrag  = makeDragHandlers("custom",   customItems,  setCustomItems);

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
        <div style={{ marginBottom: 36, padding: "14px 18px", backgroundColor: "#EEF2FF", borderRadius: 12, fontSize: 13, color: THEME.textMain, lineHeight: 1.7, border: `1px solid ${THEME.border}` }}>
          ここでの変更は<strong>あなたの画面のみ</strong>に適用されます。
          表示順・表示/非表示・検索対象をカスタマイズできます。
        </div>

        {/* 管理項目 */}
        <div style={{ marginBottom: 36 }}>
          <SectionTitle>管理項目</SectionTitle>
          {salesItems.map((it, i) => (
            <DraggableRow
              key={it.key} it={it} idx={i}
              dragIdx={dragSec === "sales" ? dragIdx : null}
              onDragStart={salesDrag.onDragStart}
              onDragOver={salesDrag.onDragOver}
              onDragEnd={salesDrag.onDragEnd}
              onToggleVisible={() => toggle(setSalesItems, i, "visible")}
              onToggleSearchable={() => toggle(setSalesItems, i, "searchable")}
            />
          ))}
        </div>

        {/* デフォルト項目 */}
        <div style={{ marginBottom: 36 }}>
          <SectionTitle>デフォルト項目</SectionTitle>
          {defaultItems.map((it, i) => (
            <DraggableRow
              key={it.key} it={it} idx={i}
              dragIdx={dragSec === "default" ? dragIdx : null}
              onDragStart={defaultDrag.onDragStart}
              onDragOver={defaultDrag.onDragOver}
              onDragEnd={defaultDrag.onDragEnd}
              onToggleVisible={() => toggle(setDefaultItems, i, "visible")}
              onToggleSearchable={() => toggle(setDefaultItems, i, "searchable")}
            />
          ))}
        </div>

        {/* カスタム項目 */}
        <div style={{ marginBottom: 36 }}>
          <SectionTitle>カスタム項目</SectionTitle>
          {customItems.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: THEME.textMuted, fontSize: 13, border: `1.5px dashed ${THEME.border}`, borderRadius: 12 }}>
              カスタム項目はまだ登録されていません
            </div>
          ) : (
            customItems.map((it, i) => (
              <DraggableRow
                key={it.key} it={it} idx={i}
                dragIdx={dragSec === "custom" ? dragIdx : null}
                onDragStart={customDrag.onDragStart}
                onDragOver={customDrag.onDragOver}
                onDragEnd={customDrag.onDragEnd}
                onToggleVisible={() => toggle(setCustomItems, i, "visible")}
                onToggleSearchable={() => toggle(setCustomItems, i, "searchable")}
              />
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