import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Check, UserPlus, Loader2 } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";

// ==========================================
// 👤 UserForm - ユーザー登録・編集ページ
// ==========================================

/**
 * ユーザーの新規登録および既存情報の編集ページ
 * @param {string} masterUrl - マスタAPIのURL
 */
function UserForm({ masterUrl }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // 初期データの安全なパース（編集時は location.state から取得）
  const [form, setForm] = useState(() => {
    if (id && location.state?.user) return location.state.user;
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
      return alert("氏名とメールアドレスは必須です");
    }

    setLoading(true);
    try {
      // 電話番号のゼロ落ち防止
      const finalPhone = form.phone
        ? String(form.phone).startsWith("'")
          ? form.phone
          : "'" + form.phone
        : "";

      const payload = {
        action: "save",
        id: id || "",
        ...form,
        company: CLIENT_COMPANY_NAME,
        phone: finalPhone,
      };

      const res = await axios.post(masterUrl, JSON.stringify(payload), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });

      if (res.data.status === "success") {
        alert(id ? "ユーザー情報を更新しました" : "新しいユーザーを登録しました");
        navigate("/users");
      } else {
        alert("保存失敗: " + (res.data.message || "不明なエラー"));
      }
    } catch (e) {
      alert("通信エラーが発生しました。インターネット接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title={id ? "ユーザー情報の編集" : "新規ユーザー登録"}>

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
              disabled={!!id}
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
              ) : id ? (
                <Check size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {id ? "変更を保存する" : "この内容で登録する"}
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