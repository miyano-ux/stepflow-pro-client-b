import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import CustomSelect from "./CustomSelect";
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
 * @param {object}   [select]      - 【G1-006拡張】モーダル内プルダウン（省略可）
 *                                   { label: string, options: [{value, label}], defaultValue: string }
 *                                   指定時は onConfirm(選択値) が呼ばれる。
 *                                   未指定時は従来どおり onConfirm() が引数なしで呼ばれる
 *                                   （既存の呼び出し元には影響しない）。
 * @param {function} onConfirm     - 確認ボタン押下時コールバック（select 指定時は選択値が渡る）
 * @param {function} onCancel      - キャンセルボタン・オーバーレイ押下時コールバック
 * @param {string}   [confirmLabel] - 確認ボタンラベル（デフォルト: 削除する）
 * @param {string}   [confirmColor] - 確認ボタン色（デフォルト: THEME.danger）
 * @param {node}     [icon]         - 【G2-015】ヘッダーアイコン（デフォルト: ゴミ箱）
 * @param {string}   [iconBg]       - 【G2-015】アイコン背景色（デフォルト: 赤系 #FEE2E2）
 */
function ConfirmModal({
  open,
  title,
  message,
  note,
  select,
  onConfirm,
  onCancel,
  confirmLabel = "削除する",
  confirmColor,
  icon,
  iconBg,
}) {
  // 【G1-006拡張】プルダウンの選択状態。モーダルを開くたびに defaultValue で初期化する
  //（同じモーダルインスタンスを使い回すため、前回の選択が次回の削除確認に残らないようにする）。
  const [selected, setSelected] = useState("");
  useEffect(() => {
    if (open) setSelected(select?.defaultValue ?? select?.options?.[0]?.value ?? "");
    // select はレンダーごとに新しいオブジェクトになりうるため、依存は open と
    // defaultValue のみに絞る（オブジェクト同一性による無限初期化を避ける）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, select?.defaultValue]);

  if (!open) return null;

  // 【G2-015】削除以外（名称変更など）の確認にも使えるよう、アイコンと配色を差し替え可能にする。
  // 未指定時は従来どおり「赤いゴミ箱」なので既存の呼び出しには影響しない。
  const btnColor = confirmColor || THEME.danger;
  const circleBg = iconBg || "#FEE2E2";
  const hasSelect = !!(select && Array.isArray(select.options) && select.options.length > 0);

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
          backgroundColor: circleBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          {icon || <Trash2 size={28} color={btnColor} />}
        </div>

        {/* タイトル */}
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111827" }}>
          {title}
        </h3>

        {/* 本文 */}
        {message && (
          <p style={{ margin: "0 0 6px", fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line", textAlign: "left" }}>
            {message}
          </p>
        )}

        {/* 補足（プルダウンがある場合は下マージンを詰めて連続表示にする） */}
        {note && (
          <p style={{ margin: hasSelect ? "0 0 14px" : "0 0 28px", fontSize: 13, color: "#6B7280", lineHeight: 1.7, textAlign: hasSelect ? "left" : "center" }}>
            {note}
          </p>
        )}

        {/* 【G1-006拡張】付け替え先などの選択プルダウン。
            アプリ標準のデザイン化プルダウン（CustomSelect）を使う。
            CustomSelect のドロップダウンはトリガー直下に position:absolute で
            描画される（ポータル非使用）ため、このモーダル DOM の内側にある限り
            zIndex:3000 のオーバーレイとは干渉しない。モーダル本体（白カード）は
            overflow を指定していないので、リストがカード外へはみ出しても表示される。 */}
        {hasSelect && (
          <div style={{ margin: "0 0 24px", textAlign: "left" }}>
            {select.label && (
              <div style={{ fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 6 }}>
                {select.label}
              </div>
            )}
            <CustomSelect
              value={selected}
              onChange={(v) => setSelected(v)}
              options={select.options}
              color={select.color}
              placeholder={select.placeholder}
            />
          </div>
        )}

        {!note && !hasSelect && <div style={{ marginBottom: 28 }} />}

        {/* 確認ボタン */}
        <button
          onClick={() => onConfirm(hasSelect ? selected : undefined)}
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