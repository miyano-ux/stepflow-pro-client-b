import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";

const THEME = APP_THEME;

const COLORS = ["#4F46E5","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777","#EA580C"];
const ROW_H = 32; // 各データ行の高さ

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function daysElapsed(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── 水平バー（汎用） ──────────────────────────────────
function HBar({ value, maxVal, color, suffix = "" }) {
  const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: ROW_H }}>
      <div style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", height: 18 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ minWidth: 56, textAlign: "right", fontSize: 12, fontWeight: 800, color: THEME.textMain }}>
        {value}{suffix}
      </div>
    </div>
  );
}

// ── セクション見出し ──────────────────────────────────
function SectionTitle({ children, color }) {
  return (
    <div style={{ fontSize: 16, fontWeight: 900, color: THEME.textMain, marginBottom: 18, paddingBottom: 12, borderBottom: `2px solid ${color || THEME.border}`, display: "flex", alignItems: "center", gap: 8 }}>
      {children}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────
export default function SourceReport({ customers = [], statuses = [], sources = [], contractTypes = [] }) {
  const navigate = useNavigate();

  // レポート集計チェック済みのステータス（reportCount を単一フラグとして使用）
  const reportStatuses = statuses.filter(s => s.reportCount);

  // 流入元の順序
  const sourceNames = sources.length > 0
    ? sources.map(s => s.name)
    : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))];

  // 流入元ごとの顧客リスト
  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => { map[src] = customers.filter(c => (c["流入元"] || "") === src); });
    return map;
  }, [customers, sourceNames]);

  // ── ① 流入元 × 契約種別データ ──
  const contractData = useMemo(() => {
    return sourceNames.map(src => {
      const list = bySource[src] || [];
      // 契約種別が未指定でないものだけ集計
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

  // ── ② ステータス別グラフデータ（3カラム） ──
  const statusData = useMemo(() =>
    reportStatuses.map((st, si) => {
      const rows = sourceNames.map(src => {
        const list = bySource[src] || [];
        const reached = list.filter(c => (c["対応ステータス"] || "").trim() === st.name);
        const count = reached.length;
        const total = list.length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const daysList = reached
          .map(c => daysElapsed(c["ステータス変更日"] || c["登録日"]))
          .filter(d => d !== null);
        const avgDays = daysList.length ? avg(daysList) : null;
        return { src, count, total, pct, avgDays };
      });
      const maxCount = Math.max(...rows.map(d => d.count), 1);
      const maxDays  = Math.max(...rows.map(d => d.avgDays ?? 0), 1);
      return { status: st.name, rows, maxCount, maxDays, color: COLORS[si % COLORS.length] };
    }),
    [reportStatuses, sourceNames, bySource]
  );

  const colLabelStyle = { fontSize: 11, fontWeight: 800, color: THEME.textMuted, paddingBottom: 6, borderBottom: `1px solid ${THEME.border}`, marginBottom: 4 };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 56px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* ヘッダー */}
        <header style={{ marginBottom: 36 }}>
          <button onClick={() => navigate("/analysis")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, fontWeight: 800, fontSize: 13, marginBottom: 14, padding: 0 }}>
            <ChevronLeft size={16} /> レポート一覧に戻る
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <GitBranch size={26} color="#0891B2" />
            <h1 style={{ fontSize: 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>流入経路評価</h1>
          </div>
          <p style={{ color: THEME.textMuted, fontSize: 13, margin: 0 }}>流入元ごとのステータス到達率・到達期間・契約種別割合</p>
        </header>

        {/* ── ① 流入元 × 契約種別（上部） ── */}
        {contractTypes.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <SectionTitle color="#0891B2">
              <span style={{ fontSize: 18 }}>📋</span> 流入元 × 契約種別
            </SectionTitle>

            {/* 凡例 */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              {contractTypes.map((ct, i) => (
                <div key={ct} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i % COLORS.length], display: "inline-block" }} />
                  {ct}
                </div>
              ))}
              <div style={{ fontSize: 11, color: THEME.textMuted, marginLeft: "auto", alignSelf: "center" }}>※ 契約種別未指定は除く</div>
            </div>

            {/* グリッド：ラベル | 積み上げバー100% | 合計件数 */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px", rowGap: 10, alignItems: "center" }}>
              {contractData.map(row => (
                <React.Fragment key={row.src}>
                  {/* 流入元ラベル */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain, paddingRight: 10, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.src}
                  </div>

                  {/* 100%積み上げバー */}
                  <div style={{ position: "relative", height: ROW_H, display: "flex", borderRadius: 6, overflow: "hidden", backgroundColor: "#F1F5F9" }}>
                    {row.total === 0 ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 11, color: THEME.textMuted }}>データなし</div>
                    ) : (
                      row.counts.map(d => (
                        <div
                          key={d.ct}
                          title={`${d.ct}: ${d.count}件 (${Math.round(d.pct)}%)`}
                          style={{ width: `${d.pct}%`, height: "100%", backgroundColor: d.color, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "width 0.6s ease" }}
                        >
                          {/* セグメント内テキスト（十分な幅があれば） */}
                          {d.pct >= 12 && (
                            <span style={{ fontSize: 11, fontWeight: 900, color: "white", whiteSpace: "nowrap", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                              {Math.round(d.pct)}%
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* 合計件数（大きく） */}
                  <div style={{ textAlign: "right", paddingLeft: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: THEME.textMain }}>{row.total}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.textMuted, marginLeft: 3 }}>件</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── ② ステータス別グラフ（3カラム: 到達件数 / 到達割合 / 平均到達日数） ── */}
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
              </SectionTitle>

              {/* グリッド：流入元ラベル | 到達件数 | 到達割合 | 平均到達日数 */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr", columnGap: 24, rowGap: 0, alignItems: "center" }}>

                {/* ヘッダー行 */}
                <div />
                <div style={colLabelStyle}>到達件数</div>
                <div style={colLabelStyle}>到達割合（流入元比）</div>
                <div style={colLabelStyle}>平均到達日数</div>

                {/* データ行 */}
                {sg.rows.map(d => (
                  <React.Fragment key={d.src}>
                    {/* 流入元ラベル */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain, height: ROW_H, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {d.src}
                    </div>

                    {/* 到達件数 */}
                    <HBar value={d.count} maxVal={sg.maxCount} color={sg.color} suffix="件" />

                    {/* 到達割合 */}
                    <HBar value={d.pct} maxVal={100} color={sg.color} suffix="%" />

                    {/* 平均到達日数 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, height: ROW_H }}>
                      <div style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", height: 18 }}>
                        <div style={{
                          width: d.avgDays != null ? `${Math.max((d.avgDays / sg.maxDays) * 100, 3)}%` : "0%",
                          height: "100%",
                          backgroundColor: sg.color,
                          opacity: 0.65,
                          borderRadius: 6,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                      <div style={{ minWidth: 56, textAlign: "right", fontSize: 12, fontWeight: 800, color: THEME.textMain }}>
                        {d.avgDays != null ? `${Math.round(d.avgDays)}日` : "–"}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}