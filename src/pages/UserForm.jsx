import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Check, UserPlus, Loader2, AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";
import { useWindowWidth } from "../lib/useWindowWidth";

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

// ==========================================
// 🎨 紹介ページ デザインテンプレート定義
// ==========================================
// 公開ページ（PublicMemberPage.jsx）の8テンプレートと1対1対応。
// accent/subColor/bg はミニプレビュー描画用の代表色、round は写真の形（円形か）。
const TEMPLATE_GROUPS = [
  {
    no: 1, title: "高級・信頼",
    items: [
      { id: "1a", label: "ゴールド系", accent: "#C6A15B", subColor: "#1F2937", bg: "#FBF9F5", round: false },
      { id: "1b", label: "ネイビー系", accent: "#2563EB", subColor: "#0B1E39", bg: "#F7F9FC", round: false },
    ],
  },
  {
    no: 2, title: "爽やか・明るい",
    items: [
      { id: "2a", label: "ブルー系", accent: "#209CFF", subColor: "#68E0CF", bg: "#F5FBFC", round: false },
      { id: "2b", label: "レッド系", accent: "#F5323F", subColor: "#FF6A4D", bg: "#FFFBFA", round: false },
    ],
  },
  {
    no: 3, title: "親しみ・優しい",
    items: [
      { id: "3a", label: "コーラル系", accent: "#F0805E", subColor: "#FDE7DE", bg: "#FFF8F1", round: true },
      { id: "3b", label: "パープル系", accent: "#6C5CE7", subColor: "#F1EEFB", bg: "#FBFAFF", round: true },
    ],
  },
  {
    no: 4, title: "シンプル・洗練",
    items: [
      { id: "4a", label: "グリーン系", accent: "#0F766E", subColor: "#E4F3F1", bg: "#F2F4F3", round: true },
      { id: "4b", label: "ブラウン系", accent: "#C1633A", subColor: "#F7E7DE", bg: "#F7F2EE", round: true },
    ],
  },
];
const TEMPLATE_IDS = TEMPLATE_GROUPS.flatMap((g) => g.items.map((t) => t.id));

// テンプレートIDの正規化（未設定・不正値は既定の 1a に落とす）
const normalizeTemplateId = (raw) => {
  const v = String(raw || "").trim().toLowerCase().replace(/[^0-9ab]/g, "");
  return TEMPLATE_IDS.includes(v) ? v : "1a";
};

