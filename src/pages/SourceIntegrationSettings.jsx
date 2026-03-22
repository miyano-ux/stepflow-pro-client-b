import React, { useState } from "react";
import axios from "axios";
import {
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  Globe, KeyRound, Zap, AlertCircle,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";
import Page from "../components/Page";
import StaffGroupSelect from "../components/StaffGroupSelect";

// ============================================================
// 🔗 SourceIntegrationSettings - 媒体連携設定
// ============================================================
//
// 【対応媒体の追加方法】
//   SUPPORTED_SOURCES にエントリを追加するだけ。
//   requiresLogin: false の媒体はID/PW入力欄が表示されない。
// ============================================================

const SUPPORTED_SOURCES = [
  {
    key:           "sumai_step",
    name:          "すまいステップ",
    domain:        "sumai-step.com",
    requiresLogin: true,
    description:   "ログイン後にCSVエクスポートして取り込みます",
  },
  {
    key:           "ouchi_clavel",
    name:          "おうちクラベル",
    domain:        "partners-od.jp",
    requiresLogin: false,
    description:   "メール本文から自動取得します（ID/PW設定不要）",
  },
  // 将来追加する媒体はここに追記するだけ
  // {
  //   key:           "lifull_homes",
  //   name:          "LIFULL HOME'S",
  //   domain:        "homes.co.jp",
  //   requiresLogin: true,
  //   description:   "ログイン後にCSVエクスポートして取り込みます",
  // },
];

// ── スタイル定数 ─────────────────────────────────────────────
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
  card: {
    ...styles.card,
    marginBottom: 20,
    padding: 0,
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 24px", cursor: "pointer", userSelect: "none",
  },
  cardBody: {
    padding: "0 24px 24px",
    borderTop: `1px solid ${THEME.border}`,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: THEME.textMuted,
    textTransform: "uppercase", letterSpacing: "0.05em",
    margin: "20px 0 12px",
  },
  row: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16,
  },
  badge: (color) => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
    backgroundColor: color === "green" ? "#DCFCE7" : color === "blue" ? "#DBEAFE" : "#F3F4F6",
    color: color === "green" ? "#166534" : color === "blue" ? "#1D4ED8" : "#374151",
  }),
  btn: (variant = "primary") => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.15s",
    backgroundColor: variant === "primary" ? THEME.primary : variant === "danger" ? "#FEE2E2" : "#F3F4F6",
    color: variant === "primary" ? "white" : variant === "danger" ? "#DC2626" : THEME.textMain,
  }),
};

// ── サブコンポーネント ────────────────────────────────────────

function LabelText({ children }) {
  return <span style={S.label}>{children}</span>;
}

function StatusBadge({ credsStatus, sourceKey, requiresLogin }) {
  if (!requiresLogin) {
    return (
      <span style={S.badge("blue")}>
        <Zap size={11} /> ログイン不要
      </span>
    );
  }
  if (credsStatus?.[sourceKey]) {
    return (
      <span style={S.badge("green")}>
        <CheckCircle2 size={11} /> 設定済み
      </span>
    );
  }
  return (
    <span style={S.badge("gray")}>
      <AlertCircle size={11} /> 未設定
    </span>
  );
}

// ── メインコンポーネント ─────────────────────────────────────

