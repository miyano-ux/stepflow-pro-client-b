import React, { useState, useEffect } from "react";
import axios from "axios";
import { Phone, Link2, Loader2, Check, Megaphone } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";
import { useToast } from "../ToastContext";

// ==========================================
// 📣 PublicPageSettings - 紹介ページ共通設定（会社単位）
// ==========================================
// ユーザー管理画面（UserManager.jsx）に組み込んで使う。
// スタッフ紹介公開ページ（/m/:slug）下部の固定CTAバーに表示する
// 「電話番号」「URL（種別つき）」を会社単位で設定する。
//
// URL種別とボタン表記の対応：
//   予約       → 「📅 予約日時を選択」（従来どおり）
//   ホームページ → 「🏠 ホームページ」
//   その他     → 「🔗 ＋ボタンラベルのテキスト」（その他選択時はテキスト必須）
//
// データはライセンスGASの「公開ページ設定」シート
// （会社名/電話番号/URL/URL種別/ボタンラベル）。
//   取得: GET  ?action=getPublicPageConfig&company=...
//         → config: { phone, bookingUrl, urlType, urlLabel }
//   保存: POST { action:"savePublicPageConfig", 会社名, 電話番号, URL, 予約URL(旧GAS互換), URL種別, ボタンラベル }
// 電話番号・URLの両方未設定の場合、公開ページのCTAバーは表示されない。
//
// props:
//   masterUrl   - MASTER_WHITELIST_API
//   companyName - CLIENT_COMPANY_NAME

const URL_TYPES = [
  { value: "予約",       label: "予約URL",     buttonText: "予約日時を選択" },
  { value: "ホームページ", label: "ホームページ", buttonText: "ホームページ" },
  { value: "その他",     label: "その他",      buttonText: null }, // null = ボタンラベル入力値を使用
];

const normalizeUrlType = (v) =>
  URL_TYPES.some((t) => t.value === v) ? v : "予約";

