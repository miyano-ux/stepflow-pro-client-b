import axios from "axios";
import { GAS_URL } from "./constants";

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
    const res = await axios.post(url, data, {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    if (res.data.status !== "success") throw new Error(res.data.message);
    return res.data;
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