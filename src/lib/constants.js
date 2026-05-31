// ==========================================
// 🔑 環境設定・定数定義
// ==========================================

// ローカル開発時: Viteプロキシ経由（CORSバイパス）
//   /api/gas    → vite.config.js で script.google.com に転送
//   /api/master → 同上
// 本番(Vercel): 直接GAS URLを使用（CORSの問題なし）
const isDev = import.meta.env.DEV;

export const CLIENT_COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME;

export const GAS_URL = isDev
  ? '/api/gas'
  : import.meta.env.VITE_GAS_URL;

export const MASTER_WHITELIST_API = isDev
  ? '/api/master'
  : import.meta.env.VITE_MASTER_WHITELIST_API;

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const THEME = {
  primary:  "#5B4FCE",
  accent:   "#E07B5A",
  bg:       "#F6F5FF",
  card:     "#FFFFFF",
  textMain: "#1E1B4B",
  textMuted:"#6B6A8E",
  border:   "#E4E2F5",
  success:  "#10B981",
  danger:   "#EF4444",
  locked:   "#F0EFF9",
  sidebar:  "#0D0B1F",
};