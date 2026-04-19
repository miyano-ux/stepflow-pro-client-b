import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  UserPlus, Mail, Edit3, Trash2, Loader2,
  Phone, UserCircle, RefreshCw, Users, Plus, X, ChevronDown, ChevronUp
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";

// ==========================================
// 👥 UserManager - ユーザー管理 + グループ管理
// ==========================================

const lS = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "48px 64px", maxWidth: "1440px", margin: "0 auto" },
  card:    { backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "11px", fontWeight: "800", backgroundColor: "#F8FAFC", borderBottom: `2px solid ${THEME.border}`, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" },
  tableTd: { padding: "20px 24px", fontSize: "14px", color: THEME.textMain, borderBottom: `1px solid ${THEME.border}`, verticalAlign: "middle" },
  secTitle: { fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 4px" },
  secSub:   { fontSize: 14, color: THEME.textMuted, margin: 0 },
};

// ── 成功モーダル ──────────────────────────────────────────────
function SuccessModal({ open, message, onClose }) {
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
        animation: "smFadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes smFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes smPopIn  { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes smDrawCheck {
          from { stroke-dashoffset: 60 }
          to   { stroke-dashoffset: 0  }
        }
        @keyframes smProgressBar {
          from { width: 100% }
          to   { width: 0% }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: "44px 48px 36px",
          maxWidth: 360,
          width: "90%",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0,0,0,0.18)",
          animation: "smPopIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          backgroundColor: "#F0FDF4",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#22C55E" strokeWidth="2.5" fill="none" />
            <path
              d="M12 20.5 L17.5 26 L28 14"
              stroke="#22C55E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="0"
              style={{ animation: "smDrawCheck 0.35s ease 0.1s both" }}
            />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#111827" }}>
          完了しました
        </h3>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px",
            backgroundColor: "#22C55E", color: "white",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: "pointer",
          }}
        >
          OK
        </button>
        <div style={{ marginTop: 16, height: 3, borderRadius: 99, backgroundColor: "#F3F4F6", overflow: "hidden" }}>
          <div style={{
            height: "100%", backgroundColor: "#22C55E", borderRadius: 99,
            animation: "smProgressBar 2.2s linear",
            transformOrigin: "left",
          }} />
        </div>
      </div>
    </div>
  );
}

