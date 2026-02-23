import { google } from 'googleapis';

// 1. 環境変数がちゃんと存在するかチェック（デバッグ用）
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  console.error('❌ 環境変数が読み込めていません。Vercelの設定を確認してください。');
}

// 2. 認証オブジェクトの作成（より安定した GoogleAuth 方式に変更）
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // \n または ¥n を本物の改行コードに置換するよう修正
    private_key: process.env.GOOGLE_PRIVATE_KEY 
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n|¥n/g, '\n') 
      : undefined,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.TRACKING_SPREADSHEET_ID;

export const googleSheets = {
  /**
   * トラッキングIDを元にデータを1件取得する
   */
  getLogById: async (id) => {
    // 認証を確実に通すために auth を明示的に指定
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TrackingLogs!A:I',
      auth // 👈 追加
    });
    const rows = response.data.values;
    if (!rows) return null;

    const rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return null;

    const row = rows[rowIndex];
    return {
      tracking_id: row[0],
      original_url: row[1],
      customer_id: row[2],
      customer_name: row[3],
      click_count: parseInt(row[7] || '0'),
      rowIndex: rowIndex + 1 
    };
  },

  /**
   * 新規ログ追記
   */
  appendLog: async (data) => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TrackingLogs!A:I',
      valueInputOption: 'USER_ENTERED',
      auth, // 👈 追加
      requestBody: {
        values: [[
          data.tracking_id,
          data.original_url,
          data.customer_id,
          data.customer_name,
          new Date().toLocaleString('ja-JP'),
          '', '', 0, ''
        ]],
      },
    });
  },

  /**
   * クリックログ更新
   */
  updateClickLog: async (rowIndex, currentCount, userAgent) => {
    const now = new Date().toLocaleString('ja-JP');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `TrackingLogs!F${rowIndex}:I${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      auth, // 👈 追加
      requestBody: {
        values: [[now, now, currentCount + 1, userAgent]],
      },
    });
  },

  /**
   * 全ログ取得
   */
  getAllLogs: async () => {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TrackingLogs!A:I',
      auth // 👈 追加
    });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => { obj[header] = row[index]; });
      return obj;
    });
  }
};