export default function SourceIntegrationSettings({
  sourceIntegrations = [],
  sourceCredsStatus  = {},
  sourceLoginIds     = {},
  scenarios          = [],
  statuses           = [],
  sources            = [],
  staffList          = [],
  groups             = [],
  gasUrl             = GAS_URL,
  onRefresh,
}) {
  // カードの開閉状態
  const [open, setOpen] = useState(() => {
    const init = {};
    SUPPORTED_SOURCES.forEach(s => { init[s.key] = true; });
    return init;
  });

  // 認証フォームの状態（媒体ごと）
  const [loginForms, setLoginForms] = useState(() => {
    const init = {};
    SUPPORTED_SOURCES.forEach(s => {
      init[s.key] = { loginId: sourceLoginIds[s.key] || "", password: "" };
    });
    return init;
  });

  // テストログインの結果
  const [testResults, setTestResults] = useState({});
  const [testLoading, setTestLoading] = useState({});

  // 連携ルールの状態（媒体ごと）
  const [ruleForms, setRuleForms] = useState(() => {
    const init = {};
    SUPPORTED_SOURCES.forEach(s => {
      const existing = sourceIntegrations.find(r => r["sourceKey"] === s.key) || {};
      init[s.key] = {
        source:     existing["流入元"]        || s.name,
        status:     existing["対応ステータス"] || "",
        staffEmail: existing["担当者メール"]   || "",
        scenarioId: existing["シナリオID"]     || "",
      };
    });
    return init;
  });
  const [ruleSaving, setRuleSaving] = useState({});
  const [ruleSaved,  setRuleSaved]  = useState({});

  const scenarioIds = [...new Set((scenarios || []).map(s => s["シナリオID"]).filter(Boolean))];

  const api = (payload) =>
    axios.post(gasUrl, JSON.stringify(payload), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

  // ── 認証情報の保存 ───────────────────────────────────────
  const handleSaveCreds = async (sourceKey) => {
    const { loginId, password } = loginForms[sourceKey];
    if (!loginId || !password) {
      alert("ログインIDとパスワードを入力してください");
      return;
    }
    try {
      await api({ action: "saveSourceCredentials", sourceKey, loginId, password });
      alert("認証情報を保存しました");
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    }
  };

  // ── テストログイン ───────────────────────────────────────
  const handleTestLogin = async (sourceKey) => {
    setTestLoading(prev => ({ ...prev, [sourceKey]: true }));
    setTestResults(prev => ({ ...prev, [sourceKey]: null }));
    try {
      const res = await api({ action: "testSourceLogin", sourceKey });
      const status = res?.data?.status;
      setTestResults(prev => ({
        ...prev,
        [sourceKey]: { ok: status === "success", message: res?.data?.message || "" },
      }));
    } catch (e) {
      setTestResults(prev => ({
        ...prev,
        [sourceKey]: { ok: false, message: e?.message || "通信エラー" },
      }));
    } finally {
      setTestLoading(prev => ({ ...prev, [sourceKey]: false }));
    }
  };

  // ── 連携ルールの保存 ─────────────────────────────────────
  const handleSaveRule = async (sourceKey) => {
    setRuleSaving(prev => ({ ...prev, [sourceKey]: true }));
    try {
      const rule = ruleForms[sourceKey];
      await api({
        action:    "saveSourceIntegration",
        sourceKey,
        source:     rule.source,
        status:     rule.status,
        staffEmail: rule.staffEmail,
        scenarioId: rule.scenarioId,
      });
      setRuleSaved(prev => ({ ...prev, [sourceKey]: true }));
      setTimeout(() => setRuleSaved(prev => ({ ...prev, [sourceKey]: false })), 2000);
      onRefresh?.();
    } catch (e) {
      alert("保存に失敗しました: " + (e?.message || e));
    } finally {
      setRuleSaving(prev => ({ ...prev, [sourceKey]: false }));
    }
  };

  const setRule = (sourceKey, field, value) => {
    setRuleForms(prev => ({
      ...prev,
      [sourceKey]: { ...prev[sourceKey], [field]: value },
    }));
  };

  const setLogin = (sourceKey, field, value) => {
    setLoginForms(prev => ({
      ...prev,
      [sourceKey]: { ...prev[sourceKey], [field]: value },
    }));
  };

  return (
    <Page title="媒体連携設定" icon={<Globe size={20} />}>
      <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: -8, marginBottom: 24 }}>
        反響メールを自動取り込みする媒体の認証情報と連携ルールを設定します。
      </p>

      {SUPPORTED_SOURCES.map((src) => {
        const isOpen    = open[src.key];
        const testRes   = testResults[src.key];
        const isTesting = testLoading[src.key];
        const isSavingR = ruleSaving[src.key];
        const isSavedR  = ruleSaved[src.key];
        const rule      = ruleForms[src.key] || {};
        const login     = loginForms[src.key] || {};

        return (
          <div key={src.key} style={S.card}>
            {/* ── カードヘッダー ────────────────────────────── */}
            <div style={S.cardHeader} onClick={() => setOpen(prev => ({ ...prev, [src.key]: !prev[src.key] }))}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, backgroundColor: "#F0F7FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Globe size={18} color="#3B82F6" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMain }}>{src.name}</span>
                    <StatusBadge credsStatus={sourceCredsStatus} sourceKey={src.key} requiresLogin={src.requiresLogin} />
                  </div>
                  <span style={{ fontSize: 12, color: THEME.textMuted }}>{src.description}</span>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />}
            </div>

            {/* ── カードボディ ──────────────────────────────── */}
            {isOpen && (
              <div style={S.cardBody}>

                {/* ─ 認証情報セクション（ログイン必要な媒体のみ） ─── */}
                {src.requiresLogin && (
                  <>
                    <div style={S.sectionTitle}>
                      <KeyRound size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                      認証情報
                    </div>
                    <div style={S.row}>
                      <div>
                        <LabelText>ログインID（メールアドレス）</LabelText>
                        <input
                          style={S.input}
                          type="text"
                          placeholder="例: info@example.com"
                          value={login.loginId}
                          onChange={e => setLogin(src.key, "loginId", e.target.value)}
                        />
                      </div>
                      <div>
                        <LabelText>パスワード</LabelText>
                        <input
                          style={S.input}
                          type="password"
                          placeholder="パスワードを入力"
                          value={login.password}
                          onChange={e => setLogin(src.key, "password", e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <button style={S.btn("default")} onClick={() => handleSaveCreds(src.key)}>
                        保存
                      </button>
                      <button
                        style={S.btn("default")}
                        onClick={() => handleTestLogin(src.key)}
                        disabled={isTesting}
                      >
                        {isTesting
                          ? <><Loader2 size={14} className="spin" /> 確認中…</>
                          : "ログインテスト"
                        }
                      </button>
                      {testRes && (
                        <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                          color: testRes.ok ? "#166534" : "#DC2626" }}>
                          {testRes.ok
                            ? <CheckCircle2 size={14} />
                            : <XCircle size={14} />
                          }
                          {testRes.message}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* ─ ログイン不要媒体の説明 ───────────────────── */}
                {!src.requiresLogin && (
                  <div style={{
                    marginTop: 20, marginBottom: 16, padding: "12px 16px",
                    backgroundColor: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE",
                    fontSize: 13, color: "#1D4ED8", display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <Zap size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      この媒体はログイン不要です。転送されたメールの本文から顧客情報を自動抽出します。
                      ID・パスワードの設定は不要です。
                    </span>
                  </div>
                )}

                {/* ─ 連携ルールセクション ──────────────────────── */}
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
                      value={rule.source}
                      onChange={e => setRule(src.key, "source", e.target.value)}
                    />
                  </div>
                  <div>
                    <LabelText>初期ステータス</LabelText>
                    <CustomSelect
                      value={rule.status}
                      onChange={v => setRule(src.key, "status", v)}
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
                      value={rule.staffEmail}
                      onChange={v => setRule(src.key, "staffEmail", v)}
                      staffList={staffList}
                      groups={groups}
                      placeholder="未設定（自動割当）"
                    />
                  </div>
                  <div>
                    <LabelText>適用シナリオ</LabelText>
                    <CustomSelect
                      value={rule.scenarioId}
                      onChange={v => setRule(src.key, "scenarioId", v)}
                      options={[
                        { value: "", label: "未設定" },
                        ...scenarioIds.map(id => ({ value: id, label: id })),
                      ]}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    style={S.btn("primary")}
                    onClick={() => handleSaveRule(src.key)}
                    disabled={isSavingR}
                  >
                    {isSavingR
                      ? <><Loader2 size={14} /> 保存中…</>
                      : isSavedR
                        ? <><CheckCircle2 size={14} /> 保存しました</>
                        : "連携ルールを保存"
                    }
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </Page>
  );
}