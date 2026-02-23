// api/t/[id].js
import { googleSheets } from '../../src/lib/googleSheets.js';

export default async function handler(req, res) {
  const { id } = req.query;
  console.log(`🔎 Tracking request received for ID: "${id}"`);

  try {
    // 1. スプレッドシートからデータ取得
    const log = await googleSheets.getLogById(id);

    if (!log || !log.original_url) {
      console.error(`❌ ID not found or URL missing in sheet: "${id}"`);
      // 見つからない場合はCRMのトップへ（ここが現在の挙動です）
      return res.redirect('/'); 
    }

    // 2. 本来のURLへリダイレクト（最優先で実行）
    const destination = log.original_url.trim();
    console.log(`🚀 Success! Redirecting to: ${destination}`);
    
    // リダイレクトを実行
    res.writeHead(302, { Location: destination });
    res.end();

    // 3. クリック情報をバックグラウンドで更新（リダイレクト後に実行）
    const userAgent = req.headers['user-agent'] || 'unknown';
    googleSheets.updateClickLog(log.rowIndex, log.click_count, userAgent)
      .catch(e => console.error('⚠️ Click log update failed:', e));

  } catch (error) {
    console.error('🔥 Critical Redirect Error:', error);
    return res.redirect('/');
  }
}