/**
 * ============================================================
 * api/t/[id].js — トラッキングURLのリダイレクト
 * ============================================================
 *
 * 配置: リポジトリの api/t/[id].js （既存ファイルを差し替え）
 *
 * 処理の順番:
 *   ① 専用GAS（TRACK_GAS_URL）へ問い合わせ → URL取得＋クリック追記
 *   ② ①が失敗/タイムアウトしたら 本体GAS（VITE_GAS_URL）へフォールバック
 *      → URLだけ取得して遷移は成立させる（計測は落ちる）
 *   ③ どちらも駄目なら TRACK_FALLBACK_URL（既定はトップページ）
 *
 * ②を入れている理由:
 *   専用GASは全社共通の1本なので単一障害点になる。デプロイ事故・
 *   クォータ超過・権限剥奪のいずれでも全社のリンクが死ぬため、
 *   「遅くても遷移だけは必ず成立する」経路を残す。
 *
 * 環境変数（Vercel → Settings → Environment Variables）:
 *   TRACK_GAS_URL       専用GASのデプロイURL（全社共通）
 *   TRACK_SECRET        専用GASのスクリプトプロパティと同じ文字列
 *   SHEET_ID            この企業の顧客DBスプレッドシートID
 *   VITE_GAS_URL        既存。本体GASのURL（フォールバックに流用）
 *   TRACK_FALLBACK_URL  任意。解決不能時の遷移先
 * ============================================================
 */

// 東京リージョンで実行する（クライアント→Vercel の往復を短縮）
export const config = { regions: ["hnd1"] };

const GAS_TIMEOUT_MS  = 2500;  // 専用GAS
const MAIN_TIMEOUT_MS = 6000;  // 本体GAS（遅い前提。遷移優先で長めに待つ）

/**
 * ボット・リンクプレビュー・セキュリティスキャナの判定。
 * SMSのリンクはキャリアや端末に先読みされるため、これを弾かないと
 * 顧客が触っていないのに click_count が増え、要注目通知が誤発火する。
 * 判定は「記録するが集計に載せない」ためのフラグであり、遷移は通す。
 */
const BOT_UA = /bot|crawler|spider|slurp|preview|fetcher|monitor|scanner?|curl|wget|python-requests|okhttp|headless|facebookexternalhit|whatsapp|line-?poker|skypeuripreview|slackbot|discordbot|telegrambot|twitterbot|bingpreview|google-?safety|proofpoint|barracuda|mimecast|symantec|forcepoint|zscaler/i;

export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const ua = req.headers["user-agent"] || "";
  const fallbackUrl = process.env.TRACK_FALLBACK_URL || "/";

  // プリフェッチ結果を中間キャッシュに残さない
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Referrer-Policy", "no-referrer");

  // HEAD はリンク検査であって人間のクリックではない
  const isBot = req.method === "HEAD" || BOT_UA.test(ua);

  if (!id) return go(res, fallbackUrl);

  let url = await resolveViaTrackGas(id, ua, isBot);
  if (!url) url = await resolveViaMainGas(id);

  return go(res, url || fallbackUrl);
}

// ─────────────────────────────────────────────────────────────
// ① 専用GAS
// ─────────────────────────────────────────────────────────────
async function resolveViaTrackGas(id, ua, isBot) {
  const endpoint = process.env.TRACK_GAS_URL;
  const secret   = process.env.TRACK_SECRET;
  const sheetId  = process.env.SHEET_ID;
  if (!endpoint || !secret || !sheetId) return "";

  try {
    const data = await postJson(endpoint, {
      action:      "resolveTracking",
      secret,
      sheetId,
      tracking_id: id,
      user_agent:  String(ua).slice(0, 300),
      is_bot:      isBot,
    }, GAS_TIMEOUT_MS);

    if (data && data.status === "success") return String(data.original_url || "").trim();
    if (data && data.message) console.warn("[track] gas said:", data.message);
    return "";
  } catch (e) {
    console.error("[track] dedicated GAS failed:", e && e.message);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// ② 本体GAS（フォールバック・遷移のみ）
// ─────────────────────────────────────────────────────────────
async function resolveViaMainGas(id) {
  const endpoint = process.env.VITE_GAS_URL;
  if (!endpoint) return "";

  try {
    const data = await postJson(endpoint, {
      action:      "getTracking",
      tracking_id: id,
    }, MAIN_TIMEOUT_MS);

    if (data && data.status === "success" && data.log) {
      return String(data.log.original_url || "").trim();
    }
    return "";
  } catch (e) {
    console.error("[track] main GAS fallback failed:", e && e.message);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// 共通
// ─────────────────────────────────────────────────────────────
async function postJson(url, payload, timeoutMs) {
  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method:  "POST",
      // GASは text/plain で受けても e.postData.contents に入る
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(payload),
      signal:  ac.signal,
      redirect: "follow",
    });
    const text = await r.text();
    // 認証設定が誤っているとログインHTMLが返る。JSONで無ければ即諦める。
    if (!text || text.trim().charAt(0) !== "{") {
      throw new Error("non-JSON response (deployment access setting?)");
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * シート上のURLをそのまま Location に載せるため、
 * http(s) 以外（javascript: など）は通さない。
 */
function go(res, target) {
  let dest = String(target || "/").trim();
  if (!/^https?:\/\//i.test(dest) && !dest.startsWith("/")) dest = "/";
  res.writeHead(302, { Location: dest });
  res.end();
}