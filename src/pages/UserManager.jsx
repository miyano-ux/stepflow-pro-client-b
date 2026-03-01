import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  UserPlus, Mail, Edit3, Trash2, Loader2,
  Phone, UserCircle, RefreshCw
} from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";

// ==========================================
// 👥 UserManager - ユーザー管理
// ==========================================
// staffList は App.jsx で一元取得・キャッシュ済みのものを props で受け取る
// 個別 fetch を廃止することでタイムラグを解消

const localStyles = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  card:    { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800", backgroundColor: "#F8FAFC", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" },
  tableTd: { padding: "20px 24px", fontSize: "14px", color: THEME.textMain, borderBottom: `1px solid ${THEME.border}`, verticalAlign: "middle" },
  badge:   { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", backgroundColor: "#EEF2FF", color: THEME.primary, display: "inline-flex", alignItems: "center", gap: "4px" },
};

export default function UserManager({ staffList = [], onRefreshStaff, masterUrl, companyName = "B社" }) {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  // 手動更新ボタン（必要なときだけ叩く）
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshStaff();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (email) => {
    if (!window.confirm("このユーザーを完全に削除しますか？")) return;
    try {
      const res = await axios.post(
        masterUrl,
        JSON.stringify({ action: "deleteUser", email: email, company: companyName }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data.status === "success") {
        await onRefreshStaff(); // 削除後だけ再取得
      } else {
        alert("失敗: " + res.data.message);
      }
    } catch {
      alert("通信エラーが発生しました");
    }
  };

  return (
    <div style={localStyles.main}>
      <div style={localStyles.wrapper}>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>ユーザー管理</h1>
            <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "8px" }}>
              システムの利用権限を持つスタッフアカウントの一覧
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {/* 手動更新ボタン */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ ...styles.btn, ...styles.btnSecondary, gap: 8 }}
              title="最新情報に更新"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "更新中..." : "更新"}
            </button>
            <button
              onClick={() => navigate("/users/add")}
              style={{ ...styles.btn, ...styles.btnPrimary }}
            >
              <UserPlus size={18} /> 新規ユーザー登録
            </button>
          </div>
        </header>

        <div style={localStyles.card}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={localStyles.tableTh}>担当スタッフ</th>
                <th style={localStyles.tableTh}>メールアドレス</th>
                <th style={localStyles.tableTh}>電話番号</th>
                <th style={{ ...localStyles.tableTh, textAlign: "center", width: "120px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: "80px", textAlign: "center", color: THEME.textMuted }}>
                    登録データが見つかりません
                  </td>
                </tr>
              ) : (
                staffList.map((u) => (
                  <tr
                    key={u.email}
                    style={{ transition: "0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                  >
                    <td style={localStyles.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.primary, flexShrink: 0 }}>
                          <UserCircle size={24} />
                        </div>
                        <div style={{ fontWeight: "900", fontSize: "16px" }}>{u.lastName} {u.firstName}</div>
                      </div>
                    </td>
                    <td style={localStyles.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted }}>
                        <Mail size={14} /> {u.email}
                      </div>
                    </td>
                    <td style={localStyles.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted }}>
                        <Phone size={14} /> {String(u.phone || "-").replace(/'/g, "")}
                      </div>
                    </td>
                    <td style={localStyles.tableTd}>
                      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                        <button
                          onClick={() => navigate(`/users/edit/${encodeURIComponent(u.email)}`, { state: { user: u } })}
                          style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer", padding: "8px" }}
                          title="編集"
                        >
                          <Edit3 size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.email)}
                          style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: "8px" }}
                          title="削除"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}