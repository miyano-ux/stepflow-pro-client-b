import React, { useMemo, useState, useEffect } from "react";
import {
  MessageSquare, TrendingUp, TrendingDown, Minus,
  Clock, AlertTriangle, Download, ChevronDown, ChevronUp, Info, Loader2,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { useWindowWidth } from "../lib/useWindowWidth";
import { formatDate, downloadCSV, smsUnits, apiCall } from "../lib/utils";

// ==========================================
// 📊 SMS配信レポート
//   配信管理シート（deliveryLogs）を月別に集計して表示する。
//   請求根拠となるのは「配信済み」レコードのみ。
//   料金は本文の文字量で変動するため、件数ではなく
//   「送信通数」換算（lib/utils.js の smsUnits）で集計する。
// ==========================================

const STATUS_SENT     = "配信済み";
const STATUS_PENDING  = "配信待ち";
const STATUS_ERROR    = "エラー";
const STATUS_CANCELED = "中止";

const RANGE_OPTIONS = [
  { label: "6ヶ月",  value: 6 },
  { label: "12ヶ月", value: 12 },
  { label: "24ヶ月", value: 24 },
];

// 通数レンジ表（参考表示用）
const UNIT_RANGES = [
  ["1〜70文字",    "1〜160文字",       1],
  ["71〜134文字",  "161〜306文字",     2],
  ["135〜201文字", "307〜459文字",     3],
  ["202〜268文字", "460〜612文字",     4],
  ["269〜335文字", "613〜765文字",     5],
  ["336〜402文字", "766〜918文字",     6],
  ["403〜469文字", "919〜1,071文字",   7],
  ["470〜536文字", "1,072〜1,224文字", 8],
  ["537〜603文字", "1,225〜1,377文字", 9],
  ["604〜670文字", "1,378〜1,530文字", 10],
];

// ── 日時 → "YYYY-MM"（日本時間で判定）────────────────
const toMonthKey = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  // sv-SE ロケールは "YYYY-MM-DD" 形式を返す
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 7);
};

const monthLabel = (key) => {
  if (!key) return "-";
  const [y, m] = key.split("-");
  return `${y}年${Number(m)}月`;
};

