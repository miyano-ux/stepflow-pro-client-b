import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search, SlidersHorizontal, Download, Send, Clock,
  Trash2, AlertCircle, ArrowUpDown, ChevronDown, Loader2,
} from "lucide-react";
import { THEME } from "../lib/constants";
import { parseLocalDate } from "../lib/utils";
import DateRangePicker from "../components/DateRangePicker";

// ==========================================
// 📋 CustomerList - 顧客ダッシュボード
// ==========================================

// 日付を "YYYY/MM/DD HH:mm" 形式に変換
const formatDateJP = (v) => {
  if (!v || v === "-") return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 既知の日付フィールド
const KNOWN_DATE_FIELDS = ["登録日", "更新日", "完了日時", "配信予定日時"];

// フィールドの種別を判定
const getFieldType = (colName, formSettings = []) => {
  if (KNOWN_DATE_FIELDS.includes(colName)) return "date";
  const f = formSettings.find((s) => s.name === colName);
  return f?.type || "text";
};

const localStyles = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  card:    { backgroundColor: THEME.card, borderRadius: "20px", padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)", marginBottom: "32px", border: `1px solid ${THEME.border}` },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", fontWeight: "800", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}`, textAlign: "left" },
  tableTd: { padding: "18px 24px", fontSize: "14px", color: THEME.textMain, borderBottom: `1px solid ${THEME.border}`, verticalAlign: "middle" },
  input:   { border: `1px solid ${THEME.border}`, borderRadius: "12px", padding: "10px 16px", outline: "none", fontSize: "14px", transition: "0.2s", backgroundColor: "white" },
};

export default function CustomerList({
  customers = [], displaySettings = [], formSettings = [],
  scenarios = [], statuses = [], staffList = [], gasUrl, onRefresh,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState({});
  const [dateRange, setDateRange] = useState({});
  const [sort, setSort] = useState({ key: "登録日", dir: "desc" });

  const [confirmModal, setConfirmModal] = useState({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [syncingCount, setSyncingCount] = useState(0);

  useEffect(() => {
    if (syncingCount === 0) setLocalCustomers(customers);
  }, [customers, syncingCount]);



  const vCols = useMemo(() => {
    const names = displaySettings?.length > 0
      ? displaySettings.filter((i) => i.visible).map((i) => i.name)
      : ["姓", "名", "対応ステータス", "担当者メール", "電話番号", "登録日"];
    const unique = Array.from(new Set(names));
    if (!unique.includes("対応ステータス")) unique.splice(2, 0, "対応ステータス");
    if (!unique.includes("担当者メール"))   unique.splice(3, 0, "担当者メール");
    return unique;
  }, [displaySettings]);

  const sCols = useMemo(() => {
    const names = displaySettings?.length > 0
      ? displaySettings.filter((i) => i.searchable).map((i) => i.name)
      : ["姓", "シナリオID", "登録日"];
    return Array.from(new Set(names));
  }, [displaySettings]);

  const filtered = useMemo(() => {
    let res = [...(localCustomers || [])].filter((c) => {
      const textMatch = Object.keys(search).every((k) => {
        const q = search[k];
        if (!q) return true;
        return String(c[k] || "").toLowerCase().includes(String(q).toLowerCase());
      });
      const dateMatch = Object.keys(dateRange).every((k) => {
        const range = dateRange[k];
        if (!range?.start && !range?.end) return true;
        const ts = new Date(c[k]).getTime();
        if (isNaN(ts)) return true;
        const from = parseLocalDate(range.start, false);
        const to   = parseLocalDate(range.end, true);
        if (from && ts < from) return false;
        if (to   && ts > to)   return false;
        return true;
      });
      return textMatch && dateMatch;
    });
    if (sort.key) {
      res.sort((a, b) => {
        const aV = a[sort.key] || "", bV = b[sort.key] || "";
        return sort.dir === "asc"
          ? String(aV).localeCompare(String(bV), "ja")
          : String(bV).localeCompare(String(aV), "ja");
      });
    }
    return res;
  }, [localCustomers, search, dateRange, sort]);

  const handleExecuteChange = async () => {
    const { customer, field, newValue } = confirmModal;
    setConfirmModal({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
    setLocalCustomers((prev) => prev.map((c) => c.id === customer.id ? { ...c, [field]: newValue } : c));
    setSyncingCount((p) => p + 1);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "update", id: customer.id, data: { ...customer, [field]: newValue } }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      setTimeout(() => { onRefresh(); setSyncingCount((p) => Math.max(0, p - 1)); }, 1500);
    } catch {
      alert("更新に失敗しました");
      setSyncingCount((p) => Math.max(0, p - 1));
      onRefresh();
    }
  };

  // 検索フィールドを種別に応じてレンダリング
  const renderSearchField = (col) => {
    const type = getFieldType(col, formSettings);

    // 対応ステータス → status-settings の選択肢
    if (col === "対応ステータス") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>対応ステータス</label>
          <select
            style={{ ...localStyles.input, width: "100%", color: search[col] ? THEME.textMain : THEME.textMuted }}
            value={search[col] || ""}
            onChange={(e) => setSearch({ ...search, [col]: e.target.value })}
          >
            <option value="">すべて</option>
            {statuses.map((st) => (
              <option key={st.name} value={st.name}>{st.name}</option>
            ))}
          </select>
        </div>
      );
    }

    // 担当者メール → users の担当者名一覧
    if (col === "担当者メール") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>担当者</label>
          <select
            style={{ ...localStyles.input, width: "100%", color: search[col] ? THEME.textMain : THEME.textMuted }}
            value={search[col] || ""}
            onChange={(e) => setSearch({ ...search, [col]: e.target.value })}
          >
            <option value="">すべて</option>
            {staffList.map((s) => (
              <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
            ))}
          </select>
        </div>
      );
    }

    if (type === "date") {
      return (
        <DateRangePicker
          label={col}
          value={dateRange[col] || {}}
          onChange={(v) => setDateRange({ ...dateRange, [col]: v })}
        />
      );
    }

    if (type === "dropdown") {
      const f = formSettings.find((s) => s.name === col);
      const opts = f?.options ? f.options.split(",").map((o) => o.trim()).filter(Boolean) : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
          <select
            style={{ ...localStyles.input, width: "100%", color: search[col] ? THEME.textMain : THEME.textMuted }}
            value={search[col] || ""}
            onChange={(e) => setSearch({ ...search, [col]: e.target.value })}
          >
            <option value="">すべて</option>
            {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "#94A3B8" }} />
          <input
            placeholder={`${col}で検索...`}
            style={{ ...localStyles.input, paddingLeft: 38, width: "100%", boxSizing: "border-box" }}
            value={search[col] || ""}
            onChange={(e) => setSearch({ ...search, [col]: e.target.value })}
          />
        </div>
      </div>
    );
  };

  // テーブルセルをレンダリング
  const renderCell = (c, col) => {
    if (col === "対応ステータス") {
      return (
        <div style={{ position: "relative" }}>
          <select
            style={{ ...localStyles.input, padding: "4px 30px 4px 12px", backgroundColor: "#EEF2FF", border: "none", fontWeight: "800", color: THEME.primary, appearance: "none" }}
            value={c[col] || "未対応"}
            onChange={(e) => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] })}
          >
            {statuses.map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: "absolute", right: 10, top: 10, pointerEvents: "none" }} />
        </div>
      );
    }
    if (col === "担当者メール") {
      const staff = staffList.find((s) => s.email === c[col]);
      const staffName = staff ? `${staff.lastName} ${staff.firstName}` : "";
      return (
        <div style={{ position: "relative" }}>
          <select
            style={{ ...localStyles.input, padding: "4px 30px 4px 12px", fontSize: "13px", border: "none", backgroundColor: "#F1F5F9", appearance: "none", color: staffName ? THEME.textMain : THEME.textMuted }}
            value={c[col] || ""}
            onChange={(e) => setConfirmModal({ open: true, customer: c, field: col, newValue: e.target.value, oldValue: c[col] })}
          >
            <option value="">未割当</option>
            {staffList.map((s) => (
              <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>
            ))}
          </select>
          <ChevronDown size={13} style={{ position: "absolute", right: 8, top: 10, pointerEvents: "none", color: THEME.textMuted }} />
        </div>
      );
    }
    // 日付フィールドは人が読める形式に変換
    const type = getFieldType(col, formSettings);
    if (type === "date" || KNOWN_DATE_FIELDS.includes(col)) {
      return <span style={{ color: THEME.textMuted, fontSize: 13 }}>{formatDateJP(c[col])}</span>;
    }
    return c[col] || "-";
  };

  return (
    <div style={localStyles.main}>
      <div style={localStyles.wrapper}>

        <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>顧客ダッシュボード</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <p style={{ color: THEME.textMuted, fontSize: "14px", margin: 0 }}>全 {filtered.length} 名をリスト表示中</p>
              {syncingCount > 0 && (
                <span style={{ color: THEME.primary, fontSize: "12px", fontWeight: "800", display: "flex", alignItems: "center", gap: 4 }}>
                  <Loader2 size={12} className="animate-spin" /> 同期中...
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => navigate("/column-settings")} style={{ ...localStyles.input, display: "flex", alignItems: "center", gap: 8, fontWeight: "800", cursor: "pointer" }}>
              <SlidersHorizontal size={16} /> 表示設定
            </button>
            <button style={{ ...localStyles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={16} /> CSV出力
            </button>
          </div>
        </header>

        {/* 検索パネル */}
        <div style={localStyles.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", alignItems: "end" }}>
            {sCols.map((col) => (
              <div key={col}>{renderSearchField(col)}</div>
            ))}
            <div>
              <button
                onClick={() => { setSearch({}); setDateRange({}); }}
                style={{ background: "none", border: "none", color: THEME.primary, fontWeight: "900", cursor: "pointer", fontSize: 14 }}
              >
                条件クリア
              </button>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div style={{ ...localStyles.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {vCols.map((col) => (
                    <th
                      key={col}
                      style={localStyles.tableTh}
                      onClick={() => setSort({ key: col, dir: sort.key === col && sort.dir === "asc" ? "desc" : "asc" })}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                        {col}
                        <ArrowUpDown size={12} opacity={sort.key === col ? 1 : 0.3} color={sort.key === col ? THEME.primary : undefined} />
                      </div>
                    </th>
                  ))}
                  <th style={{ ...localStyles.tableTh, position: "sticky", right: 0, backgroundColor: "#F8FAFC", textAlign: "center", borderLeft: `1px solid ${THEME.border}`, zIndex: 10 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    style={{ transition: "0.15s" }}
                  >
                    {vCols.map((col) => (
                      <td key={col} style={localStyles.tableTd}>{renderCell(c, col)}</td>
                    ))}
                    <td style={{ ...localStyles.tableTd, position: "sticky", right: 0, backgroundColor: "white", borderLeft: `1px solid ${THEME.border}`, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <Link to={`/direct-sms/${c.id}`} style={{ padding: "8px", color: THEME.primary, backgroundColor: "#EEF2FF", borderRadius: "8px", display: "flex" }}><Send size={16} /></Link>
                        <Link to={`/schedule/${c.id}`}   style={{ padding: "8px", color: THEME.textMuted, backgroundColor: "#F1F5F9", borderRadius: "8px", display: "flex" }}><Clock size={16} /></Link>
                        <button style={{ border: "none", background: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={vCols.length + 1} style={{ ...localStyles.tableTd, textAlign: "center", padding: 48, color: THEME.textMuted }}>
                      該当する顧客が見つかりませんでした
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 確認モーダル */}
      {confirmModal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ ...localStyles.card, width: "400px", textAlign: "center", marginBottom: 0 }}>
            <div style={{ backgroundColor: "#EEF2FF", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <AlertCircle size={32} color={THEME.primary} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>変更を確定しますか？</h3>
            <p style={{ fontSize: "14px", color: THEME.textMuted, marginBottom: 32 }}>
              {confirmModal.customer?.姓}様の「{confirmModal.field}」を更新します。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={handleExecuteChange} style={{ ...localStyles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "800", height: 48, cursor: "pointer" }}>実行する</button>
              <button onClick={() => setConfirmModal({ open: false })} style={{ ...localStyles.input, border: "none", color: THEME.textMuted, fontWeight: "800", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}