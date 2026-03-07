// api/t/create.js
const generateHash = () => Math.random().toString(36).substring(2, 10);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { originalUrl, customerId, customerName } = req.body;
  if (!originalUrl) return res.status(400).json({ message: 'Original URL is required' });

  const GAS_URL = process.env.VITE_GAS_URL;
  if (!GAS_URL) return res.status(500).json({ message: 'GAS_URL not configured' });

  try {
    const trackingId = generateHash();

    // GAS経由でスプレッドシートに書き込み
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action:       'saveTracking',
        tracking_id:  trackingId,
        original_url: originalUrl,
        customer_id:  customerId  || '',
        customer_name: customerName || '',
      }),
    });
    const data = await gasRes.json();
    if (data.status !== 'success') throw new Error(data.message || 'GAS error');

    const trackingUrl = `${process.env.BASE_URL}/api/t/${trackingId}`;
    return res.status(200).json({ trackingUrl });

  } catch (error) {
    console.error('Create Tracking Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}