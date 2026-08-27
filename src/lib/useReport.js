// src/lib/useReport.js
// 【レポート高速化】getReport() を React の状態に落とすフック。
//   キャッシュがあれば loading=false で即描画し、古ければ裏で更新する。
import { useEffect, useState } from "react";
import { getReport } from "./reportCache";

export function useReport(action, params) {
  const paramKey = JSON.stringify(params || {});
  const [state, setState] = useState(() => {
    const { cached } = getReport(action, params);
    return { data: cached, loading: !cached, error: false };
  });

  useEffect(() => {
    let alive = true;
    const { cached, promise } = getReport(action, params);
    setState({ data: cached, loading: !cached, error: false });
    if (!promise) return;
    promise
      .then(data => { if (alive) setState({ data, loading: false, error: false }); })
      .catch(e => {
        console.warn(`[useReport] ${action} 取得失敗`, e);
        if (alive) setState(s => ({ data: s.data, loading: false, error: !s.data }));
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, paramKey]);

  return state;
}