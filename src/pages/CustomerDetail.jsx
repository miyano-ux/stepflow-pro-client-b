import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
// 🆕 LayoutGrid をインポートに追加しました
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Save, 
  MessageSquare, History, Loader2, AlertCircle, ExternalLink,
  ChevronRight, CheckCircle2, UserCircle, LayoutGrid
} from "lucide-react";

const THEME = { 
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px", alignItems: "start" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)" },
  sectionTitle: { fontSize: "18px", fontWeight: "900", color: THEME.textMain, marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" },
  inputGroup: { marginBottom: "20px" },
  label: { display: "block", fontSize: "13px", fontWeight: "800", color: THEME.textMuted, marginBottom: "8px" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", transition: "0.2s" },
  timelineItem: { paddingLeft: "24px", borderLeft: `2px solid ${THEME.border}`, position: "relative", marginBottom: "24px" },
  timelineDot: { position: "absolute", left: "-7px", top: "0", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: THEME.primary, border: "2px solid white" }
};

export default function CustomerDetail({ customers = [], formSettings = [], statuses = [], trackingLogs = [], masterUrl, gasUrl, companyName, onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [syncingCount, setSyncingCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState(null);

  // 顧客データの特定と初期化
  const customer = useMemo(() => customers.find(c => String(c.id) === String(id)), [customers, id]);

  useEffect(() => {
    if (customer && syncingCount === 0) {
      setFormData({ ...customer });
    }
  }, [customer, syncingCount]);

  // 担当者リスト取得
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${companyName}`);
        setStaffList(res?.data?.users || []);
      } catch (e) { console.error(e); }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl, companyName]);

  if (!formData) return <div style={styles.main}><div style={styles.wrapper}><Loader2 className="animate-spin" /></div></div>;

  const handleSave = async () => {
    setSyncingCount(prev => prev + 1);
    try {
      await axios.post(gasUrl, JSON.stringify({ 
        action: "update", 
        id: id, 
        data: formData 
      }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      
      setTimeout(() => {
        onRefresh();
        setSyncingCount(prev => Math.max(0, prev - 1));
        alert("顧客情報を更新しました");
      }, 1500);
    } catch (e) {
      alert("更新に失敗しました");
      setSyncingCount(0);
    }
  };

  // この顧客に関連するログを抽出
  const customerLogs = (trackingLogs || [])
    .filter(log => String(log.customerId) === String(id))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        {/* ヘッダーエリア */}
        <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 12 }}>
              <ArrowLeft size={18} /> 戻る
            </button>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
              {formData["姓"]} {formData["名"]} <span style={{ color: THEME.textMuted, fontWeight: "500", fontSize: "20px" }}>様</span>
            </h1>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to={`/direct-sms/${id}`} style={{ ...styles.input, backgroundColor: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", color: THEME.primary }}>
              <MessageSquare size={18} /> SMS送信
            </Link>
            <button onClick={handleSave} disabled={syncingCount > 0} style={{ ...styles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "900", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "12px 24px" }}>
              {syncingCount > 0 ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 変更を保存
            </button>
          </div>
        </header>

        <div style={styles.grid}>
          {/* 左カラム：詳細編集フォーム */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}><User size={20} color={THEME.primary} /> 基本情報・管理設定</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>対応ステータス</label>
                <select 
                  style={{ ...styles.input, backgroundColor: "#EEF2FF", border: "none", fontWeight: "800", color: THEME.primary }}
                  value={formData["対応ステータス"] || ""}
                  onChange={e => setFormData({ ...formData, "対応ステータス": e.target.value })}
                >
                  {statuses.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>担当営業</label>
                <select 
                  style={{ ...styles.input, backgroundColor: "#F1F5F9", border: "none", fontWeight: "700" }}
                  value={formData["担当者メール"] || ""}
                  onChange={e => setFormData({ ...formData, "担当者メール": e.target.value })}
                >
                  <option value="">未割当</option>
                  {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
              <div style={styles.inputGroup}><label style={styles.label}>姓</label><input style={styles.input} value={formData["姓"] || ""} onChange={e => setFormData({...formData, "姓": e.target.value})} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>名</label><input style={styles.input} value={formData["名"] || ""} onChange={e => setFormData({...formData, "名": e.target.value})} /></div>
              <div style={styles.inputGroup}><label style={styles.label}>電話番号</label><input style={styles.input} value={formData["電話番号"] || ""} onChange={e => setFormData({...formData, "電話番号": e.target.value})} /></div>
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${THEME.border}`, margin: "24px 0" }} />
            
            <h3 style={styles.sectionTitle}><LayoutGrid size={20} color={THEME.primary} /> カスタム項目（項目設定準拠）</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {formSettings.map(field => (
                <div key={field.name} style={styles.inputGroup}>
                  <label style={styles.label}>{field.name}</label>
                  {field.type === "dropdown" || field.type === "select" ? (
                    <select style={styles.input} value={formData[field.name] || ""} onChange={e => setFormData({...formData, [field.name]: e.target.value})}>
                      <option value="">未選択</option>
                      {(field.options || "").split(",").map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type={field.type === "number" ? "number" : (field.type === "date" ? "date" : "text")} style={styles.input} value={formData[field.name] || ""} onChange={e => setFormData({...formData, [field.name]: e.target.value})} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 右カラム：アクティビティフィード */}
          <div style={{ ...styles.card, backgroundColor: "transparent", border: "none", padding: 0 }}>
            <h3 style={styles.sectionTitle}><History size={20} color={THEME.primary} /> 活動ログ</h3>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "20px", border: `1px solid ${THEME.border}`, maxHeight: "600px", overflowY: "auto" }}>
              {customerLogs.length === 0 ? (
                <div style={{ textAlign: "center", color: THEME.textMuted, padding: "40px 0" }}>活動履歴はありません</div>
              ) : (
                customerLogs.map((log, i) => (
                  <div key={i} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={{ fontSize: "12px", color: THEME.textMuted, fontWeight: "700", marginBottom: "4px" }}>{log.time}</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: THEME.textMain }}>{log.pageTitle || "ページ閲覧"}</div>
                    {log.url && <div style={{ fontSize: "11px", color: THEME.primary, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis" }}>{log.url}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}