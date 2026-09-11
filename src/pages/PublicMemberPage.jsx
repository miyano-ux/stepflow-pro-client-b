import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";

// ==========================================
// 🌐 PublicMemberPage - 外部公開メンバー紹介ページ（ログイン不要）
// ==========================================
// App.jsx の最上部で /m/:slug を分岐させ、認証・データ取得を一切経由せず描画する。
// データは MASTER_WHITELIST_API の publicMember アクションから取得する。
//
// 【テンプレート発行機能】
//   許可リストの「テンプレート」列（1a/1b/2a/2b/3a/3b/4a/4b）に応じて
//   8種のデザインで描画する。未設定・不正値は 1a（高級・信頼／ゴールド）に
//   フォールバックする（既存公開ページの既定デザイン）。
//
// 【CTAバー】
//   publicMember レスポンスの company: { phone, bookingUrl }（公開ページ設定
//   シート由来）が1つでも設定されていれば、画面下部に固定CTAバーを表示する。
//   両方未設定なら非表示（下余白も付けない）。
//
// フィールド割り当て（全テンプレート共通）：
//   氏名(姓+名) / 役職 / 写真URL / キャッチコピー / 自己紹介 / 経歴 / 実績（改行区切り→箇条書き）
//   空のフィールドは行ごと非表示にする。

const TEMPLATE_IDS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b"];

// テンプレートIDの正規化（"1-A" "1A" 等の表記ゆれを吸収し、不正値は 1a に落とす）
const normalizeTemplateId = (raw) => {
  const v = String(raw || "").trim().toLowerCase().replace(/[^0-9ab]/g, "");
  return TEMPLATE_IDS.includes(v) ? v : "1a";
};

// Google ドライブの共有リンクを <img> で表示できる直リンクへ変換する。
// 共有リンク（/file/d/ID/view 等）は閲覧ページのURLで画像本体を返さず、
// 旧来の uc?export=view 形式も現在は 403 になるため、thumbnail 形式へ正規化する。
// ドライブ以外のURL（外部ホストの直リンク等）はそのまま返す。
function toDisplayablePhotoUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  if (/drive\.google\.com\/thumbnail\?/.test(url)) return url;
  if (/lh3\.googleusercontent\.com\//.test(url)) return url;
  let id = "";
  let m;
  if ((m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)))      id = m[1];
  else if ((m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)))     id = m[1];
  else if ((m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)))       id = m[1];
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  return url;
}

function PublicMemberPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading", member: null, company: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url =
          `${MASTER_WHITELIST_API}?action=publicMember` +
          `&company=${encodeURIComponent(CLIENT_COMPANY_NAME)}` +
          `&slug=${encodeURIComponent(slug)}` +
          `&_t=${Date.now()}`;
        const res = await axios.get(url);
        if (!alive) return;
        if (res.data?.found && res.data.member) {
          // company（CTA設定）はGAS未更新時に欠落し得るため空オブジェクトで補う
          setState({ status: "ok", member: res.data.member, company: res.data.company || {} });
        } else {
          setState({ status: "notfound", member: null, company: null });
        }
      } catch (e) {
        if (alive) setState({ status: "error", member: null, company: null });
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (state.status === "loading") {
    return <Center><Loader2 size={42} className="animate-spin" color="#809eb5" /></Center>;
  }
  if (state.status === "notfound") {
    return (
      <Center>
        <div style={{ textAlign: "center", color: "#9AA0A6" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#3A3A3A", margin: "0 0 8px" }}>ページが見つかりません</p>
          <p style={{ fontSize: 14, margin: 0 }}>このページは公開されていないか、URL が正しくない可能性があります。</p>
        </div>
      </Center>
    );
  }
  if (state.status === "error") {
    return (
      <Center>
        <div style={{ textAlign: "center", color: "#9AA0A6" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#3A3A3A", margin: "0 0 12px" }}>読み込みに失敗しました</p>
          <button onClick={() => window.location.reload()}
            style={{ padding: "10px 24px", border: "none", borderRadius: 8, backgroundColor: "#809eb5", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            再読み込み
          </button>
        </div>
      </Center>
    );
  }

  const m = state.member;
  const tpl = normalizeTemplateId(m.template);
  const data = {
    fullName: `${m.lastName || ""} ${m.firstName || ""}`.trim() || "担当者",
    initial: (m.lastName || "?").slice(0, 1),
    role: String(m.role || "").trim(),
    photoUrl: toDisplayablePhotoUrl(m.photoUrl),
    catchphrase: String(m.catchphrase || "").trim(),
    bio: String(m.bio || "").trim(),
    career: String(m.career || "").trim(),
    achievements: String(m.achievements || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    companyName: CLIENT_COMPANY_NAME,
    cta: {
      phone: String(state.company?.phone || "").trim(),
      bookingUrl: String(state.company?.bookingUrl || "").trim(),
    },
  };

  const Tpl = TEMPLATE_COMPONENTS[tpl] || TEMPLATE_COMPONENTS["1a"];
  return <Tpl d={data} />;
}

function Center({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24 }}>
      {children}
    </div>
  );
}

// ==========================================
// 📞 予約CTAバー（全テンプレート共通・配色のみ差し替え）
// ==========================================
// phone / bookingUrl の両方が空なら描画しない。
// c: { telBorder, telColor, bookBg, bookColor }
function CtaBar({ phone, bookingUrl, maxWidth, c }) {
  if (!phone && !bookingUrl) return null;
  const telHref = "tel:" + String(phone).replace(/[^\d+]/g, "");
  return (
    <div className="pm-cta-bar">
      <style>{`
        .pm-cta-bar{
          position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;
          box-shadow:0 -8px 24px rgba(0,0,0,.10);
          padding:10px 20px calc(10px + env(safe-area-inset-bottom));
        }
        .pm-cta-inner{max-width:${maxWidth}px;margin:0 auto;display:flex;gap:10px;}
        .pm-cta-btn{
          flex:1;display:flex;align-items:center;justify-content:center;gap:7px;
          height:48px;border-radius:10px;font-size:14.5px;font-weight:800;text-decoration:none;
        }
        @media (max-width:600px){
          .pm-cta-bar{padding:8px 14px calc(8px + env(safe-area-inset-bottom));}
          .pm-cta-btn{height:44px;font-size:13px;}
        }
      `}</style>
      <div className="pm-cta-inner">
        {phone && (
          <a className="pm-cta-btn" href={telHref}
            style={{ background: "#fff", border: `1.5px solid ${c.telBorder}`, color: c.telColor }}>
            <span aria-hidden="true">📞</span>{phone}
          </a>
        )}
        {bookingUrl && (
          <a className="pm-cta-btn" href={bookingUrl} target="_blank" rel="noreferrer"
            style={{ background: c.bookBg, color: c.bookColor }}>
            <span aria-hidden="true">📅</span>予約日時を選択
          </a>
        )}
      </div>
    </div>
  );
}

const hasCta = (d) => !!(d.cta.phone || d.cta.bookingUrl);

// ==========================================
// 🎨 テンプレート1｜高級・信頼（1a: ゴールド / 1b: ネイビー）
// ==========================================
const T1_PALETTES = {
  "1a": {
    accent: "#C6A15B", navy: "#1F2937", navySoft: "#3D4759", ink: "#2B2B2B",
    sub: "#8B8F98", line: "#E7E2D8", bg: "#FBF9F5", topMid: "#DCC488",
    photoGrad: "linear-gradient(155deg,#EFE7D4,#DCC488)", photoColor: "#1F2937",
    bookColor: "#1F2937",
  },
  "1b": {
    accent: "#2563EB", navy: "#0B1E39", navySoft: "#35507A", ink: "#1B2430",
    sub: "#7A8598", line: "#E4E9F2", bg: "#F7F9FC", topMid: "#8FC7FF",
    photoGrad: "linear-gradient(155deg,#0B1E39,#2563EB)", photoColor: "#fff",
    bookColor: "#fff",
  },
};

function Template1({ d, P }) {
  return (
    <div className="t1-root" style={{ paddingBottom: hasCta(d) ? 92 : 0 }}>
      <style>{`
        .t1-root{margin:0;background:${P.bg};font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${P.ink};min-height:100vh;box-sizing:border-box;}
        .t1-root *{box-sizing:border-box;}
        .t1-top{height:5px;background:linear-gradient(90deg,${P.accent},${P.topMid},${P.accent});}
        .t1-wrap{max-width:1040px;margin:0 auto;}
        .t1-header{display:flex;align-items:center;gap:28px;padding:44px 40px 34px;}
        .t1-logo{
          flex-shrink:0;border:1.5px solid ${P.line};border-radius:4px;background:#fff;
          padding:12px 20px;color:${P.navy};font-weight:800;letter-spacing:.08em;font-size:14px;
        }
        .t1-head-sub{color:${P.sub};font-size:12px;margin:0 0 8px;letter-spacing:.14em;text-transform:uppercase;}
        .t1-head-title{margin:0;font-size:28px;font-weight:600;color:${P.navy};line-height:1.5;
          font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
        .t1-head-title .nm{color:${P.accent};font-weight:700;}
        .t1-divider{border-top:1px solid ${P.line};}
        .t1-body{padding:52px 40px 80px;}
        .t1-sec-head{display:flex;align-items:center;gap:16px;}
        .t1-sec-dot{width:9px;height:9px;border-radius:50%;background:${P.accent};flex-shrink:0;}
        .t1-sec-title{margin:0;font-size:24px;color:${P.navy};font-weight:600;letter-spacing:.1em;
          font-family:"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;}
        .t1-sec-rule{height:1px;background:${P.line};margin:18px 0 0;position:relative;}
        .t1-sec-rule::after{content:"";position:absolute;left:0;top:-1px;width:64px;height:2px;background:${P.accent};}
        .t1-grid{display:grid;grid-template-columns:330px 1fr;gap:56px;margin-top:44px;align-items:start;}
        .t1-photo-wrap{position:relative;}
        .t1-photo{
          width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:2px;display:block;
          box-shadow:0 14px 34px rgba(31,41,55,.14);
        }
        .t1-photo--ph{
          display:flex;align-items:center;justify-content:center;
          background:${P.photoGrad};color:${P.photoColor};font-size:72px;font-weight:700;
        }
        .t1-photo-box{position:relative;}
        .t1-photo-frame{position:absolute;inset:14px;border:1px solid rgba(255,255,255,.55);pointer-events:none;}
        .t1-catch{margin:22px 0 0;padding:16px 20px;border-left:2px solid ${P.accent};color:${P.navySoft};
          font-size:14px;line-height:1.9;font-style:normal;background:#fff;}
        .t1-rows{display:flex;flex-direction:column;}
        .t1-row{display:grid;grid-template-columns:140px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
        .t1-row + .t1-row{border-top:1px solid ${P.line};}
        .t1-label{color:${P.accent};font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;padding-top:2px;}
        .t1-value{color:${P.ink};font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
        .t1-bullets{list-style:none;margin:0;padding:0;}
        .t1-bullets li{position:relative;padding-left:20px;color:${P.ink};font-size:15.5px;line-height:2;}
        .t1-bullets li::before{content:"";position:absolute;left:0;top:11px;width:7px;height:1px;background:${P.accent};}
        .t1-footer{text-align:center;padding:26px;color:${P.sub};font-size:11.5px;letter-spacing:.08em;border-top:1px solid ${P.line};}
        @media (max-width:760px){
          .t1-header{flex-direction:column;align-items:flex-start;gap:16px;padding:32px 22px 22px;}
          .t1-head-title{font-size:22px;}
          .t1-body{padding:36px 22px 60px;}
          .t1-grid{grid-template-columns:1fr;gap:30px;}
          .t1-photo-wrap{max-width:280px;margin:0 auto;}
          .t1-row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
        }
      `}</style>

      <div className="t1-top" />
      <div className="t1-wrap">
        <header className="t1-header">
          <div className="t1-logo">{d.companyName}</div>
          <div>
            <p className="t1-head-sub">Staff Introduction</p>
            <h1 className="t1-head-title"><span className="nm">{d.fullName}</span> があなたを担当します</h1>
          </div>
        </header>
        <div className="t1-divider" />

        <div className="t1-body">
          <div className="t1-sec-head">
            <span className="t1-sec-dot" />
            <h2 className="t1-sec-title">私のプロフィール</h2>
          </div>
          <div className="t1-sec-rule" />

          <div className="t1-grid">
            <div className="t1-photo-wrap">
              <div className="t1-photo-box">
                {d.photoUrl ? (
                  <img className="t1-photo" src={d.photoUrl} alt={d.fullName} />
                ) : (
                  <div className="t1-photo t1-photo--ph">{d.initial}</div>
                )}
                <div className="t1-photo-frame" />
              </div>
              {d.catchphrase && <p className="t1-catch">{d.catchphrase}</p>}
            </div>

            <div className="t1-rows">
              <T1Row label="名前" value={d.fullName} />
              <T1Row label="肩書" value={d.role} />
              <T1Row label="自己紹介" value={d.bio} />
              <T1Row label="経歴" value={d.career} />
              {d.achievements.length > 0 && (
                <div className="t1-row">
                  <div className="t1-label">実績</div>
                  <ul className="t1-bullets">
                    {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <footer className="t1-footer">© {d.companyName}</footer>
      </div>

      <CtaBar phone={d.cta.phone} bookingUrl={d.cta.bookingUrl} maxWidth={1040}
        c={{ telBorder: P.navy, telColor: P.navy, bookBg: P.accent, bookColor: P.bookColor }} />
    </div>
  );
}

function T1Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="t1-row">
      <div className="t1-label">{label}</div>
      <div className="t1-value">{value}</div>
    </div>
  );
}

// ==========================================
// 🎨 テンプレート2｜爽やか・明るい（2a: ブルー / 2b: レッド）
// ==========================================
const T2_PALETTES = {
  "2a": {
    main: "#209CFF", second: "#68E0CF", soft: "#E3F6FF", deep: "#0B3D66",
    ink: "#17303A", sub: "#71898F", line: "#DCEEF0", bg: "#F5FBFC",
    heroBg: "repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px)," +
            "linear-gradient(125deg,#209CFF 0%,#68E0CF 100%)",
    heroDeco1: "radial-gradient(circle,rgba(104,224,207,.35),rgba(104,224,207,0) 70%)",
    heroDeco2: "radial-gradient(circle,rgba(32,156,255,.30),rgba(32,156,255,0) 70%)",
    eyebrow: "#68E0CF",
    photoGrad: "linear-gradient(155deg,#68E0CF,#209CFF)",
    bookBg: "#209CFF",
    variant: "a",
  },
  "2b": {
    main: "#F5323F", second: "#FF6A4D", soft: "#FFEDE8", deep: "#2A1A16",
    ink: "#2A1A16", sub: "#9A8580", line: "#F5E3DE", bg: "#FFFBFA",
    heroBg: "repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 14px, transparent 14px 32px)," +
            "linear-gradient(125deg,#F5323F 0%,#F5323F 45%,#FF6A4D 100%)",
    heroDeco1: "radial-gradient(circle,rgba(255,255,255,.28),rgba(255,255,255,0) 70%)",
    heroDeco2: "radial-gradient(circle,rgba(255,138,91,.35),rgba(255,138,91,0) 70%)",
    eyebrow: "#FFE3D1",
    photoGrad: "linear-gradient(155deg,#FF6A4D,#F5323F)",
    bookBg: "#FF6A4D",
    variant: "b",
  },
};

function Template2({ d, P }) {
  const isB = P.variant === "b";
  return (
    <div className="t2-root" style={{ paddingBottom: hasCta(d) ? 92 : 0 }}>
      <style>{`
        .t2-root{margin:0;background:${P.bg};font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${P.ink};min-height:100vh;box-sizing:border-box;}
        .t2-root *{box-sizing:border-box;}
        .t2-hero{position:relative;overflow:hidden;padding:36px 40px 48px;background:${P.heroBg};}
        .t2-hero::before{content:"";position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;background:${P.heroDeco1};}
        .t2-hero::after{content:"";position:absolute;left:-60px;bottom:-140px;width:260px;height:260px;border-radius:50%;background:${P.heroDeco2};}
        .t2-hero-inner{position:relative;max-width:1040px;margin:0 auto;z-index:1;}
        .t2-logo-badge{display:inline-block;background:#fff;border-radius:8px;padding:10px 16px;
          font-size:14px;font-weight:900;color:${P.main};letter-spacing:.04em;}
        .t2-hero-main{display:grid;grid-template-columns:1fr 400px;gap:40px;align-items:center;padding:28px 0 0;}
        .t2-photo{
          order:2;width:100%;aspect-ratio:16/9;height:auto;object-fit:cover;display:block;
          ${isB
            ? "border-radius:6px;border:4px solid #fff;box-shadow:0 18px 36px rgba(0,0,0,.35);"
            : "border-radius:16px;border:3px solid rgba(255,255,255,.25);box-shadow:0 20px 40px rgba(0,0,0,.35);"}
        }
        .t2-photo--ph{
          display:flex;align-items:center;justify-content:center;background:${P.photoGrad};
          color:#fff;font-size:${isB ? "52px" : "56px"};font-weight:${isB ? "900" : "800"};
        }
        .t2-hero-text{order:1;}
        .t2-eyebrow{font-size:12px;font-weight:${isB ? "800" : "700"};letter-spacing:${isB ? ".2em" : ".16em"};color:${P.eyebrow};text-transform:uppercase;margin:0 0 10px;}
        .t2-name{margin:0;font-size:${isB ? "34px" : "32px"};font-weight:${isB ? "900" : "800"};color:#fff;letter-spacing:.01em;}
        .t2-name-rule{width:56px;height:4px;background:#fff;margin:14px 0;}
        .t2-role{margin:${isB ? "0" : "10px 0 0"};font-size:14.5px;color:rgba(255,255,255,${isB ? ".85" : ".72"});font-weight:${isB ? "700" : "600"};letter-spacing:.04em;}
        .t2-catch{margin:16px 0 0;font-size:15px;color:rgba(255,255,255,${isB ? ".95" : ".9"});line-height:1.8;max-width:520px;${isB ? "font-weight:600;" : ""}}
        .t2-wrap{max-width:1040px;margin:0 auto;padding:44px 40px 70px;}
        .t2-row{display:grid;grid-template-columns:150px 1fr;column-gap:28px;padding:22px 0;align-items:start;}
        .t2-row + .t2-row{border-top:1px solid ${P.line};}
        .t2-label{display:flex;align-items:center;gap:8px;color:${P.main};font-weight:${isB ? "900" : "800"};font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px;}
        .t2-label::before{content:"";width:${isB ? "16px" : "14px"};height:${isB ? "3px" : "2px"};background:${P.main};}
        .t2-value{color:${P.ink};font-size:15.5px;line-height:1.95;white-space:pre-wrap;}
        .t2-bullets{list-style:none;margin:0;padding:0;display:flex;${isB ? "flex-wrap:wrap;" : "flex-direction:column;"}gap:10px;}
        .t2-bullets li{
          ${isB
            ? `background:${P.main};color:#fff;border-radius:999px;padding:10px 18px;font-size:13.5px;font-weight:800;`
            : `background:${P.soft};color:${P.deep};border-radius:8px;padding:12px 16px;font-size:14.5px;font-weight:600;border-left:3px solid ${P.main};`}
        }
        .t2-footer{text-align:center;padding:22px;color:${P.sub};font-size:12px;border-top:1px solid ${P.line};letter-spacing:.04em;}
        @media (max-width:760px){
          .t2-hero{padding:26px 22px 36px;}
          .t2-hero-main{grid-template-columns:1fr;text-align:center;padding:22px 0 0;}
          .t2-photo{order:1;font-size:${isB ? "38px" : "40px"};}
          .t2-hero-text{order:2;}
          .t2-name-rule{margin:14px auto;}
          .t2-catch{margin-left:auto;margin-right:auto;}
          .t2-name{font-size:${isB ? "25px" : "24px"};}
          .t2-wrap{padding:34px 22px 56px;}
          .t2-row{grid-template-columns:100px 1fr;column-gap:16px;padding:16px 0;}
        }
      `}</style>

      <div className="t2-hero">
        <div className="t2-hero-inner">
          <span className="t2-logo-badge">{d.companyName}</span>
          <div className="t2-hero-main">
            {d.photoUrl ? (
              <img className="t2-photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="t2-photo t2-photo--ph">{d.initial}</div>
            )}
            <div className="t2-hero-text">
              <p className="t2-eyebrow">Staff Introduction</p>
              <h1 className="t2-name">{d.fullName}</h1>
              {isB && <div className="t2-name-rule" />}
              {d.role && <p className="t2-role">{d.role}</p>}
              {d.catchphrase && <p className="t2-catch">{d.catchphrase}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="t2-wrap">
        <T2Row label="自己紹介" value={d.bio} />
        <T2Row label="経歴" value={d.career} />
        {d.achievements.length > 0 && (
          <div className="t2-row">
            <div className="t2-label">実績</div>
            <ul className="t2-bullets">
              {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}
      </div>
      <footer className="t2-footer">© {d.companyName}</footer>

      <CtaBar phone={d.cta.phone} bookingUrl={d.cta.bookingUrl} maxWidth={1040}
        c={{ telBorder: P.main, telColor: P.main, bookBg: P.bookBg, bookColor: "#fff" }} />
    </div>
  );
}

function T2Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="t2-row">
      <div className="t2-label">{label}</div>
      <div className="t2-value">{value}</div>
    </div>
  );
}

// ==========================================
// 🎨 テンプレート3｜親しみ・優しい（3a: コーラル / 3b: パープル）
// ==========================================
const T3_PALETTES = {
  "3a": {
    accent: "#F0805E", soft: "#FDE7DE", cream: "#FFF8F1", ink: "#4A3F3A",
    sub: "#B0A29A", line: "#F3E4D8", achBg: "#FFF9F5",
    headerGrad: "linear-gradient(135deg,#FDE7DE,#FFF3EC)",
    shadow: "0 18px 44px rgba(240,128,94,.12)",
    photoShadow: "0 10px 26px rgba(240,128,94,.28)",
  },
  "3b": {
    accent: "#6C5CE7", soft: "#F1EEFB", cream: "#FBFAFF", ink: "#4A4458",
    sub: "#A79FC0", line: "#EDE9F7", achBg: "#F9F8FE",
    headerGrad: "linear-gradient(135deg,#F1EEFB,#F7F5FD)",
    shadow: "0 18px 44px rgba(108,92,231,.14)",
    photoShadow: "0 10px 26px rgba(108,92,231,.30)",
  },
};

function Template3({ d, P }) {
  return (
    <div className="t3-root" style={{ paddingBottom: hasCta(d) ? 92 : 0 }}>
      <style>{`
        .t3-root{margin:0;background:${P.cream};font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${P.ink};min-height:100vh;box-sizing:border-box;}
        .t3-root *{box-sizing:border-box;}
        .t3-wrap{max-width:920px;margin:0 auto;padding:40px 20px 64px;}
        .t3-card{background:#fff;border-radius:28px;box-shadow:${P.shadow};overflow:hidden;}
        .t3-header{background:${P.headerGrad};padding:40px 40px 34px;text-align:center;}
        .t3-brand{margin:0 auto 18px;font-size:15px;font-weight:900;color:${P.ink};letter-spacing:.06em;}
        .t3-photo{
          width:150px;height:150px;border-radius:50%;object-fit:cover;margin:0 auto;border:5px solid #fff;
          box-shadow:${P.photoShadow};display:block;
        }
        .t3-photo--ph{
          display:flex;align-items:center;justify-content:center;
          background:${P.accent};color:#fff;font-size:52px;font-weight:800;
        }
        .t3-name{margin:18px 0 0;font-size:26px;font-weight:800;color:${P.ink};}
        .t3-role-pill{
          display:inline-block;margin-top:10px;background:#fff;color:${P.accent};font-size:13px;font-weight:700;
          padding:7px 18px;border-radius:999px;
        }
        .t3-bubble{
          margin:26px 40px 0;background:${P.soft};border-radius:18px;padding:24px 24px 20px 42px;
          font-size:15px;line-height:1.85;color:${P.ink};position:relative;
        }
        .t3-bubble::before{content:"\\201C";position:absolute;left:12px;top:2px;font-size:40px;line-height:1;color:${P.accent};opacity:.55;font-weight:900;font-family:Georgia,serif;}
        .t3-body{padding:34px 40px 40px;}
        .t3-block{padding:22px 0;}
        .t3-block + .t3-block{border-top:1px dashed ${P.line};}
        .t3-block-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:800;color:${P.accent};}
        .t3-block-title .ico{width:20px;height:20px;border-radius:50%;background:${P.soft};display:inline-flex;align-items:center;justify-content:center;font-size:11px;}
        .t3-block-body{font-size:15px;line-height:1.9;color:${P.ink};white-space:pre-wrap;margin:0;}
        .t3-ach-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
        .t3-ach-list li{
          display:flex;align-items:center;gap:10px;background:${P.achBg};border:1px solid ${P.line};
          border-radius:12px;padding:12px 16px;font-size:14.5px;color:${P.ink};
        }
        .t3-ach-list li::before{content:"🎗️";font-size:14px;}
        .t3-footer{text-align:center;padding:26px 0 0;color:${P.sub};font-size:12px;}
        @media (max-width:700px){
          .t3-header{padding:32px 24px 26px;}
          .t3-bubble{margin:22px 20px 0;}
          .t3-body{padding:26px 20px 32px;}
        }
      `}</style>

      <div className="t3-wrap">
        <div className="t3-card">
          <div className="t3-header">
            <p className="t3-brand">{d.companyName}</p>
            {d.photoUrl ? (
              <img className="t3-photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="t3-photo t3-photo--ph">{d.initial}</div>
            )}
            <h1 className="t3-name">{d.fullName}</h1>
            {d.role && <span className="t3-role-pill">{d.role}</span>}
          </div>

          {d.catchphrase && <div className="t3-bubble">{d.catchphrase}</div>}

          <div className="t3-body">
            {d.bio && (
              <div className="t3-block">
                <p className="t3-block-title"><span className="ico">😊</span>自己紹介</p>
                <p className="t3-block-body">{d.bio}</p>
              </div>
            )}
            {d.career && (
              <div className="t3-block">
                <p className="t3-block-title"><span className="ico">📖</span>経歴</p>
                <p className="t3-block-body">{d.career}</p>
              </div>
            )}
            {d.achievements.length > 0 && (
              <div className="t3-block">
                <p className="t3-block-title"><span className="ico">🏆</span>実績</p>
                <ul className="t3-ach-list">
                  {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
        <footer className="t3-footer">© {d.companyName}</footer>
      </div>

      <CtaBar phone={d.cta.phone} bookingUrl={d.cta.bookingUrl} maxWidth={920}
        c={{ telBorder: P.accent, telColor: P.accent, bookBg: P.accent, bookColor: "#fff" }} />
    </div>
  );
}

// ==========================================
// 🎨 テンプレート4｜シンプル・洗練（4a: グリーン / 4b: ブラウン）
// ==========================================
const T4_PALETTES = {
  "4a": {
    accent: "#0F766E", soft: "#E4F3F1", ink: "#111318", sub: "#767B87",
    line: "#EAEBEF", bg: "#F2F4F3",
  },
  "4b": {
    accent: "#C1633A", soft: "#F7E7DE", ink: "#2A2420", sub: "#8C8078",
    line: "#EFE6DE", bg: "#F7F2EE",
  },
};

const T4Icon = ({ path }) => (
  <svg className="t4-section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: path }} />
);
const T4_ICONS = {
  bio: '<circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"></path>',
  career: '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v4h4"></path><path d="M9 12h6M9 15.5h6M9 9h2"></path>',
  ach: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"></path><path d="M8 5H5a2 2 0 0 0 2 4"></path><path d="M16 5h3a2 2 0 0 1-2 4"></path><path d="M12 13v3"></path><path d="M9 20h6"></path><path d="M10 16.5h4l.5 3H9.5l.5-3z"></path>',
};

function Template4({ d, P }) {
  return (
    <div className="t4-root" style={{ paddingBottom: hasCta(d) ? 92 : 0 }}>
      <style>{`
        .t4-root{margin:0;background:${P.bg};font-family:-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;color:${P.ink};min-height:100vh;box-sizing:border-box;}
        .t4-root *{box-sizing:border-box;}
        .t4-page{max-width:800px;margin:0 auto;padding:56px 20px 64px;}
        .t4-card{
          background:#fff;border-radius:3px;border:1px solid ${P.accent};
          box-shadow:0 30px 60px -24px rgba(17,19,24,.16);overflow:hidden;
        }
        .t4-nav{display:flex;align-items:center;padding:24px 48px;border-bottom:1px solid ${P.line};}
        .t4-brand-group{display:flex;align-items:center;gap:14px;}
        .t4-brand{font-size:16px;font-weight:800;color:${P.ink};letter-spacing:.04em;}
        .t4-tag{font-size:11px;color:${P.sub};letter-spacing:.1em;padding-left:14px;border-left:1px solid ${P.line};}
        .t4-hero{padding:48px 48px 40px;display:grid;grid-template-columns:220px 1fr;gap:44px;align-items:center;}
        .t4-photo{
          width:220px;height:220px;border-radius:50%;object-fit:cover;display:block;
          box-shadow:0 18px 36px rgba(17,19,24,.08);
        }
        .t4-photo--ph{
          display:flex;align-items:center;justify-content:center;
          background:${P.soft};color:${P.accent};font-size:60px;font-weight:700;
        }
        .t4-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.2em;color:${P.accent};text-transform:uppercase;margin:0 0 14px;}
        .t4-name{margin:0;font-size:33px;font-weight:700;letter-spacing:-.02em;line-height:1.3;}
        .t4-role{margin:10px 0 0;font-size:15px;color:${P.sub};font-weight:600;}
        .t4-catch{
          position:relative;display:inline-block;margin:26px 0 0;padding:16px 20px;max-width:480px;
          background:${P.soft};color:${P.ink};border-radius:12px;
          font-size:15px;line-height:1.8;font-weight:500;
        }
        .t4-catch::before{
          content:"";position:absolute;left:-8px;top:22px;width:0;height:0;
          border-style:solid;border-width:8px 10px 8px 0;
          border-color:transparent ${P.soft} transparent transparent;
        }
        .t4-section{padding:32px 48px;border-top:1px solid ${P.line};}
        .t4-section-title{
          display:inline-flex;align-items:center;gap:10px;
          font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${P.accent};
          margin:0 0 18px;padding-bottom:10px;border-bottom:1.5px solid ${P.accent};
        }
        .t4-section-icon{width:18px;height:18px;flex-shrink:0;}
        .t4-section-body{font-size:15.5px;line-height:1.95;color:${P.ink};white-space:pre-wrap;margin:0;}
        .t4-ach-list{list-style:none;margin:4px 0 0;padding:0;}
        .t4-ach-list li{
          position:relative;padding:14px 0 14px 20px;font-size:14.5px;color:${P.ink};line-height:1.7;
          border-top:1px solid ${P.line};
        }
        .t4-ach-list li:first-child{border-top:none;padding-top:2px;}
        .t4-ach-list li::before{content:"";position:absolute;left:0;top:23px;width:7px;height:1px;background:${P.accent};}
        .t4-footer{text-align:center;padding:32px 48px 40px;color:${P.sub};font-size:12px;letter-spacing:.04em;}
        @media (max-width:700px){
          .t4-page{padding:32px 12px 48px;}
          .t4-nav{padding:20px 24px;}
          .t4-hero{grid-template-columns:1fr;text-align:center;padding:36px 24px 32px;}
          .t4-photo{margin:0 auto;width:160px;height:160px;font-size:48px;}
          .t4-catch{margin-left:auto;margin-right:auto;}
          .t4-catch::before{left:50%;top:-8px;transform:translateX(-50%);border-width:0 8px 10px 8px;border-color:transparent transparent ${P.soft} transparent;}
          .t4-name{font-size:26px;}
          .t4-section{padding:24px 24px;}
          .t4-footer{padding:24px 24px 32px;}
        }
      `}</style>

      <div className="t4-page">
        <div className="t4-card">
          <nav className="t4-nav">
            <div className="t4-brand-group">
              <span className="t4-brand">{d.companyName}</span>
              <div className="t4-tag">STAFF INTRODUCTION</div>
            </div>
          </nav>

          <section className="t4-hero">
            {d.photoUrl ? (
              <img className="t4-photo" src={d.photoUrl} alt={d.fullName} />
            ) : (
              <div className="t4-photo t4-photo--ph">{d.initial}</div>
            )}
            <div>
              <p className="t4-eyebrow">この担当者があなたをサポートします</p>
              <h1 className="t4-name">{d.fullName}</h1>
              {d.role && <p className="t4-role">{d.role}</p>}
              {d.catchphrase && <p className="t4-catch">{d.catchphrase}</p>}
            </div>
          </section>

          {d.bio && (
            <section className="t4-section">
              <p className="t4-section-title"><T4Icon path={T4_ICONS.bio} />自己紹介</p>
              <p className="t4-section-body">{d.bio}</p>
            </section>
          )}
          {d.career && (
            <section className="t4-section">
              <p className="t4-section-title"><T4Icon path={T4_ICONS.career} />経歴</p>
              <p className="t4-section-body">{d.career}</p>
            </section>
          )}
          {d.achievements.length > 0 && (
            <section className="t4-section">
              <p className="t4-section-title"><T4Icon path={T4_ICONS.ach} />実績</p>
              <ul className="t4-ach-list">
                {d.achievements.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}

          <footer className="t4-footer">© {d.companyName}</footer>
        </div>
      </div>

      <CtaBar phone={d.cta.phone} bookingUrl={d.cta.bookingUrl} maxWidth={960}
        c={{ telBorder: P.accent, telColor: P.accent, bookBg: P.accent, bookColor: "#fff" }} />
    </div>
  );
}

// ==========================================
// テンプレートID → コンポーネントのマップ
// ==========================================
const TEMPLATE_COMPONENTS = {
  "1a": ({ d }) => <Template1 d={d} P={T1_PALETTES["1a"]} />,
  "1b": ({ d }) => <Template1 d={d} P={T1_PALETTES["1b"]} />,
  "2a": ({ d }) => <Template2 d={d} P={T2_PALETTES["2a"]} />,
  "2b": ({ d }) => <Template2 d={d} P={T2_PALETTES["2b"]} />,
  "3a": ({ d }) => <Template3 d={d} P={T3_PALETTES["3a"]} />,
  "3b": ({ d }) => <Template3 d={d} P={T3_PALETTES["3b"]} />,
  "4a": ({ d }) => <Template4 d={d} P={T4_PALETTES["4a"]} />,
  "4b": ({ d }) => <Template4 d={d} P={T4_PALETTES["4b"]} />,
};

export default PublicMemberPage;