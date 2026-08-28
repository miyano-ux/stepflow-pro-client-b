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
 *
 * 【A2-040】表記揺れ対応を拡張（gas_updated.js の smartNormalizePhone と同一ロジック。
 *   どちらかを直したら両方直すこと）。
 *   ① 全角数字 → 半角に変換してから非数字を除去（従来は全角数字が全桁除去され空文字になっていた）
 *   ② 国際表記（+81/81始まり・11〜12桁）→ 国内0始まりに変換
 *      （国内番号は正規化後必ず0始まりのため、0始まりの番号を誤変換することはない）
 *   ③ 先頭0欠落の10桁 → 0補完（従来どおり）
 */
export const smartNormalizePhone = (phone) => {
  if (!phone) return "";
  let p = String(phone)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^\d]/g, "");
  if (/^81[1-9]\d{8,9}$/.test(p)) p = "0" + p.slice(2);
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
  // opts.retry: true/false でリトライ可否を明示指定可能。未指定なら action が get* の
  //             読み取り系だけ自動リトライ対象になる（更新系POSTの二重実行を防ぐため）。
  post: async (url, data, opts = {}) => {
    if (!url) throw new Error("GAS URLが設定されていません（VITE_GAS_URL を確認してください）");
    const body = JSON.stringify(data);
    const action = data?.action || "";
    // GAS WebアプリのPOSTは 302 → script.googleusercontent.com/.../echo の一時URLへ
    // リダイレクトされるが、この一時URLがまれに 404（「ページが見つかりません」HTML）を
    // 返す既知の事象がある。読み取り系（get*）は冪等なので数回だけ再試行して自己回復させる。
    const retryable   = opts.retry != null ? opts.retry : /^get/i.test(action);
    const maxAttempts = retryable ? 3 : 1;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log("[apiCall.post] action:", action, `(試行 ${attempt}/${maxAttempts})`, "url:", url?.slice(0, 60));
        const res = await axios.post(url, body, {
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
        // 一時URLの404はHTML文字列で返るため、JSON.parse 失敗 or status≠success を失敗扱いにする
        const result = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        if (!result || result.status !== "success") {
          throw new Error(result?.message || "GASからエラーレスポンスが返りました");
        }
        console.log("[apiCall.post] response:", result?.status, result?.message || "");
        return result;
      } catch (e) {
        lastErr = e;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 400 * attempt)); // 0.4s, 0.8s の指数バックオフ
          continue;
        }
      }
    }
    console.warn("[apiCall.post] リトライ上限に到達:", action, lastErr?.message || lastErr);
    throw lastErr;
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

/**
 * SMS本文 → 送信通数（課金通数）を算出する
 *
 * SMSは本文の文字種で符号化方式が変わり、1通あたりの上限文字数が異なる。
 *   - 半角英数字のみ（GSM-7）: 1通=160文字 / 2通以上は153文字ごと
 *   - 全角を含む（UCS-2）    : 1通=70文字  / 2通以上は67文字ごと
 *
 * 料金レンジ表との対応（全角）:
 *   1〜70=1通 / 71〜134=2通 / 135〜201=3通 / 202〜268=4通 / 269〜335=5通 ...
 * 料金レンジ表との対応（半角英数字）:
 *   1〜160=1通 / 161〜306=2通 / 307〜459=3通 / 460〜612=4通 / 613〜765=5通 ...
 *
 * ※ gas_updated.js / license_gas.js の smsUnits_() と同一ロジック。
 *    どれかを直したら全て直すこと。
 *
 * @param {string} text SMS本文
 * @returns {number} 送信通数
 */
const GSM7_BASIC = "@\u00a3$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !\"#\u00a4%&'()*+,-./0123456789:;<=>?\u00a1ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00c4\u00d6\u00d1\u00dc\u00a7\u00bf abcdefghijklmnopqrstuvwxyz\u00e4\u00f6\u00f1\u00fc\u00e0";
// 拡張文字は2文字分としてカウントされる
const GSM7_EXT = "^{}\\[~]|\u20ac";

export const smsUnits = (text) => {
  // 送信時に CRLF→LF へ正規化するため、通数計算も同じ文字列で行う
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  if (!s) return 1; // 配信済みレコードは最低1通として扱う

  // ① GSM-7（半角英数字のみ）で送れるか判定しつつ、拡張文字は2文字で数える
  let isGsm7 = true;
  let gsmLen = 0;
  for (const ch of s) {
    if (GSM7_BASIC.indexOf(ch) >= 0)     gsmLen += 1;
    else if (GSM7_EXT.indexOf(ch) >= 0)  gsmLen += 2;
    else { isGsm7 = false; break; }
  }
  if (isGsm7) return gsmLen <= 160 ? 1 : Math.ceil(gsmLen / 153);

  // ② 全角を含む場合は UCS-2。JSのlengthはUTF-16符号単位数なので
  //    絵文字（サロゲートペア）が2文字分になる挙動もSMS仕様と一致する。
  const len = s.length;
  return len <= 70 ? 1 : Math.ceil(len / 67);
};