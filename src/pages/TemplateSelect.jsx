import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Check, Eye, X } from "lucide-react";
import { THEME, CLIENT_COMPANY_NAME } from "../lib/constants";
import {
  MemberTemplate, TemplatePreviewThumb, SAMPLE_MEMBER,
  TEMPLATE_GROUPS, normalizeTemplateId, templateDisplayId,
} from "../components/MemberTemplates";

// ==========================================
// 🖼 TemplateSelect - 紹介ページ デザインテンプレート選択画面
// ==========================================
// ユーザー登録・編集画面（UserForm）の「テンプレートを選択」から遷移する一覧画面。
// レイアウト・文言は提供された比較用 index.html に準拠（4グループ × 2配色）。
// サムネイルは画像ではなく実テンプレートの縮小ライブ描画（サンプルデータ入り）。
//
// 遷移契約（location.state）:
//   受け取り: { form: 入力途中のフォーム値, returnTo: 戻り先パス }
//   選択時  : navigate(returnTo, { state: { user: { ...form, template: 選択ID } } })
//   戻る時  : navigate(returnTo, { state: { user: form } })  … 入力内容を保持したまま復帰
// UserForm 側は location.state.user があれば新規・編集を問わずフォームを復元する。

function TemplateSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const st = location.state || {};
  const returnTo = st.returnTo || "/users/add";
  const currentId = normalizeTemplateId(st.form?.template);

  const [previewId, setPreviewId] = useState(null); // 全画面サンプル表示中のテンプレートID

  // 全画面プレビュー中は Esc で閉じる
  useEffect(() => {
    if (!previewId) return;
    const onKey = (e) => { if (e.key === "Escape") setPreviewId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewId]);

  // 選択して編集画面へ戻る（入力内容 + 選択テンプレートを引き渡す）
  const handleSelect = (id) => {
    navigate(returnTo, { state: { user: { ...(st.form || {}), template: id } } });
  };

  // 選択せずに戻る（入力内容のみ引き渡す）
  const handleBack = () => {
    navigate(returnTo, { state: st.form ? { user: st.form } : undefined });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7", color: "#1E1E24" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 32px 72px" }}>

        {/* 戻る */}
        <button
          onClick={handleBack}
          style={{
            background: "none", border: "none", color: THEME.primary,
            cursor: "pointer", fontWeight: 800, marginBottom: 24,
            display: "flex", alignItems: "center", gap: 8, padding: 0, fontSize: 14,
          }}
        >
          <ChevronLeft size={20} />
          選択せずにユーザー編集に戻る
        </button>

        <h1 style={{ fontSize: 26, margin: "0 0 8px", fontWeight: 800 }}>
          プロフィールページ｜デザインテンプレート
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 13.5, color: "#767B87", lineHeight: 1.7 }}>
          紹介ページのデザインを選択してください。「サンプルを見る」で実際の表示を確認できます。
          選択するとユーザー編集画面に戻ります。
        </p>

        {/* ── グループ 2×2（index.html 準拠） ── */}
        <div className="tsel-groups">
          <style>{`
            .tsel-groups{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
            .tsel-pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
            @media (max-width:900px){ .tsel-groups{grid-template-columns:1fr;} }
            @media (max-width:480px){ .tsel-pair{grid-template-columns:1fr;} }
          `}</style>

          {TEMPLATE_GROUPS.map((g) => (
            <div key={g.no} style={{ background: "#fff", borderRadius: 16, padding: "26px 26px 28px" }}>
              {/* グループ見出し */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                paddingBottom: 10, borderBottom: "1px solid #1e1e25",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: "50%", background: "#1E1E24",
                  color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0,
                }}>{g.no}</span>
                <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0 }}>{g.title}</h2>
              </div>
              <p style={{ color: "#767B87", fontSize: 14.5, margin: "0 0 18px", lineHeight: 1.7 }}>
                {g.desc}
              </p>

              {/* 配色ペア */}
              <div className="tsel-pair">
                {g.items.map((t) => {
                  const selected = currentId === t.id;
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: "#fff", borderRadius: 10, overflow: "hidden",
                        border: selected ? `2px solid ${THEME.primary}` : "1px solid #E7E7EC",
                        boxShadow: selected ? "0 0 0 3px rgba(109,94,231,.15)" : "none",
                        display: "flex", flexDirection: "column",
                      }}
                    >
                      {/* サムネイル（実テンプレートの縮小ライブ描画） */}
                      <div style={{ position: "relative" }}>
                        <TemplatePreviewThumb
                          id={t.id} height={150}
                          companyName={CLIENT_COMPANY_NAME}
                          style={{ borderRadius: 0, border: "none", borderBottom: "1px solid #E7E7EC" }}
                        />
                        <span style={{
                          position: "absolute", left: 8, top: 8, background: "rgba(20,20,24,.62)",
                          color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".05em",
                          padding: "3px 9px", borderRadius: 5,
                        }}>{templateDisplayId(t.id)}</span>
                        {selected && (
                          <span style={{
                            position: "absolute", right: 8, top: 8,
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: THEME.primary, color: "#fff", fontSize: 11.5,
                            fontWeight: 800, padding: "3px 9px", borderRadius: 5,
                          }}><Check size={12} strokeWidth={3} />選択中</span>
                        )}
                      </div>

                      {/* 情報＋ボタン */}
                      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                        <h3 style={{ fontSize: 15, margin: "0 0 4px", fontWeight: 800 }}>{t.label}</h3>
                        <p style={{ fontSize: 12, color: "#767B87", lineHeight: 1.55, margin: "0 0 12px", flex: 1 }}>
                          {t.desc}
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setPreviewId(t.id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                              background: "#fff", border: "1px solid #C9CDD6",
                              color: "#41576A", fontSize: 12, fontWeight: 800, letterSpacing: ".02em",
                            }}
                          >
                            <Eye size={13} />サンプルを見る
                          </button>
                          <button
                            onClick={() => handleSelect(t.id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                              background: selected ? THEME.primary : "#809eb5",
                              border: "none", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".02em",
                            }}
                          >
                            {selected ? "このまま使用" : "このテンプレートを選択"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 全画面サンプルプレビュー ── */}
      {previewId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, background: "#fff", overflowY: "auto" }}>
          {/* 操作バー */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "10px 16px", background: "rgba(30,30,36,.92)", color: "#fff",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{
                background: "#fff", color: "#1E1E24", fontSize: 12, fontWeight: 800,
                padding: "3px 9px", borderRadius: 5, flexShrink: 0,
              }}>{templateDisplayId(previewId)}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                サンプル表示（実データ保存後はこの見た目で公開されます）
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => handleSelect(previewId)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px",
                  borderRadius: 999, cursor: "pointer", background: THEME.primary,
                  border: "none", color: "#fff", fontSize: 12.5, fontWeight: 800,
                }}
              >
                <Check size={14} strokeWidth={3} />このテンプレートを選択
              </button>
              <button
                onClick={() => setPreviewId(null)}
                aria-label="閉じる"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
                  background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* テンプレート本体（サンプルデータ・操作不可） */}
          <div style={{ pointerEvents: "none" }}>
            <MemberTemplate id={previewId} d={SAMPLE_MEMBER(CLIENT_COMPANY_NAME)} page />
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateSelect;