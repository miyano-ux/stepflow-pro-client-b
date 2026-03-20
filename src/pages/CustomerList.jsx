import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Search, SlidersHorizontal, Download, Send,
  Trash2, AlertCircle, ArrowUpDown, ChevronDown, Loader2,
  UserRound, Check, ExternalLink,
} from "lucide-react";
import { THEME } from "../lib/constants";
import { parseLocalDate, downloadCSV, customerStore } from "../lib/utils";
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

// ── カスタムインラインドロップダウン（テーブルセル用） ──────────────
function InlineDropdown({ value, options, onChange, colorMap }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value) || options[0];
  const chipColor = colorMap?.[selected?.value];
  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
          width: "100%", border: `1px solid ${THEME.border}`, borderRadius: 8,
          padding: "8px 10px 8px 12px",
          backgroundColor: chipColor?.bg || "white",
          color: chipColor?.text || THEME.textMain,
          fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          boxSizing: "border-box",
        }}
      >
        {selected?.label}
        <ChevronDown size={13} style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "0.15s" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          backgroundColor: "white", borderRadius: 12, border: `1px solid ${THEME.border}`,
          boxShadow: "0 12px 28px rgba(0,0,0,0.12)", minWidth: 160, overflow: "hidden",
        }}>
          <div style={{ padding: 6 }}>
            {options.map((o) => {
              const c = colorMap?.[o.value];
              const isActive = o.value === value;
              return (
                <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", border: "none", borderRadius: 8, cursor: "pointer",
                    backgroundColor: isActive ? (c?.bg || "#EEF2FF") : "transparent",
                    color: isActive ? (c?.text || THEME.primary) : THEME.textMain,
                    fontWeight: isActive ? 900 : 700, fontSize: 13, textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {isActive && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


const SEL_WRAP = (theme, extra={}) => ({
  position: "relative", borderRadius: "12px",
  border: `1px solid ${theme.border}`, backgroundColor: "white",
  overflow: "hidden", display: "block", ...extra,
});
const SEL_INNER = (color) => ({
  width: "100%", padding: "12px 36px 12px 16px",
  border: "none", outline: "none", fontSize: "14px",
  backgroundColor: "transparent", appearance: "none",
  cursor: "pointer", boxSizing: "border-box",
  color: color || "inherit",
});
const SEL_ARROW = {
  position: "absolute", right: 10, top: "50%",
  transform: "translateY(-50%)", pointerEvents: "none",
};

const localStyles = {
  main:    { minHeight: "100vh", backgroundColor: THEME.bg },
  wrapper: { padding: "40px 64px", maxWidth: "1600px", margin: "0 auto" },
  card:    { backgroundColor: THEME.card, borderRadius: "20px", padding: "32px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.03)", marginBottom: "32px", border: `1px solid ${THEME.border}` },
  tableTh: { padding: "16px 24px", color: THEME.textMuted, fontSize: "12px", fontWeight: "800", backgroundColor: "#F8FAFC", borderBottom: `1px solid ${THEME.border}`, textAlign: "left" },
  tableTd: { padding: "18px 24px", fontSize: "14px", color: THEME.textMain, borderBottom: `1px solid ${THEME.border}`, verticalAlign: "middle" },
  input:   { border: `1px solid ${THEME.border}`, borderRadius: "12px", padding: "10px 16px", outline: "none", fontSize: "14px", transition: "0.2s", backgroundColor: "white" },
  select:  { border: `1px solid ${THEME.border}`, borderRadius: "12px", padding: "10px 36px 10px 16px", outline: "none", fontSize: "14px", transition: "0.2s", backgroundColor: "white", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6A8E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", cursor: "pointer" },
};

export default function CustomerList({
  customers = [], displaySettings = [], formSettings = [],
  scenarios = [], statuses = [], staffList = [], scenarioSettings = {}, sources = [], gasUrl, onRefresh, onLightRefresh,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState({});
  const [dateRange, setDateRange] = useState({});
  const [sort, setSort] = useState({ key: "登録日", dir: "desc" });

  const [confirmModal, setConfirmModal] = useState({ open: false, customer: null, field: "", newValue: "", oldValue: "" });
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [syncing, setSyncing] = useState(false);
  // KanbanBoard と同じ pendingMap パターン：更新中のIDとその値を記憶
  const pendingMap = useRef(new Map()); // Map<id, { field, value }>

  useEffect(() => {
    setLocalCustomers(prev => {
      // 親がローディング中で空を渡してきた場合はスキップ
      if (customers.length === 0 && prev.length > 0) return prev;
      return customers.map(c => {
        const pending = pendingMap.current.get(String(c.id));
        if (pending) return { ...c, [pending.field]: pending.value };
        return c;
      });
    });
  }, [customers]);

  // 新規登録直後: navigation state から楽観的データを受け取り即時先頭に追加
  // onRefresh()が完了してcustomersが更新されたら自動的に正式データに差し替わる
  useEffect(() => {
    const newCustomer = location.state?.newCustomer;
    if (!newCustomer) return;
    setLocalCustomers((prev) => {
      // すでに追加済みなら何もしない
      if (prev.some((c) => c.id === newCustomer.id)) return prev;
      return [newCustomer, ...prev];
    });
    // stateをクリア（ブラウザバックで再追加されないように）
    window.history.replaceState({}, "");
  }, [location.state]);



  const vCols = useMemo(() => {
    // displaySettings の visible な項目名セット
    const visibleSet = displaySettings?.length > 0
      ? new Set(displaySettings.filter((i) => i.visible).map((i) => i.name))
      : new Set(["姓", "名", "電話番号", "登録日", "対応ステータス", "担当者メール", "シナリオID"]);

    // カスタム項目キー（営業管理・デフォルト以外）
    const SALES_KEYS    = ["対応ステータス", "流入元", "担当者メール", "シナリオID"];
    const DEFAULT_KEYS  = ["姓", "名", "電話番号", "登録日", "メールアドレス"];
    const allFixed      = new Set([...SALES_KEYS, ...DEFAULT_KEYS]);
    const customKeys    = (formSettings || []).map(f => f.name).filter(k => !allFixed.has(k));

    // ① デフォルト列（姓・名 → 「氏名」仮想列に統合）
    const defaultCols = [];
    if (visibleSet.has("姓") || visibleSet.has("名")) defaultCols.push("氏名"); // 仮想列
    ["電話番号", "登録日", "メールアドレス"].forEach(k => {
      if (visibleSet.has(k)) defaultCols.push(k);
    });

    // ② 営業管理列（流入元は sources 登録時のみ）
    const salesCols = [];
    ["対応ステータス", "担当者メール", "シナリオID"].forEach(k => {
      if (visibleSet.has(k)) salesCols.push(k);
    });
    if (sources.length > 0 && visibleSet.has("流入元")) salesCols.push("流入元");

    // ③ カスタム列
    const customCols = customKeys.filter(k => visibleSet.has(k));

    return [...defaultCols, ...salesCols, ...customCols];
  }, [displaySettings, formSettings, sources]);

  const sCols = useMemo(() => {
    const SALES_KEYS   = ["対応ステータス", "流入元", "担当者メール", "シナリオID"];
    const DEFAULT_KEYS = ["姓", "名", "電話番号", "登録日", "メールアドレス"];
    const allFixed     = new Set([...SALES_KEYS, ...DEFAULT_KEYS]);
    const customKeys   = (formSettings || []).map(f => f.name).filter(k => !allFixed.has(k));

    const searchableSet = displaySettings?.length > 0
      ? new Set(displaySettings.filter((i) => i.searchable).map((i) => i.name))
      : new Set(["姓", "名", "対応ステータス", "担当者メール", "シナリオID", "登録日"]);

    // デフォルト列：姓または名が検索可なら「氏名」に統合
    const cols = [];
    if (searchableSet.has("姓") || searchableSet.has("名")) cols.push("氏名");
    ["電話番号", "登録日", "メールアドレス"].forEach(k => { if (searchableSet.has(k)) cols.push(k); });

    // 営業管理列
    ["対応ステータス", "担当者メール", "シナリオID"].forEach(k => { if (searchableSet.has(k)) cols.push(k); });
    if (sources.length > 0 && searchableSet.has("流入元")) cols.push("流入元");

    // カスタム列
    customKeys.forEach(k => { if (searchableSet.has(k)) cols.push(k); });

    return cols;
  }, [displaySettings, formSettings, sources]);

  const filtered = useMemo(() => {
    let res = [...(localCustomers || [])].filter((c) => {
      const textMatch = Object.keys(search).every((k) => {
        const q = search[k];
        if (!q) return true;
        // 「氏名」は姓・名の両方に対してマッチ
        if (k === "氏名") {
          const fullName = `${c["姓"] || ""} ${c["名"] || ""}`.toLowerCase();
          return fullName.includes(String(q).toLowerCase());
        }
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
        const getVal = (c, key) => key === "氏名" ? `${c["姓"] || ""}${c["名"] || ""}` : (c[key] || "");
        const aV = getVal(a, sort.key), bV = getVal(b, sort.key);
        return sort.dir === "asc"
          ? String(aV).localeCompare(String(bV), "ja")
          : String(bV).localeCompare(String(aV), "ja");
      });
    }
    return res;
  }, [localCustomers, search, dateRange, sort]);

  const handleExportCSV = () => {
    // ヘッダー行：仮想列「氏名」は「姓」「名」に展開
    const csvCols = vCols.flatMap((col) => col === "氏名" ? ["姓", "名"] : [col]);
    const header = csvCols.map((col) => {
      if (col === "担当者メール") return "担当者";
      if (col === "シナリオID") return "適用シナリオ";
      return col;
    });

    // 電話番号列を特定（固定の「電話番号」＋ formSettings で type=phone またはフィールド名に「電話」を含むもの）
    const phoneColNames = new Set(
      csvCols.filter((col) => {
        if (col === "電話番号") return true;
        const f = formSettings.find((s) => s.name === col);
        return f?.type === "phone" || col.includes("電話");
      })
    );

    const rows = filtered.map((c) =>
      csvCols.map((col) => {
        if (col === "担当者メール") {
          const staff = staffList.find((s) => s.email === c[col]);
          return staff ? `${staff.lastName} ${staff.firstName}` : c[col] || "";
        }
        const type = getFieldType(col, formSettings);
        if (type === "date" || KNOWN_DATE_FIELDS.includes(col)) {
          return formatDateJP(c[col]);
        }
        const val = c[col] != null ? String(c[col]) : "";
        // 電話番号はExcelのゼロ落ち防止のため ="090..." 形式で出力
        if (phoneColNames.has(col) && val) return `="${val}"`;
        return val;
      })
    );

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const filename = `顧客リスト_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    downloadCSV([header, ...rows], filename);
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`${c["姓"]} ${c["名"]}様を削除しますか？\nこの操作は取り消せません。`)) return;
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "delete", id: c.id }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      onRefresh();
    } catch { alert("削除に失敗しました"); }
  };

  const handleExecuteChange = async () => {
    const { customer, field, newValue } = confirmModal;
    const cid = String(customer.id);
    setConfirmModal({ open: false, customer: null, field: "", newValue: "", oldValue: "" });

    // ① ストアとローカル状態を同時に即時更新
    //    → KanbanBoard がマウント済みなら subscribe 経由で即反映
    //    → KanbanBoard が未マウントでもストアにパッチが残るため
    //      次回マウント時に applyTo() で正しい状態で表示される
    customerStore.patch(cid, { [field]: newValue });
    pendingMap.current.set(cid, { field, value: newValue });
    setSyncing(true);
    setLocalCustomers((prev) => prev.map((c) => String(c.id) === cid ? { ...c, [field]: newValue } : c));

    try {
      await axios.post(gasUrl, JSON.stringify({ action: "update", id: customer.id, data: { ...customer, [field]: newValue } }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      // サーバー確定後にパッチをクリア（以降はサーバーデータを使用）
      customerStore.clear(cid);
      if (onLightRefresh) onLightRefresh(); else onRefresh();
    } catch {
      // ロールバック
      customerStore.patch(cid, { [field]: customer[field] });
      pendingMap.current.delete(cid);
      setLocalCustomers((prev) => prev.map((c) => String(c.id) === cid ? { ...c, [field]: customer[field] } : c));
      alert("更新に失敗しました");
    } finally {
      pendingMap.current.delete(cid);
      setSyncing(false);
    }
  };

  // 検索フィールドを種別に応じてレンダリング
  const renderSearchField = (col) => {
    const type = getFieldType(col, formSettings);

    // 氏名 → 姓・名をまとめてテキスト検索
    if (col === "氏名") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>氏名</label>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: 13, color: "#94A3B8" }} />
            <input
              placeholder="氏名で検索..."
              style={{ ...localStyles.input, paddingLeft: 38, width: "100%", boxSizing: "border-box" }}
              value={search["氏名"] || ""}
              onChange={(e) => setSearch({ ...search, "氏名": e.target.value })}
            />
          </div>
        </div>
      );
    }

    // 対応ステータス → status-settings の選択肢
    if (col === "対応ステータス") {
      const opts = [{ value: "", label: "すべて" }, ...statuses.map(st => ({ value: st.name, label: st.name }))];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>対応ステータス</label>
          <InlineDropdown value={search[col] || ""} options={opts} onChange={(v) => setSearch({ ...search, [col]: v })} />
        </div>
      );
    }

    // 担当者メール → users の担当者名一覧
    if (col === "担当者メール") {
      const opts = [{ value: "", label: "すべて" }, ...staffList.map(s => ({ value: s.email, label: `${s.lastName} ${s.firstName}` }))];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>担当者</label>
          <InlineDropdown value={search[col] || ""} options={opts} onChange={(v) => setSearch({ ...search, [col]: v })} />
        </div>
      );
    }

    // 流入元 → sourcesの選択肢
    if (col === "流入元") {
      const opts = [{ value: "", label: "すべて" }, ...sources.map(s => ({ value: s.name, label: s.name }))];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>流入元</label>
          <InlineDropdown value={search[col] || ""} options={opts} onChange={(v) => setSearch({ ...search, [col]: v })} />
        </div>
      );
    }

    // シナリオID → プルダウン選択（「適用シナリオ」表示）
    if (col === "シナリオID") {
      const scenarioIds = [...new Set((scenarios || []).map(s => s["シナリオID"]).filter(Boolean))];
      const opts = [{ value: "", label: "すべて" }, ...scenarioIds.map(sid => ({ value: sid, label: sid }))];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>適用シナリオ</label>
          <InlineDropdown value={search[col] || ""} options={opts} onChange={(v) => setSearch({ ...search, [col]: v })} />
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
      const ddOpts = [{ value: "", label: "すべて" }, ...opts.map(o => ({ value: o, label: o }))];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "11px", fontWeight: "800", color: THEME.textMuted }}>{col}</label>
          <InlineDropdown value={search[col] || ""} options={ddOpts} onChange={(v) => setSearch({ ...search, [col]: v })} />
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
    // 氏名 → 姓・名を結合してテキストリンク
    if (col === "氏名") {
      const name = `${c["姓"] || ""} ${c["名"] || ""}`.trim() || "-";
      return (
        <Link
          to={`/detail/${c.id}`}
          style={{
            color: THEME.primary, fontWeight: 800, fontSize: 14,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
        >
          {name}
        </Link>
      );
    }
    if (col === "対応ステータス") {
      return (
        <InlineDropdown
          value={c[col] || "未対応"}
          options={statuses.map((st) => ({ value: st.name, label: st.name }))}
          onChange={(val) => setConfirmModal({ open: true, customer: c, field: col, newValue: val, oldValue: c[col] })}
          colorMap={Object.fromEntries(statuses.map((st, i) => [
            st.name,
            i === statuses.length - 3 ? { bg: "#DCFCE7", text: "#166534" }   // 成約
            : i === statuses.length - 2 ? { bg: "#FEF3C7", text: "#92400E" } // 休眠
            : i === statuses.length - 1 ? { bg: "#FEE2E2", text: "#991B1B" } // 失注
            : { bg: "#EEF2FF", text: THEME.primary },                         // 通常
          ]))}
        />
      );
    }
    if (col === "担当者メール") {
      return (
        <InlineDropdown
          value={c[col] || ""}
          options={[
            { value: "", label: "未割当" },
            ...staffList.map((s) => ({ value: s.email, label: `${s.lastName} ${s.firstName}` })),
          ]}
          onChange={(val) => setConfirmModal({ open: true, customer: c, field: col, newValue: val, oldValue: c[col] })}
        />
      );
    }
    // 流入元 → バッジ表示
    if (col === "流入元") {
      const val = c[col];
      if (!val) return <span style={{ color: THEME.textMuted, fontSize: 13 }}>－</span>;
      return (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 10px", borderRadius: 20,
          backgroundColor: "#EEF2FF", color: THEME.primary,
          fontSize: 12, fontWeight: 700,
        }}>
          {val}
        </span>
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
              {syncing && (
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
            <button onClick={handleExportCSV} style={{ ...localStyles.input, backgroundColor: THEME.primary, color: "white", border: "none", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
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
                        {col === "担当者メール" ? "担当者" : col === "シナリオID" ? "適用シナリオ" : col === "氏名" ? "氏名" : col}
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
                    onMouseEnter={(e) => { if (!c._optimistic) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                    onMouseLeave={(e) => { if (!c._optimistic) e.currentTarget.style.backgroundColor = c._optimistic ? "#F0FDF4" : "white"; }}
                    style={{
                      transition: "0.4s",
                      backgroundColor: c._optimistic ? "#F0FDF4" : "white",
                      outline: c._optimistic ? "2px solid #86EFAC" : "none",
                      outlineOffset: "-2px",
                    }}
                  >
                    {vCols.map((col) => (
                      <td key={col} style={localStyles.tableTd}>{renderCell(c, col)}</td>
                    ))}
                    <td style={{ ...localStyles.tableTd, position: "sticky", right: 0, backgroundColor: "white", borderLeft: `1px solid ${THEME.border}`, textAlign: "center", minWidth: 148 }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                        {/* 詳細 */}
                        <Link
                          to={`/detail/${c.id}`}
                          title="顧客詳細"
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", backgroundColor: "#EEF2FF", color: THEME.primary, borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          <ExternalLink size={14} /> 詳細
                        </Link>
                        {/* SMS */}
                        <Link
                          to={`/direct-sms/${c.id}`}
                          title="SMS配信"
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", backgroundColor: "#F0FDF4", color: "#16A34A", borderRadius: 8, fontWeight: 800, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          <Send size={14} /> SMS
                        </Link>
                        {/* 削除 */}
                        <button
                          title="削除"
                          onClick={() => handleDelete(c)}
                          style={{ display: "flex", alignItems: "center", padding: "6px 8px", backgroundColor: "#FEF2F2", color: THEME.danger, border: "none", borderRadius: 8, cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
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
      {confirmModal.open && (() => {
        const { customer, field, newValue, oldValue } = confirmModal;
        // 成約・休眠ステータスのラベルと適用シナリオを取得
        const wonLabel     = statuses[statuses.length - 3]?.name;
        const dormantLabel = statuses[statuses.length - 2]?.name;
        const isWon     = field === "対応ステータス" && newValue === wonLabel;
        const isDormant = field === "対応ステータス" && newValue === dormantLabel;
        const appliedScenarioId = isWon
          ? scenarioSettings?.wonScenarioId
          : isDormant
          ? scenarioSettings?.dormantScenarioId
          : null;
        const scenarioStepCount = appliedScenarioId
          ? scenarios.filter((s) => s["シナリオID"] === appliedScenarioId).length
          : 0;
        const accentColor = isWon ? "#16A34A" : isDormant ? "#D97706" : THEME.primary;
        const accentBg    = isWon ? "#DCFCE7"  : isDormant ? "#FEF3C7"  : "#EEF2FF";

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
            <div style={{ ...localStyles.card, width: 460, textAlign: "center", marginBottom: 0, padding: "40px 36px 32px" }}>

              {/* アイコン */}
              <div style={{ backgroundColor: accentBg, width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <AlertCircle size={32} color={accentColor} />
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6, color: THEME.textMain }}>変更を確定しますか？</h3>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 24 }}>
                {customer?.姓} {customer?.名} 様の「{field === "担当者メール" ? "担当者" : field}」を変更します
              </p>

              {/* 変更内容ボックス */}
              <div style={{ backgroundColor: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* 変更前 */}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: THEME.textMuted, marginBottom: 6, letterSpacing: "0.05em" }}>変更前</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.textMuted, backgroundColor: "white", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 12px" }}>
                      {field === "担当者メール"
                        ? (staffList.find(s => s.email === oldValue) ? `${staffList.find(s => s.email === oldValue).lastName} ${staffList.find(s => s.email === oldValue).firstName}` : "未割当")
                        : oldValue || "（未設定）"
                      }
                    </div>
                  </div>
                  {/* 矢印 */}
                  <div style={{ fontSize: 20, color: accentColor, fontWeight: 900, flexShrink: 0 }}>→</div>
                  {/* 変更後 */}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: accentColor, marginBottom: 6, letterSpacing: "0.05em" }}>変更後</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: accentColor, backgroundColor: accentBg, border: `1px solid ${accentColor}40`, borderRadius: 8, padding: "6px 12px" }}>
                      {field === "担当者メール"
                        ? (staffList.find(s => s.email === newValue) ? `${staffList.find(s => s.email === newValue).lastName} ${staffList.find(s => s.email === newValue).firstName}` : "未割当")
                        : newValue
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* 成約・休眠のシナリオ適用情報 */}
              {(isWon || isDormant) && (
                <div style={{ backgroundColor: appliedScenarioId ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${appliedScenarioId ? "#BBF7D0" : "#FDE68A"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: appliedScenarioId ? "#166534" : "#92400E", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    {appliedScenarioId ? "🚀 シナリオが自動適用されます" : "⚠️ 適用シナリオが未設定です"}
                  </div>
                  {appliedScenarioId ? (
                    <p style={{ fontSize: 13, color: "#166534", margin: 0 }}>
                      シナリオ <strong>「{appliedScenarioId}」</strong>（{scenarioStepCount} ステップ）の配信が自動で開始されます。
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: "#92400E", margin: 0 }}>
                      シナリオ管理からこのステータス用のシナリオを設定できます。
                    </p>
                  )}
                </div>
              )}

              {/* ボタン */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={handleExecuteChange}
                  style={{ backgroundColor: accentColor, color: "white", border: "none", borderRadius: 12, fontWeight: 900, height: 48, cursor: "pointer", fontSize: 15 }}
                >
                  確定する
                </button>
                <button
                  onClick={() => setConfirmModal({ open: false })}
                  style={{ background: "none", border: "none", color: THEME.textMuted, fontWeight: 800, cursor: "pointer", padding: "10px", fontSize: 14 }}
                >
                  キャンセル
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}