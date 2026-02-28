import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  UserPlus, Mail, Edit3, Trash2, Loader2, Phone, ShieldCheck, UserCircle
} from "lucide-react";

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
  // 🆕 重要：サイドバーとの重なりを防ぐメインコンテナ設定
  main: { 
    minHeight: "100vh", 
    backgroundColor: THEME.bg 
  },
  wrapper: { 
    padding: "48px 64px", 
    maxWidth: "1440px", 
    margin: "0 auto" 
  },
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
    fontSize: "11px", 
    fontWeight: "800", 
    backgroundColor: "#F8FAFC", 
    borderBottom: `2px solid ${THEME.border}`,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  tableTd: { 
    padding: "20px 24px", 
    fontSize: "14px", 
    color: THEME.textMain, 
    borderBottom: `1px solid ${THEME.border}`,
    verticalAlign: "middle"
  },
  badge: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "800",
    backgroundColor: "#EEF2FF",
    color: THEME.primary,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  }
};

export default function UserManager({ masterUrl, companyName = "B社" }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${masterUrl}?action=list&company=${companyName}&_t=${Date.now()}`);
      setUsers(res.data.users || []);
    } catch (e) {
      console.error("データ取得エラー", e);
    } finally {
      setLoading(false);
    }
  }, [masterUrl, companyName]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id) => {
    if (!window.confirm("このユーザーを完全に削除しますか？")) return;
    try {
      const payload = { action: "delete", id: String(id), company: companyName };
      const res = await axios.post(masterUrl, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      if (res.data.status === "success") fetchUsers();
      else alert("失敗: " + res.data.message);
    } catch (e) {
      alert("通信エラーが発生しました");
    }
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0, letterSpacing: "-0.02em" }}>ユーザー管理</h1>
            <p style={{ color: THEME.textMuted, fontSize: "15px", marginTop: "8px" }}>
              システムの利用権限を持つスタッフアカウントの一覧
            </p>
          </div>
          <button 
            onClick={() => navigate("/users/add")} 
            style={{ 
              backgroundColor: THEME.primary, 
              color: "white", 
              border: "none", 
              padding: "14px 28px", 
              borderRadius: "12px", 
              fontWeight: "800", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "10px",
              boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <UserPlus size={20} /> 新規ユーザー登録
          </button>
        </header>

        <div style={styles.card}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={styles.tableTh}>担当スタッフ</th>
                <th style={styles.tableTh}>メールアドレス</th>
                <th style={styles.tableTh}>電話番号</th>
                <th style={{ ...styles.tableTh, textAlign: "center", width: "120px" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ padding: "100px", textAlign: "center" }}>
                    <Loader2 className="animate-spin" color={THEME.primary} size={48} />
                    <p style={{ marginTop: "20px", color: THEME.textMuted, fontWeight: "700" }}>マスターデータを同期中...</p>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} style={{ transition: "0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F1F5F9"}>
                    <td style={styles.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.primary }}>
                          <UserCircle size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: "900", fontSize: "16px" }}>{u.lastName} {u.firstName}</div>
                          <div style={styles.badge}>STAFF</div>
                        </div>
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
                      <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                        <button onClick={() => navigate(`/users/edit/${u.id}`, { state: { user: u } })} style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer", padding: "8px" }} title="編集">
                          <Edit3 size={20}/>
                        </button>
                        <button onClick={() => handleDelete(u.id)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: "8px" }} title="削除">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: "100px", textAlign: "center", color: THEME.textMuted }}>
                    登録データが見つかりません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}