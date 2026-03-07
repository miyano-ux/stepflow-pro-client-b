import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, ChevronLeft } from "lucide-react";
import { THEME as APP_THEME } from "../lib/constants";

const THEME = APP_THEME;
const BAR_H = 36; // 各行の高さ(px)
const ROW_GAP = 10;

// ── ユーティリティ ────────────────────────────────────
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function daysElapsed(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// 共通カラー
const COLORS = ["#4F46E5","#0891B2","#059669","#D97706","#DC2626","#7C3AED","#DB2777","#EA580C"];

// ── 水平バー（件数割合） ─────────────────────────────
function HBar({ value, maxVal, color, label, total }) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const rate = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", height: BAR_H, gap: 10 }}>
      <div style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", height: 20 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ minWidth: 70, textAlign: "right", fontSize: 12, fontWeight: 800, color: THEME.textMain }}>
        {value}件 <span style={{ color: THEME.textMuted, fontWeight: 600 }}>({rate}%)</span>
      </div>
    </div>
  );
}

// ── 到達期間バー（日数） ─────────────────────────────
function DayBar({ days, maxDays, color }) {
  const pct = maxDays > 0 ? Math.min((days / maxDays) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", height: BAR_H, gap: 10 }}>
      <div style={{ flex: 1, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden", height: 20 }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, opacity: 0.7, borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ minWidth: 70, textAlign: "right", fontSize: 12, fontWeight: 800, color: THEME.textMain }}>
        {days !== null ? `${Math.round(days)}日` : "–"}
      </div>
    </div>
  );
}

// ── 縦軸ラベル列 ─────────────────────────────────────
function YAxis({ sources }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {sources.map((src, i) => (
        <div key={src} style={{ height: BAR_H + ROW_GAP, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{src}</span>
        </div>
      ))}
    </div>
  );
}

// ── グラフブロック（タイトル + バー群） ─────────────
function ChartBlock({ title, subtitle, children, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: THEME.textMain }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── セクションタイトル ────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 17, fontWeight: 900, color: THEME.textMain, marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 8 }}>
      {children}
    </div>
  );
}

