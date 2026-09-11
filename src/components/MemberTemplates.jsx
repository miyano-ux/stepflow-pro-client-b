import React from "react";

// ==========================================
// 🎨 MemberTemplates - スタッフ紹介ページ テンプレート集（8種）
// ==========================================
// 提供されたサンプルHTML（template-1a〜4b）のCSS・DOM構造を「そのまま」移植したもの。
// 変更点は以下の4つのみ（それ以外のスタイル値・構造は原本と同一）：
//   1. 右上の比較用バッジ（.badge）を削除（サンプル閲覧用のため）
//   2. ロゴ画像（images/dummy-logo.svg）→ 会社名テキストに置換（末尾に置換用CSSを追記）
//   3. ダミーデータ → 実データ注入（空のフィールドは行ごと非表示）
//   4. CTAバーは電話番号・予約URLのどちらかが設定されている場合のみ表示
//      （非表示時は body 相当の padding-bottom:92px も外す）
//
// 同一画面に複数テンプレートを同時描画（選択画面・プレビュー）してもスタイルが
// 衝突しないよう、原本の :root / body を「.tplv-{id}」スコープに置き換えている。
// セレクタは全て「${s} 」プレフィックス付きで原本の宣言をそのまま保持する。
//
// 利用側：
//   <MemberTemplate id="1a" d={data} page />   … 公開ページ（min-height:100vh 付与）
//   <MemberTemplate id="1a" d={SAMPLE_MEMBER(会社名)} /> … サンプル描画
//   <TemplatePreviewThumb id="1a" width={200} /> … 縮小サムネイル

export const TEMPLATE_IDS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b"];

// テンプレートIDの正規化（"1-A" "1A" 等の表記ゆれを吸収し、不正値は既定の 1a に落とす）
export const normalizeTemplateId = (raw) => {
  const v = String(raw || "").trim().toLowerCase().replace(/[^0-9ab]/g, "");
  return TEMPLATE_IDS.includes(v) ? v : "1a";
};

// "1a" → "1-A" 表示用
export const templateDisplayId = (id) => `${id[0]}-${id[1].toUpperCase()}`;

// テンプレート選択画面・フォーム表示用メタ情報（文言は index.html 準拠）
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
  cta: { phone: "03-1234-5678", bookingUrl: "#" },
});

const hasCta = (d) => !!(d.cta && (d.cta.phone || d.cta.bookingUrl));

// ==========================================
// 共通：CTAバー（原本の .cta-bar CSS はテンプレート側スコープに含む）
// ==========================================
function CtaBarBody({ d }) {
  if (!hasCta(d)) return null;
  const telHref = "tel:" + String(d.cta.phone || "").replace(/[^\d+]/g, "");
  return (
    <div className="cta-bar">
      <div className="cta-bar-inner">
        {d.cta.phone && (
          <a className="cta-tel" href={telHref}>
            <span aria-hidden="true">📞</span>{d.cta.phone}
          </a>
        )}
        {d.cta.bookingUrl && (
          <a className="cta-book" href={d.cta.bookingUrl} target="_blank" rel="noreferrer">
            <span aria-hidden="true">📅</span>予約日時を選択
          </a>
        )}
      </div>
    </div>
  );
}

// ==========================================
// テンプレート1｜高級・信頼（1a ゴールド / 1b ネイビー）
// 原本: template-1a-elegant-gold.html / template-1b-elegant-blue.html
// 差分は :root 変数と3箇所（top-line中間色 / .photo プレースホルダ配色 / .cta-book 文字色）のみ。
// ==========================================
const T1_VARS = {
  "1a": {
    gold: "#C6A15B", navy: "#1F2937", navySoft: "#3D4759", ink: "#2B2B2B",
    sub: "#8B8F98", line: "#E7E2D8", bgCream: "#FBF9F5",
    topMid: "#DCC488",
    photoBg: "linear-gradient(155deg,#EFE7D4,#DCC488)", photoColor: "#1F2937",
    bookColor: "#1F2937",
  },
  "1b": {
    gold: "#2563EB", navy: "#0B1E39", navySoft: "#35507A", ink: "#1B2430",
    sub: "#7A8598", line: "#E4E9F2", bgCream: "#F7F9FC",
    topMid: "#8FC7FF",
    photoBg: "linear-gradient(155deg,#0B1E39,#2563EB)", photoColor: "#fff",
    bookColor: "#fff",
  },
};

