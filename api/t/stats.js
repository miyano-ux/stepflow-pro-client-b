import { googleSheets } from '../../src/lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const logs = await googleSheets.getAllLogs();
    return res.status(200).json(logs);
  } catch (error) {
    console.error('Fetch Stats Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}