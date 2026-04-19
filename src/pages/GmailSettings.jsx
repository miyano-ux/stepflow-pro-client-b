import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Edit3, Trash2, X, AlertCircle, ChevronLeft,
  Save, Loader2, RefreshCw,
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";

// ============================================================
// 📧 GmailSettings - カスタム取り込みルール設定（楽観的UI）
// ============================================================

// ── コンテンツフィンガープリント（照合専用・IDには使わない）────
// 同じ内容のルールが複数存在しうるため、フィンガープリントをIDに使うと
// Reactキー衝突や誤フィルターが発生する。
// このハッシュは useEffect 内での「どのローカルエントリに対応するか」の
// 照合にだけ使い、実際の _localId はカウンターで別管理する。
function makeFingerprint(rule) {
  return [
    rule["件名"]             || "",
    rule["氏名キー"]         || "",
    rule["電話キー"]         || "",
    rule["対応ステータス"]   || "",
    rule["流入元"]           || "",
    rule["担当者メール"]     || "",
    rule["シナリオID"]       || "",
    rule["カスタム項目キー"] || "",
  ].join("\x00");
}

const EMPTY_DATA = {
  subject: "", nameKey: "氏名：", phoneKey: "電話番号：",
  status: "", source: "", staffEmail: "", scenarioID: "", customKeys: {},
};

const LabelText = ({ children }) => (
  <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, display: "block", marginBottom: 6 }}>
    {children}
  </span>
);
const FieldBox = ({ children, style }) => (
  <div style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>
);

