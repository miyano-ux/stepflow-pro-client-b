import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";

const THEME = APP_THEME;
const COLORS = ["#4F46E5","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777","#EA580C"];

// ── ユーティリティ ─────────────────────────────────────
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function daysElapsed(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function toYM(date) {
  const d = new Date(date);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月`;
}
function parseMan(val) {
  return Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;
}
function fmtMan(n) {
  if (!n) return "−";
  if (n >= 10000) return (n / 10000).toFixed(1) + "億";
  return n.toLocaleString() + "万";
}
function isSenin(contractType) {
  return (contractType || "").includes("専任");
}

// ── ROIステータス判定 ──────────────────────────────
function roiStatus(roi) {
  if (roi === null) return { label: "−", color: "#6B6A8E" };
  if (roi >= 12.5)  return { label: "S", color: "#3730A3" };
  if (roi >= 8.3)   return { label: "A", color: "#4F46E5" };
  if (roi >= 6.7)   return { label: "B", color: "#E07B5A" };
  return                   { label: "C", color: "#DC2626" };
}

// ── セクション見出し ──────────────────────────────────
function SectionTitle({ children, color }) {
  return (
    <div style={{
      fontSize: 16, fontWeight: 900, color: THEME.textMain, marginBottom: 18,
      paddingBottom: 12, borderBottom: `2px solid ${color || THEME.border}`,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {children}
    </div>
  );
}

// ── 水平バー（件数・割合用） ──────────────────────────
function HBar({ value, maxVal, color, suffix = "" }) {
  const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: THEME.textMain, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>{suffix}</span>
      </div>
      <div style={{ width: "100%", backgroundColor: "#EEF2FF", borderRadius: 6, overflow: "hidden", height: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── シンプルバー（金額比較用） ────────────────────────
function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div style={{ height: 8, background: "#EEF2FF", borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s" }} />
    </div>
  );
}

// ── 積み上げバー（専任/一般） ────────────────────────
function StackBar({ senin, total }) {
  const pct = total > 0 ? (senin / total) * 100 : 0;
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${pct}%`, background: "#4F46E5" }} />
      <div style={{ width: `${100 - pct}%`, background: "#D1D5DB" }} />
    </div>
  );
}

// ── ROI評価バッジ ────────────────────────────────────
function RoiBadge({ roi, noAd }) {
  if (noAd)       return <span style={badge("#EEF2FF", "#4338CA")}>紹介</span>;
  if (roi === null) return <span style={badge("#F1F5F9", THEME.textMuted)}>成約なし</span>;
  if (roi >= 7)   return <span style={badge("#DCFCE7", "#166534")}>優秀</span>;
  if (roi >= 4)   return <span style={badge("#FEF9C3", "#713F12")}>良好</span>;
  return <span style={badge("#FEE2E2", "#991B1B")}>要検討</span>;
}
function badge(bg, color) {
  return { fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: bg, color };
}

// ── 専任率バッジ ─────────────────────────────────────
function RateBadge({ rate }) {
  if (rate >= 75) return <span style={badge("#DCFCE7", "#166534")}>{rate}%</span>;
  if (rate >= 50) return <span style={badge("#FEF9C3", "#713F12")}>{rate}%</span>;
  return <span style={badge("#FEE2E2", "#991B1B")}>{rate}%</span>;
}

// ── KPIカード ─────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "white", borderRadius: 12, border: `1px solid ${THEME.border}`,
      padding: "16px 18px", flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || THEME.textMain, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────
