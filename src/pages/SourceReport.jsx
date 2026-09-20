import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronLeft, Loader2 } from "lucide-react";
import { THEME as APP_THEME, GAS_URL } from "../lib/constants";
import { apiCall } from "../lib/utils";
import { useReport } from "../lib/useReport";   // 【レポート高速化】
import { useWindowWidth } from "../lib/useWindowWidth";

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
// 日付を "YYYY-MM" キーに変換（input[type=month]の値と同形式・文字列比較可能）
// 【A5-001】月境界の判定は Asia/Tokyo 固定にする。
//   旧実装（getFullYear/getMonth）はブラウザのローカルTZ依存で、海外からの
//   アクセス時に月初・月末の成約/反響が隣月へ計上され、SMS配信レポート
//   （SmsUsageReport.jsx / GAS 側 toMonthKey_ = Asia/Tokyo）と基準がずれていた。
//   sv-SE ロケールは "YYYY-MM-DD" を返すため slice(0,7) で月キーになる
//   （SmsUsageReport.jsx:45-51 の toMonthKey と同方式）。
function ymKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 7);
}
// 月キーが指定範囲 { from, to } 内かどうか判定（from/to空欄は無制限）
function inMonthRange(ym, range) {
  if (!ym) return false;
  if (range.from && ym < range.from) return false;
  if (range.to && ym > range.to) return false;
  return true;
}
// "YYYY-MM" → "YYYY年MM月" 表示用
function fmtYMLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${y}年${m}月`;
}
function parseMan(val) {
  return Number(String(val || "").replace(/[^0-9.]/g, "")) || 0;
}
// 【A4-016】突合キーの正規化。
//   顧客ID（数値セル/文字列セル混在）と流入元名（前後空白の混入）は、
//   必ず String() + trim() してから比較する。ステータス名の突合を
//   trim に揃えた E3-009 / E2-002（KanbanBoard.jsx:1350-1356 と同条件）と同じ方針。
function custKey(v) { return String(v ?? "").trim(); }
function srcKey(v)  { return String(v ?? "").trim(); }
// 【A5-002】成約顧客リストの重複排除（顧客ID→c.id の順で採ったキーでユニーク化）。
//   同一顧客が「成約→他ステータス→再成約」すると won 履歴が複数件になり、
//   履歴→顧客の JOIN（filteredWon.map(...)）は同じ顧客オブジェクトを複数回返す。
//   仕様確定（2026-09-11）:
//     ・成約「件数」は履歴イベント数のまま数える（再成約は2件）
//     ・成約「金額」は顧客単位で1回だけ集計する（propsOf が顧客の全物件を
//       返すため、イベントごとに flatMap すると同じ成約金額が二重加算される）
//   よって金額系（prices / avgPrice）の母集団だけ本関数でユニーク化する。
function uniqCusts(custs) {
  const seen = new Set();
  const out = [];
  for (const c of custs) {
    const k = custKey(c["顧客ID"]) || custKey(c.id);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
function fmtMan(n) {
  if (!n) return "−";
  if (n >= 10000) return (n / 10000).toFixed(1) + "億";
  return n.toLocaleString() + "万";
}
// 【E3-010】専任判定（旧 isSenin）はコンポーネント内へ移動した。
//   旧実装 `(contractType || "").includes("専任")` は名称文字列への依存であり、
//   契約種別名を「独占媒介」等へ改名した瞬間に専任系カウントから外れる
//   運用上の落とし穴だった（ステータスの名称依存 G1-019 と同種の問題）。
//   現在は契約種別マスタの「専任系」フラグ（exclusiveContractTypes）を参照する。

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
      // 【レスポンシブ】flex:1 固定だと親幅が狭い時にカードが極端に潰れて文字が縦落ちする。
      //   基準幅170pxを持たせ、親の flexWrap で折返す。
      padding: "16px 18px", flex: "1 1 170px", minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || THEME.textMain, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── 月範囲フィルター（〇年〇月 〜 〇年〇月） ──────────
function MonthRangeFilter({ value, onChange, min, max }) {
  const inputStyle = {
    fontSize: 12, padding: "6px 10px", borderRadius: 8,
    border: `1px solid ${THEME.border}`, background: THEME.bg,
    color: THEME.textMain, cursor: "pointer", fontWeight: 700,
    fontFamily: "inherit", outline: "none",
  };
  const hasValue = value.from || value.to;
  const label = hasValue
    ? `${value.from ? fmtYMLabel(value.from) : "最初"} 〜 ${value.to ? fmtYMLabel(value.to) : "最新"}`
    : "全期間";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted }}>集計期間</span>
      <input
        type="month"
        value={value.from || ""}
        min={min}
        max={value.to || max}
        onChange={e => onChange({ ...value, from: e.target.value })}
        style={inputStyle}
      />
      <span style={{ color: THEME.textMuted, fontSize: 13 }}>〜</span>
      <input
        type="month"
        value={value.to || ""}
        min={value.from || min}
        max={max}
        onChange={e => onChange({ ...value, to: e.target.value })}
        style={inputStyle}
      />
      {hasValue && (
        <button
          onClick={() => onChange({ from: "", to: "" })}
          style={{
            fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${THEME.border}`, background: "white",
            color: THEME.textMuted, cursor: "pointer",
          }}
        >
          クリア
        </button>
      )}
      <span style={{ fontSize: 11, color: THEME.textMuted }}>（{label}）</span>
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
  exclusiveContractTypes = null,  // 【E3-010】専任系の契約種別名リスト（getAppData）。null＝旧GAS
  statusHistory = [],
  properties = [],
  isLoading = false,   // 【E3-015】App の全体データ取得中フラグ（App.jsx:347 から受領）
  loadError = false,   // 【E3-014】App の全体データ取得失敗フラグ（App.jsx の refresh リトライ上限到達）
}) {

  // 【ペイロード分離】statusHistory は props ではなくマウント時に個別取得（全件）
  //   【レポート高速化】force:true を廃止。GAS 側キャッシュは appendStatusHistory /
  //   削除・バックフィル時にイベント駆動で破棄されるため、毎回の全件再読込は不要。
  const { data: wonRes, loading: loadingWon, error: wonError } = useReport("getSourceWonEntries", {});
  const fetchedWonEntries = wonRes ? (wonRes.wonEntries || []) : null;

  const navigate = useNavigate();
  // 【レスポンシブ】isTablet は専任率ランキング(220px固定)＋グラフの2カラム切替に使用。
  //   モバイルは従来通り横スクロール(main側 overflowX)で閲覧するため挙動を変えない。
  const { isMobile, isTablet, width } = useWindowWidth();
  const [periodCP, setPeriodCP]     = useState({ from: "", to: "" });  // 契約獲得力
  const [periodROI, setPeriodROI]   = useState({ from: "", to: "" });  // 成約金額ROI
  const [periodCost, setPeriodCost] = useState({ from: "", to: "" });  // 費用対効果
  // 各期間フィルターを「最古〜最新」で初期プリセット済みかどうか（一度だけ実行）
  const periodInit = useRef({ cp: false, roi: false, cost: false });

  // ── 共通：流入元名一覧 ─────────────────────────────
  const sourceNames = useMemo(() =>
    sources.length > 0
      ? sources.map(s => s.name)
      : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))],
    [sources, customers]
  );

  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => { map[src] = customers.filter(c => srcKey(c["流入元"]) === srcKey(src)); });
    return map;
  }, [customers, sourceNames]);

  // ── 既存①：流入元×契約種別 ───────────────────────
  // 【E4-003】レポート集計対象の判定は「レポート集計」チェック（reportCount）だけで行う。
  //   placement は KanbanBoard.jsx:1106-1120 のとおり「カンバンのどこに置くか」を
  //   決めるレイアウト設定であり、レポートの集計可否とは無関係のため判定に使わない。
  //   （E0-003 で placement を判定に混ぜた結果、ステータス設定で「レポート集計:集計する」を
  //     ONにしても下部配置の終点ステータスが黙って集計対象外になっていた）
  //   excluded のみ設計決定事項どおり常に除外する。
  const reportStatuses = useMemo(
    () => statuses.filter(s => s.reportCount && s.terminalType !== "excluded"),
    [statuses]
  );

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
  // 【E3-009】ステータス名は必ず trim して保持する。
  //   比較先（顧客の「対応ステータス」/ ステータス履歴の「ステータス」）は
  //   trim 済みの値で突合するため、判定条件を KanbanBoard.jsx:1351-1352 /
  //   AnalysisReport.jsx:195-204 に揃える（E2-002 と同方針）。
  const wonStatusNames = useMemo(() =>
    statuses.filter(s => s.terminalType === "won").map(s => (s.name || "").trim()),
    [statuses]
  );

  // 【A5-003】期間フィルターの日付基準を用途別に分離する（仕様確定 2026-09-11）。
  //   ・反響（獲得数・広告費の分母）……… 登録日 基準（regYm）。反響が発生した月で数える。
  //     旧実装は「ステータス変更日||登録日」だったため、後からステータスが動いた
  //     顧客が反響月からずれ、広告費が期間へ正しく追随しなかった。
  //     登録日が空の旧データのみステータス変更日へフォールバックする。
  //   ・状態（成約件数など現在ステータスの集計）… ステータス変更日||登録日 基準
  //     （chgYm・従来どおり）。
  const regYm = (c) => ymKey(c["登録日"] || c["ステータス変更日"]);
  const chgYm = (c) => ymKey(c["ステータス変更日"] || c["登録日"]);
  const filterCustsByReg = (custs, range) => {
    if (!range.from && !range.to) return custs;
    return custs.filter(c => inMonthRange(regYm(c), range));
  };
  const filterCustsByChange = (custs, range) => {
    if (!range.from && !range.to) return custs;
    return custs.filter(c => inMonthRange(chgYm(c), range));
  };

  // 顧客データの利用可能な月範囲（input[type=month]のmin/max・初期プリセット用）。
  // 【A5-003】登録日・ステータス変更日の両基準を使うため、両方の月キーを合算した
  //   範囲にする（範囲＝両基準の全データを含む＝初期プリセットが全期間と等価になる）。
  const custMonthBounds = useMemo(() => {
    const keys = [];
    customers.forEach(c => {
      const r = regYm(c); if (r) keys.push(r);
      const g = chgYm(c); if (g) keys.push(g);
    });
    if (!keys.length) return { min: undefined, max: undefined };
    return {
      min: keys.reduce((a, b) => (a < b ? a : b)),
      max: keys.reduce((a, b) => (a > b ? a : b)),
    };
  }, [customers]);
  const costMonthBounds = custMonthBounds;

  // 【A5-004】総獲得コスト ＝ 期間内の全反響件数 × 反響単価（仕様確定 2026-09-11）。
  //   旧実装は「終点到達件数 × 単価」で、同一ページの成約金額ROI（広告費 ＝
  //   全反響件数 × 単価）と同じ単価に別の乗数を掛けており、媒体費の解釈が
  //   セクション間で食い違っていた。流入元設定の「コスト」は反響1件あたりの
  //   課金額のため、全反響件数×単価へ統一する。
  //   成約件数（1成約あたりコストの分母）は従来どおり現在ステータス基準
  //   （ステータス変更日で期間フィルタ）。
  const costData = useMemo(() =>
    sourceNames.map(src => {
      const allList  = bySource[src] || [];
      const unitCost = (sources.find(s => s.name === src) || {}).cost || 0;
      const inflowCount = filterCustsByReg(allList, periodCost).length;
      const totalCost   = inflowCount * unitCost;
      const wonCount = filterCustsByChange(allList, periodCost)
        .filter(c => wonStatusNames.includes((c["対応ステータス"] || "").trim())).length;
      const costPerWon = wonCount > 0 ? Math.round(totalCost / wonCount) : null;
      return { src, unitCost, inflowCount, totalCost, wonCount, costPerWon };
    }).filter(d => d.unitCost > 0),
    [sourceNames, bySource, sources, wonStatusNames, periodCost]
  );
  const maxTotalCost  = Math.max(...costData.map(d => d.totalCost), 1);
  const maxCostPerWon = Math.max(...costData.map(d => d.costPerWon ?? 0), 1);

  // ── 既存③：ステータス別グラフ ────────────────────
  const statusData = useMemo(() =>
    reportStatuses.map((st, si) => {
      const rows = sourceNames.map(src => {
        const list = bySource[src] || [];
        // 【E2-002】比較条件をカンバン（KanbanBoard.jsx:1352）に揃える。
        //   旧実装は st.name を trim していなかったため、ステータス設定の名称に
        //   前後空白が混じると顧客一覧・カンバンより過少にカウントされていた。
        const reached = list.filter(c => (c["対応ステータス"] || "").trim() === (st.name || "").trim());
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
    (fetchedWonEntries ?? []).filter(h => wonStatusNames.includes((h["ステータス"] || "").trim())),
    [fetchedWonEntries, wonStatusNames]
  );

  // 成約データ（変更日時）の利用可能な月範囲（input[type=month]のmin/max用）
  const wonMonthBounds = useMemo(() => {
    const keys = wonEntries.map(h => ymKey(h["変更日時"])).filter(Boolean);
    if (!keys.length) return { min: undefined, max: undefined };
    return {
      min: keys.reduce((a, b) => (a < b ? a : b)),
      max: keys.reduce((a, b) => (a > b ? a : b)),
    };
  }, [wonEntries]);

  // 【A5-005】成約金額ROIの月範囲は「成約履歴の月」と「顧客（登録日/変更日）の月」の
  //   合成範囲にする。ROIは成約（won履歴）と反響（顧客の登録日）の両方を期間で
  //   絞るため、won側だけの範囲を初期プリセットすると、最初の成約より前に
  //   発生した反響が広告費の分母から脱落し、初期表示のROIが「クリア（全期間）」
  //   と食い違っていた（初期表示でROI過大）。合成範囲なら初期プリセットは
  //   両基準に対して no-op ＝ 全期間と厳密に一致する。
  const roiMonthBounds = useMemo(() => {
    const mins = [wonMonthBounds.min, custMonthBounds.min].filter(Boolean);
    const maxs = [wonMonthBounds.max, custMonthBounds.max].filter(Boolean);
    if (!mins.length || !maxs.length) return { min: undefined, max: undefined };
    return {
      min: mins.reduce((a, b) => (a < b ? a : b)),
      max: maxs.reduce((a, b) => (a > b ? a : b)),
    };
  }, [wonMonthBounds, custMonthBounds]);

  // ── 期間フィルターの初期プリセット ─────────────────
  // データ読込後、各フィルターを「最古月〜最新月」で一度だけ初期化する。
  // （全期間と同じ集計結果になる範囲を選ぶこと。画面上に範囲を明示するのが目的）
  useEffect(() => {
    if (!periodInit.current.cp && wonMonthBounds.min && wonMonthBounds.max) {
      setPeriodCP({ from: wonMonthBounds.min, to: wonMonthBounds.max });
      periodInit.current.cp = true;
    }
  }, [wonMonthBounds]);
  useEffect(() => {
    // 【A5-005】ROIは合成範囲でプリセット（won範囲だけだと反響側が欠ける）
    if (!periodInit.current.roi && roiMonthBounds.min && roiMonthBounds.max) {
      setPeriodROI({ from: roiMonthBounds.min, to: roiMonthBounds.max });
      periodInit.current.roi = true;
    }
  }, [roiMonthBounds]);
  useEffect(() => {
    if (!periodInit.current.cost && costMonthBounds.min && costMonthBounds.max) {
      setPeriodCost({ from: costMonthBounds.min, to: costMonthBounds.max });
      periodInit.current.cost = true;
    }
  }, [costMonthBounds]);

  const filterWon = (entries, range) => {
    if (!range.from && !range.to) return entries;
    return entries.filter(h => inMonthRange(ymKey(h["変更日時"]), range));
  };

  const filteredWon    = useMemo(() => filterWon(wonEntries, periodCP),  [wonEntries, periodCP]);
  const filteredWonROI = useMemo(() => filterWon(wonEntries, periodROI), [wonEntries, periodROI]);

  const custById = useMemo(() => {
    const m = {};
    customers.forEach(c => {
      // 「顧客ID」列の値に加えて、fromColumnar が合成する c.id でも引けるようにする。
      // ステータス履歴の顧客IDは updateStatus の params.id（= フロントの c.id）で
      // 書かれるため（gas_updated.js:2002 / KanbanBoard.jsx:1245）、顧客ID列が
      // 空の行でも履歴と突合できる。キーは custKey で正規化。
      const k1 = custKey(c["顧客ID"]);
      const k2 = custKey(c.id);
      if (k1) m[k1] = c;
      if (k2 && !m[k2]) m[k2] = c;
    });
    return m;
  }, [customers]);

  const propsByCustomer = useMemo(() => {
    const m = {};
    properties.forEach(p => {
      const cid = custKey(p.customerId);
      if (!cid) return;   // 顧客IDの無い物件はどの顧客にも紐付けない（"" キー衝突を防止）
      if (!m[cid]) m[cid] = [];
      m[cid].push(p);
    });
    return m;
  }, [properties]);

  // 【E3-020】物件（成約金額）との突合は「顧客ID」列 → 引けなければ c.id の順で行う。
  //   物件リストの顧客IDはフロントの c.id で書かれる（addProperty 呼び出し:
  //   CustomerDetail.jsx:697 customerId: id ／ 表示側の突合も c.id:
  //   CustomerDetail.jsx:437, KanbanBoard.jsx:1242,1264）。顧客ID列が空の顧客は
  //   fromColumnar が行indexを c.id に合成する（columnar.js:14-17）ため、
  //   c["顧客ID"]（空文字）だけでは恒久的に引けない。custById を二重キーにした
  //   A4-016 の対処（上記 custById）と同じ方針を物件側の参照にも適用する。
  const propsOf = (c) =>
    propsByCustomer[custKey(c["顧客ID"])] || propsByCustomer[custKey(c.id)] || [];

  // ── 新④：成約金額ROI ─────────────────────────────
  const roiData = useMemo(() =>
    sourceNames.map(src => {
      const srcObj   = sources.find(s => s.name === src) || {};
      const unitCost = srcObj.cost  || 0;
      // 【E3-002→A5-003】獲得数（全反響件数）と広告費（＝獲得数×単価）は集計期間に追随する。
      //   期間基準は「登録日（反響発生日）」（filterCustsByReg・仕様確定 2026-09-11）。
      //   旧実装のマスタ累計 count（サーバ集計・trim なしの生値一致）は使わない：
      //   フロントの bySource（trim 一致）と件数の基準が異なり、全期間⇄期間指定の
      //   切り替えで獲得数が不連続に変わる余地があったため、常にフロント側の
      //   同一基準（allList）で数える。全期間（フィルタ空）は allList.length。
      const allList = bySource[src] || [];
      const inflow  = filterCustsByReg(allList, periodROI).length;  // 全反響件数（成約・非成約含む）
      // 成約件数＝won履歴イベント数（再成約は複数件と数える・仕様確定 2026-09-11）
      const wonCusts = filteredWonROI
        .map(h => custById[custKey(h["顧客ID"])])
        .filter(c => c && srcKey(c["流入元"]) === srcKey(src));
      const wonCount = wonCusts.length;
      // 【A5-002】成約金額は顧客単位で1回だけ集計する。propsOf は顧客の全物件を
      //   返すため、won履歴が複数件ある顧客をイベントごとに flatMap すると
      //   同じ成約金額が履歴件数ぶん二重加算される。
      const uniqWon = uniqCusts(wonCusts);
      const prices = uniqWon.flatMap(c =>
        propsOf(c)
          .filter(p => p.contractPrice)
          .map(p => parseMan(p.contractPrice))
      ).filter(v => v > 0);
      // 成約金額が1件も取れていない成約顧客数（ユニーク）。3%分が未計上である
      //   ことを画面に注記するために数える（A4-016 で確認済みの挙動の可視化）。
      const noPriceCount = uniqWon.filter(c =>
        !propsOf(c).some(p => p.contractPrice && parseMan(p.contractPrice) > 0)
      ).length;
      const totalAmt     = prices.reduce((a, b) => a + b, 0);
      const avgAmt       = prices.length > 0 ? Math.round(totalAmt / prices.length) : 0;
      const commission   = Math.round(totalAmt * 0.03) + wonCount * 6;  // 想定仲介手数料（万円）= 成約金額×3% + 成約件数×6万
      const totalCostYen = inflow * unitCost;              // 全反響件数 × 単価（円）
      const totalCostMan = totalCostYen / 10000;           // 万円換算
      const roiNum = totalCostMan > 0 && commission > 0 ? commission / totalCostMan : null;
      const roi    = roiNum;
      const roiStr = roiNum !== null ? roiNum.toFixed(2) : null;
      return { src, unitCost, inflow, wonCount, noPriceCount, totalAmt, avgAmt, commission, totalCostYen, totalCostMan, roi, roiStr };
    }),
    [sourceNames, filteredWonROI, custById, propsByCustomer, sources, bySource, periodROI]
  );

  const roiKpi = useMemo(() => {
    const totalAmt       = roiData.reduce((a, b) => a + b.totalAmt, 0);
    const totalWon       = roiData.reduce((a, b) => a + b.wonCount, 0);
    const avgAmt         = totalWon > 0 ? Math.round(totalAmt / totalWon) : 0;
    const totalCommission= roiData.reduce((a, b) => a + b.commission, 0);
    const topRoi         = [...roiData].filter(d => d.roi !== null).sort((a, b) => b.roi - a.roi)[0];
    const totalCostAll   = roiData.reduce((a, b) => a + b.totalCostMan, 0);
    const overallRoi     = totalCostAll > 0 ? totalCommission / totalCostAll : null;
    const totalNoPrice   = roiData.reduce((a, b) => a + b.noPriceCount, 0);   // 【A5-006】金額未入力の成約顧客数
    return { totalAmt, totalWon, avgAmt, topRoi, overallRoi, totalCommission, totalNoPrice };
  }, [roiData]);

  // 【A5-007】集計対象外になった成約履歴の可視化（StatusAnalysisReport の E4-008 と同方針）。
  //   ・orphan ……… 顧客リストに存在しない顧客IDの成約履歴（顧客削除後に履歴だけ残った等）
  //   ・unassigned … 顧客は居るが「流入元」がマスタ（sourceNames）に無い成約
  //   どちらも各セクションのどの行にも乗らず黙って消えるため、件数だけ表示して
  //   「合計が実感より少ない」原因を画面から追えるようにする（集計値は変えない）。
  const sourceNameSet = useMemo(() => new Set(sourceNames.map(srcKey)), [sourceNames]);
  const countExcludedWon = useCallback((entries) => {
    let orphan = 0, unassigned = 0;
    entries.forEach(h => {
      const c = custById[custKey(h["顧客ID"])];
      if (!c) { orphan++; return; }
      if (!sourceNameSet.has(srcKey(c["流入元"]))) unassigned++;
    });
    return { orphan, unassigned, total: orphan + unassigned };
  }, [custById, sourceNameSet]);
  const excludedCP  = useMemo(() => countExcludedWon(filteredWon),    [countExcludedWon, filteredWon]);
  const excludedROI = useMemo(() => countExcludedWon(filteredWonROI), [countExcludedWon, filteredWonROI]);

  // 対象外件数の注記行（0件のときは何も出さない）
  const ExcludedNote = ({ ex }) => ex.total === 0 ? null : (
    <div style={{
      fontSize: 11, color: "#92400E", background: "#FEF3C7", border: "1px solid #FDE68A",
      borderRadius: 8, padding: "8px 12px", marginBottom: 14, lineHeight: 1.7,
    }}>
      集計対象外の成約 {ex.total}件（
      {ex.unassigned > 0 && `流入元がマスタ未登録: ${ex.unassigned}件`}
      {ex.unassigned > 0 && ex.orphan > 0 && " ／ "}
      {ex.orphan > 0 && `顧客データなし: ${ex.orphan}件`}
      ）は下表のどの流入元にも含まれていません
    </div>
  );

  const maxRoiAmt  = Math.max(...roiData.map(d => d.totalAmt), 1);
  const maxRoiCost = Math.max(...roiData.map(d => d.totalCostMan), 1);

  // ── 新⑤：契約獲得力 ──────────────────────────────
  // 【E3-010】専任判定は契約種別マスタの「専任系」フラグを参照する。
  //   exclusiveContractTypes が配列で届いていればその名称集合（trim 突合）で判定し、
  //   旧GAS（キー未返却＝null/undefined）の間だけ従来の名称判定
  //   （「専任」を含む）へフォールバックして挙動互換を保つ。
  //   これにより契約種別の改名（例:「専任媒介契約」→「独占媒介」）では
  //   専任系カウントが変わらず、変えたいときは設定画面のチェックで明示する。
  const exclusiveSet = useMemo(
    () => Array.isArray(exclusiveContractTypes)
      ? new Set(exclusiveContractTypes.map(n => String(n).trim()))
      : null,
    [exclusiveContractTypes]
  );
  const isSenin = useCallback((contractType) => {
    const v = String(contractType || "").trim();
    if (!v) return false;
    return exclusiveSet ? exclusiveSet.has(v) : v.includes("専任");
  }, [exclusiveSet]);

  const contractPowerData = useMemo(() =>
    sourceNames.map(src => {
      const wonCusts = filteredWon
        .map(h => custById[custKey(h["顧客ID"])])
        .filter(c => c && srcKey(c["流入元"]) === srcKey(src));
      const total     = wonCusts.length;
      const seninCusts = wonCusts.filter(c => isSenin(c["契約種別"]));
      const ippanCusts = wonCusts.filter(c => !isSenin(c["契約種別"]) && (c["契約種別"] || "").trim() !== "");
      const seninCount = seninCusts.length;
      const withContract = wonCusts.filter(c => (c["契約種別"] || "").trim() !== "");
      const seninRate  = withContract.length > 0 ? Math.round((seninCount / withContract.length) * 100) : 0;
      // 【A5-002】金額は顧客単位で1回だけ集計（won履歴の重複による物件金額の
      //   二重加算を防ぐ）。件数系（total / seninCount 等）はイベント数のまま。
      const avgPrice = (custs) => {
        const ps = uniqCusts(custs).flatMap(c =>
          propsOf(c)
            .filter(p => p.contractPrice).map(p => parseMan(p.contractPrice))
        ).filter(v => v > 0);
        return ps.length > 0 ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : 0;
      };
      return {
        src, total, seninCount, ippanCount: ippanCusts.length,
        seninRate, seninAvgPrice: avgPrice(seninCusts), ippanAvgPrice: avgPrice(ippanCusts),
      };
    }),
    [sourceNames, filteredWon, custById, propsByCustomer, isSenin]
  );

  const cpKpi = useMemo(() => {
    const totalWon   = contractPowerData.reduce((a, b) => a + b.total, 0);
    const totalSenin = contractPowerData.reduce((a, b) => a + b.seninCount, 0);
    const overallRate = totalWon > 0 ? Math.round((totalSenin / totalWon) * 100) : 0;
    const topSrc = [...contractPowerData].filter(d => d.total > 0).sort((a, b) => b.seninRate - a.seninRate)[0];
    const allWonCusts = filteredWon
      .map(h => custById[custKey(h["顧客ID"])])
      .filter(Boolean);
    // 【E3-010 注記】この3分類バーは「一般/専任/専属専任」という固定ラベルの
    //   表示用内訳のため、意図的に名称文字列で分類したまま残している
    //   （改名した種別はどの枠にも入らない＝ラベルと値の対応を優先）。
    //   レポートの専任率・件数（contractPowerData / totalSenin / ランキング）は
    //   すべて上のフラグ判定 isSenin に統一済み。
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
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, overflowX: isMobile ? "auto" : undefined, WebkitOverflowScrolling: isMobile ? "touch" : undefined }}>
      <div style={{
        minWidth: isMobile ? 1100 : undefined,
        // 【レスポンシブ】本ページは約1100px前提のデザイン。モバイルは minWidth+横スクロールで
        //   原寸を保つが、中間幅(非モバイル)では圧縮されるため余白を段階的に縮めて実効幅を稼ぐ。
        padding: isMobile ? "40px 56px" : width < 1280 ? "24px 20px" : "40px 56px",
        maxWidth: "1100px", margin: "0 auto",
      }}>

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
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>流入経路評価</h1>
          </div>
          <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>
            流入元ごとのステータス到達数・費用対効果・成約金額ROI・契約獲得力
          </p>
        </header>

        {/* 【E3-015】自前fetch（getSourceWonEntries）だけでなく、App 側の全体データ
            （customers / sources / statuses）取得中もスピナーを出す。これを見ていないと
            props が空配列のまま表が描画され、「該当する成約データがありません」を
            誤表示してしまう。SourceManager.jsx:276-290 / GmailSettings.jsx:572-586 と同方針。 */}
        {(loadingWon || isLoading) ? (
          <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "64px 0", color: THEME.textMuted }}>
            <Loader2 size={32} color={THEME.primary} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 14, fontWeight: 800 }}>集計しています…</div>
            <div style={{ fontSize: 12 }}>初回はステータス履歴を集計するため時間がかかることがあります</div>
          </div>
        ) : (wonError || (loadError && customers.length === 0)) ? (
          /* 【E3-014】自前fetch（getSourceWonEntries）の失敗だけでなく、App 側の
             getAppData が失敗して props が空のまま確定したケースもエラー表示に倒す。
             これが無いと sourceNames=[] となり「該当する成約データがありません」
             （取得成功かつ0件と同じ文言）へ誤フォールバックする。 */
          <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "64px 0", color: THEME.textMuted }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>集計データを取得できませんでした</div>
            <div style={{ fontSize: 12 }}>ページを再読み込みしてお試しください</div>
          </div>
        ) : (
        <>
        {/* ── ⑤ 契約獲得力 ── */}
        <div style={card}>
          <SectionTitle color="#7C3AED">
            <span style={{ fontSize: 18 }}>🏆</span> 契約獲得力
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— 専任媒介契約の獲得率・成約金額比較</span>
          </SectionTitle>

          {/* 期間フィルター */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
            <MonthRangeFilter value={periodCP} onChange={setPeriodCP} min={wonMonthBounds.min} max={wonMonthBounds.max} />
          </div>

          {/* 【A5-007】JOIN落ちした成約履歴の可視化 */}
          <ExcludedNote ex={excludedCP} />

          {/* KPIカード */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {/* 左50%：2カード */}
            <div style={{ display: "flex", gap: 12, flex: "1 1 320px" }}>
              <KpiCard label="全体・専任媒介率" value={`${cpKpi.overallRate}%`} sub={`専任 ${cpKpi.totalSenin}件 / 計 ${cpKpi.totalWon}件`} color="#4F46E5" />
              <KpiCard label="専任率 No.1 流入元" value={cpKpi.topSrc ? cpKpi.topSrc.src : "−"} sub={cpKpi.topSrc ? `専任率 ${cpKpi.topSrc.seninRate}%` : undefined} color="#7C3AED" />
            </div>
            {/* 右50%：3種別の内訳カード */}
            <div style={{
              flex: "1 1 360px", background: "white", borderRadius: 12, border: `1px solid ${THEME.border}`,
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

          <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "220px 1fr", gap: 20 }}>

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
                      .map(h => custById[custKey(h["顧客ID"])])
                      .filter(c => c && srcKey(c["流入元"]) === srcKey(d.src));
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

          {/* 期間フィルター（【A5-005】成約月∪反響月の合成範囲。初期プリセット＝全期間と等価） */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
            <MonthRangeFilter value={periodROI} onChange={setPeriodROI} min={roiMonthBounds.min} max={roiMonthBounds.max} />
          </div>

          {/* 【A5-007】JOIN落ちした成約履歴の可視化 */}
          <ExcludedNote ex={excludedROI} />

          {/* 【A5-006】成約金額未入力の注記（3%分が未計上のままROIが表示されることの明示） */}
          {roiKpi.totalNoPrice > 0 && (
            <div style={{
              fontSize: 11, color: THEME.textMuted, background: THEME.bg,
              border: `1px solid ${THEME.border}`, borderRadius: 8,
              padding: "8px 12px", marginBottom: 14, lineHeight: 1.7,
            }}>
              成約金額が未入力の成約 {roiKpi.totalNoPrice}件：仲介手数料は件数分（6万円×件数）のみ計上され、
              成約金額×3% は含まれていません。物件の成約金額を入力すると反映されます。
            </div>
          )}

          {/* KPIカード */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <KpiCard label="仲介手数料合計（推定）" value={fmtMan(roiKpi.totalCommission)} sub={`成約金額合計 ${fmtMan(roiKpi.totalAmt)} の3% ＋ 6万×${roiKpi.totalWon}件`} color="#059669" />
            <KpiCard label="1成約あたり平均金額" value={roiKpi.avgAmt > 0 ? fmtMan(roiKpi.avgAmt) : "−"} sub="成約金額合計 ÷ 成約件数" />
            <KpiCard label="全体平均ROI" value={roiKpi.overallRoi ? roiKpi.overallRoi.toFixed(2) + "倍" : "−"} sub="仲介手数料合計 ÷ 広告費合計" color={roiKpi.overallRoi >= 1 ? "#1D6F42" : "#C0392B"} />
            <KpiCard label="ROI最高流入元" value={roiKpi.topRoi ? roiKpi.topRoi.src : "−"} sub={roiKpi.topRoi && roiKpi.topRoi.roi ? `${roiKpi.topRoi.roiStr}倍（標準比 ${Math.round(roiKpi.topRoi.roi / 8.3 * 100)}%）` : undefined} color="#185FA5" />
          </div>

          {/* 【レスポンシブ】fixed+%列の表は容器が狭いと列が広がれず文字が隣セルへ重なる。
              設計幅960pxを最低保証し、狭い環境では表単体の横スクロールで閲覧する。 */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse", tableLayout: "fixed" }}>
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
        </div>

        {/* ── ② 費用対効果 ── */}
        {costData.length > 0 && (
          <div style={card}>
            <SectionTitle color="#059669">
              <span style={{ fontSize: 18 }}>💰</span> 費用対効果
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— 総獲得コスト＝期間内の全反響件数×反響単価（コスト設定済みの流入元のみ表示）</span>
            </SectionTitle>

            {/* 期間フィルター */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
              <MonthRangeFilter value={periodCost} onChange={setPeriodCost} min={costMonthBounds.min} max={costMonthBounds.max} />
            </div>
            {/* 【レスポンシブ】極端な狭幅では横スクロールで保護（min 520px） */}
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 520 }}>
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
                      <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 4 }}>（反響{d.inflowCount}件 × {d.unitCost.toLocaleString()}円）</span>
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
            </div>
          </div>
        )}
        </>
        )}

      </div>
    </div>
  );
}