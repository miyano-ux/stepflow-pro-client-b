import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Check, UserPlus, Loader2, AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";

// ==========================================
// 💬 Toast/Modal コンポーネント
// ==========================================
function AlertModal({ modal, onClose }) {
  if (!modal) return null;
  const isSuccess = modal.type === "success";
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "32px 36px",
        minWidth: "340px", maxWidth: "480px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
        textAlign: "center",
      }}>
        {isSuccess
          ? <CheckCircle2 size={48} color="#22c55e" strokeWidth={1.5} />
          : <AlertCircle size={48} color={THEME.danger} strokeWidth={1.5} />
        }
        <p style={{ fontSize: "15px", color: THEME.text, margin: 0, lineHeight: 1.6 }}>
          {modal.message}
        </p>
        <button
          onClick={onClose}
          style={{
            ...styles.btn,
            ...(isSuccess ? styles.btnPrimary : { background: THEME.danger, color: "#fff" }),
            minWidth: "120px", height: "42px", fontSize: "14px",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// メールのローカル部から slug の初期候補を作る
const slugFromEmail = (email) =>
  String(email || "").split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");

// Google ドライブの共有リンクを <img> で表示できる直リンクへ変換する
// （公開ページ PublicMemberPage.jsx と同じロジック。プレビュー表示に使用）
const toDisplayablePhotoUrl = (raw) => {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/drive\.google\.com\/thumbnail\?/.test(url)) return url;
  if (/lh3\.googleusercontent\.com\//.test(url)) return url;
  let id = "", m;
  if ((m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)))   id = m[1];
  else if ((m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)))  id = m[1];
  else if ((m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)))    id = m[1];
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  return url;
};

