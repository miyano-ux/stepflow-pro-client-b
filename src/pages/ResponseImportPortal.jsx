import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings, AlertCircle, ChevronRight } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";

// ==========================================
// 📥 ResponseImportPortal - 反響取り込み管理ポータル
// ==========================================

/**
 * Gmail自動取り込み設定・エラーログへのナビゲーションポータル
 */
function ResponseImportPortal() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: "Gmail自動取り込み設定",
      desc: "メールからの顧客自動登録ルールを作成・編集します",
      path: "/gmail-settings",
      icon: <Settings size={32} color={THEME.primary} />,
      color: "#EEF2FF",
    },
    {
      title: "取り込みエラーログ",
      desc: "キーワード不一致等で取り込めなかったメールを確認します",
      path: "/import-errors",
      icon: <AlertCircle size={32} color={THEME.danger} />,
      color: "#FEF2F2",
    },
  ];

  return (
    <Page
      title="反響取り込み管理"
      subtitle="自動取り込みの設定およびエラーの監視を行います"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          maxWidth: "900px",
          marginTop: "24px",
        }}
      >
        {menuItems.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              ...styles.card,
              padding: "40px",
              cursor: "pointer",
              textAlign: "center",
              transition: "0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = THEME.primary;
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = THEME.border;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {/* アイコン */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                backgroundColor: item.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon}
            </div>

            {/* テキスト */}
            <div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                  marginBottom: "12px",
                  marginTop: 0,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: THEME.textMuted,
                  fontSize: "14px",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>

            {/* リンクテキスト */}
            <div
              style={{
                marginTop: "12px",
                color: THEME.primary,
                fontWeight: "800",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              管理画面を開く <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

export default ResponseImportPortal;