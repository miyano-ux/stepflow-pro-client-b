import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Plus, Trash2, ChevronLeft, Save, Moon, Trash } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";

// ==========================================
// ⚙️ StatusSettings - ステータス設定画面
// ==========================================


// selectを他のフォーム要素と統一するスタイル
const selectStyle = {
  width: "100%",
  padding: "11px 16px",
  borderRadius: "10px",
  border: `1px solid ${THEME.border}`,
  fontSize: "14px",
  fontWeight: 700,
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "white",
  color: "#1E293B",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  cursor: "pointer",
};

const TERMINAL_OPTIONS = [
  { value: "",        label: "通常（フロー列に表示）" },
  { value: "dormant", label: "🌙 休眠（底部ゾーン）" },
  { value: "lost",    label: "🗑 失注（底部ゾーン）" },
];

function StatusRow({ s, idx, total, scenarios, onChange, onDelete, onDragStart, onDragOver, onDrop }) {
  const isDormantOrLost = s.terminalType === "dormant" || s.terminalType === "lost";
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idx)}
      onDragOver={e => onDragOver(e, idx)}
      onDrop={e => onDrop(e, idx)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        backgroundColor: isDormantOrLost ? "#F8FAFC" : "white",
        border: `1px solid ${THEME.border}`, borderRadius: 12,
        padding: "14px 16px", marginBottom: 8, cursor: "grab",
      }}
    >
      {/* ドラッグハンドル */}
      <div style={{ paddingTop: 6, color: THEME.textMuted, cursor: "grab" }}>
        <GripVertical size={16} />
      </div>

      {/* 順番バッジ */}
      <div style={{ minWidth: 24, height: 24, borderRadius: "50%", backgroundColor: isDormantOrLost ? "#E5E7EB" : THEME.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0, marginTop: 4 }}>
        {idx + 1}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* ステータス名 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>ステータス名</div>
          <input
            style={{ ...styles.input, margin: 0 }}
            value={s.name}
            onChange={e => onChange(idx, "name", e.target.value)}
            placeholder="例：接触済み（机上）"
          />
        </div>

        {/* 終点種別 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>種別</div>
          <select
            style={selectStyle}
            value={s.terminalType || ""}
            onChange={e => onChange(idx, "terminalType", e.target.value)}
          >
            {TERMINAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 自動シナリオ */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 4 }}>自動適用シナリオ（任意）</div>
          <select
            style={selectStyle}
            value={s.scenarioId || ""}
            onChange={e => onChange(idx, "scenarioId", e.target.value)}
          >
            <option value="">設定しない</option>
            {[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => (
              <option key={sid} value={sid}>{sid}</option>
            ))}
          </select>
        </div>

        {/* 集計対象 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 6 }}>レポート集計対象</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={!!s.reportArrival}
                onChange={e => onChange(idx, "reportArrival", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.primary }}
              />
              <span>到達率（到達期間を集計）</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={!!s.reportCount}
                onChange={e => onChange(idx, "reportCount", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.primary }}
              />
              <span>件数（数字の積み上げを集計）</span>
            </label>
          </div>
        </div>
      </div>

      {/* 削除ボタン */}
      <button
        onClick={() => onDelete(idx)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: THEME.textMuted }}
        title="削除"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function StatusSettings({ statuses: statusesProp = [], scenarios = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [flowRows, setFlowRows]     = useState([]);
  const [dormantRow, setDormantRow] = useState({ name: "休眠", terminalType: "dormant", scenarioId: "", reportArrival: false, reportCount: false });
  const [lostRow, setLostRow]       = useState({ name: "失注", terminalType: "lost",    scenarioId: "", reportArrival: false, reportCount: false });
  const [saving, setSaving]         = useState(false);
  const [dragIdx, setDragIdx]       = useState(null);

  useEffect(() => {
    if (statusesProp.length > 0) {
      const dormant = statusesProp.find(s => s.terminalType === "dormant");
      const lost    = statusesProp.find(s => s.terminalType === "lost");
      const flows   = statusesProp.filter(s => s.terminalType !== "dormant" && s.terminalType !== "lost");
      setFlowRows(flows.map(s => ({ ...s })));
      if (dormant) setDormantRow({ ...dormant });
      if (lost)    setLostRow({ ...lost });
    } else {
      setFlowRows([
        { name: "未対応", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
        { name: "対応中", terminalType: "", scenarioId: "", reportArrival: false, reportCount: true },
      ]);
    }
  }, [statusesProp]);

  const handleChange = (idx, key, val) => {
    setFlowRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  const handleDelete = (idx) => {
    setFlowRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    setFlowRows(prev => [...prev, { name: "", terminalType: "", scenarioId: "", reportArrival: false, reportCount: false }]);
  };

  // ── D&Dソート ──
  const handleDragStart = (e, idx) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(idx); };
  const handleDragOver  = (e, idx) => { e.preventDefault(); };
  const handleDrop      = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...flowRows];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    setFlowRows(next);
    setDragIdx(null);
  };

  const handleSave = async () => {
    const invalid = rows.find(r => !r.name.trim());
    if (invalid) { alert("ステータス名を入力してください"); return; }

    // 休眠・失注が複数設定されていないか確認
    const dormantCount = rows.filter(r => r.terminalType === "dormant").length;
    const lostCount    = rows.filter(r => r.terminalType === "lost").length;
    if (dormantCount > 1) { alert("休眠は1つだけ設定できます"); return; }
    if (lostCount > 1)    { alert("失注は1つだけ設定できます"); return; }

    setSaving(true);
    try {
      await apiCall.post(gasUrl || GAS_URL, { action: "saveStatuses", statuses: rows });
      await onRefresh();
      alert("保存しました");
    } catch {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

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
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
        >
          <Save size={16} /> {saving ? "保存中..." : "保存する"}
        </button>
      </div>

      {/* 説明 */}
      <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 13, color: THEME.primary, fontWeight: 700, lineHeight: 1.7 }}>
        💡 ドラッグで順番を変更できます。「休眠」「失注」は底部ゾーンに表示されます。自動シナリオを設定すると、そのステータスに移動したとき配信が自動で始まります。
      </div>

      {/* フロー列ステータス一覧 */}
      {flowRows.map((s, idx) => (
        <StatusRow
          key={idx}
          s={s} idx={idx} total={rows.length}
          scenarios={scenarios}
          onChange={handleChange}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}

      {/* 追加ボタン */}
      <button
        onClick={handleAdd}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "14px", border: `2px dashed ${THEME.border}`, borderRadius: 12, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: 800, fontSize: 14, cursor: "pointer", justifyContent: "center", marginTop: 4 }}
      >
        <Plus size={16} /> ステータスを追加
      </button>

      {/* 区切り */}
      <div style={{ margin: "32px 0 20px", borderTop: `2px dashed ${THEME.border}`, position: "relative" }}>
        <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", backgroundColor: THEME.bg, padding: "0 12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted }}>
          終点ステータス（固定）
        </span>
      </div>
      <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: THEME.primary, fontWeight: 700 }}>
        💡 休眠・失注はカンバンの底部ゾーンに固定表示されます。ラベル名とシナリオは変更できます。
      </div>

      {/* 休眠・固定カード */}
      {[
        { row: dormantRow, setRow: setDormantRow, icon: <Moon size={18} />, color: "#D97706", bg: "#FFFBEB", label: "休眠" },
        { row: lostRow,    setRow: setLostRow,    icon: <Trash size={18} />, color: THEME.danger,  bg: "#FFF0F0", label: "失注" },
      ].map(({ row, setRow, icon, color, bg, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12, backgroundColor: bg, border: `1px solid ${color}40`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          {/* アイコン */}
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
            {icon}
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* ステータス名 */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{label}のステータス名</div>
              <input
                style={{ ...styles.input, margin: 0, borderColor: `${color}60`, backgroundColor: "white" }}
                value={row.name}
                onChange={e => setRow(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* 自動シナリオ */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>自動適用シナリオ（任意）</div>
              <select
                style={{ ...selectStyle, borderColor: `${color}60` }}
                value={row.scenarioId || ""}
                onChange={e => setRow(prev => ({ ...prev, scenarioId: e.target.value }))}
              >
                <option value="">設定しない</option>
                {[...new Set(scenarios.map(sc => sc["シナリオID"]))].filter(Boolean).map(sid => (
                  <option key={sid} value={sid}>{sid}</option>
                ))}
              </select>
            </div>

            {/* 集計対象 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6 }}>レポート集計対象</div>
              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  <input type="checkbox" checked={!!row.reportArrival} onChange={e => setRow(prev => ({ ...prev, reportArrival: e.target.checked }))} style={{ width: 16, height: 16, accentColor: color }} />
                  到達率
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  <input type="checkbox" checked={!!row.reportCount} onChange={e => setRow(prev => ({ ...prev, reportCount: e.target.checked }))} style={{ width: 16, height: 16, accentColor: color }} />
                  件数
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}