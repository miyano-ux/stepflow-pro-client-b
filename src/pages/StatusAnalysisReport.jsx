import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";
import { useWindowWidth } from "../lib/useWindowWidth";

const THEME = APP_THEME;
const COLORS = ["#4F46E5","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777","#EA580C"];

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function daysElapsed(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
// 【E4-011】流入元・ステータス名の突合キーは trim 正規化に統一する。
//   SourceReport.jsx:52（srcKey / A4-016）・KanbanBoard.jsx:1350-1356（E2-002）・
//   E3-009 で確立した「突合キーは必ず String()+trim()」の方針に本ページも揃える。
//   （旧実装は流入元だけ無 trim の完全一致だったため、前後空白入りの流入元値が
//     E-3 では集計され E-4 では「未設定扱い」になるレポート間不一致の温床だった）
function srcKey(v) { return String(v ?? "").trim(); }

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

function HBar({ value, maxVal, color, suffix = "" }) {
  const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: THEME.textMain, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>{suffix}</span>
      </div>
      <div style={{ width: "100%", backgroundColor: THEME.border, borderRadius: 6, overflow: "hidden", height: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function StatusAnalysisReport({
  customers = [],
  statuses = [],
  sources = [],
  staffList = [],
}) {
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff] = useState("");

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

  // ── 【E4-004/E4-005 仕様確定 2026-08-29】ファネル判定用のマスタ索引 ──────
  // 到達件数は「現在ステータス基準のファネル方式」（ステータス履歴シート非依存。
  // Z-002 未解消でも過去データに即適用できることを優先した設計決定）。
  //   到達(S) = 現在の対応ステータスが
  //     (a) S 自身
  //     (b) S よりカンバン右側のフローステータス（契約固定 isFixed 含む）
  //     (c) 成約（terminalType === "won"）… 全段階を通過したとみなす
  //   のいずれか。失注・休眠は現在値からは到達段階を判定できないため分子に含めない
  //   （率は保守的＝低めに出ることを許容）。除外(excluded)は分子・分母とも対象外。
  // 「右側」の判定: statuses は App.jsx:182-183 で並び順(order)ソート済みのため、
  // 通常フロー（terminalType が空）だけを抜き出した配列の index 大小がそのまま
  // カンバンの左右（KanbanBoard の上部フロー列順）に一致する。
  const flowIndexByName = useMemo(() => {
    const m = new Map();
    statuses.filter(s => !s.terminalType).forEach((s, i) => m.set((s.name || "").trim(), i));
    return m;
  }, [statuses]);
  const wonNames = useMemo(
    () => new Set(statuses.filter(s => s.terminalType === "won").map(s => (s.name || "").trim())),
    [statuses]
  );
  const excludedNames = useMemo(
    () => new Set(statuses.filter(s => s.terminalType === "excluded").map(s => (s.name || "").trim())),
    [statuses]
  );

  const sourceNames = useMemo(() =>
    sources.length > 0
      ? sources.map(s => s.name)
      : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))],
    [sources, customers]
  );

  const filteredCustomers = useMemo(() =>
    filterStaff ? customers.filter(c => c["担当者メール"] === filterStaff) : customers,
    [customers, filterStaff]
  );

  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => {
      map[src] = filteredCustomers.filter(c => srcKey(c["流入元"]) === srcKey(src));
    });
    return map;
  }, [filteredCustomers, sourceNames]);

  // 【E4-008】流入元がマスタに無い顧客（空欄・削除済み流入元）は記事の仕様どおり集計対象外。
  //   ただし「何件が対象外なのか」を画面から把握できるよう件数だけ算出して表示する。
  //   判定は bySource（上）の裏返しにするため、比較条件（trim 済みキー）を完全に揃える。
  const sourceNameSet = useMemo(() => new Set(sourceNames.map(srcKey)), [sourceNames]);
  const unassigned = useMemo(
    () => filteredCustomers.filter(c => !sourceNameSet.has(srcKey(c["流入元"]))),
    [filteredCustomers, sourceNameSet]
  );

  const statusData = useMemo(() =>
    reportStatuses.map((st, si) => {
      const stName = (st.name || "").trim();
      const stIdx  = flowIndexByName.has(stName) ? flowIndexByName.get(stName) : null;

      // 到達判定（ファネル方式・仕様確定メモ 2026-08-29）
      //   フローステータス: S自身 or Sより右のフロー or 成約(won) なら到達。
      //   終点ステータス（won/dormant/lost）のカード: 「右側」が定義できないため
      //   従来どおり現在在籍（名称完全一致・trim 済み）のみを到達とする。
      const isReached = (c) => {
        const cur = (c["対応ステータス"] || "").trim();
        if (cur === stName) return true;
        if (stIdx === null) return false;              // 終点カードは在籍一致のみ
        if (wonNames.has(cur)) return true;            // 成約は全段階を通過したとみなす
        const ci = flowIndexByName.get(cur);
        return ci !== undefined && ci > stIdx;         // Sより右のフローに在籍＝通過済み
      };

      const rows = sourceNames.map(src => {
        const list = bySource[src] || [];
        // 【E4-005】到達率の分母 ＝ その流入元の全顧客数（累計・期間フィルタなし）。
        //   除外(excluded)ステータス在籍の顧客のみ、分母からも除く（設計決定事項どおり
        //   excluded は常にレポート対象外）。失注・休眠は分母に含める（分子除外・分母算入）。
        const denomList = list.filter(c => !excludedNames.has((c["対応ステータス"] || "").trim()));
        const total = denomList.length;

        // 【E4-004】到達件数（ファネル方式）と到達率 ＝ 到達件数 ÷ 分母 × 100。
        //   丸めは従来どおり描画側で Math.round（四捨五入・整数%）。
        const count = denomList.filter(isReached).length;
        const rate  = total > 0 ? (count / total) * 100 : 0;

        // 【E4-006 仕様確定】平均滞在日数 ＝「現在このステータスに在籍している顧客」の
        //   ステータス変更日（無ければ登録日）→ 今日 の平均経過日数（現行計算を維持し
        //   名称のみ変更）。到達件数のファネル拡大（右側・成約の加算）は本指標には
        //   波及させない：通過済み顧客を混ぜると「このステータスでの滞在」の意味が
        //   壊れるため、母集団を在籍中のみに固定する。
        const current = list.filter(c => (c["対応ステータス"] || "").trim() === stName);
        const daysList = current
          .map(c => daysElapsed(c["ステータス変更日"] || c["登録日"]))
          .filter(d => d !== null);
        const avgDays = daysList.length ? avg(daysList) : null;

        return { src, count, total, rate, avgDays };
      });
      const maxCount = Math.max(...rows.map(d => d.count), 1);
      const grandTotal = rows.reduce((s, d) => s + d.count, 0);
      // 【E4-008】流入元マスタに無い顧客のうち、このステータスに到達している件数（集計対象外）。
      //   到達の定義は本体と同じファネル方式に揃える（除外ステータス在籍も同様に対象外）。
      const excludedCount = unassigned
        .filter(c => !excludedNames.has((c["対応ステータス"] || "").trim()))
        .filter(isReached).length;
      return { status: st.name, rows, maxCount, grandTotal, excludedCount, color: COLORS[si % COLORS.length] };
    }),
    [reportStatuses, sourceNames, bySource, unassigned, flowIndexByName, wonNames, excludedNames]
  );

  // 担当者リスト（staffList 未指定時は顧客データのメールから補完してフィルターを必ず表示）
  const effectiveStaffList = useMemo(() => {
    if (staffList.length > 0) return staffList;
    return [...new Set(customers.map(c => c["担当者メール"]).filter(Boolean))]
      .map(email => ({ email, lastName: email, firstName: "" }));
  }, [staffList, customers]);

  const { isMobile } = useWindowWidth();

  const colHd = (align = "left") => ({
    fontSize: 13, fontWeight: 800, color: THEME.textMain,
    paddingBottom: 8, borderBottom: `2px solid ${THEME.border}`, textAlign: align,
  });

  const card = {
    backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`,
    padding: isMobile ? "18px 16px" : "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: isMobile ? "20px 16px" : "40px 56px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ヘッダー */}
        <button
          onClick={() => navigate("/analysis")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
            cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 14, padding: 0 }}
        >
          <ChevronLeft size={16} /> レポート一覧に戻る
        </button>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 14 : 0, marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={26} color="#0891B2" />
            <div>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>営業ステータス分析</h1>
              <p style={{ color: THEME.textMuted, fontSize: 13, margin: "4px 0 0" }}>
                流入元ごとの到達件数・到達率・平均滞在日数
              </p>
            </div>
          </div>
          {effectiveStaffList.length > 0 && (
            <StaffDropdown
              staffList={effectiveStaffList}
              value={filterStaff}
              onChange={setFilterStaff}
            />
          )}
        </div>

        {/* 【E4-008】集計対象外（流入元がマスタに無い顧客）の件数表示 */}
        {unassigned.length > 0 && (
          <div style={{
            backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, fontWeight: 700,
          }}>
            流入元が未設定（またはマスタ未登録）の顧客 {unassigned.length} 件は、本レポートの集計対象外です。
          </div>
        )}

        {/* ステータス別グラフ */}
        {reportStatuses.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: THEME.textMuted, padding: 60 }}>
            ステータス設定で「レポート集計」を有効にしたステータスがありません
          </div>
        ) : (
          statusData.map(sg => (
            <div key={sg.status} style={card}>
              <SectionTitle color={sg.color}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, backgroundColor: sg.color }} />
                {sg.status}
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>
                  合計 {sg.grandTotal} 件到達
                  {sg.excludedCount > 0 && (
                    <span style={{ color: "#B45309", marginLeft: 8 }}>
                      （流入元未設定 {sg.excludedCount} 件は対象外）
                    </span>
                  )}
                </span>
              </SectionTitle>

              {/* データテーブル（モバイルは横スクロール） */}
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: 600 }}>
                  {/* カラムヘッダー
                      【仕様確定 2026-08-29】
                      ・到達件数: ファネル方式（在籍＋右側フロー＋成約）
                      ・到達率: 到達件数 ÷ 流入元の全顧客数（旧「到達割合（流入総数比）」を置換）
                      ・平均滞在日数: 旧「平均到達日数」を改名（計算は現行維持） */}
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 96px", columnGap: 16, marginBottom: 4 }}>
                    <div />
                    <div style={colHd()}>到達件数</div>
                    <div style={colHd()}>到達率（流入元の全顧客比）</div>
                    <div style={{ ...colHd("right") }}>平均滞在日数</div>
                  </div>

                  {/* データ行 */}
                  {sg.rows.map((d, ri) => {
                    const isEven = ri % 2 === 0;
                    const rowBg = isEven ? THEME.bg : "white";
                    const cs = { backgroundColor: rowBg, padding: "12px 12px", display: "flex", alignItems: "center" };
                    return (
                      <div key={d.src} style={{
                        display: "grid", gridTemplateColumns: "140px 1fr 1fr 96px",
                        columnGap: 0, marginBottom: 2, borderRadius: 8, overflow: "hidden",
                        border: isEven ? `1px solid ${THEME.border}` : "1px solid transparent",
                      }}>
                        <div style={{ ...cs, justifyContent: "flex-end", borderRadius: "8px 0 0 8px" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                            {d.src}
                          </span>
                        </div>
                        <div style={{ ...cs, paddingLeft: 16 }}>
                          <HBar value={d.count} maxVal={sg.maxCount} color={sg.color} suffix={`件 / ${d.total}件中`} />
                        </div>
                        <div style={{ ...cs, paddingLeft: 8 }}>
                          <HBar value={Math.round(d.rate)} maxVal={100} color={sg.color} suffix="%" />
                        </div>
                        <div style={{ ...cs, justifyContent: "flex-end", borderRadius: "0 8px 8px 0", paddingRight: 16 }}>
                          {d.avgDays != null ? (
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 22, fontWeight: 900, color: sg.color, lineHeight: 1 }}>
                                {d.avgDays.toFixed(1)}
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 4 }}>日</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 18, color: THEME.textMuted }}>–</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}