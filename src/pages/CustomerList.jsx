import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Search, SlidersHorizontal, Download, Send, Clock, 
  Trash2, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronDown, Loader2, UserCircle
} from "lucide-react";

// --- テーマ・共通スタイル定義 (V34.0) ---
const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", 
  textMuted: "#64748B", border: "#E2E8F0", success: "#10B981", danger: "#EF4444"
};

const styles = {
  main: { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)", marginBottom: "32px", border: `1px solid ${THEME.border}` },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", fontWeight: "800", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}`, textAlign: "left" },
  tableTd: { padding: "18px 24px", fontSize: "14px", color: THEME.textMain, borderBottom: `1px solid ${THEME.border}`, verticalAlign: "middle" },
  input: { border: `1px solid ${THEME.border}`, borderRadius: "12px", padding: "10px 16px", outline: "none", fontSize: "14px", transition: "0.2s" },
  badge: { padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }
};

export default function CustomerList({ customers = [], displaySettings = [], formSettings = [], scenarios = [], statuses = [], masterUrl, gasUrl, companyName, onRefresh }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({});
  const [sort, setSort] = useState({ key: "登録日", dir: "desc" });
  const [staffList, setStaffList] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [syncingCount, setSyncingCount] = useState(0); // 🆕 V34.0 同期ガード

  // 1. 同期ガード: 通信中は親からの更新を遮断
  useEffect(() => {
    if (syncingCount === 0) setLocalCustomers(customers);
  }, [customers, syncingCount]);

  // 2. 担当者リスト取得
  useEffect(() => {
    const fetchStaff = async () => {
      if (!masterUrl) return;
      try {
        const res = await axios.get(`${masterUrl}?action=list&company=${companyName}`);
        setStaffList(res?.data?.users || []);
      } catch(e) { console.error("スタッフ取得エラー", e); }
    };
    fetchStaff();
  }, [masterUrl, companyName]);

  // 3. 🆕 カラムの重複解消 (image_d3771c 対策)
  const vCols = useMemo(() => {
    // 表示設定から名前を抽出して重複を削除（Setを使用）
    const names = displaySettings?.length > 0 ? displaySettings.filter(i => i.visible).map(i => i.name) : ["姓", "名", "対応ステータス", "担当者メール", "電話番号", "登録日"];
    const uniqueCols = Array.from(new Set(names));
    
    // 必須項目の担保
    if (!uniqueCols.includes("対応ステータス")) uniqueCols.splice(2, 0, "対応ステータス");
    if (!uniqueCols.includes("担当者メール")) uniqueCols.splice(3, 0, "担当者メール");
    return uniqueCols;
  }, [displaySettings]);

  const sCols = useMemo(() => {
    const names = displaySettings?.length > 0 ? displaySettings.filter(i => i.searchable).map(i => i.name) : ["姓", "シナリオID", "登録日"];
    return Array.from(new Set(names));
  }, [displaySettings]);

  // 4. フィルタリング & ソート
  const filtered = useMemo(() => {
    let res = [...(localCustomers || [])].filter(c => Object.keys(search).every(k => {
      const q = search[k]; if (!q || q === "") return true;
      return String(c[k] || "").toLowerCase().includes(String(q).toLowerCase());
    }));
    if (sort.key) {
      res.sort((a, b) => {
        const aV = a[sort.key] || "", bV = b[sort.key] || "";
        return sort.dir === "asc" ? String(aV).localeCompare(String(bV), "ja") : String(bV).localeCompare(String(aV), "ja");
      });
    }
    return res;
  }, [localCustomers, search, sort]);

  // 5. ステータス・担当者更新
  const handleExecuteChange = async () => {
    const { customer, field, newValue } = confirmModal;
    setConfirmModal({ open: false, customer: null, field: "", newValue: "", oldValue: "" });

    // 楽観的更新
    setLocalCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, [field]: newValue } : c));
    setSyncingCount(prev => prev + 1);

    try {
      const payload = { action: "update", id: customer.id, data: { ...customer, [field]: newValue } };
      await axios.post(gasUrl, JSON.stringify(payload), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      
      setTimeout(() => {
        onRefresh();
        setSyncingCount(prev => Math.max(0, prev - 1));
      }, 1500);
    } catch (e) {
      alert("更新に失敗しました");
      setSyncingCount(prev => Math.max(0, prev - 1));
      onRefresh();
    }
  };

  return (
    <div style={styles.main}>
      <div style={styles.wrapper}>
        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>顧客ダッシュボード</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <p style={{ color: THEME.textMuted, fontSize: "14px", margin: 0 }}>全 {filtered.length} 名をリスト表示中</p>
              {syncingCount > 0 && <span style={{ color: THEME.primary, fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", gap: 4 }}><Loader2 size={12} className="animate-spin" /> 同期中...</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => navigate("/column-settings")} style={{ ...styles.input, backgroundColor: "white", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", cursor: "pointer" }}>
              <SlidersHorizontal size={16} /> 表示設定
            </button>
            <button style={{ ...styles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={16} /> CSV出力
            </button>
          </div>
        </header>

        {/* 検索パネル */}
        <div style={styles.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
            {sCols.map(col => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: 14, color: "#94A3B8" }} />
                  <input 
                    placeholder={`${col}で検索...`} 
                    style={{ ...styles.input, paddingLeft: 38, width: "100%" }} 
                    value={search[col] || ""} 
                    onChange={e => setSearch({...search, [col]: e.target.value})} 
                  />
                </div>
              </div>
            ))}
            <div style={{ alignSelf: "flex-end" }}>
              <button onClick={() => setSearch({})} style={{ background: "none", border: "none", color: THEME.primary, fontWeight: "900", cursor: "pointer" }}>条件クリア</button>
            </div>
          </div>
        </div>

        {/* テーブルエリア */}
        <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {vCols.map(c => (
                    <th key={c} style={styles.tableTh} onClick={() => setSort({ key: c, dir: sort.dir === "asc" ? "desc" : "asc" })}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        {c} <ArrowUpDown size={12} opacity={0.3} />
                      </div>
                    </th>
                  ))}
                  <th style={{ ...styles.tableTh, position: "sticky", right: 0, backgroundColor: "#F8FAFC", textAlign: "center", borderLeft: `1px solid ${THEME.border}`, zIndex: 10 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "white"}>
                    {vCols.map(col => (
                      <td key={col} style={styles.tableTd}>
                        {col === "対応ステータス" ? (
                          <div style={{ position: "relative" }}>
                            <select 
                              style={{ ...styles.input, padding: "4px 30px 4px 12px", backgroundColor: "#EEF2FF", border: "none", fontWeight: "800", color: THEME.primary, appearance: "none" }}
                              value={c[col] || "未対応"}
                              onChange={e => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] })}
                            >
                              {statuses.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                            </select>
                            <ChevronDown size={14} style={{ position: "absolute", right: 10, top: 10, pointerEvents: "none" }} />
                          </div>
                        ) : col === "担当者メール" ? (
                          <select 
                            style={{ ...styles.input, padding: "4px 8px", fontSize: "12px", border: "none", backgroundColor: "#F1F5F9" }}
                            value={c[col] || ""}
                            onChange={e => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] })}
                          >
                            <option value="">未割当</option>
                            {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
                          </select>
                        ) : c[col]}
                      </td>
                    ))}
                    <td style={{ ...styles.tableTd, position: "sticky", right: 0, backgroundColor: "white", borderLeft: `1px solid ${THEME.border}`, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <Link to={`/direct-sms/${c.id}`} style={{ padding: "8px", color: THEME.primary, backgroundColor: "#EEF2FF", borderRadius: "8px" }}><Send size={16}/></Link>
                        <Link to={`/schedule/${c.id}`} style={{ padding: "8px", color: THEME.textMuted, backgroundColor: "#F1F5F9", borderRadius: "8px" }}><Clock size={16}/></Link>
                        <button style={{ border: "none", background: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 確認モーダル (V34.0) */}
      {confirmModal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ ...styles.card, width: "400px", textAlign: "center", marginBottom: 0 }}>
            <div style={{ backgroundColor: "#EEF2FF", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <AlertCircle size={32} color={THEME.primary} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>変更を確定しますか？</h3>
            <p style={{ fontSize: "14px", color: THEME.textMuted, marginBottom: 32 }}>
              {confirmModal.customer?.姓}様の「{confirmModal.field}」を更新します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={handleExecuteChange} style={{ ...styles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "800", height: 48 }}>実行する</button>
              <button onClick={() => setConfirmModal({ open: false })} style={{ ...styles.input, border: "none", color: THEME.textMuted, fontWeight: "800" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}