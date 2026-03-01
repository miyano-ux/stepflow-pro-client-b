import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, ChevronRight, Trophy, Moon, Check, ChevronDown } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 🎬 ScenarioList - シナリオ管理
// ==========================================

export default function ScenarioList({ scenarios = [], scenarioSettings = {}, statuses = [], onRefresh, gasUrl }) {

  // シナリオIDの一覧（重複なし）
  const scenarioIds = [...new Set((scenarios || []).map((s) => s["シナリオID"]))];

  // 成約・休眠ステータスのラベル（status-settingsの後ろから3番目・2番目）
  const wonLabel     = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";

  // 選択中のシナリオID
  const [wonId,     setWonId]     = useState(scenarioSettings?.wonScenarioId     || "");
  const [dormantId, setDormantId] = useState(scenarioSettings?.dormantScenarioId || "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // シナリオをステップ数でグルーピング
  const grouped = (scenarios || []).reduce((acc, item) => {
    (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item);
    return acc;
  }, {});

  // 削除
  const handleDelete = async (id) => {
    if (!window.confirm(`シナリオ「${id}」を削除しますか？`)) return;
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "deleteScenario", scenarioID: id }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      alert("削除に失敗しました");
    }
  };

  // 成約・休眠シナリオ設定を保存（全員共通の業務ルール → GAS ScriptProperties に保存）
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "saveScenarioSettings", wonScenarioId: wonId, dormantScenarioId: dormantId }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onRefresh();
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 特定IDのステップ数を返す
  const stepCount = (id) => (grouped[id] || []).length;

  // シナリオ選択プルダウン
  const ScenarioSelector = ({ value, onChange }) => (
    <div style={{ position: "relative" }}>
      <select
        style={{ ...styles.input, paddingRight: 36, appearance: "none", fontWeight: 700, fontSize: 14 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">未設定</option>
        {scenarioIds.map((id) => (
          <option key={id} value={id}>
            {id}（{stepCount(id)} ステップ）
          </option>
        ))}
      </select>
      <ChevronDown size={15} style={{ position: "absolute", right: 12, top: 14, pointerEvents: "none", color: THEME.textMuted }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" }}>

      {/* ── ヘッダー ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>シナリオ管理</h1>
        <Link
          to="/scenarios/new"
          style={{ ...styles.btn, ...styles.btnPrimary, textDecoration: "none" }}
        >
          <Plus size={18} /> 新規作成
        </Link>
      </header>

      {/* ── 成約・休眠 固定シナリオ設定 ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.05em", margin: "0 0 4px" }}>
              自動適用シナリオ設定
            </p>
            <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>
              カンバンボードで以下のステータスに移動した際に自動で開始されるシナリオです
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              ...styles.btn,
              ...(saved ? { backgroundColor: THEME.success } : styles.btnPrimary),
              minWidth: 120,
            }}
          >
            {saved
              ? <><Check size={16} /> 保存済み</>
              : saving
              ? "保存中..."
              : <><Check size={16} /> 設定を保存</>
            }
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* 成約シナリオ */}
          <div style={{
            ...styles.card,
            borderTop: `4px solid ${THEME.success}`,
            padding: "28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#ECFDF5", padding: 10, borderRadius: 12 }}>
                <Trophy size={22} color={THEME.success} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: THEME.textMain }}>
                  {wonLabel} シナリオ
                </div>
                <div style={{ fontSize: 12, color: THEME.textMuted }}>
                  顧客が「{wonLabel}」になったときに開始
                </div>
              </div>
            </div>

            <ScenarioSelector value={wonId} onChange={setWonId} />

            {wonId && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: "0 0 10px" }}>配信ステップ</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(grouped[wonId] || [])
                    .sort((a, b) => a["ステップ数"] - b["ステップ数"])
                    .slice(0, 4)
                    .map((st, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: THEME.success, flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, minWidth: 44, color: THEME.textMain }}>{st["経過日数"]}日後</span>
                        <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {st["message"]}
                        </span>
                      </div>
                    ))}
                  {(grouped[wonId] || []).length > 4 && (
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>
                      ...他 {(grouped[wonId] || []).length - 4} ステップ
                    </div>
                  )}
                </div>
                <Link
                  to={`/scenarios/edit/${encodeURIComponent(wonId)}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, backgroundColor: "#ECFDF5", padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: THEME.success, fontWeight: 800, fontSize: 13 }}
                >
                  <span>ステップを編集</span><ChevronRight size={16} />
                </Link>
              </div>
            )}
          </div>

          {/* 休眠シナリオ */}
          <div style={{
            ...styles.card,
            borderTop: "4px solid #F59E0B",
            padding: "28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ backgroundColor: "#FFFBEB", padding: 10, borderRadius: 12 }}>
                <Moon size={22} color="#F59E0B" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: THEME.textMain }}>
                  {dormantLabel} シナリオ
                </div>
                <div style={{ fontSize: 12, color: THEME.textMuted }}>
                  顧客が「{dormantLabel}」になったときに開始
                </div>
              </div>
            </div>

            <ScenarioSelector value={dormantId} onChange={setDormantId} />

            {dormantId && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: "0 0 10px" }}>配信ステップ</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(grouped[dormantId] || [])
                    .sort((a, b) => a["ステップ数"] - b["ステップ数"])
                    .slice(0, 4)
                    .map((st, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#F59E0B", flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, minWidth: 44, color: THEME.textMain }}>{st["経過日数"]}日後</span>
                        <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {st["message"]}
                        </span>
                      </div>
                    ))}
                  {(grouped[dormantId] || []).length > 4 && (
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>
                      ...他 {(grouped[dormantId] || []).length - 4} ステップ
                    </div>
                  )}
                </div>
                <Link
                  to={`/scenarios/edit/${encodeURIComponent(dormantId)}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, backgroundColor: "#FFFBEB", padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: "#B45309", fontWeight: 800, fontSize: 13 }}
                >
                  <span>ステップを編集</span><ChevronRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 通常シナリオ一覧 ── */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.05em", marginBottom: 16 }}>
          全シナリオ
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
          {Object.entries(grouped).map(([id, steps]) => {
            const isWon     = id === wonId;
            const isDormant = id === dormantId;
            return (
              <div
                key={id}
                style={{
                  ...styles.card,
                  padding: 0,
                  overflow: "hidden",
                  borderTop: isWon ? `3px solid ${THEME.success}` : isDormant ? "3px solid #F59E0B" : undefined,
                }}
              >
                <div style={{ padding: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "6px 14px", borderRadius: "10px", fontWeight: "900", fontSize: 14 }}>
                        {id}
                      </div>
                      {isWon && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: THEME.success, backgroundColor: "#ECFDF5", padding: "3px 8px", borderRadius: 99 }}>
                          <Trophy size={12} /> {wonLabel}
                        </span>
                      )}
                      {isDormant && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#B45309", backgroundColor: "#FFFBEB", padding: "3px 8px", borderRadius: 99 }}>
                          <Moon size={12} /> {dormantLabel}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(id)}
                      style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted, fontSize: "13px", marginBottom: "16px" }}>
                    <Clock size={14} /> {steps.length} ステップ
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[...steps]
                      .sort((a, b) => a["ステップ数"] - b["ステップ数"])
                      .slice(0, 3)
                      .map((st, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary, flexShrink: 0 }} />
                          <span style={{ fontWeight: "800", minWidth: "44px", color: THEME.textMain }}>{st["経過日数"]}日後</span>
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
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F1F5F9", padding: "12px 16px", borderRadius: "12px", textDecoration: "none", color: THEME.textMain, fontWeight: "800", fontSize: 13 }}
                  >
                    <span>配信ステップを編集</span><ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}