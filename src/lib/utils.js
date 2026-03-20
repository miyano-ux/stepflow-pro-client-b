import axios from "axios";
import { GAS_URL } from "./constants";

// ==========================================
// 🗄️ customerStore - モジュールレベル共有ストア
// ==========================================
// Reactのルート遷移をまたいで生き続けるJSモジュール変数
// CustomerList ↔ KanbanBoard のゼロ遅延同期に使用
//
// 動作原理:
//   CustomerList が更新 → patch() でストアに書き込み
//   KanbanBoard がマウント → applyTo() でストアのパッチを即適用
//   KanbanBoard がマウント中 → subscribe() でリアルタイム受信
//   サーバー確定後 → clear() でパッチ解除（以降はサーバーデータを使用）

const _patches  = new Map();   // Map<id, partialCustomer>
const _listeners = new Set();  // Set<() => void>

export const customerStore = {
  /** フィールド単位のパッチを適用（楽観的更新） */
  patch(id, updates) {
    const prev = _patches.get(String(id)) || {};
    _patches.set(String(id), { ...prev, ...updates });
    _listeners.forEach(fn => fn());
  },

  /** customers 配列にストアのパッチを上書き適用して返す */
  applyTo(customers) {
    if (_patches.size === 0) return customers;
    return customers.map(c => {
      const p = _patches.get(String(c.id));
      return p ? { ...c, ...p } : c;
    });
  },

  /** サーバー確定後にパッチをクリア */
  clear(id) {
    _patches.delete(String(id));
    _listeners.forEach(fn => fn());
  },

  /** マウント中のコンポーネントがリアルタイム更新を受け取るための購読 */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

// ==========================================
// 🛠️ ヘルパー関数
// ==========================================

/**
 * 日付を "YYYY/MM/DD HH:mm" 形式にフォーマットする
 */
export const formatDate = (v) => {
  if (!v || v === "-" || v === "undefined") return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * 電話番号を正規化する（余分な記号除去・先頭ゼロ補完）
 */
export const smartNormalizePhone = (phone) => {
  if (!phone) return "";
  let p = String(phone).replace(/[="]/g, "").replace(/[^\d]/g, "");
  if (p.length === 10 && /^[1-9]/.test(p)) p = "0" + p;
  return p;
};

/**
 * 電話番号をSMS送信用の国際形式に変換する（先頭0を81に置換）
 * 例: 09012345678 → 819012345678
 */
export const formatPhoneForSms = (phone) => {
  const normalized = smartNormalizePhone(phone);
  if (!normalized) return "";
  if (normalized.startsWith("81")) return normalized;
  return "81" + (normalized.startsWith("0") ? normalized.slice(1) : normalized);
};

/**
 * シナリオのステップから配信スケジュールの日時リストを計算する
 * GAS側での日時計算を廃止し、React側で計算してGASに渡す
 * @param {Array} steps - シナリオのステップ配列（GASから返る形式）
 * @param {Date} baseDate - 基準日時（デフォルト: 現在時刻）
 * @returns {Array} - { elapsedDays, deliveryHour, message, scheduledAt } の配列
 */
export const calcScheduleDates = (steps, baseDate = new Date()) => {
  return steps.map((st) => {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + Number(st["経過日数"] ?? st.elapsedDays ?? 0));
    d.setHours(Number(st["配信時間"] ?? st.deliveryHour ?? 10), 0, 0, 0);
    return {
      ...st,
      scheduledAt: d.toISOString(),
    };
  });
};

/**
 * 日付文字列 "YYYY-MM-DD" をローカルタイムのタイムスタンプに変換する
 * @param {boolean} isEnd - true の場合は23:59:59.999に設定
 */
export const parseLocalDate = (dateStr, isEnd = false) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.getTime();
};

/**
 * GAS への POST リクエストを共通化する
 */
export const apiCall = {
  post: async (url, data) => {
    if (!url) throw new Error("GAS URLが設定されていません（VITE_GAS_URL を確認してください）");
    const body = JSON.stringify(data);
    console.log("[apiCall.post] action:", data?.action, "url:", url?.slice(0, 60));
    const res = await axios.post(url, body, {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    // GASが302リダイレクト→doGetを返す場合など、statusフィールドがない場合もエラー扱い
    const result = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    console.log("[apiCall.post] response:", result?.status, result?.message || "");
    if (!result || result.status !== "success") {
      throw new Error(result?.message || "GASからエラーレスポンスが返りました");
    }
    return result;
  },
};

/**
 * テンプレート文字列内の変数（{{姓}} 等）を顧客・担当者情報で置換する
 * @param {string} text - 置換対象のテンプレート文字列
 * @param {object} customer - 顧客データオブジェクト
 * @param {object|null} staff - 担当者データオブジェクト（任意）
 */
export const replaceVariables = (text, customer, staff = null) => {
  if (!text) return "";
  let res = text;

  // 顧客変数の置換 ({{姓}} など)
  Object.keys(customer || {}).forEach((key) => {
    res = res.replaceAll(`{{${key}}}`, customer[key] || "");
  });

  // 担当者変数の置換 ({{担当者姓}} など)
  if (staff) {
    res = res.replaceAll(`{{担当者姓}}`, staff.lastName || "");
    res = res.replaceAll(`{{担当者名}}`, staff.firstName || "");
    res = res.replaceAll(`{{担当者メール}}`, staff.email || "");
    res = res.replaceAll(`{{担当者電話}}`, staff.phone || "");
  }

  return res;
};

/**
 * 2次元配列をCSVファイルとしてダウンロードする（BOM付きUTF-8）
 * @param {string[][]} rows - CSVの行データ（2次元配列）
 * @param {string} filename - ダウンロード時のファイル名
 */
export const downloadCSV = (rows, filename) => {
  const content = rows
    .map((row) =>
      row
        .map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
};