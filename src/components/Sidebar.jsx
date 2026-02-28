import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Columns, Mail, UserPlus, 
  Settings, Copy, Users, Activity, BarChart3, LogOut 
} from 'lucide-react';

/**
 * Sidebar Component - StepFlow Pro V34.0
 * 物理デザイン仕様 4.1 に基づき 260px 幅を固定確保し、
 * Page Isolation (1.2) を実現するための独立コンポーネント。
 */
const Sidebar = ({ onLogout }) => {
  const location = useLocation();

  // 🆕 メニューリスト（仕様書 3.1〜3.3 の各画面に対応）
  const menuItems = [
    { name: "ダッシュボード", path: "/", icon: <LayoutDashboard size={18} /> },
    { name: "案件カンバン", path: "/kanban", icon: <Columns size={18} /> },
    { name: "反響取り込み", path: "/response-import", icon: <Mail size={18} /> },
    { name: "新規顧客登録", path: "/add", icon: <UserPlus size={18} /> },
    { name: "シナリオ管理", path: "/scenarios", icon: <Settings size={18} /> },
    { name: "テンプレート管理", path: "/templates", icon: <Copy size={18} /> },
    { name: "ユーザー管理", path: "/users", icon: <Users size={18} /> },
    { name: "トラッキング実況", path: "/tracking", icon: <Activity size={18} /> },
    { name: "分析レポート", path: "/analysis", icon: <BarChart3 size={18} /> }
  ];

  return (
    <div style={styles.sidebar}>
      {/* 🆕 ロゴエリア: public/logo_beta.png を使用 */}
      <div style={styles.logoContainer}>
  <Link to="/" style={{ textDecoration: 'none', display: 'block' }}>
    <img 
      src="/logo_beta.png" 
      alt="StepFlow Logo" 
      style={styles.logoImg} 
    />
  </Link>
      </div>

      {/* ナビゲーションメニュー */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          // アクティブ判定ロジック（仕様書準拠）
          const isActive = 
            location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              style={{ 
                ...styles.navLink,
                color: isActive ? "white" : "#94A3B8", 
                backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      {/* ログアウトボタン */}
      <button onClick={onLogout} style={styles.logoutBtn}>
        <LogOut size={16}/> Logout
      </button>
    </div>
  );
};

// サイドバー専用スタイル（仕様書 4.1 準拠）
const styles = {
  sidebar: {
    width: "260px",
    height: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    backgroundColor: "#111827", // 仕様書に合わせたダークトーン
    boxSizing: "border-box",
    zIndex: 1000,
    borderRight: "1px solid rgba(255,255,255,0.05)"
  },
  logoContainer: {
    marginBottom: "48px",
    paddingLeft: "8px",
  },
  logoImg: {
    height: "32px",
    width: "auto",
    maxWidth: "220px",
    display: "block"
    },
  navLink: {
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    padding: "12px 16px", 
    borderRadius: "10px", 
    textDecoration: "none", 
    marginBottom: "4px", 
    fontWeight: "600", 
    fontSize: "14px",
    transition: "all 0.2s ease"
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%", 
    padding: "12px",
    background: "transparent", 
    color: "#94A3B8", 
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    marginTop: "16px"
  }
};

export default Sidebar;