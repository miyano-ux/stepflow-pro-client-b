import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Timer, X, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";

const THEME = { ...APP_THEME, colors: ["#4F46E5","#6366F1","#818CF8","#A5B4FC","#C7D2FE","#E0E7FF"] };

const S = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1400px", margin: "0 auto" },
  card:    { backgroundColor: "white", borderRadius: 20, border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", marginBottom: 32 },
};

function stayStatus(daysInStatus, avgDays) {
  if (avgDays == null || daysInStatus == null) return "normal";
  if (daysInStatus <= avgDays)       return "normal";
  if (daysInStatus <= avgDays + 7)   return "warning";
  return "danger";
}

const STAY_COLORS = {
  normal:  { bg: "#EEF2FF", border: "#818CF8", text: "#4F46E5", label: "順調" },
  warning: { bg: "#FFFBEB", border: "#F59E0B", text: "#B45309", label: "停滞" },
  danger:  { bg: "#FEF2F2", border: "#EF4444", text: "#DC2626", label: "要対応" },
};

// 終点ステータスの見た目定義
function terminalStyle(terminalType) {
  switch (terminalType) {
    case "won":
      return { emoji: "🏆", color: "#059669", bg: "#D1FAE5", border: "#6EE7B7" };
    case "dormant":
      return { emoji: "⏸",  color: "#D97706", bg: "#FEF3C7", border: "#FDE68A" };
    case "lost":
      return { emoji: "🗑",  color: "#DC2626", bg: "#FEE2E2", border: "#FECACA" };
    default:
      return { emoji: "📋", color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1" };
  }
}

// ── ドリルダウンモーダル ──────────────────────────────
function DrillModal({ statusName, customers, staffList, avgDays, onClose }) {
  const now = new Date();

  const rows = customers.map(c => {
    const changed = c["ステータス変更日"]
      ? new Date(String(c["ステータス変更日"]).replace(/\//g, "-").replace(" ", "T"))
      : null;
    const days = changed && !isNaN(changed) ? Math.floor((now - changed) / 86400000) : null;
    const status = stayStatus(days, avgDays);
    const col = STAY_COLORS[status];
    const staff = staffList.find(s => s.email === c["担当者メール"]);
    return { c, days, status, col, staff };
  }).sort((a, b) => (b.days ?? 0) - (a.days ?? 0));

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, width: "min(96vw, 760px)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", borderBottom: `1px solid ${THEME.border}` }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>{statusName}</div>
            <div style={{ fontSize: 13, color: THEME.textMuted, marginTop: 2 }}>
              {customers.length} 件
              {avgDays != null && (
                <span style={{ marginLeft: 12 }}>
                  平均滞在: <strong>{avgDays.toFixed(1)} 日</strong>
                  　🔵 〜平均　🟡 平均+7日　🔴 平均+7日超
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: THEME.textMuted }}><X size={20} /></button>
        </div>

        {/* 凡例 */}
        <div style={{ display: "flex", gap: 20, padding: "10px 28px", borderBottom: `1px solid ${THEME.border}`, backgroundColor: "#FAFAFA" }}>
          {Object.entries(STAY_COLORS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: v.border }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: v.text }}>{v.label}</span>
              <span style={{ fontSize: 11, color: THEME.textMuted }}>
                {k === "normal"  ? `〜${avgDays?.toFixed(0) ?? "-"}日` :
                 k === "warning" ? "+1〜7日" : "+7日超"}
              </span>
            </div>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", position: "sticky", top: 0 }}>
                {["", "氏名", "担当者", "ステータス変更日", "滞在日数", "状況"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "left", borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, days, col, staff }) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${THEME.border}` }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = col.bg}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <td style={{ width: 4, padding: 0, backgroundColor: col.border }} />
                  <td style={{ padding: "12px 14px", fontWeight: 700 }}>
                    <Link to={`/detail/${c.id}`} style={{ color: THEME.primary, textDecoration: "none", fontWeight: 800 }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                    >
                      {c["姓"]} {c["名"]} 様
                    </Link>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: THEME.textMuted }}>
                    {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: THEME.textMuted }}>
                    {c["ステータス変更日"] ? String(c["ステータス変更日"]).slice(0, 10) : "–"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 15, fontWeight: 900, color: col.text }}>
                    {days != null ? `${days} 日` : "–"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col.text, backgroundColor: col.bg, border: `1px solid ${col.border}`, padding: "3px 10px", borderRadius: 99 }}>
                      {col.label}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>該当なし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── メイン ───────────────────────────────────────────
export default function AnalysisReport({ customers = [], statuses = [], trackingLogs = [], staffList = [], statusHistory = [] }) {
  const [filterStaff, setFilterStaff] = useState("");
  const [drillStatus, setDrillStatus] = useState(null);
  const navigate = useNavigate();

  const filtered = useMemo(() =>
    customers.filter(c => !filterStaff || c["担当者メール"] === filterStaff),
    [customers, filterStaff]
  );

  // ── 棒グラフ・フェーズ別滞在日数の対象：
  //    ・通常フロー列（terminalType なし）→ 常に含める
  //    ・終点ステータスは placement === "right" かつ excluded 以外のみ含める
  //    ・excluded は右下コーナー固定なので常に除く
  //    ・失注など placement === "bottom" の終点ステータスも除く
  const chartStatuses = useMemo(() =>
    statuses.filter(s =>
      !s.terminalType ||
      (s.terminalType !== "excluded" && (s.placement || "bottom") === "right")
    ),
    [statuses]
  );

  // ── 下部サマリカード用：右側配置の終点ステータスのみ（excluded 除く）
  const terminalStatuses = useMemo(() =>
    statuses.filter(s =>
      s.terminalType &&
      s.terminalType !== "excluded" &&
      (s.placement || "bottom") === "right"
    ),
    [statuses]
  );

  const chartData = useMemo(() =>
    chartStatuses.map((st, i) => {
      const list = filtered.filter(c => (c["対応ステータス"] || "").trim() === st.name);
      return {
        name: st.name,
        count: list.length,
        customers: list,
        color: THEME.colors[i % THEME.colors.length],
        terminalType: st.terminalType,
      };
    }),
    [filtered, chartStatuses]
  );

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  // ── フェーズ別平均滞在日数 ──
  const avgDaysMap = useMemo(() => {
    const byCustomer = {};
    (statusHistory || []).forEach(h => {
      const cid = h["顧客ID"];
      if (!byCustomer[cid]) byCustomer[cid] = [];
      byCustomer[cid].push({
        status: h["ステータス"],
        ts: new Date(String(h["変更日時"]).replace(/\//g, "-").replace(" ", "T")),
      });
    });

    const daysPerStatus = {};
    Object.values(byCustomer).forEach(events => {
      events.sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < events.length - 1; i++) {
        const st   = events[i].status;
        const days = (events[i + 1].ts - events[i].ts) / 86400000;
        if (days >= 0 && days < 365) {
          if (!daysPerStatus[st]) daysPerStatus[st] = [];
          daysPerStatus[st].push(days);
        }
      }
    });

    const result = {};
    Object.entries(daysPerStatus).forEach(([st, arr]) => {
      result[st] = arr.reduce((a, b) => a + b, 0) / arr.length;
    });
    return result;
  }, [statusHistory]);

  const phaseTransitions = useMemo(() =>
    chartStatuses.map(st => ({
      name: st.name,
      avgDays: avgDaysMap[st.name] ?? null,
      terminalType: st.terminalType,
    })),
    [chartStatuses, avgDaysMap]
  );

  const drillData    = drillStatus ? chartData.find(d => d.name === drillStatus) : null;
  const drillAvgDays = drillStatus ? (avgDaysMap[drillStatus] ?? null) : null;
  const countByStatus = label => filtered.filter(c => (c["対応ステータス"] || "").trim() === label.trim()).length;
  const maxAvgDays    = Math.max(...phaseTransitions.map(p => p.avgDays ?? 0), 1);

  // 下部グリッド列数
  const terminalGridCols = terminalStatuses.length <= 4
    ? `repeat(${terminalStatuses.length}, 1fr)`
    : "repeat(auto-fill, minmax(240px, 1fr))";

  return (
    <>
      <div style={S.main}>
        <div style={S.wrapper}>

          {/* ヘッダー */}
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <button onClick={() => navigate("/analysis")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 12, padding: 0 }}>
                <ChevronLeft size={16} /> レポート一覧に戻る
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <Activity size={28} color={THEME.primary} />
                <h1 style={{ fontSize: 28, fontWeight: 900, color: THEME.textMain, margin: 0 }}>営業進捗レポート</h1>
              </div>
              <p style={{ color: THEME.textMuted, fontSize: 14, margin: 0 }}>棒グラフをクリックすると顧客一覧が表示されます</p>
            </div>
            <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
          </header>

          {/* 棒グラフ */}
          <div style={S.card}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={18} color={THEME.primary} /> 案件分布
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— バーをクリックで顧客リスト（停滞色分け）表示</span>
            </h3>
            <div style={{ height: 280, display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 16, borderBottom: `2px solid ${THEME.border}` }}>
              {chartData.map(d => {
                const isTerminal = !!d.terminalType;
                const ts = isTerminal ? terminalStyle(d.terminalType) : null;
                const barColor = isTerminal ? ts.color : d.color;
                return (
                  <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", cursor: d.count > 0 ? "pointer" : "default" }}
                    onClick={() => d.count > 0 && setDrillStatus(d.name)}
                  >
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 10 }}>
                      <div style={{
                        width: "60%", borderRadius: "8px 8px 2px 2px",
                        backgroundColor: barColor, position: "relative",
                        height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0)}%`,
                        transition: "height 0.8s ease, filter 0.15s",
                        minHeight: d.count > 0 ? 8 : 0,
                        opacity: isTerminal ? 0.85 : 1,
                      }}
                        onMouseEnter={e => { if (d.count > 0) e.currentTarget.style.filter = "brightness(0.88)"; }}
                        onMouseLeave={e => e.currentTarget.style.filter = "none"}
                      >
                        {d.count > 0 && (
                          <span style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", fontWeight: 900, color: barColor, fontSize: 14 }}>
                            {d.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {isTerminal && <div style={{ fontSize: 13, lineHeight: 1, marginBottom: 2 }}>{ts.emoji}</div>}
                      <div style={{ fontSize: 11, fontWeight: 800, color: isTerminal ? ts.color : THEME.textMain, lineHeight: 1.3 }}>
                        {d.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* フェーズ別平均滞在日数 */}
          <div style={S.card}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
              <Timer size={18} color={THEME.primary} /> フェーズ別平均滞在日数
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— 顧客が次のステータスへ進むまでの平均日数</span>
            </h3>

            <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", paddingBottom: 8, gap: 0 }}>
              {phaseTransitions.map((pt, i) => {
                const days = pt.avgDays;
                const barPct = days != null ? Math.min((days / maxAvgDays) * 100, 100) : 0;
                const isTerminal = !!pt.terminalType;
                const ts = isTerminal ? terminalStyle(pt.terminalType) : null;
                const cardBg     = isTerminal ? ts.bg      : "#F5F3FF";
                const cardBorder = isTerminal ? ts.border  : THEME.border;
                const numColor   = isTerminal ? ts.color   : THEME.primary;
                const barTrack   = isTerminal ? `${ts.border}66` : "#E0E7FF";
                return (
                  <React.Fragment key={pt.name}>
                    <div style={{ minWidth: 130, flexShrink: 0 }}>
                      <div style={{ backgroundColor: cardBg, borderRadius: 14, padding: "18px 12px", textAlign: "center", border: `1.5px solid ${cardBorder}`, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {isTerminal && <div style={{ fontSize: 16 }}>{ts.emoji}</div>}
                        <div style={{ fontSize: 10, fontWeight: 800, color: isTerminal ? ts.color : THEME.textMuted, lineHeight: 1.4 }}>{pt.name}</div>
                        {days != null ? (
                          <>
                            <div style={{ fontSize: 28, fontWeight: 900, color: numColor, lineHeight: 1 }}>
                              {days < 1 ? `${(days * 24).toFixed(1)}` : days.toFixed(1)}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textMuted }}>{days < 1 ? "時間" : "日"}</div>
                            <div style={{ width: "80%", height: 6, backgroundColor: barTrack, borderRadius: 99 }}>
                              <div style={{ height: "100%", width: `${barPct}%`, backgroundColor: numColor, borderRadius: 99 }} />
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 20, color: THEME.textMuted }}>–</div>
                        )}
                      </div>
                    </div>
                    {i < phaseTransitions.length - 1 && (
                      <div style={{ display: "flex", alignItems: "center", padding: "0 4px", flexShrink: 0 }}>
                        <div style={{ width: 20, height: 2, backgroundColor: "#C7D2FE" }} />
                        <div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "7px solid #C7D2FE" }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 停滞色分け凡例 */}
            <div style={{ marginTop: 20, padding: "14px 18px", backgroundColor: "#F8FAFC", borderRadius: 12, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted }}>顧客リストの色分け：</div>
              {Object.entries(STAY_COLORS).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: v.border }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: v.text }}>{v.label}</span>
                  <span style={{ fontSize: 11, color: THEME.textMuted }}>
                    {k === "normal"  ? "平均滞在以内" :
                     k === "warning" ? "平均 +1〜7日" : "平均 +7日超"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 終点ステータスサマリ（全 won / dormant / lost を動的表示） */}
          {terminalStatuses.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: terminalGridCols, gap: 20, marginBottom: 32 }}>
              {terminalStatuses.map(st => {
                const ts = terminalStyle(st.terminalType);
                return (
                  <Link key={`${st.terminalType}-${st.name}`} to={`/status-list/${st.terminalType}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ backgroundColor: "white", borderRadius: 20, border: `1px solid ${ts.border}`, padding: "24px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.18s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${ts.color}22`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>{ts.emoji}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 2 }}>{st.name}</div>
                          <div style={{ fontSize: 32, fontWeight: 900, color: ts.color }}>
                            {countByStatus(st.name)} <span style={{ fontSize: 14, fontWeight: 700 }}>名</span>
                          </div>
                        </div>
                        <div style={{ backgroundColor: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, color: ts.color }}>
                          一覧 →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {drillStatus && drillData && (
        <DrillModal
          statusName={drillStatus}
          customers={drillData.customers}
          staffList={staffList}
          avgDays={drillAvgDays}
          onClose={() => setDrillStatus(null)}
        />
      )}
    </>
  );
}