const css1 = (s, v) => `
${s}{margin:0;background:${v.bgCream};font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${v.ink};}
${s} *{box-sizing:border-box;}
${s} .top-line{height:5px;background:linear-gradient(90deg,${v.gold},${v.topMid},${v.gold});}
${s} .wrap{max-width:1040px;margin:0 auto;}
${s} header{display:flex;align-items:center;gap:28px;padding:44px 40px 34px;}
${s} .head-sub{color:${v.sub};font-size:12px;margin:0 0 8px;letter-spacing:.14em;text-transform:uppercase;}
${s} .head-title{margin:0;font-size:28px;font-weight:600;color:${v.navy};line-height:1.5;
  font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
${s} .head-title .nm{color:${v.gold};font-weight:700;}
${s} .divider{border-top:1px solid ${v.line};}
${s} .body{padding:52px 40px 80px;}
${s} .sec-head{display:flex;align-items:center;gap:16px;}
${s} .sec-dot{width:9px;height:9px;border-radius:50%;background:${v.gold};flex-shrink:0;}
${s} .sec-title{margin:0;font-size:24px;color:${v.navy};font-weight:600;letter-spacing:.1em;
  font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
${s} .sec-rule{height:1px;background:${v.line};margin:18px 0 0;position:relative;}
${s} .sec-rule::after{content:"";position:absolute;left:0;top:-1px;width:64px;height:2px;background:${v.gold};}
${s} .grid{display:grid;grid-template-columns:330px 1fr;gap:56px;margin-top:44px;align-items:start;}
${s} .photo-wrap{position:relative;}
${s} .photo{
  width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:2px;
  box-shadow:0 14px 34px rgba(31,41,55,.14);display:flex;align-items:center;justify-content:center;
  background:${v.photoBg};color:${v.photoColor};font-size:72px;font-weight:700;
}
${s} .photo-frame{position:absolute;inset:14px;border:1px solid rgba(255,255,255,.55);pointer-events:none;}
${s} .catch{margin-top:22px;padding:16px 20px;border-left:2px solid ${v.gold};color:${v.navySoft};
  font-size:14px;line-height:1.9;font-style:normal;background:#fff;}
${s} .rows{display:flex;flex-direction:column;}
${s} .row{display:grid;grid-template-columns:140px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
${s} .row + .row{border-top:1px solid ${v.line};}
${s} .label{color:${v.gold};font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding-top:2px;}
${s} .value{color:${v.ink};font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
${s} .bullets{list-style:none;margin:0;padding:0;}
${s} .bullets li{position:relative;padding-left:20px;color:${v.ink};font-size:15.5px;line-height:2;}
${s} .bullets li::before{content:"";position:absolute;left:0;top:11px;width:7px;height:1px;background:${v.gold};}
${s} footer{text-align:center;padding:26px;color:${v.sub};font-size:11.5px;letter-spacing:.08em;border-top:1px solid ${v.line};}

/* ── 予約CTAバー（共通） ── */
${s} .cta-bar{
  position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
  box-shadow:0 -8px 24px rgba(0,0,0,.10);
  padding:10px 20px calc(10px + env(safe-area-inset-bottom));
}
${s} .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
${s} .cta-tel,${s} .cta-book{
  flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
  height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
}
${s} .cta-tel{background:#fff;border:1.5px solid ${v.navy};color:${v.navy};}
${s} .cta-book{background:${v.gold};color:${v.bookColor};}
@media (max-width:600px){
  ${s} .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
  ${s} .cta-tel,${s} .cta-book{height:44px;font-size:13px;}
}
@media (max-width:760px){
  ${s} header{flex-direction:column;align-items:flex-start;gap:16px;padding:32px 22px 22px;}
  ${s} .head-title{font-size:22px;}
  ${s} .body{padding:36px 22px 60px;}
  ${s} .grid{grid-template-columns:1fr;gap:30px;}
  ${s} .photo-wrap{max-width:280px;margin:0 auto;}
  ${s} .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
}

/* ── ロゴ画像 → 会社名テキスト置換（原本 .logo の代替。ここのみ追記） ── */
${s} .logo-text{
  flex-shrink:0;font-size:16px;font-weight:800;letter-spacing:.08em;color:${v.navy};
  border:1.5px solid ${v.line};background:#fff;border-radius:4px;padding:12px 20px;
}
`;

