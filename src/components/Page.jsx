import React from "react";
import { THEME } from "../lib/constants";

// ==========================================
// 📄 Page - ページ共通レイアウトラッパー
// ==========================================

/**
 * 全ページ共通のレイアウトコンポーネント
 * @param {string} title - ページタイトル（H1）
 * @param {string} subtitle - サブタイトル（任意）
 * @param {React.ReactNode} children - ページ本文
 * @param {React.ReactNode} topButton - タイトル右側に表示するボタン（任意）
 */
function Page({ title, subtitle, children, topButton }) {
  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
      <div style={{ padding: "48px 32px", maxWidth: "1440px", margin: "0 auto" }}>

        {/* ページヘッダー */}
        <div
          style={{
            marginBottom: "40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: THEME.textMain,
                margin: 0,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  color: THEME.textMuted,
                  fontSize: "15px",
                  marginTop: "6px",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* タイトル右側のボタン領域（任意） */}
          {topButton && <div>{topButton}</div>}
        </div>

        {/* ページ本文 */}
        {children}

      </div>
    </div>
  );
}

export default Page;