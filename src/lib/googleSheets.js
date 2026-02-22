import { google } from 'googleapis';

/**
 * Google Sheets API 認証設定
 */
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  // 秘密鍵の改行文字（\n）を正しく処理して復元する
  process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.TRACKING_SPREADSHEET_ID;

export const googleSheets = {
  /**
   * トラッキングIDを元に特定の行データを取得する
   */
  getLogById: async (id) => {
    const range = 'TrackingLogs!A:I';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const rows = response.data.values;
    if (!rows) return null;

    // A列 (tracking_id) と一致する行を検索
    const rowIndex = rows.findIndex(r => r[0] === id);
    if (rowIndex === -1) return null;

    const row = rows[rowIndex];
    return {
      tracking_id: row[0],
      original_url: row[1],
      customer_id: row[2],
      customer_name: row[3],
      click_count: parseInt(row[7] || '0'),
      rowIndex: rowIndex + 1 // スプレッドシートの行番号（1始まり）
    };
  },

  /**
   * 新規URL発行時にデータを1行追記する
   */
  appendLog: async (data) => {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TrackingLogs!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          data.tracking_id,
          data.original_url,
          data.customer_id,
          data.customer_name,
          new Date().toLocaleString('ja-JP'), // sent_at (JST)
          '', // clicked_at
          '', // last_clicked_at
          0,  // click_count
          ''  // user_agent
        ]],
      },
    });
  },

  /**
   * クリック時のログ更新（回数増加と時刻・デバイス情報の記録）
   */
  updateClickLog: async (rowIndex, currentCount, userAgent) => {
    const now = new Date().toLocaleString('ja-JP');
    const updateRange = `TrackingLogs!F${rowIndex}:I${rowIndex}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          // 初回クリック時刻(F)は本来保持すべきですが、簡易的に現在時刻で更新
          now, 
          now,             // G列: last_clicked_at
          currentCount + 1, // H列: click_count
          userAgent         // I列: user_agent
        ]],
      },
    });
  },

  /**
   * 実況画面（ダッシュボード）用に全ログを取得する
   */
  getAllLogs: async () => {
    const range = 'TrackingLogs!A:I';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  }
};