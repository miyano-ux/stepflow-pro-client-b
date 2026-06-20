import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Columns, UserPlus, BarChart3, LogOut,
  ChevronLeft, ChevronRight, ChevronDown,
  MessageSquare, Copy, Users, Mail, Settings, Globe,
  Menu, X
} from 'lucide-react';
import { useWindowWidth } from '../lib/useWindowWidth';

const EXPANDED_WIDTH  = "240px";
const COLLAPSED_WIDTH = "68px";
const MOBILE_HEADER_HEIGHT = "56px";

const ACCENT = "#5B4FCE";
const ACTIVE_BG = "#EEF2FF";
const ACTIVE_COLOR = "#4338CA";
const MUTED = "#94A3B8";
const TEXT = "#64748B";
const BORDER = "#F0EFF9";

// ── メインナビ（常時表示・初心者向けの主要4機能） ──
const MAIN_ITEMS = [
  { name: "顧客リスト",    path: "/",          icon: <LayoutDashboard size={18} /> },
  { name: "案件進捗管理",      path: "/kanban",     icon: <Columns size={18} /> },
  { name: "分析レポート",  path: "/analysis",   icon: <BarChart3 size={18} /> },
  { name: "新規登録",      path: "/add",        icon: <UserPlus size={18} /> },
];

// ── 設定グループ（折りたたみ） ──
const SETTINGS_ITEMS = [
  { name: "管理項目設定",  path: "/master-settings",  icon: <Settings size={16} /> },
  { name: "テンプレート",  path: "/templates",         icon: <Copy size={16} /> },
  { name: "反響取り込み",  path: "/response-import",  icon: <Mail size={16} /> },
  { name: "ユーザー管理",  path: "/users",             icon: <Users size={16} /> },
  { name: "媒体連携設定",  path: "/source-integrations", icon: <Globe size={16} /> },
];

