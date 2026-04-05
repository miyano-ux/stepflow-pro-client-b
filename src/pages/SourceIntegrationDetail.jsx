import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  CheckCircle2, XCircle, Loader2, Globe, KeyRound,
  Zap, AlertCircle, ChevronLeft, Copy, Check, Mail,
  Bell, Phone, X, Plus, MessageSquare, UserCircle,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";
import Page from "../components/Page";
import StaffGroupSelect from "../components/StaffGroupSelect";
import { SUPPORTED_SOURCES } from "./SourceIntegrationIndex";

// ============================================================
// 🔗 SourceIntegrationDetail - 媒体連携 個別設定
// ============================================================

// ── スタイル ─────────────────────────────────────────────────
const S = {
  label: {
    fontSize: 11, fontWeight: 800, color: THEME.textMuted,
    display: "block", marginBottom: 6, userSelect: "none",
  },
  input: {
    ...styles.input,
    fontSize: 14,
    backgroundColor: THEME.card,
    color: THEME.textMain,
  },
  section: {
    ...styles.card,
    marginBottom: 20,
    padding: "20px 24px",
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: THEME.textMuted,
    textTransform: "uppercase", letterSpacing: "0.05em",
    marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
  },
  row: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16,
  },
  btn: (variant = "default") => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.15s",
    backgroundColor:
      variant === "primary" ? THEME.primary :
      variant === "danger"  ? "#FEE2E2"     : "#F3F4F6",
    color:
      variant === "primary" ? "white"  :
      variant === "danger"  ? "#DC2626" : THEME.textMain,
  }),
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 13, color: THEME.textMuted, background: "none",
    border: "none", cursor: "pointer", padding: "0 0 20px",
    fontWeight: 500,
  },
};

function LabelText({ children }) {
  return <span style={S.label}>{children}</span>;
}

// 転送先アドレス表示＋コピーボタン
function ForwardingAddressBox({ address }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      backgroundColor: "#F0F7FF",
      border: "1px solid #BFDBFE",
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        この媒体の転送先アドレス
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mail size={14} color="#3B82F6" style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: 13, fontFamily: "monospace", color: "#1E40AF",
          flex: 1, wordBreak: "break-all",
        }}>
          {address}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: "1px solid #BFDBFE", cursor: "pointer",
            backgroundColor: copied ? "#DCFCE7" : "white",
            color: copied ? "#166534" : "#1D4ED8",
            transition: "all 0.15s", flexShrink: 0,
          }}
        >
          {copied ? <><Check size={12} /> コピー済み</> : <><Copy size={12} /> コピー</>}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 8 }}>
        おうちクラベルの転送設定でこのアドレスを追加してください。
      </div>
    </div>
  );
}

