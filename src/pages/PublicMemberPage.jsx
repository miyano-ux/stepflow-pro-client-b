import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";

// ==========================================
// 🌐 PublicMemberPage - 外部公開メンバー紹介ページ（ログイン不要）
// ==========================================
// App.jsx の最上部で /m/:slug を分岐させ、認証・データ取得を一切経由せず描画する。
// データは MASTER_WHITELIST_API の publicMember アクションから「プロフィール項目のみ」取得する。
// 入力項目は現行のまま。各フィールドの割り当て：
//   氏名(姓+名) → ヘッダー「○○があなたを担当します」/「名前」行
//   役職        → 「肩書」行
//   写真URL     → 左カラムの写真
//   キャッチコピー → ヘッダー名前下のひとこと
//   自己紹介     → 「自己紹介」行
//   経歴        → 「経歴」行
//   実績        → 「実績」行（改行ごとに「・」箇条書き）

// ── 配色トークン（添付サンプル準拠：金 × シアンブルー）──
const C = {
  gold:   "#E3C24C",   // 上部ライン・見出しドット・下線
  blue:   "#1FA7D6",   // ラベル・氏名のハイライト
  ink:    "#3A3A3A",   // 値テキスト
  sub:    "#9AA0A6",   // 補助テキスト
  line:   "#ECECEC",   // 区切り線
  photoBg:"#F6F6F8",   // 写真プレースホルダ背景
  bg:     "#FFFFFF",
};

// Google ドライブの共有リンクを <img> で表示できる直リンクへ変換する。
// 共有リンク（/file/d/ID/view 等）は閲覧ページのURLで画像本体を返さず、
// 旧来の uc?export=view 形式も現在は 403 になるため、thumbnail 形式へ正規化する。
// ドライブ以外のURL（外部ホストの直リンク等）はそのまま返す。
function toDisplayablePhotoUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  // すでに表示可能な形式（thumbnail / lh3）はそのまま使う
  if (/drive\.google\.com\/thumbnail\?/.test(url)) return url;
  if (/lh3\.googleusercontent\.com\//.test(url)) return url;
  // 各種ドライブリンクから FILE_ID を抽出
  let id = "";
  let m;
  if ((m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)))      id = m[1]; // /file/d/ID/view
  else if ((m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)))     id = m[1]; // open?id= / uc?id=
  else if ((m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)))       id = m[1]; // /d/ID
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  // ドライブ以外はそのまま
  return url;
}

