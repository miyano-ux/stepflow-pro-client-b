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

const localStyles = {
  main:     { minHeight: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column" },
  wrapper:  { padding: "40px 40px 0", flex: 1, display: "flex", flexDirection: "column" },
  selectContainer: { position: "relative", display: "flex", alignItems: "center", backgroundColor: "#FFFFFF", padding: "0 14px", borderRadius: "12px", border: `1px solid ${THEME.border}`, height: "42px", minWidth: "220px" },
  select:   { width: "100%", border: "none", outline: "none", backgroundColor: "transparent", fontSize: "13px", fontWeight: "800", color: THEME.textMain, appearance: "none", cursor: "pointer", zIndex: 1 },
  kanbanContainer: { display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "24px", flex: 1, alignItems: "flex-start" },
  column:   { minWidth: "310px", width: "310px", borderRadius: "20px", padding: "16px", minHeight: "60vh", border: `1px solid ${THEME.border}`, transition: "background-color 0.2s, border-color 0.2s" },
  card:     { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", border: "2px solid transparent", userSelect: "none", transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s" },
  bottomBar: { position: "sticky", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "20px 40px", borderTop: `1px solid ${THEME.border}`, display: "flex", gap: "24px", justifyContent: "center", zIndex: 10 },
  specialZone: { flex: 1, maxWidth: "320px", height: "74px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "900", fontSize: "16px", border: "3px dashed transparent", transition: "all 0.2s" },
};

export default function KanbanBoard({ customers = [], statuses = [], onRefresh, masterUrl, gasUrl, companyName }) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // GASへの保存が未完了の顧客IDを追跡する
  // このIDがある間は親からの customers 更新でローカル値を上書きしない
  const pendingIds = useRef(new Set());

  // 親の customers が更新されたとき、pending でない顧客のみ反映
  useEffect(() => {
    setLocalCustomers((prev) =>
      customers.map((c) => {
        if (pendingIds.current.has(String(c.id))) {
          return prev.find((p) => String(p.id) === String(c.id)) || c;
        }
        return c;
      })
    );
  }, [customers]);

  useEffect(() => {
    if (!masterUrl) return;
    axios
      .get(`${masterUrl}?action=list&company=${companyName}`)
      .then((res) => setStaffList(res?.data?.users || []))
      .catch(console.error);
  }, [masterUrl, companyName]);

  // ステータス分類
  const flowingStatuses = statuses.slice(0, statuses.length - 3);
  const wonLabel     = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel    = statuses[statuses.length - 1]?.name || "失注";

  // ── ドラッグ処理 ──────────────────────────

  const onDragStart = useCallback((e, customerId) => {
    e.dataTransfer.setData("customerId", String(customerId));
    e.dataTransfer.effectAllowed = "move";
    // setStateは非同期なので即時反映のためにrequestAnimationFrame
    requestAnimationFrame(() => setDraggingId(String(customerId)));
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggingId(null);
    setOverColumn(null);
  }, []);

  const onDragOver = useCallback((e, columnName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(columnName);
  }, []);

  const onDragLeave = useCallback((e) => {
    // 子要素への移動では発火させない
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOverColumn(null);
  }, []);

  const onDrop = useCallback(async (e, newStatus) => {
    e.preventDefault();
    const cid = e.dataTransfer.getData("customerId");
    setDraggingId(null);
    setOverColumn(null);
    if (!cid) return;

    const target = localCustomers.find((c) => String(c.id) === cid);
    if (!target || target["対応ステータス"] === newStatus) return;

    // 1. ローカルを即時・永続的に更新
    setLocalCustomers((prev) =>
      prev.map((c) => String(c.id) === cid ? { ...c, "対応ステータス": newStatus } : c)
    );

    // 2. pending 登録（親の上書きをブロック）
    pendingIds.current.add(cid);
    setSyncing(true);

    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "updateStatus", id: cid, status: newStatus }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      // 保存完了後にバックグラウンドでデータを更新
      onRefresh();
    } catch (err) {
      console.error("Sync error:", err);
      // 失敗時のみ元のステータスに戻す
      setLocalCustomers((prev) =>
        prev.map((c) => String(c.id) === cid ? { ...c, "対応ステータス": target["対応ステータス"] } : c)
      );
      alert("更新に失敗しました。元の位置に戻しました。");
    } finally {
      // 少し遅らせてから pending 解除（onRefresh の反映を待つ）
      setTimeout(() => {
        pendingIds.current.delete(cid);
        setSyncing(false);
      }, 2000);
    }
  }, [localCustomers, gasUrl, onRefresh]);

  // ── フィルタリング ──────────────────────────

  const filtered = filterStaff
    ? localCustomers.filter((c) => c["担当者メール"] === filterStaff)
    : localCustomers;

  const getColCustomers = (st, idx) =>
    filtered.filter((c) => {
      const cur = (c["対応ステータス"] || "").trim();
      if (cur === st.name.trim()) return true;
      const isKnown = statuses.some((s) => s.name.trim() === cur);
      return idx === 0 && (!cur || !isKnown);
    });

  return (
    <div style={localStyles.main}>
      <div style={localStyles.wrapper}>

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
            <div style={localStyles.selectContainer}>
              <Users size={16} color={THEME.textMuted} style={{ marginRight: 8 }} />
              <select style={localStyles.select} value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                <option value="">全ての担当者</option>
                {staffList.map((s) => (
                  <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
                ))}
              </select>
              <ChevronDown size={16} color={THEME.textMuted} style={{ position: "absolute", right: "12px", pointerEvents: "none" }} />
            </div>
          </div>
        </header>

        {/* カンバンボード */}
        <div style={localStyles.kanbanContainer}>
          {flowingStatuses.map((st, idx) => {
            const colCustomers = getColCustomers(st, idx);
            const isOver = overColumn === st.name;
            return (
              <div
                key={st.name}
                onDragOver={(e) => onDragOver(e, st.name)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, st.name)}
                style={{
                  ...localStyles.column,
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
                    {colCustomers.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "100px" }}>
                  {colCustomers.map((c) => {
                    const isDragging = draggingId === String(c.id);
                    const staff = staffList.find((s) => s.email === c["担当者メール"]);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        onDragEnd={onDragEnd}
                        style={{
                          ...localStyles.card,
                          borderColor: isDragging ? THEME.primary : "transparent",
                          opacity: isDragging ? 0.3 : 1,
                          transform: isDragging ? "scale(1.03) rotate(1.5deg)" : "scale(1)",
                          boxShadow: isDragging ? "0 16px 32px rgba(91,79,206,0.25)" : localStyles.card.boxShadow,
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

      {/* 終着スペシャルゾーン */}
      <div style={localStyles.bottomBar}>
        {[
          { label: wonLabel,     icon: <Trophy size={24} />, color: THEME.success, bg: "#ECFDF5" },
          { label: dormantLabel, icon: <Moon size={24} />,   color: "#F59E0B",      bg: "#FFFBEB" },
          { label: lostLabel,    icon: <Trash2 size={24} />, color: THEME.danger,  bg: "#FEF2F2" },
        ].map(({ label, icon, color, bg }) => (
          <div
            key={label}
            onDragOver={(e) => onDragOver(e, label)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, label)}
            style={{
              ...localStyles.specialZone,
              backgroundColor: draggingId ? bg : "#F9FAFB",
              color,
              borderColor: overColumn === label ? color : draggingId ? `${color}60` : THEME.border,
              transform: overColumn === label ? "scale(1.05)" : "scale(1)",
              boxShadow: overColumn === label ? `0 0 0 3px ${color}30` : "none",
            }}
          >
            {icon} {label}
          </div>
        ))}
      </div>
    </div>
  );
}