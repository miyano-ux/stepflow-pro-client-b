import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  UserPlus, Mail, Edit3, Trash2, Loader2, Phone, ShieldCheck 
} from "lucide-react";

// --- デザイン定義 (App.jsxと統一) ---
const THEME = {
  primary: "#4F46E5",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  textMain: "#1E293B",
  textMuted: "#64748B",
  border: "#E2E8F0",
  danger: "#EF4444",
  success: "#10B981"
};

const styles = {
  card: { 
    backgroundColor: THEME.card, 
    borderRadius: "16px", 
    border: `1px solid ${THEME.border}`, 
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    overflow: "hidden" 
  },
  tableTh: { 
    padding: "16px 24px", 
    color: THEME.textMuted, 
    fontSize: "12px", 
    fontWeight: "800", 
    backgroundColor: "#F8FAFC", 
    borderBottom: `1px solid ${THEME.border}`,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  tableTd: { 
    padding: "18px 24px", 
    fontSize: "14px", 
    color: THEME.textMain, 
    borderBottom: `1px solid ${THEME.border}`,
    verticalAlign: "middle"
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor: "#EEF2FF",
    color: THEME.primary,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  }
};

/**
 * UserManager コンポーネント (V26.0 独立モジュール版)
 * @param {string} masterUrl - マスタースプレッドシートのAPI URL
 * @param {string} companyName - クライアント会社名 (B社 等)
 */
export default function UserManager({ masterUrl, companyName = "B社" }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ユーザー一覧取得
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // キャッシュ回避のためタイムスタンプを付与
      const res = await axios.get(`${masterUrl}?action=list&company=${companyName}&_t=${Date.now()}`);
      setUsers(res.data.users || []);
    } catch (e) {
      console.error("データ取得エラー", e);
    } finally {
      setLoading(false);
    }
  }, [masterUrl, companyName]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 2. ユーザー削除処理 (V23.0 削除ロジックを完全継承)
  const handleDelete = async (id) => {
    if (!window.confirm("このユーザーを完全に削除しますか？この操作は取り消せません。")) return;
    
    try {
      const payload = { 
        action: "delete", 
        id: String(id), 
        company: companyName 
      };
      
      const res = await axios.post(masterUrl, 
        JSON.stringify(payload), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );

      if (res.data.status === "success") {
        fetchUsers();
      } else {
        alert("削除に失敗しました: " + (res.data.message || "Unknown error"));
      }
    } catch (e) {
      alert("マスターサーバーとの通信に失敗しました");
    }
  };

  return (
    <div style={{ padding: "40px 64px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>ユーザー管理</h1>
          <p style={{ color: THEME.textMuted, fontSize: "14px", marginTop: "4px" }}>
            システムを利用するスタッフの権限とアカウントを管理します
          </p>
        </div>
        <button 
          onClick={() => navigate("/users/add")} 
          style={{ 
            backgroundColor: THEME.primary, 
            color: "white", 
            border: "none", 
            padding: "12px 24px", 
            borderRadius: "10px", 
            fontWeight: "800", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
          }}
        >
          <UserPlus size={18} /> 新規ユーザーを登録
        </button>
      </header>

      <div style={styles.card}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={styles.tableTh}>氏名 / 権限</th>
              <th style={styles.tableTh}>メールアドレス</th>
              <th style={styles.tableTh}>電話番号</th>
              <th style={{ ...styles.tableTh, textAlign: "center" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ padding: "80px", textAlign: "center" }}>
                  <Loader2 className="animate-spin" color={THEME.primary} size={40} />
                  <p style={{ marginTop: "16px", color: THEME.textMuted, fontWeight: "600" }}>データを読み込み中...</p>
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} style={{ transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F8FAFC"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={styles.tableTd}>
                    <div style={{ fontWeight: "800", fontSize: "16px", marginBottom: "4px" }}>{u.lastName} {u.firstName}</div>
                    <div style={styles.badge}>
                      <ShieldCheck size={12} /> スタッフ
                    </div>
                  </td>
                  <td style={styles.tableTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted }}>
                      <Mail size={14} /> {u.email}
                    </div>
                  </td>
                  <td style={styles.tableTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.textMuted }}>
                      <Phone size={14} /> {String(u.phone || "-").replace(/'/g, "")}
                    </div>
                  </td>
                  <td style={styles.tableTd}>
                    <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
                      <button 
                        onClick={() => navigate(`/users/edit/${u.id}`, { state: { user: u } })} 
                        style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer", padding: "8px" }}
                        title="編集"
                      >
                        <Edit3 size={20}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)} 
                        style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: "8px" }}
                        title="削除"
                      >
                        <Trash2 size={20}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: "80px", textAlign: "center", color: THEME.textMuted }}>
                  登録済みのユーザーがいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}