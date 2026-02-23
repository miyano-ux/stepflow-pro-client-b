// api/t/create.js
import { googleSheets } from '../../src/lib/googleSheets.js';

// 8文字のランダムなハッシュIDを生成する関数
const generateHash = () => {
  return Math.random().toString(36).substring(2, 10);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { originalUrl, customerId, customerName } = req.body;

  if (!originalUrl) return res.status(400).json({ message: 'Original URL is required' });

  try {
    const trackingId = generateHash();
    
    // スプレッドシートに新規ログを追加 (googleSheets.js の appendLog を呼び出し)
    await googleSheets.appendLog({
      tracking_id: trackingId,
      original_url: originalUrl,
      customer_id: customerId,
      customer_name: customerName,
    });

    // 生成されたトラッキング用URLを返す
    // BASE_URLは環境変数から取得（例: https://stepflow-pro.vercel.app）
    const trackingUrl = `${process.env.BASE_URL}/api/t/${trackingId}`;
    
    return res.status(200).json({ trackingUrl });
  } catch (error) {
    console.error('Create Tracking Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}