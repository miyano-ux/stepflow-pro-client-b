import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { CLIENT_COMPANY_NAME, MASTER_WHITELIST_API } from "../lib/constants";
import { MemberTemplate, normalizeTemplateId } from "../components/MemberTemplates";

// ==========================================
// 🌐 PublicMemberPage - 外部公開メンバー紹介ページ（ログイン不要）
// ==========================================
// App.jsx の最上部で /m/:slug を分岐させ、認証・データ取得を一切経由せず描画する。
// データは MASTER_WHITELIST_API の publicMember アクションから取得する。
//
// 描画は components/MemberTemplates.jsx の8テンプレート
// （提供サンプルHTMLの忠実移植）に委譲する。
//   - member.template（許可リスト「テンプレート」列）でデザインを切り替え
//   - 未設定・不正値は 1a（高級・信頼／ゴールド）にフォールバック
//   - company: { phone, bookingUrl }（公開ページ設定シート）が1つでもあれば
//     下部CTAバーを表示。GAS未更新でレスポンスに company が無い場合は非表示。

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
  const d = {
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

  return <MemberTemplate id={normalizeTemplateId(m.template)} d={d} page />;
}

function Center({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24 }}>
      {children}
    </div>
  );
}

export default PublicMemberPage;