import React from "react";
import { useNavigate } from "react-router-dom";
import { Globe, CheckCircle2, AlertCircle, Zap, ChevronRight, Mail, Settings, PlusCircle, FileText } from "lucide-react";
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
    sourceFields: [
      { key: "管理番号",                         label: "管理番号" },
      { key: "反響日時",                         label: "反響日時" },
      { key: "状態",                             label: "状態" },
      { key: "担当店舗",                         label: "担当店舗" },
      { key: "物件種別",                         label: "物件種別" },
      { key: "物件種別：その他",                 label: "物件種別：その他" },
      { key: "物件住所：都道府県",               label: "物件住所：都道府県" },
      { key: "物件住所：市区町村",               label: "物件住所：市区町村" },
      { key: "物件住所：町名",                   label: "物件住所：町名" },
      { key: "物件住所：字/丁目以降",            label: "物件住所：字/丁目以降" },
      { key: "物件住所：建物名",                 label: "物件住所：建物名" },
      { key: "物件住所：号室",                   label: "物件住所：号室" },
      { key: "物件にお住まい",                   label: "物件にお住まい" },
      { key: "専有面積",                         label: "専有面積" },
      { key: "専有面積（単位）",                 label: "専有面積（単位）" },
      { key: "延べ床面積",                       label: "延べ床面積" },
      { key: "延べ床面積（単位）",               label: "延べ床面積（単位）" },
      { key: "土地面積",                         label: "土地面積" },
      { key: "土地面積（単位）",                 label: "土地面積（単位）" },
      { key: "築年",                             label: "築年" },
      { key: "間取り",                           label: "間取り" },
      { key: "現在の状況",                       label: "現在の状況" },
      { key: "物件の関係",                       label: "物件の関係" },
      { key: "賃料",                             label: "賃料" },
      { key: "階数",                             label: "階数" },
      { key: "戸数（部屋数）",                   label: "戸数（部屋数）" },
      { key: "査定の理由",                       label: "査定の理由" },
      { key: "査定の理由：その他",               label: "査定の理由：その他" },
      { key: "査定の方法",                       label: "査定の方法" },
      { key: "売却の希望時期",                   label: "売却の希望時期" },
      { key: "ご要望・ご質問",                   label: "ご要望・ご質問" },
      { key: "氏名 姓",                          label: "氏名 姓" },
      { key: "氏名 名",                          label: "氏名 名" },
      { key: "フリガナ 姓",                      label: "フリガナ 姓" },
      { key: "フリガナ 名",                      label: "フリガナ 名" },
      { key: "年齢",                             label: "年齢" },
      { key: "電話番号",                         label: "電話番号" },
      { key: "メールアドレス",                   label: "メールアドレス" },
      { key: "郵便番号",                         label: "郵便番号" },
      { key: "お住まいの住所：都道府県、市区町村、町名", label: "お住まいの住所：都道府県、市区町村、町名" },
      { key: "お住まいの住所：字/丁目以降",      label: "お住まいの住所：字/丁目以降" },
      { key: "お住まいの住所：建物名、号室",     label: "お住まいの住所：建物名、号室" },
      { key: "通電",                             label: "通電" },
      { key: "訪問",                             label: "訪問" },
      { key: "媒介",                             label: "媒介" },
      { key: "査定書",                           label: "査定書" },
    ],
  },
  {
    key:           "ouchi_clavel",
    name:          "おうちクラベル",
    domain:        "partners-od.jp",
    requiresLogin: false,
    description:   "メール本文から自動取得します（ID/PW設定不要）",
    color:         "#10B981",
    bgColor:       "#ECFDF5",
    sourceFields: [
      { key: "inquiryNo",   label: "問い合わせ番号" },
      { key: "fullName",    label: "姓名" },
      { key: "furigana",    label: "セイメイ" },
      { key: "phone",       label: "電話番号" },
      { key: "email",       label: "メールアドレス" },
      { key: "address",     label: "住所" },
      { key: "propType",    label: "物件種別" },
      { key: "propName",    label: "物件名" },
      { key: "bizName",     label: "事業所名" },
      { key: "roomNo",      label: "部屋番号" },
      { key: "layout",      label: "間取り" },
      { key: "area",        label: "専有面積" },
      { key: "builtYear",   label: "完成年" },
      { key: "sellTiming",  label: "売却希望時期" },
      { key: "sellReason",  label: "売却理由" },
      { key: "receivedAt",  label: "受付日時" },
    ],
  },
  {
    key:           "lifull_homes",
    name:          "LIFULL HOME'S",
    domain:        "homes.co.jp",
    requiresLogin: false,
    description:   "メール本文から自動取得します（ID/PW設定不要）",
    color:         "#F97316",
    bgColor:       "#FFF7ED",
    sourceFields: [
      { key: "assessmentId",  label: "査定ID（問合せ番号）" },
      { key: "fullName",      label: "お名前" },
      { key: "furigana",      label: "フリガナ" },
      { key: "phone",         label: "電話番号" },
      { key: "email",         label: "メールアドレス" },
      { key: "address",       label: "ご住所" },
      { key: "contactTime",   label: "希望の連絡時間" },
      { key: "sendCount",     label: "同時送信社数" },
      { key: "propType",      label: "物件種別" },
      { key: "propAddress",   label: "所在地" },
      { key: "landArea",      label: "土地面積" },
      { key: "buildingArea",  label: "建物面積" },
      { key: "exclusiveArea", label: "専有面積" },
      { key: "currentStatus", label: "現況" },
      { key: "ownership",     label: "名義" },
      { key: "remainingDebt", label: "残債" },
      { key: "sellReason",    label: "売却理由" },
      { key: "sellTiming",    label: "売却希望時期" },
      { key: "request",       label: "ご要望" },
      { key: "receivedAt",    label: "受信日時" },
    ],
  },
  // 将来追加する媒体はここに追記するだけ
  {
    key:           "mansion_navi",
    name:          "マンションナビ",
    domain:        "mansionresearch.co.jp",
    requiresLogin: true,
    description:   "ログイン後にCSVエクスポートして取り込みます",
    color:         "#8B5CF6",
    bgColor:       "#F5F3FF",
    sourceFields: [
      { key: "査定ID",                   label: "査定ID" },
      { key: "査定日時",                  label: "査定日時" },
      { key: "物件種別",                  label: "物件種別" },
      { key: "査定依頼業種",              label: "査定依頼業種" },
      { key: "マンション名称",             label: "マンション名称" },
      { key: "部屋番号",                  label: "部屋番号" },
      { key: "物件住所（都道府県）",        label: "物件住所（都道府県）" },
      { key: "物件住所（市区町村）",        label: "物件住所（市区町村）" },
      { key: "物件住所（町名）",           label: "物件住所（町名）" },
      { key: "物件住所（丁目）",           label: "物件住所（丁目）" },
      { key: "物件住所（その他）",         label: "物件住所（その他）" },
      { key: "物件住所（フル）",           label: "物件住所（フル）" },
      { key: "築年",                      label: "築年" },
      { key: "専有面積",                  label: "専有面積" },
      { key: "依頼者名",                  label: "依頼者名" },
      { key: "依頼者名かな",              label: "依頼者名かな" },
      { key: "依頼者電話番号",             label: "依頼者電話番号" },
      { key: "依頼者メールアドレス",       label: "依頼者メールアドレス" },
      { key: "依頼者連絡先住所",           label: "依頼者連絡先住所" },
      { key: "依頼者年代",                label: "依頼者年代" },
      { key: "現在の状況",                label: "現在の状況" },
      { key: "毎月の家賃＋管理費",         label: "毎月の家賃＋管理費" },
      { key: "（賃貸）査定理由",           label: "（賃貸）査定理由" },
      { key: "物件との関係",              label: "物件との関係" },
      { key: "所有者名",                  label: "所有者名" },
      { key: "不動産会社への要望",         label: "不動産会社への要望" },
      { key: "査定依頼の理由",             label: "査定依頼の理由" },
      { key: "希望売却時期",              label: "希望売却時期" },
      { key: "希望売却額",               label: "希望売却額" },
      { key: "希望賃貸額",               label: "希望賃貸額" },
      { key: "購入年",                   label: "購入年" },
      { key: "リフォーム状況",            label: "リフォーム状況" },
      { key: "リフォーム状況（説明）",     label: "リフォーム状況（説明）" },
      { key: "買替について",              label: "買替について" },
      { key: "買替について（説明）",       label: "買替について（説明）" },
      { key: "おすすめポイント",           label: "おすすめポイント" },
      { key: "悪いポイント",              label: "悪いポイント" },
      { key: "課金ステータス",            label: "課金ステータス" },
    ],
  },
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
  gmailSettings     = [],
}) {
  const navigate = useNavigate();
  const gmailRuleCount = gmailSettings.length;

  return (
    <Page title="自動連携設定" icon={<Globe size={20} />}>

      {/* ── 媒体連携 ── */}
      <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: -8, marginBottom: 20 }}>
        反響メールを自動取り込みする媒体を選択して設定を行ってください。
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: 20,
        marginBottom: 48,
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

      {/* ── カスタムメール取り込み ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Mail size={15} color={THEME.primary} />
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain }}>カスタムメール取り込み</span>
        </div>
        <p style={{ fontSize: 12, color: THEME.textMuted, margin: 0 }}>
          媒体ポータル以外のメールから顧客を自動登録するルールを設定します
        </p>
      </div>

      <div style={{
        ...styles.card,
        padding: "24px 28px",
        marginBottom: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        borderLeft: `4px solid ${THEME.primary}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            backgroundColor: "#EEF2FF",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Settings size={24} color={THEME.primary} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>
                カスタム取り込みルール
              </span>
              {gmailRuleCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  backgroundColor: THEME.primary, color: "white",
                  borderRadius: 999, padding: "2px 8px",
                }}>
                  {gmailRuleCount}件設定済み
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.6 }}>
              転送されたメールを件名キーワードで判別し、顧客として自動登録します。<br />
              媒体連携で対応していない流入元に対して設定できます。
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/gmail-settings")}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
            flexShrink: 0,
            padding: "10px 20px",
          }}
        >
          <PlusCircle size={16} />
          {gmailRuleCount > 0 ? "ルールを編集" : "ルールを追加"}
        </button>
      </div>

      {/* ── 取り込みエラーログ ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <AlertCircle size={15} color="#EF4444" />
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textMain }}>エラーログ</span>
        </div>
        <p style={{ fontSize: 12, color: THEME.textMuted, margin: 0 }}>
          取り込みに失敗したメールを確認できます
        </p>
      </div>

      <div
        onClick={() => navigate("/import-errors")}
        style={{
          ...styles.card,
          padding: "20px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 16,
          transition: "box-shadow 0.15s, transform 0.15s",
          maxWidth: 480,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.borderColor = "#EF4444";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = styles.card.boxShadow;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = THEME.border;
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          backgroundColor: "#FEF2F2",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertCircle size={24} color="#EF4444" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain, marginBottom: 4 }}>
            取り込みエラーログ
          </div>
          <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5 }}>
            キーワード不一致等で取り込めなかったメールを確認します
          </div>
        </div>
        <ChevronRight size={16} color={THEME.textMuted} style={{ flexShrink: 0 }} />
      </div>

    </Page>
  );
}