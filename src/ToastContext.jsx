import React, { createContext, useContext, useState, useCallback } from "react";
import { THEME } from "./lib/constants";

// ==========================================
// 🍞 ToastContext - 軽量トースト通知
// ==========================================

const ToastContext = createContext(null);

const TYPES = {
  success: { bg: "#166534", icon: "✓" },
  error:   { bg: "#991B1B", icon: "✕" },
  info:    { bg: THEME.primary, icon: "ℹ" },
  warning: { bg: "#92400E", icon: "⚠" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* トースト描画エリア（画面右下） */}
      <div style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}>
        {toasts.map(t => {
          const { bg, icon } = TYPES[t.type] || TYPES.info;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                backgroundColor: bg,
                color: "white",
                padding: "12px 16px",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                fontSize: 14,
                fontWeight: 600,
                maxWidth: 380,
                lineHeight: 1.5,
                cursor: "pointer",
                pointerEvents: "all",
                animation: "toastIn 0.25s ease",
              }}
            >
              <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>{icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/** 各ページ・コンポーネントで呼ぶフック */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}