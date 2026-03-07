// api/t/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  console.log(`🔎 Tracking request received for ID: "${id}"`);

  const GAS_URL = process.env.VITE_GAS_URL;
  if (!GAS_URL) return res.redirect('/');

  try {
    // 1. GAS経由でトラッキングデータを取得
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getTracking', tracking_id: id }),
    });
    const data = await gasRes.json();

    if (data.status !== 'success' || !data.log?.original_url) {
      console.error(`❌ ID not found: "${id}"`);
      return res.redirect('/');
    }

    // 2. 本来のURLへ即リダイレクト
    const destination = data.log.original_url.trim();
    console.log(`🚀 Redirecting to: ${destination}`);
    res.writeHead(302, { Location: destination });
    res.end();

    // 3. クリックログをバックグラウンドで更新（リダイレクト後）
    const userAgent = req.headers['user-agent'] || 'unknown';
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'logTracking', tracking_id: id, user_agent: userAgent }),
    }).catch(e => console.error('⚠️ Click log update failed:', e));

  } catch (error) {
    console.error('🔥 Critical Redirect Error:', error);
    return res.redirect('/');
  }
}