// "1a" → "1-A" 表示用
const templateDisplayId = (id) => `${id[0]}-${id[1].toUpperCase()}`;

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
  const { isMobile } = useWindowWidth();
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
      template: "1a",  // デザインテンプレート（既定: 1-A 高級・信頼／ゴールド）
    };
    if (isEdit && location.state?.user) {
      const u = location.state.user;
      return { ...base, ...u, template: normalizeTemplateId(u.template) };
    }
    return base;
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // 公開URL（slug が決まっていれば組み立て）
  const effectiveSlug = (form.slug || (!isEdit ? slugFromEmail(form.email) : "")).trim();
  // 【F3-016】保存時は effectiveSlug.toLowerCase() で書き込むため（handleSave の profile.slug）、
  // 表示・コピーするURLも小文字に統一する。ユーザー一覧「コピー」（UserManager.jsx の
  // memberUrl はサーバー返却の小文字 slug を使用）と文字列一致させるための是正。
  const publicUrl = effectiveSlug
    ? `${window.location.origin}/m/${effectiveSlug.toLowerCase()}`
    : "";

  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  // 保存結果の実確認：list を再取得し、送信した値が実際に反映されたかを突き合わせる。
  // 通信エラー（G3-001/E3-014 同型：GAS側は保存完了しているのに一時URLの404等で
  // フロントにはエラーとして返る）の後に呼び、表示を実状態に一致させる。
  // 戻り値: true=反映済み / false=未反映 / null=確認自体が失敗
  const verifySaved = async () => {
    try {
      const email = (isEdit ? decodeURIComponent(id) : String(form.email).trim()).toLowerCase();
      const res = await axios.get(
        `${masterUrl}?action=list&company=${encodeURIComponent(CLIENT_COMPANY_NAME)}&_t=${Date.now()}`
      );
      const u = (res?.data?.users || []).find(
        (x) => String(x.email || "").trim().toLowerCase() === email
      );
      if (!u) return false;
      return (
        String(u.slug || "") === effectiveSlug.toLowerCase() &&
        !!u.published === !!form.published &&
        String(u.lastName || "") === String(form.lastName || "")
      );
    } catch {
      return null;
    }
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
    // slug の文字種チェック（半角英数と - _ . のみ / 大文字は保存時に小文字化）
    if (effectiveSlug && !/^[a-z0-9._-]+$/.test(effectiveSlug.toLowerCase())) {
      return showModal("error", "公開URL（slug）に使用できるのは半角英数字と「-」「_」「.」のみです");
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
        "slug": effectiveSlug.toLowerCase(),
        "役職": form.role || "",
        "写真URL": form.photoUrl || "",
        "キャッチコピー": form.catchphrase || "",
        "自己紹介": form.bio || "",
        "経歴": form.career || "",
        "実績": form.achievements || "",
        "公開": form.published ? "TRUE" : "",
        "テンプレート": normalizeTemplateId(form.template),
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
      // 通信エラーでも GAS 側では保存が完了している場合がある（F3-001）。
      // 実際の反映状態を確認してから成功／失敗を表示する。
      const verified = await verifySaved();
      if (verified === true) {
        showModal("success", isEdit ? "ユーザー情報を更新しました" : "新しいユーザーを登録しました");
      } else if (verified === false) {
        showModal("error", "通信エラーが発生しました。変更は反映されていません。時間をおいて再度お試しください。");
      } else {
        showModal("error", "通信エラーが発生しました。保存されたかどうか確認できませんでした。ユーザー一覧を再読み込みしてご確認ください。");
      }
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

      <div style={{ ...styles.card, maxWidth: "600px", padding: isMobile ? "20px" : "40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 姓・名 */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 20 }}>
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
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
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

            {/* デザインテンプレート */}
            <div style={{ ...styles.inputGroup, marginBottom: 24 }}>
              <label style={styles.label}>デザインテンプレート</label>
              <p style={{ fontSize: 11, color: THEME.textMuted, margin: "4px 0 12px", lineHeight: 1.6 }}>
                紹介ページの配色・レイアウトを選択します（保存後、公開ページに反映されます）
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {TEMPLATE_GROUPS.map((g) => (
                  <div key={g.no}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: THEME.textMain }}>
                      {g.no}. {g.title}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {g.items.map((t) => {
                        const selected = form.template === t.id;
                        return (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => setForm({ ...form, template: t.id })}
                            aria-pressed={selected}
                            style={{
                              position: "relative", textAlign: "left", cursor: "pointer",
                              borderRadius: 10, padding: 10,
                              border: selected ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                              backgroundColor: selected ? "#F5F3FF" : "#fff",
                              transition: "border-color .12s, background .12s",
                            }}
                          >
                            {/* ミニプレビュー（配色イメージ） */}
                            <div style={{
                              height: 46, borderRadius: 6, overflow: "hidden", position: "relative",
                              backgroundColor: t.bg, border: `1px solid ${THEME.border}`, marginBottom: 8,
                            }}>
                              <div style={{ height: 9, backgroundColor: t.accent }} />
                              <div style={{
                                position: "absolute", left: 8, top: 15, width: 22, height: 22,
                                borderRadius: t.round ? "50%" : 3, backgroundColor: t.subColor,
                              }} />
                              <div style={{ position: "absolute", left: 38, top: 18, right: 8 }}>
                                <div style={{ height: 4, borderRadius: 2, backgroundColor: t.accent, width: "55%", marginBottom: 5, opacity: .85 }} />
                                <div style={{ height: 3, borderRadius: 2, backgroundColor: "#D8D8DF", width: "82%" }} />
                              </div>
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: THEME.textMain }}>
                              {templateDisplayId(t.id)} {t.label}
                            </span>
                            {selected && (
                              <span style={{
                                position: "absolute", top: 8, right: 8, width: 20, height: 20,
                                borderRadius: "50%", backgroundColor: THEME.primary,
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Check size={13} color="#fff" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
          <div style={{ marginTop: "16px", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ ...styles.btn, ...styles.btnPrimary, flex: isMobile ? "none" : 2, height: "54px", fontSize: "15px", order: isMobile ? 1 : 0 }}
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
              style={{ ...styles.btn, ...styles.btnSecondary, flex: isMobile ? "none" : 1, height: "54px", order: isMobile ? 2 : 0 }}
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