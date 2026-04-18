import React from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, ChevronRight, Settings, Zap, List, CheckCircle2, Loader2 } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { useToast } from "../ToastContext";

// ==========================================
// 🎬 ScenarioList - シナリオ管理
// ==========================================

function statusColor(terminalType) {
  if (terminalType === "won")     return { bg: "#ECFDF5", text: "#059669", border: "#059669" };
  if (terminalType === "dormant") return { bg: "#FFFBEB", text: "#B45309", border: "#F59E0B" };
  if (terminalType === "lost")    return { bg: "#FEF2F2", text: "#DC2626", border: "#EF4444" };
  return { bg: "#EEF2FF", text: THEME.primary, border: THEME.primary };
}

function SectionHeading({ icon, label, sub, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {icon}
          <span style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain }}>{label}</span>
        </div>
        {sub && <p style={{ fontSize: 12, color: THEME.textMuted, margin: 0, paddingLeft: 28 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ── 削除確認モーダル（処理中ステート対応） ──
function DeleteConfirmModal({ open, scenarioId, deleting, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      onClick={deleting ? undefined : onCancel}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 3000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "white", borderRadius: 20, padding: 40,
          maxWidth: 440, width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          backgroundColor: "#FEE2E2",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Trash2 size={28} color={THEME.danger} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#111827" }}>
          シナリオを削除しますか？
        </h3>
        <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151" }}>
          「{scenarioId}」
        </p>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6B7280" }}>
          紐づいているステータスの設定も解除されます。
        </p>

        <button
          onClick={onConfirm}
          disabled={deleting}
          style={{
            width: "100%", padding: "14px",
            backgroundColor: deleting ? "#FCA5A5" : THEME.danger,
            color: "white", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800,
            cursor: deleting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background-color 0.2s",
          }}
        >
          {deleting ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              削除中...
            </>
          ) : "削除する"}
        </button>

        <button
          onClick={onCancel}
          disabled={deleting}
          style={{
            width: "100%", padding: "13px",
            backgroundColor: "transparent", color: deleting ? "#D1D5DB" : "#6B7280",
            border: "1px solid #E5E7EB", borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: deleting ? "not-allowed" : "pointer",
            marginTop: 10,
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// ── 成功モーダル ──
function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 3100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "white", borderRadius: 20, padding: 40,
          maxWidth: 400, width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          backgroundColor: "#ECFDF5",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <CheckCircle2 size={32} color="#059669" />
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111827" }}>
          {title}
        </h3>
        {message && (
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280" }}>
            {message}
          </p>
        )}
        {!message && <div style={{ marginBottom: 28 }} />}
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "14px",
            backgroundColor: "#059669", color: "white",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// CSSアニメーション注入（spinはTailwindなしでも動くよう）
const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

export default function ScenarioList({ scenarios = [], statuses = [], onRefresh, gasUrl }) {
  const showToast = useToast();
  const navigate = useNavigate();

  // 削除モーダル状態
  const [deleteModal, setDeleteModal] = React.useState(null); // { scenarioId }
  const [deleting, setDeleting]       = React.useState(false);
  // 成功モーダル状態
  const [successModal, setSuccessModal] = React.useState(null); // { title, message }
  // 楽観的UI：削除済みとして即時非表示にするIDセット
  const [hiddenIds, setHiddenIds] = React.useState(new Set());

  // hiddenIds を除外してデータ構築
  const visibleScenarios = (scenarios || []).filter(item => !hiddenIds.has(item["シナリオID"]));
  const visibleStatuses  = (statuses  || []).filter(st => !hiddenIds.has(st.scenarioId));

  const grouped = visibleScenarios.reduce((acc, item) => {
    (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item);
    return acc;
  }, {});
  const scenarioIds = Object.keys(grouped);

  const scenarioToStatus = {};
  visibleStatuses.forEach(st => {
    if (st.scenarioId) scenarioToStatus[st.scenarioId] = st;
  });

  const linkedStatuses = visibleStatuses.filter(st => st.scenarioId);

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    const targetId = deleteModal.scenarioId;
    setDeleting(true);
    try {
      await axios.post(
        gasUrl || GAS_URL,
        JSON.stringify({ action: "deleteScenario", scenarioID: targetId }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      // 即時非表示（モーダル表示中も画面から消す）
      setHiddenIds(prev => new Set([...prev, targetId]));
      setDeleteModal(null);
      setDeleting(false);
      onRefresh();
      setSuccessModal({
        title: "削除しました",
        message: `シナリオ「${targetId}」を削除しました。`,
      });
    } catch {
      setDeleting(false);
      showToast("削除に失敗しました", "error");
    }
  };

  return (
    <>
      {/* CSSアニメーション */}
      <style>{spinStyle}</style>

      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        open={!!deleteModal}
        scenarioId={deleteModal?.scenarioId || ""}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { if (!deleting) setDeleteModal(null); }}
      />

      {/* 成功モーダル */}
      <SuccessModal
        open={!!successModal}
        title={successModal?.title || ""}
        message={successModal?.message}
        onClose={() => setSuccessModal(null)}
      />

      <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" }}>

        {/* ── ページヘッダー ── */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: 0 }}>シナリオ管理</h1>
          <Link to="/scenarios/new" style={{ ...styles.btn, ...styles.btnPrimary, textDecoration: "none" }}>
            <Plus size={18} /> 新規作成
          </Link>
        </header>

        {/* ════ セクション①：自動適用シナリオ設定 ════ */}
        <section style={{
          backgroundColor: "#F0F4FF",
          borderRadius: 20,
          padding: "28px 32px",
          marginBottom: 48,
          border: "1px solid #C7D2FE",
        }}>
          <SectionHeading
            icon={<Zap size={18} color={THEME.primary} />}
            label="自動適用シナリオ設定"
            sub="ステータスに移動したとき、自動でシナリオが開始されます"
            action={
              <button
                onClick={() => navigate("/status-settings")}
                style={{ ...styles.btn, ...styles.btnSecondary, gap: 8, fontSize: 13 }}
              >
                <Settings size={14} /> ステータス設定で変更
              </button>
            }
          />

          {linkedStatuses.length === 0 ? (
            <div style={{ padding: "28px 24px", backgroundColor: "white", borderRadius: 14, border: `2px dashed ${THEME.border}`, textAlign: "center", color: THEME.textMuted, fontSize: 13 }}>
              シナリオが紐づいているステータスがありません。<br />
              ステータス設定からシナリオを割り当ててください。
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {linkedStatuses.map(st => {
                const col   = statusColor(st.terminalType);
                const steps = (grouped[st.scenarioId] || []).sort((a, b) => a["ステップ数"] - b["ステップ数"]);
                return (
                  <div key={st.name} style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${col.border}`, overflow: "hidden" }}>
                    <div style={{ backgroundColor: col.bg, padding: "14px 20px", borderBottom: `1px solid ${col.border}` }}>
                      <div style={{ fontSize: 11, color: col.text, fontWeight: 800, marginBottom: 3, opacity: 0.8 }}>このステータスに移動したとき</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: col.text }}>{st.name}</div>
                    </div>
                    <div style={{ padding: "14px 20px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        <Zap size={11} color={THEME.primary} />
                        <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700 }}>発動シナリオ：</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: THEME.primary }}>{st.scenarioId}</span>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>（{steps.length} ステップ）</span>
                      </div>
                      {steps.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                          {steps.slice(0, 3).map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                              <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: col.border, flexShrink: 0 }} />
                              <span style={{ fontWeight: 800, minWidth: 40, color: THEME.textMain }}>{s["経過日数"]}日後</span>
                              <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s["message"]}</span>
                            </div>
                          ))}
                          {steps.length > 3 && <div style={{ fontSize: 11, color: THEME.textMuted, paddingLeft: 13 }}>...他 {steps.length - 3} ステップ</div>}
                        </div>
                      )}
                      <Link
                        to={`/scenarios/edit/${encodeURIComponent(st.scenarioId)}`}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: col.bg, padding: "9px 14px", borderRadius: 10, textDecoration: "none", color: col.text, fontWeight: 800, fontSize: 12, border: `1px solid ${col.border}` }}
                      >
                        <span>ステップを編集</span><ChevronRight size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ════ セクション②：全シナリオ ════ */}
        <section>
          <SectionHeading
            icon={<List size={18} color={THEME.textMuted} />}
            label="全シナリオ"
            sub="登録済みのシナリオ一覧です"
          />

          {scenarioIds.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: THEME.textMuted, fontSize: 14 }}>
              シナリオがありません。「＋ 新規作成」から作成してください。
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {scenarioIds.map(id => {
                const steps    = (grouped[id] || []).sort((a, b) => a["ステップ数"] - b["ステップ数"]);
                const linkedSt = scenarioToStatus[id];
                const col      = linkedSt ? statusColor(linkedSt.terminalType) : null;
                return (
                  <div key={id} style={{ ...styles.card, padding: 0, overflow: "hidden", border: `1px solid ${THEME.border}` }}>
                    <div style={{ padding: "22px 24px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: THEME.textMain }}>{id}</div>
                        <button
                          onClick={() => setDeleteModal({ scenarioId: id })}
                          style={{ color: THEME.danger, background: "#FEF2F2", padding: 7, borderRadius: 8, border: "none", cursor: "pointer", flexShrink: 0 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: THEME.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> {steps.length} ステップ
                        </span>
                        {linkedSt && (
                          <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: "2px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
                            <Zap size={10} /> {linkedSt.name} で自動適用
                          </span>
                        )}
                      </div>
                      <div style={{ height: 1, backgroundColor: THEME.border, marginBottom: 14 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                        {steps.slice(0, 3).map((st, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                            <span style={{ backgroundColor: "#EEF2FF", color: THEME.primary, fontWeight: 800, fontSize: 11, padding: "2px 8px", borderRadius: 6, flexShrink: 0, whiteSpace: "nowrap" }}>
                              {st["経過日数"]}日後
                            </span>
                            <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
                          </div>
                        ))}
                        {steps.length > 3 && <div style={{ fontSize: 11, color: THEME.textMuted }}>...他 {steps.length - 3} ステップ</div>}
                      </div>
                    </div>
                    <div style={{ padding: "0 20px 20px" }}>
                      <Link
                        to={`/scenarios/edit/${encodeURIComponent(id)}`}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F1F5F9", padding: "11px 16px", borderRadius: 12, textDecoration: "none", color: THEME.textMain, fontWeight: 800, fontSize: 13 }}
                      >
                        <span>配信ステップを編集</span><ChevronRight size={17} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </>
  );
}