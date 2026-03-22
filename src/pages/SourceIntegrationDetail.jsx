import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  CheckCircle2, XCircle, Loader2, Globe, KeyRound,
  Zap, AlertCircle, ChevronLeft, Copy, Check, Mail,
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
        action:    "saveSourceIntegration",
        sourceKey,
        source:     ruleForm.source,
        status:     ruleForm.status,
        staffEmail: ruleForm.staffEmail,
        scenarioId: ruleForm.scenarioId,
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
    </Page>
  );
}