// 直近 n ヶ月のキー配列（古い順）
const buildMonthKeys = (n) => {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

// 配信種別（個別SMS か シナリオ自動配信か）
const isManualSms = (log) => {
  const step = String(log?.["ステップ名"] || "").trim();
  return step === "" || step === "個別SMS";
};

export default function SmsUsageReport({ isLoading = false, deliveryLogs = [], customers = [] }) {
  // 【サーバサイド集計】全件取得はやめ、GAS で集計済みのサマリーを取得する
  const [summary, setSummary]               = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [monthDetail, setMonthDetail]       = useState({ key: null, logs: [], loading: false });


  const { isMobile } = useWindowWidth();
  const [range, setRange]           = useState(12);
  const [openMonth, setOpenMonth]   = useState(null); // ドリルダウン対象の月キー
  const [showRanges, setShowRanges] = useState(false);

  // range 変更のたびにサーバ集計サマリーを取得
  useEffect(() => {
    let alive = true;
    setSummaryLoading(true);
    (async () => {
      try {
        const res = await apiCall.post(GAS_URL, { action: "getSmsUsageSummary", range });
        if (alive && res) setSummary(res);
      } catch (e) { console.warn("[SmsUsageReport] getSmsUsageSummary 取得失敗", e); }
      finally { if (alive) setSummaryLoading(false); }
    })();
    return () => { alive = false; };
  }, [range]);

  // ドリルダウン：月を開いたらその月の配信明細だけを取得
  useEffect(() => {
    if (!openMonth) { setMonthDetail({ key: null, logs: [], loading: false }); return; }
    let alive = true;
    setMonthDetail({ key: openMonth, logs: [], loading: true });
    (async () => {
      try {
        const res = await apiCall.post(GAS_URL, { action: "getSmsUsageMonthDetail", monthKey: openMonth });
        if (alive) setMonthDetail({ key: openMonth, logs: res?.logs || [], loading: false });
      } catch (e) {
        console.warn("[SmsUsageReport] getSmsUsageMonthDetail 取得失敗", e);
        if (alive) setMonthDetail({ key: openMonth, logs: [], loading: false });
      }
    })();
    return () => { alive = false; };
  }, [openMonth]);

  const customerNameById = useMemo(() => {
    const map = {};
    (customers || []).forEach((c) => {
      const id = c?.["顧客ID"];
      if (!id) return;
      map[String(id)] = `${c["姓"] || ""} ${c["名"] || ""}`.trim();
    });
    return map;
  }, [customers]);

  // ── 月別集計 ───────────────────────────────────
  const months  = summary?.months  || buildMonthKeys(range);
  const byMonth = summary?.byMonth || months.map((k) => ({ key: k, count: 0, units: 0, manualUnits: 0, autoUnits: 0, multi: 0, error: 0 }));
  const totals  = summary?.totals  || { count: 0, units: 0, manualUnits: 0, autoUnits: 0, multi: 0, error: 0 };
  const pending = summary?.pending || { count: 0, units: 0 };

  const thisMonth = byMonth[byMonth.length - 1] || { units: 0, count: 0, error: 0 };
  const lastMonth = byMonth[byMonth.length - 2] || { units: 0, count: 0 };
  const diff      = thisMonth.units - lastMonth.units;
  const diffRate  = lastMonth.units > 0 ? Math.round((diff / lastMonth.units) * 100) : null;
  const maxUnits  = Math.max(1, ...byMonth.map((m) => m.units));

  // ── CSV出力 ───────────────────────────────────
  const handleExport = () => {
    const header = ["月", "配信件数", "送信通数（課金対象）", "うち個別SMS（通）", "うちシナリオ自動（通）", "2通以上の件数", "配信エラー（件）"];
    const rows = byMonth.map((m) => [
      monthLabel(m.key),
      String(m.count),
      String(m.units),
      String(m.manualUnits),
      String(m.autoUnits),
      String(m.multi),
      String(m.error),
    ]);
    rows.push(["合計", String(totals.count), String(totals.units), String(totals.manualUnits), String(totals.autoUnits), String(totals.multi), String(totals.error)]);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
    downloadCSV([header, ...rows], `SMS送信通数_${today}.csv`);
  };

  // ── パーツ ────────────────────────────────────
  const Card = ({ children, style }) => (
    <div style={{
      backgroundColor: "white",
      borderRadius: isMobile ? 14 : 18,
      border: `1px solid ${THEME.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );

  const Kpi = ({ icon, label, value, unit, color, sub }) => (
    <Card style={{ padding: isMobile ? "16px 18px" : "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ display: "flex", color }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color, lineHeight: 1 }}>
          {(isLoading || summaryLoading)
            ? <Loader2 size={isMobile ? 24 : 30} color={color} style={{ animation: "spin 1s linear infinite" }} />
            : value.toLocaleString()}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMuted }}>{unit}</span>
      </div>
      {sub && <div style={{ marginTop: 8, fontSize: 12, color: THEME.textMuted }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: THEME.bg,
      padding: isMobile ? "20px 16px 40px" : "48px 64px",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12,
          alignItems: "flex-end", justifyContent: "space-between",
          marginBottom: isMobile ? 20 : 32,
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>
              SMS配信
            </h1>
            <p style={{ color: THEME.textMuted, fontSize: isMobile ? 12 : 14, margin: 0 }}>
              月ごとの SMS 送信通数です。本文の文字量に応じた通数換算で集計しています。
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* 期間切り替え */}
            <div style={{
              display: "flex", backgroundColor: "white",
              border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: "hidden",
            }}>
              {RANGE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setRange(o.value); setOpenMonth(null); }}
                  style={{
                    padding: isMobile ? "8px 12px" : "9px 16px",
                    border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 800,
                    backgroundColor: range === o.value ? THEME.primary : "transparent",
                    color: range === o.value ? "white" : THEME.textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExport}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: isMobile ? "8px 12px" : "9px 16px",
                backgroundColor: "white", color: THEME.textMain,
                border: `1px solid ${THEME.border}`, borderRadius: 10,
                fontSize: 12, fontWeight: 800, cursor: "pointer",
              }}
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* ── KPI ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 16,
          marginBottom: isMobile ? 16 : 24,
        }}>
          <Kpi
            icon={<MessageSquare size={16} />}
            label="今月の送信通数"
            value={thisMonth.units}
            unit="通"
            color={THEME.primary}
            sub={
              diffRate === null
                ? `${monthLabel(months[months.length - 1])}／配信 ${thisMonth.count} 件`
                : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: diff > 0 ? THEME.danger : diff < 0 ? THEME.success : THEME.textMuted }}>
                    {diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                    前月比 {diff > 0 ? "+" : ""}{diffRate}%（配信 {thisMonth.count} 件）
                  </span>
                )
            }
          />
          <Kpi
            icon={<MessageSquare size={16} />}
            label="前月の送信通数"
            value={lastMonth.units}
            unit="通"
            color={THEME.textMain}
            sub={`${monthLabel(months[months.length - 2])}／配信 ${lastMonth.count} 件`}
          />
          <Kpi
            icon={<Clock size={16} />}
            label="配信待ち（予約中）"
            value={pending.units}
            unit="通"
            color={THEME.accent}
            sub={`今後配信予定 ${pending.count} 件`}
          />
          <Kpi
            icon={<AlertTriangle size={16} />}
            label={`エラー（直近${range}ヶ月）`}
            value={totals.error}
            unit="件"
            color={THEME.danger}
            sub="配信失敗のため課金対象外"
          />
        </div>

        {/* 集計ローディング表示 */}
        {summaryLoading && (
          <Card style={{ padding: "28px 24px", marginBottom: isMobile ? 16 : 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: THEME.textMuted }}>
            <Loader2 size={22} color={THEME.primary} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 800 }}>集計しています…</span>
            <span style={{ fontSize: 12 }}>初回は配信ログの集計に時間がかかることがあります</span>
          </Card>
        )}

        {/* ── 月別グラフ ── */}
        <Card style={{ padding: isMobile ? "18px 16px" : "28px 32px", marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color: THEME.textMain }}>
              月別 送信通数
            </div>
            <div style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 700 }}>
              直近{range}ヶ月 合計 {totals.units.toLocaleString()} 通（{totals.count.toLocaleString()} 件）
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "flex-end", gap: isMobile ? 4 : 8,
            height: isMobile ? 140 : 200, overflowX: "auto", paddingBottom: 4,
          }}>
            {byMonth.map((m) => {
              const h = Math.round((m.units / maxUnits) * 100);
              const isCurrent = m.key === months[months.length - 1];
              return (
                <div
                  key={m.key}
                  onClick={() => setOpenMonth(openMonth === m.key ? null : m.key)}
                  title={`${monthLabel(m.key)}：${m.units}通 / 配信${m.count}件`}
                  style={{
                    flex: 1, minWidth: isMobile ? 26 : 34,
                    height: "100%", display: "flex", flexDirection: "column",
                    justifyContent: "flex-end", alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 800, color: THEME.textMain, marginBottom: 4 }}>
                    {m.units > 0 ? m.units : ""}
                  </div>
                  <div style={{
                    width: "100%",
                    height: `${Math.max(h, m.units > 0 ? 3 : 1)}%`,
                    minHeight: 2,
                    borderRadius: "6px 6px 2px 2px",
                    background: isCurrent
                      ? `linear-gradient(180deg, ${THEME.accent}, #D96A48)`
                      : `linear-gradient(180deg, ${THEME.primary}, #4A3FB5)`,
                    opacity: openMonth && openMonth !== m.key ? 0.35 : 1,
                    transition: "opacity 0.15s",
                  }} />
                </div>
              );
            })}
          </div>

          {/* X軸ラベル */}
          <div style={{ display: "flex", gap: isMobile ? 4 : 8, marginTop: 8 }}>
            {byMonth.map((m) => (
              <div key={m.key} style={{
                flex: 1, minWidth: isMobile ? 26 : 34, textAlign: "center",
                fontSize: isMobile ? 9 : 11, fontWeight: 700,
                color: m.key === months[months.length - 1] ? THEME.accent : THEME.textMuted,
                whiteSpace: "nowrap",
              }}>
                {Number(m.key.split("-")[1])}月
              </div>
            ))}
          </div>
        </Card>

        {/* ── 月別明細テーブル ── */}
        <Card style={{ padding: isMobile ? "18px 16px" : "28px 32px", marginBottom: 16 }}>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 900, color: THEME.textMain, marginBottom: 16 }}>
            月別内訳
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                  {["月", "配信件数", "送信通数（課金対象）", "個別SMS", "シナリオ自動", "2通以上", "エラー", ""].map((h, i) => (
                    <th key={h + i} style={{
                      padding: "10px 12px", fontSize: 11, fontWeight: 800,
                      color: THEME.textMuted, textAlign: i === 0 ? "left" : i === 7 ? "center" : "right",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...byMonth].reverse().map((m) => (
                  <React.Fragment key={m.key}>
                    <tr
                      onClick={() => setOpenMonth(openMonth === m.key ? null : m.key)}
                      style={{
                        borderBottom: `1px solid ${THEME.border}`,
                        cursor: "pointer",
                        backgroundColor: openMonth === m.key ? "#F8FAFC" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px", fontSize: 13, fontWeight: 800, color: THEME.textMain, whiteSpace: "nowrap" }}>
                        {monthLabel(m.key)}
                      </td>
                      <td style={{ padding: "12px", fontSize: 13, color: THEME.textMuted, textAlign: "right" }}>
                        {m.count.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px", fontSize: 15, fontWeight: 900, color: m.units > 0 ? THEME.primary : THEME.textMuted, textAlign: "right" }}>
                        {m.units.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px", fontSize: 13, color: THEME.textMuted, textAlign: "right" }}>{m.manualUnits}</td>
                      <td style={{ padding: "12px", fontSize: 13, color: THEME.textMuted, textAlign: "right" }}>{m.autoUnits}</td>
                      <td style={{ padding: "12px", fontSize: 13, fontWeight: m.multi > 0 ? 800 : 500, color: m.multi > 0 ? THEME.accent : THEME.textMuted, textAlign: "right" }}>
                        {m.multi}
                      </td>
                      <td style={{ padding: "12px", fontSize: 13, color: m.error > 0 ? THEME.danger : THEME.textMuted, textAlign: "right" }}>{m.error}</td>
                      <td style={{ padding: "12px", textAlign: "center", color: THEME.textMuted }}>
                        {m.count > 0 && (openMonth === m.key ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
                      </td>
                    </tr>

                    {/* ドリルダウン：その月の配信明細 */}
                    {openMonth === m.key && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}` }}>
                          <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 12px 14px" }} className="custom-scrollbar">
                            {monthDetail.loading ? (
                              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: THEME.textMuted }}>
                                読み込み中…
                              </div>
                            ) : monthDetail.logs.length === 0 ? (
                              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: THEME.textMuted }}>
                                配信実績がありません
                              </div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr>
                                    {["配信日時", "顧客名", "種別", "文字数", "通数", "内容"].map((h) => (
                                      <th key={h} style={{
                                        padding: "6px 8px", fontSize: 10, fontWeight: 800, color: THEME.textMuted,
                                        textAlign: (h === "文字数" || h === "通数") ? "right" : "left", whiteSpace: "nowrap",
                                      }}>
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {monthDetail.logs
                                    .slice()
                                    .sort((a, b) => new Date(b["完了日時"] || b["配信予定日時"]) - new Date(a["完了日時"] || a["配信予定日時"]))
                                    .map((log, i) => (
                                      <tr key={log["ログID"] || i} style={{ borderTop: `1px solid ${THEME.border}` }}>
                                        <td style={{ padding: "8px", fontSize: 11, color: THEME.textMuted, whiteSpace: "nowrap" }}>
                                          {formatDate(log["完了日時"] || log["配信予定日時"])}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 12, fontWeight: 700, color: THEME.textMain, whiteSpace: "nowrap" }}>
                                          {log["顧客名"] || customerNameById[String(log["顧客ID"])] || "-"}
                                        </td>
                                        <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                                          <span style={{
                                            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                                            backgroundColor: isManualSms(log) ? "#FEF3C7" : "#EEF2FF",
                                            color: isManualSms(log) ? "#92400E" : "#4338CA",
                                          }}>
                                            {isManualSms(log) ? "個別SMS" : (log["ステップ名"] || "シナリオ")}
                                          </span>
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 11, color: THEME.textMuted, textAlign: "right" }}>
                                          {String(log["内容"] || "").length}
                                        </td>
                                        <td style={{
                                          padding: "8px", fontSize: 12, textAlign: "right",
                                          fontWeight: log._units > 1 ? 900 : 700,
                                          color: log._units > 1 ? THEME.accent : THEME.textMain,
                                        }}>
                                          {log._units}
                                        </td>
                                        <td style={{ padding: "8px", fontSize: 11, color: THEME.textMuted, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {String(log["内容"] || "").replace(/\n/g, " ")}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${THEME.border}`, backgroundColor: "#F8FAFC" }}>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 900, color: THEME.textMain }}>合計</td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "right" }}>
                    {totals.count.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", fontSize: 15, fontWeight: 900, color: THEME.primary, textAlign: "right" }}>
                    {totals.units.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "right" }}>{totals.manualUnits}</td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "right" }}>{totals.autoUnits}</td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "right" }}>{totals.multi}</td>
                  <td style={{ padding: "12px", fontSize: 12, fontWeight: 800, color: THEME.textMuted, textAlign: "right" }}>{totals.error}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* ── 通数レンジ表（参考） ── */}
        <Card style={{ marginBottom: 16, overflow: "hidden" }}>
          <button
            onClick={() => setShowRanges((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: isMobile ? "14px 16px" : "18px 32px",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900, color: THEME.textMain }}>
              送信通数の換算ルール
            </span>
            {showRanges ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />}
          </button>

          {showRanges && (
            <div style={{ padding: isMobile ? "0 16px 18px" : "0 32px 24px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                      {["全角", "半角英数字", "送信通数"].map((h, i) => (
                        <th key={h} style={{
                          padding: "8px 12px", fontSize: 11, fontWeight: 800, color: THEME.textMuted,
                          textAlign: i === 2 ? "right" : "left", whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {UNIT_RANGES.map(([z, h, u]) => (
                      <tr key={u} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: THEME.textMain, whiteSpace: "nowrap" }}>{z}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: THEME.textMuted, whiteSpace: "nowrap" }}>{h}</td>
                        <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 800, color: THEME.primary, textAlign: "right", whiteSpace: "nowrap" }}>
                          {u} 通
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: THEME.textMuted, lineHeight: 1.8 }}>
                本文に全角文字が1文字でも含まれる場合は「全角」のレンジで換算します。半角英数字のみの本文は「半角英数字」のレンジで換算します。改行も1文字としてカウントされます。
              </div>
            </div>
          )}
        </Card>

        {/* ── 注記 ── */}
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          padding: "14px 16px", backgroundColor: "#EEF2FF",
          border: "1px solid #C7D2FE", borderRadius: 12,
          fontSize: 12, color: "#3730A3", lineHeight: 1.7,
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            ご請求の対象は「配信済み」の送信通数です。配信エラー・中止・配信待ちは含まれません。<br />
            長文は文字量に応じて複数通に換算されます（配信日時は日本時間で集計）。
          </div>
        </div>

      </div>
    </div>
  );
}