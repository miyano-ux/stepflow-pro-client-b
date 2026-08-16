/**
 * ============================================================
 * api/t/stats.js — トラッキング実況の集計取得
 * ============================================================
 *
 * 旧実装は存在しない googleSheets.js を import しており動作していなかった。
 * 本体GASの getTrackingStats へ中継する形に置き換える。
 *
 * GASを直接叩かずVercel経由にしている理由:
 *   - GASのURLをブラウザに露出させない
 *   - CDN側でも短時間キャッシュでき、同じ画面を複数人が開いても
 *     オリジンへのリクエストが増えない
 *
 * 環境変数:
 *   VITE_GAS_URL  既存。本体GASのURL
 * ============================================================
 */

export const config = { regions: ["hnd1"] };

const GAS_TIMEOUT_MS = 8000;
const DEFAULT_DAYS   = 30;

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ status: "error", message: "method_not_allowed" });
  }

  const gasUrl = process.env.VITE_GAS_URL;
  if (!gasUrl) {
    return res.status(500).json({
      status:  "error",
      message: "Vercelの環境変数 VITE_GAS_URL が未設定です。",
    });
  }

  const days = clampDays(req.query.days);

  // GAS側で30秒キャッシュしているため、CDN側は10秒程度に留める。
  // stale-while-revalidate で、再取得中も直前の値を返して画面を止めない。
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10, stale-while-revalidate=50");

  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), GAS_TIMEOUT_MS);

  try {
    const r = await fetch(gasUrl, {
      method:   "POST",
      headers:  { "Content-Type": "text/plain;charset=utf-8" },
      body:     JSON.stringify({ action: "getTrackingStats", days }),
      signal:   ac.signal,
      redirect: "follow",
    });

    const text = await r.text();
    if (!text || text.trim().charAt(0) !== "{") {
      // GASのデプロイ設定が誤っているとログインHTMLが返る
      throw new Error("non-JSON response");
    }

    const data = JSON.parse(text);
    if (data.status !== "success") {
      return res.status(502).json({
        status:  "error",
        message: data.message || "集計の取得に失敗しました。",
      });
    }
    return res.status(200).json(data);

  } catch (e) {
    console.error("[stats] failed:", e && e.message);
    return res.status(502).json({
      status:  "error",
      message: "集計の取得に失敗しました。時間をおいて再試行してください。",
    });
  } finally {
    clearTimeout(timer);
  }
}

function clampDays(raw) {
  const n = parseInt(raw, 10);
  if (!n || isNaN(n)) return DEFAULT_DAYS;
  return Math.min(Math.max(n, 1), 365);
}