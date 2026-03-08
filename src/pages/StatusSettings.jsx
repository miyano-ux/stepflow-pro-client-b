import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Plus, Trash2, ChevronLeft, Save, Moon, Trash, Ban } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";

const selectStyle = {
  width: "100%", padding: "11px 16px", borderRadius: "10px",
  border: `1px solid ${THEME.border}`, fontSize: "14px", fontWeight: 700,
  outline: "none", boxSizing: "border-box", backgroundColor: "white", color: "#1E293B",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", cursor: "pointer",
};

const PROMPT_FIELD_OPTIONS = [
  { key: "契約種別", label: "📋 契約種別" },
  { key: "流入元",   label: "🌐 流入元" },
  { key: "担当者メール", label: "👤 担当者" },
];

// terminalType ごとの表示設定
const TERMINAL_META = {
  dormant:  { icon: "🌙", color: "#D97706", bg: "#FFFBEB", label: "休眠系", canDelete: true,  canRename: true,  hasPlacement: true },
  lost:     { icon: "🗑",  color: "#DC2626", bg: "#FEF2F2", label: "失注",   canDelete: false, canRename: false, hasPlacement: true },
  excluded: { icon: "🚫", color: "#9CA3AF", bg: "#F3F4F6", label: "除外",   canDelete: true,  canRename: true,  hasPlacement: false },
};

const PLACEMENT_OPTIONS = [
  { value: "bottom", label: "⬇ 下部" },
  { value: "right",  label: "➡ 右側" },
];

// ── 通常フロー行 ───────────────────────────────────────
function StatusRow({ s, idx, scenarios, onChange, onDelete, onDragStart, onDragOver, onDrop, onPromptAdd, onPromptRemove, usedScenarios }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idx)}
      onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, idx)}
      style={{ display: "flex", alignItems: "flex-start", gap: 8, backgroundColor: "white", border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "grab" }}
    >
      <div style={{ paddingTop: 10, color: THEME.textMuted, flexShrink: 0, cursor: "grab" }}><GripVertical size={16} /></div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "2fr 2fr 1.2fr", gap: 10, alignItems: "start" }}>
        {/* ステータス名 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>ステータス名</div>
          <input
            style={{ ...styles.input, margin: 0 }}
            value={s.name}
            onChange={e => onChange(idx, "name", e.target.value)}
            placeholder="例: 対応中"
          />
        </div>

        {/* 自動シナリオ */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>自動シナリオ（任意）</div>
          <select
            style={selectStyle}
            value={s.scenarioId || ""}
            onChange={e => onChange(idx, "scenarioId", e.target.value)}
          >
            <option value="">設定しない</option>
            {[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => {
              const isUsed = usedScenarios.has(sid) && sid !== s.scenarioId;
              return (
                <option key={sid} value={sid} disabled={isUsed} style={{ color: isUsed ? "#aaa" : undefined }}>
                  {sid}{isUsed ? "（他で使用中）" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* レポート集計 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>集計対象</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              <input type="checkbox" checked={!!s.reportCount} onChange={e => onChange(idx, "reportCount", e.target.checked)} style={{ width: 14, height: 14, accentColor: THEME.primary }} />
              件数
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              <input type="checkbox" checked={!!s.reportArrival} onChange={e => onChange(idx, "reportArrival", e.target.checked)} style={{ width: 14, height: 14, accentColor: THEME.primary }} />
              到達率
            </label>
          </div>
        </div>

        {/* 追加入力項目 */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>移動時の追加入力項目</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {(s.promptFields || []).map((pf, pi) => (
              <span key={pi} style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                {pf}
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

      <button onClick={() => onDelete(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: THEME.textMuted }} title="削除">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── 終点ステータス行 ──────────────────────────────────
function TerminalRow({ row, idx, scenarios, usedScenarios, onChange, onDelete }) {
  const meta = TERMINAL_META[row.terminalType] || TERMINAL_META.dormant;
  const { icon, color, bg, canDelete, canRename, hasPlacement } = meta;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, backgroundColor: bg, border: `1.5px solid ${color}40`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      {/* アイコン */}
      <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, fontSize: 16 }}>
        {icon}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 0.8fr", gap: 10, alignItems: "start" }}>
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

        {/* 自動シナリオ */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>自動シナリオ（任意）</div>
          <select
            style={{ ...selectStyle, borderColor: `${color}50` }}
            value={row.scenarioId || ""}
            onChange={e => onChange(idx, "scenarioId", e.target.value)}
          >
            <option value="">設定しない</option>
            {[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => {
              const isUsed = usedScenarios.has(sid) && sid !== row.scenarioId;
              return (
                <option key={sid} value={sid} disabled={isUsed} style={{ color: isUsed ? "#aaa" : undefined }}>
                  {sid}{isUsed ? "（他で使用中）" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* 配置選択 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>
            {hasPlacement ? "カンバン配置" : "配置（固定）"}
          </div>
          {hasPlacement ? (
            <div style={{ display: "flex", gap: 6 }}>
              {PLACEMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onChange(idx, "placement", opt.value)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
                    border: `2px solid ${(row.placement || "bottom") === opt.value ? color : THEME.border}`,
                    backgroundColor: (row.placement || "bottom") === opt.value ? bg : "white",
                    color: (row.placement || "bottom") === opt.value ? color : THEME.textMuted,
                  }}
                >
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
          <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>集計</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              <input type="checkbox" checked={!!row.reportCount} onChange={e => onChange(idx, "reportCount", e.target.checked)} style={{ width: 14, height: 14, accentColor: color }} /> 件数
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              <input type="checkbox" checked={!!row.reportArrival} onChange={e => onChange(idx, "reportArrival", e.target.checked)} style={{ width: 14, height: 14, accentColor: color }} /> 到達率
            </label>
          </div>
        </div>
      </div>

      {/* 削除ボタン */}
      {canDelete ? (
        <button
          onClick={() => onDelete(idx)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color }}
          title="削除"
        >
          <Trash2 size={15} />
        </button>
      ) : (
        <div style={{ width: 27 }} />
      )}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────
export default function StatusSettings({ statuses: statusesProp = [], scenarios = [], onRefresh, gasUrl }) {
  const navigate  = useNavigate();
  const [flowRows,     setFlowRows]     = useState([]);
  const [terminalRows, setTerminalRows] = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [dragIdx,      setDragIdx]      = useState(null);

  // 初期値設定
  useEffect(() => {
    if (statusesProp.length > 0) {
      const flows     = statusesProp.filter(s => !s.terminalType);
      const terminals = statusesProp.filter(s => s.terminalType);
      setFlowRows(flows.map(s => ({ ...s })));
      // lost が存在しない場合はデフォルト追加
      const hasLost = terminals.some(s => s.terminalType === "lost");
      const termArr = terminals.map(s => ({ placement: "bottom", ...s }));
      if (!hasLost) termArr.push({ name: "失注", terminalType: "lost", placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false });
      setTerminalRows(termArr);
    } else {
      setFlowRows([
        { name: "未対応",   terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
        { name: "対応中",   terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
      ]);
      setTerminalRows([
        { name: "休眠", terminalType: "dormant",  placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false },
        { name: "失注", terminalType: "lost",     placement: "bottom", scenarioId: "", reportArrival: false, reportCount: false },
      ]);
    }
  }, [statusesProp]);

  // フロー行操作
  const handleFlowChange = (idx, key, val) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const handleFlowDelete = (idx) => setFlowRows(prev => prev.filter((_, i) => i !== idx));
  const handleFlowAdd    = () => setFlowRows(prev => [...prev, { name: "", terminalType: "", scenarioId: "", reportArrival: false, reportCount: false }]);
  const handlePromptAdd    = (idx, fk) => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, promptFields: [...(r.promptFields||[]).filter(p=>p!==fk), fk] } : r));
  const handlePromptRemove = (idx, pi)  => setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, promptFields: (r.promptFields||[]).filter((_,j)=>j!==pi) } : r));

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

  // 終点行操作
  const handleTerminalChange = (idx, key, val) => setTerminalRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const handleTerminalDelete = (idx) => setTerminalRows(prev => prev.filter((_, i) => i !== idx));
  const handleTerminalAdd    = (type) => {
    const defaults = { dormant: { name: "休眠", placement: "bottom" }, excluded: { name: "除外", placement: "right" } };
    setTerminalRows(prev => [...prev, { ...defaults[type], terminalType: type, scenarioId: "", reportArrival: false, reportCount: false }]);
  };

  // 使用中シナリオ
  const usedScenarios = new Set([...flowRows, ...terminalRows].map(r => r.scenarioId).filter(Boolean));

  // 保存
  const handleSave = async () => {
    if (flowRows.some(r => !r.name.trim())) { alert("ステータス名を入力してください"); return; }
    if (terminalRows.some(r => !r.name.trim())) { alert("終点ステータス名を入力してください"); return; }
    const lostRows = terminalRows.filter(r => r.terminalType === "lost");
    if (lostRows.length === 0) { alert("「失注」ステータスは必須です"); return; }

    const allRows = [...flowRows, ...terminalRows];
    const sids = allRows.map(r => r.scenarioId).filter(Boolean);
    const dups = sids.filter((id, i) => sids.indexOf(id) !== i);
    if (dups.length > 0) {
      alert(`シナリオ「${[...new Set(dups)].join("、")}」が複数のステータスに設定されています。`);
      return;
    }

    setSaving(true);
    try {
      await apiCall.post(gasUrl || GAS_URL, { action: "saveStatuses", statuses: allRows });
      await onRefresh();
      alert("保存しました");
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // terminalType ごとにグルーピング表示
  const dormantRows  = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "dormant");
  const lostRows     = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "lost");
  const excludedRows = terminalRows.map((r, i) => ({ r, i })).filter(({ r }) => r.terminalType === "excluded");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 48px" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: THEME.textMuted, fontWeight: 800, fontSize: 14 }}>
            <ChevronLeft size={18} /> 戻る
          </button>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.textMain, margin: 0 }}>ステータス設定</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          <Save size={16} /> {saving ? "保存中..." : "保存する"}
        </button>
      </div>

      <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: THEME.primary, fontWeight: 700, lineHeight: 1.7 }}>
        💡 ドラッグで順番を変更できます。終点ステータスは「下部ゾーン」か「右側エリア」への配置を選択できます。
      </div>

      {/* フロー列ステータス */}
      {flowRows.map((s, idx) => (
        <StatusRow key={idx} s={s} idx={idx} scenarios={scenarios} usedScenarios={usedScenarios}
          onChange={handleFlowChange} onDelete={handleFlowDelete}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
          onPromptAdd={handlePromptAdd} onPromptRemove={handlePromptRemove}
        />
      ))}
      <button onClick={handleFlowAdd} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "14px", border: `2px dashed ${THEME.border}`, borderRadius: 12, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: 800, fontSize: 14, cursor: "pointer", justifyContent: "center", marginTop: 4 }}>
        <Plus size={16} /> ステータスを追加
      </button>

      {/* ── 終点ステータスセクション ── */}
      <div style={{ margin: "36px 0 20px", borderTop: `2px dashed ${THEME.border}`, position: "relative" }}>
        <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", backgroundColor: THEME.bg, padding: "0 14px", fontSize: 12, fontWeight: 800, color: THEME.textMuted }}>
          終点ステータス
        </span>
      </div>

      {/* 🌙 休眠系 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#D97706" }}>🌙 休眠系ステータス</span>
          <button onClick={() => handleTerminalAdd("dormant")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", border: `1px dashed #D97706`, borderRadius: 8, backgroundColor: "#FFFBEB", color: "#D97706", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            <Plus size={12} /> 追加
          </button>
        </div>
        {dormantRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
        {dormantRows.length === 0 && (
          <div style={{ color: THEME.textMuted, fontSize: 13, padding: "8px 4px" }}>休眠系ステータスがありません</div>
        )}
      </div>

      {/* 🗑 失注 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#DC2626", marginBottom: 10 }}>🗑 失注ステータス（削除不可）</div>
        {lostRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
      </div>

      {/* 🚫 除外 */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#9CA3AF" }}>🚫 除外ステータス</span>
          <button onClick={() => handleTerminalAdd("excluded")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", border: `1px dashed #9CA3AF`, borderRadius: 8, backgroundColor: "#F3F4F6", color: "#9CA3AF", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            <Plus size={12} /> 追加
          </button>
          <span style={{ fontSize: 11, color: THEME.textMuted }}>カンバン右下コーナーに灰色表示されます</span>
        </div>
        {excludedRows.map(({ r, i }) => (
          <TerminalRow key={i} row={r} idx={i} scenarios={scenarios} usedScenarios={usedScenarios}
            onChange={handleTerminalChange} onDelete={handleTerminalDelete}
          />
        ))}
        {excludedRows.length === 0 && (
          <div style={{ color: THEME.textMuted, fontSize: 13, padding: "8px 4px" }}>除外ステータスがありません</div>
        )}
      </div>
    </div>
  );
}