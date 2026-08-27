// src/lib/appCache.js
// 【高速化 E】getAppData の前回結果を IndexedDB に保持する（stale-while-revalidate 用）。
//   ・localStorage は 5MB 上限のため不可
//   ・キーはユーザー(email)単位。ログアウト時に del() で破棄する
//   ・IndexedDB が使えない環境（プライベートブラウズ等）では全て no-op / null
const DB_NAME = "smoosy";
const STORE   = "kv";
const VERSION = 1;

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror    = () => { db.close(); reject(tx.error); };
    tx.onabort    = () => { db.close(); reject(tx.error); };
  });
}

const key = (email) => `appData:v1:${email || "default"}`;

export const appCache = {
  /** @returns {{savedAt:number, d:object}|null} */
  get: (email)    => run("readonly",  s => s.get(key(email))).catch(() => null),
  set: (email, d) => run("readwrite", s => s.put({ savedAt: Date.now(), d }, key(email))).catch(() => {}),
  del: (email)    => run("readwrite", s => s.delete(key(email))).catch(() => {}),
};