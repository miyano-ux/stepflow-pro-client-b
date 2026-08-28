import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Plus, Trash2, ChevronLeft, Save, Flag, Trash, X, ChevronUp, ChevronDown } from "lucide-react";
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
function TerminalRow({ row, idx, scenarios, usedScenarios, onChange, onDelete }) {
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
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>レポート集計</div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                <input type="checkbox" checked={!!row.reportCount} onChange={e => { onChange(idx, "reportCount", e.target.checked); onChange(idx, "reportArrival", e.target.checked); }} style={{ width: 14, height: 14, accentColor: color, flexShrink: 0 }} /> 集計する
              </label>
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
                {(row.reapproachMonths || 0) > 0 && (
                  <div style={isMobile ? { width: "100%", boxSizing: "border-box" } : { minWidth: 220 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>適用シナリオ</div>
                    <CustomSelect
                      value={row.reapproachScenarioId || ""}
                      onChange={v => onChange(idx, "reapproachScenarioId", v)}
                      color={color}
                      options={[
                        { value: "", label: "シナリオを選択しない" },
                        ...[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => ({ value: sid, label: sid }))
                      ]}
                    />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                {(row.reapproachMonths || 0) === 0
                  ? "「なし」の場合、カンバンでこのステータスに移しても再アプローチは予約されません。"
                  : !row.reapproachScenarioId
                    ? "適用シナリオを選択すると、カンバンでこのステータスに移したとき再アプローチが予約されます。"
                    : `カンバンでこのステータスに移すと、${row.reapproachMonths}ヶ月後にシナリオ「${row.reapproachScenarioId}」が自動で予約されます。`}
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
export default function StatusSettings({ statuses: statusesProp = [], scenarios = [], customers = [], onRefresh, gasUrl }) {
  const navigate  = useNavigate();
  const showToast = useToast();
  const { isMobile } = useWindowWidth();
  const [flowRows,     setFlowRows]     = useState([]);
  const [terminalRows, setTerminalRows] = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [dragIdx,      setDragIdx]      = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

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
    if (statusesProp.length > 0) {
      const flows     = statusesProp.filter(s => !s.terminalType);
      const terminals = statusesProp.filter(s => s.terminalType);
      // 【G1-020】読み込み時点の名称を _originalName に控える。
      // 保存時に現在の name と突き合わせ、改名分だけ GAS へ renames として送る。
      // （_originalName は saveStatuses のシート書き込み列には含まれないため、
      //   ペイロードに残っていても保存内容には影響しない）
      setFlowRows(flows.map(s => ({ ...s, _originalName: s.name })));

      const termArr = terminals.map(s => ({ placement: "bottom", reapproachMonths: 0, reapproachScenarioId: "", ...s, _originalName: s.name }));
      // 必須ステータスが存在しない場合は補完
      if (!termArr.some(s => s.terminalType === "won"))
        termArr.push({ name: "成約", terminalType: "won", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: true });
      if (!termArr.some(s => s.terminalType === "lost"))
        termArr.push({ name: "失注", terminalType: "lost", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false });
      if (!termArr.some(s => s.terminalType === "excluded"))
        termArr.push({ name: "除外", terminalType: "excluded", placement: "right", scenarioId: "", reportArrival: false, reportCount: false });
      setTerminalRows(termArr);
    } else {
      setFlowRows([
        { name: "未対応", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
        { name: "対応中", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
      ]);
      setTerminalRows([
        { name: "休眠",   terminalType: "dormant",  placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, reapproachMonths: 0, reapproachScenarioId: "" },
        { name: "成約",   terminalType: "won",      placement: "bottom", scenarioId: "", reportArrival: false, reportCount: true  },
        { name: "失注",   terminalType: "lost",     placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false },
        { name: "除外",   terminalType: "excluded", placement: "right",  scenarioId: "", reportArrival: false, reportCount: false },
      ]);
    }
  }, [statusesProp]);

  // フロー行操作
  const handleFlowChange   = (idx, key, val) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  // 【G1-006】確認モーダル経由に変更（SourceManager.jsx:213-244 の削除UXに揃える）
  const handleFlowDelete   = (idx) => {
    const row = flowRows[idx];
    const n   = usageOf(row?.name);
    setConfirmModal({
      title: `「${row?.name || "（無題）"}」を削除しますか？`,
      note: n > 0
        ? `このステータスは現在 ${n} 件の顧客に設定されています。削除すると該当顧客の対応ステータスは無効な値となり、カンバンでは先頭ステータス列に表示されます。先に別のステータスへ付け替えてください。`
        : "この操作は「保存する」を押すまでシートには反映されません。",
      onConfirm: () => {
        setFlowRows(prev => prev.filter((_, i) => i !== idx));
        setConfirmModal(null);
      },
    });
  };
  const handleFlowAdd      = () => setFlowRows(prev => [...prev, { name: "", terminalType: "", scenarioId: "", reportArrival: false, reportCount: false }]);
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
  // 【G1-006】終点ステータスも同様に確認モーダル経由にする
  const handleTerminalDelete = (idx) => {
    const row = terminalRows[idx];
    const n   = usageOf(row?.name);
    setConfirmModal({
      title: `「${row?.name || "（無題）"}」を削除しますか？`,
      note: n > 0
        ? `このステータスは現在 ${n} 件の顧客に設定されています。削除すると該当顧客の対応ステータスは無効な値になります。先に別のステータスへ付け替えてください。`
        : "この操作は「保存する」を押すまでシートには反映されません。",
      onConfirm: () => {
        setTerminalRows(prev => prev.filter((_, i) => i !== idx));
        setConfirmModal(null);
      },
    });
  };
  const handleTerminalAdd    = () => {
    setTerminalRows(prev => [...prev, { name: "終点", terminalType: "dormant", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false, reapproachMonths: 0, reapproachScenarioId: "" }]);
  };

  const usedScenarios = new Set([...flowRows, ...terminalRows].map(r => r.scenarioId).filter(Boolean));

  const handleSave = async () => {
    if (flowRows.some(r => !r.name.trim()))     { showToast("ステータス名を入力してください", "warning"); return; }
    if (terminalRows.some(r => !r.name.trim())) { showToast("終点ステータス名を入力してください", "warning"); return; }
    if (!terminalRows.some(r => r.terminalType === "won"))  { showToast("「成約」ステータスは必須です", "warning"); return; }
    if (!terminalRows.some(r => r.terminalType === "lost")) { showToast("「失注」ステータスは必須です", "warning"); return; }

    const allRows = [...flowRows, ...terminalRows];

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

    // 改名がある場合は、影響件数を提示して確認を取る（無言のデータ書き換えを避ける）
    if (renames.length > 0) {
      const detail = renames
        .map(r => `・「${r.from}」→「${r.to}」（${usageOf(r.from)} 件）`)
        .join("\n");
      const total = renames.reduce((sum, r) => sum + usageOf(r.from), 0);
      setConfirmModal({
        title: "ステータス名の変更を反映しますか？",
        message: detail,
        note: total > 0
          ? `該当する ${total} 件の顧客の対応ステータスを、新しい名称に一括で書き換えます。`
          : "該当する顧客はいないため、顧客データは変更されません。",
        confirmLabel: "保存する",
        confirmColor: THEME.primary,
        onConfirm: () => { setConfirmModal(null); doSave(allRows, renames); },
      });
      return;
    }

    doSave(allRows, []);
  };

  const doSave = async (allRows, renames) => {
    setSaving(true);
    try {
      await apiCall.post(gasUrl || GAS_URL, { action: "saveStatuses", statuses: allRows, renames });
      await onRefresh();
      showToast("保存しました", "success");
    } catch {
      showToast("保存に失敗しました", "error");
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
      {/* 【G1-006 / G1-020】破壊的操作の確認モーダル（共通コンポーネント） */}
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        note={confirmModal?.note}
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
        <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 28px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: saving ? 0.7 : 1, ...(isMobile ? { width: "100%", boxSizing: "border-box" } : {}) }}>
          <Save size={16} /> {saving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: isMobile ? "12px 16px" : "14px 20px", marginBottom: 24, fontSize: isMobile ? 12 : 13, color: THEME.primary, fontWeight: 700, lineHeight: 1.7 }}>
        {isMobile
          ? "💡 ↑↓ボタンで順番を変更できます。終点ステータスは「下部ゾーン」か「右側エリア」への配置を選択できます。"
          : "💡 ドラッグで順番を変更できます。終点ステータスは「下部ゾーン」か「右側エリア」への配置を選択できます。"}
      </div>

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
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
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
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>

      {/* 🗑 失注（削除不可・名称変更不可） */}
      <div style={{ marginBottom: 16 }}>
        <SectionHeader icon={<Trash size={15} color="#DC2626" />} label="失注ステータス" color="#DC2626" canAdd={false} />
        {lostRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
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
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>
    </div>
  );
}