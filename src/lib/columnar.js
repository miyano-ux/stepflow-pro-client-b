// src/lib/columnar.js
// 【高速化 B】GAS が返す列指向 {headers:[], rows:[[]]} をオブジェクト配列に復元する。
//   ・配列（getCustomers / 旧GAS）や null はそのまま返す＝GAS側だけロールバックしても壊れない
//   ・idFrom を指定すると getSheetValuesAsObj と同一ロジックで id を合成する
//     （顧客ID列があればその値、無ければ行index）
export function fromColumnar(x, opt = {}) {
  if (x == null) return [];
  if (Array.isArray(x)) return x;
  if (!Array.isArray(x.headers) || !Array.isArray(x.rows)) return x;

  const { headers, rows } = x;
  const idCol = opt.idFrom ? headers.indexOf(opt.idFrom) : -1;

  return rows.map((row, i) => {
    const o = opt.idFrom
      ? { id: idCol >= 0 && row[idCol] ? String(row[idCol]) : String(i) }
      : {};
    for (let k = 0; k < headers.length; k++) {
      const h = headers[k];
      if (h) o[h] = row[k];   // 空ヘッダ列はスキップ（GAS 側と同じ）
    }
    return o;
  });
}