import React from "react";

// ==========================================
// 🎨 MemberTemplates - スタッフ紹介ページ テンプレート集（8種）
// ==========================================
// 【描画方式】
//   提供されたサンプルHTML（template-1a〜4b）と同一のHTML文書を生成し、
//   <iframe srcDoc> で描画する。iframe内は独立した文書のため、
//   アプリ側のグローバルCSS（App.css等）の影響を一切受けず、
//   サンプルHTMLをブラウザで直接開いた場合と同一のレンダリングになる。
//
// 【CSSの由来】
//   下記の CSS_XX 定数は、サンプルHTML各ファイルの <style> 内容を
//   ビルドスクリプトで機械抽出して埋め込んだもの（手転記なし・無改変）。
//
// 【原本との意図的な差分（これ以外は原本と同一。生成HTMLと原本の行diffで確認済み）】
//   1. <title> を「スタッフ名｜会社名」に動的化（原本は比較用タイトル）
//   2. 右上の比較用バッジ（.badge の div）を出力しない（CSS定義は原本のまま残置）
//   3. ロゴ画像（images/dummy-logo.svg の img）→ 会社名テキストに置換
//      （置換用CSSは原本CSSの後に追記。原本CSSは無改変）
//   4. CTAバー：電話番号・URLのどちらかが設定されている場合のみ出力。
//      非表示時は body{padding-bottom:0;} を追記して下余白も外す。
//      URL側ボタンの表記は cta.urlType で切替（予約=原本どおり「予約日時を選択」/
//      ホームページ=「ホームページ」/ その他=cta.urlLabel のテキスト）
//   5. データ注入：空のフィールドは行ごと出力しない
//
// 利用側：
//   <MemberTemplate id="1a" d={data} page />   … 公開ページ（画面全体に固定表示）
//   <MemberTemplate id="1a" d={SAMPLE_MEMBER(会社名)} /> … 親要素いっぱいに描画
//   <TemplatePreviewThumb id="1a" width={200} /> … 縮小サムネイル
//   memberTemplateHtml(id, d) … 生成HTML文字列（検証・デバッグ用）

export const TEMPLATE_IDS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b"];

// テンプレートIDの正規化（"1-A" "1A" 等の表記ゆれを吸収し、不正値は既定の 1a に落とす）
export const normalizeTemplateId = (raw) => {
  const v = String(raw || "").trim().toLowerCase().replace(/[^0-9ab]/g, "");
  return TEMPLATE_IDS.includes(v) ? v : "1a";
};

// "1a" → "1-A" 表示用
export const templateDisplayId = (id) => `${id[0]}-${id[1].toUpperCase()}`;

// テンプレート選択画面・フォーム表示用メタ情報（文言は比較用 index.html 準拠）
export const TEMPLATE_GROUPS = [
  {
    no: 1, title: "高級・信頼", desc: "上品な高級感と誠実な信頼感を伝えます。",
    items: [
      { id: "1a", label: "ゴールド系", desc: "格式や実績を印象づけたい方に。" },
      { id: "1b", label: "ネイビー系", desc: "誠実さと安定感を伝えたい方に。" },
    ],
  },
  {
    no: 2, title: "爽やか・明るい", desc: "抜け感のある爽やかさと明るく前向きな印象を伝えます。",
    items: [
      { id: "2a", label: "ブルー系", desc: "明るくフレッシュな印象にしたい方に。" },
      { id: "2b", label: "レッド系", desc: "元気で親しみやすい印象にしたい方に。" },
    ],
  },
  {
    no: 3, title: "親しみ・優しい", desc: "やわらかな親しみとやさしい雰囲気を伝えます。",
    items: [
      { id: "3a", label: "コーラル系", desc: "話しかけやすい雰囲気にしたい方に。" },
      { id: "3b", label: "パープル系", desc: "上品でやさしい雰囲気にしたい方に。" },
    ],
  },
  {
    no: 4, title: "シンプル・洗練", desc: "無駄のないシンプルさと洗練された上質感を伝えます。",
    items: [
      { id: "4a", label: "グリーン系", desc: "すっきり洗練された印象にしたい方に。" },
      { id: "4b", label: "ブラウン系", desc: "落ち着いたあたたかみを出したい方に。" },
    ],
  },
];

// id → メタ情報のフラットマップ
export const TEMPLATE_META = Object.fromEntries(
  TEMPLATE_GROUPS.flatMap((g) =>
    g.items.map((t) => [t.id, { ...t, groupNo: g.no, groupTitle: g.title, groupDesc: g.desc }])
  )
);

// サンプル表示用ダミーデータ（サンプルHTMLと同内容）
export const SAMPLE_MEMBER = (companyName) => ({
  fullName: "山田 太郎",
  initial: "山",
  role: "店長 / 営業担当",
  photoUrl: "",
  catchphrase: "お客様の「ちょうどいい」を、いちばん近くで一緒に探します。",
  bio: "地域のお客様に寄り添って10年以上、住まい探しのお手伝いをしてまいりました。些細なご相談でも、まずはお気軽にお声がけください。",
  career: "2014年入社。以来、地域担当として一貫して現場に立ち続け、宅地建物取引士資格を保有。",
  achievements: [
    "年間成約件数 社内トップ3（3年連続）",
    "お客様満足度アンケート 平均4.8/5.0",
    "宅地建物取引士 資格保有",
  ],
  companyName: companyName || "company name",
  cta: { phone: "03-1234-5678", bookingUrl: "#booking" },
});

