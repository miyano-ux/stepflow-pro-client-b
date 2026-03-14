import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";

const THEME = APP_THEME;
const COLORS = ["#4F46E5","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777","#EA580C"];

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function daysElapsed(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── セクション見出し ──────────────────────────────────
function SectionTitle({ children, color }) {
  return (
    <div style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain, marginBottom: 18,
      paddingBottom: 12, borderBottom: `2px solid ${color || THEME.border}`,
      display: "flex", alignItems: "center", gap: 8 }}>
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
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color,
          borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── メイン ────────────────────────────────────────────
export default function SourceReport({ customers = [], statuses = [], sources = [], contractTypes = [] }) {
  const navigate = useNavigate();

  const reportStatuses = statuses.filter(s => s.reportCount);

  const sourceNames = sources.length > 0
    ? sources.map(s => s.name)
    : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))];

  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => { map[src] = customers.filter(c => (c["流入元"] || "") === src); });
    return map;
  }, [customers, sourceNames]);

  // ── 契約種別データ ──
  const contractData = useMemo(() => {
    return sourceNames.map(src => {
      const list = bySource[src] || [];
      const specified = list.filter(c => (c["契約種別"] || "").trim() !== "");
      const total = specified.length;
      const counts = contractTypes.map((ct, i) => {
        const count = specified.filter(c => (c["契約種別"] || "").trim() === ct).length;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return { ct, count, pct, color: COLORS[i % COLORS.length] };
      }).filter(d => d.count > 0);
      return { src, total, counts, allTotal: list.length };
    });
  }, [sourceNames, bySource, contractTypes]);

  // ── ステータス別グラフデータ ──
  const statusData = useMemo(() =>
    reportStatuses.map((st, si) => {
      const rows = sourceNames.map(src => {
        const list = bySource[src] || [];
        const reached = list.filter(c => (c["対応ステータス"] || "").trim() === st.name);
        const count = reached.length;
        const total = list.length;
        const daysList = reached
          .map(c => daysElapsed(c["ステータス変更日"] || c["登録日"]))
          .filter(d => d !== null);
        const avgDays = daysList.length ? avg(daysList) : null;
        return { src, count, total, avgDays };
      });
      const maxCount = Math.max(...rows.map(d => d.count), 1);
      const grandTotal = rows.reduce((s, d) => s + d.count, 0);
      return { status: st.name, rows, maxCount, grandTotal, color: COLORS[si % COLORS.length] };
    }),
    [reportStatuses, sourceNames, bySource]
  );

  // カラムヘッダースタイル
  // ── 費用対効果データ ──
  const costData = useMemo(() => {
    // wonステータスの顧客を「成約」としてカウント
    const wonStatusNames = statuses
      .filter(s => s.terminalType === "won")
      .map(s => s.name);

    return sourceNames.map(src => {
      const list = bySource[src] || [];
      const cost = (sources.find(s => s.name === src) || {}).cost || 0;
      const wonCount = list.filter(c =>
        wonStatusNames.includes((c["対応ステータス"] || "").trim())
      ).length;
      const totalCount = list.length;
      const costPerWon = wonCount > 0 ? Math.round(cost / wonCount) : null;
      return { src, cost, totalCount, wonCount, costPerWon };
    }).filter(d => d.cost > 0); // コスト未設定は除外
  }, [sourceNames, bySource, sources, statuses]);

  const maxCost       = Math.max(...costData.map(d => d.cost), 1);
  const maxCostPerWon = Math.max(...costData.map(d => d.costPerWon ?? 0), 1);

  const colHd = (align = "left") => ({
    fontSize: 13, fontWeight: 800, color: THEME.textMain,
    paddingBottom: 8, borderBottom: `2px solid ${THEME.border}`,
    textAlign: align,
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 56px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ヘッダー */}
        <header style={{ marginBottom: 36 }}>
          <button onClick={() => navigate("/analysis")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 14, padding: 0 }}>
            <ChevronLeft size={16} /> レポート一覧に戻る
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <GitBranch size={26} color="#0891B2" />
            <h1 style={{ fontSize: 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>流入経路評価</h1>
          </div>
          <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>流入元ごとのステータス到達数・割合・平均日数・契約種別</p>
        </header>

        {/* ── ① 流入元 × 契約種別 ── */}
        {contractTypes.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <SectionTitle color="#0891B2">
              <span style={{ fontSize: 18 }}>📋</span> 流入元 × 契約種別
            </SectionTitle>

            {/* 凡例 */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              {contractTypes.map((ct, i) => (
                <div key={ct} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i % COLORS.length], display: "inline-block" }} />
                  {ct}
                </div>
              ))}
              <div style={{ fontSize: 11, color: THEME.textMuted, marginLeft: "auto" }}>※ 契約種別未指定は除く</div>
            </div>

            {/* グリッド */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 88px", rowGap: 8, alignItems: "center" }}>
              {contractData.map((row, ri) => (
                <React.Fragment key={row.src}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: THEME.textMain,
                    paddingRight: 12, textAlign: "right",
                    gridColumn: "1", alignSelf: "center",
                    padding: "8px 12px 8px 0",
                    backgroundColor: ri % 2 === 0 ? "#F8FAFC" : "transparent",
                    borderRadius: "6px 0 0 6px",
                  }}>
                    {row.src}
                  </div>

                  {/* 100%積み上げバー */}
                  <div style={{
                    height: 36, display: "flex", borderRadius: 6, overflow: "hidden",
                    backgroundColor: "#F1F5F9",
                    margin: "0",
                    backgroundColor: ri % 2 === 0 ? "#F8FAFC" : "transparent",
                    padding: "4px 0",
                  }}>
                    <div style={{ flex: 1, display: "flex", borderRadius: 6, overflow: "hidden", backgroundColor: "#EEF2FF" }}>
                      {row.total === 0 ? (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 11, color: THEME.textMuted }}>データなし</div>
                      ) : (
                        row.counts.map(d => (
                          <div key={d.ct} title={`${d.ct}: ${d.count}件 (${Math.round(d.pct)}%)`}
                            style={{ width: `${d.pct}%`, height: "100%", backgroundColor: d.color,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              overflow: "hidden", transition: "width 0.6s ease" }}
                          >
                            {d.pct >= 10 && (
                              <span style={{ fontSize: 11, fontWeight: 900, color: "white",
                                whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                                {Math.round(d.pct)}%
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 合計件数 */}
                  <div style={{
                    textAlign: "right", paddingLeft: 14,
                    backgroundColor: ri % 2 === 0 ? "#F8FAFC" : "transparent",
                    borderRadius: "0 6px 6px 0", padding: "8px 0 8px 14px",
                  }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: THEME.textMain, lineHeight: 1 }}>{row.total}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginLeft: 3 }}>件</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── ② 費用対効果 ── */}
        {costData.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <SectionTitle color="#059669">
              <span style={{ fontSize: 18 }}>💰</span> 費用対効果
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>— コスト設定済みの流入元のみ表示</span>
            </SectionTitle>

            {/* カラムヘッダー */}
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", columnGap: 24, marginBottom: 8 }}>
              <div />
              <div style={colHd()}>総獲得コスト</div>
              <div style={colHd()}>1成約あたりのコスト</div>
            </div>

            {/* データ行 */}
            {costData.map((d, ri) => {
              const isEven = ri % 2 === 0;
              const rowBg = isEven ? "#F0FDF4" : "white";
              const cellStyle = { backgroundColor: rowBg, padding: "12px 12px", display: "flex", alignItems: "center" };
              return (
                <div key={d.src} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", columnGap: 0, marginBottom: 2, borderRadius: 8, overflow: "hidden", border: isEven ? "1px solid #D1FAE5" : "1px solid transparent" }}>
                  {/* 流入元 */}
                  <div style={{ ...cellStyle, justifyContent: "flex-end", borderRadius: "8px 0 0 8px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{d.src}</span>
                  </div>
                  {/* 総獲得コスト */}
                  <div style={{ ...cellStyle, flexDirection: "column", alignItems: "flex-start", gap: 6, paddingLeft: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: "#059669", lineHeight: 1 }}>
                        {d.cost.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>円</span>
                    </div>
                    <div style={{ width: "100%", backgroundColor: "#D1FAE5", borderRadius: 6, overflow: "hidden", height: 16 }}>
                      <div style={{ width: `${Math.max((d.cost / maxCost) * 100, d.cost > 0 ? 3 : 0)}%`, height: "100%", backgroundColor: "#059669", borderRadius: 6, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                  {/* 1成約あたりのコスト */}
                  <div style={{ ...cellStyle, flexDirection: "column", alignItems: "flex-start", gap: 6, paddingLeft: 16, borderRadius: "0 8px 8px 0" }}>
                    {d.costPerWon != null ? (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: "#0891B2", lineHeight: 1 }}>
                            {d.costPerWon.toLocaleString()}
                          </span>
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

        {/* ── ③ ステータス別グラフ ── */}
        {reportStatuses.length === 0 ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 40, textAlign: "center", color: THEME.textMuted }}>
            ステータス設定で「レポート集計」を有効にしたステータスがありません
          </div>
        ) : (
          statusData.map(sg => (
            <div key={sg.status} style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <SectionTitle color={sg.color}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, backgroundColor: sg.color }} />
                {sg.status}
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMuted, marginLeft: 8 }}>
                  合計 {sg.grandTotal} 件到達
                </span>
              </SectionTitle>

              {/* カラムヘッダー */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 96px", columnGap: 16, marginBottom: 4, paddingLeft: 0 }}>
                <div />
                <div style={colHd()}>到達件数</div>
                <div style={colHd()}>到達割合（流入総数比）</div>
                <div style={{ ...colHd("right") }}>平均到達日数</div>
              </div>

              {/* データ行 */}
              {sg.rows.map((d, ri) => {
                // 到達割合：流入総数（全ソースの到達合計）比で最大値を100%とする
                const totalReached = sg.grandTotal;
                const pctOfTotal = totalReached > 0 ? (d.count / totalReached) * 100 : 0;
                const maxPct = 100; // 最大値が100%
                const isEven = ri % 2 === 0;
                const rowBg = isEven ? "#F8FAFC" : "white";
                const cellStyle = { backgroundColor: rowBg, padding: "12px 12px", display: "flex", alignItems: "center" };

                return (
                  <div key={d.src} style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 1fr 96px",
                    columnGap: 0,
                    marginBottom: 2,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: isEven ? "1px solid #EEF2FF" : "1px solid transparent",
                  }}>
                    {/* 流入元ラベル */}
                    <div style={{ ...cellStyle, justifyContent: "flex-end", borderRadius: "8px 0 0 8px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                        {d.src}
                      </span>
                    </div>

                    {/* 到達件数 */}
                    <div style={{ ...cellStyle, paddingLeft: 16 }}>
                      <HBar value={d.count} maxVal={sg.maxCount} color={sg.color} suffix="件" />
                    </div>

                    {/* 到達割合（流入総数比） */}
                    <div style={{ ...cellStyle, paddingLeft: 8 }}>
                      <HBar value={Math.round(pctOfTotal)} maxVal={maxPct} color={sg.color} suffix="%" />
                    </div>

                    {/* 平均到達日数（バーなし・大きく） */}
                    <div style={{ ...cellStyle, justifyContent: "flex-end", borderRadius: "0 8px 8px 0", paddingRight: 16 }}>
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
          ))
        )}

      </div>
    </div>
  );
}