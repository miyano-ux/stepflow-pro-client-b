import { THEME } from "./constants";

// ==========================================
// 🎨 グローバルスタイル・共通スタイル定義
// ==========================================

export const globalStyle = `
  * { box-sizing: border-box !important; }
  body { margin: 0; font-family: 'Inter', sans-serif; background-color: ${THEME.bg}; color: ${THEME.textMain}; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: ${THEME.border}; border-radius: 10px; }
`;

export const styles = {
  sidebar: {
    width: "260px",
    backgroundColor: THEME.sidebar,
    color: "white",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    padding: "32px 24px",
    boxSizing: "border-box",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
  },
  main: {
    width: "100%",
    minHeight: "100vh",
    backgroundColor: THEME.bg,
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: "16px",
    border: `1px solid ${THEME.border}`,
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    boxSizing: "border-box",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: `1px solid ${THEME.border}`,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "white",
    transition: "0.2s",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    fontWeight: "700",
    cursor: "pointer",
    transition: "0.2s",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  btnPrimary: {
    backgroundColor: THEME.primary,
    color: "white",
    boxShadow: "0 4px 14px 0 rgba(79, 70, 229, 0.3)",
  },
  btnSecondary: {
    backgroundColor: "white",
    color: THEME.textMain,
    border: `1px solid ${THEME.border}`,
  },
  tableTh: {
    padding: "14px 20px",
    color: THEME.textMuted,
    fontSize: "11px",
    fontWeight: "800",
    borderBottom: `2px solid ${THEME.border}`,
    textAlign: "left",
    textTransform: "uppercase",
  },
  tableTd: {
    padding: "18px 20px",
    fontSize: "14px",
    borderBottom: `1px solid ${THEME.border}`,
    color: THEME.textMain,
  },
  badge: {
    padding: "4px 12px",
    borderRadius: "99px",
    fontSize: "11px",
    fontWeight: "800",
    backgroundColor: "#EEF2FF",
    color: THEME.primary,
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "800",
    color: THEME.textMuted,
    marginBottom: "8px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
};