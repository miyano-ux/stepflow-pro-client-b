import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Save, MessageSquare, History, Loader2,
  Edit3, X, Clock, LayoutGrid, ChevronDown, ExternalLink,
  Phone, User, Mail,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { formatDate } from "../lib/utils";
import DatePicker from "../components/DatePicker";

// ==========================================
// 👤 CustomerDetail - 顧客詳細ページ
// ==========================================

// 日付を読みやすい形式に変換
const formatDateJP = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function CustomerDetail({
  customers = [], formSettings = [], statuses = [],
  trackingLogs = [], masterUrl, gasUrl, companyName, onRefresh,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [syncingCount, setSyncingCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState(null);

  const customer = useMemo(
    () => customers.find((c) => String(c.id) === String(id)),
    [customers, id]
  );

  useEffect(() => {
    if (customer && syncingCount === 0) setFormData({ ...customer });
  }, [customer, syncingCount]);

  useEffect(() => {
    if (!masterUrl) return;
    axios
      .get(`${masterUrl}?action=list&company=${companyName}`)
      .then((res) => setStaffList(res?.data?.users || []))
      .catch(console.error);
  }, [masterUrl, companyName]);

  const customerLogs = useMemo(
    () =>
      (trackingLogs || [])
        .filter((log) => String(log.customer_id) === String(id) && parseInt(log.click_count || 0) > 0)
        .sort((a, b) => new Date(b.last_clicked_at) - new Date(a.last_clicked_at)),
    [trackingLogs, id]
  );

  const handleSave = async () => {
    setSyncingCount((p) => p + 1);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "update", id, data: formData }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setTimeout(() => {
        onRefresh();
        setSyncingCount((p) => Math.max(0, p - 1));
        setIsEditing(false);
      }, 1500);
    } catch {
      alert("更新に失敗しました");
      setSyncingCount(0);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ ...customer });
  };

  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  if (!formData) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" size={40} color={THEME.primary} />
      </div>
    );
  }

  // 担当者オブジェクト
  const assignedStaff = staffList.find((s) => s.email === formData["担当者メール"]);
  const assignedName = assignedStaff ? `${assignedStaff.lastName} ${assignedStaff.firstName}` : null;

  // ── サブコンポーネント ──────────────────

  // ラベル付きフィールド表示（閲覧モード）
  const ViewField = ({ label, value, icon }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: value ? THEME.textMain : THEME.textMuted }}>
        {value || "未設定"}
      </div>
    </div>
  );

  // 編集フィールド（テキスト）
  const EditText = ({ label, fieldName, type = "text" }) => (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={formData[fieldName] || ""}
        onChange={(e) => set(fieldName, e.target.value)}
      />
    </div>
  );

  // 編集フィールド（セレクト）
  const EditSelect = ({ label, fieldName, options = [] }) => (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          style={{ ...styles.input, appearance: "none", paddingRight: 36 }}
          value={formData[fieldName] || ""}
          onChange={(e) => set(fieldName, e.target.value)}
        >
          <option value="">未選択</option>
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>
              {o.label ?? o}
            </option>
          ))}
        </select>
        <ChevronDown size={15} style={{ position: "absolute", right: 12, top: 14, pointerEvents: "none", color: THEME.textMuted }} />
      </div>
    </div>
  );

  // 編集フィールド（日付）
  const EditDate = ({ label, fieldName }) => (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <DatePicker
        value={formData[fieldName] || ""}
        onChange={(v) => set(fieldName, v)}
        placeholder={`${label}を選択`}
      />
    </div>
  );

  // カスタム項目のフィールドをレンダリング
  const renderCustomField = (field) => {
    if (!isEditing) {
      const val = field.type === "date" ? formatDateJP(formData[field.name]) : formData[field.name];
      return <ViewField key={field.name} label={field.name} value={val} />;
    }
    if (field.type === "date") return <EditDate key={field.name} label={field.name} fieldName={field.name} />;
    if (field.type === "dropdown") {
      const opts = (field.options || "").split(",").map((o) => o.trim()).filter(Boolean);
      return <EditSelect key={field.name} label={field.name} fieldName={field.name} options={opts} />;
    }
    return <EditText key={field.name} label={field.name} fieldName={field.name} />;
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 48px" }}>

      {/* ── ヘッダー ── */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => navigate("/customers")}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 16, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> 顧客一覧に戻る
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, margin: 0 }}>
              {formData["姓"]} {formData["名"]}
              <span style={{ fontSize: 18, color: THEME.textMuted, fontWeight: 500, marginLeft: 8 }}>様</span>
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span style={{ ...styles.badge, backgroundColor: "#EEF2FF", color: THEME.primary }}>
                {formData["対応ステータス"] || "未対応"}
              </span>
              {assignedName && (
                <span style={{ fontSize: 13, color: THEME.textMuted }}>担当: {assignedName}</span>
              )}
              <span style={{ fontSize: 13, color: THEME.textMuted }}>
                登録: {formatDateJP(formData["登録日"]) || "-"}
              </span>
            </div>
          </div>

          {/* アクションボタン群 */}
          <div style={{ display: "flex", gap: 10 }}>
            {!isEditing ? (
              <>
                <button
                  onClick={() => navigate(`/schedule/${id}`)}
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                >
                  <Clock size={16} color={THEME.primary} /> 配信履歴
                </button>
                <button
                  onClick={() => navigate(`/direct-sms/${id}`)}
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                >
                  <MessageSquare size={16} color={THEME.primary} /> SMS送信
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                >
                  <Edit3 size={16} /> 情報を編集
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  style={{ ...styles.btn, ...styles.btnSecondary, color: THEME.danger, borderColor: `${THEME.danger}40` }}
                >
                  <X size={16} /> キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={syncingCount > 0}
                  style={{ ...styles.btn, ...styles.btnPrimary, opacity: syncingCount > 0 ? 0.7 : 1 }}
                >
                  {syncingCount > 0
                    ? <><Loader2 size={16} className="animate-spin" /> 保存中...</>
                    : <><Save size={16} /> 変更を保存</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── メインコンテンツ ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>

        {/* 左：顧客情報 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* 基本情報カード */}
          <div style={styles.card}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: THEME.textMuted, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={15} /> 基本情報
            </h3>

            {/* 対応ステータス・担当者 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, padding: "20px", backgroundColor: THEME.bg, borderRadius: 12 }}>
              {isEditing ? (
                <>
                  <EditSelect
                    label="対応ステータス"
                    fieldName="対応ステータス"
                    options={statuses.map((s) => s.name)}
                  />
                  <EditSelect
                    label="担当者"
                    fieldName="担当者メール"
                    options={staffList.map((s) => ({
                      value: s.email,
                      label: `${s.lastName} ${s.firstName}`,
                    }))}
                  />
                </>
              ) : (
                <>
                  <ViewField label="対応ステータス" value={formData["対応ステータス"]} />
                  <ViewField label="担当者" value={assignedName} />
                </>
              )}
            </div>

            {/* 姓・名・電話番号 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {isEditing ? (
                <>
                  <EditText label="姓" fieldName="姓" />
                  <EditText label="名" fieldName="名" />
                  <EditText label="電話番号" fieldName="電話番号" />
                </>
              ) : (
                <>
                  <ViewField label="姓" value={formData["姓"]} icon={<User size={12} />} />
                  <ViewField label="名" value={formData["名"]} />
                  <ViewField label="電話番号" value={formData["電話番号"]} icon={<Phone size={12} />} />
                </>
              )}
            </div>
          </div>

          {/* カスタム項目カード */}
          {formSettings.length > 0 && (
            <div style={styles.card}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: THEME.textMuted, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <LayoutGrid size={15} /> カスタム項目
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {formSettings.map((field) => renderCustomField(field))}
              </div>
            </div>
          )}
        </div>

        {/* 右：アクティビティログ */}
        <div style={styles.card}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: THEME.textMuted, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <History size={15} /> アクティビティ
          </h3>

          {customerLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: THEME.textMuted, fontSize: 13 }}>
              アクティビティはまだありません
            </div>
          ) : (
            <div style={{ maxHeight: 560, overflowY: "auto" }}>
              {customerLogs.map((log, i) => {
                const isHot = log.last_clicked_at && (new Date() - new Date(log.last_clicked_at)) < 5 * 60 * 1000;
                return (
                  <div
                    key={i}
                    style={{
                      paddingLeft: 20,
                      borderLeft: `2px solid ${isHot ? THEME.danger : i === 0 ? THEME.primary : THEME.border}`,
                      position: "relative",
                      marginBottom: 20,
                      paddingBottom: 4,
                    }}
                  >
                    {/* タイムラインドット */}
                    <div style={{
                      position: "absolute",
                      left: -6,
                      top: 3,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: isHot ? THEME.danger : i === 0 ? THEME.primary : THEME.border,
                      border: "2px solid white",
                    }} />

                    {/* クリック日時 + HOTバッジ */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700 }}>
                        最終クリック: {formatDateJP(log.last_clicked_at) || "-"}
                      </span>
                      {isHot && (
                        <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 900 }}>
                          HOT
                        </span>
                      )}
                    </div>

                    {/* クリック数 */}
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMain, marginBottom: 4 }}>
                      {parseInt(log.click_count)}回クリック
                    </div>

                    {/* 送信日時 */}
                    <div style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 4 }}>
                      送信: {formatDateJP(log.sent_at) || "-"}
                    </div>

                    {/* URL */}
                    {log.original_url && (
                      <a
                        href={log.original_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: THEME.primary, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <ExternalLink size={10} /> {log.original_url}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}