// 設定グループに含まれるパスかどうか
const isSettingsPath = (pathname) =>
  SETTINGS_ITEMS.some((item) =>
    pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
  ) || ["/status-settings", "/sources", "/contract-types", "/scenarios", "/source-integrations"].some(p => pathname.startsWith(p));

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const { isMobile } = useWindowWidth();

  // PC/タブレット: 展開・収納トグル（従来通り）
  const [expanded, setExpanded] = useState(true);
  // モバイル: 開閉（初期は閉じる＝コンテンツ優先）
  const [mobileOpen, setMobileOpen] = useState(false);
  // 設定グループは現在地が設定内なら自動展開
  const [settingsOpen, setSettingsOpen] = useState(() => isSettingsPath(location.pathname));

  // ページ遷移したらモバイルメニューは自動で閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // モバイルでメニューが開いている間は背面スクロールを止める
  useEffect(() => {
    if (isMobile && mobileOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prevOverflow; };
    }
  }, [isMobile, mobileOpen]);

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const NavItem = ({ item, small = false }) => {
    const active = isActive(item.path);
    const iconSize = small ? 15 : 18;
    // モバイル時は常にラベル表示（expanded判定を使わない）
    const showLabel = isMobile || expanded;
    return (
      <Link
        to={item.path}
        title={!showLabel ? item.name : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          padding: small ? "10px 16px 10px 20px" : "12px 16px",
          marginBottom: "2px",
          marginRight: "12px",
          textDecoration: "none",
          borderRadius: "0 8px 8px 0",
          borderLeft: `3px solid ${active ? ACCENT : "transparent"}`,
          backgroundColor: active ? ACTIVE_BG : "transparent",
          color: active ? ACTIVE_COLOR : TEXT,
          fontWeight: active ? 700 : 500,
          transition: "all 0.15s ease",
          justifyContent: showLabel ? "flex-start" : "center",
        }}
        onMouseEnter={(e) => { if (!active && !isMobile) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
        onMouseLeave={(e) => { if (!active && !isMobile) e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <span style={{ flexShrink: 0, color: active ? ACCENT : MUTED, display: "flex", alignItems: "center" }}>
          {React.cloneElement(item.icon, { size: iconSize })}
        </span>
        {showLabel && (
          <span style={{ marginLeft: "12px", fontSize: small ? "13px" : "14px", whiteSpace: "nowrap" }}>
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  // ── ナビ本体（PC/モバイル共通の中身。位置・幅だけ出し分ける） ──
  const NavContent = () => (
    <>
      {/* メインナビ */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {MAIN_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        {/* 設定グループ（折りたたみ） */}
        <div style={{ marginTop: "16px" }}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            title={!(isMobile || expanded) ? "設定" : undefined}
            style={{
              display: "flex", alignItems: "center",
              width: "100%", padding: "8px 16px",
              background: "none", border: "none", cursor: "pointer",
              justifyContent: (isMobile || expanded) ? "flex-start" : "center",
              color: isSettingsPath(location.pathname) ? ACCENT : MUTED,
            }}
          >
            <Settings size={16} style={{ flexShrink: 0 }} />
            {(isMobile || expanded) && (
              <>
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", flex: 1, textAlign: "left" }}>
                  設定
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    color: MUTED,
                  }}
                />
              </>
            )}
          </button>

          <div style={{
            maxHeight: settingsOpen ? "400px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.25s ease",
          }}>
            {SETTINGS_ITEMS.map((item) => (
              <NavItem key={item.path} item={item} small />
            ))}
          </div>
        </div>
      </nav>

      {/* ログアウト */}
      <button
        onClick={onLogout}
        title={!(isMobile || expanded) ? "Logout" : undefined}
        style={{
          display: "flex", alignItems: "center",
          padding: "14px 16px", marginTop: "8px",
          background: "transparent", color: MUTED,
          border: "none", borderTop: `1px solid ${BORDER}`,
          cursor: "pointer", width: "100%",
          justifyContent: (isMobile || expanded) ? "flex-start" : "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; }}
      >
        <LogOut size={16} style={{ flexShrink: 0 }} />
        {(isMobile || expanded) && <span style={{ marginLeft: "10px", fontSize: "14px" }}>ログアウト</span>}
      </button>
    </>
  );

  // ==========================================
  // 📱 モバイルレイアウト（768px未満）
  // ==========================================
  if (isMobile) {
    return (
      <>
        {/* 固定ヘッダーバー */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: MOBILE_HEADER_HEIGHT,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E4E2F5",
          boxShadow: "0 2px 8px rgba(91, 79, 206, 0.06)",
          zIndex: 1100,
          boxSizing: "border-box",
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="メニューを開く"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 40, background: "transparent",
              border: "none", borderRadius: 8, cursor: "pointer", color: ACCENT,
            }}
          >
            <Menu size={24} />
          </button>

          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img
              src="/logo_beta.png" alt="SMOOSy"
              style={{ height: "32px", width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* 右側はバランス用の空スペース（中央寄せのため） */}
          <div style={{ width: 40 }} />
        </div>

        {/* ヘッダー分のスペーサー */}
        <div style={{ height: MOBILE_HEADER_HEIGHT, flexShrink: 0 }} />

        {/* オーバーレイ背景（タップで閉じる） */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: 0,
              backgroundColor: "rgba(15, 13, 38, 0.45)",
              zIndex: 1190,
            }}
          />
        )}

        {/* スライドインメニュー */}
        <div style={{
          position: "fixed", top: 0, left: 0,
          height: "100vh", width: "min(80vw, 280px)",
          display: "flex", flexDirection: "column",
          padding: "16px 0 16px",
          backgroundColor: "#FFFFFF",
          boxSizing: "border-box", zIndex: 1200,
          boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
        }}>
          {/* ロゴ＋閉じるボタン */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px 16px", borderBottom: `1px solid ${BORDER}`, marginBottom: "16px",
          }}>
            <img src="/logo_beta.png" alt="SMOOSy" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="メニューを閉じる"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, background: "#F8FAFC",
                border: "none", borderRadius: 8, cursor: "pointer", color: TEXT,
              }}
            >
              <X size={18} />
            </button>
          </div>

          <NavContent />
        </div>
      </>
    );
  }

  // ==========================================
  // 🖥️ PC/タブレットレイアウト（768px以上・従来通り）
  // ==========================================
  return (
    <>
      <div style={{
        height: "100vh", position: "fixed", left: 0, top: 0,
        display: "flex", flexDirection: "column",
        padding: "20px 0 16px",
        backgroundColor: "#FFFFFF",
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        boxSizing: "border-box", zIndex: 1000,
        borderRight: "1px solid #E4E2F5",
        boxShadow: "2px 0 12px rgba(91, 79, 206, 0.06)",
        transition: "width 0.25s ease",
        overflow: "hidden",
      }}>

        {/* ロゴ */}
        <div style={{ padding: "0 16px 20px", borderBottom: `1px solid ${BORDER}`, marginBottom: "16px" }}>
          <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <img
              src="/logo_beta.png" alt="SMOOSy"
              style={{
                height: "65px", width: "auto",
                maxWidth: expanded ? "200px" : "40px",
                objectFit: "contain", objectPosition: "left center",
                transition: "max-width 0.25s ease",
              }}
            />
          </Link>
        </div>

        <NavContent />

        {/* 開閉トグル */}
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "閉じる" : "開く"}
          style={{
            display: "flex", alignItems: "center",
            padding: "8px 16px",
            background: "transparent", border: "none",
            borderTop: `1px solid ${BORDER}`,
            cursor: "pointer", width: "100%", marginTop: "4px",
            justifyContent: expanded ? "flex-end" : "center",
          }}
        >
          {expanded
            ? <ChevronLeft  size={16} color={ACCENT} />
            : <ChevronRight size={16} color={ACCENT} />}
        </button>

      </div>

      {/* スペーサー */}
      <div style={{
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        flexShrink: 0,
        transition: "width 0.25s ease",
      }} />
    </>
  );
};

export default Sidebar;