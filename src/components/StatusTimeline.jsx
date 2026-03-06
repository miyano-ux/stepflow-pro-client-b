import React from "react";
import { Clock } from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 📊 StatusTimeline - ステータス遷移タイムライン
// ==========================================

function formatDate(val) {
  if (!val) return "－";
  const d = new Date(val);
  if (isNaN(d)) return "－";
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

function calcDays(from, to) {
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

function DaysBadge({ days, isCurrent }) {
  if (days === null) return null;
  const color =
    isCurrent ? { bg: "#EEF2FF", text: THEME.primary } :
    days <= 7  ? { bg: "#DCFCE7", text: "#166534" } :
    days <= 14 ? { bg: "#FEF3C7", text: "#92400E" } :
    days <= 30 ? { bg: "#FED7AA", text: "#9A3412" } :
                 { bg: "#FEE2E2", text: "#991B1B" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, padding: "2px 10px",
      borderRadius: 99, backgroundColor: color.bg, color: color.text,
      whiteSpace: "nowrap",
    }}>
      {isCurrent ? `${days}日目（継続中）` : `${days}日間`}
    </span>
  );
}

export default function StatusTimeline({ history = [] }) {
  // 古い順に並べる
  const sorted = [...history].sort((a, b) => new Date(a["変更日時"]) - new Date(b["変更日時"]));

  return (
    <div style={{
      backgroundColor: THEME.card,
      borderRadius: 16,
      border: `1px solid ${THEME.border}`,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
      padding: "24px 28px",
      marginBottom: 24,
    }}>
      <h3 style={{
        fontSize: 14, fontWeight: 800, color: THEME.textMuted,
        margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <Clock size={15} /> ステータス遷移
      </h3>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: THEME.textMuted, fontSize: 13 }}>
          まだ履歴がありません
        </div>
      ) : (
        <div>
          {sorted.map((h, i) => {
            const isCurrent = i === sorted.length - 1;
            const next      = sorted[i + 1];
            const days      = calcDays(h["変更日時"], next?.["変更日時"]);

            return (
              <div key={i} style={{ display: "flex", gap: 0 }}>
                {/* 左：ドット＋縦線 */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                    backgroundColor: isCurrent ? THEME.primary : "#94A3B8",
                    boxShadow: isCurrent ? `0 0 0 4px ${THEME.primary}25` : "none",
                  }} />
                  {!isCurrent && (
                    <div style={{ width: 2, flex: 1, minHeight: 28, backgroundColor: "#E2E8F0", margin: "4px 0" }} />
                  )}
                </div>

                {/* 右：コンテンツ */}
                <div style={{ flex: 1, paddingLeft: 14, paddingBottom: isCurrent ? 0 : 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 900,
                      color: isCurrent ? THEME.primary : THEME.textMain,
                    }}>
                      {h["ステータス"]}
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: "2px 7px",
                        backgroundColor: THEME.primary, color: "white", borderRadius: 99,
                      }}>現在</span>
                    )}
                    <DaysBadge days={days} isCurrent={isCurrent} />
                  </div>
                  <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 600 }}>
                    {formatDate(h["変更日時"])}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}