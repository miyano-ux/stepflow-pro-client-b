import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Save, MessageSquare, History, Loader2,
  Edit3, X, Clock, LayoutGrid, ExternalLink,
  Phone, User, Building2, Plus, Trash2, Check, RefreshCw, Lock,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { formatDate } from "../lib/utils";
import DatePicker from "../components/DatePicker";
import CustomSelect from "../components/CustomSelect";
import StatusTimeline from "../components/StatusTimeline";
import PromptFieldsModal from "../components/PromptFieldsModal";
import StaffGroupSelect from "../components/StaffGroupSelect";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";

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

// ── 成功モーダル ──────────────────────────────────────────────
function PropertySuccessModal({ open, message, onClose }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 4000,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn   { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes drawCheck { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
        @keyframes progressBar { from { width: 100% } to { width: 0% } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "white", borderRadius: 24,
          padding: "44px 48px 36px", maxWidth: 360, width: "90%",
          textAlign: "center", boxShadow: "0 32px 64px rgba(0,0,0,0.18)",
          animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#22C55E" strokeWidth="2.5" fill="none" />
            <path d="M12 20.5 L17.5 26 L28 14" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="0" style={{ animation: "drawCheck 0.35s ease 0.1s both" }} />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#111827" }}>完了しました</h3>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{message}</p>
        <button onClick={onClose} style={{ width: "100%", padding: "13px", backgroundColor: "#22C55E", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
          OK
        </button>
        <div style={{ marginTop: 16, height: 3, borderRadius: 99, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
          <div style={{ height: "100%", backgroundColor: "#22C55E", borderRadius: 99, animation: "progressBar 2.2s linear", transformOrigin: "left" }} />
        </div>
      </div>
    </div>
  );
}

// ── バックグラウンド同期バッジ ─────────────────────────────────
function PropSyncingBadge({ syncing }) {
  if (!syncing) return null;
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28,
      backgroundColor: "rgba(15,23,42,0.85)", color: "white",
      borderRadius: 999, padding: "10px 18px",
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, fontWeight: 700,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 3500,
      backdropFilter: "blur(8px)",
    }}>
      <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
      サーバーと同期中...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── 物件追加・編集モーダル ────────────────────────────────────
function PropFormModal({ open, mode, data, propTypes, propStatuses, onSave, onClose }) {
  const [form, setForm] = useState(data);
  useEffect(() => { setForm(data); }, [data]);
  if (!open) return null;

  const isEdit = mode === "edit";
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "white", borderRadius: 20, padding: 32, width: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#1E293B" }}>
            {isEdit ? "物件を編集" : "物件を追加"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
            <X size={20} />
          </button>
        </div>

        {/* フォーム */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>物件名 *</label>
            <input style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="例: 渋谷区代々木 Bマンション" value={form.name || ""} onChange={e => set("name", e.target.value)} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>物件種別</label>
            <select style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", appearance: "none" }}
              value={form.propertyType || "マンション"} onChange={e => set("propertyType", e.target.value)}>
              {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>査定金額（万円）</label>
            <input style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="例: 8500" value={form.assessmentPrice || ""} onChange={e => set("assessmentPrice", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>成約金額（万円）</label>
            <input style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="例: 8200" value={form.contractPrice || ""} onChange={e => set("contractPrice", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>住所</label>
            <input style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              placeholder="例: 東京都渋谷区代々木2丁目" value={form.address || ""} onChange={e => set("address", e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>ステータス</label>
              <select style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", appearance: "none" }}
                value={form.status || "検討中"} onChange={e => set("status", e.target.value)}>
                {propStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 5 }}>備考</label>
            <textarea style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 80, fontFamily: "inherit" }}
              placeholder="メモ・特記事項など" value={form.note || ""} onChange={e => set("note", e.target.value)} />
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { if (!form.name) return; onSave(form); }}
            style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", backgroundColor: "#4F46E5", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            {isEdit ? "更新する" : "登録する"}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #E2E8F0", backgroundColor: "white", color: "#64748B", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

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
  // options は string[] または {value,label}[] のどちらでも受け付ける
  const normalized = options.map(o =>
    typeof o === "string" ? { value: o, label: o } : { value: o.value ?? "", label: o.label ?? o.value ?? "" }
  );
  // 先頭に "未選択" が含まれていない場合のみ追加
  const hasEmpty = normalized.some(o => o.value === "");
  const selectOptions = hasEmpty ? normalized : [{ value: "", label: "未選択" }, ...normalized];

  return (
    <div style={styles.inputGroup}>
      <label style={{ ...styles.label, userSelect: "none" }}>{label}</label>
      <CustomSelect
        value={value || ""}
        options={selectOptions}
        onChange={(v) => onChange(fieldName, v)}
        placeholder="未選択"
      />
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
  contractTypes = [], trackingLogs = [], staffList = [], groups = [],
  statusHistory = [], properties: allProperties = [], scenarios = [], gasUrl, onRefresh,
}) {
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [scenarioConfirm, setScenarioConfirm] = useState(null); // { newStatus, scenarioId }
  const [promptModal, setPromptModal]         = useState(null); // { promptFields }
  const [syncingCount, setSyncingCount] = useState(0);
  const [formData, setFormData] = useState(null);
  const [pendingHistoryEntry, setPendingHistoryEntry] = useState(null); // 楽観的更新用

  // ステータスに紐づいていないシナリオのみ（CustomerFormと同じフィルタ）
  const availableScenarios = useMemo(() => {
    const linked = new Set((statuses || []).map(s => s.scenarioId).filter(Boolean));
    return [...new Set((scenarios || []).map(x => x["シナリオID"]).filter(Boolean))]
      .filter(sid => !linked.has(sid));
  }, [scenarios, statuses]);

  // ── 物件管理ステート（楽観的UI） ──────────────────────────
  const [localProperties, setLocalProperties] = useState([]);
  const deletedIdsRef = useRef(new Set());
  const [propModal,   setPropModal]   = useState({ open: false, mode: "add", data: {} });
  const [propSyncing, setPropSyncing] = useState(false);
  const [propSuccess, setPropSuccess] = useState({ open: false, message: "" });
  const [confirmModal, setConfirmModal] = useState(null);
  const PROP_STATUSES = ["検討中", "成約", "見送り"];
  const PROP_TYPES    = ["マンション", "戸建", "土地", "事務所", "その他"];
  const STATUS_STYLE  = {
    "成約":   { bg: "#DCFCE7", color: "#166534", border: "#1D9E75" },
    "検討中": { bg: "#EEF2FF", color: "#3730A3", border: "#378ADD" },
    "見送り": { bg: "#F3F4F6", color: "#6B7280", border: "#9CA3AF" },
  };
  const formatPrice = (v) => {
    const n = Number(String(v || "").replace(/[^0-9.]/g, ""));
    if (!n) return "－";
    if (n >= 10000) return `¥${(n / 10000).toFixed(1).replace(/\.0$/, "")}億`;
    return `¥${n.toLocaleString()}万`;
  };

  // allProperties から自分の分だけ抽出（削除済みIDを除外・仮エントリを引き継ぐ）
  useEffect(() => {
    setLocalProperties(prev => {
      const filtered = (allProperties || [])
        .filter(p => String(p.customerId) === String(id))
        .filter(p => !deletedIdsRef.current.has(p.id));
      const pendingTemps = prev.filter(
        p => p._isTemp && !filtered.some(f => f.name === p.name)
      );
      return [...pendingTemps, ...filtered];
    });
  }, [allProperties, id]);

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
    if (customer && syncingCount === 0 && !isEditing) setFormData({ ...customer });
  }, [customer, syncingCount, location.state, id, isEditing]);

  // ステータス履歴（この顧客のものだけ）＋楽観的更新エントリをマージ
  const customerStatusHistory = useMemo(() => {
    const base = (statusHistory || [])
      .filter(h => String(h["顧客ID"]) === String(id))
      .sort((a, b) => new Date(a["変更日時"]) - new Date(b["変更日時"]));
    if (!pendingHistoryEntry) return base;
    // すでに同じステータス・日時が存在する場合は重複追加しない
    const alreadySynced = base.some(
      h => h["ステータス"] === pendingHistoryEntry["ステータス"] &&
           Math.abs(new Date(h["変更日時"]) - new Date(pendingHistoryEntry["変更日時"])) < 5000
    );
    return alreadySynced ? base : [...base, pendingHistoryEntry];
  }, [statusHistory, id, pendingHistoryEntry]);

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
          showToast("グループ割り当てに失敗しました: " + (res.data?.message || "", "error"));
          setSyncingCount(0);
          return;
        }
      }

      // ステータス変更を検知して楽観的にタイムラインへ即時反映
      // ※ applyOptimisticStatusHistory は同じステータスのときは何もしないので安全に呼べる
      const prevStatus = customer?.["対応ステータス"] || "";
      const nextStatus = snapshot["対応ステータス"] || "";
      applyOptimisticStatusHistory(prevStatus, nextStatus);

      await axios.post(
        gasUrl,
        JSON.stringify({ action: "update", id, data: snapshot }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setFormData(snapshot);
      // 成功モーダルを表示（OK押下後に編集モードを終了）
      setPropSuccess({ open: true, message: "顧客情報を保存しました。", _onClose: () => setIsEditing(false) });
      Promise.resolve(onRefresh()).finally(() => {
        setSyncingCount((p) => Math.max(0, p - 1));
        setPendingHistoryEntry(null);
      });
    } catch {
      showToast("更新に失敗しました", "error");
      setSyncingCount(0);
      setPendingHistoryEntry(null); // 失敗時はエントリを取り消し
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
      const pf = statusDef?.promptFields || [];
      if (statusDef?.scenarioId) {
        setScenarioConfirm({ newStatus: val, scenarioId: statusDef.scenarioId, promptFields: pf });
        return;
      }
      // 新ステータスにシナリオが紐づいていない場合:
      // 現在のシナリオIDが「ステータス連動」のもの（availableScenariosに存在しない）なら
      // 自動的にクリアする。
      // ※ CustomSelectはoptions外の値を「未選択」と表示するため、ユーザーには
      //   未選択に見えているのにformData上は旧IDが残るという不一致が起きるのを防ぐ。
      const currentScenarioId = formData["シナリオID"] || "";
      const isStatusLinked = currentScenarioId && !availableScenarios.includes(currentScenarioId);
      setFormData(prev => ({
        ...prev,
        [key]: val,
        ...(isStatusLinked ? { "シナリオID": "" } : {}),
      }));
      if (pf.length > 0) setPromptModal({ promptFields: pf });
      return;
    }
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // promptFieldsが確定したら即座にGASに保存
  const handlePromptConfirm = async (values) => {
    const updates = Object.entries(values).filter(([, v]) => v);
    if (updates.length > 0) {
      setFormData(prev => ({ ...prev, ...Object.fromEntries(updates) }));
      if (customer?.id) {
        try {
          await axios.post(
            gasUrl,
            JSON.stringify({ action: "updateFields", id: customer.id, fields: Object.fromEntries(updates) }),
            { headers: { "Content-Type": "text/plain;charset=utf-8" } }
          );
          onRefresh();
        } catch { /* silent fail - formDataは更新済み */ }
      }
    }
    setPromptModal(null);
  };

  // ステータス変更を検知して楽観的タイムラインを更新するヘルパー
  // handleSave・handleFieldChange のどちらから呼ばれた場合も確実に記録する
  const applyOptimisticStatusHistory = (prevStatus, nextStatus) => {
    if (!prevStatus || !nextStatus || prevStatus === nextStatus) return;
    setPendingHistoryEntry({
      "顧客ID": id,
      "ステータス": nextStatus,
      "変更日時": new Date().toISOString(),
      _pending: true,
    });
  };

  // ── 物件 CRUD（楽観的UI） ────────────────────────────────
  const handleAddProperty = async (formData) => {
    if (!formData.name) return;
    const tempId  = `temp_${Date.now()}`;
    const tempEntry = { ...formData, id: tempId, customerId: id, status: "検討中", _isTemp: true };

    // 1) 楽観的追加 & モーダルを即座に閉じる
    setLocalProperties(prev => [...prev, tempEntry]);
    setPropModal({ open: false, mode: "add", data: {} });
    setPropSuccess({ open: true, message: `「${formData.name}」を登録しました。` });

    // 2) バックグラウンドAPI
    setPropSyncing(true);
    try {
      await axios.post(gasUrl,
        JSON.stringify({ action: "addProperty", customerId: id, ...formData }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      // 失敗時：仮エントリを除去して差し戻す
      setLocalProperties(prev => prev.filter(p => p.id !== tempId));
      showToast("物件の登録に失敗しました", "error");
    } finally {
      setPropSyncing(false);
    }
  };

  const handleUpdateProperty = async (propId, formData) => {
    const prevProperties = localProperties;

    // 1) 楽観的更新 & モーダルを即座に閉じる
    setLocalProperties(prev => prev.map(p => p.id === propId ? { ...p, ...formData } : p));
    setPropModal({ open: false, mode: "edit", data: {} });
    setPropSuccess({ open: true, message: `「${formData.name}」を更新しました。` });

    // 2) バックグラウンドAPI
    setPropSyncing(true);
    try {
      await axios.post(gasUrl,
        JSON.stringify({ action: "updateProperty", id: propId, ...formData }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch {
      setLocalProperties(prevProperties);
      showToast("物件の更新に失敗しました", "error");
    } finally {
      setPropSyncing(false);
    }
  };

  const handleDeleteProperty = (propId, propName) => {
    setConfirmModal({
      title: "この物件を削除しますか？",
      message: `「${propName}」を削除します。`,
      note: "この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);

        // 1) 削除済み記録 & 楽観的除去
        deletedIdsRef.current.add(propId);
        const prevProperties = localProperties;
        setLocalProperties(prev => prev.filter(p => p.id !== propId));
        setPropSuccess({ open: true, message: `「${propName}」を削除しました。` });

        // 2) バックグラウンドAPI
        setPropSyncing(true);
        try {
          await axios.post(gasUrl,
            JSON.stringify({ action: "deleteProperty", id: propId }),
            { headers: { "Content-Type": "text/plain;charset=utf-8" } }
          );
          onRefresh();
        } catch {
          deletedIdsRef.current.delete(propId);
          setLocalProperties(prevProperties);
          showToast("物件の削除に失敗しました", "error");
        } finally {
          setPropSyncing(false);
        }
      },
    });
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

  return (
    <>
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        note={confirmModal?.note}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
      <PropertySuccessModal
        open={propSuccess.open}
        message={propSuccess.message}
        onClose={() => {
          const cb = propSuccess._onClose;
          setPropSuccess({ open: false, message: "" });
          if (cb) cb();
        }}
      />
      <PropSyncingBadge syncing={propSyncing} />
      <PropFormModal
        open={propModal.open}
        mode={propModal.mode}
        data={propModal.data}
        propTypes={PROP_TYPES}
        propStatuses={PROP_STATUSES}
        onSave={(formData) => {
          if (propModal.mode === "add") {
            handleAddProperty(formData);
          } else {
            handleUpdateProperty(propModal.data._id, formData);
          }
        }}
        onClose={() => setPropModal(prev => ({ ...prev, open: false }))}
      />
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 48px" }}>

      {/* ── ヘッダー ── */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => navigate(location.state?.from ?? "/customers")}
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 16, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> {location.state?.from ? "リストに戻る" : "顧客一覧に戻る"}
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

            {/* 適用シナリオ */}
            <div style={{ marginBottom: 20 }}>
              {isEditing ? (
                <div style={styles.inputGroup}>
                  <label style={{ ...styles.label, userSelect: "none" }}>適用シナリオ</label>
                  {(() => {
                    const currentStatusDef = (statuses || []).find(s => s.name === formData["対応ステータス"]);
                    const linkedId = currentStatusDef?.scenarioId;
                    if (linkedId) {
                      // ステータスに紐づいたシナリオ → CustomSelectと同形のロック表示
                      return (
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "11px 14px", boxSizing: "border-box",
                          border: "1px solid #E2E8F0", borderRadius: 12,
                          backgroundColor: "#F8FAFC", cursor: "default",
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                            <Lock size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedId}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#EEF2FF", color: "#6366F1", padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>
                              ステータスに連動
                            </span>
                          </span>
                        </div>
                      );
                    }
                    // 紐づきなし → 通常のプルダウン
                    return (
                      <CustomSelect
                        value={formData["シナリオID"] || ""}
                        onChange={v => handleFieldChange("シナリオID", v)}
                        placeholder="未選択"
                        options={[
                          { value: "", label: "未選択" },
                          ...availableScenarios.map(sid => ({ value: sid, label: sid })),
                        ]}
                      />
                    );
                  })()}
                </div>
              ) : (
                formData["シナリオID"]
                  ? <ViewField label="適用シナリオ" value={formData["シナリオID"]} />
                  : null
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

            {/* 失注理由（失注ステータスかつ理由が記録されている場合のみ表示） */}
            {(() => {
              const lostStatus = (statuses || []).find(s => s.terminalType === "lost");
              const isLost = lostStatus && formData["対応ステータス"] === lostStatus.name;
              if (!isLost || !formData["失注理由"]) return null;
              return (
                <div style={{ marginTop: 16, padding: "14px 16px", backgroundColor: "#FEF2F2", borderRadius: 10, border: "1px solid #FCA5A540", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>🗑</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", marginBottom: 3 }}>失注理由</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#991B1B" }}>{formData["失注理由"]}</div>
                  </div>
                </div>
              );
            })()}
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

          {/* ── 検討物件セクション ── */}
          <div style={styles.card}>
            {/* ヘッダー */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: THEME.textMuted, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={15} /> 検討物件
                {localProperties.length > 0 && (
                  <span style={{ background: "#EEF2FF", color: THEME.primary, fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 99 }}>
                    {localProperties.length}件
                  </span>
                )}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* 合計サマリー */}
                {localProperties.length > 0 && (() => {
                  const wonTotal = localProperties.filter(p => p.status === "成約")
                    .reduce((s, p) => s + (Number(String(p.contractPrice || "").replace(/[^0-9.]/g, "")) || 0), 0);
                  const maxActive = Math.max(0, ...localProperties.filter(p => p.status === "検討中")
                    .map(p => Number(String(p.assessmentPrice || "").replace(/[^0-9.]/g, "")) || 0));
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      {wonTotal > 0 && <span style={{ color: "#166534", fontWeight: 700 }}>成約 {formatPrice(wonTotal)}</span>}
                      {wonTotal > 0 && maxActive > 0 && <span style={{ color: THEME.textMuted }}>／</span>}
                      {maxActive > 0 && <span style={{ color: THEME.textMuted }}>査定 〜{formatPrice(maxActive)}</span>}
                    </div>
                  );
                })()}
                <button
                  onClick={() => setPropModal({ open: true, mode: "add", data: { name: "", address: "", assessmentPrice: "", contractPrice: "", propertyType: "マンション", note: "" } })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${THEME.border}`, borderRadius: 8, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, color: THEME.textMain }}
                >
                  <Plus size={13} /> 物件を追加
                </button>
              </div>
            </div>

            {/* 物件カード一覧 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {localProperties.length === 0 && (
                <div style={{ textAlign: "center", padding: "28px 0", color: THEME.textMuted, fontSize: 13 }}>
                  検討物件がまだ登録されていません
                </div>
              )}
              {localProperties.map((prop) => {
                const ss = STATUS_STYLE[prop.status] || STATUS_STYLE["見送り"];
                return (
                  <div
                    key={prop.id}
                    style={{
                      border: `1px solid ${THEME.border}`, borderRadius: 10, padding: "12px 14px",
                      borderLeft: `3px solid ${ss.border}`,
                      opacity: prop._isTemp ? 0.7 : prop.status === "見送り" ? 0.65 : 1,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: THEME.textMain }}>{prop.name || "（物件名未設定）"}</span>
                          {prop._isTemp
                            ? <RefreshCw size={12} color={THEME.textMuted} style={{ animation: "spin 1.2s linear infinite" }} />
                            : <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: ss.bg, color: ss.color, padding: "1px 8px", borderRadius: 99 }}>{prop.status}</span>
                          }
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: THEME.textMuted, flexWrap: "wrap" }}>
                          {prop.propertyType && <span>{prop.propertyType}</span>}
                          {prop.address      && <span>{prop.address}</span>}
                          {prop.note         && <span style={{ fontStyle: "italic" }}>{prop.note}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div style={{ textAlign: "right" }}>
                          {prop.assessmentPrice && (
                            <div style={{ fontSize: 12, color: THEME.textMuted, fontWeight: 600 }}>査定 {formatPrice(prop.assessmentPrice)}</div>
                          )}
                          {prop.contractPrice && (
                            <div style={{ fontSize: 15, fontWeight: 900, color: "#166534" }}>成約 {formatPrice(prop.contractPrice)}</div>
                          )}
                          {!prop.assessmentPrice && !prop.contractPrice && (
                            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.textMuted }}>－</div>
                          )}
                        </div>
                        {!prop._isTemp && (
                          <>
                            <button
                              onClick={() => setPropModal({ open: true, mode: "edit", data: { name: prop.name, address: prop.address, assessmentPrice: prop.assessmentPrice, contractPrice: prop.contractPrice, propertyType: prop.propertyType, status: prop.status, note: prop.note, _id: prop.id } })}
                              style={{ padding: "4px 8px", border: `1px solid ${THEME.border}`, borderRadius: 6, background: "white", cursor: "pointer", color: THEME.textMuted, fontSize: 11 }}
                            >編集</button>
                            <button
                              onClick={() => handleDeleteProperty(prop.id, prop.name || "この物件")}
                              style={{ padding: "4px 6px", border: "none", borderRadius: 6, background: "#FEF2F2", cursor: "pointer", color: THEME.danger, display: "flex" }}
                            ><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右列：ステータス遷移 ＋ アクティビティ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ステータス遷移タイムライン */}
        <StatusTimeline history={customerStatusHistory} />

        {/* アクティビティログ */}
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

        </div>{/* end 右列 */}

      </div>

      {/* ── モーダル群（return の中に配置することで正しくレンダリングされる） ── */}
      {promptModal && (
        <PromptFieldsModal
          newStatus={formData["対応ステータス"] || ""}
          promptFields={promptModal.promptFields}
          sources={sources}
          contractTypes={contractTypes}
          staffList={staffList}
          currentValues={{
            "契約種別":     formData["契約種別"]     || "",
            "流入元":       formData["流入元"]       || "",
            "担当者メール": formData["担当者メール"] || "",
          }}
          onConfirm={handlePromptConfirm}
          onSkip={() => setPromptModal(null)}
        />
      )}
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
                  const pf = scenarioConfirm.promptFields || [];
                  setFormData(prev => ({
                    ...prev,
                    "対応ステータス": scenarioConfirm.newStatus,
                    "シナリオID":     scenarioConfirm.scenarioId,
                  }));
                  setScenarioConfirm(null);
                  if (pf.length > 0) setPromptModal({ promptFields: pf });
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
    </div>
    </>
  );
}