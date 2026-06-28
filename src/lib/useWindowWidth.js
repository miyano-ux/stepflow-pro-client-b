import { useState, useEffect } from "react";

// ==========================================
// 📱 useWindowWidth - レスポンシブ判定共通フック
// ==========================================
// 各ページ・コンポーネントで個別に window.innerWidth を監視せず、
// このフックを通して isMobile / isTablet を参照することで判定基準を一元化する。
//
// ブレークポイント方針:
//   - MOBILE_BREAKPOINT (768px未満)  : スマホ。ナビは隠れる・テーブルはカード化等、構造を変える対象
//   - TABLET_BREAKPOINT (1024px未満) : タブレット。サイドバーは自動収納するが、構造は維持
//
// 使い方:
//   const { isMobile, isTablet, width } = useWindowWidth();
//   if (isMobile) { ...カード表示... } else { ...テーブル表示... }

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

function getWidth() {
  if (typeof window === "undefined") return TABLET_BREAKPOINT; // SSR等のフォールバック
  return window.innerWidth;
}

export function useWindowWidth() {
  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    let frame = null;
    const handleResize = () => {
      // resize イベントの発火頻度が高いため rAF で間引く
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    // 画面回転（向き変更）も拾う
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return {
    width,
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
    isDesktop: width >= TABLET_BREAKPOINT,
  };
}

export default useWindowWidth;