import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  UserPlus, Mail, Edit3, Trash2, Loader2,
  Phone, UserCircle, RefreshCw, Users, Plus, X, ChevronDown, ChevronUp
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";

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

// ── グループカード ─────────────────────────────────────────────
function GroupCard({ group, staffList, onSave, onDelete }) {
  const [open,        setOpen]        = useState(false);
  const [name,        setName]        = useState(group.name);
  const [members,     setMembers]     = useState(group.members);
  const [saving,      setSaving]      = useState(false);
  const [savedLabel,  setSavedLabel]  = useState(null); // 楽観的表示用

  const toggle = (email) =>
    setMembers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );

  const handleSave = async () => {
    if (!name.trim()) return alert("グループ名を入力してください");
    setSaving(true);
    // 楽観的更新：即座にヘッダーに反映
    setSavedLabel({ name: name.trim(), members: [...members] });
    try {
      await onSave({ groupId: group.groupId, name: name.trim(), members });
      setOpen(false); // 保存完了でパネルを閉じる
    } catch {
      setSavedLabel(null); // 失敗時は戻す
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
  );
}

// ── メインコンポーネント ────────────────────────────────────────
export default function UserManager({
  staffList = [], groups: groupsProp = [], statuses = [],
  onRefreshStaff, onRefresh, masterUrl, gasUrl, companyName = "B社",
}) {
  const navigate = useNavigate();
  const [refreshing,      setRefreshing]      = useState(false);
  const [addingGroup,     setAddingGroup]      = useState(false);
  const [newGroupName,    setNewGroupName]     = useState("");
  const [newGroupMembers, setNewGroupMembers]  = useState([]);

  // グループをローカルstateで管理して即時反映
  const [localGroups, setLocalGroups] = useState(groupsProp);

  // propsが変わったとき（初回ロード・外部更新）だけ同期
  React.useEffect(() => { setLocalGroups(groupsProp); }, [groupsProp]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefreshStaff(); } finally { setRefreshing(false); }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm("このユーザーを完全に削除しますか？")) return;
    try {
      const res = await axios.post(
        masterUrl,
        JSON.stringify({ action: "deleteUser", email, company: companyName }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      if (res.data.status === "success") await onRefreshStaff();
      else alert("失敗: " + res.data.message);
    } catch { alert("通信エラーが発生しました"); }
  };

  // グループ保存（楽観的更新：即座にローカルに反映 → バックグラウンドでGAS保存）
  const handleSaveGroup = async ({ groupId, name, members }) => {
    // 即時反映
    setLocalGroups(prev => prev.map(g =>
      g["グループID"] === groupId
        ? { ...g, "グループ名": name, "メンバーメール": members.join(",") }
        : g
    ));
    try {
      const res = await axios.post(GAS_URL, JSON.stringify({ action: "saveGroup", groupId, name, members }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      if (res.data?.status === "error") {
        alert("エラー: " + (res.data.message || "保存に失敗しました"));
        if (onRefresh) onRefresh(); // 失敗時は正確なデータを再取得
      } else {
        onRefresh?.(); // バックグラウンドで同期（awaitしない）
      }
    } catch(e) {
      alert("通信エラー: " + (e?.message || "不明なエラー"));
      if (onRefresh) onRefresh();
    }
  };

  // グループ新規作成
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return alert("グループ名を入力してください");
    const groupId = "g_" + Date.now();
    const newGroup = {
      "グループID": groupId,
      "グループ名": newGroupName.trim(),
      "メンバーメール": newGroupMembers.join(","),
    };
    // 即時反映
    setLocalGroups(prev => [...prev, newGroup]);
    setNewGroupName("");
    setNewGroupMembers([]);
    setAddingGroup(false);
    try {
      const res = await axios.post(GAS_URL, JSON.stringify({ action: "saveGroup", groupId, name: newGroupName.trim(), members: newGroupMembers }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      if (res.data?.status === "error") {
        alert("エラー: " + (res.data.message || "保存に失敗しました"));
        setLocalGroups(prev => prev.filter(g => g["グループID"] !== groupId));
      } else {
        onRefresh?.();
      }
    } catch(e) {
      alert("通信エラー: " + (e?.message || "不明なエラー"));
      setLocalGroups(prev => prev.filter(g => g["グループID"] !== groupId));
    }
  };

  // グループ削除
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("このグループを削除しますか？")) return;
    // 即時反映
    const removed = localGroups.find(g => g["グループID"] === groupId);
    setLocalGroups(prev => prev.filter(g => g["グループID"] !== groupId));
    try {
      await axios.post(GAS_URL, JSON.stringify({ action: "deleteGroup", groupId }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      onRefresh?.();
    } catch(e) {
      alert("通信エラー: " + (e?.message || "不明なエラー"));
      // 失敗時は元に戻す
      if (removed) setLocalGroups(prev => [...prev, removed]);
    }
  };

  return (
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
  );
}