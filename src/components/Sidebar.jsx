import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Columns, UserPlus, BarChart3, LogOut,
  ChevronLeft, ChevronRight, ChevronDown,
  MessageSquare, Copy, Users, Mail, Settings, Sliders
} from 'lucide-react';

const EXPANDED_WIDTH  = "240px";
const COLLAPSED_WIDTH = "68px";

const ACCENT = "#5B4FCE";
const ACTIVE_BG = "#EEF2FF";
const ACTIVE_COLOR = "#4338CA";
const MUTED = "#94A3B8";
const TEXT = "#64748B";
const BORDER = "#F0EFF9";

// ── メインナビ（常時表示・初心者向けの主要4機能） ──
const MAIN_ITEMS = [
  { name: "顧客リスト",    path: "/",          icon: <LayoutDashboard size={18} /> },
  { name: "カンバン",      path: "/kanban",     icon: <Columns size={18} /> },
  { name: "分析レポート",  path: "/analysis",   icon: <BarChart3 size={18} /> },
  { name: "新規登録",      path: "/add",        icon: <UserPlus size={18} /> },
];

// ── 設定グループ（折りたたみ） ──
const SETTINGS_ITEMS = [
  { name: "シナリオ",      path: "/scenarios",      icon: <MessageSquare size={16} /> },
  { name: "テンプレート",  path: "/templates",      icon: <Copy size={16} /> },
  { name: "反響取り込み",  path: "/response-import",icon: <Mail size={16} /> },
  { name: "列・表示設定",  path: "/column-settings",icon: <Sliders size={16} /> },
  { name: "ステータス設定",path: "/status-settings", icon: <Settings size={16} /> },
  { name: "ユーザー管理",  path: "/users",           icon: <Users size={16} /> },
];

// 設定グループに含まれるパスかどうか
const isSettingsPath = (pathname) =>
  SETTINGS_ITEMS.some((item) =>
    pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path))
  );

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  // 設定グループは現在地が設定内なら自動展開
  const [settingsOpen, setSettingsOpen] = useState(() => isSettingsPath(location.pathname));

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const NavItem = ({ item, small = false }) => {
    const active = isActive(item.path);
    const iconSize = small ? 15 : 18;
    return (
      <Link
        to={item.path}
        title={!expanded ? item.name : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          padding: small ? "8px 16px 8px 20px" : "10px 16px",
          marginBottom: "2px",
          marginRight: "12px",
          textDecoration: "none",
          borderRadius: "0 8px 8px 0",
          borderLeft: `3px solid ${active ? ACCENT : "transparent"}`,
          backgroundColor: active ? ACTIVE_BG : "transparent",
          color: active ? ACTIVE_COLOR : TEXT,
          fontWeight: active ? 700 : 500,
          transition: "all 0.15s ease",
          justifyContent: expanded ? "flex-start" : "center",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <span style={{ flexShrink: 0, color: active ? ACCENT : MUTED, display: "flex", alignItems: "center" }}>
          {React.cloneElement(item.icon, { size: iconSize })}
        </span>
        {expanded && (
          <span style={{ marginLeft: "12px", fontSize: small ? "12px" : "13px", whiteSpace: "nowrap" }}>
            {item.name}
          </span>
        )}
      </Link>
    );
  };

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

        {/* メインナビ */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {MAIN_ITEMS.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          {/* 設定グループ（折りたたみ） */}
          <div style={{ marginTop: "16px" }}>
            {/* 折りたたみヘッダー */}
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              title={!expanded ? "設定" : undefined}
              style={{
                display: "flex", alignItems: "center",
                width: "100%", padding: "8px 16px",
                background: "none", border: "none", cursor: "pointer",
                justifyContent: expanded ? "flex-start" : "center",
                color: isSettingsPath(location.pathname) ? ACCENT : MUTED,
              }}
            >
              <Settings size={16} style={{ flexShrink: 0 }} />
              {expanded && (
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

            {/* 折りたたみコンテンツ */}
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
          title={!expanded ? "Logout" : undefined}
          style={{
            display: "flex", alignItems: "center",
            padding: "12px 16px", marginTop: "8px",
            background: "transparent", color: MUTED,
            border: "none", borderTop: `1px solid ${BORDER}`,
            cursor: "pointer", width: "100%",
            justifyContent: expanded ? "flex-start" : "center",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#EF4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {expanded && <span style={{ marginLeft: "10px", fontSize: "13px" }}>ログアウト</span>}
        </button>

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