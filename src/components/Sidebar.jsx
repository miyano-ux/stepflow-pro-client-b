import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Columns, Mail, UserPlus, 
  Settings, Copy, Users, Activity, BarChart3, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const EXPANDED_WIDTH = "240px";
const COLLAPSED_WIDTH = "68px";

const Sidebar = ({ onLogout }) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);

  const menuItems = [
    { name: "ダッシュボード",   path: "/",               icon: <LayoutDashboard size={18} /> },
    { name: "案件カンバン",     path: "/kanban",          icon: <Columns size={18} /> },
    { name: "反響取り込み",     path: "/response-import", icon: <Mail size={18} /> },
    { name: "新規顧客登録",     path: "/add",             icon: <UserPlus size={18} /> },
    { name: "シナリオ管理",     path: "/scenarios",       icon: <Settings size={18} /> },
    { name: "テンプレート管理", path: "/templates",       icon: <Copy size={18} /> },
    { name: "ユーザー管理",     path: "/users",           icon: <Users size={18} /> },
    { name: "トラッキング実況", path: "/tracking",        icon: <Activity size={18} /> },
    { name: "分析レポート",     path: "/analysis",        icon: <BarChart3 size={18} /> },
  ];

  return (
    <>
      {/* サイドバー本体 */}
      <div style={{
        ...styles.sidebar,
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
      }}>

        {/* ロゴエリア */}
        <div style={styles.logoContainer}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img
              src="/logo_beta.png"
              alt="SMOOSy"
              style={{
                height: "36px",
                width: "auto",
                maxWidth: expanded ? "160px" : "36px",
                objectFit: "contain",
                objectPosition: "left",
                transition: "max-width 0.25s ease",
              }}
            />
          </Link>
        </div>

        {/* ナビゲーション */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {menuItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!expanded ? item.name : undefined}
                style={{
                  ...styles.navLink,
                  justifyContent: expanded ? "flex-start" : "center",
                  backgroundColor: isActive ? "#EEF2FF" : "transparent",
                  color: isActive ? "#4338CA" : "#64748B",
                  fontWeight: isActive ? "700" : "500",
                  borderLeft: isActive ? "3px solid #5B4FCE" : "3px solid transparent",
                }}
              >
                <span style={{
                  flexShrink: 0,
                  color: isActive ? "#5B4FCE" : "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                }}>
                  {item.icon}
                </span>
                {expanded && (
                  <span style={{
                    marginLeft: "12px",
                    fontSize: "13px",
                    whiteSpace: "nowrap",
                    opacity: 1,
                    transition: "opacity 0.2s ease",
                  }}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ログアウト */}
        <button
          onClick={onLogout}
          title={!expanded ? "Logout" : undefined}
          style={{
            ...styles.logoutBtn,
            justifyContent: expanded ? "flex-start" : "center",
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {expanded && (
            <span style={{ marginLeft: "10px", fontSize: "13px" }}>
              ログアウト
            </span>
          )}
        </button>

        {/* 開閉トグルボタン */}
        <button
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "閉じる" : "開く"}
          style={styles.toggleBtn}
        >
          {expanded
            ? <ChevronLeft size={16} color="#5B4FCE" />
            : <ChevronRight size={16} color="#5B4FCE" />
          }
        </button>

      </div>

      {/* サイドバー幅に連動するスペーサー（App.jsx の marginLeft を置き換え） */}
      <div style={{
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        flexShrink: 0,
        transition: "width 0.25s ease",
      }} />
    </>
  );
};

const styles = {
  sidebar: {
    height: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "20px 0 16px",
    backgroundColor: "#FFFFFF",
    boxSizing: "border-box",
    zIndex: 1000,
    borderRight: "1px solid #E4E2F5",
    boxShadow: "2px 0 12px rgba(91, 79, 206, 0.06)",
    transition: "width 0.25s ease",
    overflow: "hidden",
  },
  logoContainer: {
    padding: "0 16px 20px",
    borderBottom: "1px solid #F0EFF9",
    marginBottom: "12px",
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    marginBottom: "2px",
    textDecoration: "none",
    borderRadius: "0 8px 8px 0",
    marginRight: "12px",
    transition: "all 0.15s ease",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    marginTop: "8px",
    background: "transparent",
    color: "#94A3B8",
    border: "none",
    borderTop: "1px solid #F0EFF9",
    cursor: "pointer",
    width: "100%",
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: "88px",
    right: "-12px",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E4E2F5",
    boxShadow: "0 2px 8px rgba(91, 79, 206, 0.15)",
    cursor: "pointer",
    padding: 0,
    zIndex: 1001,
  },
};

export default Sidebar;