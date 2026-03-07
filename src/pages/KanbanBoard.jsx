import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ListTodo, UserCircle, MessageSquare,
  Moon, Trash2, Loader2, Users, ExternalLink
} from "lucide-react";
import { THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";
import { apiCall } from "../lib/utils";

const S = {
  main:     { minHeight: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column" },
  wrapper:  { padding: "40px 40px 0", flex: 1, display: "flex", flexDirection: "column" },
  kanban:   { display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "24px", flex: 1, alignItems: "flex-start" },
  col:      { minWidth: "310px", width: "310px", borderRadius: "20px", padding: "16px", minHeight: "60vh", border: `1px solid ${THEME.border}`, transition: "background-color 0.2s, border-color 0.2s" },
  card:     { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", border: "2px solid transparent", userSelect: "none", transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s" },
  bottomBar:{ position: "sticky", bottom: 0, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "20px 40px", borderTop: `1px solid ${THEME.border}`, display: "flex", gap: "24px", justifyContent: "center", zIndex: 10 },
  zone:     { flex: 1, maxWidth: "320px", height: "74px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "900", fontSize: "16px", border: "3px dashed transparent", transition: "all 0.2s" },
  overlay:  { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" },
  modal:    { backgroundColor: "white", borderRadius: 24, padding: "40px", width: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" },
};

// 滞留日数計算
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

// ── モーダル群 ────────────────────────────────────────

// 汎用シナリオ確認モーダル（全ステータスのD&D後）
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
            {info.scenarioId && (
              <><br />シナリオ <strong>「{info.scenarioId}」</strong> が自動で適用されます。</>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: THEME.primary, color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
            変更する
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// 休眠モーダル
const REAPPROACH_OPTIONS = [
  { months: 1, label: "1ヶ月後" },
  { months: 2, label: "2ヶ月後" },
  { months: 3, label: "3ヶ月後" },
  { months: 6, label: "6ヶ月後" },
  { months: 12, label: "12ヶ月後" },
  { months: 0, label: "設定しない" },
];

function DormantModal({ info, scenarios, gasUrl, onDone, onCancel }) {
  const [selected, setSelected] = useState(null);
  const [scenarioId, setScenarioId] = useState("");
  const [saving, setSaving] = useState(false);

  if (!info) return null;

  const handleConfirm = async () => {
    setSaving(true);
    // まずステータスを休眠に更新
    await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: info.customerId, status: info.newStatus, applyScenario: "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    // 再アプローチ月が設定されていればスケジュール登録
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
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>休眠に変更</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>再アプローチするタイミングを設定できます</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 10 }}>再アプローチ時期</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {REAPPROACH_OPTIONS.map(opt => (
              <button
                key={opt.months}
                onClick={() => setSelected(opt)}
                style={{
                  padding: "8px 18px", borderRadius: 99, fontWeight: 800, fontSize: 13, cursor: "pointer",
                  border: `2px solid ${selected?.months === opt.months ? THEME.primary : THEME.border}`,
                  backgroundColor: selected?.months === opt.months ? "#EEF2FF" : "white",
                  color: selected?.months === opt.months ? THEME.primary : THEME.textMuted,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {selected && selected.months > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>適用シナリオ（任意）</div>
            <select
              value={scenarioId}
              onChange={e => setScenarioId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 14, fontWeight: 700 }}
            >
              <option value="">シナリオを選択しない</option>
              {[...new Set(scenarios.map(s => s["シナリオID"]))].map(sid => (
                <option key={sid} value={sid}>{sid}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleConfirm}
            disabled={saving || selected === null}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: selected ? "#D97706" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: selected ? "pointer" : "not-allowed" }}
          >
            {saving ? "処理中..." : "確定する"}
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// 失注モーダル
const LOST_REASONS = ["金額条件が合わなかった", "他社に決まった", "売却を取り止めた", "時期を再検討する", "連絡が取れなくなった", "その他"];

function LostModal({ info, gasUrl, onDone, onCancel }) {
  const [reason, setReason] = useState("");
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

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
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>失注理由 <span style={{ color: THEME.danger }}>*</span></div>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              width: "100%", padding: "11px 16px", borderRadius: 10,
              border: `1px solid ${reason ? THEME.border : THEME.danger}`,
              fontSize: 14, fontWeight: 700, outline: "none",
              backgroundColor: "white", color: "#1E293B",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
              cursor: "pointer", boxSizing: "border-box",
            }}
          >
            <option value="">選択してください</option>
            {LOST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {reason === "その他" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>詳細を入力</div>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="失注の詳細を入力してください"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleConfirm}
            disabled={saving || !reason}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: reason ? THEME.danger : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: reason ? "pointer" : "not-allowed" }}
          >
            {saving ? "処理中..." : "確定する"}
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────────

export default function KanbanBoard({
  customers = [], statuses = [], scenarios = [], scenarioSettings = {},
  onRefresh, staffList = [], gasUrl,
}) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff]       = useState("");
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId]         = useState(null);
  const [overColumn, setOverColumn]         = useState(null);
  const [syncing, setSyncing]               = useState(false);

  // モーダル状態
  const [scenarioModal, setScenarioModal] = useState(null); // { customerId, newStatus, prevStatus, scenarioId }
  const [dormantModal, setDormantModal]   = useState(null); // { customerId, newStatus, prevStatus }
  const [lostModal, setLostModal]         = useState(null); // { customerId, newStatus, prevStatus }

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

  // ステータス分類
  // 終点種別: dormant / lost → ボトムゾーン。それ以外はすべてフロー列
  const dormantStatus  = statuses.find(s => s.terminalType === "dormant") || statuses[statuses.length - 2];
  const lostStatus     = statuses.find(s => s.terminalType === "lost")    || statuses[statuses.length - 1];
  const dormantLabel   = dormantStatus?.name || "休眠";
  const lostLabel      = lostStatus?.name    || "失注";
  const flowStatuses   = statuses.filter(s => s.name !== dormantLabel && s.name !== lostLabel);

  // ── ドラッグ処理 ──────────────────────────────────────

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
    setDraggingId(null);
    setOverColumn(null);
    if (!cid) return;

    const target = localCustomers.find(c => String(c.id) === cid);
    if (!target || target["対応ステータス"] === newStatus) return;

    const prevStatus = target["対応ステータス"];

    // 休眠 → 休眠モーダル
    if (newStatus === dormantLabel) {
      setDormantModal({ customerId: cid, newStatus, prevStatus });
      return;
    }
    // 失注 → 失注モーダル
    if (newStatus === lostLabel) {
      setLostModal({ customerId: cid, newStatus, prevStatus });
      return;
    }

    // それ以外：そのステータスの自動シナリオを確認
    const statusDef = statuses.find(s => s.name === newStatus);
    const scenarioId = statusDef?.scenarioId || "";
    if (scenarioId) {
      setScenarioModal({ customerId: cid, newStatus, prevStatus, scenarioId });
    } else {
      execUpdate(cid, newStatus, prevStatus, "");
    }
  }, [localCustomers, dormantLabel, lostLabel, statuses]);

  // 実際の更新
  const execUpdate = useCallback(async (cid, newStatus, prevStatus, scenarioId) => {
    setLocalCustomers(prev =>
      prev.map(c => String(c.id) === cid ? { ...c, "対応ステータス": newStatus } : c)
    );
    pendingIds.current.add(cid);
    setSyncing(true);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "updateStatus", id: cid, status: newStatus, applyScenario: scenarioId || "" }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      setLocalCustomers(prev =>
        prev.map(c => String(c.id) === cid ? { ...c, "対応ステータス": prevStatus } : c)
      );
      alert("更新に失敗しました");
    } finally {
      setTimeout(() => { pendingIds.current.delete(cid); setSyncing(false); }, 2000);
    }
  }, [gasUrl, onRefresh]);

  const handleScenarioConfirm = () => {
    const { customerId, newStatus, prevStatus, scenarioId } = scenarioModal;
    setScenarioModal(null);
    execUpdate(customerId, newStatus, prevStatus, scenarioId);
  };

  const handleModalDone = () => {
    setDormantModal(null);
    setLostModal(null);
    onRefresh();
  };

  // ── フィルタリング ────────────────────────────────────

  const filtered = filterStaff
    ? localCustomers.filter(c => c["担当者メール"] === filterStaff)
    : localCustomers;

  const colCustomers = (st, idx) =>
    filtered.filter(c => {
      const cur = (c["対応ステータス"] || "").trim();
      if (cur === st.name.trim()) return true;
      const known = statuses.some(s => s.name.trim() === cur);
      return idx === 0 && (!cur || !known);
    });

  // ── レンダリング ──────────────────────────────────────

  return (
    <>
      <div style={S.main}>
        <div style={S.wrapper}>

          {/* ヘッダー */}
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>案件管理カンバン</h1>
              {syncing && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>
                  <Loader2 className="animate-spin" size={14} /> 同期中
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button
                onClick={() => navigate("/status-settings")}
                style={{ backgroundColor: "#FFF", border: `1px solid ${THEME.border}`, padding: "10px 20px", borderRadius: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: THEME.textMain }}
              >
                <ListTodo size={18} /> ステータス調整
              </button>
              <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
            </div>
          </header>

          {/* カンバン列（終点ステータス以外すべて） */}
          <div style={S.kanban}>
            {flowStatuses.map((st, idx) => {
              const cards  = colCustomers(st, idx);
              const isOver = overColumn === st.name;
              return (
                <div
                  key={st.name}
                  onDragOver={(e) => onDragOver(e, st.name)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, st.name)}
                  style={{
                    ...S.col,
                    backgroundColor: isOver ? "#E0E7FF" : "#EDF2F7",
                    borderColor: isOver ? THEME.primary : THEME.border,
                    boxShadow: isOver ? `0 0 0 2px ${THEME.primary}40` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "0 8px" }}>
                    <div>
                      <h3 style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>{st.name}</h3>
                      {st.scenarioId && (
                        <div style={{ fontSize: 10, color: THEME.primary, fontWeight: 700, marginTop: 2 }}>▶ {st.scenarioId}</div>
                      )}
                    </div>
                    <span style={{ backgroundColor: THEME.primary, color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900" }}>
                      {cards.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "100px" }}>
                    {cards.map(c => {
                      const dragging = draggingId === String(c.id);
                      const staff    = staffList.find(s => s.email === c["担当者メール"]);
                      const days     = calcDaysInStatus(c);
                      const color    = daysColor(days);
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, c.id)}
                          onDragEnd={onDragEnd}
                          style={{
                            ...S.card,
                            borderColor: dragging ? THEME.primary : "transparent",
                            opacity:     dragging ? 0.3 : 1,
                            transform:   dragging ? "scale(1.03) rotate(1.5deg)" : "scale(1)",
                            boxShadow:   dragging ? "0 16px 32px rgba(91,79,206,0.25)" : S.card.boxShadow,
                          }}
                        >
                          <div style={{ fontWeight: "900", marginBottom: "10px", fontSize: "15px", color: THEME.textMain }}>
                            {c["姓"]} {c["名"]} 様
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 5, fontWeight: "700" }}>
                              <UserCircle size={14} color={THEME.primary} />
                              {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                            </div>
                            <Link
                              to={`/direct-sms/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px", borderRadius: "8px", display: "flex" }}
                            >
                              <MessageSquare size={14} />
                            </Link>
                          </div>
                          {days !== null && color && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: color.bg, color: color.text, padding: "3px 10px", borderRadius: 99 }}>
                                {days === 0 ? "本日" : `${days}日滞留中`}
                              </span>
                              {!c["ステータス変更日"] && (
                                <span style={{ fontSize: 10, color: THEME.textMuted, fontStyle: "italic" }}>登録日起算</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部ゾーン：休眠・失注のみ */}
        <div style={S.bottomBar}>
          {[
            { status: dormantStatus, emoji: "🌙", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", type: "dormant" },
            { status: lostStatus,    emoji: "🗑",  color: THEME.danger,  bg: "#FEE2E2", border: "#FCA5A5", type: "lost"    },
          ].filter(z => z.status).map(({ status, emoji, color, bg, border, type }) => {
            const label = status.name;
            const count = localCustomers.filter(c => (c["対応ステータス"] || "").trim() === label.trim()).length;
            return (
              <div
                key={label}
                onDragOver={(e) => onDragOver(e, label)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, label)}
                style={{
                  ...S.zone, flexDirection: "column", gap: 6, padding: "14px 24px",
                  backgroundColor: overColumn === label ? bg : draggingId ? `${bg}99` : "#F9FAFB",
                  color,
                  borderColor: overColumn === label ? color : draggingId ? `${color}60` : THEME.border,
                  transform:   overColumn === label ? "scale(1.05)" : "scale(1)",
                  boxShadow:   overColumn === label ? `0 0 0 3px ${color}30` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 15 }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  {label}
                  <span style={{ backgroundColor: count > 0 ? color : THEME.textMuted, color: "white", fontSize: 12, fontWeight: 900, padding: "2px 8px", borderRadius: 20 }}>
                    {count}
                  </span>
                </div>
                <Link
                  to={`/status-list/${type}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color, backgroundColor: bg, border: `1px solid ${border}`, padding: "3px 10px", borderRadius: 8, textDecoration: "none" }}
                >
                  <ExternalLink size={11} /> リストを見る
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* モーダル群 */}
      <ScenarioConfirmModal
        info={scenarioModal}
        onConfirm={handleScenarioConfirm}
        onCancel={() => setScenarioModal(null)}
      />
      <DormantModal
        info={dormantModal}
        scenarios={scenarios}
        gasUrl={gasUrl}
        onDone={handleModalDone}
        onCancel={() => setDormantModal(null)}
      />
      <LostModal
        info={lostModal}
        gasUrl={gasUrl}
        onDone={handleModalDone}
        onCancel={() => setLostModal(null)}
      />
    </>
  );
}