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
          // 【ストール対策】axios のデフォルト timeout は 0＝無制限。一時URL
          // （script.googleusercontent.com）は「即404」だけでなく「応答が返って
          // こないまま接続が開き続ける」形でも失敗することがあり、その場合
          // await が永遠に解決せずスピナーが止まらなくなる（リトライは catch に
          // 到達して初めて働くため、タイムアウトが無いと1回目で無限待機する）。
          // GAS 本体の処理は通常数秒〜十数秒で完了するため、実行時間に対して
          // 十分大きい60秒で打ち切る。タイムアウト時は ECONNABORTED として
          // throw され、下の transient マーキング → リトライ（retryable な
          // アクションのみ）→ 最終的に日本語メッセージ、の既存経路に乗る。
          timeout: 60000,
        });
        // 一時URLの404はHTML文字列で返るため、JSON.parse 失敗 or status≠success を失敗扱いにする。
        // 【安定化】失敗の種類を区別してエラーに印を付ける:
        //   ・transient  … 通信・一時URL404・HTML応答など「GASの処理結果が届かなかった」失敗
        //                  → リトライで自己回復しうる
        //   ・deliberate … GASが意図して返した status:"error"（stale_baseline / バリデーション等）
        //                  → リトライしても結果は変わらないため即座に呼び出し元へ返す
        //   併せて result.code / result 本体をエラーへ透過し、呼び出し側が
        //   e.code === "stale_baseline" のように文字列 includes に頼らず判定できるようにする。
        let result;
        if (typeof res.data === "string") {
          try {
            result = JSON.parse(res.data);
          } catch (parseErr) {
            const err = new Error(
              "GASの応答を受信できませんでした（一時URLの404等の既知事象）。通信状況を確認のうえ、もう一度お試しください。"
            );
            err.transient = true;
            throw err;
          }
        } else {
          result = res.data;
        }
        if (!result || typeof result !== "object" || result.status !== "success") {
          const err = new Error(
            result?.message || `GASからエラーレスポンスが返りました（action: ${action || "不明"}）`
          );
          err.code   = result?.code;
          err.result = result;
          // GASが明示的に返したエラーで、GAS自身が retryable:true を付けていないものは再試行しない
          err.deliberate = !!(result && result.status === "error" && result.retryable !== true);
          throw err;
        }
        console.log("[apiCall.post] response:", result?.status, result?.message || "");
        return result;
      } catch (e) {
        lastErr = e;
        if (e?.deliberate) throw e;   // GASの意図的なエラーは再試行せず即座に返す
        // 【安定化】一時URLの404が「200+HTML応答」ではなく「HTTPステータス404」として
        // 返る変種。axios がここで直接 throw するため従来は素通りし、英語の生メッセージ
        // （Request failed with status code 404）がそのままユーザーに表示されていた。
        // GAS本体の doPost はリダイレクト前に実行完了しているため、これは
        // 「処理は済んだが結果が届かなかった」だけの一時的失敗。transient として扱い、
        // メッセージを既知事象の説明に差し替える（retryable なアクションなら再試行で自己回復する）。
        if (e?.response || e?.request) {
          e.transient = true;
          e.message = "GASの応答を受信できませんでした（一時URLの404等の既知事象）。処理自体は完了している可能性があります。もう一度お試しください。";
        }
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
  // 【CSV数式インジェクション対策】先頭が = + - @ タブ CR のセルは、Excel等で
  //   数式として解釈されないようアポストロフィを前置する（OWASP推奨方式）。
  //   インポート側（CustomerForm.jsx handleUpload）が先頭アポストロフィを除去するため
  //   エクスポート→再インポートの往復でデータは変化しない。
  //   除外1: 電話番号のゼロ落ち対策で自前生成する ="0901..." 形式（数字のみ）は
  //          インジェクション不能な安全な式のため前置しない（CustomerList.jsx:459）。
  //   除外2: 単独の "-"（未設定日付の表示値 formatDateJP 由来）は無害のため前置しない。
  const sanitizeCell = (cell) => {
    const s = (cell ?? "").toString();
    if (/^="\d*"$/.test(s)) return s;
    if (s === "-") return s;
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  };
  const content = rows
    .map((row) =>
      row
        .map((cell) => `"${sanitizeCell(cell).replace(/"/g, '""')}"`)
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
 * 【SMS通数監査②】アクリート「SMSコネクト サービス説明書」（TA2306028）2.7 課金 の
 * 換算表に準拠:
 *   1〜70文字=1通 / 71〜132=2通 / 133〜198=3通 / 以降66文字ごとに+1通 /
 *   595〜660=10通（最大10通分まで）
 *   ・全角/半角の区別なし（課金表は文字数のみで規定。送信は常に text.long）
 *   ・文字数は UTF-16 符号単位（String.length）。絵文字（サロゲートペア）は2文字。
 *     API仕様書の上限チェック（Unicode 660文字）と同一基準。
 *   ・CRLF は送信時に LF へ正規化するため（API仕様書 注記*2）、通数計算も同じ文字列で行う
 *
 * 旧実装（全角67字区切り・半角英数のみは GSM-7 160/153区切り）は課金表と不一致
 * （66n＜文字数≦67n の帯、および半角のみ71〜160字で過少計上）だったため統一した。
 *
 * ※ gas_updated.js / license_gas.js の smsUnits_() と同一ロジック。
 *    どれかを直したら全て直すこと。
 *
 * @param {string} text SMS本文
 * @returns {number} 送信通数
 */
export const smsUnits = (text) => {
  // 送信時に CRLF→LF へ正規化するため、通数計算も同じ文字列で行う
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  if (!s) return 1; // 配信済みレコードは最低1通として扱う
  const len = s.length;
  if (len <= 70) return 1;
  return Math.min(10, Math.ceil(len / 66)); // サービス説明書 2.7: 最大10通分
};

/**
 * SMS本文 → 課金換算の文字数を返す（smsUnits と同じ正規化）。
 *
 * SMS配信レポートの明細「文字数」列で使う。CRLF を LF に正規化した後の
 * UTF-16 長で、課金換算表（1〜70=1通／71〜132=2通…）とそのまま突き合う値を返す。
 * 【SMS通数監査②】文字種の区別が課金表から無くなったため、GSM-7 の重み付けは廃止。
 * ※ ロジックを変えるときは smsUnits と必ずセットで見直すこと。
 *
 * @param {string} text SMS本文
 * @returns {number} 課金換算の文字数
 */
export const smsCharCount = (text) => {
  const s = String(text ?? "").replace(/\r\n/g, "\n");
  return s.length;
};