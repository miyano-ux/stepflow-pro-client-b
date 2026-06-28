import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// 📋 ContractTypeManager - 契約種別設定
// ==========================================

export default function ContractTypeManager({ contractTypes: propTypes = [], onRefresh, gasUrl }) {
  const showToast = useToast();
  const navigate = useNavigate();
  const { isMobile } = useWindowWidth();
  const [types, setTypes]     = useState([]);
  const [saving, setSaving]   = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    setTypes(propTypes.length > 0 ? [...propTypes] : ["一般媒介契約", "専任媒介契約"]);
  }, [propTypes]);

  const handleAdd    = () => setTypes(p => [...p, ""]);
  const handleDelete = (i) => setTypes(p => p.filter((_, idx) => idx !== i));
  const handleChange = (i, v) => setTypes(p => p.map((t, idx) => idx === i ? v : t));

  // D&D（PC用）
  const handleDragStart = (e, i) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); };
  const handleDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...types];
    const [d] = next.splice(dragIdx, 1);
    next.splice(i, 0, d);
    setDragIdx(i);
    setTypes(next);
  };

  // 上下移動（モバイル用）
  const handleMoveUp = (i) => {
    if (i === 0) return;
    setTypes(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };
  const handleMoveDown = (i) => {
    setTypes(prev => {
      if (i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    const clean = types.map(t => t.trim()).filter(Boolean);
    if (clean.length === 0) { showToast("1件以上入力してください", "warning"); return; }
    setSaving(true);
    try {
      await apiCall.post(gasUrl || GAS_URL, { action: "saveContractTypes", types: clean });
      await onRefresh();
      showToast("保存しました", "success");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: isMobile ? "20px 16px" : "40px 48px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 14 : 0, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => navigate("/master-settings")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: THEME.textMuted, fontWeight: 800, fontSize: 14 }}>
              <ChevronLeft size={18} /> 戻る
            </button>
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>契約種別設定</h1>
          </div>
          <button
            onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 24px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: "pointer", opacity: saving ? 0.7 : 1, ...(isMobile ? { width: "100%", boxSizing: "border-box" } : {}) }}
          >
            <Save size={15} /> {saving ? "保存中..." : "保存する"}
          </button>
        </div>

        <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: "12px 18px", marginBottom: 24, fontSize: 13, color: THEME.primary, fontWeight: 700 }}>
          {isMobile
            ? "💡 ↑↓ボタンで順番を変更できます。ここで管理した種別が顧客登録画面のプルダウンに反映されます。"
            : "💡 ドラッグで順番を変更できます。ここで管理した種別が顧客登録画面のプルダウンに反映されます。"}
        </div>

        {/* 種別一覧 */}
        {types.map((t, i) => (
          <div
            key={i}
            draggable={!isMobile}
            onDragStart={!isMobile ? (e => handleDragStart(e, i)) : undefined}
            onDragOver={!isMobile ? (e => handleDragOver(e, i)) : undefined}
            onDragEnd={!isMobile ? (() => setDragIdx(null)) : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "white", border: `1px solid ${THEME.border}`,
              borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              opacity: dragIdx === i ? 0.5 : 1,
              cursor: isMobile ? "default" : "grab",
            }}
          >
            {/* モバイル：↑↓ボタン / PC：グリップアイコン */}
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                <button onClick={() => handleMoveUp(i)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: 2, color: i === 0 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
                  <ChevronUp size={15} />
                </button>
                <button onClick={() => handleMoveDown(i)} disabled={i === types.length - 1} style={{ background: "none", border: "none", cursor: i === types.length - 1 ? "default" : "pointer", padding: 2, color: i === types.length - 1 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
                  <ChevronDown size={15} />
                </button>
              </div>
            ) : (
              <GripVertical size={16} color={THEME.textMuted} style={{ flexShrink: 0 }} />
            )}
            <input
              style={{ ...styles.input, margin: 0, flex: 1, minWidth: 0 }}
              value={t}
              onChange={e => handleChange(i, e.target.value)}
              placeholder="例：一般媒介契約"
            />
            <button onClick={() => handleDelete(i)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 6, flexShrink: 0 }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <button
          onClick={handleAdd}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", border: `2px dashed ${THEME.border}`, borderRadius: 12, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}
        >
          <Plus size={16} /> 種別を追加
        </button>
      </div>
    </div>
  );
}