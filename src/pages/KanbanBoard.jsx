import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ListTodo, UserCircle, MessageSquare,
  Trophy, Moon, Trash2, ChevronDown, Loader2, Users
} from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 📋 KanbanBoard - 案件管理カンバン
// ==========================================

const S = {
  main:     { minHeight: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column" },
  wrapper:  { padding: "40px 40px 0", flex: 1, display: "flex", flexDirection: "column" },
  selWrap:  { position: "relative", display: "flex", alignItems: "center", backgroundColor: "#FFF", padding: "0 14px", borderRadius: "12px", border: `1px solid ${THEME.border}`, height: "42px", minWidth: "220px" },
  select:   { width: "100%", border: "none", outline: "none", backgroundColor: "transparent", fontSize: "13px", fontWeight: "800", color: THEME.textMain, appearance: "none", cursor: "pointer", zIndex: 1 },
  kanban:   { display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "24px", flex: 1, alignItems: "flex-start" },
  col:      { minWidth: "310px", width: "310px", borderRadius: "20px", padding: "16px", minHeight: "60vh", border: `1px solid ${THEME.border}`, transition: "background-color 0.2s, border-color 0.2s" },
  card:     { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", border: "2px solid transparent", userSelect: "none", transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s" },
  bottomBar:{ position: "sticky", bottom: 0, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "20px 40px", borderTop: `1px solid ${THEME.border}`, display: "flex", gap: "24px", justifyContent: "center", zIndex: 10 },
  zone:     { flex: 1, maxWidth: "320px", height: "74px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "900", fontSize: "16px", border: "3px dashed transparent", transition: "all 0.2s" },
};

export default function KanbanBoard({
  customers = [], statuses = [], scenarios = [], scenarioSettings = {},
  onRefresh, staffList = [], gasUrl,
}) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");

  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId]   = useState(null);
  const [overColumn, setOverColumn]   = useState(null);
  const [syncing, setSyncing]         = useState(false);
  const [confirmDrop, setConfirmDrop] = useState(null);
  // confirmDrop: { customerId, newStatus, label, scenarioId, color, emoji }

  const pendingIds = useRef(new Set());

  // 親 customers が更新されたとき pending 中は上書きしない
  useEffect(() => {
    setLocalCustomers((prev) =>
      customers.map((c) =>
        pendingIds.current.has(String(c.id))
          ? (prev.find((p) => String(p.id) === String(c.id)) || c)
          : c
      )
    );
  }, [customers]);

  // スタッフ取得


  // ステータス分類
  const flowStatuses = statuses.slice(0, statuses.length - 3);
  const wonLabel     = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel    = statuses[statuses.length - 1]?.name || "失注";

  // ── ドラッグ処理 ──────────────────────────────────

  const onDragStart = useCallback((e, cid) => {
    e.dataTransfer.setData("customerId", String(cid));
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDraggingId(String(cid)));
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setOverColumn(null);
  }, []);

  const onDragOver = useCallback((e, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(col);
  }, []);

  const onDragLeave = useCallback((e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOverColumn(null);
  }, []);

  const onDrop = useCallback((e, newStatus) => {
    e.preventDefault();
    const cid = e.dataTransfer.getData("customerId");
    setDraggingId(null);
    setOverColumn(null);
    if (!cid) return;

    const target = localCustomers.find((c) => String(c.id) === cid);
    if (!target || target["対応ステータス"] === newStatus) return;

    // 成約・休眠はモーダル確認
    const isWon     = newStatus === wonLabel;
    const isDormant = newStatus === dormantLabel;
    if (isWon || isDormant) {
      const scenarioId = isWon
        ? scenarioSettings?.wonScenarioId
        : scenarioSettings?.dormantScenarioId;
      setConfirmDrop({
        customerId: cid,
        newStatus,
        label: newStatus,
        scenarioId,
        color: isWon ? THEME.success : "#F59E0B",
        emoji: isWon ? "🏆" : "🌙",
      });
      return;
    }

    // 通常ステータスは即時更新
    execUpdate(cid, newStatus, target["対応ステータス"], null);
  }, [localCustomers, wonLabel, dormantLabel, scenarioSettings]);

  // 実際の更新処理（通常 & モーダル確定）
  const execUpdate = useCallback(async (cid, newStatus, prevStatus, scenarioId) => {
    setLocalCustomers((prev) =>
      prev.map((c) => String(c.id) === cid ? { ...c, "対応ステータス": newStatus } : c)
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
      setLocalCustomers((prev) =>
        prev.map((c) => String(c.id) === cid ? { ...c, "対応ステータス": prevStatus } : c)
      );
      alert("更新に失敗しました");
    } finally {
      setTimeout(() => { pendingIds.current.delete(cid); setSyncing(false); }, 2000);
    }
  }, [gasUrl, onRefresh]);

  // モーダルの「確定する」
  const handleConfirm = useCallback(() => {
    if (!confirmDrop) return;
    const { customerId, newStatus, scenarioId } = confirmDrop;
    const target = localCustomers.find((c) => String(c.id) === customerId);
    setConfirmDrop(null);
    execUpdate(customerId, newStatus, target?.["対応ステータス"] || "", scenarioId);
  }, [confirmDrop, localCustomers, execUpdate]);

  // ── フィルタリング ──────────────────────────────────

  const filtered = filterStaff
    ? localCustomers.filter((c) => c["担当者メール"] === filterStaff)
    : localCustomers;

  const colCustomers = (st, idx) =>
    filtered.filter((c) => {
      const cur = (c["対応ステータス"] || "").trim();
      if (cur === st.name.trim()) return true;
      const known = statuses.some((s) => s.name.trim() === cur);
      return idx === 0 && (!cur || !known);
    });

  // ── レンダリング ──────────────────────────────────

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
              <div style={S.selWrap}>
                <Users size={16} color={THEME.textMuted} style={{ marginRight: 8 }} />
                <select style={S.select} value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                  <option value="">全ての担当者</option>
                  {staffList.map((s) => (
                    <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
                  ))}
                </select>
                <ChevronDown size={16} color={THEME.textMuted} style={{ position: "absolute", right: "12px", pointerEvents: "none" }} />
              </div>
            </div>
          </header>

          {/* カンバン列 */}
          <div style={S.kanban}>
            {flowStatuses.map((st, idx) => {
              const cards = colCustomers(st, idx);
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
                    <h3 style={{ fontSize: "14px", fontWeight: "900", color: THEME.textMain, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                      {st.name}
                    </h3>
                    <span style={{ backgroundColor: THEME.primary, color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900" }}>
                      {cards.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "100px" }}>
                    {cards.map((c) => {
                      const dragging = draggingId === String(c.id);
                      const staff    = staffList.find((s) => s.email === c["担当者メール"]);
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 終着ゾーン */}
        <div style={S.bottomBar}>
          {[
            { label: wonLabel,     emoji: "🏆", color: THEME.success, bg: "#ECFDF5" },
            { label: dormantLabel, emoji: "🌙", color: "#F59E0B",      bg: "#FFFBEB" },
            { label: lostLabel,    emoji: "🗑",  color: THEME.danger,  bg: "#FEF2F2" },
          ].map(({ label, emoji, color, bg }) => (
            <div
              key={label}
              onDragOver={(e) => onDragOver(e, label)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, label)}
              style={{
                ...S.zone,
                backgroundColor: draggingId ? bg : "#F9FAFB",
                color,
                borderColor: overColumn === label ? color : draggingId ? `${color}60` : THEME.border,
                transform:   overColumn === label ? "scale(1.05)" : "scale(1)",
                boxShadow:   overColumn === label ? `0 0 0 3px ${color}30` : "none",
              }}
            >
              <span style={{ fontSize: 24 }}>{emoji}</span> {label}
            </div>
          ))}
        </div>
      </div>

      {/* 成約・休眠 確認モーダル */}
      {confirmDrop && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px", width: 440, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{confirmDrop.emoji}</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 12px" }}>
                {confirmDrop.label}に移動しますか？
              </h3>
              <p style={{ fontSize: 14, color: THEME.textMuted, margin: 0, lineHeight: 1.8 }}>
                ステータスを
                <strong style={{ color: confirmDrop.color }}>「{confirmDrop.label}」</strong>
                に変更します。
                {confirmDrop.scenarioId ? (
                  <>
                    <br />
                    シナリオ
                    <strong>「{confirmDrop.scenarioId}」</strong>
                    の配信が自動で開始されます。
                  </>
                ) : (
                  <>
                    <br />
                    <span style={{ color: "#F59E0B" }}>
                      ⚠ 適用シナリオが未設定です
                    </span>
                    <br />
                    <span style={{ fontSize: 12 }}>シナリオ管理から設定できます</span>
                  </>
                )}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleConfirm}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", backgroundColor: confirmDrop.color, color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}
              >
                確定する
              </button>
              <button
                onClick={() => setConfirmDrop(null)}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}