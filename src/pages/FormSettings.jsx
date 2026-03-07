import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock, Trash2, AlertCircle, AlertTriangle, Plus, ChevronDown, ChevronUp,
  Type, Calendar, List, ToggleLeft, ToggleRight, GripVertical, X, CheckCircle2
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";

// ==========================================
// ⚙️ FormSettings - 登録項目定義ページ
// ==========================================

const FIELD_TYPES = [
  { value: "text",     label: "テキスト",  icon: <Type size={15} /> },
  { value: "date",     label: "日付",      icon: <Calendar size={15} /> },
  { value: "dropdown", label: "選択肢",    icon: <List size={15} /> },
];

const FIXED_FIELDS = ["姓", "名", "電話番号", "メールアドレス"];

// システム管理列（FormSettingsのカスタム項目対象外）
const SYSTEM_COLS = new Set([
  "姓","名","電話番号","メールアドレス",
  "登録日","シナリオID","配信ステータス","対応ステータス",
  "担当者メール","流入元","ステータス変更日","失注理由","契約種別"
]);

function FormSettings({ formSettings = [], sheetCustomColumns = [], onRefresh }) {
  const nav = useNavigate();

  // formSettings（定義シート）を正として初期化
  const initItems = () => {
    return (formSettings || []).map(f => ({
      name:     f.name,
      type:     f.type     || "text",
      required: f.required !== false,
      options:  f.options
        ? f.options.split(",").map(o => o.trim()).filter(Boolean)
        : [""],
    }));
  };

  const [items, setItems]           = useState(initItems);
  const [openIndex, setOpenIndex]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | "ok" | "error"

  // sheetCustomColumns が更新されたら再初期化
  useEffect(() => {
    setItems(initItems());
  }, [formSettings, sheetCustomColumns]);

  // シートにあるが定義にない列（孤立したシート列）
  const definedNames = new Set((formSettings || []).map(f => f.name));
  const orphanedCols = sheetCustomColumns.filter(n => !definedNames.has(n));

  const updateItem = (index, patch) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));

  const handleAdd = () => {
    const newIndex = items.length;
    setItems(prev => [...prev, { name: "", type: "text", required: true, options: [""], _inSheet: false, _inDef: false }]);
    setOpenIndex(newIndex);
  };

  const handleDelete = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setOpenIndex(null);
  };

  const addOption    = (index)             => updateItem(index, { options: [...items[index].options, ""] });
  const updateOption = (ii, oi, value)     => updateItem(ii, { options: items[ii].options.map((o, i) => i === oi ? value : o) });
  const deleteOption = (ii, oi)            => {
    const opts = items[ii].options.filter((_, i) => i !== oi);
    updateItem(ii, { options: opts.length ? opts : [""] });
  };

  const handleSave = async () => {
    for (const item of items) {
      if (!item.name.trim()) return alert("項目名が未入力の項目があります");
      if (item.type === "dropdown" && !item.options.filter(o => o.trim()).length)
        return alert(`「${item.name}」の選択肢が空です`);
    }

    const settings = items.map(item => ({
      name:     item.name.trim(),
      type:     item.type,
      required: item.required,
      options:  item.type === "dropdown" ? item.options.filter(o => o.trim()).join(",") : "",
    }));

    setSaving(true);
    setSyncStatus(null);
    try {
      // 孤立した列があれば削除も依頼
      await apiCall.post(GAS_URL, {
        action: "saveFormSettings",
        settings,
        removeOrphanedCols: orphanedCols,
      });
      setSyncStatus("ok");
      await onRefresh();
      setTimeout(() => nav("/add"), 800);
    } catch {
      setSyncStatus("error");
      alert("同期に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="登録項目の定義"
      topButton={
        <button onClick={() => nav("/add")} style={{ ...styles.btn, ...styles.btnSecondary }}>
          登録画面へ戻る
        </button>
      }
    >
      <div style={{ maxWidth: "720px" }}>

        {/* 孤立した列の警告（シートにあるが定義にない列）*/}
        {orphanedCols.length > 0 && (
          <div style={{ marginBottom: 20, padding: "16px 18px", backgroundColor: "#FFF7ED", borderRadius: 12, border: "1px solid #FED7AA", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertTriangle size={17} color="#C2410C" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#9A3412", marginBottom: 6 }}>
                スプレッドシートに不要な列が残っています
              </div>
              <div style={{ fontSize: 12, color: "#9A3412", lineHeight: 1.7, marginBottom: 8 }}>
                定義にない列: <strong>{orphanedCols.join("、")}</strong><br />
                「保存」するとこれらの列はスプレッドシートから<strong>削除</strong>されます。
              </div>
              <div style={{ fontSize: 11, color: "#C2410C", backgroundColor: "#FFF", padding: "6px 10px", borderRadius: 6, border: "1px solid #FED7AA", display: "inline-block" }}>
                ⚠ 該当列にデータが入っている場合は削除されます。事前にバックアップをお取りください。
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24, padding: "14px 18px", backgroundColor: "#F8FAFC", borderRadius: 12, border: `1px solid ${THEME.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertCircle size={17} color={THEME.textMuted} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, margin: 0 }}>
            項目を追加・同期すると、スプレッドシートに新しい列が自動作成されます。既存項目の名前変更はデータの整合性が失われる可能性があるため慎重に行ってください。
          </p>
        </div>

        {/* 固定項目 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
            固定項目（変更不可）
          </p>
          {FIXED_FIELDS.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", backgroundColor: THEME.locked, borderRadius: 10, border: `1px solid ${THEME.border}`, marginBottom: 6, opacity: 0.7 }}>
              <Lock size={15} color={THEME.textMuted} />
              <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain, flex: 1 }}>{f}</span>
              <span style={{ fontSize: 12, color: THEME.textMuted, backgroundColor: "white", padding: "3px 10px", borderRadius: 99, border: `1px solid ${THEME.border}` }}>テキスト</span>
            </div>
          ))}
        </div>

        {/* カスタム項目 */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
            カスタム項目
          </p>

          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 12, marginBottom: 12 }}>
              「+ 項目を追加」ボタンでカスタム項目を作成できます
            </div>
          )}

          {items.map((item, i) => {
            const isOpen     = openIndex === i;
            const typeLabel  = FIELD_TYPES.find(t => t.value === item.type)?.label || "テキスト";
            const typeIcon   = FIELD_TYPES.find(t => t.value === item.type)?.icon;
            const isOrphaned = item._inSheet && !item._inDef; // シートにあるが定義なし

            return (
              <div key={i} style={{ ...styles.card, marginBottom: 10, padding: 0, overflow: "hidden", border: isOpen ? `1.5px solid ${THEME.primary}` : isOrphaned ? `1.5px solid #F59E0B` : `1px solid ${THEME.border}`, transition: "border 0.15s" }}>
                <div
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer", userSelect: "none", backgroundColor: isOpen ? "#F6F5FF" : isOrphaned ? "#FFFBEB" : "white" }}
                >
                  <GripVertical size={16} color={THEME.border} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: item.name ? THEME.textMain : THEME.textMuted }}>
                    {item.name || "（未入力）"}
                  </span>
                  {isOrphaned && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E", backgroundColor: "#FEF3C7", padding: "2px 8px", borderRadius: 99 }}>
                      シート上に存在
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: THEME.textMuted, backgroundColor: "white", padding: "3px 10px", borderRadius: 99, border: `1px solid ${THEME.border}` }}>
                    {typeIcon} {typeLabel}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.required ? THEME.primary : THEME.textMuted, backgroundColor: item.required ? "#EEF2FF" : "#F1F5F9", padding: "3px 8px", borderRadius: 99 }}>
                    {item.required ? "必須" : "任意"}
                  </span>
                  {isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />}
                </div>

                {isOpen && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${THEME.border}` }}>
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>項目名 *</label>
                      <input style={styles.input} value={item.name} placeholder="例：会社名、備考 など" onChange={e => updateItem(i, { name: e.target.value })} onClick={e => e.stopPropagation()} autoFocus />
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>入力形式</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {FIELD_TYPES.map(t => (
                          <button key={t.value} onClick={() => updateItem(i, { type: t.value })} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${item.type === t.value ? THEME.primary : THEME.border}`, backgroundColor: item.type === t.value ? "#EEF2FF" : "white", color: item.type === t.value ? THEME.primary : THEME.textMuted, fontWeight: item.type === t.value ? 700 : 500, fontSize: 13, cursor: "pointer" }}>
                            {t.icon} {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {item.type === "dropdown" && (
                      <div style={{ marginTop: 16 }}>
                        <label style={styles.label}>選択肢</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {item.options.map((opt, oi) => (
                            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: THEME.textMuted, fontSize: 13, minWidth: 20, textAlign: "center" }}>{oi + 1}.</span>
                              <input style={{ ...styles.input, flex: 1 }} value={opt} placeholder={`選択肢 ${oi + 1}`} onChange={e => updateOption(i, oi, e.target.value)} />
                              <button onClick={() => deleteOption(i, oi)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}>
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addOption(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: `1px dashed ${THEME.border}`, borderRadius: 8, background: "white", color: THEME.textMuted, fontSize: 13, cursor: "pointer", width: "fit-content" }}>
                            <Plus size={14} /> 選択肢を追加
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${THEME.border}` }}>
                      <button onClick={() => updateItem(i, { required: !item.required })} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: item.required ? THEME.primary : THEME.textMuted, fontSize: 13, fontWeight: 600, padding: 0 }}>
                        {item.required ? <ToggleRight size={22} color={THEME.primary} /> : <ToggleLeft size={22} color={THEME.textMuted} />}
                        {item.required ? "必須項目" : "任意項目"}
                      </button>
                      <button onClick={() => handleDelete(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${THEME.danger}20`, backgroundColor: "#FEF2F2", color: THEME.danger, fontSize: 13, cursor: "pointer" }}>
                        <Trash2 size={14} /> この項目を削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={handleAdd} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", borderStyle: "dashed", marginTop: 8, gap: 8 }}>
            <Plus size={16} /> 項目を追加
          </button>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: 40, height: 52, fontSize: 15, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {syncStatus === "ok"
            ? <><CheckCircle2 size={18} /> 同期完了！</>
            : saving
              ? "同期中..."
              : "スプレッドシートに同期して保存"
          }
        </button>
      </div>
    </Page>
  );
}

export default FormSettings;