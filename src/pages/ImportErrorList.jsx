import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, ChevronLeft } from "lucide-react";
import { THEME } from "../lib/constants";
import { GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, formatDate } from "../lib/utils";
import Page from "../components/Page";
import { useToast } from "../ToastContext";

// ==========================================
// ⚠️ ImportErrorList - 取り込みエラーログページ
// ==========================================

/**
 * Gmailからの取り込みに失敗したメールを一覧表示するページ
 * @param {Array} errors - エラーログ一覧
 * @param {function} onRefresh - データ再取得コールバック
 */
function ImportErrorList({ errors = [], onRefresh }) {
  const showToast = useToast();
  const [selected, setSelected] = useState(null);
  // "confirm" | "loading" | "done" | null
  const [modalPhase, setModalPhase] = useState(null);
  const navigate = useNavigate();

  // 全ログ削除
  const handleClearAll = async () => {
    setModalPhase("loading");
    try {
      await apiCall.post(GAS_URL, { action: "clearErrorLogs" });
      onRefresh();
      setModalPhase("done");
    } catch (err) {
      setModalPhase(null);
      showToast("削除中にエラーが発生しました: " + err.message, "error");
    }
  };

  // 日時の降順でソート
  const sortedErrors = [...errors].sort(
    (a, b) => new Date(b["日時"]) - new Date(a["日時"])
  );

  // ── オーバーレイ共通スタイル ──────────────────────────────
  const overlay = {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 3000,
  };
  const modalBox = {
    backgroundColor: "white", borderRadius: 20, padding: 40,
    maxWidth: 440, width: "90%",
    boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
  };
  const iconCircle = (bg) => ({
    width: 64, height: 64, borderRadius: "50%",
    backgroundColor: bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  });
  const primaryBtn = {
    width: "100%", padding: "14px",
    backgroundColor: "#6366F1", color: "white",
    border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 800, cursor: "pointer",
  };
  const secondaryBtn = {
    width: "100%", padding: "13px",
    backgroundColor: "transparent", color: "#6B7280",
    border: "1px solid #E5E7EB", borderRadius: 12,
    fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 10,
  };

  return (
    <>
      {/* ── 確認モーダル ─────────────────────────────── */}
      {modalPhase === "confirm" && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={iconCircle("#FEE2E2")}>
              <Trash2 size={28} color={THEME.danger} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#111827" }}>
              ログを全削除しますか？
            </h3>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.7 }}>
              現在表示されている {sortedErrors.length} 件のエラーログを<br />
              すべて削除します。この操作は元に戻せません。
            </p>
            <button
              onClick={handleClearAll}
              style={{ ...primaryBtn, backgroundColor: THEME.danger }}
            >
              削除する
            </button>
            <button
              onClick={() => setModalPhase(null)}
              style={secondaryBtn}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ── 処理中モーダル ───────────────────────────── */}
      {modalPhase === "loading" && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={{
              width: 56, height: 56,
              border: "5px solid #E5E7EB",
              borderTop: `5px solid ${THEME.primary}`,
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
              margin: "0 auto 24px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#111827" }}>
              削除中...
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>
              しばらくお待ちください
            </p>
          </div>
        </div>
      )}

      {/* ── 完了モーダル ─────────────────────────────── */}
      {modalPhase === "done" && (
        <div style={overlay}>
          <div style={modalBox}>
            <div style={iconCircle("#DCFCE7")}>
              <span style={{ fontSize: 28 }}>✓</span>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#166534" }}>
              削除完了しました
            </h3>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280" }}>
              エラーログをすべて削除しました。
            </p>
            <button
              onClick={() => setModalPhase(null)}
              style={primaryBtn}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

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
            onClick={() => setModalPhase("confirm")}
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
    </>
  );
}

export default ImportErrorList;