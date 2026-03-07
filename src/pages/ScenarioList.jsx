import React from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, ChevronRight, Settings } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 🎬 ScenarioList - シナリオ管理
// ==========================================

// ステータスのterminalTypeに応じたカラー
function statusColor(terminalType) {
  if (terminalType === "won")     return { bg: "#ECFDF5", text: "#059669", border: "#059669" };
  if (terminalType === "dormant") return { bg: "#FFFBEB", text: "#B45309", border: "#F59E0B" };
  if (terminalType === "lost")    return { bg: "#FEF2F2", text: "#DC2626", border: "#EF4444" };
  return { bg: "#EEF2FF", text: THEME.primary, border: THEME.primary };
}

export default function ScenarioList({ scenarios = [], statuses = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();

  // シナリオIDごとにステップをグルーピング
  const grouped = (scenarios || []).reduce((acc, item) => {
    (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item);
    return acc;
  }, {});

  const scenarioIds = Object.keys(grouped);

  // ステータス → scenarioId のマップ（シナリオIDからステータスを逆引き）
  const scenarioToStatus = {};
  (statuses || []).forEach(st => {
    if (st.scenarioId) scenarioToStatus[st.scenarioId] = st;
  });

  // シナリオに紐づいたステータスを持つもの一覧
  const linkedStatuses = (statuses || []).filter(st => st.scenarioId);

  // 削除
  const handleDelete = async (id) => {
    if (!window.confirm(`シナリオ「${id}」を削除しますか？\n紐づいているステータスの設定も解除されます。`)) return;
    try {
      await axios.post(
        gasUrl || GAS_URL,
        JSON.stringify({ action: "deleteScenario", scenarioID: id }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      alert("削除に失敗しました");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" }}>

      {/* ── ヘッダー ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: 0 }}>シナリオ管理</h1>
        <Link to="/scenarios/new" style={{ ...styles.btn, ...styles.btnPrimary, textDecoration: "none" }}>
          <Plus size={18} /> 新規作成
        </Link>
      </header>

      {/* ── 自動適用シナリオ 一覧 ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.05em", margin: "0 0 4px" }}>
              自動適用シナリオ設定
            </p>
            <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>
              ステータスに移動した際に自動で開始されるシナリオです。変更はステータス設定から行えます。
            </p>
          </div>
          <button
            onClick={() => navigate("/status-settings")}
            style={{ ...styles.btn, ...styles.btnSecondary, gap: 8 }}
          >
            <Settings size={15} /> ステータス設定で変更
          </button>
        </div>

        {linkedStatuses.length === 0 ? (
          <div style={{ padding: "32px 24px", backgroundColor: "white", borderRadius: 16, border: `2px dashed ${THEME.border}`, textAlign: "center", color: THEME.textMuted, fontSize: 13 }}>
            シナリオが紐づいているステータスがありません。<br />
            ステータス設定からシナリオを割り当ててください。
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {linkedStatuses.map(st => {
              const col   = statusColor(st.terminalType);
              const steps = (grouped[st.scenarioId] || []).sort((a, b) => a["ステップ数"] - b["ステップ数"]);
              return (
                <div key={st.name} style={{ ...styles.card, borderTop: `4px solid ${col.border}`, padding: 24 }}>
                  {/* ステータス名 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div style={{ backgroundColor: col.bg, padding: "6px 14px", borderRadius: 10 }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: col.text }}>{st.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: THEME.textMuted }}>に移動したとき</span>
                  </div>

                  {/* シナリオID */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 6 }}>シナリオ</div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: THEME.textMain, marginBottom: 14 }}>
                    {st.scenarioId}
                    <span style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 500, marginLeft: 8 }}>
                      （{steps.length} ステップ）
                    </span>
                  </div>

                  {/* ステップ一覧 */}
                  {steps.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                      {steps.slice(0, 4).map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: col.border, flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, minWidth: 44, color: THEME.textMain }}>{s["経過日数"]}日後</span>
                          <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s["message"]}
                          </span>
                        </div>
                      ))}
                      {steps.length > 4 && (
                        <div style={{ fontSize: 11, color: THEME.textMuted }}>...他 {steps.length - 4} ステップ</div>
                      )}
                    </div>
                  )}

                  <Link
                    to={`/scenarios/edit/${encodeURIComponent(st.scenarioId)}`}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: col.bg, padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: col.text, fontWeight: 800, fontSize: 13 }}
                  >
                    <span>ステップを編集</span><ChevronRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 全シナリオ一覧 ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.05em", marginBottom: 16 }}>
          全シナリオ
        </p>

        {scenarioIds.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: THEME.textMuted, fontSize: 14 }}>
            シナリオがありません。「＋ 新規作成」から作成してください。
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
            {scenarioIds.map(id => {
              const steps      = (grouped[id] || []).sort((a, b) => a["ステップ数"] - b["ステップ数"]);
              const linkedSt   = scenarioToStatus[id];
              const col        = linkedSt ? statusColor(linkedSt.terminalType) : null;

              return (
                <div key={id} style={{ ...styles.card, padding: 0, overflow: "hidden", borderTop: col ? `3px solid ${col.border}` : undefined }}>
                  <div style={{ padding: 28 }}>
                    {/* ヘッダー */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "6px 14px", borderRadius: 10, fontWeight: 900, fontSize: 14 }}>
                          {id}
                        </div>
                        {linkedSt && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: col.text, backgroundColor: col.bg, padding: "3px 8px", borderRadius: 99 }}>
                            {linkedSt.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(id)}
                        style={{ color: THEME.danger, background: "#FEF2F2", padding: 8, borderRadius: 8, border: "none", cursor: "pointer" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.textMuted, fontSize: 13, marginBottom: 16 }}>
                      <Clock size={14} /> {steps.length} ステップ
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {steps.slice(0, 3).map((st, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: THEME.primary, flexShrink: 0 }} />
                          <span style={{ fontWeight: 800, minWidth: 44, color: THEME.textMain }}>{st["経過日数"]}日後</span>
                          <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {st["message"]}
                          </span>
                        </div>
                      ))}
                      {steps.length > 3 && (
                        <div style={{ fontSize: 11, color: THEME.textMuted }}>...他 {steps.length - 3} ステップ</div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: "0 24px 24px" }}>
                    <Link
                      to={`/scenarios/edit/${encodeURIComponent(id)}`}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F1F5F9", padding: "12px 16px", borderRadius: 12, textDecoration: "none", color: THEME.textMain, fontWeight: 800, fontSize: 13 }}
                    >
                      <span>配信ステップを編集</span><ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}