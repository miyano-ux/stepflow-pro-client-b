import React, { useState, useEffect } from "react";
import axios from "axios";
import { Phone, CalendarClock, Loader2, Check, Megaphone } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";
import { useToast } from "../ToastContext";

// ==========================================
// 📣 PublicPageSettings - 紹介ページ共通設定（会社単位）
// ==========================================
// ユーザー管理画面（UserManager.jsx）に組み込んで使う。
// スタッフ紹介公開ページ（/m/:slug）下部の固定CTAバーに表示する
// 「電話番号」「予約URL」を会社単位で設定する。
// データはライセンスGASの「公開ページ設定」シート（会社名/電話番号/予約URL）。
//   取得: GET  ?action=getPublicPageConfig&company=...
//   保存: POST { action: "savePublicPageConfig", 会社名, 電話番号, 予約URL }
// 両方未設定の場合、公開ページのCTAバーは表示されない。
//
// props:
//   masterUrl   - MASTER_WHITELIST_API
//   companyName - CLIENT_COMPANY_NAME

function PublicPageSettings({ masterUrl, companyName }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [phone, setPhone] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [saved, setSaved] = useState({ phone: "", bookingUrl: "" });

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
        const p = String(cfg.phone || "");
        const b = String(cfg.bookingUrl || "");
        setPhone(p);
        setBookingUrl(b);
        setSaved({ phone: p, bookingUrl: b });
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

  const dirty = phone !== saved.phone || bookingUrl !== saved.bookingUrl;

  const handleSave = async () => {
    const url = bookingUrl.trim();
    if (url && !/^https?:\/\//.test(url)) {
      return showToast("予約URLは http:// または https:// で始まる形式で入力してください", "warning");
    }
    setSaving(true);
    try {
      const res = await axios.post(
        masterUrl,
        JSON.stringify({
          action: "savePublicPageConfig",
          "会社名": companyName,
          "電話番号": phone.trim(),
          "予約URL": url,
        }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data?.status === "success") {
        setSaved({ phone: phone.trim(), bookingUrl: url });
        setPhone(phone.trim());
        setBookingUrl(url);
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
        全スタッフの紹介ページ下部に表示される「電話」「予約」ボタンの設定です。
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

            {/* 予約URL */}
            <div style={styles.inputGroup}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarClock size={14} /> 予約URL
              </label>
              <input
                style={styles.input}
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://…（予約フォーム・日程調整ツール等のURL）"
              />
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "6px 0 0" }}>
                「予約日時を選択」ボタンのリンク先になります
              </p>
            </div>
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