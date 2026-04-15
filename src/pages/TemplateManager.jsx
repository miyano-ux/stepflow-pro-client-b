import React, { useState, useRef } from "react";
import ConfirmModal from "../components/ConfirmModal";
import axios from "axios";
import { Plus, Edit3, Trash2, Save, X, Loader2 } from "lucide-react";
import { useToast } from "../ToastContext";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF",
  textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444",
};

// ── 挿入できる変数一覧 ────────────────────────────────
const VARIABLE_GROUPS = [
  {
    label: "顧客情報",
    color: "#4F46E5",
    bg: "#EEF2FF",
    vars: [
      { label: "姓",    value: "{{姓}}"    },
      { label: "名",    value: "{{名}}"    },
      { label: "電話番号", value: "{{電話番号}}" },
    ],
  },
  {
    label: "担当者情報",
    color: "#0284C7",
    bg: "#E0F2FE",
    vars: [
      { label: "担当者姓",    value: "{{担当者姓}}"    },
      { label: "担当者名",    value: "{{担当者名}}"    },
      { label: "担当者電話",  value: "{{担当者電話}}"  },
      { label: "担当者メール",value: "{{担当者メール}}" },
    ],
  },
];

const PRESET_CONTENT =
  "{{姓}} {{名}} 様\n\n[ここにメッセージ本文を入力してください]\n\n" +
  "--------------------------\n" +
  "担当：{{担当者姓}}\n電話：{{担当者電話}}\nメール：{{担当者メール}}";

// ── 変数をハイライト表示するプレビュー ──────────────────
function highlightVars(text) {
  const showToast = useToast();
  if (!text) return null;
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) =>
    /^{{.+}}$/.test(part)
      ? <mark key={i} style={{ backgroundColor: "#EEF2FF", color: "#4F46E5", borderRadius: 4, padding: "0 3px", fontWeight: 800 }}>{part}</mark>
      : part
  );
}

export default function TemplateManager({ templates = [], onRefresh, gasUrl }) {
  const [confirmModal, setConfirmModal] = useState(null);
  const [modal, setModal]   = useState({ open: false, data: { id: "", name: "", content: "" } });
  const [saving, setSaving] = useState(false);
  const [lastInserted, setLastInserted] = useState(null); // 直近挿入した変数をフラッシュ表示
  const textareaRef = useRef(null);

  // ── 変数をカーソル位置に挿入 ──────────────────────────
  const insertVariable = (varValue) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const before = modal.data.content.slice(0, start);
    const after  = modal.data.content.slice(end);
    const newContent = before + varValue + after;

    setModal((m) => ({ ...m, data: { ...m.data, content: newContent } }));
    setLastInserted(varValue);
    setTimeout(() => setLastInserted(null), 1200);

    // カーソルを挿入後の位置に戻す
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + varValue.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "saveTemplate", ...modal.data }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      setModal({ open: false, data: { id: "", name: "", content: "" } });
      onRefresh();
    } catch { showToast("保存に失敗しました", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      title: "このテンプレートを削除してもよろしいですか？",
      onConfirm: async () => {
        setConfirmModal(null);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "deleteTemplate", id }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      onRefresh();
        } catch { showToast("削除に失敗しました", "error"); }
      },
    });
  };

  const openNew  = () => setModal({ open: true,  data: { id: "", name: "", content: PRESET_CONTENT } });
  const openEdit = (t)  => setModal({ open: true,  data: t });
  const closeModal = () => setModal({ open: false, data: { id: "", name: "", content: "" } });

  return (
    <>
    <ConfirmModal
      open={!!confirmModal}
      title={confirmModal?.title || ""}
      onConfirm={confirmModal?.onConfirm}
      onCancel={() => setConfirmModal(null)}
    />
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" }}>

      {/* ヘッダー */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>テンプレート管理</h1>
          <p style={{ color: THEME.textMuted, margin: 0 }}>SMS配信で使用する定型文を作成・編集できます。</p>
        </div>
        <button
          onClick={openNew}
          style={{ padding: "10px 20px", borderRadius: 10, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: "none", backgroundColor: THEME.primary, color: "white", fontSize: 14 }}
        >
          <Plus size={18} /> 新規追加
        </button>
      </header>

      {/* テンプレート一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
        {templates.map((t) => (
          <div key={t.id} style={{ backgroundColor: THEME.card, borderRadius: 20, border: `1px solid ${THEME.border}`, padding: 24, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{t.name}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(t)} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={18} /></button>
                <button onClick={() => handleDelete(t.id)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={18} /></button>
              </div>
            </div>
            {/* プレビュー：変数をハイライト */}
            <pre style={{ fontSize: 13, color: THEME.textMain, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: 16, borderRadius: 12, border: `1px solid ${THEME.border}`, maxHeight: 200, overflowY: "auto", margin: 0 }}>
              {highlightVars(t.content)}
            </pre>
          </div>
        ))}
      </div>

      {/* ── モーダル ─────────────────────────────── */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}>
          <div style={{ backgroundColor: THEME.card, borderRadius: 20, border: `1px solid ${THEME.border}`, width: 640, maxHeight: "92vh", overflowY: "auto", padding: 36, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>

            {/* モーダルヘッダー */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0, color: THEME.textMain }}>
                {modal.data.id ? "テンプレートの編集" : "新規テンプレート作成"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* テンプレート名 */}
              <label style={{ fontSize: 12, fontWeight: 900, color: THEME.textMuted, display: "block", marginBottom: 8 }}>テンプレート名</label>
              <input
                style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${THEME.border}`, fontSize: 14, outline: "none", marginBottom: 24, boxSizing: "border-box" }}
                value={modal.data.name}
                onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, name: e.target.value } }))}
                required
              />

              {/* 本文エリア */}
              <label style={{ fontSize: 12, fontWeight: 900, color: THEME.textMuted, display: "block", marginBottom: 10 }}>本文内容</label>

              {/* ── 変数挿入パネル ── */}
              <div style={{ backgroundColor: "#F8FAFC", border: `1px solid ${THEME.border}`, borderRadius: "12px 12px 0 0", padding: "14px 16px", borderBottom: "none" }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  クリックしてカーソル位置に挿入
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {VARIABLE_GROUPS.map((group) => (
                    <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* グループラベル */}
                      <span style={{ fontSize: 11, fontWeight: 800, color: group.color, minWidth: 70 }}>{group.label}</span>
                      {/* 変数チップ */}
                      {group.vars.map((v) => {
                        const justInserted = lastInserted === v.value;
                        return (
                          <button
                            key={v.value}
                            type="button"
                            onClick={() => insertVariable(v.value)}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 20,
                              border: `1.5px solid ${justInserted ? group.color : group.color + "60"}`,
                              backgroundColor: justInserted ? group.color : group.bg,
                              color: justInserted ? "white" : group.color,
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              fontFamily: "monospace",
                            }}
                            onMouseEnter={(e) => { if (!justInserted) { e.currentTarget.style.backgroundColor = group.color; e.currentTarget.style.color = "white"; }}}
                            onMouseLeave={(e) => { if (!justInserted) { e.currentTarget.style.backgroundColor = group.bg; e.currentTarget.style.color = group.color; }}}
                            title={`クリックで ${v.value} を挿入`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* テキストエリア */}
              <textarea
                ref={textareaRef}
                style={{
                  width: "100%", height: 240, padding: "14px 16px",
                  border: `1px solid ${THEME.border}`,
                  borderRadius: "0 0 12px 12px",
                  fontSize: 14, outline: "none", resize: "vertical",
                  lineHeight: 1.7, boxSizing: "border-box",
                  fontFamily: "monospace",
                  marginBottom: 24,
                }}
                value={modal.data.content}
                onChange={(e) => setModal((m) => ({ ...m, data: { ...m.data, content: e.target.value } }))}
                required
              />

              {/* 保存・キャンセル */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", backgroundColor: THEME.primary, color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {saving ? <Loader2 size={18} /> : <Save size={18} />} 保存
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "#F1F5F9", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}