// ── 成功モーダル ──────────────────────────────────────────────
function SuccessModal({ open, message, onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 4000, animation: "fadeIn 0.15s ease" }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes drawCheck { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
        @keyframes progressBar { from{width:100%} to{width:0%} }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: 24, padding: "44px 48px 36px", maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 32px 64px rgba(0,0,0,0.18)", animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#22C55E" strokeWidth="2.5" fill="none" />
            <path d="M12 20.5 L17.5 26 L28 14" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="0" style={{ animation: "drawCheck 0.35s ease 0.1s both" }} />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#111827" }}>完了しました</h3>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{message}</p>
        <button onClick={onClose} style={{ width: "100%", padding: "13px", backgroundColor: "#22C55E", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>OK</button>
        <div style={{ marginTop: 16, height: 3, borderRadius: 99, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
          <div style={{ height: "100%", backgroundColor: "#22C55E", borderRadius: 99, animation: "progressBar 2.2s linear", transformOrigin: "left" }} />
        </div>
      </div>
    </div>
  );
}

// ── バックグラウンド同期バッジ ─────────────────────────────────
function SyncingBadge({ syncing }) {
  if (!syncing) return null;
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, backgroundColor: "rgba(15,23,42,0.85)", color: "white", borderRadius: 999, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 3500, backdropFilter: "blur(8px)" }}>
      <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
      サーバーと同期中...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function GmailSettings({
  gmailSettings = [], scenarios = [], formSettings = [],
  statuses = [], sources = [], staffList = [], groups = [],
  clientInfo = {}, onRefresh,
}) {
  const showToast = useToast();
  const navigate  = useNavigate();

  // ── state / ref 宣言（useEffectより前に全部置く・TDZエラー防止）──
  // IDはコンポーネントライフタイムで単調増加するカウンターで管理する。
  // フィンガープリントをIDに使うと同内容ルールでキー衝突が起きるため使わない。
  const idCounterRef = useRef(0);
  const nextId = () => `rule_${++idCounterRef.current}`;

  const [localSettings, setLocalSettings]   = useState(() =>
    gmailSettings.map((s, i) => ({ ...s, _localId: nextId(), _serverIdx: i }))
  );
  const [confirmModal, setConfirmModal]     = useState(null);
  const [modal, setModal]                   = useState({ open: false, mode: "add", editLocalId: null, data: EMPTY_DATA });
  const [testBody, setTestBody]             = useState("");
  const [parsePreview, setParsePreview]     = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [syncing, setSyncing]               = useState(false);
  const [successModal, setSuccessModal]     = useState({ open: false, message: "" });
  const [statusConfirmPending, setStatusConfirmPending] = useState(null);

  // 削除済みIDを記録するRef（GASキャッシュ遅延対策）
  // GASは書き込み直後のGETで古いデータを返すことがある。
  // onRefresh()がstaleデータを返しても、このSetでフィルターして復活を防ぐ。
  // エラー時は delete(id) で取り消す。
  const deletedIdsRef = useRef(new Set());

  // 削除済みルールのフィンガープリントも追跡する（IDと両方でガード）
  // deletedIdsRef だけでは「GASキャッシュで戻ってきた同内容ルールに
  // 新しいIDが発行されて素通りする」ケースを防げないため必要。
  const deletedFingerprintsRef = useRef(new Set());

  // 親の gmailSettings が変化したとき、削除済みIDを除外してローカルに反映。
  // ⚠️ prev関数形式必須。丸ごと上書きするとAPIが完了する前に親が再レンダリング
  //    したとき仮エントリ(_isTemp)が消える。
  // ⚠️ _localId の付与ルール:
  //    - 既存ローカルエントリと内容が一致するものは _localId を引き継ぐ
  //      （同内容ルールが複数ある場合は順番に1対1対応させる）
  //    - 新規サーバーエントリには nextId() で新しい安定IDを発行
  //    こうすることで削除済みIDが別ルールに誤マッチするのを防ぐ
  useEffect(() => {
    setLocalSettings((prev) => {
      // 仮エントリを先に退避
      const pendingTemps = prev.filter(x => x._isTemp);

      // サーバーデータに安定IDを付与（既存ローカルエントリと照合して引き継ぐ）
      const usedLocalIds = new Set();
      const merged = gmailSettings.map((s, i) => {
        const fp = makeFingerprint(s);
        // 同内容の未使用ローカルエントリを探して _localId を引き継ぐ
        const existing = prev.find(p =>
          !p._isTemp &&
          !usedLocalIds.has(p._localId) &&
          makeFingerprint(p) === fp
        );
        const localId = existing ? existing._localId : nextId();
        if (existing) usedLocalIds.add(localId);
        return { ...s, _localId: localId, _serverIdx: i };
      }).filter(s =>
        !deletedIdsRef.current.has(s._localId) &&
        !deletedFingerprintsRef.current.has(makeFingerprint(s))  // ← 追加
      );

      // まだ正式エントリが届いていない仮エントリだけ先頭に残す。
      // ⚠️ _localId ではなくフィンガープリントで比較すること。
      //    tempアイテムのIDとサーバーから返るrealアイテムのIDは絶対に
      //    一致しないため、_localIdで比較するとtempが永遠に残り続ける。
      const stillPending = pendingTemps.filter(
        t => !merged.some(m => makeFingerprint(m) === makeFingerprint(t))
      );
      return [...stillPending, ...merged];
    });
  }, [gmailSettings]);

  // ── シナリオ関連 ──────────────────────────────────────────
  const scenarioIds             = [...new Set((scenarios || []).map(s => s["シナリオID"]).filter(Boolean))];
  const statusLinkedScenarioIds = new Set((statuses || []).map(st => st.scenarioId).filter(Boolean));
  const unlinkedScenarioIds     = scenarioIds.filter(sid => !statusLinkedScenarioIds.has(sid));
  const selectedStatusDef       = (statuses || []).find(st => st.name === modal.data.status);
  const linkedScenarioId        = selectedStatusDef?.scenarioId || null;

  // ── ヘルパー ──────────────────────────────────────────────
  const safeParseCustomKeys = (str) => { try { return str ? JSON.parse(str) : {}; } catch { return {}; } };
  const setData      = (patch) => setModal(m => ({ ...m, data: { ...m.data, ...patch } }));
  const setCustomKey = (name, val) => setData({ customKeys: { ...modal.data.customKeys, [name]: val } });
  const getStaffName = (email) => { const s = staffList.find(s => s.email === email); return s ? `${s.lastName} ${s.firstName}` : email; };

  // ── ステータス変更（シナリオ連動確認）──────────────────────
  const handleStatusChange = (v) => {
    const statusDef = (statuses || []).find(st => st.name === v);
    if (statusDef?.scenarioId) {
      setStatusConfirmPending({ status: v, scenarioId: statusDef.scenarioId });
    } else {
      setData({ status: v, scenarioID: "" });
    }
  };

  // ── モーダル開閉 ──────────────────────────────────────────
  const openNew = () => {
    setTestBody(""); setParsePreview(null);
    setModal({ open: true, mode: "add", editLocalId: null, data: EMPTY_DATA });
  };
  const openEdit = (rule) => {
    const ck = safeParseCustomKeys(rule["カスタム項目キー"]);
    setTestBody(""); setParsePreview(null);
    setModal({
      open: true, mode: "edit", editLocalId: rule._localId,
      data: {
        subject:    rule["件名"]           || "",
        nameKey:    rule["氏名キー"]       || "氏名：",
        phoneKey:   rule["電話キー"]       || "電話番号：",
        status:     rule["対応ステータス"] || "",
        source:     rule["流入元"]         || "",
        staffEmail: rule["担当者メール"]   || "",
        scenarioID: rule["シナリオID"]     || "",
        customKeys: ck,
      },
    });
  };
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  // ── テスト実行 ────────────────────────────────────────────
  const handleTest = () => {
    if (!testBody) return showToast("テスト用の本文を入力してください", "warning");
    try {
      const extract = (key) => { if (!key) return "－"; const m = testBody.match(new RegExp(key + "\\s*(.+)")); return m ? m[1].trim() : "抽出失敗"; };
      const customs = {};
      Object.entries(modal.data.customKeys).forEach(([k, v]) => { if (v) customs[k] = extract(v); });
      setParsePreview({ name: extract(modal.data.nameKey), phone: extract(modal.data.phoneKey), customs });
    } catch { showToast("キーの形式が正しくありません", "info"); }
  };

  // ── 保存（楽観的UI）──────────────────────────────────────
  const handleSave = async () => {
    const isEdit   = modal.mode === "edit";
    const formData = { ...modal.data };

    // 件名キーワードの重複チェック（編集中の自分自身は除外）
    const subjectKey = formData.subject.trim();
    const isDuplicate = localSettings.some(s => {
      if (isEdit && s._localId === modal.editLocalId) return false; // 自分自身は除外
      return (s["件名"] || "").trim() === subjectKey;
    });
    if (isDuplicate) {
      const label = subjectKey === ""
        ? "ワイルドカード（空白）のルールはすでに存在します"
        : `件名キーワード「${subjectKey}」のルールはすでに存在します`;
      return showToast(label, "warning");
    }

    setSaving(true);

    // 編集時はサーバーインデックスを取得
    const serverItem = isEdit ? localSettings.find(s => s._localId === modal.editLocalId) : null;
    const serverIdx  = serverItem?._serverIdx ?? -1;

    // ローカル表現として使う新しいルールオブジェクト
    const newRule = {
      "件名":             formData.subject,
      "氏名キー":         formData.nameKey,
      "電話キー":         formData.phoneKey,
      "対応ステータス":   formData.status,
      "流入元":           formData.source,
      "担当者メール":     formData.staffEmail,
      "シナリオID":       formData.scenarioID,
      "カスタム項目キー": JSON.stringify(formData.customKeys),
    };

    // 1) 楽観的更新（即座にUIに反映）
    if (isEdit) {
      const newLocalId = makeFingerprint(newRule);
      setLocalSettings(prev => prev.map(s =>
        s._localId === modal.editLocalId
          ? { ...newRule, _localId: newLocalId, _serverIdx: serverIdx }
          : s
      ));
    } else {
      const tempId = nextId();
      setLocalSettings(prev => [{ ...newRule, _localId: tempId, _serverIdx: -1, _isTemp: true }, ...prev]);
    }

    // 2) モーダルを即座に閉じて成功表示
    closeModal();
    setSaving(false);
    setSuccessModal({ open: true, message: isEdit ? "ルールを更新しました。" : "ルールを追加しました。" });

    // 3) バックグラウンドでAPI → リフレッシュ
    setSyncing(true);
    try {
      await apiCall.post(GAS_URL, {
        action:     "saveGmailSetting",
        id:         isEdit ? serverIdx : undefined,
        subject:    formData.subject,
        nameKey:    formData.nameKey,
        phoneKey:   formData.phoneKey,
        status:     formData.status,
        source:     formData.source,
        staffEmail: formData.staffEmail,
        scenarioID: formData.scenarioID,
        customKeys: JSON.stringify(formData.customKeys),
      });
      onRefresh(); // 正式IDで仮IDを置き換える
    } catch {
      // ロールバック：props の最新状態に戻す（削除済みはフィルター）
      setLocalSettings(
        gmailSettings
          .map((s, i) => ({ ...s, _localId: makeFingerprint(s), _serverIdx: i }))
          .filter(s => !deletedIdsRef.current.has(s._localId))
      );
      showToast("保存に失敗しました。再度お試しください。", "error");
    } finally {
      setSyncing(false);
    }
  };

  // ── 削除（楽観的UI）──────────────────────────────────────
  const handleDelete = (rule) => {
    setConfirmModal({
      title: "このルールを削除しますか？",
      message: `件名キーワード「${rule["件名"] || "（すべてマッチ）"}」のルールを削除します。`,
      note: "この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);

        // 1) 削除済みIDとフィンガープリントの両方を記録（GASキャッシュ staleデータ対策）
        //    - deletedIdsRef:          既存エントリが同じIDで戻ってくるケースをガード
        //    - deletedFingerprintsRef: 同内容エントリが新しいIDで戻ってくるケースをガード
        deletedIdsRef.current.add(rule._localId);
        deletedFingerprintsRef.current.add(makeFingerprint(rule));
        const prevSettings = localSettings;

        // 2) 楽観的更新：即座にリストから除去
        setLocalSettings(prev => prev.filter(s => s._localId !== rule._localId));
        setSuccessModal({ open: true, message: "ルールを削除しました。" });

        // 3) バックグラウンドAPI
        setSyncing(true);
        try {
          await apiCall.post(GAS_URL, { action: "deleteGmailSetting", id: rule._serverIdx });
          onRefresh(); // GASが古いデータを返してもdeletedIdsRefでフィルターされる
        } catch {
          // 失敗時：記録を取り消してUIを元に戻す
          deletedIdsRef.current.delete(rule._localId);
          deletedFingerprintsRef.current.delete(makeFingerprint(rule));
          setLocalSettings(prevSettings);
          showToast("削除に失敗しました。再度お試しください。", "error");
        } finally {
          setSyncing(false);
        }
      },
    });
  };

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

      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: "" })}
      />

      <SyncingBadge syncing={syncing} />

      {/* ステータス選択確認モーダル */}
      {statusConfirmPending && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, padding: 24 }}>
          <div style={{ backgroundColor: "white", borderRadius: 20, padding: 36, maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>🔗</div>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: THEME.textMain }}>シナリオが自動適用されます</h3>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>ステータス「<strong>{statusConfirmPending.status}</strong>」にはシナリオが紐づいています。</p>
            <div style={{ margin: "0 0 24px", padding: "12px 16px", background: "#EEF2FF", borderRadius: 12, border: "1px solid #C7D2FE" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.primary }}>📋 {statusConfirmPending.scenarioId}</span>
            </div>
            <p style={{ margin: "0 0 28px", fontSize: 13, color: "#6B7280" }}>取り込み時にこのシナリオが自動的に適用されます。よろしいですか？</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setData({ status: statusConfirmPending.status, scenarioID: statusConfirmPending.scenarioId }); setStatusConfirmPending(null); }} style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", height: 48, fontSize: 15 }}>このシナリオで設定する</button>
              <button onClick={() => setStatusConfirmPending(null)} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", height: 44 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      <Page title="カスタム取り込みルール設定" subtitle="転送されたメールを件名キーワードで判別し、顧客として自動登録します">

        <button onClick={() => navigate("/source-integrations")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: THEME.textMuted, background: "none", border: "none", cursor: "pointer", padding: "0 0 20px", fontWeight: 500 }}>
          <ChevronLeft size={14} /> 自動連携設定に戻る
        </button>

        {/* 転送先アドレス案内バナー */}
        {clientInfo?.forwardingAddress && (
          <div style={{ padding: "14px 20px", marginBottom: 28, background: "#EEF2FF", borderRadius: 12, border: "1px solid #C7D2FE", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>📨</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, marginBottom: 2 }}>転送先アドレス</div>
              <div style={{ fontSize: 13, fontFamily: "monospace", color: THEME.textMain, fontWeight: 600 }}>{clientInfo.forwardingAddress}</div>
              <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>取り込みたいメールをこのアドレスに転送するよう設定してください</div>
            </div>
          </div>
        )}

        {/* 追加ボタン */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button onClick={openNew} style={{ ...styles.btn, ...styles.btnPrimary, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} /> ルールを追加
          </button>
        </div>

        {/* ルール一覧 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 24, marginBottom: 32 }}>
          {localSettings.map((rule) => {
            const ck   = safeParseCustomKeys(rule["カスタム項目キー"]);
            const mgmt = [
              rule["対応ステータス"] && `ステータス: ${rule["対応ステータス"]}`,
              rule["流入元"]         && `流入元: ${rule["流入元"]}`,
              rule["担当者メール"]   && `担当者: ${getStaffName(rule["担当者メール"])}`,
              rule["シナリオID"]     && `シナリオ: ${rule["シナリオID"]}`,
            ].filter(Boolean);
            const isTemp = rule._isTemp === true;

            return (
              <div key={rule._localId} style={{ ...styles.card, padding: 24, opacity: isTemp ? 0.7 : 1, transition: "opacity 0.3s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...styles.badge, backgroundColor: THEME.primary, color: "white", fontSize: 11, padding: "4px 10px" }}>ルール</span>
                    {isTemp && <RefreshCw size={12} color={THEME.textMuted} style={{ animation: "spin 1.2s linear infinite" }} />}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => openEdit(rule)} disabled={isTemp} style={{ background: "none", border: "none", color: isTemp ? THEME.border : THEME.textMuted, cursor: isTemp ? "not-allowed" : "pointer", padding: 6, borderRadius: 6 }}><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(rule)} disabled={isTemp} style={{ background: "none", border: "none", color: isTemp ? THEME.border : THEME.danger, cursor: isTemp ? "not-allowed" : "pointer", padding: 6, borderRadius: 6 }}><Trash2 size={16} /></button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8, fontSize: 13, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: THEME.textMuted }}>件名キーワード:</span>
                    <span style={{ fontWeight: 700 }}>{rule["件名"] || "（すべてマッチ）"}</span>
                  </div>
                </div>

                <div style={{ padding: 14, background: "#F8FAFC", borderRadius: 10, border: `1px solid ${THEME.border}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 6 }}>抽出キーワード</div>
                  <div style={{ fontSize: 12, color: THEME.textMain }}>
                    氏名: <span style={{ color: THEME.textMuted }}>{rule["氏名キー"]}</span>　電話: <span style={{ color: THEME.textMuted }}>{rule["電話キー"]}</span>
                  </div>
                  {Object.entries(ck).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12, marginTop: 4 }}>{k}: <span style={{ color: THEME.textMuted }}>{v}</span></div>
                  ))}
                </div>

                {mgmt.length > 0 && (
                  <div style={{ padding: 14, background: "#EEF2FF", borderRadius: 10, border: "1px solid #C7D2FE" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 6 }}>管理項目（自動セット）</div>
                    {mgmt.map((line, j) => <div key={j} style={{ fontSize: 12, color: THEME.textMain }}>{line}</div>)}
                  </div>
                )}
              </div>
            );
          })}

          {localSettings.length === 0 && (
            <div style={{ ...styles.card, padding: 48, textAlign: "center", color: THEME.textMuted, gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>ルールがまだありません</div>
              <div style={{ fontSize: 12 }}>「ルールを追加」から取り込みルールを作成してください</div>
            </div>
          )}
        </div>

      </Page>

      {/* ── 編集 / 新規モーダル ─────────────────────────────── */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: 24 }}>
          <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 980, maxHeight: "92vh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 320px", boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>

            {/* 左：設定フォーム */}
            <div style={{ padding: 36 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: THEME.textMain }}>
                  {modal.mode === "add" ? "取り込みルールの作成" : "ルールの編集"}
                </h2>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted }}><X size={22} /></button>
              </div>

              {/* 件名キーワード */}
              <div style={{ marginBottom: 20 }}>
                <FieldBox>
                  <LabelText>件名キーワード（部分一致）</LabelText>
                  <input style={styles.input} value={modal.data.subject} onChange={e => setData({ subject: e.target.value })} placeholder="例: 反響通知　（空白にするとすべてのメールにマッチ）" />
                </FieldBox>
                <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 6 }}>
                  空白にした場合は、他のルールにマッチしないすべてのメールが対象になります（ワイルドカード）
                </div>
              </div>

              {/* 抽出キーワード */}
              <div style={{ padding: 20, background: "#F8FAFC", borderRadius: 14, border: `1px solid ${THEME.border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 14 }}>抽出キーワード設定（その文字の「後ろ」を取得します）</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FieldBox>
                    <LabelText>氏名</LabelText>
                    <input style={styles.input} value={modal.data.nameKey} onChange={e => setData({ nameKey: e.target.value })} />
                  </FieldBox>
                  <FieldBox>
                    <LabelText>電話番号</LabelText>
                    <input style={styles.input} value={modal.data.phoneKey} onChange={e => setData({ phoneKey: e.target.value })} />
                  </FieldBox>
                  {formSettings.map(f => (
                    <FieldBox key={f.name}>
                      <LabelText>{f.name}</LabelText>
                      <input style={styles.input} value={modal.data.customKeys[f.name] || ""} onChange={e => setCustomKey(f.name, e.target.value)} placeholder={`例: ${f.name}：`} />
                    </FieldBox>
                  ))}
                </div>
              </div>

              {/* 管理項目 */}
              <div style={{ padding: 20, background: "#EEF2FF", borderRadius: 14, border: "1px solid #C7D2FE", marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, marginBottom: 14 }}>管理項目（取り込み時に自動セットする値）</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FieldBox>
                    <LabelText>対応ステータス</LabelText>
                    <CustomSelect value={modal.data.status} onChange={handleStatusChange} placeholder="未設定（デフォルト）" options={[{ value: "", label: "未設定（デフォルト）" }, ...statuses.map(st => ({ value: st.name, label: st.name }))]} />
                  </FieldBox>
                  <FieldBox>
                    <LabelText>流入元</LabelText>
                    <CustomSelect value={modal.data.source} onChange={v => setData({ source: v })} placeholder="未設定" options={[{ value: "", label: "未設定" }, ...sources.map(s => ({ value: s.name, label: s.name }))]} />
                  </FieldBox>
                  <FieldBox>
                    <LabelText>担当者</LabelText>
                    <CustomSelect value={modal.data.staffEmail} onChange={v => setData({ staffEmail: v })} placeholder="未割当" options={[{ value: "", label: "未割当" }, ...staffList.map(s => ({ value: s.email, label: `${s.lastName} ${s.firstName}` })), ...groups.map(g => ({ value: `group:${g["グループID"]}`, label: `👥 ${g["グループ名"]}（登録時に自動選出）` }))]} />
                  </FieldBox>
                  <FieldBox>
                    <LabelText>適用シナリオ</LabelText>
                    {linkedScenarioId ? (
                      <div style={{ ...styles.input, display: "flex", alignItems: "center", gap: 8, color: THEME.textMuted, background: "#F3F4F6", cursor: "not-allowed", userSelect: "none" }}>
                        <span>🔒</span>
                        <span style={{ fontWeight: 700, color: THEME.textMain }}>{linkedScenarioId}</span>
                        <span style={{ fontSize: 11 }}>（ステータスに連動）</span>
                      </div>
                    ) : (
                      <CustomSelect value={modal.data.scenarioID} onChange={v => setData({ scenarioID: v })} placeholder="未設定" options={[{ value: "", label: "未設定" }, ...unlinkedScenarioIds.map(sid => ({ value: sid, label: sid }))]} />
                    )}
                  </FieldBox>
                </div>
              </div>

              {/* 保存・キャンセル */}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", backgroundColor: saving ? "#818CF8" : THEME.primary, color: "white", fontWeight: 900, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background-color 0.2s" }}>
                  {saving ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 保存中...</> : <><Save size={18} /> 保存する</>}
                </button>
                <button onClick={closeModal} disabled={saving} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "#F1F5F9", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            </div>

            {/* 右：テストパネル */}
            <div style={{ background: "#F8FAFC", borderRadius: "0 20px 20px 0", padding: 32, borderLeft: `1px solid ${THEME.border}` }}>
              <h4 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: THEME.textMain }}>
                <AlertCircle size={17} color={THEME.primary} /> テスト
              </h4>
              <textarea style={{ ...styles.input, height: 200, fontSize: 12, resize: "vertical", width: "100%", boxSizing: "border-box" }} value={testBody} onChange={e => setTestBody(e.target.value)} placeholder="メール本文をここに貼り付け" />
              <button onClick={handleTest} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", marginTop: 12, backgroundColor: "white" }}>テスト実行</button>
              {parsePreview && (
                <div style={{ marginTop: 20, padding: 16, background: "white", borderRadius: 12, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 10 }}>抽出結果</div>
                  <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
                    <div>氏名: <strong>{parsePreview.name}</strong></div>
                    <div>電話: <strong>{parsePreview.phone}</strong></div>
                    {Object.entries(parsePreview.customs).map(([k, v]) => <div key={k}>{k}: <strong>{v}</strong></div>)}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}