import React from "react";
import { Trash2 } from "lucide-react";
import { THEME } from "../lib/constants";

// ==========================================
// 🗑️ ConfirmModal - 削除確認共通モーダル
// ==========================================

/**
 * 削除などの破壊的操作の確認に使う共通モーダル
 * @param {boolean}  open          - 表示フラグ
 * @param {string}   title         - モーダルタイトル
 * @param {string}   [message]     - 本文テキスト（省略可）
 * @param {string}   [note]        - 補足テキスト（薄い色で表示、省略可）
 * @param {function} onConfirm     - 確認ボタン押下時コールバック
 * @param {function} onCancel      - キャンセルボタン・オーバーレイ押下時コールバック
 * @param {string}   [confirmLabel] - 確認ボタンラベル（デフォルト: 削除する）
 * @param {string}   [confirmColor] - 確認ボタン色（デフォルト: THEME.danger）
 */
function ConfirmModal({
  open,
  title,
  message,
  note,
  onConfirm,
  onCancel,
  confirmLabel = "削除する",
  confirmColor,
}) {
  if (!open) return null;

  const btnColor = confirmColor || THEME.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white", borderRadius: 20, padding: 40,
          maxWidth: 440, width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
        }}
      >
        {/* アイコン */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          backgroundColor: "#FEE2E2",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Trash2 size={28} color={btnColor} />
        </div>

        {/* タイトル */}
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111827" }}>
          {title}
        </h3>

        {/* 本文 */}
        {message && (
          <p style={{ margin: "0 0 6px", fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
            {message}
          </p>
        )}

        {/* 補足 */}
        {note && (
          <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>
            {note}
          </p>
        )}
        {!note && <div style={{ marginBottom: 28 }} />}

        {/* 確認ボタン */}
        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: "14px",
            backgroundColor: btnColor, color: "white",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: "pointer",
          }}
        >
          {confirmLabel}
        </button>

        {/* キャンセルボタン */}
        <button
          onClick={onCancel}
          style={{
            width: "100%", padding: "13px",
            backgroundColor: "transparent", color: "#6B7280",
            border: "1px solid #E5E7EB", borderRadius: 12,
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            marginTop: 10,
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default ConfirmModal;