// 写真URLのライブプレビュー（key={url} で URL 変更時にエラー状態をリセット）
function PhotoPreview({ url }) {
  const [err, setErr] = useState(false);
  const src = toDisplayablePhotoUrl(url);
  if (!src) return null;
  return (
    <div style={{ marginTop: 12 }}>
      {err ? (
        <div style={{
          fontSize: 12, color: THEME.danger, background: "#FEF2F2",
          border: `1px solid #FECACA`, borderRadius: 8, padding: "10px 12px", lineHeight: 1.6,
        }}>
          画像を表示できませんでした。URL と共有設定（「リンクを知っている全員」）をご確認ください。
        </div>
      ) : (
        <img
          src={src}
          alt="プレビュー"
          onError={() => setErr(true)}
          style={{
            width: 120, height: 120, objectFit: "cover",
            borderRadius: 8, border: `1px solid ${THEME.border}`,
            backgroundColor: THEME.bg,
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// 👤 UserForm - ユーザー登録・編集ページ
// ==========================================

/**
 * ユーザーの新規登録および既存情報の編集ページ
 * @param {string} masterUrl - マスタAPIのURL
 */
function UserForm({ masterUrl, onRefreshStaff, staffList = [] }) {
  const navigate = useNavigate();
  const { id } = useParams();                    // id = encodeされたメールアドレス（編集時）
  const isEdit = !!id;
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { type: "success"|"error", message: string }
  const [copied, setCopied] = useState(false);

  const showModal = (type, message) => setModal({ type, message });
  const closeModal = () => {
    const wasSuccess = modal?.type === "success";
    setModal(null);
    if (wasSuccess) {
      onRefreshStaff?.();
      navigate("/users");
    }
  };

  // 初期データの安全なパース（編集時は location.state から取得）
  const [form, setForm] = useState(() => {
    const base = {
      email: "",
      company: CLIENT_COMPANY_NAME,
      lastName: "",
      firstName: "",
      phone: "",
      // ── 紹介ページ項目 ──
      slug: "",
      role: "",
      photoUrl: "",
      catchphrase: "",
      bio: "",
      career: "",
      achievements: "",
      published: false,
    };
    if (isEdit && location.state?.user) {
      return { ...base, ...location.state.user };
    }
    return base;
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // 公開URL（slug が決まっていれば組み立て）
  const effectiveSlug = (form.slug || (!isEdit ? slugFromEmail(form.email) : "")).trim();
  const publicUrl = effectiveSlug
    ? `${window.location.origin}/m/${effectiveSlug}`
    : "";

  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  // 保存処理
  const handleSave = async () => {
    if (!form.email || !form.lastName) {
      return showModal("error", "氏名とメールアドレスは必須です");
    }
    // 公開する場合は slug 必須
    if (form.published && !effectiveSlug) {
      return showModal("error", "紹介ページを公開するには、公開URL（slug）を入力してください");
    }

    // 新規登録時のみ: 既存ユーザーとのメール重複を事前にチェック
    if (!isEdit) {
      const norm = (v) => String(v || "").trim().toLowerCase();
      const duplicate = staffList.find((u) => norm(u.email) === norm(form.email));
      if (duplicate) {
        return showModal(
          "error",
          "このメールアドレスはすでに登録されています。氏名などを変更する場合は、ユーザー一覧の編集ボタンから行ってください。"
        );
      }
    }

    setLoading(true);
    try {
      // 電話番号のゼロ落ち防止
      const finalPhone = form.phone
        ? String(form.phone).startsWith("'")
          ? form.phone
          : "'" + form.phone
        : "";

      // 紹介ページ項目（add/edit 共通）
      const profile = {
        "slug": effectiveSlug,
        "役職": form.role || "",
        "写真URL": form.photoUrl || "",
        "キャッチコピー": form.catchphrase || "",
        "自己紹介": form.bio || "",
        "経歴": form.career || "",
        "実績": form.achievements || "",
        "公開": form.published ? "TRUE" : "",
      };

      // GAS の許可リストシートの列名に合わせたペイロード
      const payload = isEdit
        ? {
            action: "editAllowUser",        // 編集: メールで対象を特定
            "メール": decodeURIComponent(id),
            "会社名": CLIENT_COMPANY_NAME,
            "姓": form.lastName,
            "名": form.firstName,
            "電話番号": finalPhone,
            ...profile,
          }
        : {
            action: "addAllowUser",          // 新規登録
            "メール": String(form.email).trim(),
            "会社名": CLIENT_COMPANY_NAME,
            "姓": form.lastName,
            "名": form.firstName,
            "電話番号": finalPhone,
            ...profile,
          };

      const res = await axios.post(masterUrl, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });

      if (res.data.status === "success") {
        showModal("success", isEdit ? "ユーザー情報を更新しました" : "新しいユーザーを登録しました");
      } else if (res.data.code === "DUPLICATE_SLUG") {
        showModal("error", res.data.message || "この公開URLは既に使われています");
      } else {
        showModal("error", "保存失敗: " + (res.data.message || "不明なエラー"));
      }
    } catch (e) {
      showModal("error", "通信エラーが発生しました。インターネット接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={isEdit ? "ユーザー情報の編集" : "新規ユーザー登録"}>
      <AlertModal modal={modal} onClose={closeModal} />

      {/* 戻るボタン */}
      <button
        onClick={() => navigate("/users")}
        style={{
          background: "none", border: "none", color: THEME.primary,
          cursor: "pointer", fontWeight: "800", marginBottom: "32px",
          display: "flex", alignItems: "center", gap: 8, padding: 0,
        }}
      >
        <ChevronLeft size={20} />
        ユーザー一覧に戻る
      </button>

      <div style={{ ...styles.card, maxWidth: "600px", padding: "40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 姓・名 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                姓 <span style={{ color: THEME.danger }}>*</span>
              </label>
              <input
                style={styles.input}
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="例: 山田"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>名</label>
              <input
                style={styles.input}
                value={form.firstName}
                onChange={set("firstName")}
                placeholder="例: 太郎"
              />
            </div>
          </div>

          {/* メールアドレス */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              メールアドレス <span style={{ color: THEME.danger }}>*</span>
            </label>
            <input
              style={{ ...styles.input, backgroundColor: id ? THEME.bg : "white" }}
              value={form.email}
              onChange={set("email")}
              placeholder="example@stepflow.jp"
              disabled={isEdit}
            />
            {id && (
              <p style={{ fontSize: 11, color: THEME.textMuted, marginTop: 8 }}>
                ※ メールアドレスは固有キーのため変更できません
              </p>
            )}
          </div>

          {/* 電話番号 */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>電話番号</label>
            <input
              style={styles.input}
              value={String(form.phone || "").replace(/'/g, "")}
              onChange={set("phone")}
              placeholder="09012345678"
            />
          </div>

          {/* ───────── メンバー紹介ページ ───────── */}
          <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: 28, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: THEME.textMain }}>
                メンバー紹介ページ
              </h3>
              {/* 公開トグル */}
              <button
                type="button"
                onClick={() => setForm({ ...form, published: !form.published })}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: form.published ? THEME.primary : THEME.textMuted }}>
                  {form.published ? "公開中" : "非公開"}
                </span>
                <span
                  style={{
                    width: 44, height: 26, borderRadius: 99, position: "relative",
                    backgroundColor: form.published ? THEME.primary : THEME.border,
                    transition: "background 0.2s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute", top: 3, left: form.published ? 21 : 3,
                      width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff",
                      transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </span>
              </button>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: THEME.textMuted, lineHeight: 1.6 }}>
              公開すると、ログイン不要で誰でも閲覧できる紹介ページが発行されます。
            </p>

            {/* 公開URL（slug） */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>公開URL（slug）</label>
              <input
                style={styles.input}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })}
                placeholder={!isEdit ? `未入力なら「${slugFromEmail(form.email) || "yamada"}」を使用` : "例: yamada-taro"}
              />
              {publicUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <code style={{
                    fontSize: 12, color: THEME.primary, background: THEME.bg,
                    padding: "6px 10px", borderRadius: 8, wordBreak: "break-all",
                  }}>
                    {publicUrl}
                  </code>
                  <button
                    type="button" onClick={copyUrl}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                      color: THEME.primary, background: "none", border: `1px solid ${THEME.border}`,
                      borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
                  >
                    <Copy size={13} /> {copied ? "コピーしました" : "コピー"}
                  </button>
                  {form.published && (
                    <a
                      href={publicUrl} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                        color: THEME.textMuted, textDecoration: "none", border: `1px solid ${THEME.border}`,
                        borderRadius: 8, padding: "5px 10px" }}
                    >
                      <ExternalLink size={13} /> プレビュー
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* 役職 */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>役職・肩書き</label>
              <input style={styles.input} value={form.role} onChange={set("role")} placeholder="例: 営業部 主任" />
            </div>

            {/* 写真URL */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>写真URL</label>
              <input style={styles.input} value={form.photoUrl} onChange={set("photoUrl")} placeholder="https://… （Google Drive等の公開画像URL）" />
              <PhotoPreview key={form.photoUrl} url={form.photoUrl} />
            </div>

            {/* キャッチコピー */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>キャッチコピー</label>
              <input style={styles.input} value={form.catchphrase} onChange={set("catchphrase")} placeholder="例: 地域密着20年、安心のサポート" />
            </div>

            {/* 自己紹介 */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>自己紹介</label>
              <textarea style={{ ...styles.input, minHeight: 110, resize: "vertical", lineHeight: 1.7 }}
                value={form.bio} onChange={set("bio")} placeholder="お客様へのメッセージや人柄が伝わる紹介文" />
            </div>

            {/* 経歴 */}
            <div style={{ ...styles.inputGroup, marginBottom: 20 }}>
              <label style={styles.label}>経歴</label>
              <textarea style={{ ...styles.input, minHeight: 90, resize: "vertical", lineHeight: 1.7 }}
                value={form.career} onChange={set("career")} placeholder="入社年・担当エリア・保有資格 など" />
            </div>

            {/* 実績 */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>実績</label>
              <textarea style={{ ...styles.input, minHeight: 90, resize: "vertical", lineHeight: 1.7 }}
                value={form.achievements} onChange={set("achievements")} placeholder="成約件数・表彰歴・得意分野 など" />
            </div>
          </div>

          {/* 保存・キャンセルボタン */}
          <div style={{ marginTop: "16px", display: "flex", gap: "16px" }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ ...styles.btn, ...styles.btnPrimary, flex: 2, height: "54px", fontSize: "15px" }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : isEdit ? (
                <Check size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {isEdit ? "変更を保存する" : "この内容で登録する"}
            </button>
            <button
              onClick={() => navigate("/users")}
              style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: "54px" }}
            >
              キャンセル
            </button>
          </div>

        </div>
      </div>
    </Page>
  );
}

export default UserForm;