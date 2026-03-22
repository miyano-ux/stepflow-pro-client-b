import React from "react";
import { useNavigate } from "react-router-dom";
import { Globe, CheckCircle2, AlertCircle, Zap, ChevronRight, Mail } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";

// ============================================================
// 🔗 SourceIntegrationIndex - 媒体連携 一覧
// ============================================================
//
// 【媒体の追加方法】
//   SUPPORTED_SOURCES にエントリを1つ追加するだけ。
//   詳細設定画面は SourceIntegrationDetail.jsx が共通で担う。
// ============================================================

export const SUPPORTED_SOURCES = [
  {
    key:           "sumai_step",
    name:          "すまいステップ",
    domain:        "sumai-step.com",
    requiresLogin: true,
    description:   "ログイン後にCSVエクスポートして取り込みます",
    color:         "#3B82F6",
    bgColor:       "#EFF6FF",
  },
  {
    key:           "ouchi_clavel",
    name:          "おうちクラベル",
    domain:        "partners-od.jp",
    requiresLogin: false,
    description:   "メール本文から自動取得します（ID/PW設定不要）",
    color:         "#10B981",
    bgColor:       "#ECFDF5",
  },
  // 将来追加する媒体はここに追記するだけ
  // {
  //   key:           "lifull_homes",
  //   name:          "LIFULL HOME'S",
  //   domain:        "homes.co.jp",
  //   requiresLogin: true,
  //   description:   "ログイン後にCSVエクスポートして取り込みます",
  //   color:         "#F97316",
  //   bgColor:       "#FFF7ED",
  // },
];

function SourceCard({ src, credsStatus, clientInfo, onClick }) {
  const isConfigured = src.requiresLogin
    ? !!credsStatus?.[src.key]
    : true;

  // 転送先アドレスを組み立て
  const forwardingAddress = clientInfo?.forwardingAddress || "";

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.card,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = styles.card.boxShadow;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* カラーバー */}
      <div style={{ height: 4, backgroundColor: src.color }} />

      <div style={{ padding: "20px 24px 16px" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: src.bgColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Globe size={20} color={src.color} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain, marginBottom: 2 }}>
                {src.name}
              </div>
              <div style={{ fontSize: 12, color: THEME.textMuted }}>{src.description}</div>
            </div>
          </div>
          <ChevronRight size={16} color={THEME.textMuted} style={{ flexShrink: 0, marginTop: 4 }} />
        </div>

        {/* ステータスバッジ */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {src.requiresLogin ? (
            isConfigured ? (
              <span style={badgeStyle("green")}>
                <CheckCircle2 size={11} /> 認証設定済み
              </span>
            ) : (
              <span style={badgeStyle("amber")}>
                <AlertCircle size={11} /> 認証未設定
              </span>
            )
          ) : (
            <span style={badgeStyle("blue")}>
              <Zap size={11} /> ログイン不要
            </span>
          )}
        </div>

        {/* 転送アドレス */}
        {forwardingAddress && (
          <div style={{
            backgroundColor: THEME.bg,
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <Mail size={13} color={THEME.textMuted} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: THEME.textMuted, fontFamily: "monospace", wordBreak: "break-all" }}>
              {forwardingAddress}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function badgeStyle(color) {
  const map = {
    green: { bg: "#DCFCE7", text: "#166534" },
    amber: { bg: "#FEF3C7", text: "#92400E" },
    blue:  { bg: "#DBEAFE", text: "#1D4ED8" },
  };
  const c = map[color] || map.blue;
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
    backgroundColor: c.bg, color: c.text,
  };
}

export default function SourceIntegrationIndex({
  sourceCredsStatus = {},
  clientInfo        = {},
}) {
  const navigate = useNavigate();

  return (
    <Page title="媒体連携設定" icon={<Globe size={20} />}>
      <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: -8, marginBottom: 28 }}>
        反響メールを自動取り込みする媒体を選択して設定を行ってください。
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 20,
      }}>
        {SUPPORTED_SOURCES.map(src => (
          <SourceCard
            key={src.key}
            src={src}
            credsStatus={sourceCredsStatus}
            clientInfo={clientInfo}
            onClick={() => navigate(`/source-integrations/${src.key}`)}
          />
        ))}
      </div>
    </Page>
  );
}