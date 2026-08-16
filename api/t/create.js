/**
 * ============================================================
 * api/t/create.js — トラッキングURLの発行
 * ============================================================
 *
 * 課題 C3-013 の修正。DirectSms.jsx の「⚡URLをトラッキング化」から
 * POST /api/t/create で呼ばれるが、このファイル自体が存在せず
 * 404 になっていた。
 *
 * 【BASE_URL について】
 *   旧実装は環境変数 BASE_URL 必須だったが、企業ごとに設定が必要で
 *   設定漏れが起きやすい。リクエストヘッダから自前で組み立て、
 *   BASE_URL は「明示的に上書きしたいときだけ使う」ものに変更した。
 *   これにより企業追加時の設定漏れでこの機能が死ぬことがなくなる。
 *
 * 【tracking_id】
 *   SMSは文字数で課金されるため、IDは8文字に抑える。
 *   紛らわしい文字（0/o/1/l）を除いた33文字から生成するので、
 *   顧客が手入力する場面でも誤りにくい。
 *
 * 環境変数:
 *   VITE_GAS_URL  既存。本体GASのURL（saveTracking の呼び出し先）
 *   BASE_URL      任意。独自ドメインを使う場合など、明示したいときのみ
 * ============================================================
 */

export const config = { regions: ["hnd1"] };

const GAS_TIMEOUT_MS = 10000;
const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";  // 0 o 1 l を除外
const ID_LENGTH   = 8;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const gasUrl = process.env.VITE_GAS_URL;
  if (!gasUrl) {
    return res.status(500).json({
      error:   "gas_url_not_configured",
      message: "Vercelの環境変数 VITE_GAS_URL が未設定です。",
    });
  }

  const body = parseBody(req.body);
  const originalUrl  = String(body.originalUrl || "").trim();
  const customerId   = String(body.customerId || "");
  const customerName = String(body.customerName || "");

  // ── 入力チェック ──────────────────────────────────
  if (!originalUrl) {
    return res.status(400).json({ error: "missing_url", message: "変換対象のURLがありません。" });
  }
  if (!/^https?:\/\//i.test(originalUrl)) {
    return res.status(400).json({
      error:   "invalid_url",
      message: "http:// または https:// で始まるURLのみ変換できます。",
    });
  }
  if (originalUrl.includes("/api/t/")) {
    // 二重変換の防止（フロント側でも弾いているが念のため）
    return res.status(200).json({ trackingUrl: originalUrl, alreadyTracking: true });
  }

  const baseUrl = resolveBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({
      error:   "base_url_unresolved",
      message: "リクエスト元のホスト名を特定できませんでした。環境変数 BASE_URL を設定してください。",
    });
  }

  const trackingId  = generateId();
  const trackingUrl = `${baseUrl}/api/t/${trackingId}`;

  // ── 本体GASの saveTracking に発行ログを残す ────────
  try {
    const data = await postJson(gasUrl, {
      action:        "saveTracking",
      tracking_id:   trackingId,
      original_url:  originalUrl,
      customer_id:   customerId,
      customer_name: customerName,
    }, GAS_TIMEOUT_MS);

    if (!data || data.status !== "success") {
      return res.status(502).json({
        error:   "gas_save_failed",
        message: "トラッキングURLの記録に失敗しました。時間をおいて再試行してください。",
      });
    }
  } catch (e) {
    console.error("[create] saveTracking failed:", e && e.message);
    return res.status(502).json({
      error:   "gas_unreachable",
      message: "サーバーとの通信に失敗しました。時間をおいて再試行してください。",
    });
  }

  return res.status(200).json({ trackingUrl, trackingId });
}

// ─────────────────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────────────────

/**
 * デプロイ先のURLを決める。
 * 優先順: BASE_URL（明示） → リクエストヘッダ → VERCEL_URL
 */
function resolveBaseUrl(req) {
  const explicit = String(process.env.BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const host  = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  if (host) return `${proto}://${host}`;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function generateId() {
  let out = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return out;
}

function parseBody(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

async function postJson(url, payload, timeoutMs) {
  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method:   "POST",
      headers:  { "Content-Type": "text/plain;charset=utf-8" },
      body:     JSON.stringify(payload),
      signal:   ac.signal,
      redirect: "follow",
    });
    const text = await r.text();
    if (!text || text.trim().charAt(0) !== "{") {
      throw new Error("non-JSON response (GASのデプロイ設定を確認してください)");
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}