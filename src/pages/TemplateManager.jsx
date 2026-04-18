import React, { useState, useRef, useEffect } from "react";
import ConfirmModal from "../components/ConfirmModal";
import axios from "axios";
import { Plus, Edit3, Trash2, Save, X, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "../ToastContext";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF",
  textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444",
};

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

// 変数をハイライト表示するプレビュー
function highlightVars(text) {
  if (!text) return null;
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) =>
    /^{{.+}}$/.test(part)
      ? <mark key={i} style={{ backgroundColor: "#EEF2FF", color: "#4F46E5", borderRadius: 4, padding: "0 3px", fontWeight: 800 }}>{part}</mark>
      : part
  );
}

// ── 成功モーダル ──────────────────────────────────────────────
function SuccessModal({ open, message, onClose }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 4000,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn  { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes drawCheck {
          from { stroke-dashoffset: 60 }
          to   { stroke-dashoffset: 0  }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: "44px 48px 36px",
          maxWidth: 360,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.18)",
          animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* アニメーション付きチェックアイコン */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          backgroundColor: "#F0FDF4",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#22C55E" strokeWidth="2.5" fill="none" />
            <path
              d="M12 20.5 L17.5 26 L28 14"
              stroke="#22C55E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="0"
              style={{ animation: "drawCheck 0.35s ease 0.1s both" }}
            />
          </svg>
        </div>

        <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#111827" }}>
          完了しました
        </h3>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px",
            backgroundColor: "#22C55E", color: "white",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: "pointer",
          }}
        >
          OK
        </button>

        {/* 自動クローズのプログレスバー */}
        <div style={{ marginTop: 16, height: 3, borderRadius: 99, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
          <div style={{
            height: "100%", backgroundColor: "#22C55E", borderRadius: 99,
            animation: "progressBar 2.2s linear",
            transformOrigin: "left",
          }} />
          <style>{`
            @keyframes progressBar {
              from { width: 100% }
              to   { width: 0% }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ── バックグラウンド同期バッジ ─────────────────────────────────
function SyncingBadge({ syncing }) {
  if (!syncing) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28,
      backgroundColor: "rgba(15,23,42,0.85)",
      color: "white",
      borderRadius: 999,
      padding: "10px 18px",
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, fontWeight: 700,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: 3500,
      backdropFilter: "blur(8px)",
    }}>
      <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
      サーバーと同期中...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function TemplateManager({ templates = [], onRefresh, gasUrl }) {
  const showToast = useToast();

  // ── ローカルリスト（楽観的UI用） ──
  // ── state / ref 宣言 ──────────────────────────────────────
  const [localTemplates, setLocalTemplates] = useState(templates);
  const [confirmModal, setConfirmModal] = useState(null);
  const [modal, setModal]   = useState({ open: false, data: { id: "", name: "", content: "" } });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [lastInserted, setLastInserted] = useState(null);
  const textareaRef = useRef(null);

  // ── 削除済みIDを記録する Set（GASキャッシュ遅延対策）───────────
  // GASは書き込み直後のGETで古いデータを返すことがある。
  // onRefresh()がstaleデータを返しても、このSetでフィルターして復活を防ぐ。
  // エラー時は delete(id) で取り消す。IDは通常再利用されないため蓄積してよい。
  const deletedIdsRef = useRef(new Set());

  // 親の templates が変化したとき、削除済みIDを除外してローカルに反映する
  useEffect(() => {
    setLocalTemplates(
      templates.filter(t => !deletedIdsRef.current.has(t.id))
    );
  }, [templates]);

  // ── 変数をカーソル位置に挿入 ──────────────────────────────
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
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + varValue.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // ── 保存（楽観的UI） ─────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const isEdit = !!modal.data.id;
    const savedData = { ...modal.data };

    // 1) 楽観的更新
    if (isEdit) {
      setLocalTemplates((prev) =>
        prev.map((t) => (t.id === savedData.id ? savedData : t))
      );
    } else {
      const tempId = `temp_${Date.now()}`;
      setLocalTemplates((prev) => [{ ...savedData, id: tempId }, ...prev]);
    }

    // 2) モーダルを即座に閉じて成功表示
    setModal({ open: false, data: { id: "", name: "", content: "" } });
    setSaving(false);
    setSuccessModal({
      open: true,
      message: isEdit
        ? `「${savedData.name}」を更新しました。`
        : `「${savedData.name}」を追加しました。`,
    });

    // 3) バックグラウンドAPI → リフレッシュ
    setSyncing(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "saveTemplate", ...savedData }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      onRefresh(); // サーバーの正式IDで仮IDを置き換える
    } catch {
      setLocalTemplates(templates.filter(t => !deletedIdsRef.current.has(t.id)));
      showToast("保存に失敗しました。再度お試しください。", "error");
    } finally {
      setSyncing(false);
    }
  };

  // ── 削除（楽観的UI） ─────────────────────────────────────
  const handleDelete = (id, name) => {
    setConfirmModal({
      title: "このテンプレートを削除しますか？",
      message: `「${name}」を削除します。`,
      note: "この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);

        // 1) 削除済みIDとして記録（GAS staleデータ対策）
        //    useEffect([templates]) がこのIDをフィルターするため
        //    onRefresh()が古いデータを返しても復活しない
        deletedIdsRef.current.add(id);
        const prevTemplates = localTemplates;

        // 2) 楽観的更新：即座にリストから除去
        setLocalTemplates((prev) => prev.filter((t) => t.id !== id));
        setSuccessModal({ open: true, message: `「${name}」を削除しました。` });

        // 3) バックグラウンドAPI
        setSyncing(true);
        try {
          await axios.post(gasUrl, JSON.stringify({ action: "deleteTemplate", id }), {
            headers: { "Content-Type": "text/plain;charset=utf-8" },
          });
          onRefresh(); // GASが古いデータを返してもdeletedIdsRefでフィルターされる
        } catch {
          // 失敗時：記録を取り消してUIを元に戻す
          deletedIdsRef.current.delete(id);
          setLocalTemplates(prevTemplates);
          showToast("削除に失敗しました。再度お試しください。", "error");
        } finally {
          setSyncing(false);
        }
      },
    });
  };

  const openNew   = () => setModal({ open: true, data: { id: "", name: "", content: PRESET_CONTENT } });
  const openEdit  = (t) => setModal({ open: true, data: t });
  const closeModal = () => setModal({ open: false, data: { id: "", name: "", content: "" } });

  return (
    <>
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        note={confirmModal?.note}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: "" })}
      />

      <SyncingBadge syncing={syncing} />

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

        {/* テンプレート一覧（楽観的ローカルリストを使用） */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
          {localTemplates.map((t) => (
            <div
              key={t.id}
              style={{
                backgroundColor: THEME.card, borderRadius: 20,
                border: `1px solid ${THEME.border}`, padding: 24,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                // 仮IDのカードは少し薄く表示して「同期待ち」を示す
                opacity: String(t.id).startsWith("temp_") ? 0.7 : 1,
                transition: "opacity 0.3s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{t.name}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {String(t.id).startsWith("temp_") && (
                    <RefreshCw size={13} color={THEME.textMuted} style={{ animation: "spin 1.2s linear infinite" }} />
                  )}
                  <button onClick={() => openEdit(t)} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(t.id, t.name)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={18} /></button>
                </div>
              </div>
              <pre style={{ fontSize: 13, color: THEME.textMain, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: 16, borderRadius: 12, border: `1px solid ${THEME.border}`, maxHeight: 200, overflowY: "auto", margin: 0 }}>
                {highlightVars(t.content)}
              </pre>
            </div>
          ))}
        </div>

        {/* ── 編集/新規モーダル ──────────────────────────── */}
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

                {/* 変数挿入パネル */}
                <div style={{ backgroundColor: "#F8FAFC", border: `1px solid ${THEME.border}`, borderRadius: "12px 12px 0 0", padding: "14px 16px", borderBottom: "none" }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    クリックしてカーソル位置に挿入
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {VARIABLE_GROUPS.map((group) => (
                      <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: group.color, minWidth: 70 }}>{group.label}</span>
                        {group.vars.map((v) => {
                          const justInserted = lastInserted === v.value;
                          return (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => insertVariable(v.value)}
                              style={{
                                padding: "5px 12px", borderRadius: 20,
                                border: `1.5px solid ${justInserted ? group.color : group.color + "60"}`,
                                backgroundColor: justInserted ? group.color : group.bg,
                                color: justInserted ? "white" : group.color,
                                fontSize: 12, fontWeight: 800, cursor: "pointer",
                                transition: "all 0.15s", fontFamily: "monospace",
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
                    fontFamily: "monospace", marginBottom: 24,
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
                    style={{
                      flex: 1, padding: "13px", borderRadius: 12, border: "none",
                      backgroundColor: saving ? "#818CF8" : THEME.primary,
                      color: "white", fontWeight: 900, fontSize: 15, cursor: saving ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "background-color 0.2s",
                    }}
                  >
                    {saving
                      ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 保存中...</>
                      : <><Save size={18} /> 保存する</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
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