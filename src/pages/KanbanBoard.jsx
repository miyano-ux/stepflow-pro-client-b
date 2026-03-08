import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ListTodo, UserCircle, MessageSquare,
  Loader2, ExternalLink
} from "lucide-react";
import { THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";
import { apiCall } from "../lib/utils";
import PromptFieldsModal from "../components/PromptFieldsModal";

// ─────────────────────────────────────────────────────────
// スタイル定数
// ─────────────────────────────────────────────────────────
const S = {
  // ページ全体を 100vh に収める → ページ自体はスクロールしない
  main:    { height: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column", overflow: "hidden" },
  // wrapper: ヘッダー固定 + body がのこりを占有
  wrapper: { padding: "0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 },
  // ヘッダー：高さ固定で縮まない
  header:  { padding: "28px 40px 20px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: THEME.bg, borderBottom: `1px solid ${THEME.border}`, zIndex: 20 },
  // body：残り高さを占有、横に並ぶ
  body:    { flex: 1, display: "flex", minHeight: 0, overflow: "hidden" },
  // 左：フロー列エリア（横スクロールのみ）
  flowArea:  { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", padding: "16px 0 0 40px" },
  kanban:    { display: "flex", gap: "16px", overflowX: "auto", overflowY: "hidden", flex: 1, alignItems: "stretch", paddingBottom: "16px", paddingRight: "16px" },
  // col：高さいっぱいに伸ばしてカードのみ縦スクロール
  col:       { minWidth: "300px", width: "300px", borderRadius: "20px", border: `1px solid ${THEME.border}`, transition: "background-color 0.2s, border-color 0.2s", flexShrink: 0, display: "flex", flexDirection: "column" },
  colHeader: { padding: "16px 16px 12px", flexShrink: 0, borderRadius: "20px 20px 0 0" },
  colCards:  { padding: "0 16px 16px", overflowY: "auto", flex: 1 },
  card:      { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", border: "2px solid transparent", userSelect: "none", transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s", marginBottom: "10px" },
  // 右：終点パネル（bodyと同じ高さ、スクロールしない）
  rightPanel: { width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${THEME.border}`, marginLeft: "16px", overflow: "hidden", padding: "16px 0 0 0" },
  rightZone:  { flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", minHeight: 0 },
  // 底部行：ボトムバー(flex:1) + 除外コーナー(固定幅) 横並び
  bottomRow: { flexShrink: 0, display: "flex", zIndex: 10, borderTop: `1px solid ${THEME.border}` },
  bottomBar: { flex: 1, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "14px 40px", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" },
  excludedCorner: { width: "256px", flexShrink: 0, borderLeft: `1px solid ${THEME.border}`, backgroundColor: "#F1F2F4", padding: "12px 14px", marginLeft: "16px" },
  zone:      { minWidth: "220px", height: "72px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontWeight: "900", fontSize: "15px", border: "3px dashed transparent", transition: "all 0.2s", cursor: "default", padding: "0 20px" },
  overlay:   { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" },
  modal:     { backgroundColor: "white", borderRadius: 24, padding: "40px", width: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" },
};

// ─────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────
function calcDaysInStatus(customer) {
  const base = customer["ステータス変更日"] || customer["登録日"];
  if (!base) return null;
  const diff = Math.floor((Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? null : diff;
}
function daysColor(days) {
  if (days === null) return null;
  if (days <= 7)  return { bg: "#DCFCE7", text: "#166534" };
  if (days <= 14) return { bg: "#FEF3C7", text: "#92400E" };
  if (days <= 30) return { bg: "#FED7AA", text: "#9A3412" };
  return               { bg: "#FEE2E2", text: "#991B1B" };
}

// ─────────────────────────────────────────────────────────
// terminalType ごとのビジュアル設定
// ─────────────────────────────────────────────────────────
const TERMINAL_VISUAL = {
  dormant:  { emoji: "⏸",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", routeType: "dormant" },
  won:      { emoji: "🏆", color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", routeType: "won"     },
  lost:     { emoji: "🗑",  color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", routeType: "lost"    },
  excluded: { emoji: "🚫", color: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", routeType: null       },
};

// ─────────────────────────────────────────────────────────
// モーダル群
// ─────────────────────────────────────────────────────────
function ScenarioConfirmModal({ info, onConfirm, onCancel }) {
  if (!info) return null;
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔄</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 12px" }}>
            ステータスを変更しますか？
          </h3>
          <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.8, margin: 0 }}>
            <strong style={{ color: THEME.primary }}>「{info.newStatus}」</strong> に変更します。
            {info.scenarioId && (<><br />シナリオ <strong>「{info.scenarioId}」</strong> が自動で適用されます。</>)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: THEME.primary, color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>変更する</button>
          <button onClick={onCancel}  style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// 汎用終点モーダル（休眠系 / 除外）
function DormantModal({ info, scenarios, gasUrl, onDone, onCancel }) {
  const [selected, setSelected]   = useState(null);
  const [scenarioId, setScenarioId] = useState("");
  const [saving, setSaving]       = useState(false);
  const OPTS = [
    { months: 1, label: "1ヶ月後" }, { months: 2, label: "2ヶ月後" },
    { months: 3, label: "3ヶ月後" }, { months: 6, label: "6ヶ月後" },
    { months: 12, label: "12ヶ月後" }, { months: 0, label: "設定しない" },
  ];
  if (!info) return null;
  const handleConfirm = async () => {
    setSaving(true);
    await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: info.customerId, status: info.newStatus, applyScenario: "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    if (selected?.months > 0 && scenarioId) {
      await axios.post(gasUrl, JSON.stringify({ action: "scheduleDormantReapproach", id: info.customerId, months: selected.months, scenarioId }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    }
    setSaving(false);
    onDone();
  };
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 500 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌙</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>「{info.newStatus}」に変更</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>再アプローチするタイミングを設定できます</p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 10 }}>再アプローチ時期</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OPTS.map(opt => (
              <button key={opt.months} onClick={() => setSelected(opt)} style={{ padding: "8px 18px", borderRadius: 99, fontWeight: 800, fontSize: 13, cursor: "pointer", border: `2px solid ${selected?.months === opt.months ? "#D97706" : THEME.border}`, backgroundColor: selected?.months === opt.months ? "#FFFBEB" : "white", color: selected?.months === opt.months ? "#D97706" : THEME.textMuted }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {selected?.months > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>適用シナリオ（任意）</div>
            <select value={scenarioId} onChange={e => setScenarioId(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 14, fontWeight: 700 }}>
              <option value="">シナリオを選択しない</option>
              {[...new Set(scenarios.map(s => s["シナリオID"]))].map(sid => <option key={sid} value={sid}>{sid}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleConfirm} disabled={saving || selected === null} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: selected ? "#D97706" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: selected ? "pointer" : "not-allowed" }}>
            {saving ? "処理中..." : "確定する"}
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// 失注モーダル
const LOST_REASONS = ["金額条件が合わなかった", "他社に決まった", "売却を取り止めた", "時期を再検討する", "連絡が取れなくなった", "その他"];
function LostModal({ info, gasUrl, onDone, onCancel }) {
  const [reason, setReason]     = useState("");
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving]     = useState(false);
  if (!info) return null;
  const handleConfirm = async () => {
    if (!reason) return;
    setSaving(true);
    const finalReason = reason === "その他" ? freeText || "その他" : reason;
    await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: info.customerId, status: info.newStatus, applyScenario: "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    await axios.post(gasUrl, JSON.stringify({ action: "saveLostReason", id: info.customerId, reason: finalReason }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    setSaving(false);
    onDone();
  };
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🗑</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>失注に変更</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>失注の理由を記録しておきましょう</p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>失注理由 <span style={{ color: "#DC2626" }}>*</span></div>
          <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: `1px solid ${reason ? THEME.border : "#DC2626"}`, fontSize: 14, fontWeight: 700, appearance: "none", backgroundColor: "white", cursor: "pointer", boxSizing: "border-box" }}>
            <option value="">選択してください</option>
            {LOST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {reason === "その他" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>詳細を入力</div>
            <textarea value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="失注の詳細を入力してください" rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleConfirm} disabled={saving || !reason} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: reason ? "#DC2626" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: reason ? "pointer" : "not-allowed" }}>
            {saving ? "処理中..." : "確定する"}
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DropZone コンポーネント（右パネル・下部バー共用）
// ─────────────────────────────────────────────────────────
function DropZone({ status, count, isDragging, isOver, visual, onDragOver, onDragLeave, onDrop, compact = false }) {
  const { emoji, color, bg, border, routeType } = visual;
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        borderRadius: 16,
        border: `2.5px dashed ${isOver ? color : isDragging ? `${color}70` : THEME.border}`,
        backgroundColor: isOver ? bg : isDragging ? `${bg}99` : "white",
        padding: compact ? "16px 14px" : "14px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "all 0.2s",
        transform: isOver ? "scale(1.03)" : "scale(1)",
        boxShadow: isOver ? `0 0 0 3px ${color}25` : "none",
        minHeight: compact ? 80 : 72,
        flex: compact ? 1 : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: compact ? 14 : 15, color }}>
        <span style={{ fontSize: compact ? 20 : 22 }}>{emoji}</span>
        <span>{status.name}</span>
        <span style={{ backgroundColor: count > 0 ? color : "#9CA3AF", color: "white", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 20 }}>
          {count}
        </span>
      </div>
      {routeType && (
        <Link
          to={`/status-list/${routeType}`}
          onClick={e => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color, backgroundColor: bg, border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 8, textDecoration: "none" }}
        >
          <ExternalLink size={10} /> リスト
        </Link>
      )}
    </div>
  );
}

// 除外ゾーン（灰色・右下コーナー）
function ExcludedZone({ statuses, customers, isDragging, overColumn, onDragOver, onDragLeave, onDrop }) {
  if (statuses.length === 0) return null;
  return (
    <div style={{ ...S.excludedZone }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", marginBottom: 8 }}>🚫 除外</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {statuses.map(st => {
          const count = customers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;
          const isOver = overColumn === st.name;
          return (
            <div
              key={st.name}
              onDragOver={e => onDragOver(e, st.name)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, st.name)}
              style={{
                borderRadius: 10, border: `2px dashed ${isOver ? "#9CA3AF" : "#D1D5DB"}`,
                backgroundColor: isOver ? "#E5E7EB" : "#F9FAFB",
                padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#6B7280" }}>🚫 {st.name}</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: "white", backgroundColor: count > 0 ? "#9CA3AF" : "#D1D5DB", padding: "1px 7px", borderRadius: 20 }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────
export default function KanbanBoard({
  customers = [], statuses = [], scenarios = [], scenarioSettings = {},
  onRefresh, staffList = [], gasUrl, sources = [], contractTypes = [],
}) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff]       = useState("");
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId]         = useState(null);
  const [overColumn, setOverColumn]         = useState(null);
  const [syncing, setSyncing]               = useState(false);

  const [scenarioModal, setScenarioModal] = useState(null);
  const [promptModal,   setPromptModal]   = useState(null);
  const [dormantModal,  setDormantModal]  = useState(null);
  const [lostModal,     setLostModal]     = useState(null);

  const pendingIds = useRef(new Set());

  useEffect(() => {
    setLocalCustomers(prev =>
      customers.map(c =>
        pendingIds.current.has(String(c.id))
          ? (prev.find(p => String(p.id) === String(c.id)) || c)
          : c
      )
    );
  }, [customers]);

  // ── ステータス分類 ──────────────────────────────────
  // フロー：terminalTypeなし
  const flowStatuses = statuses.filter(s => !s.terminalType);
  // 終点：placement別
  const bottomTerminals = statuses.filter(s => s.terminalType && s.terminalType !== "excluded" && (s.placement || "bottom") === "bottom");
  const rightTerminals  = statuses.filter(s => s.terminalType && s.terminalType !== "excluded" && (s.placement || "bottom") === "right");
  const excludedStatuses = statuses.filter(s => s.terminalType === "excluded");

  // 右パネルを表示するか
  const hasRightPanel = rightTerminals.length > 0; // excludedはbottomRow右下コーナーに配置

  // ── ドラッグ処理 ──────────────────────────────────
  const onDragStart = useCallback((e, cid) => {
    e.dataTransfer.setData("customerId", String(cid));
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDraggingId(String(cid)));
  }, []);
  const onDragEnd   = useCallback(() => { setDraggingId(null); setOverColumn(null); }, []);
  const onDragOver  = useCallback((e, col) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverColumn(col); }, []);
  const onDragLeave = useCallback((e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setOverColumn(null); }, []);

  const onDrop = useCallback((e, newStatus) => {
    e.preventDefault();
    const cid = e.dataTransfer.getData("customerId");
    setDraggingId(null); setOverColumn(null);
    if (!cid) return;
    const target = localCustomers.find(c => String(c.id) === cid);
    if (!target || target["対応ステータス"] === newStatus) return;
    const prevStatus = target["対応ステータス"];
    const statusDef  = statuses.find(s => s.name === newStatus);

    // 失注
    if (statusDef?.terminalType === "lost") {
      setLostModal({ customerId: cid, newStatus, prevStatus });
      return;
    }
    // 成約 → シンプル確認モーダル経由で更新
    if (statusDef?.terminalType === "won") {
      const scenarioId = statusDef?.scenarioId || "";
      if (scenarioId) {
        setScenarioModal({ customerId: cid, newStatus, prevStatus, scenarioId });
      } else {
        execUpdate(cid, newStatus, prevStatus, "");
      }
      return;
    }
    // 休眠系（dormant）→ 再アプローチモーダル
    if (statusDef?.terminalType === "dormant") {
      setDormantModal({ customerId: cid, newStatus, prevStatus });
      return;
    }
    // 除外 → シンプル更新（モーダルなし）
    if (statusDef?.terminalType === "excluded") {
      execUpdate(cid, newStatus, prevStatus, "");
      return;
    }
    // 通常フロー
    const scenarioId = statusDef?.scenarioId || "";
    if (scenarioId) {
      setScenarioModal({ customerId: cid, newStatus, prevStatus, scenarioId });
    } else {
      execUpdate(cid, newStatus, prevStatus, "");
    }
  }, [localCustomers, statuses]);

  const execUpdate = useCallback(async (cid, newStatus, prevStatus, scenarioId) => {
    setLocalCustomers(prev => prev.map(c => String(c.id) === cid ? { ...c, "対応ステータス": newStatus } : c));
    pendingIds.current.add(cid);
    setSyncing(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: cid, status: newStatus, applyScenario: scenarioId || "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      const pf = statuses.find(s => s.name === newStatus)?.promptFields || [];
      if (pf.length > 0) {
        setPromptModal({ customerId: cid, promptFields: pf });
      } else {
        onRefresh();
      }
    } catch {
      setLocalCustomers(prev => prev.map(c => String(c.id) === cid ? { ...c, "対応ステータス": prevStatus } : c));
      alert("更新に失敗しました");
    } finally {
      setTimeout(() => { pendingIds.current.delete(cid); setSyncing(false); }, 2000);
    }
  }, [gasUrl, onRefresh, statuses]);

  const handlePromptConfirm = useCallback(async (values) => {
    if (!promptModal) return;
    const updates = Object.entries(values).filter(([, v]) => v);
    if (updates.length > 0) {
      try {
        await axios.post(gasUrl, JSON.stringify({ action: "updateFields", id: promptModal.customerId, fields: Object.fromEntries(updates) }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      } catch {}
    }
    setPromptModal(null);
    onRefresh();
  }, [promptModal, gasUrl, onRefresh]);

  const handleScenarioConfirm = () => {
    const { customerId, newStatus, prevStatus, scenarioId } = scenarioModal;
    setScenarioModal(null);
    execUpdate(customerId, newStatus, prevStatus, scenarioId);
  };
  const handleModalDone = () => { setDormantModal(null); setLostModal(null); onRefresh(); };

  // ── フィルタ ──────────────────────────────────────
  const filtered = filterStaff ? localCustomers.filter(c => c["担当者メール"] === filterStaff) : localCustomers;
  const colCustomers = (st, idx) => filtered.filter(c => {
    const cur = (c["対応ステータス"] || "").trim();
    if (cur === st.name.trim()) return true;
    const known = statuses.some(s => s.name.trim() === cur);
    return idx === 0 && (!cur || !known);
  });
  const termCount = (st) => localCustomers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;

  // ─────────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────────
  return (
    <>
      <div style={S.main}>
        <div style={S.wrapper}>

          {/* ヘッダー（固定） */}
          <header style={S.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>案件管理カンバン</h1>
              {syncing && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>
                  <Loader2 className="animate-spin" size={14} /> 同期中
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button onClick={() => navigate("/status-settings")} style={{ backgroundColor: "#FFF", border: `1px solid ${THEME.border}`, padding: "10px 20px", borderRadius: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: THEME.textMain }}>
                <ListTodo size={18} /> ステータス調整
              </button>
              <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
            </div>
          </header>

          {/* ボディ：フロー列 ＋ 右パネル */}
          <div style={S.body}>

            {/* ── 左：フロー列 ── */}
            <div style={S.flowArea}>
              <div style={S.kanban}>
                {flowStatuses.map((st, idx) => {
                  const cards  = colCustomers(st, idx);
                  const isOver = overColumn === st.name;
                  return (
                    <div
                      key={st.name}
                      onDragOver={e => onDragOver(e, st.name)}
                      onDragLeave={onDragLeave}
                      onDrop={e => onDrop(e, st.name)}
                      style={{ ...S.col, backgroundColor: isOver ? "#E0E7FF" : "#EDF2F7", borderColor: isOver ? THEME.primary : THEME.border, boxShadow: isOver ? `0 0 0 2px ${THEME.primary}40` : "none" }}
                    >
                      {/* ── 固定ヘッダー（ステータス名表示 - スクロールしない） ── */}
                      <div style={{ ...S.colHeader, backgroundColor: isOver ? "#E0E7FF" : "#EDF2F7" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <h3 style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>{st.name}</h3>
                            {st.scenarioId && <div style={{ fontSize: 10, color: THEME.primary, fontWeight: 700, marginTop: 2 }}>▶ {st.scenarioId}</div>}
                          </div>
                          <span style={{ backgroundColor: THEME.primary, color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900" }}>{cards.length}</span>
                        </div>
                      </div>

                      {/* ── スクロールするカード領域 ── */}
                      <div style={S.colCards}>
                        {cards.map(c => {
                          const dragging = draggingId === String(c.id);
                          const staff    = staffList.find(s => s.email === c["担当者メール"]);
                          const days     = calcDaysInStatus(c);
                          const color    = daysColor(days);
                          return (
                            <div
                              key={c.id}
                              draggable
                              onDragStart={e => onDragStart(e, c.id)}
                              onDragEnd={onDragEnd}
                              style={{ ...S.card, borderColor: dragging ? THEME.primary : "transparent", opacity: dragging ? 0.3 : 1, transform: dragging ? "scale(1.03) rotate(1.5deg)" : "scale(1)", boxShadow: dragging ? "0 16px 32px rgba(91,79,206,0.25)" : S.card.boxShadow }}
                            >
                              <div style={{ fontWeight: "900", marginBottom: "10px", fontSize: "15px", color: THEME.textMain }}>{c["姓"]} {c["名"]} 様</div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 5, fontWeight: "700" }}>
                                  <UserCircle size={14} color={THEME.primary} />
                                  {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                                </div>
                                <Link to={`/direct-sms/${c.id}`} onClick={e => e.stopPropagation()} style={{ color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px", borderRadius: "8px", display: "flex" }}>
                                  <MessageSquare size={14} />
                                </Link>
                              </div>
                              {days !== null && color && (
                                <div style={{ marginTop: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: color.bg, color: color.text, padding: "3px 10px", borderRadius: 99 }}>
                                    {days === 0 ? "本日" : `${days}日滞留中`}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* ドロップ受け取り用の最低高さ確保 */}
                        {cards.length === 0 && <div style={{ height: 80 }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 右パネル（right配置の終点ステータス） ── */}
            {rightTerminals.length > 0 && (
              <div style={S.rightPanel}>
                <div style={S.rightZone}>
                  {/* セクションラベル */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingBottom: 10, borderBottom: `1px solid ${THEME.border}` }}>
                    <div style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: THEME.primary }} />
                    <span style={{ fontSize: 13, fontWeight: 900, color: THEME.textMain, letterSpacing: "0.02em" }}>終点ステータス</span>
                  </div>
                  {rightTerminals.map(st => {
                    const visual = TERMINAL_VISUAL[st.terminalType] || TERMINAL_VISUAL.dormant;
                    return (
                      <DropZone
                        key={st.name}
                        status={st}
                        count={termCount(st)}
                        isDragging={!!draggingId}
                        isOver={overColumn === st.name}
                        visual={visual}
                        onDragOver={e => onDragOver(e, st.name)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, st.name)}
                        compact
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 底部行：ボトムバー + 右下除外コーナー ── */}
        {(bottomTerminals.length > 0 || excludedStatuses.length > 0) && (
          <div style={S.bottomRow}>
            {/* ボトムバー（left flex:1） */}
            <div style={{ ...S.bottomBar, ...(bottomTerminals.length === 0 ? { flex: 1 } : {}) }}>
              {bottomTerminals.map(st => {
                const visual = TERMINAL_VISUAL[st.terminalType] || TERMINAL_VISUAL.dormant;
                return (
                  <DropZone
                    key={st.name}
                    status={st}
                    count={termCount(st)}
                    isDragging={!!draggingId}
                    isOver={overColumn === st.name}
                    visual={visual}
                    onDragOver={e => onDragOver(e, st.name)}
                    onDragLeave={onDragLeave}
                    onDrop={e => onDrop(e, st.name)}
                  />
                );
              })}
              {bottomTerminals.length === 0 && (
                <span style={{ color: THEME.textMuted, fontSize: 13, fontWeight: 700 }}>—</span>
              )}
            </div>

            {/* 右下コーナー：除外ゾーン */}
            {excludedStatuses.length > 0 && (
              <div style={S.excludedCorner}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>🚫</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#6B7280" }}>除外</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {excludedStatuses.map(st => {
                    const count = localCustomers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;
                    const isOver = overColumn === st.name;
                    return (
                      <div
                        key={st.name}
                        onDragOver={e => onDragOver(e, st.name)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, st.name)}
                        style={{
                          borderRadius: 10, border: `2px dashed ${isOver ? "#9CA3AF" : "#D1D5DB"}`,
                          backgroundColor: isOver ? "#E5E7EB" : "#F9FAFB",
                          padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                          transition: "all 0.2s", cursor: "default",
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#6B7280" }}>🚫 {st.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "white", backgroundColor: count > 0 ? "#9CA3AF" : "#D1D5DB", padding: "1px 7px", borderRadius: 20 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* モーダル群 */}
      <ScenarioConfirmModal info={scenarioModal} onConfirm={handleScenarioConfirm} onCancel={() => setScenarioModal(null)} />
      <DormantModal info={dormantModal} scenarios={scenarios} gasUrl={gasUrl} onDone={handleModalDone} onCancel={() => setDormantModal(null)} />
      <LostModal info={lostModal} gasUrl={gasUrl} onDone={handleModalDone} onCancel={() => setLostModal(null)} />
      {promptModal && (
        <PromptFieldsModal
          newStatus={localCustomers.find(c => String(c.id) === promptModal.customerId)?.["対応ステータス"] || ""}
          promptFields={promptModal.promptFields}
          sources={sources} contractTypes={contractTypes} staffList={staffList}
          onConfirm={handlePromptConfirm}
          onSkip={() => { setPromptModal(null); onRefresh(); }}
        />
      )}
    </>
  );
}