// ── グループカード ─────────────────────────────────────────────
function GroupCard({ group, staffList, onSave, onDelete }) {
  const showToast = useToast();
  const [open,        setOpen]        = useState(false);
  const [name,        setName]        = useState(group.name);
  const [members,     setMembers]     = useState(group.members);
  const [saving,      setSaving]      = useState(false);
  const [savedLabel,  setSavedLabel]  = useState(null); // 楽観的表示用
  const [confirmSave, setConfirmSave] = useState(false); // 保存確認モーダル

  const toggle = (email) =>
    setMembers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );

  // 保存ボタン押下 → バリデーション → 確認モーダルを表示
  const handleSave = () => {
    if (!name.trim()) return showToast("グループ名を入力してください", "warning");
    setConfirmSave(true);
  };

  // 確認モーダルで「保存する」を押したときの実処理
  const doSave = async () => {
    setConfirmSave(false);
    setSaving(true);
    // 楽観的更新：即座にヘッダーに反映
    setSavedLabel({ name: name.trim(), members: [...members] });
    try {
      await onSave({ groupId: group.groupId, name: name.trim(), members });
      setOpen(false); // 保存完了でパネルを閉じる
    } catch {
      setSavedLabel(null); // 失敗時は楽観的表示を元に戻す
    } finally {
      setSaving(false);
    }
  };

  // 表示に使う名前・メンバー（楽観的更新優先）
  const displayName    = savedLabel ? savedLabel.name    : group.name;
  const displayMembers = savedLabel ? savedLabel.members : group.members;
  const memberNames = displayMembers.map(email => {
    const s = staffList.find(u => u.email === email);
    return s ? `${s.lastName} ${s.firstName}` : email;
  });

  return (
    <>
    <ConfirmModal
      open={confirmSave}
      title="グループを保存しますか？"
      message={`「${name.trim() || "（名称未設定）"}」を保存します。`}
      onConfirm={doSave}
      onCancel={() => setConfirmSave(false)}
      confirmLabel="保存する"
      confirmColor={THEME.primary}
    />
    <div style={{ border: `1px solid ${open ? THEME.primary : THEME.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12, transition: "border-color 0.15s" }}>
      {/* ヘッダー */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer", backgroundColor: open ? "#F5F3FF" : "white", userSelect: "none", transition: "background 0.15s" }}
      >
        <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={18} color={THEME.primary} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: THEME.textMain }}>{displayName || "（名称未設定）"}</div>
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
            {displayMembers.length > 0 ? memberNames.join("・") : "メンバー未設定"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "2px 10px", borderRadius: 99, fontWeight: 700 }}>
            {displayMembers.length}名
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(group.groupId); }}
            style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: 6, borderRadius: 6 }}
          >
            <Trash2 size={16} />
          </button>
          {open ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />}
        </div>
      </div>

      {/* 編集パネル */}
      {open && (
        <div style={{ padding: "24px", borderTop: `1px solid ${THEME.border}`, background: "#FAFAFA" }}>
          {/* グループ名 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...styles.label, userSelect: "none" }}>グループ名</label>
            <input
              style={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: 東日本営業"
            />
          </div>

          {/* メンバー選択 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ ...styles.label, userSelect: "none" }}>
              メンバー
              <span style={{ marginLeft: 8, fontWeight: 400, color: THEME.textMuted }}>（クリックで追加 / 除外）</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {staffList.map(s => {
                const selected = members.includes(s.email);
                return (
                  <button
                    key={s.email}
                    onClick={() => toggle(s.email)}
                    style={{
                      padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      border: `1.5px solid ${selected ? THEME.primary : THEME.border}`,
                      backgroundColor: selected ? "#EEF2FF" : "white",
                      color: selected ? THEME.primary : THEME.textMuted,
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && "✓ "}{s.lastName} {s.firstName}
                  </button>
                );
              })}
              {staffList.length === 0 && (
                <span style={{ fontSize: 13, color: THEME.textMuted }}>スタッフが登録されていません</span>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? <><Loader2 size={15} className="animate-spin" /> 保存中...</> : "保存"}
            </button>
            <button
              onClick={() => { setName(group.name); setMembers(group.members); setOpen(false); }}
              style={{ ...styles.btn, ...styles.btnSecondary }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ── メインコンポーネント ────────────────────────────────────────
export default function UserManager({
  staffList = [], groups: groupsProp = [], statuses = [],
  onRefreshStaff, onRefresh, masterUrl, gasUrl, companyName = "B社",
}) {
  const [confirmModal, setConfirmModal] = useState(null);
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const showToast = useToast();
  const navigate = useNavigate();
  const [refreshing,      setRefreshing]      = useState(false);
  const [addingGroup,     setAddingGroup]      = useState(false);
  const [newGroupName,    setNewGroupName]     = useState("");
  const [newGroupMembers, setNewGroupMembers]  = useState([]);

  // ── 楽観的UI（パターンA：固有IDあり） ──────────────────────
  // ※ すべての state/ref 宣言は useEffect より前に書く（TDZエラー防止）
  const [localGroups, setLocalGroups] = useState(groupsProp);
  // 削除済みグループIDを記録（GASキャッシュ staleデータ対策）
  // onRefresh() が古いデータを返しても復活しないようにガード
  const deletedIdsRef = useRef(new Set());

  // groupsProp が変化したとき（初回ロード・手動更新）にローカルへ同期
  // 削除済みIDを除外し、まだ正式IDが届いていない仮エントリを先頭に残す
  React.useEffect(() => {
    setLocalGroups((prev) => {
      const filtered = groupsProp.filter(
        (x) => !deletedIdsRef.current.has(x["グループID"])
      );
      // _isTemp かつ filtered に同IDがない → まだ正式エントリ未着
      const pendingTemps = prev.filter(
        (x) => x._isTemp && !filtered.some((f) => f["グループID"] === x["グループID"])
      );
      return [...pendingTemps, ...filtered];
    });
  }, [groupsProp]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefreshStaff(); } finally { setRefreshing(false); }
  };

  const handleDeleteUser = (email) => {
    setConfirmModal({
      title: "このユーザーを完全に削除しますか？",
      message: email,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await axios.post(
            masterUrl,
            JSON.stringify({ action: "deleteAllowUser", "メール": email, company: companyName }),
            { headers: { "Content-Type": "text/plain;charset=utf-8" } }
          );
          if (res.data.status === "success") await onRefreshStaff();
          else showToast("失敗: " + res.data.message, "error");
        } catch { showToast("通信エラーが発生しました", "error"); }
      },
    });
  };

  // グループ保存（編集）楽観的更新：即座にローカルに反映 → バックグラウンドでGAS保存
  // 成功時は onRefresh() 不要（GASキャッシュ遅延で書き込み前のデータが返るのを避ける）
  const handleSaveGroup = async ({ groupId, name, members }) => {
    const prevItems = localGroups;
    // 1) 楽観的更新
    setLocalGroups((prev) =>
      prev.map((g) =>
        g["グループID"] === groupId
          ? { ...g, "グループ名": name, "メンバーメール": members.join(",") }
          : g
      )
    );
    try {
      const res = await axios.post(
        GAS_URL,
        JSON.stringify({ action: "saveGroup", groupId, name, members }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data?.status === "error") {
        showToast("エラー: " + (res.data.message || "保存に失敗しました"), "error");
        setLocalGroups(prevItems); // ロールバック
        // GroupCard の catch（savedLabel リセット）に伝播させる
        throw Object.assign(new Error(res.data.message), { _handled: true });
      }
    } catch (e) {
      if (!e._handled) {
        // axios レベルの通信エラー（上記 throw は除外）
        showToast("通信エラー: " + (e?.message || "不明なエラー"), "error");
        setLocalGroups(prevItems); // ロールバック
      }
      throw e; // GroupCard の catch（savedLabel リセット）に伝播
    }
  };

  // グループ新規作成
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return showToast("グループ名を入力してください", "warning");
    const groupId = "g_" + Date.now();
    const newGroup = {
      "グループID": groupId,
      "グループ名": newGroupName.trim(),
      "メンバーメール": newGroupMembers.join(","),
      _isTemp: true, // サーバーの正式IDが届くまでの仮エントリフラグ
    };
    const prevItems = localGroups;
    // 1) 楽観的更新：末尾に追加
    setLocalGroups((prev) => [...prev, newGroup]);
    setSuccessModal({ open: true, message: `「${newGroupName.trim()}」を作成しました。` });
    setNewGroupName("");
    setNewGroupMembers([]);
    setAddingGroup(false);
    try {
      const res = await axios.post(
        GAS_URL,
        JSON.stringify({ action: "saveGroup", groupId, name: newGroupName.trim(), members: newGroupMembers }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data?.status === "error") {
        showToast("エラー: " + (res.data.message || "保存に失敗しました"), "error");
        setLocalGroups(prevItems); // ロールバック
      } else {
        if (onRefresh) onRefresh(); // 正式IDで仮エントリを置き換える
      }
    } catch (e) {
      showToast("通信エラー: " + (e?.message || "不明なエラー"), "error");
      setLocalGroups(prevItems); // ロールバック
    }
  };

  // グループ削除
  const handleDeleteGroup = (groupId) => {
    const target = localGroups.find((g) => g["グループID"] === groupId);
    const label = target?.["グループ名"] || "このグループ";
    setConfirmModal({
      title: "このグループを削除しますか？",
      message: `「${label}」を削除します。`,
      note: "この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);
        // 1) 削除済みIDを記録（GASキャッシュ staleデータ対策）
        //    onRefresh() が古いデータを返しても復活しないようにガード
        deletedIdsRef.current.add(groupId);
        const prevItems = localGroups;
        // 2) 楽観的更新
        setLocalGroups((prev) => prev.filter((g) => g["グループID"] !== groupId));
        setSuccessModal({ open: true, message: `「${label}」を削除しました。` });
        // 3) バックグラウンドAPI
        try {
          await axios.post(
            GAS_URL,
            JSON.stringify({ action: "deleteGroup", groupId }),
            { headers: { "Content-Type": "text/plain;charset=utf-8" } }
          );
          if (onRefresh) onRefresh(); // deletedIdsRef でフィルター済みなので復活しない
        } catch (e) {
          // 失敗時のみ記録を取り消してUIを元に戻す
          deletedIdsRef.current.delete(groupId);
          setLocalGroups(prevItems);
          showToast("通信エラー: " + (e?.message || "不明なエラー"), "error");
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
      <div style={lS.main}>
      <div style={lS.wrapper}>

        {/* ── ユーザー一覧 ── */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={lS.secTitle}>ユーザー管理</h1>
            <p style={lS.secSub}>システムの利用権限を持つスタッフアカウントの一覧</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleRefresh} disabled={refreshing} style={{ ...styles.btn, ...styles.btnSecondary, gap: 8 }}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "更新中..." : "更新"}
            </button>
            <button onClick={() => navigate("/users/add")} style={{ ...styles.btn, ...styles.btnPrimary }}>
              <UserPlus size={18} /> 新規ユーザー登録
            </button>
          </div>
        </header>

        <div style={{ ...lS.card, marginBottom: 48 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={lS.tableTh}>担当スタッフ</th>
                <th style={lS.tableTh}>メールアドレス</th>
                <th style={lS.tableTh}>電話番号</th>
                <th style={{ ...lS.tableTh, textAlign: "center", width: 120 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: 80, textAlign: "center", color: THEME.textMuted }}>
                    登録データが見つかりません
                  </td>
                </tr>
              ) : (
                staffList.map(u => (
                  <tr
                    key={u.email}
                    style={{ transition: "0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}
                  >
                    <td style={lS.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center", color: THEME.primary, flexShrink: 0 }}>
                          <UserCircle size={24} />
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{u.lastName} {u.firstName}</div>
                      </div>
                    </td>
                    <td style={lS.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.textMuted }}>
                        <Mail size={14} /> {u.email}
                      </div>
                    </td>
                    <td style={lS.tableTd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.textMuted }}>
                        <Phone size={14} /> {String(u.phone || "-").replace(/'/g, "")}
                      </div>
                    </td>
                    <td style={lS.tableTd}>
                      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
                        <button
                          onClick={() => navigate(`/users/edit/${encodeURIComponent(u.email)}`, { state: { user: u } })}
                          style={{ background: "none", border: "none", color: THEME.primary, cursor: "pointer", padding: 8 }}
                        >
                          <Edit3 size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.email)}
                          style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: 8 }}
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

        {/* ── グループ管理 ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <h2 style={lS.secTitle}>グループ管理</h2>
            <p style={lS.secSub}>担当者をグループにまとめ、顧客登録時に自動割り当てできます</p>
          </div>
          <button
            onClick={() => setAddingGroup(true)}
            style={{ ...styles.btn, ...styles.btnPrimary }}
          >
            <Plus size={16} /> グループを追加
          </button>
        </div>

        {/* 新規グループ作成フォーム */}
        {addingGroup && (
          <div style={{ padding: 24, border: `2px solid ${THEME.primary}`, borderRadius: 14, marginBottom: 16, backgroundColor: "#F5F3FF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={20} color={THEME.primary} />
                <span style={{ fontWeight: 900, fontSize: 15, color: THEME.textMain }}>新しいグループ</span>
              </div>
              <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...styles.label, userSelect: "none" }}>グループ名</label>
              <input
                style={styles.input}
                placeholder="例: 東日本営業"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ ...styles.label, userSelect: "none" }}>
                メンバー
                <span style={{ marginLeft: 8, fontWeight: 400, color: THEME.textMuted }}>（クリックで追加 / 除外）</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {staffList.map(s => {
                  const selected = newGroupMembers.includes(s.email);
                  return (
                    <button
                      key={s.email}
                      onClick={() => setNewGroupMembers(prev => selected ? prev.filter(e => e !== s.email) : [...prev, s.email])}
                      style={{
                        padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: `1.5px solid ${selected ? THEME.primary : THEME.border}`,
                        backgroundColor: selected ? "#EEF2FF" : "white",
                        color: selected ? THEME.primary : THEME.textMuted,
                        transition: "all 0.15s",
                      }}
                    >
                      {selected && "✓ "}{s.lastName} {s.firstName}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleAddGroup} style={{ ...styles.btn, ...styles.btnPrimary }}>作成</button>
              <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupMembers([]); }} style={{ ...styles.btn, ...styles.btnSecondary }}>キャンセル</button>
            </div>
          </div>
        )}

        {/* グループ一覧 */}
{localGroups.length === 0 && !addingGroup ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 14 }}>
            グループがまだ登録されていません。「グループを追加」から作成してください。
          </div>
        ) : (
          localGroups.map(g => (
            <GroupCard
              key={g["グループID"]}
              group={{
                groupId: g["グループID"],
                name:    g["グループ名"],
                members: g["メンバーメール"] ? g["メンバーメール"].split(",").map(s => s.trim()).filter(Boolean) : [],
              }}
              staffList={staffList}
              onSave={handleSaveGroup}
              onDelete={handleDeleteGroup}
            />
          ))
        )}

      </div>
    </div>
    </>
  );
}