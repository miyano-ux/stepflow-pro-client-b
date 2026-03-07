import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Save, MessageSquare, History, Loader2,
  Edit3, X, Clock, LayoutGrid, ChevronDown, ExternalLink,
  Phone, User,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { formatDate } from "../lib/utils";
import DatePicker from "../components/DatePicker";
import StatusTimeline from "../components/StatusTimeline";
import StaffGroupSelect from "../components/StaffGroupSelect";

// ==========================================
// 👤 CustomerDetail - 顧客詳細ページ
// ==========================================

const formatDateJP = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ── トップレベルサブコンポーネント ─────────────────────────
// ※ 関数コンポーネント内で定義すると再レンダーのたびに関数が再生成され
//   Reactが別コンポーネントと判断してアンマウント→フォーカス消失する
//   そのため必ずモジュールトップレベルで定義する

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

const EditText = ({ label, fieldName, type = "text", value, onChange }) => {
  const inputId = `detail-${fieldName}`;
  return (
    <div style={styles.inputGroup}>
      <label htmlFor={inputId} style={{ ...styles.label, userSelect: "none" }}>{label}</label>
      <input
        id={inputId}
        style={styles.input}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(fieldName, e.target.value)}
      />
    </div>
  );
};

const EditSelect = ({ label, fieldName, options = [], value, onChange }) => {
  const selectId = `detail-${fieldName}`;
  return (
    <div style={styles.inputGroup}>
      <label htmlFor={selectId} style={{ ...styles.label, userSelect: "none" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          id={selectId}
          style={{ ...styles.input, appearance: "none", paddingRight: 36 }}
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
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
};

const EditDate = ({ label, fieldName, value, onChange }) => (
  <div style={styles.inputGroup}>
    <label style={{ ...styles.label, userSelect: "none" }}>{label}</label>
    <DatePicker
      value={value || ""}
      onChange={(v) => onChange(fieldName, v)}
      placeholder={`${label}を選択`}
    />
  </div>
);

// カスタム項目1フィールドのレンダリング
const CustomField = ({ field, isEditing, value, onChange }) => {
  if (!isEditing) {
    const val = field.type === "date" ? formatDateJP(value) : value;
    return <ViewField label={field.name} value={val} />;
  }
  if (field.type === "date") {
    return <EditDate label={field.name} fieldName={field.name} value={value} onChange={onChange} />;
  }
  if (field.type === "dropdown") {
    const opts = (field.options || "").split(",").map((o) => o.trim()).filter(Boolean);
    return <EditSelect label={field.name} fieldName={field.name} options={opts} value={value} onChange={onChange} />;
  }
  return <EditText label={field.name} fieldName={field.name} value={value} onChange={onChange} />;
};

// ─────────────────────────────────────────────────────────

export default function CustomerDetail({
  customers = [], formSettings = [], statuses = [], sources = [],
  trackingLogs = [], staffList = [], groups = [], statusHistory = [], gasUrl, onRefresh,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [scenarioConfirm, setScenarioConfirm] = useState(null); // { newStatus, scenarioId }
  const [syncingCount, setSyncingCount] = useState(0);
  const [formData, setFormData] = useState(null);

  const customer = useMemo(
    () => customers.find((c) => String(c.id) === String(id)),
    [customers, id]
  );

  useEffect(() => {
    const updated = location.state?.updatedCustomer;
    if (updated && String(updated.id) === String(id)) {
      setFormData({ ...updated });
      window.history.replaceState({}, "");
      return;
    }
    if (customer && syncingCount === 0) setFormData({ ...customer });
  }, [customer, syncingCount, location.state, id]);

  // ステータス履歴（この顧客のものだけ、古い順）
  const customerStatusHistory = useMemo(() => {
    return (statusHistory || [])
      .filter(h => String(h["顧客ID"]) === String(id))
      .sort((a, b) => new Date(a["変更日時"]) - new Date(b["変更日時"]));
  }, [statusHistory, id]);

  const customerLogs = useMemo(
    () =>
      (trackingLogs || [])
        .filter((log) => String(log.customer_id) === String(id) && parseInt(log.click_count || 0) > 0)
        .sort((a, b) => new Date(b.last_clicked_at) - new Date(a.last_clicked_at)),
    [trackingLogs, id]
  );

  const handleSave = async () => {
    setSyncingCount((p) => p + 1);
    let snapshot = { ...formData };
    try {
      // グループ指定の場合、保存前に担当者を解決する
      if (snapshot["担当者メール"]?.startsWith("group:")) {
        const groupId = snapshot["担当者メール"].replace("group:", "");
        const res = await axios.post(
          GAS_URL,
          JSON.stringify({ action: "assignGroup", groupId }),
          { headers: { "Content-Type": "text/plain;charset=utf-8" } }
        );
        if (res.data?.email) {
          snapshot = { ...snapshot, "担当者メール": res.data.email };
          setFormData(snapshot);
        } else {
          alert("グループ割り当てに失敗しました: " + (res.data?.message || ""));
          setSyncingCount(0);
          return;
        }
      }
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "update", id, data: snapshot }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setIsEditing(false);
      setFormData(snapshot);
      onRefresh().finally(() => {
        setSyncingCount((p) => Math.max(0, p - 1));
      });
    } catch {
      alert("更新に失敗しました");
      setSyncingCount(0);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ ...customer });
  };

  // フィールド値更新（トップレベルコンポーネントに props で渡す）
  const handleFieldChange = (key, val) => {
    if (key === "対応ステータス" && val !== formData["対応ステータス"]) {
      const statusDef = (statuses || []).find(s => s.name === val);
      if (statusDef?.scenarioId) {
        // シナリオが設定されていたら確認モーダルを表示してから適用
        setScenarioConfirm({ newStatus: val, scenarioId: statusDef.scenarioId });
        return;
      }
    }
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  if (!formData) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Loader2 className="animate-spin" size={40} color={THEME.primary} />
      </div>
    );
  }

  const assignedStaff = staffList.find((s) => s.email === formData["担当者メール"]);
  const assignedName = assignedStaff ? `${assignedStaff.lastName} ${assignedStaff.firstName}` : null;

      {/* ステータス変更シナリオ確認モーダル */}
      {scenarioConfirm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: 20, padding: 36, width: 440, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🔄</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0F172A", margin: "0 0 10px" }}>
                ステータスを変更しますか？
              </h3>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.8, margin: 0 }}>
                <strong style={{ color: "#6366F1" }}>「{scenarioConfirm.newStatus}」</strong> に変更します。<br />
                シナリオ <strong>「{scenarioConfirm.scenarioId}」</strong> が自動で適用されます。
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, "対応ステータス": scenarioConfirm.newStatus }));
                  setScenarioConfirm(null);
                }}
                style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", backgroundColor: "#6366F1", color: "white", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
              >
                変更する
              </button>
              <button
                onClick={() => setScenarioConfirm(null)}
                style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #E2E8F0", backgroundColor: "white", color: "#64748B", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
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

          <div style={{ display: "flex", gap: 10 }}>
            {!isEditing ? (
              <>
                <button onClick={() => navigate(`/schedule/${id}`)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                  <Clock size={16} color={THEME.primary} /> 配信履歴
                </button>
                <button onClick={() => navigate(`/direct-sms/${id}`)} style={{ ...styles.btn, ...styles.btnSecondary }}>
                  <MessageSquare size={16} color={THEME.primary} /> SMS送信
                </button>
                <button onClick={() => setIsEditing(true)} style={{ ...styles.btn, ...styles.btnPrimary }}>
                  <Edit3 size={16} /> 情報を編集
                </button>
              </>
            ) : (
              <>
                <button onClick={handleCancel} style={{ ...styles.btn, ...styles.btnSecondary, color: THEME.danger, borderColor: `${THEME.danger}40` }}>
                  <X size={16} /> キャンセル
                </button>
                <button onClick={handleSave} disabled={syncingCount > 0} style={{ ...styles.btn, ...styles.btnPrimary, opacity: syncingCount > 0 ? 0.7 : 1 }}>
                  {syncingCount > 0
                    ? <><Loader2 size={16} className="animate-spin" /> 保存中...</>
                    : <><Save size={16} /> 変更を保存</>}
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

            {/* 対応ステータス・担当者・流入元 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" + (sources.length > 0 ? " 1fr" : ""), gap: 20, marginBottom: 20, padding: "20px", backgroundColor: THEME.bg, borderRadius: 12 }}>
              {isEditing ? (
                <>
                  <EditSelect
                    label="対応ステータス" fieldName="対応ステータス"
                    options={statuses.map((s) => s.name)}
                    value={formData["対応ステータス"]} onChange={handleFieldChange}
                  />
                  <div style={styles.inputGroup}>
                    <label htmlFor="detail-担当者メール" style={{ ...styles.label, userSelect: "none" }}>担当者</label>
                    <StaffGroupSelect
                      inputId="detail-担当者メール"
                      value={formData["担当者メール"]}
                      onChange={(val) => handleFieldChange("担当者メール", val)}
                      staffList={staffList}
                      groups={groups}
                      deferred={true}
                    />
                  </div>
                  {sources.length > 0 && (
                    <EditSelect
                      label="流入元" fieldName="流入元"
                      options={[{ value: "", label: "未選択" }, ...sources.map((s) => ({ value: s.name, label: s.name }))]}
                      value={formData["流入元"]} onChange={handleFieldChange}
                    />
                  )}
                </>
              ) : (
                <>
                  <ViewField label="対応ステータス" value={formData["対応ステータス"]} />
                  <ViewField label="担当者" value={assignedName} />
                  {sources.length > 0 && <ViewField label="流入元" value={formData["流入元"] || "－"} />}
                </>
              )}
            </div>

            {/* 姓・名・電話番号 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {isEditing ? (
                <>
                  <EditText label="姓" fieldName="姓" value={formData["姓"]} onChange={handleFieldChange} />
                  <EditText label="名" fieldName="名" value={formData["名"]} onChange={handleFieldChange} />
                  <EditText label="電話番号" fieldName="電話番号" value={formData["電話番号"]} onChange={handleFieldChange} />
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
                {formSettings.map((field) => (
                  <CustomField
                    key={field.name}
                    field={field}
                    isEditing={isEditing}
                    value={formData[field.name]}
                    onChange={handleFieldChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ステータス遷移タイムライン */}
        <StatusTimeline history={customerStatusHistory} />

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
                    style={{ paddingLeft: 20, borderLeft: `2px solid ${isHot ? THEME.danger : i === 0 ? THEME.primary : THEME.border}`, position: "relative", marginBottom: 20, paddingBottom: 4 }}
                  >
                    <div style={{ position: "absolute", left: -6, top: 3, width: 10, height: 10, borderRadius: "50%", backgroundColor: isHot ? THEME.danger : i === 0 ? THEME.primary : THEME.border, border: "2px solid white" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 700 }}>最終クリック: {formatDateJP(log.last_clicked_at) || "-"}</span>
                      {isHot && <span style={{ backgroundColor: THEME.danger, color: "white", fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 900 }}>HOT</span>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMain, marginBottom: 4 }}>{parseInt(log.click_count)}回クリック</div>
                    <div style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 4 }}>送信: {formatDateJP(log.sent_at) || "-"}</div>
                    {log.original_url && (
                      <a href={log.original_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: THEME.primary, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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