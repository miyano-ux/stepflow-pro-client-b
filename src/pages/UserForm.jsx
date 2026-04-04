import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Check, UserPlus, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
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

// ==========================================
// 👤 UserForm - ユーザー登録・編集ページ
// ==========================================

/**
 * ユーザーの新規登録および既存情報の編集ページ
 * @param {string} masterUrl - マスタAPIのURL
 */
function UserForm({ masterUrl, onRefreshStaff }) {
  const navigate = useNavigate();
  const { id } = useParams();                    // id = encodeされたメールアドレス（編集時）
  const isEdit = !!id;
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { type: "success"|"error", message: string }

  const showModal = (type, message) => setModal({ type, message });
  const closeModal = () => {
    const wasSuccess = modal?.type === "success";
    setModal(null);
    if (wasSuccess) navigate("/users");
  };

  // 初期データの安全なパース（編集時は location.state から取得）
  const [form, setForm] = useState(() => {
    if (isEdit && location.state?.user) return location.state.user;
    return {
      email: "",
      company: CLIENT_COMPANY_NAME,
      lastName: "",
      firstName: "",
      phone: "",
    };
  });

  // 保存処理
  const handleSave = async () => {
    if (!form.email || !form.lastName) {
      return showModal("error", "氏名とメールアドレスは必須です");
    }

    setLoading(true);
    try {
      // 電話番号のゼロ落ち防止
      const finalPhone = form.phone
        ? String(form.phone).startsWith("'")
          ? form.phone
          : "'" + form.phone
        : "";

      // GAS の許可リストシートの列名に合わせたペイロード
      const payload = isEdit
        ? {
            action: "editAllowUser",        // 編集: メールで対象を特定
            "メール": decodeURIComponent(id),
            "会社名": CLIENT_COMPANY_NAME,
            "姓": form.lastName,
            "名": form.firstName,
            "電話番号": finalPhone,
          }
        : {
            action: "addAllowUser",          // 新規登録
            "メール": form.email,
            "会社名": CLIENT_COMPANY_NAME,
            "姓": form.lastName,
            "名": form.firstName,
            "電話番号": finalPhone,
          };

      const res = await axios.post(masterUrl, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });

      if (res.data.status === "success") {
        await onRefreshStaff?.();
        showModal("success", isEdit ? "ユーザー情報を更新しました" : "新しいユーザーを登録しました");
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
          background: "none",
          border: "none",
          color: THEME.primary,
          cursor: "pointer",
          fontWeight: "800",
          marginBottom: "32px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 0,
        }}
      >
        <ChevronLeft size={20} />
        ユーザー一覧に戻る
      </button>

      <div style={{ ...styles.card, maxWidth: "600px", padding: "40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 姓・名 */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
          >
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                姓 <span style={{ color: THEME.danger }}>*</span>
              </label>
              <input
                style={styles.input}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="例: 山田"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>名</label>
              <input
                style={styles.input}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
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
              style={{
                ...styles.input,
                backgroundColor: id ? THEME.bg : "white",
              }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09012345678"
            />
          </div>

          {/* 保存・キャンセルボタン */}
          <div
            style={{ marginTop: "16px", display: "flex", gap: "16px" }}
          >
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                flex: 2,
                height: "54px",
                fontSize: "15px",
              }}
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
              style={{
                ...styles.btn,
                ...styles.btnSecondary,
                flex: 1,
                height: "54px",
              }}
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