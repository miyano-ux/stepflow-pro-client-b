import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Plus, Trash2, ChevronLeft, Save, Flag, Trash, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import ConfirmModal from "../components/ConfirmModal";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";


const PROMPT_FIELD_OPTIONS = [
  { key: "契約種別",    label: "📋 契約種別" },
  { key: "流入元",      label: "🌐 流入元" },
  { key: "担当者メール", label: "👤 担当者" },
];

// ─────────────────────────────────────────────────────────
// terminalType ごとの設定
// ─────────────────────────────────────────────────────────
const TERMINAL_META = {
  dormant:  { icon: "⏸",  color: "#D97706", bg: "#FFFBEB", label: "終点ステータス", canDelete: true,  canRename: true,  hasPlacement: true,  canAdd: true  },
  won:      { icon: "🏆", color: "#059669", bg: "#ECFDF5", label: "成約",           canDelete: false, canRename: true,  hasPlacement: true,  canAdd: false },
  lost:     { icon: "🗑",  color: "#DC2626", bg: "#FEF2F2", label: "失注",           canDelete: false, canRename: true,  hasPlacement: true,  canAdd: false },
  excluded: { icon: "🚫", color: "#9CA3AF", bg: "#F3F4F6", label: "除外",           canDelete: false, canRename: true,  hasPlacement: false, canAdd: false },
};

const PLACEMENT_OPTIONS = [
  { value: "bottom", label: "⬇ 下部" },
  { value: "right",  label: "➡ 右側" },
];

// 終点ステータス（dormant）の再アプローチ時期の選択肢
const REAPPROACH_MONTH_OPTIONS = [
  { months: 0,  label: "なし" },
  { months: 1,  label: "1ヶ月後" },
  { months: 2,  label: "2ヶ月後" },
  { months: 3,  label: "3ヶ月後" },
  { months: 6,  label: "6ヶ月後" },
  { months: 12, label: "12ヶ月後" },
];