function PublicMemberPage() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading", member: null });

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
          setState({ status: "ok", member: res.data.member });
        } else {
          setState({ status: "notfound", member: null });
        }
      } catch (e) {
        if (alive) setState({ status: "error", member: null });
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (state.status === "loading") {
    return <Center><Loader2 size={42} className="animate-spin" color={C.blue} /></Center>;
  }
  if (state.status === "notfound") {
    return (
      <Center>
        <div style={{ textAlign: "center", color: C.sub }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: C.ink, margin: "0 0 8px" }}>ページが見つかりません</p>
          <p style={{ fontSize: 14, margin: 0 }}>このページは公開されていないか、URL が正しくない可能性があります。</p>
        </div>
      </Center>
    );
  }
  if (state.status === "error") {
    return (
      <Center>
        <div style={{ textAlign: "center", color: C.sub }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 12px" }}>読み込みに失敗しました</p>
          <button onClick={() => window.location.reload()}
            style={{ padding: "10px 24px", border: "none", borderRadius: 8, backgroundColor: C.blue, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            再読み込み
          </button>
        </div>
      </Center>
    );
  }

  const m = state.member;
  const fullName = `${m.lastName || ""} ${m.firstName || ""}`.trim();
  const photoUrl = toDisplayablePhotoUrl(m.photoUrl);
  const achievements = String(m.achievements || "")
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <style>{`
        .pmp-top { height: 4px; background: ${C.gold}; }
        .pmp-wrap { max-width: 1060px; margin: 0 auto; }
        .pmp-header { display: flex; align-items: center; gap: 26px; padding: 30px 36px 26px; }
        .pmp-logo {
          flex-shrink: 0; border: 1.5px solid ${C.line}; border-radius: 12px;
          padding: 14px 18px; min-width: 120px; text-align: center; line-height: 1.5;
          color: ${C.ink}; font-weight: 800; letter-spacing: .06em; font-size: 13px;
        }
        .pmp-head-sub { color: ${C.sub}; font-size: 13px; margin: 0 0 6px; letter-spacing: .02em; }
        .pmp-head-title { margin: 0; font-size: 27px; font-weight: 800; color: ${C.ink}; line-height: 1.4; }
        .pmp-head-title .nm { color: ${C.blue}; }
        .pmp-divider { border-top: 1px solid ${C.line}; }
        .pmp-body { padding: 44px 36px 72px; }
        .pmp-sec-head { display: flex; align-items: center; gap: 14px; }
        .pmp-dot { width: 18px; height: 18px; border-radius: 50%; background: ${C.gold}; flex-shrink: 0; }
        .pmp-sec-title {
          margin: 0; font-size: 26px; color: ${C.ink}; font-weight: 600;
          font-family: "Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP",serif;
          letter-spacing: .04em;
        }
        .pmp-sec-rule { height: 2px; background: ${C.gold}; margin: 16px 0 0; }
        .pmp-grid { display: grid; grid-template-columns: 360px 1fr; gap: 50px; margin-top: 40px; align-items: start; }
        .pmp-photo-wrap { position: relative; }
        .pmp-photo-deco {
          position: absolute; left: -22px; top: 36px; bottom: 36px; width: 60px; z-index: 0;
          background: radial-gradient(ellipse at center, rgba(231,170,180,.45), rgba(231,170,180,0) 70%);
          filter: blur(4px);
        }
        .pmp-photo {
          position: relative; z-index: 1; width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
          border-radius: 8px; background: ${C.photoBg}; box-shadow: 0 8px 24px rgba(0,0,0,.08);
          display: block;
        }
        .pmp-photo--ph {
          display: flex; align-items: center; justify-content: center;
          font-size: 64px; font-weight: 800; color: ${C.blue}; opacity: .5;
        }
        .pmp-rows { display: flex; flex-direction: column; }
        .pmp-row { display: grid; grid-template-columns: 150px 1fr; column-gap: 28px; padding: 18px 0; align-items: start; }
        .pmp-row + .pmp-row { border-top: 1px solid #F4F4F4; }
        .pmp-label { color: ${C.blue}; font-weight: 800; font-size: 16px; letter-spacing: .03em; }
        .pmp-value { color: ${C.ink}; font-size: 16px; line-height: 1.85; white-space: pre-wrap; }
        .pmp-bullets { list-style: none; margin: 0; padding: 0; }
        .pmp-bullets li { position: relative; padding-left: 18px; color: ${C.ink}; font-size: 16px; line-height: 1.95; }
        .pmp-bullets li::before { content: "・"; position: absolute; left: 0; color: ${C.gold}; font-weight: 900; }
        .pmp-footer { text-align: center; padding: 24px; color: ${C.sub}; font-size: 12px; border-top: 1px solid ${C.line}; }
        @media (max-width: 760px) {
          .pmp-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 24px 20px 20px; }
          .pmp-head-title { font-size: 22px; }
          .pmp-body { padding: 32px 20px 56px; }
          .pmp-sec-title { font-size: 22px; }
          .pmp-grid { grid-template-columns: 1fr; gap: 28px; }
          .pmp-photo-wrap { max-width: 300px; margin: 0 auto; }
          .pmp-photo-deco { display: none; }
          .pmp-row { grid-template-columns: 100px 1fr; column-gap: 16px; padding: 14px 0; }
          .pmp-label { font-size: 14px; }
          .pmp-value, .pmp-bullets li { font-size: 15px; }
        }
      `}</style>

      <div className="pmp-top" />

      <div className="pmp-wrap">
        {/* ── ヘッダー ── */}
        <header className="pmp-header">
          <div className="pmp-logo">{CLIENT_COMPANY_NAME}</div>
          <div>
            <p className="pmp-head-sub">{CLIENT_COMPANY_NAME} サポートサイト</p>
            <h1 className="pmp-head-title">
              <span className="nm">{fullName || "担当者"}</span> があなたを担当します
            </h1>
          </div>
        </header>

        <div className="pmp-divider" />

        {/* ── 本体 ── */}
        <div className="pmp-body">
          <div className="pmp-sec-head">
            <span className="pmp-dot" />
            <h2 className="pmp-sec-title">私のプロフィール</h2>
          </div>
          <div className="pmp-sec-rule" />

          <div className="pmp-grid">
            {/* 写真 */}
            <div className="pmp-photo-wrap">
              <div className="pmp-photo-deco" />
              {photoUrl ? (
                <img className="pmp-photo" src={photoUrl} alt={fullName} />
              ) : (
                <div className="pmp-photo pmp-photo--ph">{(m.lastName || "?").slice(0, 1)}</div>
              )}
            </div>

            {/* ラベル / 値 */}
            <div className="pmp-rows">
              <Row label="名前" value={fullName} />
              <Row label="肩書" value={m.role} />
              <Row label="自己紹介" value={m.bio} />
              <Row label="経歴" value={m.career} />
              {achievements.length > 0 && (
                <div className="pmp-row">
                  <div className="pmp-label">実績</div>
                  <ul className="pmp-bullets">
                    {achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pmp-footer">{CLIENT_COMPANY_NAME}</div>
      </div>
    </div>
  );
}

// 値が空の行は描画しない
function Row({ label, value }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className="pmp-row">
      <div className="pmp-label">{label}</div>
      <div className="pmp-value">{value}</div>
    </div>
  );
}

function Center({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24 }}>
      {children}
    </div>
  );
}

export default PublicMemberPage;