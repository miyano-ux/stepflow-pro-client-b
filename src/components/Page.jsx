import React from "react";
import { THEME } from "../lib/constants";
import { useWindowWidth } from "../lib/useWindowWidth";

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
  const { isMobile } = useWindowWidth();
  return (
    <div style={{ width: "100%", minHeight: "100vh" }}>
      <div style={{ padding: isMobile ? "20px 16px" : "48px 32px", maxWidth: "1440px", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ページヘッダー */}
        <div
          style={{
            marginBottom: isMobile ? "24px" : "40px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: isMobile ? "16px" : 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? "22px" : "32px",
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
                  fontSize: isMobile ? "13px" : "15px",
                  marginTop: "6px",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* タイトル右側のボタン領域（任意） */}
          {topButton && <div style={isMobile ? { width: "100%", boxSizing: "border-box" } : {}}>{topButton}</div>}
        </div>

        {/* ページ本文 */}
        {children}

      </div>
    </div>
  );
}

export default Page;