export default function SourceIntegrationDetail({
  sourceIntegrations = [],
  sourceCredsStatus  = {},
  sourceLoginIds     = {},
  clientInfo         = {},
  scenarios          = [],
  statuses           = [],
  sources            = [],
  staffList          = [],
  groups             = [],
  formSettings       = [],
  fieldMappings      = {},
  gasUrl             = GAS_URL,
  onRefresh,
}) {
  const { sourceKey } = useParams();
  const navigate      = useNavigate();

  // 対応媒体リストから該当媒体を取得
  const src = SUPPORTED_SOURCES.find(s => s.key === sourceKey);
  if (!src) {
    return (
      <Page title="媒体連携設定" icon={<Globe size={20} />}>
        <p style={{ color: THEME.textMuted }}>該当する媒体が見つかりません。</p>
        <button style={S.backBtn} onClick={() => navigate("/source-integrations")}>
          <ChevronLeft size={14} /> 一覧に戻る
        </button>
      </Page>
    );
  }

  // 既存の連携ルールを取得
  const existingRule = sourceIntegrations.find(r => r["sourceKey"] === sourceKey) || {};

  // ── 状態 ─────────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({
    loginId:  sourceLoginIds[sourceKey] || "",
    password: "",
  });
  const [testResult,  setTestResult]  = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [credsSaved,  setCredsSaved]  = useState(false);
  const [credsSaving, setCredsSaving] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    source:     existingRule["流入元"]        || src.name,
    status:     existingRule["対応ステータス"] || "",
    staffEmail: existingRule["担当者メール"]   || "",
    scenarioId: existingRule["シナリオID"]     || "",
  });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleSaved,  setRuleSaved]  = useState(false);

  // ── 通知設定 ──────────────────────────────────────────────
  const [notifyUsers, setNotifyUsers] = useState(() => {
    try { return JSON.parse(existingRule["通知先ユーザー"] || "[]"); }
    catch { return []; }
  });
  const [notifyMessage, setNotifyMessage] = useState(
    existingRule["通知文言"] || `${src.name}から反響がありました。確認をお願いします。`
  );
  const [showAddUser, setShowAddUser] = useState(false);
  const [notifySaving, setNotifySaving] = useState(false);
  const [notifySaved,  setNotifySaved]  = useState(false);
  const addUserRef = useRef(null);

  useEffect(() => {
    if (!showAddUser) return;
    const handler = (e) => {
      if (addUserRef.current && !addUserRef.current.contains(e.target)) {
        setShowAddUser(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAddUser]);

  // ── フィールドマッピング状態 ──────────────────────────────────
  // { fieldKey: "保存先カラム名", ... }  e.g. { assessmentId: "問い合わせ番号" }
  const [fieldMapping,  setFieldMapping]  = useState(() => {
    const saved = fieldMappings[sourceKey] || [];
    const m = {};
    saved.forEach(({ fromField, toColumn }) => { if (fromField) m[fromField] = toColumn || ""; });
    return m;
  });
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingSaved,  setMappingSaved]  = useState(false);

  const scenarioIds = [...new Set((scenarios || []).map(s => s["シナリオID"]).filter(Boolean))];

  const api = (payload) =>
    axios.post(gasUrl, JSON.stringify(payload), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

  // ── 認証情報の保存 ───────────────────────────────────────────
  const handleSaveCreds = async () => {
    if (!loginForm.loginId || !loginForm.password) {
      alert("ログインIDとパスワードを入力してください");
      return;
    }
    setCredsSaving(true);
    try {
      await api({ action: "saveSourceCredentials", sourceKey, loginId: loginForm.loginId, password: loginForm.password });
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2000);
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setCredsSaving(false);
    }
  };

  // ── テストログイン ────────────────────────────────────────────
  const handleTestLogin = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api({ action: "testSourceLogin", sourceKey });
      setTestResult({ ok: res?.data?.status === "success", message: res?.data?.message || "" });
    } catch (e) {
      setTestResult({ ok: false, message: e?.message || "通信エラー" });
    } finally {
      setTestLoading(false);
    }
  };

  // ── 連携ルールの保存 ──────────────────────────────────────────
  const handleSaveRule = async () => {
    setRuleSaving(true);
    try {
      await api({
        action:      "saveSourceIntegration",
        sourceKey,
        source:      ruleForm.source,
        status:      ruleForm.status,
        staffEmail:  ruleForm.staffEmail,
        scenarioId:  ruleForm.scenarioId,
        notifyUsers: JSON.stringify(notifyUsers),
        notifyMessage,
      });
      setRuleSaved(true);
      setTimeout(() => setRuleSaved(false), 2000);
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setRuleSaving(false);
    }
  };

  // ── 通知設定の保存 ───────────────────────────────────────────
  const handleSaveNotify = async () => {
    setNotifySaving(true);
    try {
      await api({
        action:        "saveSourceIntegration",
        sourceKey,
        source:        ruleForm.source,
        status:        ruleForm.status,
        staffEmail:    ruleForm.staffEmail,
        scenarioId:    ruleForm.scenarioId,
        notifyUsers:   JSON.stringify(notifyUsers),
        notifyMessage,
      });
      setNotifySaved(true);
      setTimeout(() => setNotifySaved(false), 2000);
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setNotifySaving(false);
    }
  };

  // ── フィールドマッピングの保存 ────────────────────────────────
  const handleSaveMapping = async () => {
    setMappingSaving(true);
    try {
      const mapping = Object.entries(fieldMapping).map(([fromField, toColumn]) => ({
        fromField,
        toColumn: toColumn || "",
      }));
      await api({ action: "saveFieldMapping", sourceKey, mapping });
      setMappingSaved(true);
      setTimeout(() => setMappingSaved(false), 2000);
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setMappingSaving(false);
    }
  };

  // ── マッピング先カラム選択肢 ─────────────────────────────────
  // 「顧客情報」グループ：processCustomerRegistration で直接処理される特殊カラム
  const PERSONAL_DEST_COLS = ["姓", "名", "姓（カナ）", "名（カナ）", "電話番号", "メールアドレス"];
  // 「物件・査定情報」グループ：data{} に格納される汎用カラム
  const PROPERTY_DEST_COLS = [
    "問い合わせ番号", "物件種別", "物件名", "物件住所", "所在地",
    "土地面積", "建物面積", "専有面積", "間取り", "築年", "完成年",
    "現況", "名義", "残債", "事業所名", "部屋番号",
    "売却希望時期", "売却理由", "ご要望", "希望連絡時間",
    "受付日時", "受信日時", "住所", "郵便番号",
  ];
  const ALL_FIXED = new Set([...PERSONAL_DEST_COLS, ...PROPERTY_DEST_COLS]);
  const customDestCols = (formSettings || [])
    .map(f => f.name)
    .filter(n => !ALL_FIXED.has(n));
  const destinationOptions = [
    { value: "", label: "— 保存しない —" },
    { value: "__group_personal__", label: "── 顧客情報 ──", disabled: true },
    ...PERSONAL_DEST_COLS.map(c => ({ value: c, label: c })),
    { value: "__group_property__", label: "── 物件・査定情報 ──", disabled: true },
    ...PROPERTY_DEST_COLS.map(c => ({ value: c, label: c })),
    ...(customDestCols.length > 0 ? [
      { value: "__group_custom__", label: "── カスタム項目 ──", disabled: true },
      ...customDestCols.map(c => ({ value: c, label: c })),
    ] : []),
  ];

  const isConfigured = src.requiresLogin ? !!sourceCredsStatus?.[sourceKey] : true;

  return (
    <Page
      title={src.name}
      icon={<Globe size={20} color={src.color || THEME.primary} />}
    >
      {/* 戻るボタン */}
      <button style={S.backBtn} onClick={() => navigate("/source-integrations")}>
        <ChevronLeft size={14} /> 媒体一覧に戻る
      </button>

      {/* ── ステータスバナー ─────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px", borderRadius: 10, marginBottom: 24,
        backgroundColor: isConfigured ? "#DCFCE7" : "#FEF3C7",
        border: `1px solid ${isConfigured ? "#86EFAC" : "#FDE68A"}`,
        fontSize: 13, color: isConfigured ? "#166534" : "#92400E",
      }}>
        {src.requiresLogin ? (
          isConfigured
            ? <><CheckCircle2 size={15} /> 認証情報が設定されています</>
            : <><AlertCircle size={15} /> 認証情報が未設定です。下の「認証情報」セクションで設定してください。</>
        ) : (
          <><Zap size={15} /> ログイン不要の媒体です。転送先アドレスを設定するだけで自動取り込みが始まります。</>
        )}
      </div>

      {/* ── 転送設定セクション ─────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          <Mail size={13} />
          転送設定
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px" }}>
          {src.name}から届いたメールを、以下のアドレスに転送するよう設定してください。
        </p>
        {clientInfo?.forwardingAddress ? (
          <ForwardingAddressBox address={clientInfo.forwardingAddress} />
        ) : (
          <div style={{ fontSize: 13, color: THEME.textMuted, padding: "12px 0" }}>
            転送先アドレスを取得できません。管理者に確認してください。
          </div>
        )}
      </div>

      {/* ── 認証情報セクション（ログイン必要な媒体のみ） ────── */}
      {src.requiresLogin && (
        <div style={S.section}>
          <div style={S.sectionTitle}>
            <KeyRound size={13} />
            認証情報
          </div>
          <div style={S.row}>
            <div>
              <LabelText>ログインID（メールアドレス）</LabelText>
              <input
                style={S.input}
                type="text"
                placeholder="例: info@example.com"
                value={loginForm.loginId}
                onChange={e => setLoginForm(p => ({ ...p, loginId: e.target.value }))}
              />
            </div>
            <div>
              <LabelText>パスワード</LabelText>
              <input
                style={S.input}
                type="password"
                placeholder="パスワードを入力"
                value={loginForm.password}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={S.btn("default")} onClick={handleSaveCreds} disabled={credsSaving}>
              {credsSaving
                ? <><Loader2 size={14} /> 保存中…</>
                : credsSaved
                  ? <><CheckCircle2 size={14} /> 保存しました</>
                  : "認証情報を保存"
              }
            </button>
            <button style={S.btn("default")} onClick={handleTestLogin} disabled={testLoading}>
              {testLoading ? <><Loader2 size={14} /> 確認中…</> : "ログインテスト"}
            </button>
            {testResult && (
              <span style={{
                fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                color: testResult.ok ? "#166534" : "#DC2626",
              }}>
                {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 連携ルールセクション ────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          連携ルール（取り込み時の初期値）
        </div>
        <div style={S.row}>
          <div>
            <LabelText>流入元</LabelText>
            <input
              style={S.input}
              type="text"
              placeholder={src.name}
              value={ruleForm.source}
              onChange={e => setRuleForm(p => ({ ...p, source: e.target.value }))}
            />
          </div>
          <div>
            <LabelText>初期ステータス</LabelText>
            <CustomSelect
              value={ruleForm.status}
              onChange={v => setRuleForm(p => ({ ...p, status: v }))}
              options={[
                { value: "", label: "未設定（デフォルト）" },
                ...(statuses || []).map(s => ({ value: s.name, label: s.name })),
              ]}
            />
          </div>
        </div>
        <div style={S.row}>
          <div>
            <LabelText>担当者</LabelText>
            <StaffGroupSelect
              value={ruleForm.staffEmail}
              onChange={v => setRuleForm(p => ({ ...p, staffEmail: v }))}
              staffList={staffList}
              groups={groups}
              placeholder="未設定（自動割当）"
            />
          </div>
          <div>
            <LabelText>適用シナリオ</LabelText>
            <CustomSelect
              value={ruleForm.scenarioId}
              onChange={v => setRuleForm(p => ({ ...p, scenarioId: v }))}
              options={[
                { value: "", label: "未設定" },
                ...scenarioIds.map(id => ({ value: id, label: id })),
              ]}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button style={S.btn("primary")} onClick={handleSaveRule} disabled={ruleSaving}>
            {ruleSaving
              ? <><Loader2 size={14} /> 保存中…</>
              : ruleSaved
                ? <><CheckCircle2 size={14} /> 保存しました</>
                : "連携ルールを保存"
            }
          </button>
        </div>
      </div>

      {/* ── 通知設定セクション ──────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          <Bell size={13} />
          通知設定（反響受信時のSMS通知）
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 20px" }}>
          この媒体から反響があった際に、SMS通知を送るユーザーを設定します。
        </p>

        {/* 通知文言 */}
        <div style={{ marginBottom: 20 }}>
          <LabelText>通知文言</LabelText>
          <textarea
            style={{
              ...S.input,
              width: "100%", boxSizing: "border-box",
              minHeight: 72, resize: "vertical", lineHeight: 1.6,
              fontFamily: "inherit",
            }}
            value={notifyMessage}
            onChange={e => setNotifyMessage(e.target.value)}
            placeholder={`${src.name}から反響がありました。確認をお願いします。`}
          />
          <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 4 }}>
            ※ 登録のたびに上記の文言でSMSが送信されます。
          </div>
        </div>

        {/* 通知先ユーザー一覧 */}
        <LabelText>通知先ユーザー</LabelText>

        {notifyUsers.length === 0 && (
          <div style={{
            fontSize: 13, color: THEME.textMuted,
            padding: "12px 16px", backgroundColor: "#F8FAFC",
            borderRadius: 8, border: `1px solid ${THEME.border}`,
            marginBottom: 12,
          }}>
            通知先が設定されていません。＋ボタンでユーザーを追加してください。
          </div>
        )}

        {notifyUsers.map((u, idx) => (
          <div key={idx} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto",
            gap: 8, alignItems: "center", marginBottom: 8,
          }}>
            {/* 名前（表示のみ） */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px", borderRadius: 8,
              backgroundColor: "#EEF2FF",
              border: `1px solid #C7D2FE`,
              fontSize: 13, fontWeight: 600, color: THEME.primary,
            }}>
              <UserCircle size={14} />
              {u.name}
            </div>

            {/* 電話番号入力 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={13} color={THEME.textMuted} style={{ flexShrink: 0 }} />
              <input
                style={{ ...S.input, flex: 1, fontSize: 13 }}
                type="tel"
                placeholder="09012345678"
                value={u.phone || ""}
                onChange={e => {
                  const updated = notifyUsers.map((x, i) =>
                    i === idx ? { ...x, phone: e.target.value } : x
                  );
                  setNotifyUsers(updated);
                }}
              />
            </div>

            {/* 削除ボタン */}
            <button
              onClick={() => setNotifyUsers(notifyUsers.filter((_, i) => i !== idx))}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 8, border: "none",
                backgroundColor: "#FEE2E2", color: "#DC2626", cursor: "pointer",
                flexShrink: 0,
              }}
              title="削除"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* ＋ユーザー追加ボタン＋ドロップダウン */}
        <div ref={addUserRef} style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
          <button
            style={{
              ...S.btn("default"),
              border: `1px dashed ${THEME.border}`,
              color: THEME.primary, gap: 6,
            }}
            onClick={() => setShowAddUser(v => !v)}
          >
            <Plus size={14} /> ユーザーを追加
          </button>

          {showAddUser && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
              backgroundColor: "white", borderRadius: 12,
              border: `1px solid ${THEME.border}`,
              boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
              minWidth: 220, overflow: "hidden",
            }}>
              <div style={{ padding: 6 }}>
                {(staffList || []).length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: 13, color: THEME.textMuted }}>
                    ユーザーが見つかりません
                  </div>
                )}
                {(staffList || [])
                  .filter(s => !notifyUsers.some(u => u.email === s.email))
                  .map(s => {
                    const name = `${s.lastName || ""} ${s.firstName || ""}`.trim() || s.email;
                    return (
                      <button
                        key={s.email}
                        onClick={() => {
                          const phone = s.phone ? String(s.phone).replace(/'/g, "").trim() : "";
                          setNotifyUsers(prev => [...prev, { email: s.email, name, phone }]);
                          setShowAddUser(false);
                        }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", border: "none", borderRadius: 8,
                          cursor: "pointer", backgroundColor: "transparent",
                          fontSize: 13, color: THEME.textMain, fontWeight: 600,
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F0F7FF"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%",
                          backgroundColor: "#EEF2FF", display: "flex",
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <UserCircle size={15} color={THEME.primary} />
                        </div>
                        {name}
                      </button>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>

        {/* 通知設定 保存ボタン */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button style={S.btn("primary")} onClick={handleSaveNotify} disabled={notifySaving}>
            {notifySaving
              ? <><Loader2 size={14} /> 保存中…</>
              : notifySaved
                ? <><CheckCircle2 size={14} /> 保存しました</>
                : "通知設定を保存"
            }
          </button>
        </div>
      </div>

      {/* ── フィールドマッピングセクション（email_body 媒体のみ） ── */}
      {src.sourceFields?.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>
            フィールドマッピング
          </div>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 20px" }}>
            メールから取得した各項目を、顧客DBのどのカラムに保存するか設定します。「保存しない」にした項目は取り込み時に無視されます。
          </p>

          {/* テーブルヘッダー */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 24px 1fr",
            gap: 8, alignItems: "center",
            padding: "6px 4px", marginBottom: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.04em" }}>
              メール内フィールド
            </span>
            <span />
            <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, letterSpacing: "0.04em" }}>
              保存先カラム
            </span>
          </div>

          {/* マッピング行 */}
          {src.sourceFields.map(field => {
            const currentVal = fieldMapping[field.key] || "";
            const isMapped   = !!currentVal;
            return (
              <div
                key={field.key}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 24px 1fr",
                  gap: 8, alignItems: "center", marginBottom: 6,
                }}
              >
                {/* 左：媒体フィールド名 */}
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: isMapped ? THEME.textMain : THEME.textMuted,
                  padding: "10px 14px",
                  backgroundColor: isMapped ? "#F0FDF4" : "#F8FAFC",
                  border: `1px solid ${isMapped ? "#86EFAC" : THEME.border}`,
                  borderRadius: 8,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {isMapped && (
                    <span style={{ color: "#16A34A", flexShrink: 0, fontSize: 11 }}>●</span>
                  )}
                  {field.label}
                </div>

                {/* 矢印 */}
                <div style={{
                  textAlign: "center", fontSize: 14, color: THEME.textMuted,
                  opacity: isMapped ? 1 : 0.3,
                }}>
                  →
                </div>

                {/* 右：保存先カラム選択 */}
                <CustomSelect
                  value={currentVal}
                  onChange={v => setFieldMapping(prev => ({ ...prev, [field.key]: v }))}
                  options={destinationOptions}
                  placeholder="— 保存しない —"
                />
              </div>
            );
          })}

          {/* マッピング済み件数インジケーター */}
          <div style={{
            fontSize: 12, color: THEME.textMuted,
            margin: "12px 0 16px", padding: "8px 12px",
            backgroundColor: "#F8FAFC", borderRadius: 8,
            border: `1px solid ${THEME.border}`,
          }}>
            {(() => {
              const mapped = src.sourceFields.filter(f => fieldMapping[f.key]).length;
              return `${src.sourceFields.length} 項目中 ${mapped} 項目をマッピング設定済み`;
            })()}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button style={S.btn("primary")} onClick={handleSaveMapping} disabled={mappingSaving}>
              {mappingSaving
                ? <><Loader2 size={14} /> 保存中…</>
                : mappingSaved
                  ? <><CheckCircle2 size={14} /> 保存しました</>
                  : "マッピングを保存"
              }
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}