export default function SourceReport({
  customers = [],
  statuses = [],
  sources = [],
  contractTypes = [],
  statusHistory = [],
  properties = [],
}) {
  const navigate = useNavigate();
  const [periodCP, setPeriodCP]   = useState("全期間");  // 契約獲得力
  const [periodROI, setPeriodROI] = useState("全期間");  // 成約金額ROI
  const [periodCost, setPeriodCost] = useState("全期間"); // 費用対効果

  // ── 共通：流入元名一覧 ─────────────────────────────
  const sourceNames = useMemo(() =>
    sources.length > 0
      ? sources.map(s => s.name)
      : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))],
    [sources, customers]
  );

  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => { map[src] = customers.filter(c => (c["流入元"] || "") === src); });
    return map;
  }, [customers, sourceNames]);

  // ── 既存①：流入元×契約種別 ───────────────────────
  const reportStatuses = useMemo(() => statuses.filter(s => s.reportCount), [statuses]);

  const contractData = useMemo(() =>
    sourceNames.map(src => {
      const list = bySource[src] || [];
      const specified = list.filter(c => (c["契約種別"] || "").trim() !== "");
      const total = specified.length;
      const counts = contractTypes.map((ct, i) => {
        const count = specified.filter(c => (c["契約種別"] || "").trim() === ct).length;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return { ct, count, pct, color: COLORS[i % COLORS.length] };
      }).filter(d => d.count > 0);
      return { src, total, counts, allTotal: list.length };
    }),
    [sourceNames, bySource, contractTypes]
  );

  // ── 既存②：費用対効果 ────────────────────────────
  const terminalStatusNames = useMemo(() =>
    statuses.filter(s => s.terminalType && s.terminalType !== "excluded").map(s => s.name),
    [statuses]
  );
  const wonStatusNames = useMemo(() =>
    statuses.filter(s => s.terminalType === "won").map(s => s.name),
    [statuses]
  );

  const costHalfPeriods = useMemo(() => {
    const set = new Set();
    customers.forEach(c => {
      const d = new Date(c["ステータス変更日"] || c["登録日"]);
      if (!isNaN(d)) set.add(`${d.getFullYear()}年${d.getMonth() < 6 ? "上半期" : "下半期"}`);
    });
    return ["全期間", ...[...set].sort().reverse()];
  }, [customers]);

  const filterCusts = (custs, period) => {
    if (period === "全期間") return custs;
    return custs.filter(c => {
      const d = new Date(c["ステータス変更日"] || c["登録日"]);
      if (isNaN(d)) return false;
      return `${d.getFullYear()}年${d.getMonth() < 6 ? "上半期" : "下半期"}` === period;
    });
  };

  const costData = useMemo(() =>
    sourceNames.map(src => {
      const allList = bySource[src] || [];
      const list = filterCusts(allList, periodCost);
      const unitCost = (sources.find(s => s.name === src) || {}).cost || 0;
      const terminalCount = list.filter(c => terminalStatusNames.includes((c["対応ステータス"] || "").trim())).length;
      const totalCost = terminalCount * unitCost;
      const wonCount = list.filter(c => wonStatusNames.includes((c["対応ステータス"] || "").trim())).length;
      const costPerWon = wonCount > 0 ? Math.round(totalCost / wonCount) : null;
      return { src, unitCost, terminalCount, totalCost, wonCount, costPerWon };
    }).filter(d => d.unitCost > 0),
    [sourceNames, bySource, sources, terminalStatusNames, wonStatusNames, periodCost]
  );
  const maxTotalCost  = Math.max(...costData.map(d => d.totalCost), 1);
  const maxCostPerWon = Math.max(...costData.map(d => d.costPerWon ?? 0), 1);

  // ── 既存③：ステータス別グラフ ────────────────────
  const statusData = useMemo(() =>
    reportStatuses.map((st, si) => {
      const rows = sourceNames.map(src => {
        const list = bySource[src] || [];
        const reached = list.filter(c => (c["対応ステータス"] || "").trim() === st.name);
        const count = reached.length;
        const daysList = reached
          .map(c => daysElapsed(c["ステータス変更日"] || c["登録日"]))
          .filter(d => d !== null);
        const avgDays = daysList.length ? avg(daysList) : null;
        return { src, count, total: list.length, avgDays };
      });
      const maxCount = Math.max(...rows.map(d => d.count), 1);
      const grandTotal = rows.reduce((s, d) => s + d.count, 0);
      return { status: st.name, rows, maxCount, grandTotal, color: COLORS[si % COLORS.length] };
    }),
    [reportStatuses, sourceNames, bySource]
  );

  // ── 新④⑤共通：月フィルター ───────────────────────
  const wonEntries = useMemo(() =>
    statusHistory.filter(h => wonStatusNames.includes((h["ステータス"] || "").trim())),
    [statusHistory, wonStatusNames]
  );

  // 半期判定: 上半期=1〜6月, 下半期=7〜12月
  const halfPeriods = useMemo(() => {
    const set = new Set();
    wonEntries.forEach(h => {
      const d = new Date(h["変更日時"]);
      if (!isNaN(d)) set.add(`${d.getFullYear()}年${d.getMonth() < 6 ? "上半期" : "下半期"}`);
    });
    return ["全期間", ...[...set].sort().reverse()];
  }, [wonEntries]);

  const filterWon = (entries, period) => {
    if (period === "全期間") return entries;
    return entries.filter(h => {
      const d = new Date(h["変更日時"]);
      if (isNaN(d)) return false;
      const label = `${d.getFullYear()}年${d.getMonth() < 6 ? "上半期" : "下半期"}`;
      return label === period;
    });
  };

  const filteredWon    = useMemo(() => filterWon(wonEntries, periodCP),  [wonEntries, periodCP]);
  const filteredWonROI = useMemo(() => filterWon(wonEntries, periodROI), [wonEntries, periodROI]);

  const custById = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[String(c["顧客ID"] || "")] = c; });
    return m;
  }, [customers]);

  const propsByCustomer = useMemo(() => {
    const m = {};
    properties.forEach(p => {
      const cid = String(p.customerId || "");
      if (!m[cid]) m[cid] = [];
      m[cid].push(p);
    });
    return m;
  }, [properties]);

  // ── 新④：成約金額ROI ─────────────────────────────
  const roiData = useMemo(() =>
    sourceNames.map(src => {
      const srcObj   = sources.find(s => s.name === src) || {};
      const unitCost = srcObj.cost  || 0;
      const inflow   = srcObj.count || 0;  // 全流入件数（成約・非成約含む）
      const wonCusts = filteredWonROI
        .map(h => custById[String(h["顧客ID"] || "")])
        .filter(c => c && (c["流入元"] || "") === src);
      const wonCount = wonCusts.length;
      const prices = wonCusts.flatMap(c =>
        (propsByCustomer[String(c["顧客ID"] || "")] || [])
          .filter(p => p.contractPrice)
          .map(p => parseMan(p.contractPrice))
      ).filter(v => v > 0);
      const totalAmt     = prices.reduce((a, b) => a + b, 0);
      const avgAmt       = prices.length > 0 ? Math.round(totalAmt / prices.length) : 0;
      const commission   = Math.round(totalAmt * 0.03) + wonCount * 6;  // 想定仲介手数料（万円）= 成約金額×3% + 成約件数×6万
      const totalCostYen = inflow * unitCost;              // 全流入件数 × 単価（円）
      const totalCostMan = totalCostYen / 10000;           // 万円換算
      const roiNum = totalCostMan > 0 && commission > 0 ? commission / totalCostMan : null;
      const roi    = roiNum;
      const roiStr = roiNum !== null ? roiNum.toFixed(2) : null;
      return { src, unitCost, inflow, wonCount, totalAmt, avgAmt, commission, totalCostYen, totalCostMan, roi, roiStr };
    }),
    [sourceNames, filteredWonROI, custById, propsByCustomer, sources]
  );

  const roiKpi = useMemo(() => {
    const totalAmt       = roiData.reduce((a, b) => a + b.totalAmt, 0);
    const totalWon       = roiData.reduce((a, b) => a + b.wonCount, 0);
    const avgAmt         = totalWon > 0 ? Math.round(totalAmt / totalWon) : 0;
    const totalCommission= roiData.reduce((a, b) => a + b.commission, 0);
    const topRoi         = [...roiData].filter(d => d.roi !== null).sort((a, b) => b.roi - a.roi)[0];
    const totalCostAll   = roiData.reduce((a, b) => a + b.totalCostMan, 0);
    const overallRoi     = totalCostAll > 0 ? totalCommission / totalCostAll : null;
    return { totalAmt, totalWon, avgAmt, topRoi, overallRoi, totalCommission };
  }, [roiData]);

  const maxRoiAmt  = Math.max(...roiData.map(d => d.totalAmt), 1);
  const maxRoiCost = Math.max(...roiData.map(d => d.totalCostMan), 1);

  // ── 新⑤：契約獲得力 ──────────────────────────────
  const contractPowerData = useMemo(() =>
    sourceNames.map(src => {
      const wonCusts = filteredWon
        .map(h => custById[String(h["顧客ID"] || "")])
        .filter(c => c && (c["流入元"] || "") === src);
      const total     = wonCusts.length;
      const seninCusts = wonCusts.filter(c => isSenin(c["契約種別"]));
      const ippanCusts = wonCusts.filter(c => !isSenin(c["契約種別"]) && (c["契約種別"] || "").trim() !== "");
      const seninCount = seninCusts.length;
      const withContract = wonCusts.filter(c => (c["契約種別"] || "").trim() !== "");
      const seninRate  = withContract.length > 0 ? Math.round((seninCount / withContract.length) * 100) : 0;
      const avgPrice = (custs) => {
        const ps = custs.flatMap(c =>
          (propsByCustomer[String(c["顧客ID"] || "")] || [])
            .filter(p => p.contractPrice).map(p => parseMan(p.contractPrice))
        ).filter(v => v > 0);
        return ps.length > 0 ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
      };
      return {
        src, total, seninCount, ippanCount: ippanCusts.length,
        seninRate, seninAvgPrice: avgPrice(seninCusts), ippanAvgPrice: avgPrice(ippanCusts),
      };
    }),
    [sourceNames, filteredWon, custById, propsByCustomer]
  );

  const cpKpi = useMemo(() => {
    const totalWon   = contractPowerData.reduce((a, b) => a + b.total, 0);
    const totalSenin = contractPowerData.reduce((a, b) => a + b.seninCount, 0);
    const overallRate = totalWon > 0 ? Math.round((totalSenin / totalWon) * 100) : 0;
    const topSrc = [...contractPowerData].filter(d => d.total > 0).sort((a, b) => b.seninRate - a.seninRate)[0];
    const allWonCusts = filteredWon
      .map(h => custById[String(h["顧客ID"] || "")])
      .filter(Boolean);
    const countSensoku = allWonCusts.filter(c => (c["契約種別"] || "").includes("専属")).length;
    const countSenin  = allWonCusts.filter(c => (c["契約種別"] || "").includes("専任") && !(c["契約種別"] || "").includes("専属")).length;
    const countIppan  = allWonCusts.filter(c => (c["契約種別"] || "").includes("一般")).length;
    return { totalWon, totalSenin, overallRate, topSrc, countSensoku, countSenin, countIppan };
  }, [contractPowerData, filteredWon, custById]);

  const ranked = useMemo(() =>
    [...contractPowerData].filter(d => d.total > 0).sort((a, b) => b.seninRate - a.seninRate),
    [contractPowerData]
  );

  // ── スタイル共通 ──────────────────────────────────
  const colHd = (align = "left") => ({
    fontSize: 13, fontWeight: 800, color: THEME.textMain,
    paddingBottom: 8, borderBottom: `2px solid ${THEME.border}`, textAlign: align,
  });
  const thS = {
    fontSize: 12, fontWeight: 800, color: THEME.textMuted,
    padding: "10px 20px", borderBottom: `2px solid ${THEME.border}`, whiteSpace: "nowrap",
  };
  const tdS = {
    padding: "13px 20px", borderBottom: `1px solid ${THEME.border}`,
    fontSize: 13, verticalAlign: "middle",
  };
  const card = {
    backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`,
    padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 56px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <header style={{ marginBottom: 36 }}>
          <button
            onClick={() => navigate("/analysis")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 14, padding: 0 }}
          >
            <ChevronLeft size={16} /> レポート一覧に戻る
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <GitBranch size={26} color="#0891B2" />
            <h1 style={{ fontSize: 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>流入経路評価</h1>
          </div>
          <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>
            流入元ごとのステータス到達数・費用対効果・成約金額ROI・契約獲得力
          </p>
        </header>

        {/* ── ⑤ 契約獲得力 ── */}
        <div style={card}>
          <SectionTitle color="#7C3AED">
            <span style={{ fontSize: 18 }}>🏆</span> 契約獲得力
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— 専任媒介契約の獲得率・成約金額比較</span>
          </SectionTitle>

          {/* 期間フィルター */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
            <select value={periodCP} onChange={e => setPeriodCP(e.target.value)}
              style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.bg, color: THEME.textMain, cursor: "pointer", fontWeight: 700 }}>
              {halfPeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* KPIカード */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {/* 左50%：2カード */}
            <div style={{ display: "flex", gap: 12, flex: 1 }}>
              <KpiCard label="全体・専任媒介率" value={`${cpKpi.overallRate}%`} sub={`専任 ${cpKpi.totalSenin}件 / 計 ${cpKpi.totalWon}件`} color="#4F46E5" />
              <KpiCard label="専任率 No.1 流入元" value={cpKpi.topSrc ? cpKpi.topSrc.src : "−"} sub={cpKpi.topSrc ? `専任率 ${cpKpi.topSrc.seninRate}%` : undefined} color="#7C3AED" />
            </div>
            {/* 右50%：3種別の内訳カード */}
            <div style={{
              flex: 1, background: "white", borderRadius: 12, border: `1px solid ${THEME.border}`,
              padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 10 }}>契約種別の内訳</div>
              <div style={{ display: "flex", gap: 0, flex: 1 }}>
                {[
                  { label: "一般媒介契約",     count: cpKpi.countIppan,  color: COLORS[0] },
                  { label: "専任媒介契約",     count: cpKpi.countSenin,  color: COLORS[1] },
                  { label: "専属専任媒介契約", count: cpKpi.countSensoku, color: COLORS[2] },
                ].map(({ label, count, color }, i) => (
                  <div key={label} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    borderLeft: i > 0 ? `1px solid ${THEME.border}` : "none", padding: "0 12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                      <div style={{ fontSize: 11, color: THEME.textMuted, whiteSpace: "nowrap" }}>{label}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 26, fontWeight: 900, color: THEME.textMain, lineHeight: 1 }}>{count}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 3 }}>件</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>

            {/* 専任率ランキング */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 12 }}>専任率ランキング</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ranked.length === 0 && <div style={{ color: THEME.textMuted, fontSize: 13 }}>データなし</div>}
                {ranked.map((d, i) => {
                  const medalBg   = ["#FEF9C3","#F1F5F9","#FEF3C7"];
                  const medalText = ["#713F12","#475569","#92400E"];
                  return (
                    <div key={d.src} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: i < 3 ? medalBg[i] : THEME.bg,
                        color: i < 3 ? medalText[i] : THEME.textMuted,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 900,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: THEME.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.src}</span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: "#4F46E5", marginLeft: 6, flexShrink: 0 }}>{d.seninRate}%</span>
                        </div>
                        <StackBar senin={d.seninCount} total={d.total} />
                        <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>専任{d.seninCount}件 / 一般{d.ippanCount}件</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 明細テーブル */}
            <div>
              {/* 凡例（①と同じ contractTypes カラー） */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                {contractTypes.map((ct, i) => (
                  <div key={ct} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.textMuted }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i % COLORS.length], display: "inline-block" }} />
                    {ct}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: THEME.textMuted, marginLeft: "auto" }}>※ 契約種別未指定は除く</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 120 }} />
                  <col style={{ width: 52 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr style={{ background: THEME.bg }}>
                    <th style={{ ...thS, textAlign: "left" }}>流入元</th>
                    <th style={{ ...thS, textAlign: "right" }}>計</th>
                    <th style={{ ...thS, textAlign: "left" }}>契約種別の内訳</th>
                  </tr>
                </thead>
                <tbody>
                  {contractPowerData.map((d, i) => {
                    // 成約顧客から直接契約種別内訳を計算（contractDataは全顧客ベースのため使わない）
                    const wonCustsForBar = filteredWon
                      .map(h => custById[String(h["顧客ID"] || "")])
                      .filter(c => c && (c["流入元"] || "") === d.src);
                    const specified = wonCustsForBar.filter(c => (c["契約種別"] || "").trim() !== "");
                    const barTotal  = specified.length;
                    const counts = contractTypes.map((ct, ci) => {
                      const count = specified.filter(c => (c["契約種別"] || "").trim() === ct).length;
                      const pct   = barTotal > 0 ? (count / barTotal) * 100 : 0;
                      return { ct, count, pct, color: COLORS[ci % COLORS.length] };
                    }).filter(x => x.count > 0);
                    return (
                      <tr key={d.src} style={{ background: i % 2 === 0 ? THEME.bg : "white" }}>
                        <td style={{ ...tdS, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.src}</td>
                        <td style={{ ...tdS, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{d.total}件</td>
                        <td style={{ ...tdS, paddingRight: 16 }}>
                          {barTotal === 0 ? (
                            <span style={{ fontSize: 12, color: THEME.textMuted }}>データなし</span>
                          ) : (
                            <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", backgroundColor: "#EEF2FF" }}>
                              {counts.map(ct => (
                                <div
                                  key={ct.ct}
                                  title={`${ct.ct}: ${ct.count}件 (${Math.round(ct.pct)}%)`}
                                  style={{
                                    width: `${ct.pct}%`, height: "100%",
                                    backgroundColor: ct.color,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    overflow: "hidden", transition: "width 0.6s ease",
                                  }}
                                >
                                  {ct.pct >= 10 && (
                                    <span style={{ fontSize: 11, fontWeight: 900, color: "white", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                                      {Math.round(ct.pct)}%
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {contractPowerData.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>該当する成約データがありません</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>




        {/* ── ④ 成約金額ROI ── */}
        <div style={card}>
          <SectionTitle color="#059669">
            <span style={{ fontSize: 18 }}>📈</span> 成約金額ROI
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— ROI = 想定仲介手数料（成約金額×3%＋6万×件数） ÷ 広告費（単価×全反響件数）</span>
          </SectionTitle>

          {/* 期間フィルター */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
            <select value={periodROI} onChange={e => setPeriodROI(e.target.value)}
              style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.bg, color: THEME.textMain, cursor: "pointer", fontWeight: 700 }}>
              {halfPeriods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* KPIカード */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <KpiCard label="仲介手数料合計（推定）" value={fmtMan(roiKpi.totalCommission)} sub={`成約金額合計 ${fmtMan(roiKpi.totalAmt)} の3%`} color="#059669" />
            <KpiCard label="1成約あたり平均金額" value={roiKpi.avgAmt > 0 ? fmtMan(roiKpi.avgAmt) : "−"} sub="全流入元の単純平均" />
            <KpiCard label="全体平均ROI" value={roiKpi.overallRoi ? roiKpi.overallRoi.toFixed(2) + "倍" : "−"} sub="成約金額合計 ÷ 広告費合計" color={roiKpi.overallRoi >= 1 ? "#1D6F42" : "#C0392B"} />
            <KpiCard label="ROI最高流入元" value={roiKpi.topRoi ? roiKpi.topRoi.src : "−"} sub={roiKpi.topRoi && roiKpi.topRoi.roi ? `${roiKpi.topRoi.roiStr}倍（標準比 ${Math.round(roiKpi.topRoi.roi / 8.3 * 100)}%）` : undefined} color="#185FA5" />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: THEME.bg }}>
                <th style={{ ...thS, textAlign: "left" }}>流入元</th>
                <th style={{ ...thS, textAlign: "right" }}>成約件数</th>
                <th style={{ ...thS, textAlign: "right" }}>獲得数</th>
                <th style={{ ...thS, textAlign: "left" }}>成約金額合計</th>
                <th style={{ ...thS, textAlign: "right" }}>平均成約金額</th>
                <th style={{ ...thS, textAlign: "right" }}>広告費</th>
                <th style={{ ...thS }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>ROI効率スケール</span>
                    <span style={{ fontSize: 10, color: THEME.textMuted, fontWeight: 400 }}>■ 標準レンジ 8.3〜12.5倍</span>
                  </div>
                </th>
                <th style={{ ...thS, textAlign: "right" }}>ROI倍率</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const ROI_SCALE = 25;
                const STD_LO    = 8.3;
                const STD_HI    = 12.5;
                const sorted = [...roiData].sort((a, b) => {
                  if (a.roi === null && b.roi === null) return 0;
                  if (a.roi === null) return 1;
                  if (b.roi === null) return -1;
                  return b.roi - a.roi;
                });
                return sorted.map((d, i) => {
                  const noData   = d.wonCount === 0 && d.totalAmt === 0;
                  const noCost   = d.unitCost === 0;
                  const dimRow   = noData || noCost;
                  const rowStyle = { background: i % 2 === 0 ? "#F8FAFF" : "white", border: i % 2 === 0 ? `1px solid ${THEME.border}` : "1px solid transparent", borderRadius: 8, opacity: dimRow ? 0.28 : 1 };
                  const rs       = roiStatus(d.roi);
                  const roiPct   = d.roi !== null ? Math.min((d.roi / ROI_SCALE) * 100, 100) : 0;
                  const stdLoPct = (STD_LO / ROI_SCALE) * 100;
                  const stdHiPct = (STD_HI / ROI_SCALE) * 100;
                  return (
                    <tr key={d.src} style={rowStyle}>
                      {/* 流入元 */}
                      <td style={{ ...tdS, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.src}</td>
                      {/* 成約件数 */}
                      <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>{d.wonCount}</span>
                        <span style={{ fontSize: 12, color: THEME.textMuted, marginLeft: 2 }}>件</span>
                      </td>
                      {/* 獲得数（全反響件数） */}
                      <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>{d.inflow}</span>
                        <span style={{ fontSize: 12, color: THEME.textMuted, marginLeft: 2 }}>件</span>
                      </td>
                      {/* 成約金額合計 */}
                      <td style={{ ...tdS }}>
                        {d.totalAmt > 0
                          ? <span style={{ fontSize: 18, fontWeight: 900, color: THEME.success }}>{fmtMan(d.totalAmt)}</span>
                          : <span style={{ fontSize: 12, color: THEME.textMuted }}>−</span>}
                      </td>
                      {/* 平均成約金額 */}
                      <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>
                        {d.avgAmt > 0
                          ? <span style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>{fmtMan(d.avgAmt)}</span>
                          : <span style={{ fontSize: 12, color: THEME.textMuted }}>−</span>}
                      </td>
                      {/* 広告費（万円統一） */}
                      <td style={{ ...tdS, textAlign: "right", whiteSpace: "nowrap" }}>
                        {d.totalCostYen > 0 ? (
                          <span style={{ fontSize: 18, fontWeight: 900, color: THEME.textMain }}>
                            {d.totalCostMan.toFixed(1)}<span style={{ fontSize: 12, color: THEME.textMuted, marginLeft: 2 }}>万</span>
                          </span>
                        ) : <span style={{ fontSize: 12, color: THEME.textMuted }}>−</span>}
                      </td>
                      {/* ROI効率バー */}
                      <td style={{ ...tdS, paddingRight: 20 }}>
                        {d.roi !== null ? (
                          <div style={{ position: "relative", height: 20 }}>
                            {/* ベーストラック */}
                            <div style={{ position: "absolute", inset: "6px 0", background: THEME.border, borderRadius: 4 }} />
                            {/* 標準ゾーン（薄いインディゴ） */}
                            <div style={{
                              position: "absolute", top: 6, bottom: 6, borderRadius: 2,
                              left: `${stdLoPct}%`, width: `${stdHiPct - stdLoPct}%`,
                              background: "#C7D2FE",
                            }} />
                            {/* ROIバー（インディゴ単色） */}
                            <div style={{
                              position: "absolute", top: 2, bottom: 2, left: 0,
                              width: `${roiPct}%`,
                              background: "#4F46E5",
                              borderRadius: 4,
                            }} />
                            {/* マーカードット */}
                            <div style={{
                              position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
                              left: `${roiPct}%`,
                              width: 12, height: 12, borderRadius: "50%",
                              background: "#4F46E5", border: "2px solid white",
                              zIndex: 1,
                            }} />
                          </div>
                        ) : null}
                      </td>
                      {/* ROI倍率 */}
                      <td style={{ ...tdS, textAlign: "right" }}>
                        {d.roi !== null ? (
                          <>
                            <span style={{ fontSize: 20, fontWeight: 900, color: rs.color }}>{d.roiStr}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: rs.color, marginLeft: 2 }}>倍</span>
                          </>
                        ) : <span style={{ fontSize: 11, color: THEME.textMuted }}>−</span>}
                      </td>
                    </tr>
                  );
                });
              })()}
              {roiData.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>該当する成約データがありません</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── ② 費用対効果 ── */}
        {costData.length > 0 && (
          <div style={card}>
            <SectionTitle color="#059669">
              <span style={{ fontSize: 18 }}>💰</span> 費用対効果
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— コスト設定済みの流入元のみ表示</span>
            </SectionTitle>

            {/* 期間フィルター */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
              <select value={periodCost} onChange={e => setPeriodCost(e.target.value)}
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.bg, color: THEME.textMain, cursor: "pointer", fontWeight: 700 }}>
                {costHalfPeriods.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", columnGap: 24, marginBottom: 8 }}>
              <div />
              <div style={colHd()}>総獲得コスト</div>
              <div style={colHd()}>1成約あたりのコスト</div>
            </div>
            {costData.map((d, ri) => {
              const isEven = ri % 2 === 0;
              const rowBg = isEven ? "#D1FAE5" : "white";
              const cs = { backgroundColor: rowBg, padding: "12px 12px", display: "flex", alignItems: "center" };
              return (
                <div key={d.src} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", columnGap: 0, marginBottom: 2, borderRadius: 8, overflow: "hidden", border: isEven ? "1px solid #D1FAE5" : "1px solid transparent" }}>
                  <div style={{ ...cs, justifyContent: "flex-end", borderRadius: "8px 0 0 8px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{d.src}</span>
                  </div>
                  <div style={{ ...cs, flexDirection: "column", alignItems: "flex-start", gap: 6, paddingLeft: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: "#059669", lineHeight: 1 }}>{d.totalCost.toLocaleString()}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>円</span>
                      <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 4 }}>（{d.terminalCount}件 × {d.unitCost.toLocaleString()}円）</span>
                    </div>
                    <div style={{ width: "100%", backgroundColor: "#D1FAE5", borderRadius: 6, overflow: "hidden", height: 16 }}>
                      <div style={{ width: `${Math.max((d.totalCost / maxTotalCost) * 100, d.totalCost > 0 ? 3 : 0)}%`, height: "100%", backgroundColor: "#059669", borderRadius: 6, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                  <div style={{ ...cs, flexDirection: "column", alignItems: "flex-start", gap: 6, paddingLeft: 16, borderRadius: "0 8px 8px 0" }}>
                    {d.costPerWon != null ? (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: "#0891B2", lineHeight: 1 }}>{d.costPerWon.toLocaleString()}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>円</span>
                          <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 4 }}>（成約 {d.wonCount}件）</span>
                        </div>
                        <div style={{ width: "100%", backgroundColor: "#E0F2FE", borderRadius: 6, overflow: "hidden", height: 16 }}>
                          <div style={{ width: `${Math.max((d.costPerWon / maxCostPerWon) * 100, 3)}%`, height: "100%", backgroundColor: "#0891B2", borderRadius: 6, transition: "width 0.6s ease" }} />
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 14, color: THEME.textMuted }}>成約なし</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        
      </div>
    </div>
  );
}