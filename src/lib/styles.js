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
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "white",
    transition: "0.2s",
  },
  select: {
    width: "100%",
    padding: "12px 36px 12px 16px",
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "white",
    transition: "0.2s",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6A8E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    cursor: "pointer",
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
    boxShadow: "0 4px 14px 0 rgba(91, 79, 206, 0.35)",
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