// ── 通常フロー行 ───────────────────────────────────────
function StatusRow({ s, idx, total, scenarios, onChange, onDelete, onDragStart, onDragOver, onDrop, onMoveUp, onMoveDown, onPromptAdd, onPromptRemove, usedScenarios }) {
  const { isMobile } = useWindowWidth();
  return (
    <div
      draggable={!isMobile}
      onDragStart={!isMobile ? (e => onDragStart(e, idx)) : undefined}
      onDragOver={!isMobile ? (e => onDragOver(e, idx)) : undefined}
      onDrop={!isMobile ? (e => onDrop(e, idx)) : undefined}
      style={{ display: "flex", alignItems: "flex-start", gap: 8, backgroundColor: "white", border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: isMobile ? "default" : "grab" }}
    >
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, paddingTop: 6 }}>
          <button onClick={() => onMoveUp(idx)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 3, color: idx === 0 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
            <ChevronUp size={16} />
          </button>
          <button onClick={() => onMoveDown(idx)} disabled={idx === total - 1} style={{ background: "none", border: "none", cursor: idx === total - 1 ? "default" : "pointer", padding: 3, color: idx === total - 1 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
            <ChevronDown size={16} />
          </button>
        </div>
      ) : (
        <div style={{ paddingTop: 10, color: THEME.textMuted, flexShrink: 0 }}><GripVertical size={16} /></div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 2fr 1.2fr", gap: 10, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>ステータス名</div>
          <input style={{ ...styles.input, margin: 0 }} value={s.name} onChange={e => onChange(idx, "name", e.target.value)} placeholder="例: 対応中" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>自動シナリオ（任意）</div>
          <CustomSelect
            value={s.scenarioId || ""}
            onChange={v => onChange(idx, "scenarioId", v)}
            options={[
              { value: "", label: "設定しない" },
              ...[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => {
                const isUsed = usedScenarios.has(sid) && sid !== s.scenarioId;
                return { value: sid, label: sid + (isUsed ? "（他で使用中）" : ""), disabled: isUsed };
              })
            ]}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>レポート集計</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={!!s.reportCount} onChange={e => { onChange(idx, "reportCount", e.target.checked); onChange(idx, "reportArrival", e.target.checked); }} style={{ width: 14, height: 14, accentColor: THEME.primary }} /> 集計する
          </label>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>移動時の追加入力項目</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {(s.promptFields || []).map((pf, pi) => (
              <span key={pi} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                {PROMPT_FIELD_OPTIONS.find(o => o.key === pf)?.label?.replace(/^\S+\s/, "") || pf}
                <button onClick={() => onPromptRemove(idx, pi)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: THEME.primary, lineHeight: 1, fontSize: 14 }}>×</button>
              </span>
            ))}
            {PROMPT_FIELD_OPTIONS.filter(o => !(s.promptFields || []).includes(o.key)).map(o => (
              <button key={o.key} onClick={() => onPromptAdd(idx, o.key)} style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 99, border: `1px dashed ${THEME.border}`, backgroundColor: "transparent", color: THEME.textMuted, cursor: "pointer" }}>
                + {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => onDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: THEME.textMuted }}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}


// ── 契約固定ステータス行 ──────────────────────────────
const CONTRACT_COLOR  = "#0EA5E9";
const CONTRACT_BG     = "#F0F9FF";
const CONTRACT_BORDER = "#BAE6FD";

function ContractRow({ s, idx, total, scenarios, onChange, onDelete, onDragStart, onDragOver, onDrop, onMoveUp, onMoveDown, onPromptAdd, onPromptRemove, usedScenarios }) {
  const { isMobile } = useWindowWidth();
  return (
    <div
      draggable={!isMobile}
      onDragStart={!isMobile ? (e => onDragStart(e, idx)) : undefined}
      onDragOver={!isMobile ? (e => onDragOver(e, idx)) : undefined}
      onDrop={!isMobile ? (e => onDrop(e, idx)) : undefined}
      style={{
        display: "flex", alignItems: "flex-start", gap: 8,
        backgroundColor: CONTRACT_BG,
        border: `1.5px solid ${CONTRACT_BORDER}`,
        borderLeft: `4px solid ${CONTRACT_COLOR}`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 8,
        cursor: isMobile ? "default" : "grab",
      }}
    >
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, paddingTop: 6 }}>
          <button onClick={() => onMoveUp(idx)} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 3, color: idx === 0 ? `${CONTRACT_COLOR}30` : CONTRACT_COLOR, display: "flex" }}>
            <ChevronUp size={16} />
          </button>
          <button onClick={() => onMoveDown(idx)} disabled={idx === total - 1} style={{ background: "none", border: "none", cursor: idx === total - 1 ? "default" : "pointer", padding: 3, color: idx === total - 1 ? `${CONTRACT_COLOR}30` : CONTRACT_COLOR, display: "flex" }}>
            <ChevronDown size={16} />
          </button>
        </div>
      ) : (
        /* ドラッグハンドル（水色） */
        <div style={{ paddingTop: 10, color: CONTRACT_COLOR, flexShrink: 0 }}><GripVertical size={16} /></div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 2fr 1.2fr", gap: 10, alignItems: "start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: CONTRACT_COLOR, marginBottom: 4 }}>ステータス名</div>
          <input
            style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${CONTRACT_COLOR}60`, fontSize: 13, fontWeight: 700, outline: "none", width: "100%", boxSizing: "border-box", backgroundColor: "white" }}
            value={s.name}
            onChange={e => onChange(idx, "name", e.target.value)}
            placeholder="例: 契約"
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: CONTRACT_COLOR, marginBottom: 4 }}>自動シナリオ（任意）</div>
          <CustomSelect
            value={s.scenarioId || ""}
            onChange={v => onChange(idx, "scenarioId", v)}
            options={[
              { value: "", label: "設定しない" },
              ...[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => {
                const isUsed = usedScenarios.has(sid) && sid !== s.scenarioId;
                return { value: sid, label: sid + (isUsed ? "（他で使用中）" : ""), disabled: isUsed };
              })
            ]}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: CONTRACT_COLOR, marginBottom: 6 }}>レポート集計</div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={!!s.reportCount}
              onChange={e => { onChange(idx, "reportCount", e.target.checked); onChange(idx, "reportArrival", e.target.checked); }}
              style={{ width: 14, height: 14, accentColor: CONTRACT_COLOR }}
            /> 集計する
          </label>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: CONTRACT_COLOR, marginBottom: 4 }}>移動時の追加入力項目</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {(s.promptFields || []).map((pf, pi) => (
              <span key={pi} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#E0F2FE", color: CONTRACT_COLOR, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                {PROMPT_FIELD_OPTIONS.find(o => o.key === pf)?.label?.replace(/^\S+\s/, "") || pf}
                <button onClick={() => onPromptRemove(idx, pi)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: CONTRACT_COLOR, lineHeight: 1, fontSize: 14 }}>×</button>
              </span>
            ))}
            {PROMPT_FIELD_OPTIONS.filter(o => !(s.promptFields || []).includes(o.key)).map(o => (
              <button key={o.key} onClick={() => onPromptAdd(idx, o.key)}
                style={{ fontSize: 12, fontWeight: 800, padding: "4px 10px", borderRadius: 99, border: `1px dashed ${CONTRACT_COLOR}80`, backgroundColor: "transparent", color: CONTRACT_COLOR, cursor: "pointer" }}>
                + {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => onDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: CONTRACT_COLOR }} title="削除">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── 終点ステータス行 ──────────────────────────────────
function TerminalRow({ row, idx, scenarios, usedScenarios, flowStatusNames = [], linkedScenarioByName = {}, onChange, onDelete }) {
  const { isMobile } = useWindowWidth();
  const meta = TERMINAL_META[row.terminalType] || TERMINAL_META.dormant;
  const { icon, color, bg, canDelete, canRename, hasPlacement } = meta;
  const isLost = row.terminalType === "lost";
  const isDormant = row.terminalType === "dormant";

  const inputRef = useRef(null);
  const [newOption, setNewOption] = useState("");

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const current = row.lostReasonOptions || [];
    if (current.includes(trimmed)) { setNewOption(""); return; }
    onChange(idx, "lostReasonOptions", [...current, trimmed]);
    setNewOption("");
  };

  const handleRemoveOption = (opt) => {
    onChange(idx, "lostReasonOptions", (row.lostReasonOptions || []).filter(o => o !== opt));
  };

  return (
    <div style={{ backgroundColor: bg, border: `1.5px solid ${color}40`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, fontSize: 16 }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : (isDormant ? "1.5fr 1fr 0.8fr" : "1.5fr 1.5fr 1fr 0.8fr"), gap: 10, alignItems: "start" }}>
            {/* ステータス名 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>ステータス名</div>
              <input
                style={{ ...styles.input, margin: 0, borderColor: `${color}50`, backgroundColor: canRename ? "white" : "#F3F4F6", color: canRename ? undefined : THEME.textMuted }}
                value={row.name}
                onChange={e => canRename && onChange(idx, "name", e.target.value)}
                readOnly={!canRename}
              />
            </div>

            {/* 自動シナリオ（dormant 以外） */}
            {!isDormant && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>自動シナリオ（任意）</div>
                <CustomSelect
                  value={row.scenarioId || ""}
                  onChange={v => onChange(idx, "scenarioId", v)}
                  color={color}
                  options={[
                    { value: "", label: "設定しない" },
                    ...[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => {
                      const isUsed = usedScenarios.has(sid) && sid !== row.scenarioId;
                      return { value: sid, label: sid + (isUsed ? "（他で使用中）" : ""), disabled: isUsed };
                    })
                  ]}
                />
              </div>
            )}

            {/* 配置 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{hasPlacement ? "カンバン配置" : "配置（固定）"}</div>
              {hasPlacement ? (
                <div style={{ display: "flex", gap: 6 }}>
                  {PLACEMENT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => onChange(idx, "placement", opt.value)} style={{
                      flex: 1, minWidth: 0, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
                      border: `2px solid ${(row.placement || "bottom") === opt.value ? color : THEME.border}`,
                      backgroundColor: (row.placement || "bottom") === opt.value ? bg : "white",
                      color: (row.placement || "bottom") === opt.value ? color : THEME.textMuted,
                    }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", padding: "8px 4px" }}>右下コーナー固定</div>
              )}
            </div>

            {/* 集計 */}
            {/* 【G1-013】除外（excluded）は集計側が常に対象外として扱うため
                （StatusAnalysisReport.jsx / SourceReport.jsx の
                  `statuses.filter(s => s.reportCount && s.terminalType !== "excluded")`、
                  LostReport.jsx の excludedNames 除外）、切替UIを出さず固定表示にする。
                誤ってONで保存しても集計に影響しない無意味なフラグの永続化を防ぐ。 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>レポート集計</div>
              {row.terminalType === "excluded" ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", padding: "8px 0" }}>常に集計対象外</div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  <input type="checkbox" checked={!!row.reportCount} onChange={e => { onChange(idx, "reportCount", e.target.checked); onChange(idx, "reportArrival", e.target.checked); }} style={{ width: 14, height: 14, accentColor: color, flexShrink: 0 }} /> 集計する
                </label>
              )}
            </div>
          </div>

          {/* 失注理由の選択肢（lost タイプのみ） */}
          {isLost && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>失注理由の選択肢</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
                {(row.lostReasonOptions || []).map((opt) => (
                  <span key={opt} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#FEF2F2", color: "#DC2626", padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                    {opt}
                    <button onClick={() => handleRemoveOption(opt)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#DC2626", lineHeight: 1, fontSize: 14, display: "flex" }}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(row.lostReasonOptions || []).length === 0 && (
                  <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>選択肢が未設定です（未設定の場合は既定の選択肢が使われます）</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  ref={inputRef}
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddOption()}
                  placeholder="例: 価格が合わなかった"
                  style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "7px 12px", borderRadius: 8, border: `1px solid ${color}50`, fontSize: 13, fontWeight: 700, outline: "none" }}
                />
                <button
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 8, border: `1px solid ${color}80`, backgroundColor: newOption.trim() ? bg : "transparent", color, fontSize: 12, fontWeight: 800, cursor: newOption.trim() ? "pointer" : "default", opacity: newOption.trim() ? 1 : 0.5, flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  <Plus size={13} /> 追加
                </button>
              </div>
            </div>
          )}

          {/* 再アプローチ設定（dormant タイプのみ） */}
          {isDormant && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8 }}>🔁 再アプローチ設定</div>
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 14 : 20, flexWrap: "wrap", alignItems: isMobile ? "stretch" : "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>再アプローチ時期</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {REAPPROACH_MONTH_OPTIONS.map(opt => {
                      const active = (row.reapproachMonths || 0) === opt.months;
                      return (
                        <button key={opt.months} onClick={() => onChange(idx, "reapproachMonths", opt.months)} style={{
                          padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800, cursor: "pointer",
                          border: `2px solid ${active ? color : THEME.border}`,
                          backgroundColor: active ? bg : "white",
                          color: active ? color : THEME.textMuted,
                        }}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 【B1-046】復帰先ステータス：再アプローチ（シナリオ配信開始）と同時に
                    自動で変更する対応ステータスの事前設定。カンバンの休眠モーダルの初期値になる。
                    選択肢は通常フローのステータスのみ（契約固定 isFixed は受託情報の入力を伴うため対象外）。
                    【B1-047】連動シナリオの決定要因になるため、適用シナリオより先に選ばせる。 */}
                {(row.reapproachMonths || 0) > 0 && (
                  <div style={isMobile ? { width: "100%", boxSizing: "border-box" } : { minWidth: 220 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>復帰先ステータス</div>
                    <CustomSelect
                      value={row.reapproachNextStatus || ""}
                      onChange={v => {
                        onChange(idx, "reapproachNextStatus", v);
                        // 【B1-047】復帰先に自動シナリオが連動している場合は、適用シナリオも
                        // 連動シナリオへ同期する（保存値と表示を常に一致させる）
                        const linked = linkedScenarioByName[v] || "";
                        if (linked) onChange(idx, "reapproachScenarioId", linked);
                      }}
                      color={color}
                      options={[
                        { value: "", label: "選択してください" },
                        ...flowStatusNames.map(name => ({ value: name, label: name }))
                      ]}
                    />
                  </div>
                )}
                {/* 【B1-047】適用シナリオ：復帰先に連動シナリオがあればロック表示（自動適用）、
                    なければ「どのステータスにも連動していないシナリオ」から自由選択 */}
                {(row.reapproachMonths || 0) > 0 && (() => {
                  const linked = linkedScenarioByName[row.reapproachNextStatus || ""] || "";
                  if (linked) {
                    return (
                      <div style={isMobile ? { width: "100%", boxSizing: "border-box" } : { minWidth: 220 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>適用シナリオ</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 12px", boxSizing: "border-box", border: `1px solid ${THEME.border}`, borderRadius: 10, backgroundColor: "#F8FAFC" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linked}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#EEF2FF", color: "#6366F1", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>ステータスに連動</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div style={isMobile ? { width: "100%", boxSizing: "border-box" } : { minWidth: 220 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>適用シナリオ</div>
                      <CustomSelect
                        value={row.reapproachScenarioId || ""}
                        onChange={v => onChange(idx, "reapproachScenarioId", v)}
                        color={color}
                        options={[
                          { value: "", label: "シナリオを選択しない" },
                          ...[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean)
                            .filter(sid => !usedScenarios.has(sid) || sid === row.reapproachScenarioId)
                            .map(sid => ({ value: sid, label: sid }))
                        ]}
                      />
                    </div>
                  );
                })()}
              </div>
              <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                {(() => {
                  const linked = linkedScenarioByName[row.reapproachNextStatus || ""] || "";
                  const effScenario = linked || row.reapproachScenarioId || "";
                  if ((row.reapproachMonths || 0) === 0)
                    return "「なし」の場合、カンバンでこのステータスに移しても再アプローチは予約されません。";
                  if (!row.reapproachNextStatus && !effScenario)
                    return "復帰先ステータスと適用シナリオを選択すると、カンバンでこのステータスに移したとき再アプローチが予約されます。";
                  if (!effScenario)
                    return "適用シナリオを選択すると、カンバンでこのステータスに移したとき再アプローチが予約されます。";
                  if (!row.reapproachNextStatus)
                    return `カンバンでこのステータスに移すと、${row.reapproachMonths}ヶ月後にシナリオ「${effScenario}」が自動で予約されます。復帰先ステータスも選ぶと、配信開始と同時にステータスが自動で変更されます（カンバンの確認モーダルでは復帰先の選択が必須です）。`;
                  return `カンバンでこのステータスに移すと、${row.reapproachMonths}ヶ月後にシナリオ「${effScenario}」が自動で予約され、配信開始と同時にステータスが「${row.reapproachNextStatus}」へ変更されます。${linked ? "（シナリオは復帰先ステータスの連動シナリオが自動で適用されます）" : ""}`;
                })()}
              </div>
            </div>
          )}
        </div>

        {canDelete ? (
          <button onClick={() => onDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color, flexShrink: 0 }} title="削除">
            <Trash2 size={15} />
          </button>
        ) : (
          <div style={{ width: 27, flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}

// ── セクションヘッダー ────────────────────────────────
function SectionHeader({ icon, label, color, canAdd, onAdd, addLabel, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontSize: 13, fontWeight: 900, color }}>{label}</span>
        {!canAdd && <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", marginLeft: 2 }}>（削除不可）</span>}
      </div>
      {canAdd && (
        <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", border: `1px dashed ${color}`, borderRadius: 8, backgroundColor: TERMINAL_META.dormant.bg, color, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
          <Plus size={12} /> {addLabel || "追加"}
        </button>
      )}
      {note && <span style={{ fontSize: 11, color: THEME.textMuted }}>{note}</span>}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────
export default function StatusSettings({ statuses: statusesProp = [], scenarios = [], customers = [], isLoading = false, loadError = false, onRefresh, gasUrl }) {
  const navigate  = useNavigate();
  const showToast = useToast();
  const { isMobile } = useWindowWidth();
  const [flowRows,     setFlowRowsRaw]     = useState([]);
  const [terminalRows, setTerminalRowsRaw] = useState([]);
  const [saving,       setSaving]          = useState(false);
  // 【安定化】ユーザーが編集を始めたかどうか。true の間は statusesProp の変化
  // （起動時キャッシュ→裏refresh完了・保存後のバックグラウンド更新等）で
  // 編集中の行 state を初期化しない（＝入力内容が黙って消える事故の防止）。
  // 別端末との衝突は保存時の G1-013（baseline照合）がサーバー側で検知する。
  const dirtyRef = useRef(false);
  const setFlowRows     = (updater) => { dirtyRef.current = true; setFlowRowsRaw(updater); };
  const setTerminalRows = (updater) => { dirtyRef.current = true; setTerminalRowsRaw(updater); };
  const [dragIdx,      setDragIdx]      = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  // 【G1-013】保存時の楽観ロック用に「読み込んだ時点の statuses」をそのまま控える。
  // 保存リクエストに baseline として同梱し、GAS 側（saveStatuses）が現在のシート内容と
  // 突き合わせて、乖離していれば保存を拒否する（古いキャッシュ・別端末・API直叩き後の
  // 未リロード保存による全件置換上書きで、失注理由選択肢などの実データが失われる事故を防ぐ）。
  const baselineRef = useRef([]);
  // 【G1-006拡張】削除確定した「顧客が紐づくステータス」の付け替え予約 {from, to}。
  // from は元名称（_originalName）、to は削除確認モーダルのプルダウンで選択された
  // 付け替え先ステータス名（選択時点の名称）。保存時に renames へ合流させ、
  // GAS の改名マイグレーション（gas_updated.js:1860-1952）を流用して
  // 顧客シート・ステータス履歴を選択先へ一括付け替えする。
  // ※ ステータスは ID を持たず名称のみで紐づくため、to は保存時に
  //   「①改名追従 → ②連鎖解決 → ③実在チェック」を経て確定する（handleSave 参照）。
  const [pendingReassigns, setPendingReassigns] = useState([]);

  // ── 【G1-006】ステータス名ごとの利用顧客件数 ────────────────────────
  // ステータスは ID を持たず「名称」だけで顧客レコードと紐づいているため
  // （顧客リストシートの「対応ステータス」列 / gas_updated.js:1717-1724）、
  // 削除すると該当顧客の値が宙吊りになる。削除前に件数を提示して誤操作を防ぐ。
  const usageByName = useMemo(() => {
    const map = {};
    (customers || []).forEach(c => {
      const key = String(c?.["対応ステータス"] || "").trim();
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [customers]);
  const usageOf = (name) => usageByName[String(name || "").trim()] || 0;

  useEffect(() => {
    // 【安定化】編集中（dirty）は外部由来の statusesProp 更新で行 state を初期化しない。
    // 従来はここが無条件で走るため、
    //   ・起動時キャッシュ表示→裏の refresh() 完了
    //   ・保存後のバックグラウンド更新
    // のタイミングで編集内容が丸ごと消え「挙動が安定しない」原因になっていた。
    // ※ ガードは dirty のみ。saving を条件に含めると、stale_baseline エラー後の
    //   catch 内 `await onRefresh()`（saving===true の間に完了する）による再初期化が
    //   スキップされ、baseline が古いまま固定 → 以後すべての保存が stale_baseline で
    //   拒否されるループに陥る。
    if (dirtyRef.current) return;
    // 【G1-013】照合用スナップショット（編集 state とは別に、受信値を無加工で保持）
    baselineRef.current = statusesProp;
    if (statusesProp.length > 0) {
      const flows     = statusesProp.filter(s => !s.terminalType);
      const terminals = statusesProp.filter(s => s.terminalType);
      // 【G1-020】読み込み時点の名称を _originalName に控える。
      // 保存時に現在の name と突き合わせ、改名分だけ GAS へ renames として送る。
      // （_originalName は saveStatuses のシート書き込み列には含まれないため、
      //   ペイロードに残っていても保存内容には影響しない）
      setFlowRowsRaw(flows.map(s => ({ ...s, _originalName: s.name })));

      const termArr = terminals.map(s => ({ placement: "bottom", reapproachMonths: 0, reapproachScenarioId: "", reapproachNextStatus: "", ...s, _originalName: s.name }));
      // 必須ステータスが存在しない場合は補完
      if (!termArr.some(s => s.terminalType === "won"))
        termArr.push({ name: "成約", terminalType: "won", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: true, promptFields: [], lostReasonOptions: [] });
      if (!termArr.some(s => s.terminalType === "lost"))
        termArr.push({ name: "失注", terminalType: "lost", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, promptFields: [], lostReasonOptions: [] });
      if (!termArr.some(s => s.terminalType === "excluded"))
        termArr.push({ name: "除外", terminalType: "excluded", placement: "right", scenarioId: "", reportArrival: false, reportCount: false, promptFields: [], lostReasonOptions: [] });
      setTerminalRowsRaw(termArr);
    } else if (!isLoading && !loadError) {
      // 【読込表示】既定行（未対応・対応中・休眠…）での初期化は
      // 「取得が完了して真にステータス0件（新規環境）」のときだけ行う。
      // 従来はリロード直後の statusesProp=[]（データ未着）でもここを通るため、
      // 実際のステータスの代わりにハードコードの既定行が表示され、
      // 「一部ステータスしか無い／消えた」ように見えていた。
      // 読込中・取得失敗時は行を空のままにし、レンダー側でローディング／
      // エラー表示に切り替える（SourceManager / FormSettings と同方針）。
      setFlowRowsRaw([
        { name: "未対応", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true,  promptFields: [], lostReasonOptions: [] },
        { name: "対応中", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true,  promptFields: [], lostReasonOptions: [] },
      ]);
      setTerminalRowsRaw([
        { name: "休眠",   terminalType: "dormant",  placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, reapproachMonths: 0, reapproachScenarioId: "", reapproachNextStatus: "", promptFields: [], lostReasonOptions: [] },
        { name: "成約",   terminalType: "won",      placement: "bottom", scenarioId: "", reportArrival: false, reportCount: true,  promptFields: [], lostReasonOptions: [] },
        { name: "失注",   terminalType: "lost",     placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, promptFields: [], lostReasonOptions: [] },
        { name: "除外",   terminalType: "excluded", placement: "right",  scenarioId: "", reportArrival: false, reportCount: false, promptFields: [], lostReasonOptions: [] },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusesProp, isLoading, loadError]);

  // フロー行操作
  const handleFlowChange   = (idx, key, val) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  // ── 【G1-006拡張】削除確認モーダル（付け替え先プルダウン付き）の共通処理 ──────
  // ・顧客が紐づく（n > 0）場合は付け替え先をプルダウンで選択させる。
  //   初期値は先頭フローステータス（＝従来の固定仕様と同じ）なので、
  //   そのまま「削除する」を押せば挙動は従来どおり。
  // ・選択肢は「通常フローのステータス」のみ。終点（成約・失注・除外・休眠）への
  //   付け替えは、GAS 側ではシート上の名称書き換えだけで副作用（成約金額・失注理由の
  //   入力プロンプト、再アプローチ予約、連動シナリオ起動）が一切走らないため、
  //   成約金額なしの成約顧客の量産（A4-016 の ROI 集計崩れ）等を招く。
  //   B1-046 の復帰先ステータスと同じ制約に揃えて対象外とする。
  //   契約固定（isFixed）も受託情報の入力を伴うため対象外（同じく B1-046 と同基準）。
  // ・削除対象が既存予約の付け替え先（p.to）になっている場合は、顧客 0 件でも
  //   プルダウンを表示して既存予約の付け替え先を選び直させる。
  //   （＝予約の連鎖 A→B→C を削除時点で解消し、GAS renameMap の1パス適用でも
  //     取り残しが出ないようにする。宙吊り予約の予防措置。）
  const requestStatusDelete = ({ row, candidates, isPendingTarget, removeRow }) => {
    const name = (row?.name || "").trim();
    const n    = usageOf(row?.name);
    const needsSelect = n > 0 || isPendingTarget;

    if (needsSelect && candidates.length === 0) {
      showToast("顧客の付け替え先となる通常フローのステータスがありません。先にステータスを追加してください。", "warning");
      return;
    }

    setConfirmModal({
      title: `「${name || "（無題）"}」を削除しますか？`,
      note: n > 0
        ? `このステータスは現在 ${n} 件の顧客に設定されています。削除して保存すると、該当顧客の対応ステータスは下で選択したステータスへ付け替えられます。`
        : isPendingTarget
          ? "このステータスは、先に削除したステータスの付け替え先に指定されています。新しい付け替え先を選択してください。"
          : "この操作は「保存する」を押すまでシートには反映されません。",
      select: needsSelect ? {
        label: "付け替え先ステータス",
        options: candidates.map(c => ({ value: c, label: c })),
        defaultValue: candidates[0],
      } : undefined,
      onConfirm: (selectedTo) => {
        if (needsSelect) {
          // 顧客シート側が保持しているのは読み込み時点の名称（_originalName）
          const from   = (row?._originalName || row?.name || "").trim();
          const target = (selectedTo || candidates[0] || "").trim();
          setPendingReassigns(prev => {
            // この行（の現名称）を付け替え先にしている既存予約は、選び直した先へ retarget する
            const retargeted = prev.map(p => ((p.to || "").trim() === name && name) ? { ...p, to: target } : p);
            // 顧客が紐づく場合のみ新規予約を追加（n=0 の retarget 専用ケースでは
            // 従来どおり GAS へ移送エントリを送らない＝履歴の書き換え範囲を従来と同じに保つ）
            if (n > 0 && from && target && !retargeted.some(p => p.from === from)) {
              return [...retargeted, { from, to: target }];
            }
            return retargeted;
          });
        }
        removeRow();
        setConfirmModal(null);
      },
    });
  };

  // 【G1-006】確認モーダル経由に変更（SourceManager.jsx:213-244 の削除UXに揃える）。
  // 【G1-006拡張】顧客が紐づく場合は付け替え先をモーダル内プルダウンで選択させる。
  const handleFlowDelete   = (idx) => {
    const row  = flowRows[idx];
    const name = (row?.name || "").trim();
    requestStatusDelete({
      row,
      // 削除対象自身（index 一致で除外。編集中は同名重複がありうるため名称比較にしない）
      // ・契約固定・無名行を除いた通常フローのステータス名
      candidates: flowRows
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => i !== idx && !r.isFixed && (r.name || "").trim())
        .map(({ r }) => r.name.trim()),
      isPendingTarget: !!name && pendingReassigns.some(p => (p.to || "").trim() === name),
      removeRow: () => setFlowRows(prev => prev.filter((_, i) => i !== idx)),
    });
  };
  // 【安定化】新規行は全キーを明示して作る。キー欠落（undefined）の行は GAS 側の
  // G1-013恒久対策フォールバックが「同名の旧行セルを引き継ぐ」ため、過去に同名で
  // 存在したステータスの設定が意図せず復活し、baseline照合の不一致要因にもなる。
  const handleFlowAdd      = () => setFlowRows(prev => [...prev, { name: "", terminalType: "", scenarioId: "", reportArrival: false, reportCount: false, promptFields: [], lostReasonOptions: [], reapproachMonths: 0, reapproachScenarioId: "", reapproachNextStatus: "" }]);
  const handlePromptAdd    = (idx, fk) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, promptFields: [...(r.promptFields || []).filter(p => p !== fk), fk] } : r));
  const handlePromptRemove = (idx, pi) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, promptFields: (r.promptFields || []).filter((_, j) => j !== pi) } : r));

  // D&D
  const handleDragStart = (e, idx) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(idx); };
  const handleDragOver  = (e) => { e.preventDefault(); };
  const handleDrop      = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...flowRows];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    setFlowRows(next);
    setDragIdx(null);
  };

  // モバイル用：上下ボタンによる並び替え（D&Dの代替）
  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setFlowRows(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };
  const handleMoveDown = (idx) => {
    setFlowRows(prev => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  // 終点行操作
  const handleTerminalChange = (idx, key, val) => setTerminalRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  // 【G1-006】終点ステータスも同様に確認モーダル経由＋保存時の付け替えにする
  // 【G1-006拡張】付け替え先はモーダル内プルダウンで選択（選択肢は通常フローのみ）
  const handleTerminalDelete = (idx) => {
    const row = terminalRows[idx];
    requestStatusDelete({
      row,
      candidates: flowRows.filter(r => !r.isFixed && (r.name || "").trim()).map(r => r.name.trim()),
      // 付け替え先の選択肢は通常フロー限定のため、終点行が既存予約の to になることはない
      isPendingTarget: false,
      removeRow: () => setTerminalRows(prev => prev.filter((_, i) => i !== idx)),
    });
  };
  const handleTerminalAdd    = () => {
    setTerminalRows(prev => [...prev, { name: "終点", terminalType: "dormant", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, reapproachMonths: 0, reapproachScenarioId: "", reapproachNextStatus: "", promptFields: [], lostReasonOptions: [] }]);
  };

  const usedScenarios = new Set([...flowRows, ...terminalRows].map(r => r.scenarioId).filter(Boolean));

  // 【B1-046】復帰先ステータスの選択肢：通常フローのステータス名のみ
  //（終点への自動移動は意味がなく、契約固定 isFixed は受託情報の入力を伴うため対象外。
  //  カンバンの休眠モーダル側の選択肢と同じ条件に揃える）
  const flowStatusNames = flowRows.filter(r => !r.isFixed).map(r => (r.name || "").trim()).filter(Boolean);

  // 【B1-047】復帰先ステータス名 → 連動シナリオID の対応表。
  //   連動があれば適用シナリオはロック（連動シナリオを自動適用）表示になる。
  const linkedScenarioByName = Object.fromEntries(
    flowRows.filter(r => !r.isFixed && (r.name || "").trim() && (r.scenarioId || "").trim())
      .map(r => [(r.name || "").trim(), (r.scenarioId || "").trim()])
  );

  const handleSave = async () => {
    // 【読込表示】取得完了前の保存を禁止（FormSettings.jsx handleSave と同方針）
    if (isLoading && flowRows.length === 0 && terminalRows.length === 0) { showToast("ステータスを読み込み中です。完了までお待ちください", "warning"); return; }
    if (flowRows.some(r => !r.name.trim()))     { showToast("ステータス名を入力してください", "warning"); return; }
    if (terminalRows.some(r => !r.name.trim())) { showToast("終点ステータス名を入力してください", "warning"); return; }
    if (!terminalRows.some(r => r.terminalType === "won"))  { showToast("「成約」ステータスは必須です", "warning"); return; }
    if (!terminalRows.some(r => r.terminalType === "lost")) { showToast("「失注」ステータスは必須です", "warning"); return; }

    // 【B1-046】復帰先ステータスがフロー一覧から消えている（削除・改名・契約化）場合は保存前に弾く。
    // 宙吊りの名前を保存すると、GAS 側の実在チェックで休眠モーダルの確定が失敗するようになるため。
    const badNext = terminalRows.find(r =>
      r.terminalType === "dormant" && (r.reapproachNextStatus || "").trim() &&
      !flowStatusNames.includes((r.reapproachNextStatus || "").trim())
    );
    if (badNext) {
      showToast(`「${badNext.name}」の復帰先ステータス「${badNext.reapproachNextStatus}」が通常フローに存在しません。選び直してください。`, "warning");
      return;
    }

    // 【B1-047】保存直前の正規化：復帰先ステータスに連動シナリオがある場合、
    // 適用シナリオを連動シナリオへ揃える（フロー側の連動を後から変更した場合のずれを解消）
    const normalizedTerminals = terminalRows.map(r => {
      if (r.terminalType !== "dormant") return r;
      const linked = linkedScenarioByName[(r.reapproachNextStatus || "").trim()] || "";
      return (linked && r.reapproachScenarioId !== linked) ? { ...r, reapproachScenarioId: linked } : r;
    });

    const allRows = [...flowRows, ...normalizedTerminals];

    // ── 【G1-031】ステータス名の一意性チェック ────────────────────────
    // 名称が顧客レコードとの唯一の紐づけキーであるため、重複すると
    // カンバンの列（key={st.name} / findIndex(s => s.name === ...)）や
    // 顧客リストのフィルタで実体を区別できなくなる。
    // 判定方法は既存のシナリオID重複チェック（直下）と同じ方式に揃えている。
    const names    = allRows.map(r => r.name.trim());
    const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupNames.length > 0) {
      showToast(`ステータス名「${[...new Set(dupNames)].join("、")}」が重複しています。名称は一意にしてください。`, "warning");
      return;
    }

    const sids = allRows.map(r => r.scenarioId).filter(Boolean);
    const dups = sids.filter((id, i) => sids.indexOf(id) !== i);
    if (dups.length > 0) {
      showToast(`シナリオ「${[...new Set(dups)].join("、")}」が複数のステータスに設定されています。`, "info");
      return;
    }

    // ── 【G1-020】改名マイグレーション用の対応表を作る ──────────────
    // 読み込み時に控えておいた _originalName と現在の name を突き合わせ、
    // 変わっているものだけ {from, to} で GAS に送る。
    // GAS 側（saveStatuses）が顧客シートの「対応ステータス」を一括で付け替える。
    // renames が空配列のときは GAS は顧客シートに一切触らない（従来と同じ挙動）。
    const renames = allRows
      .filter(r => r._originalName && r._originalName.trim() !== r.name.trim())
      .map(r => ({ from: r._originalName.trim(), to: r.name.trim() }));

    // ── 【G1-006拡張】削除されたステータスの顧客付け替え（付け替え先＝ユーザー選択） ──
    // GAS 側は G1-020 の renames マイグレーション（多対一許容・from の実在チェックなし・
    // ステータス履歴の追従込み / gas_updated.js:1860-1952）をそのまま流用するため、
    // サーバー変更は不要。付け替え先は削除確認モーダルのプルダウンで選択された to を使う。
    //
    // GAS の renameMap は「1パス適用」（置換後の値を再処理しない / 1885-1892行）のため、
    // 名称ベース紐付けの取りこぼしを防ぐ目的で、送信前に以下を行う。
    //   ① 改名追従: 削除確定後に付け替え先が改名された場合、renames の対応表で新名称へ差し替え
    //     （例:「A削除→Bへ」の後に B を B' に改名 → A の顧客は B' へ送る。
    //       固定 fallbackTo だった従来はこの問題自体が起きなかったが、選択制では必須）
    //   ② 連鎖解決: 付け替え先自体が削除予約されている場合、最終的な行き先まで辿って平坦化
    //     （例: {A→B, B→C} をそのまま送ると1パス適用で A の顧客が消滅済みの B で止まる → A→C に解決。
    //       通常は削除時の retarget（requestStatusDelete）で連鎖は発生しないが、
    //       「選択後に付け替え先を改名してから削除」等の複合操作に対する最終ガード）
    //   ③ 実在チェック: 解決後の to が現存する通常フロー（契約固定除く）にあることを確認
    const currentNames = new Set(allRows.map(r => (r.name || "").trim()));
    const renameTo = {};
    renames.forEach(r => { renameTo[r.from] = r.to; });
    const rawMoves = pendingReassigns.filter(p => !currentNames.has(p.from));   // 同名で作り直された場合は付け替え不要
    const moveByFrom = {};
    rawMoves.forEach(p => { moveByFrom[p.from] = p; });
    // 従来仕様の「先頭フローステータス」は、to 欠落時のフォールバックとしてのみ残す
    //（契約固定 isFixed は選択肢と同じ理由で除外。従来の allRows.find(!terminalType) より安全側）
    const fallbackTo = (flowRows.find(r => !r.isFixed && (r.name || "").trim())?.name || "").trim();
    const resolveTo = (to) => {
      let cur = (to || "").trim();
      const maxHops = rawMoves.length + renames.length + 1;   // 万一の循環予約でも必ず停止させる
      for (let hops = 0; hops < maxHops; hops++) {
        if (renameTo[cur])   { cur = renameTo[cur]; continue; }                      // ① 改名追従
        if (moveByFrom[cur]) { cur = (moveByFrom[cur].to || "").trim(); continue; }  // ② 連鎖解決
        break;
      }
      return cur;
    };
    const deleteMoves = rawMoves
      .map(p => ({ from: p.from, to: resolveTo(p.to) || fallbackTo }))
      .filter(m => m.from !== m.to);

    // ③ 実在チェック。「付け替え先に選んだステータスを、その後にフローから消した
    //（顧客0件で削除・契約固定化 等）」場合にここで止める（宙吊り名称の書き込み防止）。
    const flowNameSet = new Set(flowRows.filter(r => !r.isFixed).map(r => (r.name || "").trim()).filter(Boolean));
    const badMove = deleteMoves.find(m => !m.to || !flowNameSet.has(m.to));
    if (badMove) {
      showToast(
        badMove.to
          ? `削除した「${badMove.from}」の付け替え先「${badMove.to}」が通常フローに存在しません。付け替え先のステータスを確認するか、ページを再読み込みして削除をやり直してください。`
          : "顧客の付け替え先となる通常フローのステータスがありません。先にステータスを追加してください。",
        "warning"
      );
      return;
    }

    const migrations = [...renames, ...deleteMoves];

    // 改名・削除付け替えがある場合は、影響件数を提示して確認を取る（無言のデータ書き換えを避ける）
    if (migrations.length > 0) {
      const detail = [
        ...renames.map(r => `・改名「${r.from}」→「${r.to}」（${usageOf(r.from)} 件）`),
        ...deleteMoves.map(r => `・削除「${r.from}」→「${r.to}」へ付け替え（${usageOf(r.from)} 件）`),
      ].join("\n");
      const total = migrations.reduce((sum, r) => sum + usageOf(r.from), 0);
      setConfirmModal({
        title: "ステータス変更を顧客データに反映しますか？",
        message: detail,
        note: total > 0
          ? `該当する ${total} 件の顧客の対応ステータスを一括で書き換えます。`
          : "該当する顧客はいないため、顧客データは変更されません。",
        confirmLabel: "保存する",
        confirmColor: THEME.primary,
        onConfirm: () => { setConfirmModal(null); doSave(flowRows, normalizedTerminals, migrations); },
      });
      return;
    }

    doSave(flowRows, normalizedTerminals, []);
  };

  const doSave = async (flows, terminals, renames) => {
    const allRows = [...flows, ...terminals];
    setSaving(true);
    try {
      const saveRes = await apiCall.post(gasUrl || GAS_URL, {
        action: "saveStatuses",
        statuses: allRows,
        renames,
        // 【G1-013】読み込み時点のスナップショット。GAS 側が現在のシートと照合し、
        // 乖離（＝この画面が知らない更新が既に入っている）なら保存を拒否する。
        baseline: baselineRef.current,
      // 【安定化】GAS 側の saveStatuses を冪等化（受信内容＝現シートなら no-op success）
      // したため、リトライを有効化できる。これにより GAS 既知の「302先の一時URLが
      // 404を返す」事象（＝書き込みは成功しているのに応答だけ失われる）で
      //   1回目: 書き込み成功・応答喪失 → 2回目: no-op success
      // と自己回復し、「エラー表示なのに実は保存されていた」不安定挙動が解消される。
      }, { retry: true });

      // ── 保存成功: ローカルで状態を確定し、全量再取得（onRefresh）の完了を待たない ──
      // 従来はここで await onRefresh()（getAppData 全量再構築）を待ってから
      // 「保存しました」を出していたため、データ量が多い環境では保存のたびに
      // 数十秒待たされていた。
      // 【重要】baseline は必ず「シートを読み戻した値」から作る。Google Sheets は
      // setValues 時に自動型変換（"true"→Boolean・数字様文字列→数値 等）を行うため、
      // クライアント送信値（allRows）をそのまま baseline にすると、次回照合時の
      // シート読み戻し値と型がズレて stale_baseline の誤検知になりうる。
      // GAS（saveStatuses）は保存後のシート実体を statuses としてレスポンスに
      // 同梱するので、それを baseline・行 state の両方に採用する。
      const echoed = Array.isArray(saveRes?.statuses) ? saveRes.statuses : null;
      if (echoed) {
        baselineRef.current = echoed;
        setFlowRowsRaw(echoed.filter(s => !s.terminalType).map(s => ({ ...s, _originalName: s.name })));
        setTerminalRowsRaw(echoed.filter(s => s.terminalType).map(s => ({ placement: "bottom", reapproachMonths: 0, reapproachScenarioId: "", reapproachNextStatus: "", ...s, _originalName: s.name })));
      } else {
        // 旧版GAS（エコー非対応）へのフォールバック: 従来どおりローカル値で確定
        baselineRef.current = allRows.map(r => ({ ...r }));
        setFlowRowsRaw(flows.map(r => ({ ...r, _originalName: r.name })));
        setTerminalRowsRaw(terminals.map(r => ({ ...r, _originalName: r.name })));
      }
      setPendingReassigns([]);   // 【G1-006】反映済みの付け替え予約をクリア
      dirtyRef.current = false;  // 未編集状態に戻す（裏の refresh 完了時に安全に再初期化される）
      showToast("保存しました", "success");
      Promise.resolve(onRefresh?.()).catch(() => { /* 背景更新の失敗は保存結果に影響しない */ });
    } catch (e) {
      // 【G1-013】stale_baseline 拒否時は GAS のメッセージ（再読み込み案内）をそのまま表示し、
      // 最新データへ同期する（編集内容は破棄されるが、他所の更新を黙って潰すよりも安全側に倒す）。
      const msg = e?.message || "保存に失敗しました";
      showToast(msg, "error");
      if (e?.code === "stale_baseline" || msg.includes("再読み込み")) {
        dirtyRef.current = false;   // サーバー最新の内容で再初期化させる
        try { await onRefresh(); } catch { /* noop */ }
      }
    } finally {
      setSaving(false);
    }
  };

  // グルーピング
  const dormantRows  = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "dormant");
  const wonRows      = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "won");
  const lostRows     = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "lost");
  const excludedRows = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "excluded");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: isMobile ? "20px 16px" : "40px 48px", boxSizing: "border-box" }}>
      {/* 【G1-006 / G1-020】破壊的操作の確認モーダル（共通コンポーネント）
          【G1-006拡張】select を渡すと付け替え先プルダウンが表示され、
          確定時に onConfirm(選択値) が呼ばれる */}
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        note={confirmModal?.note}
        select={confirmModal?.select}
        confirmLabel={confirmModal?.confirmLabel}
        confirmColor={confirmModal?.confirmColor}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      {/* ヘッダー */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 14 : 0, marginBottom: isMobile ? 20 : 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: THEME.textMuted, fontWeight: 800, fontSize: 14 }}>
            <ChevronLeft size={18} /> 戻る
          </button>
          <h1 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 900, color: THEME.textMain, margin: 0 }}>ステータス設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving || ((isLoading || loadError) && flowRows.length === 0 && terminalRows.length === 0)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 28px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: (saving || ((isLoading || loadError) && flowRows.length === 0 && terminalRows.length === 0)) ? 0.7 : 1, ...(isMobile ? { width: "100%", boxSizing: "border-box" } : {}) }}>
          <Save size={16} /> {saving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: isMobile ? "12px 16px" : "14px 20px", marginBottom: 24, fontSize: isMobile ? 12 : 13, color: THEME.primary, fontWeight: 700, lineHeight: 1.7 }}>
        {isMobile
          ? "💡 ↑↓ボタンで順番を変更できます。終点ステータスは「下部ゾーン」か「右側エリア」への配置を選択できます。"
          : "💡 ドラッグで順番を変更できます。終点ステータスは「下部ゾーン」か「右側エリア」への配置を選択できます。"}
      </div>

      {/* ── 【読込表示】データ未着の間はローディング、取得失敗はエラーを表示 ──
          スピナーとカードの体裁は SourceManager.jsx（登録済み流入元の読込表示）と、
          取得失敗の文言・配色は FormSettings.jsx（G2-012 / E3-014）と揃えている。
          「取得失敗」と「取得成功かつ0件（既定行で初期化）」を区別するのは
          両画面と同じ理由（実データがあるのに消えたと誤認させない）。 */}
      {isLoading && flowRows.length === 0 && terminalRows.length === 0 ? (
        <div style={{
          padding: "56px 0", textAlign: "center",
          color: THEME.textMuted, fontSize: 14,
          background: "#F8FAFC", borderRadius: 12,
          border: `1.5px dashed ${THEME.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>ステータス設定を読み込んでいます...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : loadError && flowRows.length === 0 && terminalRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#B45309", fontSize: 14, border: "2px dashed #FCD34D", backgroundColor: "#FFFBEB", borderRadius: 12, lineHeight: 1.7 }}>
          ステータス設定の取得に失敗しました。<br />
          実際の登録内容が表示されていない可能性があります。ページを再読み込みしてください。
        </div>
      ) : (<>
      {/* ── フロー列（通常 / 契約混在・順番通り） ── */}
      {flowRows.map((s, idx) =>
        s.isFixed ? (
          <ContractRow
            key={idx} s={s} idx={idx} total={flowRows.length} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleFlowChange} onDelete={handleFlowDelete}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
            onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
            onPromptAdd={handlePromptAdd} onPromptRemove={handlePromptRemove}
          />
        ) : (
          <StatusRow
            key={idx} s={s} idx={idx} total={flowRows.length} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleFlowChange} onDelete={handleFlowDelete}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
            onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
            onPromptAdd={handlePromptAdd} onPromptRemove={handlePromptRemove}
          />
        )
      )}

      {/* ── 追加ボタン群 ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginTop: 6 }}>
        <button onClick={handleFlowAdd}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "13px", border: `2px dashed ${THEME.border}`, borderRadius: 12, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: 800, fontSize: 13, cursor: "pointer", justifyContent: "center" }}>
          <Plus size={15} /> ステータスを追加
        </button>
        <button
          onClick={() => setFlowRows(prev => [...prev, { name: "契約", terminalType: "", scenarioId: "", reportArrival: true, reportCount: true, isFixed: true, _originalName: "" }])}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "13px", border: `2px dashed ${CONTRACT_COLOR}80`, borderRadius: 12, backgroundColor: "#F0F9FF", color: CONTRACT_COLOR, fontWeight: 800, fontSize: 13, cursor: "pointer", justifyContent: "center" }}>
          <Plus size={15} /> 📋 契約ステータスを追加
        </button>
      </div>

      {/* 区切り */}
      <div style={{ margin: "36px 0 20px", borderTop: `2px dashed ${THEME.border}`, position: "relative" }}>
        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", backgroundColor: THEME.bg, padding: "0 14px", fontSize: 12, fontWeight: 800, color: THEME.textMuted }}>
          終点ステータス
        </span>
      </div>

      {/* ⏸ 終点ステータス（dormant系・追加/削除/名称変更可） */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeader
          icon={<Flag size={15} color="#D97706" />}
          label="終点ステータス"
          color="#D97706"
          canAdd={true}
          onAdd={handleTerminalAdd}
          addLabel="追加"
        />
        {dormantRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios} flowStatusNames={flowStatusNames} linkedScenarioByName={linkedScenarioByName}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
        {dormantRows.length === 0 && (
          <div style={{ color: THEME.textMuted, fontSize: 13, padding: "8px 4px" }}>終点ステータスがありません</div>
        )}
      </div>

      {/* 🏆 成約（削除不可・名称変更不可） */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeader icon={<span>🏆</span>} label="成約ステータス" color="#059669" canAdd={false} />
        {wonRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios} flowStatusNames={flowStatusNames} linkedScenarioByName={linkedScenarioByName}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>

      {/* 🗑 失注（削除不可・名称変更不可） */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeader icon={<Trash size={15} color="#DC2626" />} label="失注ステータス" color="#DC2626" canAdd={false} />
        {lostRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios} flowStatusNames={flowStatusNames} linkedScenarioByName={linkedScenarioByName}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>

      {/* 🚫 除外（削除不可・追加不可・配置固定） */}
      <div>
        <SectionHeader
          icon={<span>🚫</span>}
          label="除外ステータス"
          color="#9CA3AF"
          canAdd={false}
          note="カンバン右下コーナーに灰色固定表示されます"
        />
        {excludedRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios} flowStatusNames={flowStatusNames} linkedScenarioByName={linkedScenarioByName}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>
      </>)}
    </div>
  );
}