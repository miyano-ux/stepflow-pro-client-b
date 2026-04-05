import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, ChevronLeft } from "lucide-react";
import { THEME } from "../lib/constants";
import { GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, formatDate } from "../lib/utils";
import Page from "../components/Page";

// ==========================================
// ⚠️ ImportErrorList - 取り込みエラーログページ
// ==========================================

/**
 * Gmailからの取り込みに失敗したメールを一覧表示するページ
 * @param {Array} errors - エラーログ一覧
 * @param {function} onRefresh - データ再取得コールバック
 */
function ImportErrorList({ errors = [], onRefresh }) {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  // 全ログ削除
  const handleClearAll = async () => {
    if (!window.confirm("全てのログを削除しますか？")) return;
    await apiCall.post(GAS_URL, { action: "clearErrorLogs" });
    onRefresh();
  };

  // 日時の降順でソート
  const sortedErrors = [...errors].sort(
    (a, b) => new Date(b["日時"]) - new Date(a["日時"])
  );

  return (
    <Page
      title="取り込みエラーログ"
      subtitle="抽出に失敗したメールがここに表示されます。キーワード設定の修正に役立ててください。"
    >
      {/* 戻るボタン */}
      <button
        onClick={() => navigate("/source-integrations")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 13, color: THEME.textMuted, background: "none",
          border: "none", cursor: "pointer", padding: "0 0 20px", fontWeight: 500,
        }}
      >
        <ChevronLeft size={14} /> 自動連携設定に戻る
      </button>
      {/* 操作ボタン */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <button
          onClick={handleClearAll}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            color: THEME.danger,
          }}
        >
          <Trash2 size={16} />
          ログを全削除
        </button>
      </div>

      {/* エラーログテーブル */}
      <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={styles.tableTh}>日時</th>
              <th style={styles.tableTh}>件名 / 送信元</th>
              <th style={styles.tableTh}>エラー原因</th>
              <th style={{ ...styles.tableTh, textAlign: "right" }}>詳細</th>
            </tr>
          </thead>
          <tbody>
            {sortedErrors.length > 0 ? (
              sortedErrors.map((e, i) => (
                <tr
                  key={i}
                  style={{ transition: "0.2s" }}
                  onMouseEnter={(el) =>
                    (el.currentTarget.style.backgroundColor = THEME.bg)
                  }
                  onMouseLeave={(el) =>
                    (el.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td style={styles.tableTd}>{formatDate(e["日時"])}</td>
                  <td style={styles.tableTd}>
                    <div style={{ fontWeight: 700 }}>{e["件名"]}</div>
                    <div style={{ fontSize: "12px", color: THEME.textMuted }}>
                      {e["送信元"]}
                    </div>
                  </td>
                  <td style={styles.tableTd}>
                    <span style={{ color: THEME.danger, fontWeight: 800 }}>
                      {e["エラー原因"]}
                    </span>
                  </td>
                  <td style={{ ...styles.tableTd, textAlign: "right" }}>
                    <button
                      onClick={() => setSelected(e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: THEME.primary,
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    ...styles.tableTd,
                    textAlign: "center",
                    padding: 40,
                    color: THEME.textMuted,
                  }}
                >
                  現在、エラーログはありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 本文詳細モーダル */}
      {selected && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2100,
          }}
        >
          <div
            style={{
              ...styles.card,
              width: "800px",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0 }}>メール本文の詳細確認</h3>
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ✕ 閉じる
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: "#F8FAFC",
                padding: "20px",
                borderRadius: "10px",
                whiteSpace: "pre-wrap",
                fontSize: "13px",
                color: THEME.textMain,
              }}
            >
              {selected["内容"]}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default ImportErrorList;