// ── メイン ────────────────────────────────────────────
export default function SourceReport({ customers = [], statuses = [], sources = [], contractTypes = [] }) {
  const navigate = useNavigate();

  // 件数集計対象ステータス
  const countStatuses  = statuses.filter(s => s.reportCount);
  // 到達率集計対象ステータス
  const arrivalStatuses = statuses.filter(s => s.reportArrival);

  // 流入元の順序（sources設定の順）
  const sourceNames = sources.length > 0
    ? sources.map(s => s.name)
    : [...new Set(customers.map(c => c["流入元"]).filter(Boolean))];

  // 流入元ごとの顧客リスト（キャッシュ）
  const bySource = useMemo(() => {
    const map = {};
    sourceNames.forEach(src => { map[src] = customers.filter(c => (c["流入元"] || "") === src); });
    return map;
  }, [customers, sourceNames]);

  // ── 件数グラフデータ ──
  const countGraphs = useMemo(() =>
    countStatuses.map((st, si) => {
      const data = sourceNames.map(src => {
        const list = bySource[src] || [];
        const count = list.filter(c => (c["対応ステータス"] || "").trim() === st.name).length;
        return { src, count, total: list.length };
      });
      const maxVal = Math.max(...data.map(d => d.count), 1);
      return { status: st.name, data, maxVal, color: COLORS[si % COLORS.length] };
    }),
    [countStatuses, sourceNames, bySource]
  );

  // ── 到達期間グラフデータ ──
  const arrivalGraphs = useMemo(() =>
    arrivalStatuses.map((st, si) => {
      const data = sourceNames.map(src => {
        const list = bySource[src] || [];
        const reached = list.filter(c => (c["対応ステータス"] || "").trim() === st.name);
        // ステータス変更日 or 登録日からの経過日数平均
        const daysList = reached.map(c => daysElapsed(c["ステータス変更日"] || c["登録日"])).filter(d => d !== null);
        return { src, days: daysList.length ? avg(daysList) : null };
      });
      const maxDays = Math.max(...data.map(d => d.days ?? 0), 1);
      return { status: st.name, data, maxDays, color: COLORS[si % COLORS.length] };
    }),
    [arrivalStatuses, sourceNames, bySource]
  );

  // ── 契約種別割合データ ──
  const contractData = useMemo(() => {
    return sourceNames.map(src => {
      const list = bySource[src] || [];
      const total = list.length;
      const counts = contractTypes.map(ct => ({
        ct,
        count: list.filter(c => (c["契約種別"] || "") === ct).length,
        pct: total > 0 ? Math.round(list.filter(c => (c["契約種別"] || "") === ct).length / total * 100) : 0,
      }));
      return { src, total, counts };
    });
  }, [sourceNames, bySource, contractTypes]);

  const maxContractTotal = Math.max(...contractData.map(d => d.total), 1);

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

        {/* ── ① ステータス別グラフ（件数 + 到達期間） ── */}
        {countStatuses.length === 0 ? (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 40, textAlign: "center", color: THEME.textMuted, marginBottom: 32 }}>
            ステータス設定で「件数（数字の積み上げ）」を集計対象にしたステータスがありません
          </div>
        ) : (
          countStatuses.map((st, si) => {
            const cg = countGraphs[si];
            const ag = arrivalGraphs.find(g => g.status === st.name);
            return (
              <div key={st.name} style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <SectionTitle>
                  <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, backgroundColor: cg.color, marginRight: 4 }} />
                  {st.name}
                </SectionTitle>
                <div style={{ display: "flex", gap: 32 }}>
                  {/* 縦軸ラベル */}
                  <YAxis sources={sourceNames} />
                  {/* 件数グラフ */}
                  <ChartBlock title="ステータス到達件数" subtitle="（流入元を母数とした割合）" color={cg.color}>
                    {cg.data.map(d => (
                      <HBar key={d.src} value={d.count} maxVal={cg.maxVal} color={cg.color} total={d.total} />
                    ))}
                  </ChartBlock>
                  {/* 到達期間グラフ（同じステータスのみ） */}
                  {ag ? (
                    <ChartBlock title="平均到達期間" subtitle="（登録日〜ステータス到達の平均日数）" color={ag.color}>
                      {ag.data.map(d => (
                        <DayBar key={d.src} days={d.days} maxDays={ag.maxDays} color={ag.color} />
                      ))}
                    </ChartBlock>
                  ) : <div style={{ flex: 1 }} />}
                </div>
              </div>
            );
          })
        )}

        {/* ── ② 契約種別割合 ── */}
        {contractTypes.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: 16, border: `1px solid ${THEME.border}`, padding: "28px 32px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <SectionTitle>
              📋 流入元 × 契約種別
            </SectionTitle>
            <div style={{ display: "flex", gap: 32 }}>
              <YAxis sources={sourceNames} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 凡例 */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                  {contractTypes.map((ct, i) => (
                    <div key={ct} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i % COLORS.length], display: "inline-block" }} />
                      {ct}
                    </div>
                  ))}
                </div>
                {/* 積み上げバー */}
                {contractData.map(row => (
                  <div key={row.src} style={{ height: BAR_H + ROW_GAP, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, display: "flex", height: 20, borderRadius: 6, overflow: "hidden", backgroundColor: "#F1F5F9" }}>
                      {row.counts.filter(d => d.count > 0).map((d, i) => (
                        <div
                          key={d.ct}
                          title={`${d.ct}: ${d.count}件 (${d.pct}%)`}
                          style={{ width: `${d.pct}%`, height: "100%", backgroundColor: COLORS[i % COLORS.length], transition: "width 0.6s ease" }}
                        />
                      ))}
                    </div>
                    <div style={{ minWidth: 70, textAlign: "right", fontSize: 12, fontWeight: 700, color: THEME.textMuted }}>
                      計 {row.total}件
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}