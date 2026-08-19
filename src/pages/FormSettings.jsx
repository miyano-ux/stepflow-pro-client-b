import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lock, Trash2, Plus, ChevronDown, ChevronUp,
  Type, Calendar, List, ToggleLeft, ToggleRight, GripVertical, X, CheckCircle2
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// ⚙️ FormSettings - 登録項目定義ページ
// ==========================================

const FIELD_TYPES = [
  { value: "text",     label: "テキスト", icon: <Type size={15} /> },
  { value: "date",     label: "日付",     icon: <Calendar size={15} /> },
  { value: "dropdown", label: "選択肢",   icon: <List size={15} /> },
];

const FIXED_FIELDS = ["姓", "名", "電話番号", "メールアドレス"];

function buildItems(formSettings) {
  return (formSettings || []).map(f => ({
    name:     f.name || "",
    type:     f.type || "text",
    required: f.required !== false && f.required !== "false",
    options:  (typeof f.options === "string" && f.options)
                ? f.options.split(",").map(o => o.trim()).filter(Boolean)
                : [""],
  }));
}

export default function FormSettings({ formSettings = [], sheetCustomColumns = [], customers = [], isLoading = false, onRefresh }) {
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const backTo    = from === "master-settings" ? "/master-settings" : "/add";
  const backLabel = from === "master-settings" ? "管理項目設定へ戻る" : "登録画面へ戻る";
  const showToast = useToast();
  const { isMobile } = useWindowWidth();

  const [items, setItems]         = useState(() => buildItems(formSettings));
  const [openIndex, setOpenIndex] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // ── 【G2-012】props 到着後の再同期 ────────────────────────────────
  // App.jsx は load=true の間もルートを描画する（App.jsx:287-289）ため、
  // /form-settings に直接アクセス／再読み込みすると GAS 取得完了前の
  // formSettings=[]（App.jsx:74）を初期値として掴み、以後 items が空のまま
  // 固定される＝既存カスタム項目が0件に見える。
  // ColumnSettings.jsx:127-170 / StatusSettings.jsx:448-479 と同じく props を
  // state へ同期する。取り込みは「最初にデータが届いた1回だけ」に限定し、
  // 編集中の上書き・無限ループを防ぐ。
  const hydratedRef = useRef((formSettings || []).length > 0);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!formSettings || formSettings.length === 0) return;
    hydratedRef.current = true;
    setItems(buildItems(formSettings));
  }, [formSettings]);

  // ── 【G2-012】削除対象の項目とその影響件数 ──────────────────────
  // カスタム項目は「名称」で顧客シートの列と紐づき、定義から消すと GAS が
  // 顧客シートの該当列ごと削除する（gas_updated.js:1001-1015）。
  // StatusSettings.jsx:433-446（G1-006）と同じ考え方で削除前に件数を提示する。
  const removedFields = useMemo(() => {
    const keep = new Set(items.map(i => String(i.name || "").trim()).filter(Boolean));
    return (formSettings || [])
      .map(f => String(f?.name || "").trim())
      .filter(n => n && !keep.has(n))
      .map(n => ({
        name: n,
        count: (customers || []).filter(c => String(c?.[n] ?? "").trim() !== "").length,
      }));
  }, [items, formSettings, customers]);

  // ── 項目操作 ──────────────────────────────────────
  const updateItem = useCallback((index, patch) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item)), []);

  const handleAdd = () => {
    setItems(prev => {
      const next = [...prev, { name: "", type: "text", required: true, options: [""] }];
      setOpenIndex(next.length - 1);
      return next;
    });
  };

  const handleDelete = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setOpenIndex(null);
  };

  const addOption    = (ii)          => updateItem(ii, { options: [...items[ii].options, ""] });
  const updateOption = (ii, oi, val) => updateItem(ii, { options: items[ii].options.map((o, i) => i === oi ? val : o) });
  const deleteOption = (ii, oi)      => {
    const opts = items[ii].options.filter((_, i) => i !== oi);
    updateItem(ii, { options: opts.length ? opts : [""] });
  };

  // ── 保存（差分計算はGAS側で行う） ─────────────────
  const doSave = async () => {
    const settings = items.map(item => ({
      name:     item.name.trim(),
      type:     item.type,
      required: item.required,
      options:  item.type === "dropdown" ? item.options.filter(o => o.trim()).join(",") : "",
    }));

    setSaving(true);
    setSaved(false);
    try {
      await apiCall.post(GAS_URL, { action: "saveFormSettings", settings });
      setSaved(true);
      if (onRefresh) await onRefresh();
      nav(backTo);
    } catch (err) {
      console.error("saveFormSettings error:", err);
      showToast("保存に失敗しました: " + (err?.message || "不明なエラー"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    // 【G2-012】読み込み未完了のまま保存すると空定義で全項目を上書きしてしまう
    if (isLoading) return showToast("項目を読み込み中です。完了までお待ちください", "warning");

    for (const item of items) {
      if (!item.name.trim()) return showToast("項目名が未入力の項目があります", "warning");
      if (item.type === "dropdown" && !item.options.filter(o => o.trim()).length)
        return showToast(`「${item.name}」の選択肢が空です`, "warning");
    }

    // 【G2-012】既存項目が消える保存は必ず確認モーダルを挟む
    if (removedFields.length > 0) {
      const withData = removedFields.filter(f => f.count > 0);
      setConfirmModal({
        title: `${removedFields.length}件のカスタム項目を削除します`,
        message: removedFields
          .map(f => `・${f.name}${f.count > 0 ? `（入力済み ${f.count} 件）` : "（データなし）"}`)
          .join("\n"),
        note: withData.length > 0
          ? "保存すると顧客リストの該当列ごと削除され、入力済みのデータは復元できません。意図した削除かご確認ください。"
          : "保存すると項目定義が削除されます。",
        confirmLabel: "削除して保存する",
        onConfirm: () => { setConfirmModal(null); doSave(); },
      });
      return;
    }
    doSave();
  };

  // ── レンダリング ──────────────────────────────────
  return (
    <Page
      title="登録項目の定義"
      topButton={
        <button onClick={() => nav(backTo)} style={{ ...styles.btn, ...styles.btnSecondary }}>
          {backLabel}
        </button>
      }
    >
      <div style={{ maxWidth: "720px" }}>

        <ConfirmModal
          open={!!confirmModal}
          title={confirmModal?.title || ""}
          message={confirmModal?.message}
          note={confirmModal?.note}
          confirmLabel={confirmModal?.confirmLabel}
          onConfirm={confirmModal?.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />

        {/* 案内 */}
        <div style={{ marginBottom: 24, padding: "14px 18px", backgroundColor: "#F8FAFC", borderRadius: 12, border: `1px solid ${THEME.border}`, fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
          項目を追加・保存すると、データが自動で更新されます。既存項目の名前変更はデータの整合性が失われる可能性があるため慎重に行ってください。
        </div>

        {/* 固定項目 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
            固定項目（変更不可）
          </p>
          {FIXED_FIELDS.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 14, padding: isMobile ? "12px 16px" : "14px 20px", backgroundColor: "#F8FAFC", borderRadius: 10, border: `1px solid ${THEME.border}`, marginBottom: 6, opacity: 0.7 }}>
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

          {isLoading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 12, marginBottom: 12 }}>
              項目を読み込み中...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 12, marginBottom: 12 }}>
              「+ 項目を追加」ボタンでカスタム項目を作成できます
            </div>
          )}

          {items.map((item, i) => {
            const isOpen    = openIndex === i;
            const typeLabel = FIELD_TYPES.find(t => t.value === item.type)?.label || "テキスト";
            const typeIcon  = FIELD_TYPES.find(t => t.value === item.type)?.icon;

            return (
              <div
                key={i}
                style={{
                  backgroundColor: "white", borderRadius: 12, marginBottom: 10,
                  border: isOpen ? `1.5px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                  overflow: "hidden", transition: "border 0.15s",
                }}
              >
                {/* ヘッダー行（クリックで開閉） */}
                <div
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? 8 : 12,
                    padding: isMobile ? "14px 16px" : "16px 20px",
                    cursor: "pointer", userSelect: "none",
                    backgroundColor: isOpen ? "#F6F5FF" : "white",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <GripVertical size={16} color={THEME.border} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: item.name ? THEME.textMain : THEME.textMuted }}>
                      {item.name || "（未入力）"}
                    </span>
                    {isMobile && (isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, ...(isMobile ? { paddingLeft: 28 } : {}) }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: THEME.textMuted, backgroundColor: "#F8FAFC", padding: "3px 10px", borderRadius: 99, border: `1px solid ${THEME.border}` }}>
                      {typeIcon} {typeLabel}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.required ? THEME.primary : THEME.textMuted, backgroundColor: item.required ? "#EEF2FF" : "#F1F5F9", padding: "3px 8px", borderRadius: 99 }}>
                      {item.required ? "必須" : "任意"}
                    </span>
                    {!isMobile && (isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />)}
                  </div>
                </div>

                {/* 展開時の編集フォーム */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${THEME.border}` }}>
                    {/* 項目名 */}
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>項目名 *</label>
                      <input
                        style={styles.input}
                        value={item.name}
                        placeholder="例：会社名、備考 など"
                        onChange={e => updateItem(i, { name: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    </div>

                    {/* 入力形式 */}
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>入力形式</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {FIELD_TYPES.map(t => (
                          <button
                            key={t.value}
                            onClick={e => { e.stopPropagation(); updateItem(i, { type: t.value }); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 12px" : "8px 14px", borderRadius: 8, border: `1.5px solid ${item.type === t.value ? THEME.primary : THEME.border}`, backgroundColor: item.type === t.value ? "#EEF2FF" : "white", color: item.type === t.value ? THEME.primary : THEME.textMuted, fontWeight: item.type === t.value ? 700 : 500, fontSize: 13, cursor: "pointer" }}
                          >
                            {t.icon} {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 選択肢（dropdownのみ） */}
                    {item.type === "dropdown" && (
                      <div style={{ marginTop: 16 }}>
                        <label style={styles.label}>選択肢</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {item.options.map((opt, oi) => (
                            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: THEME.textMuted, fontSize: 13, minWidth: 20, textAlign: "center" }}>{oi + 1}.</span>
                              <input
                                style={{ ...styles.input, flex: 1 }}
                                value={opt}
                                placeholder={`選択肢 ${oi + 1}`}
                                onChange={e => updateOption(i, oi, e.target.value)}
                              />
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

                    {/* 必須・削除 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${THEME.border}`, flexWrap: "wrap", gap: 12 }}>
                      <button
                        onClick={() => updateItem(i, { required: !item.required })}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: item.required ? THEME.primary : THEME.textMuted, fontSize: 13, fontWeight: 600, padding: 0 }}
                      >
                        {item.required ? <ToggleRight size={22} color={THEME.primary} /> : <ToggleLeft size={22} color={THEME.textMuted} />}
                        {item.required ? "必須項目" : "任意項目"}
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #FCA5A520", backgroundColor: "#FEF2F2", color: "#EF4444", fontSize: 13, cursor: "pointer" }}
                      >
                        <Trash2 size={14} /> この項目を削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 追加ボタン */}
          <button
            onClick={handleAdd}
            style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", borderStyle: "dashed", marginTop: 8, gap: 8 }}
          >
            <Plus size={16} /> 項目を追加
          </button>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: 40, height: 52, fontSize: 15, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {isLoading
            ? "読み込み中..."
            : saved
              ? <><CheckCircle2 size={18} /> 同期完了！</>
              : saving
                ? "同期中..."
                : "データに同期して保存"
          }
        </button>
      </div>
    </Page>
  );
}