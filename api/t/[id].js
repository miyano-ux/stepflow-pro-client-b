// api/t/[id].js
// インポートパス：api/t/ から見て 2つ上の階層の src/lib/googleSheets.js を指定
import { googleSheets } from '../../src/lib/googleSheets';

export default async function handler(req, res) {
  // 1. URLからハッシュIDを抽出
  // URLが /api/t/a1B2c3D4 の場合、id には "a1B2c3D4" が入ります
  const { id } = req.query;

  // デフォルトの遷移先（IDが無かったりエラーが起きた時の逃げ道）
  const FALLBACK_URL = 'https://www.google.com'; 

  if (!id) {
    console.error('No ID provided in request');
    return res.redirect(302, FALLBACK_URL);
  }

  try {
    // 2. Googleスプレッドシートから該当するログ情報を取得
    const logData = await googleSheets.getLogById(id);

    // IDがスプレッドシートに見当たらない場合
    if (!logData || !logData.original_url) {
      console.error(`Tracking ID not found in sheet: ${id}`);
      return res.redirect(302, FALLBACK_URL);
    }

    // 3. クリックログを更新（非同期実行）
    // 相手のデバイス情報（User-Agent）を取得
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // スプレッドシート側のデータを更新（回数+1、最新クリック時刻、デバイス名）
    // この処理が終わるのを待ってからリダイレクトします
    await googleSheets.updateClickLog(
      logData.rowIndex, 
      logData.click_count, 
      userAgent
    );

    // 4. 本来の遷移先URLへリダイレクト
    // 302リダイレクトを使うことで、ブラウザにキャッシュさせず、
    // クリックのたびに必ずこのAPI（計測ロジック）を通るようにします
    return res.redirect(302, logData.original_url);

  } catch (error) {
    // APIの制限や通信エラーが起きた場合の処理
    console.error('Tracking API Execution Error:', error);
    
    // エラーが起きてもユーザーを止めないよう、本来のURL（もし取得できていれば）
    // またはフォールバック先へ飛ばします
    return res.redirect(302, FALLBACK_URL);
  }
}