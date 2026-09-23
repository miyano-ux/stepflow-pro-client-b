// src/lib/useReport.js
// 【レポート高速化】getReport() を React の状態に落とすフック。
//   キャッシュがあれば loading=false で即描画し、古ければ裏で更新する。
// 【SMS通数監査⑤】取得失敗（error）から復帰するための reload()（キャッシュ無視の
//   強制再取得）を戻り値に追加。プロパティ追加のみのため、既存の
//   { data, loading, error } 利用箇所（他レポート）には影響しない。
import { useCallback, useEffect, useRef, useState } from "react";
import { getReport, refreshReport } from "./reportCache";

export function useReport(action, params) {
  const paramKey = JSON.stringify(params || {});
  const [state, setState] = useState(() => {
    const { cached } = getReport(action, params);
    return { data: cached, loading: !cached, error: false };
  });

  // 【SMS通数監査⑤】reload はエフェクト外から呼ばれるため、
  //   アンマウント後の setState 防止フラグを ref で共有する。
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    let alive = true;   // paramKey 切替時に古い応答を捨てるためのエフェクト単位フラグ
    const { cached, promise } = getReport(action, params);
    setState({ data: cached, loading: !cached, error: false });
    if (!promise) return;
    promise
      .then(data => { if (alive && aliveRef.current) setState({ data, loading: false, error: false }); })
      .catch(e => {
        console.warn(`[useReport] ${action} 取得失敗`, e);
        if (alive && aliveRef.current) setState(s => ({ data: s.data, loading: false, error: !s.data }));
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, paramKey]);

  // 【SMS通数監査⑤】キャッシュを無視して取り直す（エラー画面の「再試行」用）。
  const reload = useCallback(() => {
    setState(s => ({ data: s.data, loading: true, error: false }));
    getReport(action, params, { force: true }).promise
      .then(data => { if (aliveRef.current) setState({ data, loading: false, error: false }); })
      .catch(e => {
        console.warn(`[useReport] ${action} 再取得失敗`, e);
        if (aliveRef.current) setState(s => ({ data: s.data, loading: false, error: !s.data }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, paramKey]);

  // 【SMS通数監査⑥】GAS側キャッシュごと再集計する強制更新（「最新に更新」ボタン用）。
  const refresh = useCallback(() => {
    setState(s => ({ data: s.data, loading: true, error: false }));
    refreshReport(action, params)
      .then(data => { if (aliveRef.current) setState({ data, loading: false, error: false }); })
      .catch(e => {
        console.warn(`[useReport] ${action} 強制再集計失敗`, e);
        if (aliveRef.current) setState(s => ({ data: s.data, loading: false, error: !s.data }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, paramKey]);

  return { ...state, reload, refresh };
}