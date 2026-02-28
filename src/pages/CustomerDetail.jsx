import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { 
  ArrowLeft, User, Mail, Phone, Calendar, Save, 
  MessageSquare, History, Loader2, Edit3, X, 
  Clock, LayoutGrid, UserCircle, ExternalLink
} from "lucide-react";

const THEME = { 
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444"
};

const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px", alignItems: "start" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)" },
  sectionTitle: { fontSize: "18px", fontWeight: "900", color: THEME.textMain, marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" },
  inputGroup: { marginBottom: "20px" },
  label: { display: "block", fontSize: "12px", fontWeight: "800", color: THEME.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", transition: "0.2s", backgroundColor: "#FFFFFF" },
  viewValue: { padding: "12px 0", fontSize: "16px", fontWeight: "700", color: THEME.textMain, borderBottom: `1px solid ${THEME.bg}`, minHeight: "45px", display: "flex", alignItems: "center" },
  timelineItem: { paddingLeft: "24px", borderLeft: `2px solid ${THEME.border}`, position: "relative", marginBottom: "24px" },
  timelineDot: { position: "absolute", left: "-7px", top: "0", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: THEME.primary, border: "2px solid white" },
  btnSecondary: { padding: "10px 20px", borderRadius: "12px", border: `1px solid ${THEME.border}`, backgroundColor: "white", fontSize: "14px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: THEME.textMain, transition: "0.2s" }
};

export default function CustomerDetail({ customers = [], formSettings = [], statuses = [], trackingLogs = [], masterUrl, gasUrl, companyName, onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false); // 🆕 編集モード管理
  const [syncingCount, setSyncingCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState(null);

  const customer = useMemo(() => customers.find(c => String(c.id) === String(id)), [customers, id]);

  useEffect(() => {
    if (customer && syncingCount === 0) {
      setFormData({ ...customer });
    }
  }, [customer, syncingCount]);

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
      await axios.post(gasUrl, JSON.stringify({ action: "update", id: id, data: formData }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      setTimeout(() => {
        onRefresh();
        setSyncingCount(prev => Math.max(0, prev - 1));
        setIsEditing(false); // 🆕 保存後に閲覧モードへ戻る
      }, 1500);
    } catch (e) {
      alert("更新に失敗しました");
      setSyncingCount(0);
    }
  };

  const customerLogs = (trackingLogs || []).filter(log => String(log.customerId) === String(id)).sort((a, b) => new Date(b.time) - new Date(a.time));

  // フィールド表示用コンポーネント
  const Field = ({ label, value, fieldName, type = "text", options = null }) => (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      {isEditing ? (
        options || type === "select" ? (
          <select style={styles.input} value={formData[fieldName] || ""} onChange={e => setFormData({...formData, [fieldName]: e.target.value})}>
            <option value="">未選択</option>
            {options ? options.map(opt => <option key={opt} value={opt}>{opt}</option>) : null}
          </select>
        ) : (
          <input type={type} style={styles.input} value={formData[fieldName] || ""} onChange={e => setFormData({...formData, [fieldName]: e.target.value})} />
        )
      ) : (
        <div style={styles.viewValue}>{value || <span style={{color: THEME.border, fontWeight: 400}}>未設定</span>}</div>
      )}
    </div>
  );

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        {/* ヘッダーエリア */}
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <button onClick={() => navigate("/customers")} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 8 }}>
              <ArrowLeft size={18} /> 一覧に戻る
            </button>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
              {formData["姓"]} {formData["名"]} <span style={{ color: THEME.textMuted, fontWeight: "500", fontSize: "20px" }}>様</span>
            </h1>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            {!isEditing ? (
              <>
                {/* 🆕 閲覧モード時のボタン群 */}
                <button onClick={() => navigate(`/schedule/${id}`)} style={styles.btnSecondary}>
                  <Clock size={18} color={THEME.primary} /> 配信スケジュール
                </button>
                <button onClick={() => navigate(`/direct-sms/${id}`)} style={styles.btnSecondary}>
                  <MessageSquare size={18} color={THEME.primary} /> SMS送信
                </button>
                <button onClick={() => setIsEditing(true)} style={{ ...styles.btnSecondary, backgroundColor: THEME.primary, color: "white", border: "none" }}>
                  <Edit3 size={18} /> 情報を編集
                </button>
              </>
            ) : (
              <>
                {/* 🆕 編集モード時のボタン群 */}
                <button onClick={() => { setIsEditing(false); setFormData({...customer}); }} style={{ ...styles.btnSecondary, color: THEME.danger }}>
                  <X size={18} /> キャンセル
                </button>
                <button onClick={handleSave} disabled={syncingCount > 0} style={{ ...styles.btnSecondary, backgroundColor: THEME.primary, color: "white", border: "none" }}>
                  {syncingCount > 0 ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 変更を保存
                </button>
              </>
            )}
          </div>
        </header>

        <div style={styles.grid}>
          {/* 左カラム：詳細情報 */}
          <div style={styles.card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
              <Field 
                label="対応ステータス" 
                value={formData["対応ステータス"]} 
                fieldName="対応ステータス" 
                options={statuses.map(s => s.name)} 
              />
              <Field 
                label="担当営業" 
                value={staffList.find(s => s.email === formData["担当者メール"])?.lastName || formData["担当者メール"]} 
                fieldName="担当者メール" 
                options={staffList.map(s => s.email)}
                // selectのラベル表示を考慮した特別対応はField内で行う
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
              <Field label="姓" value={formData["姓"]} fieldName="姓" />
              <Field label="名" value={formData["名"]} fieldName="名" />
              <Field label="電話番号" value={formData["電話番号"]} fieldName="電話番号" />
            </div>

            <hr style={{ border: "none", borderTop: `1px solid ${THEME.border}`, margin: "32px 0" }} />
            
            <h3 style={styles.sectionTitle}><LayoutGrid size={20} color={THEME.primary} /> カスタム項目</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {formSettings.map(field => (
                <Field 
                  key={field.name}
                  label={field.name}
                  value={formData[field.name]}
                  fieldName={field.name}
                  type={field.type === "number" ? "number" : (field.type === "date" ? "date" : "text")}
                  options={field.type === "dropdown" || field.type === "select" ? (field.options || "").split(",") : null}
                />
              ))}
            </div>
          </div>

          {/* 右カラム：活動ログ */}
          <div style={{ ...styles.card, backgroundColor: "transparent", border: "none", padding: 0 }}>
            <h3 style={styles.sectionTitle}><History size={20} color={THEME.primary} /> 最近のアクティビティ</h3>
            <div style={{ backgroundColor: "white", padding: "28px", borderRadius: "20px", border: `1px solid ${THEME.border}`, maxHeight: "650px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              {customerLogs.length === 0 ? (
                <div style={{ textAlign: "center", color: THEME.textMuted, padding: "40px 0" }}>活動履歴はまだありません</div>
              ) : (
                customerLogs.map((log, i) => (
                  <div key={i} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div style={{ fontSize: "11px", color: THEME.textMuted, fontWeight: "800", marginBottom: "4px" }}>{log.time}</div>
                    <div style={{ fontSize: "14px", fontWeight: "900", color: THEME.textMain }}>{log.pageTitle || "ページ閲覧"}</div>
                    {log.url && <div style={{ fontSize: "11px", color: THEME.primary, marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.url}</div>}
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