function PublicPageSettings({ masterUrl, companyName }) {
  // useToast はトースト表示関数そのものを返す（ToastContext.jsx: Provider value={showToast}）
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [phone, setPhone] = useState("");
  const [url, setUrl] = useState("");
  const [urlType, setUrlType] = useState("予約");
  const [urlLabel, setUrlLabel] = useState("");
  const [saved, setSaved] = useState({ phone: "", url: "", urlType: "予約", urlLabel: "" });

  // 初回ロード
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(
          `${masterUrl}?action=getPublicPageConfig&company=${encodeURIComponent(companyName)}&_t=${Date.now()}`
        );
        if (!alive) return;
        const cfg = res.data?.config || {};
        const next = {
          phone: String(cfg.phone || ""),
          url: String(cfg.bookingUrl || ""),
          urlType: normalizeUrlType(String(cfg.urlType || "")),
          urlLabel: String(cfg.urlLabel || ""),
        };
        setPhone(next.phone);
        setUrl(next.url);
        setUrlType(next.urlType);
        setUrlLabel(next.urlLabel);
        setSaved(next);
        setLoadError(false);
      } catch {
        // GAS未更新（unknown action）や通信エラー時：編集は可能にしつつ注意書きを出す
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [masterUrl, companyName]);

  const dirty =
    phone !== saved.phone || url !== saved.url ||
    urlType !== saved.urlType || urlLabel !== saved.urlLabel;

  // 現在の設定でCTAボタンに表示されるテキスト
  const typeDef = URL_TYPES.find((t) => t.value === urlType);
  const buttonPreview = typeDef?.buttonText ?? (urlLabel.trim() || "（テキスト未入力）");

  const handleSave = async () => {
    const u = url.trim();
    if (u && !/^https?:\/\//.test(u)) {
      return showToast("URLは http:// または https:// で始まる形式で入力してください", "warning");
    }
    if (urlType === "その他" && u && !urlLabel.trim()) {
      return showToast("URL種別が「その他」の場合は、ボタンに表示するテキストを入力してください", "warning");
    }
    setSaving(true);
    try {
      const res = await axios.post(
        masterUrl,
        JSON.stringify({
          action: "savePublicPageConfig",
          "会社名": companyName,
          "電話番号": phone.trim(),
          "URL": u,
          "予約URL": u, // 旧GAS（3列構成）互換のため同値を併送
          "URL種別": urlType,
          "ボタンラベル": urlLabel.trim(),
        }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data?.status === "success") {
        const next = { phone: phone.trim(), url: u, urlType, urlLabel: urlLabel.trim() };
        setSaved(next);
        setPhone(next.phone);
        setUrl(next.url);
        setUrlLabel(next.urlLabel);
        showToast("紹介ページ共通設定を保存しました", "success");
      } else {
        showToast("保存失敗: " + (res.data?.message || "不明なエラー"), "error");
      }
    } catch {
      showToast("通信エラーが発生しました。時間をおいて再度お試しください。", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      backgroundColor: THEME.card, borderRadius: 16, border: `1px solid ${THEME.border}`,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "24px 24px 26px", marginBottom: 48,
    }}>
      {/* 見出し */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Megaphone size={20} color={THEME.primary} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: THEME.textMain }}>
          紹介ページ共通設定
        </h2>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.7 }}>
        全スタッフの紹介ページ下部に表示される「電話」「リンク」ボタンの設定です。
        両方未設定の場合、ボタンは表示されません。
      </p>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.textMuted, fontSize: 13, padding: "8px 0" }}>
          <Loader2 size={16} className="animate-spin" /> 読み込み中...
        </div>
      ) : (
        <>
          {loadError && (
            <div style={{
              fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A",
              borderRadius: 8, padding: "10px 12px", lineHeight: 1.6, marginBottom: 16,
            }}>
              現在の設定値を取得できませんでした。このまま保存すると入力値で上書きされます。
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, maxWidth: 520 }}>
            {/* 電話番号 */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={14} /> 電話番号
              </label>
              <input
                style={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="例: 03-1234-5678"
              />
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "6px 0 0" }}>
                入力どおりに表示されます（タップで発信されます）
              </p>
            </div>

            {/* URL種別 */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={14} /> URL種別
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                {URL_TYPES.map((t) => {
                  const selected = urlType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setUrlType(t.value)}
                      aria-pressed={selected}
                      style={{
                        padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                        fontSize: 13, fontWeight: 800,
                        border: selected ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                        backgroundColor: selected ? "#F5F3FF" : "#fff",
                        color: selected ? THEME.primary : THEME.textMuted,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
                ボタン表記：予約URL→「予約日時を選択」／ホームページ→「ホームページ」／その他→下で指定したテキスト
              </p>
            </div>

            {/* URL */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>URL</label>
              <input
                style={styles.input}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            {/* ボタンラベル（その他のみ） */}
            {urlType === "その他" && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  ボタンに表示するテキスト <span style={{ color: THEME.danger }}>*</span>
                </label>
                <input
                  style={styles.input}
                  value={urlLabel}
                  onChange={(e) => setUrlLabel(e.target.value)}
                  placeholder="例: 物件一覧を見る"
                  maxLength={20}
                />
              </div>
            )}

            {/* ボタン表示プレビュー */}
            {url.trim() && (
              <p style={{ fontSize: 12, color: THEME.textMain, margin: 0 }}>
                ボタン表示：<span style={{
                  display: "inline-block", background: THEME.primary, color: "#fff",
                  fontSize: 12, fontWeight: 800, padding: "6px 14px", borderRadius: 8,
                }}>{buttonPreview}</span>
              </p>
            )}
          </div>

          {/* 保存 */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{
                ...styles.btn, ...styles.btnPrimary, height: 44, fontSize: 14,
                opacity: saving || !dirty ? 0.6 : 1,
                cursor: saving || !dirty ? "default" : "pointer",
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              設定を保存する
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default PublicPageSettings;