function T1Body({ d }) {
  return (
    <>
      <div className="top-line" />
      <div className="wrap">
        <header>
          <span className="logo-text">{d.companyName}</span>
          <div>
            <p className="head-sub">Staff Introduction</p>
            <h1 className="head-title"><span className="nm">{d.fullName}</span> があなたを担当します</h1>
          </div>
        </header>
        <div className="divider" />

        <div className="body">
          <div className="sec-head">
            <span className="sec-dot" />
            <h2 className="sec-title">私のプロフィール</h2>
          </div>
          <div className="sec-rule" />

          <div className="grid">
            <div className="photo-wrap">
              {d.photoUrl ? (
                <img className="photo" src={d.photoUrl} alt={d.fullName} />
              ) : (
                <div className="photo">{d.initial}</div>
              )}
              <div className="photo-frame" />
              {d.catchphrase && <p className="catch">{d.catchphrase}</p>}
            </div>

            <div className="rows">
              <div className="row"><div className="label">名前</div><div className="value">{d.fullName}</div></div>
              {d.role && <div className="row"><div className="label">肩書</div><div className="value">{d.role}</div></div>}
              {d.bio && <div className="row"><div className="label">自己紹介</div><div className="value">{d.bio}</div></div>}
              {d.career && <div className="row"><div className="label">経歴</div><div className="value">{d.career}</div></div>}
              {d.achievements.length > 0 && (
                <div className="row">
                  <div className="label">実績</div>
                  <ul className="bullets">
                    {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <footer>© {d.companyName}.</footer>
      </div>
      <CtaBarBody d={d} />
    </>
  );
}

// ==========================================
// テンプレート2｜爽やか・明るい（2a ブルー / 2b レッド）
// 原本: template-2a-cool-mint.html / template-2b-cool-red.html
// 2a と 2b は配色に加え一部構造・装飾が異なる（写真枠 / name-rule / 実績のピル表示 等）。
// 原本それぞれの宣言を isB で切り替えてそのまま保持する。
// ==========================================
const T2_VARS = {
  "2a": {
    navy: "#0B3D66", main: "#209CFF", soft: "#E3F6FF", ice: "#68E0CF",
    ink: "#17303A", sub: "#71898F", line: "#DCEEF0", bg: "#F5FBFC",
    heroBg: `repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px),
      linear-gradient(125deg,#209CFF 0%,#68E0CF 100%)`,
    heroBefore: "radial-gradient(circle,rgba(104,224,207,.35),rgba(104,224,207,0) 70%)",
    heroAfter: "radial-gradient(circle,rgba(32,156,255,.30),rgba(32,156,255,0) 70%)",
    photoBg: "linear-gradient(155deg,#68E0CF,#209CFF)",
    eyebrow: "#68E0CF",
    bookBg: "#209CFF",
    isB: false,
  },
  "2b": {
    navy: "#2A1A16", main: "#F5323F", soft: "#FFEDE8", ice: "#FFE3D1",
    ink: "#2A1A16", sub: "#9A8580", line: "#F5E3DE", bg: "#FFFBFA",
    heroBg: `repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px),
      linear-gradient(125deg,#F5323F 0%,#F5323F 45%,#FF6A4D 100%)`,
    heroBefore: "radial-gradient(circle,rgba(255,255,255,.28),rgba(255,255,255,0) 70%)",
    heroAfter: "radial-gradient(circle,rgba(255,138,91,.35),rgba(255,138,91,0) 70%)",
    photoBg: "linear-gradient(155deg,#FF6A4D,#F5323F)",
    eyebrow: "#FFE3D1",
    bookBg: "#FF6A4D",
    isB: true,
  },
};

const css2 = (s, v) => `
${s}{margin:0;background:${v.bg};font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${v.ink};}
${s} *{box-sizing:border-box;}
${s} .hero{
  position:relative;overflow:hidden;padding:36px 40px 48px;
  background:${v.heroBg};
}
${s} .hero::before{
  content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;
  background:${v.heroBefore};
}
${s} .hero::after{
  content:"";position:absolute;left:-60px;bottom:-140px;width:260px;height:260px;border-radius:50%;
  background:${v.heroAfter};
}
${s} .hero-inner{position:relative;max-width:1040px;margin:0 auto;}
${s} .logo-badge{display:inline-block;background:#fff;border-radius:8px;padding:8px 14px;}
${s} .hero-main{display:grid;grid-template-columns:1fr 400px;gap:40px;align-items:center;padding:28px 0 0;}
${v.isB ? `
${s} .photo{
  order:2;width:100%;aspect-ratio:16/9;height:auto;object-fit:cover;border-radius:6px;
  border:4px solid #fff;box-shadow:0 18px 36px rgba(0,0,0,.35);
  display:flex;align-items:center;justify-content:center;background:${v.photoBg};
  color:#fff;font-size:52px;font-weight:900;
}
` : `
${s} .photo{
  order:2;width:100%;aspect-ratio:16/9;height:auto;border-radius:16px;object-fit:cover;
  border:3px solid rgba(255,255,255,.25);box-shadow:0 20px 40px rgba(0,0,0,.35);
  display:flex;align-items:center;justify-content:center;background:${v.photoBg};
  color:#fff;font-size:56px;font-weight:800;
}
`}
${s} .hero-text{order:1;padding-bottom:0;}
${v.isB
  ? `${s} .eyebrow{font-size:12px;font-weight:800;letter-spacing:.2em;color:${v.eyebrow};text-transform:uppercase;margin:0 0 10px;}`
  : `${s} .eyebrow{font-size:12px;font-weight:700;letter-spacing:.16em;color:${v.eyebrow};text-transform:uppercase;margin:0 0 10px;}`}
${v.isB
  ? `${s} .name{margin:0;font-size:34px;font-weight:900;color:#fff;letter-spacing:.02em;}`
  : `${s} .name{margin:0;font-size:32px;font-weight:800;color:#fff;letter-spacing:.01em;}`}
${s} .name-rule{width:56px;height:4px;background:#fff;margin:14px 0;}
${v.isB
  ? `${s} .role{margin:0;font-size:14.5px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:.04em;}`
  : `${s} .role{margin:10px 0 0;font-size:14.5px;color:rgba(255,255,255,.72);font-weight:600;}`}
${v.isB
  ? `${s} .catch{margin:16px 0 0;font-size:15px;color:rgba(255,255,255,.95);line-height:1.8;max-width:520px;font-weight:600;}`
  : `${s} .catch{margin:16px 0 0;font-size:15px;color:rgba(255,255,255,.9);line-height:1.8;max-width:520px;}`}

${s} .wrap{max-width:1040px;margin:0 auto;padding:44px 40px 70px;}
${s} .row{display:grid;grid-template-columns:150px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
${s} .row + .row{border-top:1px solid ${v.line};}
${v.isB ? `
${s} .label{display:flex;align-items:center;gap:8px;color:${v.main};font-weight:900;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px;}
${s} .label::before{content:"";width:16px;height:3px;background:${v.main};}
` : `
${s} .label{display:flex;align-items:center;gap:8px;color:${v.main};font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px;}
${s} .label::before{content:"";width:14px;height:2px;background:${v.main};}
`}
${s} .value{color:${v.ink};font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
${v.isB ? `
${s} .bullets{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px;}
${s} .bullets li{
  background:${v.main};color:#fff;border-radius:999px;padding:10px 18px;
  font-size:13.5px;font-weight:800;
}
` : `
${s} .bullets{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
${s} .bullets li{
  background:${v.soft};color:${v.navy};border-radius:8px;padding:12px 16px;
  font-size:14.5px;font-weight:600;border-left:3px solid ${v.main};
}
`}
${s} footer{text-align:center;padding:22px;color:${v.sub};font-size:12px;border-top:1px solid ${v.line};letter-spacing:.04em;}

/* ── 予約CTAバー（共通） ── */
${s} .cta-bar{
  position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
  box-shadow:0 -8px 24px rgba(0,0,0,.10);
  padding:10px 20px calc(10px + env(safe-area-inset-bottom));
}
${s} .cta-bar-inner{max-width:1040px;margin:0 auto;display:flex;gap:10px;}
${s} .cta-tel,${s} .cta-book{
  flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
  height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
}
${s} .cta-tel{background:#fff;border:1.5px solid ${v.main};color:${v.main};}
${s} .cta-book{background:${v.bookBg};color:#fff;}
@media (max-width:600px){
  ${s} .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
  ${s} .cta-tel,${s} .cta-book{height:44px;font-size:13px;}
}

@media (max-width:760px){
  ${s} .hero{padding:26px 22px 36px;}
  ${s} .hero-main{grid-template-columns:1fr;text-align:center;padding:22px 0 0;}
  ${s} .photo{order:1;width:100%;aspect-ratio:16/9;height:auto;font-size:${v.isB ? "38px" : "40px"};}
  ${s} .hero-text{order:2;padding-bottom:0;}
  ${s} .name-rule{margin:14px auto;}
  ${s} .catch{margin-left:auto;margin-right:auto;}
  ${s} .name{font-size:${v.isB ? "25px" : "24px"};}
  ${s} .wrap{padding:34px 22px 56px;}
  ${s} .row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
}

/* ── ロゴ画像 → 会社名テキスト置換（原本 .logo の代替。ここのみ追記） ── */
${s} .logo-text{display:block;font-size:14px;font-weight:900;color:${v.main};letter-spacing:.04em;line-height:1.4;}
`;

function T2Body({ d, v }) {
  return (
    <>
      <div className="hero">
        <div className="hero-inner">
          <span className="logo-badge"><span className="logo-text">{d.companyName}</span></span>
          <div className="hero-main">
            {d.photoUrl ? (
              <img className="photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="photo">{d.initial}</div>
            )}
            <div className="hero-text">
              <p className="eyebrow">Staff Introduction</p>
              <h1 className="name">{d.fullName}</h1>
              {v.isB && <div className="name-rule" />}
              {d.role && <p className="role">{d.role}</p>}
              {d.catchphrase && <p className="catch">{d.catchphrase}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        {d.bio && <div className="row"><div className="label">自己紹介</div><div className="value">{d.bio}</div></div>}
        {d.career && <div className="row"><div className="label">経歴</div><div className="value">{d.career}</div></div>}
        {d.achievements.length > 0 && (
          <div className="row">
            <div className="label">実績</div>
            <ul className="bullets">
              {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}
      </div>
      <footer>© {d.companyName}.</footer>
      <CtaBarBody d={d} />
    </>
  );
}

// ==========================================
// テンプレート3｜親しみ・優しい（3a コーラル / 3b パープル）
// 原本: template-3a-warm-coral.html / template-3b-warm-purple.html
// 差分は :root 変数とグラデーション・影・実績背景色のみ。構造は同一。
// ==========================================
const T3_VARS = {
  "3a": {
    coral: "#F0805E", coralSoft: "#FDE7DE", cream: "#FFF8F1", ink: "#4A3F3A",
    sub: "#B0A29A", line: "#F3E4D8",
    headerGrad: "linear-gradient(135deg,#FDE7DE,#FFF3EC)",
    cardShadow: "0 18px 44px rgba(240,128,94,.12)",
    photoShadow: "0 10px 26px rgba(240,128,94,.28)",
    achBg: "#FFF9F5",
  },
  "3b": {
    coral: "#6C5CE7", coralSoft: "#F1EEFB", cream: "#FBFAFF", ink: "#4A4458",
    sub: "#A79FC0", line: "#EDE9F7",
    headerGrad: "linear-gradient(135deg,#F1EEFB,#F7F5FD)",
    cardShadow: "0 18px 44px rgba(108,92,231,.14)",
    photoShadow: "0 10px 26px rgba(108,92,231,.30)",
    achBg: "#F9F8FE",
  },
};

const css3 = (s, v) => `
${s}{margin:0;background:${v.cream};font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${v.ink};}
${s} *{box-sizing:border-box;}
${s} .wrap{max-width:920px;margin:0 auto;padding:40px 20px 64px;}
${s} .card{background:#fff;border-radius:28px;box-shadow:${v.cardShadow};overflow:hidden;}

${s} .header{background:${v.headerGrad};padding:40px 40px 34px;text-align:center;}
${s} .photo{
  width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto;border:5px solid #fff;
  box-shadow:${v.photoShadow};
  display:flex;align-items:center;justify-content:center;background:${v.coral};color:#fff;font-size:52px;font-weight:800;
}
${s} .name{margin:18px 0 0;font-size:26px;font-weight:800;color:${v.ink};}
${s} .role-pill{
  display:inline-block;margin-top:10px;background:#fff;color:${v.coral};font-size:13px;font-weight:700;
  padding:7px 18px;border-radius:999px;
}

${s} .bubble{
  margin:26px 40px 0;background:${v.coralSoft};border-radius:18px;padding:24px 24px 20px 42px;
  font-size:15px;line-height:1.85;color:${v.ink};position:relative;
}
${s} .bubble::before{content:"“";position:absolute;left:12px;top:2px;font-size:40px;line-height:1;color:${v.coral};opacity:.55;font-weight:900;font-family:Georgia,serif;}

${s} .body{padding:34px 40px 40px;}
${s} .block{padding:22px 0;}
${s} .block + .block{border-top:1px dashed ${v.line};}
${s} .block-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:800;color:${v.coral};}
${s} .block-title .ico{width:20px;height:20px;border-radius:50%;background:${v.coralSoft};display:inline-flex;align-items:center;justify-content:center;font-size:11px;}
${s} .block-body{font-size:15px;line-height:1.9;color:${v.ink};white-space:pre-wrap;margin:0;}

${s} .ach-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
${s} .ach-list li{
  display:flex;align-items:center;gap:10px;background:${v.achBg};border:1px solid ${v.line};
  border-radius:12px;padding:12px 16px;font-size:14.5px;color:${v.ink};
}
${s} .ach-list li::before{content:"🎗️";font-size:14px;}

${s} footer{text-align:center;padding:26px 0 0;color:${v.sub};font-size:12px;}

/* ── 予約CTAバー（共通） ── */
${s} .cta-bar{
  position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
  box-shadow:0 -8px 24px rgba(0,0,0,.10);
  padding:10px 20px calc(10px + env(safe-area-inset-bottom));
}
${s} .cta-bar-inner{max-width:920px;margin:0 auto;display:flex;gap:10px;}
${s} .cta-tel,${s} .cta-book{
  flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
  height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
}
${s} .cta-tel{background:#fff;border:1.5px solid ${v.coral};color:${v.coral};}
${s} .cta-book{background:${v.coral};color:#fff;}
@media (max-width:600px){
  ${s} .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
  ${s} .cta-tel,${s} .cta-book{height:44px;font-size:13px;}
}

@media (max-width:700px){
  ${s} .header{padding:32px 24px 26px;}
  ${s} .bubble{margin:22px 20px 0;}
  ${s} .body{padding:26px 20px 32px;}
}

/* ── ロゴ画像 → 会社名テキスト置換（原本 .brand の代替。ここのみ追記） ── */
${s} .brand-text{display:block;margin:0 auto 18px;font-size:15px;font-weight:900;color:${v.ink};letter-spacing:.06em;}
`;

function T3Body({ d }) {
  return (
    <>
      <div className="wrap">
        <div className="card">
          <div className="header">
            <p className="brand-text">{d.companyName}</p>
            {d.photoUrl ? (
              <img className="photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="photo">{d.initial}</div>
            )}
            <h1 className="name">{d.fullName}</h1>
            {d.role && <span className="role-pill">{d.role}</span>}
          </div>

          {d.catchphrase && <div className="bubble">{d.catchphrase}</div>}

          <div className="body">
            {d.bio && (
              <div className="block">
                <p className="block-title"><span className="ico">😊</span>自己紹介</p>
                <p className="block-body">{d.bio}</p>
              </div>
            )}
            {d.career && (
              <div className="block">
                <p className="block-title"><span className="ico">📖</span>経歴</p>
                <p className="block-body">{d.career}</p>
              </div>
            )}
            {d.achievements.length > 0 && (
              <div className="block">
                <p className="block-title"><span className="ico">🏆</span>実績</p>
                <ul className="ach-list">
                  {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        <footer>© {d.companyName}.</footer>
      </div>
      <CtaBarBody d={d} />
    </>
  );
}

// ==========================================
// テンプレート4｜シンプル・洗練（4a グリーン / 4b ブラウン）
// 原本: template-4a-modern-teal.html / template-4b-modern-terracotta.html
// 差分は :root 変数のみ。構造・宣言は同一。
// ==========================================
const T4_VARS = {
  "4a": {
    accent: "#0F766E", accentSoft: "#E4F3F1", ink: "#111318", sub: "#767B87",
    line: "#EAEBEF", bg: "#F2F4F3", card: "#FFFFFF",
  },
  "4b": {
    accent: "#C1633A", accentSoft: "#F7E7DE", ink: "#2A2420", sub: "#8C8078",
    line: "#EFE6DE", bg: "#F7F2EE", card: "#FFFFFF",
  },
};

const css4 = (s, v) => `
${s}{margin:0;background:${v.bg};font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${v.ink};}
${s} *{box-sizing:border-box;}
${s} .page{max-width:800px;margin:0 auto;padding:56px 20px 64px;}
${s} .card{
  background:${v.card};border-radius:3px;border:1px solid ${v.accent};
  box-shadow:0 30px 60px -24px rgba(17,19,24,.16);overflow:hidden;
}

${s} nav{display:flex;align-items:center;padding:24px 48px;border-bottom:1px solid ${v.line};}
${s} .brand-group{display:flex;align-items:center;gap:14px;}
${s} .tag{font-size:11px;color:${v.sub};letter-spacing:.1em;padding-left:14px;border-left:1px solid ${v.line};}

${s} .hero{padding:48px 48px 40px;display:grid;grid-template-columns:220px 1fr;gap:44px;align-items:center;}
${s} .photo{
  width:220px;height:220px;border-radius:50%;object-fit:cover;
  display:flex;align-items:center;justify-content:center;
  background:${v.accentSoft};color:${v.accent};font-size:60px;font-weight:700;
  box-shadow:0 18px 36px rgba(17,19,24,.08);
}
${s} .eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.2em;color:${v.accent};text-transform:uppercase;margin:0 0 14px;}
${s} .name{margin:0;font-size:33px;font-weight:700;letter-spacing:-.02em;line-height:1.3;}
${s} .role{margin:10px 0 0;font-size:15px;color:${v.sub};font-weight:600;}
${s} .catch{
  position:relative;display:inline-block;margin:26px 0 0;padding:16px 20px;max-width:480px;
  background:${v.accentSoft};color:${v.ink};border-radius:12px;
  font-size:15px;line-height:1.8;font-weight:500;
}
${s} .catch::before{
  content:"";position:absolute;left:-8px;top:22px;width:0;height:0;
  border-style:solid;border-width:8px 10px 8px 0;
  border-color:transparent ${v.accentSoft} transparent transparent;
}

${s} .section{padding:32px 48px;border-top:1px solid ${v.line};}
${s} .section-title{
  display:inline-flex;align-items:center;gap:10px;
  font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${v.accent};
  margin:0 0 18px;padding-bottom:10px;border-bottom:1.5px solid ${v.accent};
}
${s} .section-icon{width:18px;height:18px;flex-shrink:0;}
${s} .section-body{font-size:15.5px;line-height:1.95;color:${v.ink};white-space:pre-wrap;margin:0;}

${s} .ach-list{list-style:none;margin:4px 0 0;padding:0;}
${s} .ach-list li{
  position:relative;padding:14px 0 14px 20px;font-size:14.5px;color:${v.ink};line-height:1.7;
  border-top:1px solid ${v.line};
}
${s} .ach-list li:first-child{border-top:none;padding-top:2px;}
${s} .ach-list li::before{content:"";position:absolute;left:0;top:23px;width:7px;height:1px;background:${v.accent};}

${s} footer{text-align:center;padding:32px 48px 40px;color:${v.sub};font-size:12px;letter-spacing:.04em;}

/* ── 予約CTAバー（共通） ── */
${s} .cta-bar{
  position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
  box-shadow:0 -8px 24px rgba(0,0,0,.10);
  padding:10px 20px calc(10px + env(safe-area-inset-bottom));
}
${s} .cta-bar-inner{max-width:960px;margin:0 auto;display:flex;gap:10px;}
${s} .cta-tel,${s} .cta-book{
  flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
  height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
}
${s} .cta-tel{background:#fff;border:1.5px solid ${v.accent};color:${v.accent};}
${s} .cta-book{background:${v.accent};color:#fff;}
@media (max-width:600px){
  ${s} .cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
  ${s} .cta-tel,${s} .cta-book{height:44px;font-size:13px;}
}

@media (max-width:700px){
  ${s} .page{padding:32px 12px 48px;}
  ${s} .card{border-radius:3px;}
  ${s} nav{padding:20px 24px;}
  ${s} .hero{grid-template-columns:1fr;text-align:center;padding:36px 24px 32px;}
  ${s} .photo{margin:0 auto;width:160px;height:160px;font-size:48px;}
  ${s} .catch{margin-left:auto;margin-right:auto;}
  ${s} .catch::before{left:50%;top:-8px;transform:translateX(-50%);border-width:0 8px 10px 8px;border-color:transparent transparent ${v.accentSoft} transparent;}
  ${s} .name{font-size:26px;}
  ${s} .section{padding:24px 24px;}
  ${s} footer{padding:24px 24px 32px;}
}

/* ── ロゴ画像 → 会社名テキスト置換（原本 .brand の代替。ここのみ追記） ── */
${s} .brand-text{font-size:16px;font-weight:800;color:${v.ink};letter-spacing:.04em;}
`;

function T4Body({ d }) {
  return (
    <>
      <div className="page">
        <div className="card">
          <nav>
            <div className="brand-group">
              <span className="brand-text">{d.companyName}</span>
              <div className="tag">STAFF INTRODUCTION</div>
            </div>
          </nav>

          <section className="hero">
            {d.photoUrl ? (
              <img className="photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="photo">{d.initial}</div>
            )}
            <div>
              <p className="eyebrow">この担当者があなたをサポートします</p>
              <h1 className="name">{d.fullName}</h1>
              {d.role && <p className="role">{d.role}</p>}
              {d.catchphrase && <p className="catch">{d.catchphrase}</p>}
            </div>
          </section>

          {d.bio && (
            <section className="section">
              <p className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"></path></svg>
                自己紹介
              </p>
              <p className="section-body">{d.bio}</p>
            </section>
          )}
          {d.career && (
            <section className="section">
              <p className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v4h4"></path><path d="M9 12h6M9 15.5h6M9 9h2"></path></svg>
                経歴
              </p>
              <p className="section-body">{d.career}</p>
            </section>
          )}
          {d.achievements.length > 0 && (
            <section className="section">
              <p className="section-title">
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a2 2 0 0 0 2 4"></path><path d="M16 5h3a2 2 0 0 1-2 4"></path><path d="M12 13v3"></path><path d="M9 20h6"></path><path d="M10 16.5h4l.5 3H9.5l.5-3z"></path></svg>
                実績
              </p>
              <ul className="ach-list">
                {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}

          <footer>© {d.companyName}.</footer>
        </div>
      </div>
      <CtaBarBody d={d} />
    </>
  );
}

// ==========================================
// ディスパッチ
// ==========================================
const VARIANTS = {
  "1a": { css: css1, Body: T1Body, v: T1_VARS["1a"] },
  "1b": { css: css1, Body: T1Body, v: T1_VARS["1b"] },
  "2a": { css: css2, Body: T2Body, v: T2_VARS["2a"] },
  "2b": { css: css2, Body: T2Body, v: T2_VARS["2b"] },
  "3a": { css: css3, Body: T3Body, v: T3_VARS["3a"] },
  "3b": { css: css3, Body: T3Body, v: T3_VARS["3b"] },
  "4a": { css: css4, Body: T4Body, v: T4_VARS["4a"] },
  "4b": { css: css4, Body: T4Body, v: T4_VARS["4b"] },
};

/**
 * テンプレート描画本体
 * @param {string}  id   - テンプレートID（1a〜4b。不正値は1aに補正）
 * @param {object}  d    - 表示データ（fullName/initial/role/photoUrl/catchphrase/bio/career/achievements[]/companyName/cta{phone,bookingUrl}）
 * @param {boolean} page - 公開ページとして描画（min-height:100vh を付与）
 */
export function MemberTemplate({ id, d, page = false }) {
  const tid = normalizeTemplateId(id);
  const { css, Body, v } = VARIANTS[tid];
  const scope = `tplv-${tid}`;
  return (
    <div
      className={scope}
      style={{
        paddingBottom: hasCta(d) ? 92 : 0,   // 原本 body の padding-bottom:92px（CTA非表示時は外す）
        minHeight: page ? "100vh" : undefined,
      }}
    >
      <style>{css(`.${scope}`, v)}</style>
      <Body d={d} v={v} />
    </div>
  );
}

/**
 * 縮小サムネイル（デスクトップ幅1040pxで描画して transform: scale で縮小）
 * width に数値を渡すと固定幅、省略すると親要素の実幅を計測して追従する。
 * pointer-events は無効化。CTAバーは transform 祖先を基準に固定されるため枠内下部に表示される。
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