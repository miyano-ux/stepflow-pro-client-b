import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Zap, Moon, ArrowRight, ChevronLeft, X } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";

const THEME = { ...APP_THEME, colors: ["#4F46E5","#6366F1","#818CF8","#A5B4FC","#C7D2FE","#E0E7FF"] };

const S = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1400px", margin: "0 auto" },
  card:    { backgroundColor: "white", borderRadius: 20, border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", marginBottom: 32 },
  feedScroll: { height: 300, overflowY: "auto", padding: "4px" },
  feedItem:   { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, backgroundColor: "#F8FAFC", marginBottom: 8 },
};

// ── ドリルダウンモーダル ──────────────────────────────
function DrillModal({ statusName, customers, staffList, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, width: "min(92vw, 680px)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", borderBottom: `1px solid ${THEME.border}` }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>{statusName}</div>
            <div style={{ fontSize: 13, color: THEME.textMuted, marginTop: 2 }}>{customers.length} 件</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: THEME.textMuted }}>
            <X size={20} />
          </button>
        </div>
        {/* テーブル */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#F8FAFC", position: "sticky", top: 0 }}>
                {["氏名", "電話番号", "担当者", "登録日"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "left", borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const staff = staffList.find(s => s.email === c["担当者メール"]);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${THEME.border}` }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#FAFBFF"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                      <Link to={`/detail/${c.id}`} style={{ color: THEME.primary, textDecoration: "none", fontWeight: 800 }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                      >
                        {c["姓"]} {c["名"]} 様
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: THEME.textMuted }}>{c["電話番号"] || "–"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: THEME.textMuted }}>{staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: THEME.textMuted }}>{c["登録日"] ? String(c["登録日"]).slice(0, 10) : "–"}</td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>該当なし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── メイン ───────────────────────────────────────────
export default function AnalysisReport({ customers = [], statuses = [], trackingLogs = [], staffList = [] }) {
  const [filterStaff, setFilterStaff] = useState("");
  const [drillStatus, setDrillStatus] = useState(null); // ドリルダウン対象ステータス名
  const navigate = useNavigate();

  const dormantStatus = statuses.find(s => s.terminalType === "dormant") || statuses[statuses.length - 2];
  const lostStatus    = statuses.find(s => s.terminalType === "lost")    || statuses[statuses.length - 1];
  const dormantLabel  = dormantStatus?.name || "休眠";
  const lostLabel     = lostStatus?.name    || "失注";

  const filtered = useMemo(() =>
    customers.filter(c => !filterStaff || c["担当者メール"] === filterStaff),
    [customers, filterStaff]
  );

  // 成功パス（休眠・失注以外すべて）
  const successPathData = useMemo(() => {
    const targets = statuses.filter(s => s.name !== dormantLabel && s.name !== lostLabel);
    const firstName = targets[0]?.name || "";
    return targets.map((st, i) => {
      const list = filtered.filter(c => {
        const cur = (c["対応ステータス"] || "").trim() || firstName;
        return cur === st.name;
      });
      return { name: st.name, count: list.length, customers: list, color: THEME.colors[i % THEME.colors.length] };
    });
  }, [filtered, statuses, dormantLabel, lostLabel]);

  const maxCount = Math.max(...successPathData.map(d => d.count), 1);

  // 終点サマリ（休眠・失注のみ）
  const summaryCards = [
    { label: dormantLabel, emoji: "🌙", color: "#D97706", bg: "#FEF3C7", border: "#FDE68A", type: "dormant" },
    { label: lostLabel,    emoji: "🗑",  color: "#DC2626", bg: "#FEE2E2", border: "#FECACA", type: "lost"    },
  ];

  const countByStatus = label => filtered.filter(c => (c["対応ステータス"] || "").trim() === label.trim()).length;

  const getActivityFeed = isDormant =>
    trackingLogs.filter(log => {
      const c = customers.find(c => c.id === log.customerId);
      if (!c) return false;
      const st = c["対応ステータス"];
      return isDormant ? st === dormantLabel : (st !== dormantLabel && st !== lostLabel);
    }).slice(0, 20);

  // ドリルダウンモーダル用顧客リスト
  const drillCustomers = drillStatus
    ? successPathData.find(d => d.name === drillStatus)?.customers || []
    : [];

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

          {/* 成功パス棒グラフ */}
          <div style={S.card}>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={18} color={THEME.primary} /> 成功パスの案件分布
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— バーをクリックで顧客リスト表示</span>
            </h3>
            <div style={{ height: 280, display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 16, borderBottom: `2px solid ${THEME.border}` }}>
              {successPathData.map(d => (
                <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", cursor: d.count > 0 ? "pointer" : "default" }}
                  onClick={() => d.count > 0 && setDrillStatus(d.name)}
                >
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: 10 }}>
                    <div style={{
                      width: "60%", borderRadius: "8px 8px 2px 2px",
                      backgroundColor: d.color, position: "relative",
                      height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 4 : 0)}%`,
                      transition: "height 0.8s ease, filter 0.15s",
                      minHeight: d.count > 0 ? 8 : 0,
                    }}
                      onMouseEnter={e => { if (d.count > 0) e.currentTarget.style.filter = "brightness(0.88)"; }}
                      onMouseLeave={e => e.currentTarget.style.filter = "none"}
                    >
                      {d.count > 0 && <span style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", fontWeight: 900, color: d.color, fontSize: 14 }}>{d.count}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, textAlign: "center", color: THEME.textMain, lineHeight: 1.3 }}>{d.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 休眠・失注サマリ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            {summaryCards.map(({ label, emoji, color, bg, border, type }) => (
              <Link key={type} to={`/status-list/${type}`} style={{ textDecoration: "none" }}>
                <div style={{ backgroundColor: "white", borderRadius: 20, border: `1px solid ${border}`, padding: "24px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color }}>{countByStatus(label)} <span style={{ fontSize: 14, fontWeight: 700 }}>名</span></div>
                    </div>
                    <div style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, color, display: "flex", alignItems: "center", gap: 4 }}>
                      一覧 <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* フィード */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {[{ isDormant: false, title: "⚡ 進行中のアクティビティ", color: THEME.primary, bg: "#EEF2FF" },
              { isDormant: true,  title: "🌙 休眠顧客の再浮上",       color: "#D97706",     bg: "#FFFBEB" }
            ].map(({ isDormant, title, color, bg }) => (
              <div key={title} style={S.card}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 18, color }}>{title}</h3>
                <div style={S.feedScroll}>
                  {getActivityFeed(isDormant).length === 0
                    ? <div style={{ textAlign: "center", color: THEME.textMuted, padding: 36 }}>データがありません</div>
                    : getActivityFeed(isDormant).map((log, i) => {
                        const c = customers.find(c => c.id === log.customerId);
                        return (
                          <div key={i} style={S.feedItem}>
                            <div style={{ padding: 8, backgroundColor: bg, borderRadius: 8, color, flexShrink: 0 }}>
                              {isDormant ? <Moon size={14} /> : <Zap size={14} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: 13 }}>{c?.姓} 様</div>
                              <div style={{ fontSize: 11, color: THEME.textMuted }}>{log.pageTitle || "ページ閲覧"} · {log.time}</div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ドリルダウンモーダル */}
      {drillStatus && (
        <DrillModal
          statusName={drillStatus}
          customers={drillCustomers}
          staffList={staffList}
          onClose={() => setDrillStatus(null)}
        />
      )}
    </>
  );
}