// ==========================================
// 🔑 環境設定・定数定義
// ==========================================

export const CLIENT_COMPANY_NAME = "B社";

export const GAS_URL = import.meta.env.VITE_GAS_URL;
export const MASTER_WHITELIST_API = import.meta.env.VITE_MASTER_WHITELIST_API;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const THEME = {
  primary:  "#5B4FCE",       // ロゴのパープル（メインアクション・リンク）
  accent:   "#E07B5A",       // ロゴのコーラル（バッジ・ハイライト）
  bg:       "#F6F5FF",       // 薄いラベンダー（ロゴと空気感を統一）
  card:     "#FFFFFF",
  textMain: "#1E1B4B",       // ロゴの文字色に近いダークネイビー
  textMuted:"#6B6A8E",       // パープルがかったグレー
  border:   "#E4E2F5",       // 薄いパープルボーダー
  success:  "#10B981",
  danger:   "#EF4444",
  locked:   "#F0EFF9",       // 薄いパープルグレー
  sidebar:  "#0D0B1F",       // ロゴの背景色（深いネイビー）
};