// ==========================================
// エスケープ・共通ヘルパー
// ==========================================
const T = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // テキストノード用
const A = (s) => T(s).replace(/"/g, "&quot;"); // 属性値用
const hasCta = (d) => !!(d && d.cta && (d.cta.phone || d.cta.bookingUrl));

// 写真：URLがあれば <img>、無ければ原本と同じイニシャル入り <div>
const photoTag = (d, indent, cls) => {
  const pad = " ".repeat(indent);
  return d.photoUrl
    ? `${pad}<img class="${cls}" src="${A(d.photoUrl)}" alt="${A(d.fullName)}">`
    : `${pad}<div class="${cls}">${T(d.initial)}</div>`;
};

// CTAバー（原本と同一マークアップ。設定済みのボタンのみ出力）
// URL側ボタンの表記は cta.urlType で切替：
//   「予約」（既定）    → 📅 予約日時を選択（原本どおり）
//   「ホームページ」    → 🏠 ホームページ
//   「その他」         → 🔗 cta.urlLabel のテキスト（未入力時は「リンクを開く」）
const ctaHtml = (d) => {
  const tel = String(d.cta?.phone || "");
  const book = String(d.cta?.bookingUrl || "");
  const type = String(d.cta?.urlType || "予約");
  const icon = type === "ホームページ" ? "🏠" : type === "その他" ? "🔗" : "📅";
  const label = type === "ホームページ"
    ? "ホームページ"
    : type === "その他"
      ? (String(d.cta?.urlLabel || "").trim() || "リンクを開く")
      : "予約日時を選択";
  const L = [`  <div class="cta-bar">`, `    <div class="cta-bar-inner">`];
  if (tel) {
    L.push(`      <a class="cta-tel" href="tel:${tel.replace(/[^\d+]/g, "")}"><span aria-hidden="true">📞</span>${T(tel)}</a>`);
  }
  if (book) {
    const ext = /^https?:\/\//.test(book) ? ` target="_blank" rel="noreferrer"` : "";
    L.push(`      <a class="cta-book" href="${A(book)}"${ext}><span aria-hidden="true">${icon}</span>${T(label)}</a>`);
  }
  L.push(`    </div>`, `  </div>`);
  return L.join("\n");
};

// ==========================================
// 原本CSS（ビルドスクリプトがサンプルHTMLの <style> から機械抽出・無改変）
// ==========================================
const CSS_1A = `
  :root{
    --gold:#C6A15B;
    --navy:#1F2937;
    --navy-soft:#3D4759;
    --ink:#2B2B2B;
    --sub:#8B8F98;
    --line:#E7E2D8;
    --bg-cream:#FBF9F5;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg-cream);font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--navy);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:999px;z-index:10;}
  .top-line{height:5px;background:linear-gradient(90deg,var(--gold),#DCC488,var(--gold));}
  .wrap{max-width:1040px;margin:0 auto;}
  header{display:flex;align-items:center;gap:28px;padding:44px 40px 34px;}
  .logo{
    flex-shrink:0;max-width:170px;max-height:52px;width:auto;height:auto;
    object-fit:contain;display:block;
  }
  .head-sub{color:var(--sub);font-size:12px;margin:0 0 8px;letter-spacing:.14em;text-transform:uppercase;}
  .head-title{margin:0;font-size:28px;font-weight:600;color:var(--navy);line-height:1.5;
    font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
  .head-title .nm{color:var(--gold);font-weight:700;}
  .divider{border-top:1px solid var(--line);}
  .body{padding:52px 40px 80px;}
  .sec-head{display:flex;align-items:center;gap:16px;}
  .sec-dot{width:9px;height:9px;border-radius:50%;background:var(--gold);flex-shrink:0;}
  .sec-title{margin:0;font-size:24px;color:var(--navy);font-weight:600;letter-spacing:.1em;
    font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
  .sec-rule{height:1px;background:var(--line);margin:18px 0 0;position:relative;}
  .sec-rule::after{content:"";position:absolute;left:0;top:-1px;width:64px;height:2px;background:var(--gold);}
  .grid{display:grid;grid-template-columns:330px 1fr;gap:56px;margin-top:44px;align-items:start;}
  .photo-wrap{position:relative;}
  .photo{
    width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:2px;
    box-shadow:0 14px 34px rgba(31,41,55,.14);display:flex;align-items:center;justify-content:center;
    background:linear-gradient(155deg,#EFE7D4,#DCC488);color:var(--navy);font-size:72px;font-weight:700;
  }
  .photo-frame{position:absolute;inset:14px;border:1px solid rgba(255,255,255,.55);pointer-events:none;}
  .catch{margin-top:22px;padding:16px 20px;border-left:2px solid var(--gold);color:var(--navy-soft);
    font-size:14px;line-height:1.9;font-style:normal;background:#fff;}
  .rows{display:flex;flex-direction:column;}
  .row{display:grid;grid-template-columns:140px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
  .row + .row{border-top:1px solid var(--line);}
  .label{color:var(--gold);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding-top:2px;}
  .value{color:var(--ink);font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
  .bullets{list-style:none;margin:0;padding:0;}
  .bullets li{position:relative;padding-left:20px;color:var(--ink);font-size:15.5px;line-height:2;}
  .bullets li::before{content:"";position:absolute;left:0;top:11px;width:7px;height:1px;background:var(--gold);}
  footer{text-align:center;padding:26px;color:var(--sub);font-size:11.5px;letter-spacing:.08em;border-top:1px solid var(--line);}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--navy);color:var(--navy);}
  .cta-book{background:var(--gold);color:var(--navy);}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }
  @media (max-width:760px){
    header{flex-direction:column;align-items:flex-start;gap:16px;padding:32px 22px 22px;}
    .head-title{font-size:22px;}
    .body{padding:36px 22px 60px;}
    .grid{grid-template-columns:1fr;gap:30px;}
    .photo-wrap{max-width:280px;margin:0 auto;}
    .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
  }
`;
const CSS_1B = `
  :root{
    --gold:#2563EB;
    --navy:#0B1E39;
    --navy-soft:#35507A;
    --ink:#1B2430;
    --sub:#7A8598;
    --line:#E4E9F2;
    --bg-cream:#F7F9FC;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg-cream);font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--navy);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:999px;z-index:10;}
  .top-line{height:5px;background:linear-gradient(90deg,var(--gold),#8FC7FF,var(--gold));}
  .wrap{max-width:1040px;margin:0 auto;}
  header{display:flex;align-items:center;gap:28px;padding:44px 40px 34px;}
  .logo{
    flex-shrink:0;max-width:170px;max-height:52px;width:auto;height:auto;
    object-fit:contain;display:block;
  }
  .head-sub{color:var(--sub);font-size:12px;margin:0 0 8px;letter-spacing:.14em;text-transform:uppercase;}
  .head-title{margin:0;font-size:28px;font-weight:600;color:var(--navy);line-height:1.5;
    font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
  .head-title .nm{color:var(--gold);font-weight:700;}
  .divider{border-top:1px solid var(--line);}
  .body{padding:52px 40px 80px;}
  .sec-head{display:flex;align-items:center;gap:16px;}
  .sec-dot{width:9px;height:9px;border-radius:50%;background:var(--gold);flex-shrink:0;}
  .sec-title{margin:0;font-size:24px;color:var(--navy);font-weight:600;letter-spacing:.1em;
    font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
  .sec-rule{height:1px;background:var(--line);margin:18px 0 0;position:relative;}
  .sec-rule::after{content:"";position:absolute;left:0;top:-1px;width:64px;height:2px;background:var(--gold);}
  .grid{display:grid;grid-template-columns:330px 1fr;gap:56px;margin-top:44px;align-items:start;}
  .photo-wrap{position:relative;}
  .photo{
    width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:2px;
    box-shadow:0 14px 34px rgba(31,41,55,.14);display:flex;align-items:center;justify-content:center;
    background:linear-gradient(155deg,var(--navy),var(--gold));color:#fff;font-size:72px;font-weight:700;
  }
  .photo-frame{position:absolute;inset:14px;border:1px solid rgba(255,255,255,.55);pointer-events:none;}
  .catch{margin-top:22px;padding:16px 20px;border-left:2px solid var(--gold);color:var(--navy-soft);
    font-size:14px;line-height:1.9;font-style:normal;background:#fff;}
  .rows{display:flex;flex-direction:column;}
  .row{display:grid;grid-template-columns:140px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
  .row + .row{border-top:1px solid var(--line);}
  .label{color:var(--gold);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding-top:2px;}
  .value{color:var(--ink);font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
  .bullets{list-style:none;margin:0;padding:0;}
  .bullets li{position:relative;padding-left:20px;color:var(--ink);font-size:15.5px;line-height:2;}
  .bullets li::before{content:"";position:absolute;left:0;top:11px;width:7px;height:1px;background:var(--gold);}
  footer{text-align:center;padding:26px;color:var(--sub);font-size:11.5px;letter-spacing:.08em;border-top:1px solid var(--line);}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--navy);color:var(--navy);}
  .cta-book{background:var(--gold);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }
  @media (max-width:760px){
    header{flex-direction:column;align-items:flex-start;gap:16px;padding:32px 22px 22px;}
    .head-title{font-size:22px;}
    .body{padding:36px 22px 60px;}
    .grid{grid-template-columns:1fr;gap:30px;}
    .photo-wrap{max-width:280px;margin:0 auto;}
    .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
  }
`;
const CSS_2A = `
  :root{
    --navy:#0B3D66;
    --blue:#209CFF;
    --blue-soft:#E3F6FF;
    --ice:#68E0CF;
    --ink:#17303A;
    --sub:#71898F;
    --line:#DCEEF0;
    --bg:#F5FBFC;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--blue);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:6px;z-index:10;}

  .hero{
    position:relative;overflow:hidden;padding:36px 40px 48px;
    background:
      repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px),
      linear-gradient(125deg,var(--blue) 0%,var(--ice) 100%);
  }
  .hero::before{
    content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;
    background:radial-gradient(circle,rgba(104,224,207,.35),rgba(104,224,207,0) 70%);
  }
  .hero::after{
    content:"";position:absolute;left:-60px;bottom:-140px;width:260px;height:260px;border-radius:50%;
    background:radial-gradient(circle,rgba(32,156,255,.30),rgba(32,156,255,0) 70%);
  }
  .hero-inner{position:relative;max-width:1040px;margin:0 auto;}
  .logo-badge{display:inline-block;background:#fff;border-radius:8px;padding:8px 14px;line-height:0;}
  .logo{max-width:140px;max-height:32px;width:auto;height:auto;object-fit:contain;display:block;}
  .hero-main{display:grid;grid-template-columns:1fr 400px;gap:40px;align-items:center;padding:28px 0 0;}
  .photo{
    order:2;width:100%;aspect-ratio:16/9;height:auto;border-radius:16px;object-fit:cover;
    border:3px solid rgba(255,255,255,.25);box-shadow:0 20px 40px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;background:linear-gradient(155deg,var(--ice),var(--blue));
    color:#fff;font-size:56px;font-weight:800;
  }
  .hero-text{order:1;padding-bottom:0;}
  .eyebrow{font-size:12px;font-weight:700;letter-spacing:.16em;color:var(--ice);text-transform:uppercase;margin:0 0 10px;}
  .name{margin:0;font-size:32px;font-weight:800;color:#fff;letter-spacing:.01em;}
  .role{margin:10px 0 0;font-size:14.5px;color:rgba(255,255,255,.72);font-weight:600;}
  .catch{margin:16px 0 0;font-size:15px;color:rgba(255,255,255,.9);line-height:1.8;max-width:520px;}

  .wrap{max-width:1040px;margin:0 auto;padding:44px 40px 70px;}
  .row{display:grid;grid-template-columns:150px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
  .row + .row{border-top:1px solid var(--line);}
  .label{display:flex;align-items:center;gap:8px;color:var(--blue);font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px;}
  .label::before{content:"";width:14px;height:2px;background:var(--blue);}
  .value{color:var(--ink);font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
  .bullets{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
  .bullets li{
    background:var(--blue-soft);color:var(--navy);border-radius:8px;padding:12px 16px;
    font-size:14.5px;font-weight:600;border-left:3px solid var(--blue);
  }

  footer{text-align:center;padding:22px;color:var(--sub);font-size:12px;border-top:1px solid var(--line);letter-spacing:.04em;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--blue);color:var(--blue);}
  .cta-book{background:var(--blue);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:760px){
    .hero{padding:26px 22px 36px;}
    .hero-main{grid-template-columns:1fr;text-align:center;padding:22px 0 0;}
    .photo{order:1;width:100%;aspect-ratio:16/9;height:auto;font-size:40px;}
    .hero-text{order:2;padding-bottom:0;}
    .catch{margin-left:auto;margin-right:auto;}
    .name{font-size:24px;}
    .wrap{padding:34px 22px 56px;}
    .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
  }
`;
const CSS_2B = `
  :root{
    --red:#F5323F;
    --red-dark:#FF6A4D;
    --red-soft:#FFEDE8;
    --ink:#2A1A16;
    --sub:#9A8580;
    --line:#F5E3DE;
    --bg:#FFFBFA;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--red);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:6px;z-index:10;}

  .hero{
    position:relative;overflow:hidden;padding:36px 40px 48px;
    background:
      repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px),
      linear-gradient(125deg,var(--red) 0%,var(--red) 45%,var(--red-dark) 100%);
  }
  .hero::before{
    content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;
    background:radial-gradient(circle,rgba(255,255,255,.28),rgba(255,255,255,0) 70%);
  }
  .hero::after{
    content:"";position:absolute;left:-60px;bottom:-140px;width:260px;height:260px;border-radius:50%;
    background:radial-gradient(circle,rgba(255,138,91,.35),rgba(255,138,91,0) 70%);
  }
  .hero-inner{position:relative;max-width:1040px;margin:0 auto;}
  .logo-badge{display:inline-block;background:#fff;border-radius:8px;padding:8px 14px;line-height:0;}
  .logo{max-width:140px;max-height:32px;width:auto;height:auto;object-fit:contain;display:block;}
  .hero-main{display:grid;grid-template-columns:1fr 400px;gap:40px;align-items:center;padding:28px 0 0;}
  .photo{
    order:2;width:100%;aspect-ratio:16/9;height:auto;object-fit:cover;border-radius:6px;
    border:4px solid #fff;box-shadow:0 18px 36px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;background:linear-gradient(155deg,var(--red-dark),var(--red));
    color:#fff;font-size:52px;font-weight:900;
  }
  .hero-text{order:1;}
  .eyebrow{font-size:12px;font-weight:800;letter-spacing:.2em;color:#FFE3D1;text-transform:uppercase;margin:0 0 10px;}
  .name{margin:0;font-size:34px;font-weight:900;color:#fff;letter-spacing:.02em;}
  .name-rule{width:56px;height:4px;background:#fff;margin:14px 0;}
  .role{margin:0;font-size:14.5px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:.04em;}
  .catch{margin:16px 0 0;font-size:15px;color:rgba(255,255,255,.95);line-height:1.8;max-width:520px;font-weight:600;}

  .wrap{max-width:1040px;margin:0 auto;padding:44px 40px 70px;}
  .row{display:grid;grid-template-columns:150px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
  .row + .row{border-top:1px solid var(--line);}
  .label{display:flex;align-items:center;gap:8px;color:var(--red);font-weight:900;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px;}
  .label::before{content:"";width:16px;height:3px;background:var(--red);}
  .value{color:var(--ink);font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
  .bullets{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px;}
  .bullets li{
    background:var(--red);color:#fff;border-radius:999px;padding:10px 18px;
    font-size:13.5px;font-weight:800;
  }

  footer{text-align:center;padding:22px;color:var(--sub);font-size:12px;border-top:1px solid var(--line);letter-spacing:.04em;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--red);color:var(--red);}
  .cta-book{background:var(--red-dark);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:760px){
    .hero{padding:26px 22px 36px;}
    .hero-main{grid-template-columns:1fr;text-align:center;padding:22px 0 0;}
    .photo{order:1;width:100%;aspect-ratio:16/9;height:auto;font-size:38px;}
    .hero-text{order:2;}
    .name-rule{margin:14px auto;}
    .catch{margin-left:auto;margin-right:auto;}
    .name{font-size:25px;}
    .wrap{padding:34px 22px 56px;}
    .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
  }
`;
const CSS_3A = `
  :root{
    --coral:#F0805E;
    --coral-soft:#FDE7DE;
    --cream:#FFF8F1;
    --ink:#4A3F3A;
    --sub:#B0A29A;
    --line:#F3E4D8;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--cream);font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--coral);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:999px;z-index:10;}
  .wrap{max-width:920px;margin:0 auto;padding:40px 20px 64px;}
  .card{background:#fff;border-radius:28px;box-shadow:0 18px 44px rgba(240,128,94,.12);overflow:hidden;}

  .header{background:linear-gradient(135deg,var(--coral-soft),#FFF3EC);padding:40px 40px 34px;text-align:center;}
  .brand{max-width:140px;max-height:36px;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto 18px;}
  .photo{
    width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto;border:5px solid #fff;
    box-shadow:0 10px 26px rgba(240,128,94,.28);
    display:flex;align-items:center;justify-content:center;background:var(--coral);color:#fff;font-size:52px;font-weight:800;
  }
  .name{margin:18px 0 0;font-size:26px;font-weight:800;color:var(--ink);}
  .role-pill{
    display:inline-block;margin-top:10px;background:#fff;color:var(--coral);font-size:13px;font-weight:700;
    padding:7px 18px;border-radius:999px;
  }

  .bubble{
    margin:26px 40px 0;background:var(--coral-soft);border-radius:18px;padding:24px 24px 20px 42px;
    font-size:15px;line-height:1.85;color:var(--ink);position:relative;
  }
  .bubble::before{content:"“";position:absolute;left:12px;top:2px;font-size:40px;line-height:1;color:var(--coral);opacity:.55;font-weight:900;font-family:Georgia,serif;}

  .body{padding:34px 40px 40px;}
  .block{padding:22px 0;}
  .block + .block{border-top:1px dashed var(--line);}
  .block-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:800;color:var(--coral);}
  .block-title .ico{width:20px;height:20px;border-radius:50%;background:var(--coral-soft);display:inline-flex;align-items:center;justify-content:center;font-size:11px;}
  .block-body{font-size:15px;line-height:1.9;color:var(--ink);white-space:pre-wrap;}

  .ach-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
  .ach-list li{
    display:flex;align-items:center;gap:10px;background:#FFF9F5;border:1px solid var(--line);
    border-radius:12px;padding:12px 16px;font-size:14.5px;color:var(--ink);
  }
  .ach-list li::before{content:"🎗️";font-size:14px;}

  footer{text-align:center;padding:26px 0 0;color:var(--sub);font-size:12px;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:920px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--coral);color:var(--coral);}
  .cta-book{background:var(--coral);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:700px){
    .header{padding:32px 24px 26px;}
    .bubble{margin:22px 20px 0;}
    .body{padding:26px 20px 32px;}
  }
`;
const CSS_3B = `
  :root{
    --coral:#6C5CE7;
    --coral-soft:#F1EEFB;
    --cream:#FBFAFF;
    --ink:#4A4458;
    --sub:#A79FC0;
    --line:#EDE9F7;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--cream);font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--coral);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:999px;z-index:10;}
  .wrap{max-width:920px;margin:0 auto;padding:40px 20px 64px;}
  .card{background:#fff;border-radius:28px;box-shadow:0 18px 44px rgba(108,92,231,.14);overflow:hidden;}

  .header{background:linear-gradient(135deg,var(--coral-soft),#F7F5FD);padding:40px 40px 34px;text-align:center;}
  .brand{max-width:140px;max-height:36px;width:auto;height:auto;object-fit:contain;display:block;margin:0 auto 18px;}
  .photo{
    width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto;border:5px solid #fff;
    box-shadow:0 10px 26px rgba(108,92,231,.30);
    display:flex;align-items:center;justify-content:center;background:var(--coral);color:#fff;font-size:52px;font-weight:800;
  }
  .name{margin:18px 0 0;font-size:26px;font-weight:800;color:var(--ink);}
  .role-pill{
    display:inline-block;margin-top:10px;background:#fff;color:var(--coral);font-size:13px;font-weight:700;
    padding:7px 18px;border-radius:999px;
  }

  .bubble{
    margin:26px 40px 0;background:var(--coral-soft);border-radius:18px;padding:24px 24px 20px 42px;
    font-size:15px;line-height:1.85;color:var(--ink);position:relative;
  }
  .bubble::before{content:"“";position:absolute;left:12px;top:2px;font-size:40px;line-height:1;color:var(--coral);opacity:.55;font-weight:900;font-family:Georgia,serif;}

  .body{padding:34px 40px 40px;}
  .block{padding:22px 0;}
  .block + .block{border-top:1px dashed var(--line);}
  .block-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:800;color:var(--coral);}
  .block-title .ico{width:20px;height:20px;border-radius:50%;background:var(--coral-soft);display:inline-flex;align-items:center;justify-content:center;font-size:11px;}
  .block-body{font-size:15px;line-height:1.9;color:var(--ink);white-space:pre-wrap;}

  .ach-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
  .ach-list li{
    display:flex;align-items:center;gap:10px;background:#F9F8FE;border:1px solid var(--line);
    border-radius:12px;padding:12px 16px;font-size:14.5px;color:var(--ink);
  }
  .ach-list li::before{content:"🎗️";font-size:14px;}

  footer{text-align:center;padding:26px 0 0;color:var(--sub);font-size:12px;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:920px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--coral);color:var(--coral);}
  .cta-book{background:var(--coral);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:700px){
    .header{padding:32px 24px 26px;}
    .bubble{margin:22px 20px 0;}
    .body{padding:26px 20px 32px;}
  }
`;
const CSS_4A = `
  :root{
    --accent:#0F766E;
    --accent-soft:#E4F3F1;
    --ink:#111318;
    --sub:#767B87;
    --line:#EAEBEF;
    --bg:#F2F4F3;
    --card:#FFFFFF;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--accent);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:6px;z-index:10;}

  .page{max-width:800px;margin:0 auto;padding:56px 20px 64px;}
  .card{
    background:var(--card);border-radius:3px;border:1px solid var(--accent);
    box-shadow:0 30px 60px -24px rgba(17,19,24,.16);overflow:hidden;
  }

  nav{display:flex;align-items:center;padding:24px 48px;border-bottom:1px solid var(--line);}
  .brand-group{display:flex;align-items:center;gap:14px;}
  .brand{max-width:150px;max-height:38px;width:auto;height:auto;object-fit:contain;display:block;}
  .tag{font-size:11px;color:var(--sub);letter-spacing:.1em;padding-left:14px;border-left:1px solid var(--line);}

  .hero{padding:48px 48px 40px;display:grid;grid-template-columns:220px 1fr;gap:44px;align-items:center;}
  .photo{
    width:220px;height:220px;border-radius:50%;object-fit:cover;
    display:flex;align-items:center;justify-content:center;
    background:var(--accent-soft);color:var(--accent);font-size:60px;font-weight:700;
    box-shadow:0 18px 36px rgba(17,19,24,.08);
  }
  .eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;margin:0 0 14px;}
  .name{margin:0;font-size:33px;font-weight:700;letter-spacing:-.02em;line-height:1.3;}
  .role{margin:10px 0 0;font-size:15px;color:var(--sub);font-weight:600;}
  .catch{
    position:relative;display:inline-block;margin:26px 0 0;padding:16px 20px;max-width:480px;
    background:var(--accent-soft);color:var(--ink);border-radius:12px;
    font-size:15px;line-height:1.8;font-weight:500;
  }
  .catch::before{
    content:"";position:absolute;left:-8px;top:22px;width:0;height:0;
    border-style:solid;border-width:8px 10px 8px 0;
    border-color:transparent var(--accent-soft) transparent transparent;
  }

  .section{padding:32px 48px;border-top:1px solid var(--line);}
  .section-title{
    display:inline-flex;align-items:center;gap:10px;
    font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);
    margin:0 0 18px;padding-bottom:10px;border-bottom:1.5px solid var(--accent);
  }
  .section-icon{width:18px;height:18px;flex-shrink:0;}
  .section-body{font-size:15.5px;line-height:1.95;color:var(--ink);white-space:pre-wrap;}

  .ach-list{list-style:none;margin:4px 0 0;padding:0;}
  .ach-list li{
    position:relative;padding:14px 0 14px 20px;font-size:14.5px;color:var(--ink);line-height:1.7;
    border-top:1px solid var(--line);
  }
  .ach-list li:first-child{border-top:none;padding-top:2px;}
  .ach-list li::before{content:"";position:absolute;left:0;top:23px;width:7px;height:1px;background:var(--accent);}

  footer{text-align:center;padding:32px 48px 40px;color:var(--sub);font-size:12px;letter-spacing:.04em;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:960px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--accent);color:var(--accent);}
  .cta-book{background:var(--accent);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:700px){
    .page{padding:32px 12px 48px;}
    .card{border-radius:3px;}
    nav{padding:20px 24px;}
    .hero{grid-template-columns:1fr;text-align:center;padding:36px 24px 32px;}
    .photo{margin:0 auto;width:160px;height:160px;font-size:48px;}
    .catch{margin-left:auto;margin-right:auto;}
    .catch::before{left:50%;top:-8px;transform:translateX(-50%);border-width:0 8px 10px 8px;border-color:transparent transparent var(--accent-soft) transparent;}
    .name{font-size:26px;}
    .section{padding:24px 24px;}
    footer{padding:24px 24px 32px;}
  }
`;
const CSS_4B = `
  :root{
    --accent:#C1633A;
    --accent-soft:#F7E7DE;
    --ink:#2A2420;
    --sub:#8C8078;
    --line:#EFE6DE;
    --bg:#F7F2EE;
    --card:#FFFFFF;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:var(--ink);padding-bottom:92px;}
  .badge{position:fixed;top:14px;right:14px;background:var(--accent);color:#fff;font-size:12px;font-weight:700;letter-spacing:.04em;padding:6px 14px;border-radius:6px;z-index:10;}

  .page{max-width:800px;margin:0 auto;padding:56px 20px 64px;}
  .card{
    background:var(--card);border-radius:3px;border:1px solid var(--accent);
    box-shadow:0 30px 60px -24px rgba(17,19,24,.16);overflow:hidden;
  }

  nav{display:flex;align-items:center;padding:24px 48px;border-bottom:1px solid var(--line);}
  .brand-group{display:flex;align-items:center;gap:14px;}
  .brand{max-width:150px;max-height:38px;width:auto;height:auto;object-fit:contain;display:block;}
  .tag{font-size:11px;color:var(--sub);letter-spacing:.1em;padding-left:14px;border-left:1px solid var(--line);}

  .hero{padding:48px 48px 40px;display:grid;grid-template-columns:220px 1fr;gap:44px;align-items:center;}
  .photo{
    width:220px;height:220px;border-radius:50%;object-fit:cover;
    display:flex;align-items:center;justify-content:center;
    background:var(--accent-soft);color:var(--accent);font-size:60px;font-weight:700;
    box-shadow:0 18px 36px rgba(17,19,24,.08);
  }
  .eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;margin:0 0 14px;}
  .name{margin:0;font-size:33px;font-weight:700;letter-spacing:-.02em;line-height:1.3;}
  .role{margin:10px 0 0;font-size:15px;color:var(--sub);font-weight:600;}
  .catch{
    position:relative;display:inline-block;margin:26px 0 0;padding:16px 20px;max-width:480px;
    background:var(--accent-soft);color:var(--ink);border-radius:12px;
    font-size:15px;line-height:1.8;font-weight:500;
  }
  .catch::before{
    content:"";position:absolute;left:-8px;top:22px;width:0;height:0;
    border-style:solid;border-width:8px 10px 8px 0;
    border-color:transparent var(--accent-soft) transparent transparent;
  }

  .section{padding:32px 48px;border-top:1px solid var(--line);}
  .section-title{
    display:inline-flex;align-items:center;gap:10px;
    font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);
    margin:0 0 18px;padding-bottom:10px;border-bottom:1.5px solid var(--accent);
  }
  .section-icon{width:18px;height:18px;flex-shrink:0;}
  .section-body{font-size:15.5px;line-height:1.95;color:var(--ink);white-space:pre-wrap;}

  .ach-list{list-style:none;margin:4px 0 0;padding:0;}
  .ach-list li{
    position:relative;padding:14px 0 14px 20px;font-size:14.5px;color:var(--ink);line-height:1.7;
    border-top:1px solid var(--line);
  }
  .ach-list li:first-child{border-top:none;padding-top:2px;}
  .ach-list li::before{content:"";position:absolute;left:0;top:23px;width:7px;height:1px;background:var(--accent);}

  footer{text-align:center;padding:32px 48px 40px;color:var(--sub);font-size:12px;letter-spacing:.04em;}

  /* ── 予約CTAバー（共通） ── */
  .cta-bar{
    position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
    box-shadow:0 -8px 24px rgba(0,0,0,.10);
    padding:10px 20px calc(10px + env(safe-area-inset-bottom));
  }
  .cta-bar-inner{max-width:960px;margin:0 auto;display:flex;gap:10px;}
  .cta-tel,.cta-book{
    flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
    height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
  }
  .cta-tel{background:#fff;border:1.5px solid var(--accent);color:var(--accent);}
  .cta-book{background:var(--accent);color:#fff;}
  @media (max-width:600px){
    .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
    .cta-tel,.cta-book{height:44px;font-size:13px;}
  }

  @media (max-width:700px){
    .page{padding:32px 12px 48px;}
    .card{border-radius:3px;}
    nav{padding:20px 24px;}
    .hero{grid-template-columns:1fr;text-align:center;padding:36px 24px 32px;}
    .photo{margin:0 auto;width:160px;height:160px;font-size:48px;}
    .catch{margin-left:auto;margin-right:auto;}
    .catch::before{left:50%;top:-8px;transform:translateX(-50%);border-width:0 8px 10px 8px;border-color:transparent transparent var(--accent-soft) transparent;}
    .name{font-size:26px;}
    .section{padding:24px 24px;}
    footer{padding:24px 24px 32px;}
  }
`;

// ロゴ画像 → 会社名テキスト置換用の追記CSS（原本CSSは無改変のまま、後ろに足す）
const LOGO_CSS = {
  "1a": `  .logo-text{flex-shrink:0;font-size:16px;font-weight:800;letter-spacing:.08em;color:var(--navy);border:1.5px solid var(--line);background:#fff;border-radius:4px;padding:12px 20px;}`,
  "1b": `  .logo-text{flex-shrink:0;font-size:16px;font-weight:800;letter-spacing:.08em;color:var(--navy);border:1.5px solid var(--line);background:#fff;border-radius:4px;padding:12px 20px;}`,
  "2a": `  .logo-text{display:block;line-height:1.4;font-size:14px;font-weight:900;letter-spacing:.04em;color:var(--blue);}`,
  "2b": `  .logo-text{display:block;line-height:1.4;font-size:14px;font-weight:900;letter-spacing:.04em;color:var(--red);}`,
  "3a": `  .brand-text{margin:0 auto 18px;font-size:15px;font-weight:900;color:var(--ink);letter-spacing:.06em;}`,
  "3b": `  .brand-text{margin:0 auto 18px;font-size:15px;font-weight:900;color:var(--ink);letter-spacing:.06em;}`,
  "4a": `  .brand-text{font-size:16px;font-weight:800;color:var(--ink);letter-spacing:.04em;}`,
  "4b": `  .brand-text{font-size:16px;font-weight:800;color:var(--ink);letter-spacing:.04em;}`,
};

const CSS = {
  "1a": CSS_1A, "1b": CSS_1B,
  "2a": CSS_2A, "2b": CSS_2B,
  "3a": CSS_3A, "3b": CSS_3B,
  "4a": CSS_4A, "4b": CSS_4B,
};

// ==========================================
// 本文マークアップ（原本の構造・インデントを踏襲。差分は冒頭コメントの5点のみ）
// ==========================================

// テンプレート1｜高級・信頼
function body1(d) {
  const L = [];
  L.push(`  <div class="top-line"></div>`);
  L.push(`  <div class="wrap">`);
  L.push(`    <header>`);
  L.push(`      <span class="logo-text">${T(d.companyName)}</span>`);
  L.push(`      <div>`);
  L.push(`        <p class="head-sub">Staff Introduction</p>`);
  L.push(`        <h1 class="head-title"><span class="nm">${T(d.fullName)}</span> があなたを担当します</h1>`);
  L.push(`      </div>`);
  L.push(`    </header>`);
  L.push(`    <div class="divider"></div>`);
  L.push(``);
  L.push(`    <div class="body">`);
  L.push(`      <div class="sec-head">`);
  L.push(`        <span class="sec-dot"></span>`);
  L.push(`        <h2 class="sec-title">私のプロフィール</h2>`);
  L.push(`      </div>`);
  L.push(`      <div class="sec-rule"></div>`);
  L.push(``);
  L.push(`      <div class="grid">`);
  L.push(`        <div class="photo-wrap">`);
  L.push(photoTag(d, 10, "photo"));
  L.push(`          <div class="photo-frame"></div>`);
  if (d.catchphrase) L.push(`          <p class="catch">${T(d.catchphrase)}</p>`);
  L.push(`        </div>`);
  L.push(``);
  L.push(`        <div class="rows">`);
  L.push(`          <div class="row"><div class="label">名前</div><div class="value">${T(d.fullName)}</div></div>`);
  if (d.role) L.push(`          <div class="row"><div class="label">肩書</div><div class="value">${T(d.role)}</div></div>`);
  if (d.bio) L.push(`          <div class="row"><div class="label">自己紹介</div><div class="value">${T(d.bio)}</div></div>`);
  if (d.career) L.push(`          <div class="row"><div class="label">経歴</div><div class="value">${T(d.career)}</div></div>`);
  if (d.achievements.length > 0) {
    L.push(`          <div class="row">`);
    L.push(`            <div class="label">実績</div>`);
    L.push(`            <ul class="bullets">`);
    d.achievements.forEach((a) => L.push(`              <li>${T(a)}</li>`));
    L.push(`            </ul>`);
    L.push(`          </div>`);
  }
  L.push(`        </div>`);
  L.push(`      </div>`);
  L.push(`    </div>`);
  L.push(`    <footer>© ${T(d.companyName)}.</footer>`);
  L.push(`  </div>`);
  if (hasCta(d)) { L.push(``); L.push(ctaHtml(d)); }
  return L.join("\n");
}

// テンプレート2｜爽やか・明るい（2bのみ name-rule あり）
function body2(d, tid) {
  const isB = tid === "2b";
  const L = [];
  L.push(`  <div class="hero">`);
  L.push(`    <div class="hero-inner">`);
  L.push(`      <span class="logo-badge"><span class="logo-text">${T(d.companyName)}</span></span>`);
  L.push(`      <div class="hero-main">`);
  L.push(photoTag(d, 8, "photo"));
  L.push(`        <div class="hero-text">`);
  L.push(`          <p class="eyebrow">Staff Introduction</p>`);
  L.push(`          <h1 class="name">${T(d.fullName)}</h1>`);
  if (isB) L.push(`          <div class="name-rule"></div>`);
  if (d.role) L.push(`          <p class="role">${T(d.role)}</p>`);
  if (d.catchphrase) L.push(`          <p class="catch">${T(d.catchphrase)}</p>`);
  L.push(`        </div>`);
  L.push(`      </div>`);
  L.push(`    </div>`);
  L.push(`  </div>`);
  L.push(``);
  L.push(`  <div class="wrap">`);
  if (d.bio) L.push(`    <div class="row"><div class="label">自己紹介</div><div class="value">${T(d.bio)}</div></div>`);
  if (d.career) L.push(`    <div class="row"><div class="label">経歴</div><div class="value">${T(d.career)}</div></div>`);
  if (d.achievements.length > 0) {
    L.push(`    <div class="row">`);
    L.push(`      <div class="label">実績</div>`);
    L.push(`      <ul class="bullets">`);
    d.achievements.forEach((a) => L.push(`        <li>${T(a)}</li>`));
    L.push(`      </ul>`);
    L.push(`    </div>`);
  }
  L.push(`  </div>`);
  L.push(`  <footer>© ${T(d.companyName)}.</footer>`);
  if (hasCta(d)) { L.push(``); L.push(ctaHtml(d)); }
  return L.join("\n");
}

// テンプレート3｜親しみ・優しい
function body3(d) {
  const L = [];
  L.push(`  <div class="wrap">`);
  L.push(`    <div class="card">`);
  L.push(`      <div class="header">`);
  L.push(`        <p class="brand-text">${T(d.companyName)}</p>`);
  L.push(photoTag(d, 8, "photo"));
  L.push(`        <h1 class="name">${T(d.fullName)}</h1>`);
  if (d.role) L.push(`        <span class="role-pill">${T(d.role)}</span>`);
  L.push(`      </div>`);
  L.push(``);
  if (d.catchphrase) {
    L.push(`      <div class="bubble">${T(d.catchphrase)}</div>`);
    L.push(``);
  }
  L.push(`      <div class="body">`);
  const blocks = [];
  if (d.bio) {
    blocks.push([
      `        <div class="block">`,
      `          <p class="block-title"><span class="ico">😊</span>自己紹介</p>`,
      `          <p class="block-body">${T(d.bio)}</p>`,
      `        </div>`,
    ]);
  }
  if (d.career) {
    blocks.push([
      `        <div class="block">`,
      `          <p class="block-title"><span class="ico">📖</span>経歴</p>`,
      `          <p class="block-body">${T(d.career)}</p>`,
      `        </div>`,
    ]);
  }
  if (d.achievements.length > 0) {
    const b = [
      `        <div class="block">`,
      `          <p class="block-title"><span class="ico">🏆</span>実績</p>`,
      `          <ul class="ach-list">`,
    ];
    d.achievements.forEach((a) => b.push(`            <li>${T(a)}</li>`));
    b.push(`          </ul>`, `        </div>`);
    blocks.push(b);
  }
  blocks.forEach((b) => L.push(...b));
  L.push(`      </div>`);
  L.push(`    </div>`);
  L.push(`    <footer>© ${T(d.companyName)}.</footer>`);
  L.push(`  </div>`);
  if (hasCta(d)) { L.push(``); L.push(ctaHtml(d)); }
  return L.join("\n");
}

// テンプレート4｜シンプル・洗練（SVGアイコンは原本の記述をそのまま使用）
const T4_SVG = {
  bio: `<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"></path></svg>`,
  career: `<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v4h4"></path><path d="M9 12h6M9 15.5h6M9 9h2"></path></svg>`,
  ach: `<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a2 2 0 0 0 2 4"></path><path d="M16 5h3a2 2 0 0 1-2 4"></path><path d="M12 13v3"></path><path d="M9 20h6"></path><path d="M10 16.5h4l.5 3H9.5l.5-3z"></path></svg>`,
};

function body4(d) {
  const L = [];
  L.push(`  <div class="page">`);
  L.push(`    <div class="card">`);
  L.push(`      <nav>`);
  L.push(`        <div class="brand-group">`);
  L.push(`          <span class="brand-text">${T(d.companyName)}</span>`);
  L.push(`          <div class="tag">STAFF INTRODUCTION</div>`);
  L.push(`        </div>`);
  L.push(`      </nav>`);
  L.push(``);
  L.push(`      <section class="hero">`);
  L.push(photoTag(d, 8, "photo"));
  L.push(`        <div>`);
  L.push(`          <p class="eyebrow">この担当者があなたをサポートします</p>`);
  L.push(`          <h1 class="name">${T(d.fullName)}</h1>`);
  if (d.role) L.push(`          <p class="role">${T(d.role)}</p>`);
  if (d.catchphrase) L.push(`          <p class="catch">${T(d.catchphrase)}</p>`);
  L.push(`        </div>`);
  L.push(`      </section>`);
  if (d.bio) {
    L.push(``);
    L.push(`      <section class="section">`);
    L.push(`        <p class="section-title">${T4_SVG.bio}自己紹介</p>`);
    L.push(`        <p class="section-body">${T(d.bio)}</p>`);
    L.push(`      </section>`);
  }
  if (d.career) {
    L.push(``);
    L.push(`      <section class="section">`);
    L.push(`        <p class="section-title">${T4_SVG.career}経歴</p>`);
    L.push(`        <p class="section-body">${T(d.career)}</p>`);
    L.push(`      </section>`);
  }
  if (d.achievements.length > 0) {
    L.push(``);
    L.push(`      <section class="section">`);
    L.push(`        <p class="section-title">${T4_SVG.ach}実績</p>`);
    L.push(`        <ul class="ach-list">`);
    d.achievements.forEach((a) => L.push(`          <li>${T(a)}</li>`));
    L.push(`        </ul>`);
    L.push(`      </section>`);
  }
  L.push(``);
  L.push(`      <footer>© ${T(d.companyName)}.</footer>`);
  L.push(`    </div>`);
  L.push(`  </div>`);
  if (hasCta(d)) { L.push(``); L.push(ctaHtml(d)); }
  return L.join("\n");
}

const BODY = {
  "1a": body1, "1b": body1,
  "2a": body2, "2b": body2,
  "3a": body3, "3b": body3,
  "4a": body4, "4b": body4,
};

// ==========================================
// HTML文書の生成と描画コンポーネント
// ==========================================

/**
 * テンプレートHTML文書（サンプルHTMLと同一構造）を生成する
 * @param {string} id - テンプレートID（1a〜4b。不正値は1aに補正）
 * @param {object} d - 表示データ（fullName/initial/role/photoUrl/catchphrase/bio/career/achievements[]/companyName/cta{phone,bookingUrl}）
 */
export function memberTemplateHtml(id, d) {
  const tid = normalizeTemplateId(id);
  const cta = hasCta(d);
  let css = CSS[tid];
  css += `  /* ── SMOOSy追加：ロゴ画像→会社名テキスト置換（上記の原本CSSは無改変） ── */\n`;
  css += LOGO_CSS[tid] + `\n`;
  if (!cta) {
    css += `  /* ── SMOOSy追加：CTAバー非表示時は下余白も外す ── */\n`;
    css += `  body{padding-bottom:0;}\n`;
  }
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${T(d.fullName)}｜${T(d.companyName)}</title>
<style>${css}</style>
</head>
<body>
${BODY[tid](d, tid)}
</body>
</html>
`;
}

/**
 * テンプレート描画本体（iframe srcDoc）
 * @param {string}  id   - テンプレートID
 * @param {object}  d    - 表示データ
 * @param {boolean} page - true: 公開ページとして画面全体に固定表示 / false: 親要素いっぱいに描画
 */
export function MemberTemplate({ id, d, page = false }) {
  const tid = normalizeTemplateId(id);
  const frame = (
    <iframe
      title={`member-template-${tid}`}
      srcDoc={memberTemplateHtml(tid, d)}
      style={{ border: 0, display: "block", width: "100%", height: "100%", background: "#fff" }}
    />
  );
  if (page) {
    return <div style={{ position: "fixed", inset: 0 }}>{frame}</div>;
  }
  return frame;
}

/**
 * 縮小サムネイル（デスクトップ幅1040pxのiframeを transform: scale で縮小）
 * width に数値を渡すと固定幅、省略すると親要素の実幅を計測して追従する。
 * メディアクエリはiframe幅（1040px）に反応するため、常にPCレイアウトのプレビューになる。
 */
export function TemplatePreviewThumb({ id, width, height = 150, companyName, style }) {
  const BASE = 1040;
  const ref = React.useRef(null);
  const [w, setW] = React.useState(typeof width === "number" ? width : 0);

  React.useLayoutEffect(() => {
    if (typeof width === "number") { setW(width); return; }
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width]);

  const scale = w > 0 ? w / BASE : 0;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        width: typeof width === "number" ? width : "100%",
        height, overflow: "hidden", position: "relative",
        borderRadius: 8, border: "1px solid #E7E7EC", background: "#fff",
        pointerEvents: "none", userSelect: "none", flexShrink: 0,
        ...style,
      }}
    >
      {scale > 0 && (
        <div style={{ width: BASE, height: height / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <MemberTemplate id={id} d={SAMPLE_MEMBER(companyName)} />
        </div>
      )}
    </div>
  );
}