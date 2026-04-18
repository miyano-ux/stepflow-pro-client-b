import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Plus, Trash2, Globe, Loader2, GripVertical, CheckCircle2 } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";

// ==========================================
// 🌐 SourceManager - 流入元管理ページ
// ==========================================
// 査定サイトなど「どこから来たか」を自由に追加・削除できる設定画面
// ここで登録した流入元は顧客登録・編集画面のドロップダウンに反映される

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
        animation: "smFadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes smFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes smPopIn   { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes smCheck   { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
        @keyframes smBar     { from { width: 100% } to { width: 0% } }
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
          animation: "smPopIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
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
              style={{ animation: "smCheck 0.35s ease 0.1s both" }}
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
            animation: "smBar 2.2s linear",
            transformOrigin: "left",
          }} />
        </div>
      </div>
    </div>
  );
}

export default function SourceManager({ sources = [], onRefresh, gasUrl = GAS_URL }) {
  const showToast = useToast();

  // ── State / Ref（すべてuseEffectより前に宣言） ──────────────────────
  const [localSources, setLocalSources] = useState(sources);
  const deletedNamesRef = useRef(new Set());

  const [confirmModal, setConfirmModal] = useState(null);
  const [input, setInput]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [deletingName, setDeletingName] = useState(null);
  const [costEdits, setCostEdits]       = useState({});   // { name: 金額文字列 }
  const [costSaving, setCostSaving]     = useState(null); // 保存中の流入元名
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });

  // ── 親からのprops更新を受け取る際、削除済みをフィルター＆仮エントリを保持 ──
  // sources 参照が変わるたびに丸ごと上書きすると、API完了前の _isTemp エントリが
  // 消えてしまう（競合バグ）。pendingTemps で未確定エントリを引き継ぐことで防ぐ。
  useEffect(() => {
    setLocalSources((prev) => {
      const filtered = sources.filter((s) => !deletedNamesRef.current.has(s.name));
      // 正式エントリがまだ届いていない仮エントリだけ先頭に残す
      const pendingTemps = prev.filter(
        (s) => s._isTemp && !filtered.some((f) => f.name === s.name)
      );
      return [...pendingTemps, ...filtered];
    });
  }, [sources]);

  // ── 追加 ──────────────────────────────────────────────────────────────
  const handleAdd = async (label) => {
    const name = (label || input).trim();
    if (!name) return;
    if (localSources.some((s) => s.name === name)) {
      showToast(`「${name}」はすでに登録されています`, "warning");
      return;
    }

    // 楽観的追加：仮エントリを先頭に即座に反映
    const tempEntry = { name, count: 0, cost: null, _isTemp: true };
    setLocalSources((prev) => [tempEntry, ...prev]);
    setInput("");
    setSaving(true);

    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "addSource", name }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onRefresh(); // useEffect で仮エントリが正式エントリに置き換わる
    } catch {
      // ロールバック：仮エントリを取り消す
      setLocalSources((prev) => prev.filter((s) => !(s.name === name && s._isTemp)));
      setInput(name);
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── コスト更新 ──────────────────────────────────────────────────────
  const handleCostSave = async (name) => {
    const cost = Number(costEdits[name] ?? "");
    if (isNaN(cost) || cost < 0) {
      showToast("正しい金額を入力してください", "warning");
      return;
    }

    // 楽観的更新：対象行のcostを即座に反映
    const prevSources = localSources;
    setLocalSources((prev) =>
      prev.map((s) => (s.name === name ? { ...s, cost } : s))
    );
    setCostEdits((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setCostSaving(name);

    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "updateSourceCost", name, cost }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      // ロールバック
      setLocalSources(prevSources);
      showToast("コストの保存に失敗しました", "error");
    } finally {
      setCostSaving(null);
    }
  };

  // ── 削除 ──────────────────────────────────────────────────────────────
  const handleDelete = (name) => {
    setConfirmModal({
      title: `「${name}」を削除しますか？`,
      note: "すでにこの流入元が設定されている顧客データには影響しません。",
      onConfirm: async () => {
        setConfirmModal(null);

        // 楽観的削除：APIより前に削除意図を永続保持 & UIから即座に除去
        deletedNamesRef.current.add(name);
        setLocalSources((prev) => prev.filter((s) => s.name !== name));
        setSuccessModal({ open: true, message: `「${name}」を削除しました。` });
        setDeletingName(name);

        try {
          await axios.post(
            gasUrl,
            JSON.stringify({ action: "deleteSource", name }),
            { headers: { "Content-Type": "text/plain;charset=utf-8" } }
          );
          onRefresh();
        } catch {
          // ロールバック：削除意図を取り消してUIに戻す
          deletedNamesRef.current.delete(name);
          setLocalSources(sources.filter((s) => !deletedNamesRef.current.has(s.name)));
          showToast("削除に失敗しました", "error");
        } finally {
          setDeletingName(null);
        }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        note={confirmModal?.note}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: "" })}
      />
      <Page
        title="流入元の管理"
        subtitle="どの査定サイト・経路から来たお客様かを管理するための選択肢を設定します"
      >
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── 登録済み一覧 ──────────────────────── */}
          <div style={styles.card}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain, margin: "0 0 4px" }}>
              登録済みの流入元
            </h2>
            <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 20px" }}>
              顧客登録・編集画面の「流入元」ドロップダウンに表示されます
            </p>

            {localSources.length === 0 ? (
              <div style={{
                padding: "40px 0", textAlign: "center",
                color: THEME.textMuted, fontSize: 14,
                background: "#F8FAFC", borderRadius: 12,
                border: `1.5px dashed ${THEME.border}`,
              }}>
                <Globe size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
                まだ流入元が登録されていません<br />
                <span style={{ fontSize: 12 }}>下のフォームから登録してください</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {localSources.map((s, i) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 16px",
                      background: s._isTemp
                        ? "#F0FDF4"
                        : i % 2 === 0 ? "#FAFBFF" : "#FFFFFF",
                      borderRadius: 10,
                      border: `1px solid ${s._isTemp ? "#86EFAC" : THEME.border}`,
                      opacity: deletingName === s.name ? 0.4 : 1,
                      transition: "opacity 0.2s, background 0.2s",
                    }}
                  >
                    <GripVertical size={16} color={THEME.border} style={{ flexShrink: 0 }} />
                    <Globe size={15} color={THEME.primary} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: THEME.textMain }}>
                      {s.name}
                      {s._isTemp && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "#16A34A", fontWeight: 600 }}>
                          保存中…
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 11, color: THEME.textMuted,
                      background: "#F1F5F9", borderRadius: 6,
                      padding: "2px 8px",
                      flexShrink: 0,
                    }}>
                      顧客 {s.count ?? 0} 件
                    </span>

                    {/* コスト入力 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: THEME.textMuted }}>コスト</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={costEdits[s.name] ?? s.cost ?? ""}
                        onChange={(e) =>
                          setCostEdits((prev) => ({ ...prev, [s.name]: e.target.value }))
                        }
                        disabled={!!s._isTemp}
                        style={{
                          width: 90, padding: "4px 8px",
                          borderRadius: 6, border: `1px solid ${THEME.border}`,
                          fontSize: 12, fontWeight: 700, textAlign: "right",
                          opacity: s._isTemp ? 0.4 : 1,
                        }}
                      />
                      <span style={{ fontSize: 11, color: THEME.textMuted }}>円</span>
                      <button
                        onClick={() => handleCostSave(s.name)}
                        disabled={costSaving === s.name || !!s._isTemp}
                        style={{
                          padding: "4px 10px", borderRadius: 6, border: "none",
                          backgroundColor: THEME.primary, color: "white",
                          fontSize: 11, fontWeight: 800, cursor: "pointer",
                          opacity: (costSaving === s.name || s._isTemp) ? 0.5 : 1,
                        }}
                      >
                        {costSaving === s.name ? "保存中" : "保存"}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(s.name)}
                      disabled={deletingName === s.name || !!s._isTemp}
                      style={{
                        background: "none", border: "none",
                        cursor: (deletingName === s.name || s._isTemp) ? "not-allowed" : "pointer",
                        padding: 4,
                        color: (deletingName === s.name || s._isTemp) ? THEME.border : "#EF4444",
                        flexShrink: 0,
                      }}
                      title="削除"
                    >
                      {deletingName === s.name
                        ? <Loader2 size={16} />
                        : <Trash2 size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 新規追加フォーム ──────────────────── */}
          <div style={styles.card}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain, margin: "0 0 4px" }}>
              流入元を追加する
            </h2>
            <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px" }}>
              査定サイト名・広告媒体名・経路名など自由に入力できます
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                placeholder="例：ライフルホームズ、チラシ、Instagram広告..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                disabled={saving}
              />
              <button
                onClick={() => handleAdd()}
                disabled={saving || !input.trim()}
                style={{
                  ...styles.btn, ...styles.btnPrimary,
                  minWidth: 96, flexShrink: 0,
                  opacity: (!input.trim() || saving) ? 0.5 : 1,
                }}
              >
                {saving
                  ? <Loader2 size={16} />
                  : saved
                  ? <><CheckCircle2 size={16} /> 追加済み</>
                  : <><Plus size={16} /> 追加</>}
              </button>
            </div>
          </div>

        </div>
      </Page>
    </>
  );
}