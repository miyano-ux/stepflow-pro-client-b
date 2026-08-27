// src/lib/reportCache.js
// 【レポート高速化】レポート系 GAS アクションのフロント側キャッシュ（stale-while-revalidate）
//   ・同一 (action, params) の結果をメモリに保持し、同時実行は1本にまとめる
//   ・キャッシュがあれば即返し、古ければ裏で再取得して onUpdate で差し替える
//   ・getReportSummaries（一括）の結果で個別アクションのキャッシュも温める（プリフェッチ用）
import { apiCall } from "./utils";
import { GAS_URL } from "./constants";

const FRESH_MS = 60 * 1000;          // この時間内は再取得しない
const store    = new Map();          // key -> { data, at }
const inflight = new Map();          // key -> Promise

const keyOf = (action, params) => action + ":" + JSON.stringify(params || {});

function put(action, params, data) {
  store.set(keyOf(action, params), { data, at: Date.now() });
  return data;
}

async function fetchRaw(action, params) {
  const key = keyOf(action, params);
  if (inflight.has(key)) return inflight.get(key);
  const p = apiCall.post(GAS_URL, { action, ...(params || {}) })
    .then(res => put(action, params, res))
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * キャッシュ優先で取得する。
 * @returns {{ cached: object|null, promise: Promise<object>|null }}
 *   cached  … 即時に使えるデータ（無ければ null）
 *   promise … 再取得が必要なときだけ非 null（完了後の最新データで解決）
 */
export function getReport(action, params, { force = false } = {}) {
  const hit = store.get(keyOf(action, params));
  const fresh = hit && !force && Date.now() - hit.at < FRESH_MS;
  return {
    cached:  hit ? hit.data : null,
    promise: fresh ? null : fetchRaw(action, params),
  };
}

/** 更新系操作の後に呼ぶと、次回表示時に必ず再取得する */
export function invalidateReports() { store.clear(); }

/**
 * レポート入口・アプリ起動後に呼ぶプリフェッチ。GAS を1回だけ叩き、
 * 3レポートぶんのキャッシュを一括で温める（失敗しても無視）。
 */
let prefetchAt = 0;
export async function prefetchReports({ range = 12 } = {}) {
  if (!GAS_URL) return;
  if (Date.now() - prefetchAt < FRESH_MS) return;   // 連打防止
  prefetchAt = Date.now();
  try {
    const res = await apiCall.post(GAS_URL, { action: "getReportSummaries", range });
    if (!res) return;
    put("getAnalysisSummary",  {},        { status: "success", avgDaysMap: res.avgDaysMap || {} });
    put("getSourceWonEntries", {},        { status: "success", wonEntries: res.wonEntries || [] });
    if (res.smsUsage) put("getSmsUsageSummary", { range }, res.smsUsage);
  } catch (e) {
    console.warn("[prefetchReports] 失敗（個別取得にフォールバック）", e);
  }
}