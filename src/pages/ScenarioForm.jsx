import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiCall } from "../lib/utils";
import SmsCountHint from "../components/SmsCountHint";
import { Plus, Trash2, Calendar, Clock, Save, Loader2, ArrowLeft, CheckCircle2, FileText, ChevronDown, ChevronUp, X, Search, ExternalLink, Check } from "lucide-react";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF",
  textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444",
};

const formStyles = {
  main:   { minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card:   { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", marginBottom: "24px" },
  input:  { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", boxSizing: "border-box" },
  select: { padding: "12px 14px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", backgroundColor: "white", cursor: "pointer" },
};

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── 挿入できる変数一覧（TemplateManagerと共通）────────────
const VARIABLE_GROUPS = [
  {
    label: "顧客情報",
    color: "#4F46E5",
    bg: "#EEF2FF",
    vars: [
      { label: "姓",      value: "{{姓}}"      },
      { label: "名",      value: "{{名}}"      },
      { label: "電話番号", value: "{{電話番号}}" },
      { label: "メールアドレス", value: "{{メールアドレス}}" },
    ],
  },
  {
    label: "担当者",
    color: "#0284C7",
    bg: "#E0F2FE",
    vars: [
      { label: "担当者姓",     value: "{{担当者姓}}"     },
      { label: "担当者名",     value: "{{担当者名}}"     },
      { label: "担当者電話",   value: "{{担当者電話}}"   },
      { label: "担当者メール", value: "{{担当者メール}}"  },
    ],
  },
];

const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// ── 変数タグの検査ヘルパー ─────────────────────────────────
// 【今回機能】配信時（GAS executeSmsDeliveryQueue）の変数差し込みで事故に
//   ならないよう、保存前にフロントで検査する。
//   GAS側のガードE（未解決タグ残存→送信中止）は「完全な形の {{...}}」しか
//   検出できず、壊れたタグ（例: {{姓} ）は中括弧のままお客様に送信されて
//   しまうため、壊れタグは保存自体をブロックする。
const STANDARD_VAR_KEYS = ["姓", "名", "電話番号", "メールアドレス", "担当者姓", "担当者名", "担当者電話", "担当者メール"];

// 本文中の完全な {{タグ}} を抽出してタグ名の配列を返す
const extractTags = (text) =>
  (String(text || "").match(/\{\{[^{}]+\}\}/g) || []).map(t => t.slice(2, -2));

// 完全なタグを取り除いた後に "{{" か "}}" が残る＝対応の壊れたタグがある
const hasBrokenBraces = (text) => {
  const stripped = String(text || "").replace(/\{\{[^{}]+\}\}/g, "");
  return /\{\{|\}\}/.test(stripped);
};

// ── 変数をハイライト表示するプレビュー（実データ置換対応）──
function renderPreview(text, varMap = {}) {
  if (!text) return <span style={{ color: THEME.textMuted, fontStyle: "italic" }}>本文プレビュー</span>;
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{.+}}$/.test(part)) {
      const key = part.slice(2, -2);
      // 【C3-008/C1-007】DirectSms.renderPreview と同じ区別を適用する。
      //   「置換対象だが値が空」（灰・空欄で送信）と「置換対象外の未知タグ」（紫）を
      //   分けて表示し、空文字置換を未置換と誤認させない。
      if (key in varMap) {
        const val = varMap[key];
        if (val) {
          // 実データあり → 緑ハイライトで実値を表示
          return (
            <mark key={i} title={`変数: ${part}`} style={{
              backgroundColor: "#ECFDF5", color: "#059669",
              borderRadius: 4, padding: "1px 5px",
              fontWeight: 800, fontStyle: "normal",
              border: "1px solid #A7F3D0",
            }}>
              {val}
            </mark>
          );
        }
        // データ未登録 → 空欄で送信される旨を明示（未置換タグと区別）
        return (
          <mark key={i} title={`変数: ${part} — データ未登録のため空欄で送信されます`} style={{
            backgroundColor: "#F1F5F9", color: THEME.textMuted,
            borderRadius: 4, padding: "1px 5px",
            fontWeight: 800, fontStyle: "normal",
            border: "1px dashed #CBD5E1",
          }}>
            （{key}: 空欄）
          </mark>
        );
      }
      // 置換対象外（未知タグ） → 紫ハイライトで変数名そのまま
      return (
        <mark key={i} style={{
          backgroundColor: "#EEF2FF", color: "#4F46E5",
          borderRadius: 4, padding: "1px 5px",
          fontWeight: 800, fontStyle: "normal",
        }}>
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── 変数挿入パネル（各ステップのtextarea上部に表示）──
function VariablePanel({ stepIdx, lastInserted, onInsert }) {
  return (
    <div style={{
      backgroundColor: "#F8FAFC",
      border: `1px solid ${THEME.border}`,
      borderRadius: "12px 12px 0 0",
      padding: "12px 16px",
      borderBottom: "none",
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, color: THEME.textMuted,
        margin: "0 0 10px", letterSpacing: "0.05em",
      }}>
        変数を挿入　―　クリックするとカーソル位置に挿入されます
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {VARIABLE_GROUPS.map(group => (
          <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: group.color, minWidth: 56, flexShrink: 0 }}>
              {group.label}
            </span>
            {group.vars.map(v => {
              const justInserted = lastInserted?.idx === stepIdx && lastInserted?.value === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => onInsert(stepIdx, v.value)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 20,
                    border: `1.5px solid ${justInserted ? group.color : group.color + "60"}`,
                    backgroundColor: justInserted ? group.color : group.bg,
                    color: justInserted ? "white" : group.color,
                    fontSize: 12, fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "monospace",
                  }}
                  onMouseEnter={e => {
                    if (!justInserted) {
                      e.currentTarget.style.backgroundColor = group.color;
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!justInserted) {
                      e.currentTarget.style.backgroundColor = group.bg;
                      e.currentTarget.style.color = group.color;
                    }
                  }}
                  title={`クリックで ${v.value} を挿入`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SMSテンプレート選択パネル（ステップカード内にインライン展開）──────────
// 【今回機能】テンプレート管理（/templates）で登録したSMS文言をシナリオの
//   各ステップ本文に呼び出せるようにする。DirectSms のテンプレート選択と
//   同じ語彙（「テンプレートから選ぶ」）で提供し、学習コストを揃える。
// UX上の要点:
//   1) 本文が空 → 1クリックで即適用（確認を挟まず最速）
//   2) 本文入力済み → 「置き換える／末尾に追加」のインライン確認を必ず挟む
//      （長文執筆後の誤タップによる全損を防ぐ。DirectSms と異なりシナリオは
//        1画面に複数の長文があり、無確認上書きのリスクが大きい）
//   3) 本文と完全一致するテンプレには「適用中」バッジ（現在地がわかる）
//   4) 6件以上のときだけ検索欄を表示（少数時はノイズを増やさない）
//   5) 0件でもパネルは開け、テンプレート管理への新規タブ導線を出す
//      （SPA内遷移だと編集中の入力が失われるため target="_blank"）
function TemplatePicker({ templates = [], currentMessage = "", onApply, onClose }) {
  const [query, setQuery]     = useState("");
  const [pending, setPending] = useState(null); // 上書き確認中のテンプレート | null

  // Esc で閉じる（確認中なら確認だけ解除）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pending) setPending(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  const q = query.trim();
  const filtered = q
    ? templates.filter(t =>
        String(t.name || "").toLowerCase().includes(q.toLowerCase()) ||
        String(t.content || "").toLowerCase().includes(q.toLowerCase()))
    : templates;

  const hasMessage = !!String(currentMessage || "").trim();

  // テンプレートをクリック → 空なら即適用、入力済みなら確認へ
  const handlePick = (t) => {
    if (!hasMessage) { onApply(t, "replace"); return; }
    if (currentMessage === t.content) { onClose(); return; } // 既に同一内容なら何もしない
    setPending(t);
  };

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      border: `1.5px solid ${THEME.primary}55`,
      borderRadius: 14,
      marginTop: 10,
      marginBottom: 12,
      overflow: "hidden",
      boxShadow: "0 8px 24px rgba(79,70,229,0.10)",
    }}>
      {/* ヘッダー */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", backgroundColor: "#EEF2FF",
        borderBottom: `1px solid ${THEME.primary}25`,
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: THEME.primary, display: "flex", alignItems: "center", gap: 7 }}>
          <FileText size={15} /> テンプレートを選択
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4, display: "flex" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* 検索（テンプレートが多いときのみ表示） */}
      {templates.length >= 6 && (
        <div style={{ padding: "10px 14px 0" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: THEME.textMuted }} />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPending(null); }}
              placeholder="テンプレート名・本文で検索..."
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 34px", borderRadius: 10,
                border: `1px solid ${THEME.border}`, fontSize: 13, outline: "none",
              }}
            />
          </div>
        </div>
      )}

      {/* 一覧 */}
      {templates.length === 0 ? (
        // ── 空状態：登録導線（新規タブ。SPA内遷移は入力途中の内容が消えるため）──
        <div style={{ padding: "26px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: THEME.textMain }}>
            テンプレートがまだ登録されていません
          </p>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: THEME.textMuted, lineHeight: 1.7 }}>
            よく使うSMS文言を登録しておくと、ここから1クリックで呼び出せます。
          </p>
          <a
            href="/templates"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 10,
              backgroundColor: THEME.primary, color: "white",
              fontSize: 13, fontWeight: 800, textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> テンプレート管理を開く（新しいタブ）
          </a>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: THEME.textMuted }}>
            ※ 登録後はこの画面を再読み込みすると一覧に反映されます
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "22px 20px", textAlign: "center", fontSize: 13, color: THEME.textMuted }}>
          「{q}」に一致するテンプレートがありません
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto", padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((t) => {
            const isCurrent   = hasMessage && currentMessage === t.content;
            const isConfirming = pending?.id === t.id;
            return (
              <div key={t.id}>
                <button
                  type="button"
                  onClick={() => handlePick(t)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    backgroundColor: isConfirming ? "#EEF2FF" : "#F8FAFC",
                    border: `1.5px solid ${isCurrent || isConfirming ? THEME.primary : THEME.border}`,
                    borderRadius: isConfirming ? "10px 10px 0 0" : 10,
                    padding: "10px 12px",
                    display: "block",
                    transition: "border-color 0.15s, background-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!isConfirming) e.currentTarget.style.borderColor = THEME.primary; }}
                  onMouseLeave={e => { if (!isConfirming && !isCurrent) e.currentTarget.style.borderColor = THEME.border; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: THEME.textMain, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </span>
                    {isCurrent && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, color: "#059669", backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: 99, flexShrink: 0 }}>
                        <Check size={10} strokeWidth={3} /> 適用中
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: THEME.textMuted, flexShrink: 0 }}>
                      {String(t.content || "").length}文字
                    </span>
                  </div>
                  {/* 本文プレビュー（2行で省略） */}
                  <div style={{
                    fontSize: 12, color: THEME.textMuted, lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-all",
                  }}>
                    {t.content}
                  </div>
                </button>

                {/* ── 上書き確認（本文入力済みのときだけ出るインライン確認）── */}
                {isConfirming && (
                  <div style={{
                    border: `1.5px solid ${THEME.primary}`, borderTop: "none",
                    borderRadius: "0 0 10px 10px", padding: "10px 12px",
                    backgroundColor: "#FFFFFF",
                  }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#B45309", display: "flex", alignItems: "center", gap: 5 }}>
                      ⚠️ このステップには本文が入力されています。どうしますか？
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => onApply(pending, "replace")}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", backgroundColor: THEME.primary, color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                      >
                        置き換える
                      </button>
                      <button
                        type="button"
                        onClick={() => onApply(pending, "append")}
                        style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${THEME.primary}`, backgroundColor: "white", color: THEME.primary, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                      >
                        末尾に追加
                      </button>
                      <button
                        type="button"
                        onClick={() => setPending(null)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                      >
                        やめる
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 処理中オーバーレイ ──
function LoadingOverlay({ message = "保存中..." }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000,
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: 20, padding: "36px 48px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        <Loader2 size={40} color={THEME.primary} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain }}>{message}</span>
      </div>
    </div>
  );
}

// ── 成功モーダル ──
function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "white", borderRadius: 20, padding: 40,
        maxWidth: 400, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", backgroundColor: "#ECFDF5",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <CheckCircle2 size={32} color="#059669" />
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111827" }}>{title}</h3>
        {message && <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280" }}>{message}</p>}
        {!message && <div style={{ marginBottom: 28 }} />}
        <button onClick={onClose} style={{
          width: "100%", padding: "14px", backgroundColor: "#059669", color: "white",
          border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer",
        }}>OK</button>
      </div>
    </div>
  );
}

// ── 未知タグ確認モーダル ──
// 標準変数・顧客リストの項目名のどちらとも一致しないタグを検出したときに、
// 保存前に一度だけ確認する。配信時にタグが解決できないと、そのステップは
// GAS側ガードEにより「送信されずエラー化」されるため、気づかず追客が
// 止まる事故を保存時点で防ぐのが目的（ブロックはしない＝顧客0件の初期
// セットアップ中など、正しいカスタム項目タグを判定できない場合があるため）。
function UnknownTagsModal({ open, items = [], onFix, onProceed }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3100, padding: 16,
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: 20, padding: "32px 28px",
        maxWidth: 480, width: "100%", boxSizing: "border-box",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 900, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ 確認できない変数タグがあります
        </h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6B7280", lineHeight: 1.8 }}>
          次のタグは標準変数・顧客リストの項目名のどちらとも一致が確認できませんでした。
          配信時に解決できない場合、<strong style={{ color: "#B45309" }}>そのステップは送信されずエラーになります</strong>。
        </p>
        <div style={{
          backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
          padding: "12px 14px", marginBottom: 18, maxHeight: 160, overflowY: "auto",
        }}>
          {items.map((u, i) => (
            <div key={i} style={{ fontSize: 13, color: "#92400E", fontWeight: 700, lineHeight: 2 }}>
              STEP {u.step}：<code style={{ backgroundColor: "#FEF3C7", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{"{{" + u.tag + "}}"}</code>
            </div>
          ))}
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9CA3AF", lineHeight: 1.7 }}>
          ※ 項目設定で定義したカスタム項目名と一致していれば、配信時に正しく差し込まれます。
          タイプミス（例：<code>{"{{性}}"}</code>）の場合は修正してください。
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onFix} style={{
            flex: 1, padding: "13px", borderRadius: 12, border: "none",
            backgroundColor: "#4F46E5", color: "white", fontSize: 14, fontWeight: 900, cursor: "pointer",
          }}>
            修正する
          </button>
          <button onClick={onProceed} style={{
            flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #E2E8F0",
            backgroundColor: "white", color: "#64748B", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>
            このまま保存する
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioForm({ scenarios = [], customers = [], staffList = [], templates = [], formSettings = [], currentUser = null, onRefresh, onOptimisticAdd, gasUrl }) {
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useWindowWidth();

  const [name, setName]       = useState("");
  const [st, setSt]           = useState([{ elapsedDays: 1, deliveryHour: 10, deliveryMinute: 0, message: "" }]);
  const [saving, setSaving]   = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // 各ステップのtextarea ref（動的配列）
  const textareaRefs = useRef([]);

  // 直近挿入した変数（フラッシュ表示用）: { idx, value } | null
  const [lastInserted, setLastInserted] = useState(null);

  // テンプレート選択パネルを開いているステップ index | null
  //（同時に開くのは1ステップだけにし、画面の縦伸びと混乱を防ぐ）
  const [templateOpenIdx, setTemplateOpenIdx] = useState(null);

  // テンプレートを本文へ適用（mode: "replace" | "append"）
  const applyTemplate = (idx, t, mode) => {
    const cur = String(st[idx]?.message || "");
    // 末尾追加は、既存本文の終端の空白を1つの改行に正規化してから連結する
    const merged = mode === "append" && cur.trim()
      ? cur.replace(/\s+$/, "") + "\n" + (t.content || "")
      : (t.content || "");

    setSt(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], message: merged };
      return next;
    });
    setTemplateOpenIdx(null);
    showToast(
      mode === "append"
        ? `テンプレート「${t.name}」を末尾に追加しました`
        : `テンプレート「${t.name}」を適用しました`,
      "success"
    );
    // 適用後は本文へフォーカスし、カーソルを末尾へ（続けて微修正できるように）
    requestAnimationFrame(() => {
      const ta = textareaRefs.current[idx];
      if (ta) {
        ta.focus();
        ta.setSelectionRange(merged.length, merged.length);
      }
    });
  };

  // ── プレビュー用の変数マップを構築 ──────────────────────────
  const { varMap, previewMeta } = React.useMemo(() => {
    // 最新登録顧客（登録日降順の先頭）
    const latestCustomer = [...customers]
      .filter(c => c["登録日"])
      .sort((a, b) => new Date(b["登録日"]) - new Date(a["登録日"]))[0]
      || customers[customers.length - 1]
      || null;

    // ログインユーザーをstaffListから検索
    const staffData = staffList.find(s => s.email === currentUser?.email) || null;

    const map = {};

    if (latestCustomer) {
      // 【今回機能】GAS配信時（_resolveTemplateVarsStrict_）は「顧客リストの
      //   見出し名すべて」を置換対象にするため、プレビューも同じ規則に揃える。
      //   旧実装は標準4変数のみで、カスタム項目タグ（{{査定額}} 等）が
      //   「未知タグ（紫）」表示になり、実際は差し込まれるのに配信されないように
      //   見える不一致があった。
      Object.keys(latestCustomer).forEach(k => {
        if (!k || k === "id") return;
        const v = latestCustomer[k];
        map[k] = v == null ? "" : String(v);
      });
    }

    if (staffData) {
      map["担当者姓"]     = staffData.lastName  || "";
      map["担当者名"]     = staffData.firstName || "";
      map["担当者電話"]   = staffData.phone     || "";
      map["担当者メール"] = staffData.email     || "";
    } else if (currentUser) {
      // staffListに未登録でもGoogleアカウント情報でフォールバック
      map["担当者姓"]     = currentUser.family_name || "";
      map["担当者名"]     = currentUser.given_name  || "";
      map["担当者メール"] = currentUser.email        || "";
    }

    const customerLabel = latestCustomer
      ? `${latestCustomer["姓"] || ""}${latestCustomer["名"] || ""} (最新登録)`
      : null;
    const staffLabel = staffData
      ? `${staffData.lastName}${staffData.firstName}`
      : currentUser?.name || null;

    return { varMap: map, previewMeta: { customerLabel, staffLabel } };
  }, [customers, staffList, currentUser]);

  // ── 配信時に解決可能とみなすタグ名の集合 ─────────────────────
  //   標準8変数 ＋ 顧客リストの見出し（varMapのキー＝最新顧客のキー）
  //   ＋ 項目設定（formSettings）で定義済みのカスタム項目名。
  //   顧客0件でも formSettings があればカスタム項目を既知にできる。
  const knownVarKeys = React.useMemo(() => {
    const s = new Set(STANDARD_VAR_KEYS);
    Object.keys(varMap).forEach(k => s.add(k));
    (formSettings || []).forEach(f => { if (f?.name) s.add(String(f.name)); });
    return s;
  }, [varMap, formSettings]);

  // 未知タグ確認モーダル: { items: [{step, tag}] } | null
  const [unknownConfirm, setUnknownConfirm] = useState(null);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id);
      setName(dId);
      const ex = (scenarios || [])
        .filter(item => item["シナリオID"] === dId)
        .sort((a, b) => a["ステップ数"] - b["ステップ数"]);
      if (ex.length) {
        setSt(ex.map(item => ({
          elapsedDays:    item["経過日数"],
          deliveryHour:   item["配信時間"],
          deliveryMinute: item["配信分"] ?? 0,
          message:        item["message"],
        })));
      }
    }
  }, [id, scenarios]);

  const updateStep = (idx, field, value) => {
    setSt(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // 変数をカーソル位置に挿入
  const insertVariable = (stepIdx, varValue) => {
    const ta = textareaRefs.current[stepIdx];
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;

    setSt(prev => {
      const next = [...prev];
      const before = next[stepIdx].message.slice(0, start);
      const after  = next[stepIdx].message.slice(end);
      next[stepIdx] = { ...next[stepIdx], message: before + varValue + after };
      return next;
    });

    // フラッシュフィードバック
    setLastInserted({ idx: stepIdx, value: varValue });
    setTimeout(() => setLastInserted(null), 1200);

    // カーソルを挿入後の位置に戻す
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + varValue.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const addStep = () => {
    const prev = st[st.length - 1];
    setSt([...st, {
      elapsedDays:    prev ? Number(prev.elapsedDays) + 1 : 1,
      deliveryHour:   prev ? prev.deliveryHour   : 10,
      deliveryMinute: prev ? prev.deliveryMinute : 0,
      message: "",
    }]);
  };

  // force=true: 未知タグ確認モーダルで「このまま保存する」を選んだ後の再実行
  const handleSave = async (force = false) => {
    if (!name) return showToast("シナリオ名を入力してください", "warning");
    // 【A2-026】ステップ0件は保存不可（GAS saveScenario にも同一ガードあり。
    //   旧実装は0件でも「保存しました」と表示されるがシートには何も残らない
    //   虚偽成功になっていた）。本文が空のステップも配信時に空SMSとなるため弾く。
    if (st.length === 0) return showToast("ステップを1件以上追加してください", "warning");
    if (st.some(s => !String(s.message || "").trim())) {
      return showToast("本文が空のステップがあります。入力するか、そのステップを削除してください", "warning");
    }
    // 【C2-010】経過日数のバリデーション。input の min=1 はスピナー操作にしか効かず、
    //   タイプ入力では空文字（Number("")=0 → 当日予約）・負数（過去日時予約）・
    //   小数が素通りして GAS 側にも検証が無いため、保存時に弾く。
    if (st.some(s => { const n = Number(s.elapsedDays); return !Number.isInteger(n) || n < 1; })) {
      return showToast("経過日数は1以上の整数で入力してください", "warning");
    }
    // 【C2-010／要件決定】上限は365日で保存拒否。1年を超える掘り起こしは
    //   休眠再アプローチ機能（月単位の復帰予定）の守備範囲とし、
    //   9999等の打ち間違いによる遠未来予約の混入を防ぐ。
    if (st.some(s => Number(s.elapsedDays) > 365)) {
      return showToast("経過日数は365日以内で入力してください（1年を超える追客は休眠再アプローチをご利用ください）", "warning");
    }
    // ── 【今回機能】変数タグの保存時検査 ─────────────────────────
    // ① 壊れタグ（{{姓} など括弧の対応漏れ）は保存ブロック。
    //    GAS側ガードEは完全な {{...}} しか検出できず、壊れタグは中括弧の
    //    ままお客様に送信されてしまうため、保存の時点で確実に止める。
    const brokenIdx = st.findIndex(s => hasBrokenBraces(s.message));
    if (brokenIdx >= 0) {
      return showToast(
        `STEP ${brokenIdx + 1} の本文に括弧の対応が壊れた変数タグ（{{ と }} の組み合わせ漏れ）があります。修正してください`,
        "error", 6000
      );
    }
    // ② 未知タグ（標準変数・顧客リストの項目名・カスタム項目定義のいずれとも
    //    不一致）は確認モーダルで警告。配信時に解決できないとガードEにより
    //    「送信されずエラー化」＝追客が黙って止まるため、保存時点で気づかせる。
    //    ブロックはしない（顧客0件などで正当なタグを判定しきれない場合がある）。
    if (!force) {
      const unknown = [];
      st.forEach((s, i) => {
        extractTags(s.message).forEach(tag => {
          if (!knownVarKeys.has(tag)) unknown.push({ step: i + 1, tag });
        });
      });
      if (unknown.length > 0) {
        setUnknownConfirm({ items: unknown });
        return;
      }
    }
    setSaving(true);
    try {
      // 【A2-026】生 axios を廃止し apiCall.post へ統一。
      //   apiCall はレスポンス本文の status !== "success" を例外化するため（utils.js）、
      //   GAS がエラーを返したのに成功モーダルが出る経路を塞ぐ。
      await apiCall.post(gasUrl, { action: "saveScenario", scenarioID: name, steps: st });
      // 楽観的UI更新：GAS再取得を待たずに一覧を即時反映
      onOptimisticAdd?.(name, st);
      onRefresh();
      setSaving(false);
      setSuccessModal(true);
    } catch (e) {
      setSaving(false);
      showToast("保存失敗: " + (e?.message || ""), "error");
    }
  };

  return (
    <>
      <style>{spinStyle}</style>

      {saving && <LoadingOverlay message="保存中..." />}

      <SuccessModal
        open={successModal}
        title="保存しました"
        message={`シナリオ「${name}」を保存しました。`}
        onClose={() => { setSuccessModal(false); navigate("/scenarios"); }}
      />

      {/* 未知タグ確認（修正する＝閉じるだけ／このまま保存する＝force再実行） */}
      <UnknownTagsModal
        open={!!unknownConfirm}
        items={unknownConfirm?.items || []}
        onFix={() => setUnknownConfirm(null)}
        onProceed={() => { setUnknownConfirm(null); handleSave(true); }}
      />

      <div style={{ ...formStyles.main, padding: isMobile ? "20px 16px" : "40px 64px", boxSizing: "border-box" }}>
        {/* ヘッダー */}
        <header style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 16 : 0,
          marginBottom: isMobile ? "24px" : "40px",
        }}>
          <div>
            <button
              onClick={() => navigate("/scenarios")}
              style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 8 }}
            >
              <ArrowLeft size={18} /> 戻る
            </button>
            <h1 style={{ fontSize: isMobile ? "22px" : "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
              {id ? "シナリオ編集" : "新規シナリオ作成"}
            </h1>
          </div>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{
              backgroundColor: saving ? "#A5B4FC" : THEME.primary,
              color: "white", padding: "14px 28px", borderRadius: "12px",
              border: "none", fontWeight: "900",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", gap: 10, alignItems: "center", justifyContent: "center",
              transition: "background-color 0.2s",
              ...(isMobile ? { width: "100%", boxSizing: "border-box" } : {}),
            }}
          >
            <Save size={20} /> 保存
          </button>
        </header>

        <div style={{ maxWidth: "850px" }}>
          {/* シナリオ名 */}
          <div style={{ ...formStyles.card, padding: isMobile ? "20px" : "32px" }}>
            <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>
              シナリオ名（ID）
            </label>
            <input
              style={formStyles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!!id}
              placeholder="例：売却反響自動追客"
            />
          </div>

          {/* ステップ一覧 */}
          {st.map((item, idx) => (
            <div key={idx} style={{ ...formStyles.card, padding: 0, overflow: "hidden" }}>
              {/* ステップヘッダー */}
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: "900" }}>STEP {idx + 1}</span>
                <button
                  onClick={() => {
                    // ステップ削除で index がずれるため、開いているテンプレートパネルは閉じる
                    setTemplateOpenIdx(null);
                    setSt(st.filter((_, i) => i !== idx));
                  }}
                  style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div style={{ padding: isMobile ? "20px 18px" : "28px 32px" }}>
                {/* 経過日数 ＋ 配信時刻 */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: isMobile ? 18 : "24px", marginBottom: isMobile ? 20 : "28px" }}>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 8, color: THEME.textMain }}>
                      <Calendar size={14} /> 経過日数
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        style={{ ...formStyles.input, width: "90px" }}
                        type="number" min={1} max={365}
                        value={item.elapsedDays}
                        onChange={e => updateStep(idx, "elapsedDays", e.target.value)}
                      />
                      <span style={{ fontSize: 13, color: THEME.textMuted, whiteSpace: "nowrap" }}>日後</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 8, color: THEME.textMain }}>
                      <Clock size={14} /> 配信時刻
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <select
                        style={formStyles.select}
                        value={item.deliveryHour}
                        onChange={e => updateStep(idx, "deliveryHour", Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMuted }}>:</span>
                      <select
                        style={formStyles.select}
                        value={item.deliveryMinute}
                        onChange={e => updateStep(idx, "deliveryMinute", Number(e.target.value))}
                      >
                        {MINUTE_OPTIONS.map(m => (
                          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 13, color: THEME.textMuted, whiteSpace: "nowrap" }}>に配信</span>
                    </div>
                  </div>
                </div>

                {/* 本文エリア（ラベル行：左にタイトル、右にテンプレート呼び出し。DirectSmsと同一語彙） */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 0, color: THEME.textMain }}>
                    本文
                  </label>
                  <button
                    type="button"
                    onClick={() => setTemplateOpenIdx(templateOpenIdx === idx ? null : idx)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", height: 30, borderRadius: 8,
                      border: `1px solid ${THEME.primary}`,
                      backgroundColor: templateOpenIdx === idx ? "#EEF2FF" : "white",
                      color: THEME.primary, fontSize: 12, fontWeight: 800, cursor: "pointer",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <FileText size={14} />
                    テンプレートから選ぶ
                    {templateOpenIdx === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* テンプレート選択パネル（このステップで開いているときだけ表示） */}
                {templateOpenIdx === idx && (
                  <TemplatePicker
                    templates={templates}
                    currentMessage={item.message}
                    onApply={(t, mode) => applyTemplate(idx, t, mode)}
                    onClose={() => setTemplateOpenIdx(null)}
                  />
                )}

                {/* 変数挿入パネル（textarea上部に接続） */}
                <div style={{ marginTop: 8 }}>
                  <VariablePanel
                    stepIdx={idx}
                    lastInserted={lastInserted}
                    onInsert={insertVariable}
                  />
                  {/* textarea（パネルと接続した見た目） */}
                  <textarea
                    ref={el => textareaRefs.current[idx] = el}
                    style={{
                      ...formStyles.input,
                      height: "160px",
                      resize: "vertical",
                      borderRadius: "0 0 12px 12px",
                      lineHeight: 1.7,
                      fontFamily: "monospace",
                      fontSize: 14,
                    }}
                    value={item.message}
                    onChange={e => updateStep(idx, "message", e.target.value)}
                    placeholder="本文を入力、または上のボタンで変数を挿入..."
                  />
                  {/* 【C1-015／案B】文字数・通数の概算表示（変数は置換後に増減するため目安） */}
                  <SmsCountHint text={item.message} style={{ marginTop: 8 }} />
                </div>

                {/* プレビュー（変数を実データで置換して表示） */}
                {item.message && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: 0, letterSpacing: "0.05em" }}>
                        プレビュー
                      </p>
                      {/* プレビューデータの出典表示 */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {previewMeta.customerLabel && (
                          <span style={{ fontSize: 11, color: "#059669", backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                            顧客: {previewMeta.customerLabel}
                          </span>
                        )}
                        {previewMeta.staffLabel && (
                          <span style={{ fontSize: 11, color: "#0284C7", backgroundColor: "#E0F2FE", border: "1px solid #BAE6FD", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                            担当者: {previewMeta.staffLabel}
                          </span>
                        )}
                        {!previewMeta.customerLabel && !previewMeta.staffLabel && (
                          <span style={{ fontSize: 11, color: THEME.textMuted }}>
                            ※ 変数データなし（登録後に反映されます）
                          </span>
                        )}
                      </div>
                    </div>
                    <pre style={{
                      fontSize: 13, color: THEME.textMain,
                      whiteSpace: "pre-wrap", lineHeight: 1.7,
                      background: "#F8FAFC", padding: "14px 16px",
                      borderRadius: 12, border: `1px solid ${THEME.border}`,
                      margin: 0, fontFamily: "sans-serif",
                    }}>
                      {renderPreview(item.message, varMap)}
                    </pre>

                    {/* ── 【今回機能】タグ検査のリアルタイム警告 ──
                        保存時チェックと同じ規則で入力中から気づけるようにする。
                        壊れタグ（赤・保存不可）＞未知タグ（黄・要確認）の優先表示 */}
                    {hasBrokenBraces(item.message) ? (
                      <div style={{
                        marginTop: 8, padding: "10px 14px", borderRadius: 10,
                        backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
                        fontSize: 12, fontWeight: 700, color: THEME.danger, lineHeight: 1.7,
                      }}>
                        ⛔ 括弧の対応が壊れた変数タグがあります（{"{{ と }}"} の組み合わせ漏れ）。
                        このままでは中括弧がお客様にそのまま届くため、保存できません。
                      </div>
                    ) : (() => {
                      const unknownInStep = [...new Set(extractTags(item.message).filter(t => !knownVarKeys.has(t)))];
                      if (unknownInStep.length === 0) return null;
                      return (
                        <div style={{
                          marginTop: 8, padding: "10px 14px", borderRadius: 10,
                          backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                          fontSize: 12, fontWeight: 700, color: "#92400E", lineHeight: 1.7,
                        }}>
                          ⚠️ {unknownInStep.map(t => `{{${t}}}`).join("、")} は標準変数・顧客リストの項目名と一致が確認できません。
                          配信時に解決できない場合、このステップは送信されずエラーになります。
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* ステップ追加ボタン */}
          <button
            onClick={addStep}
            style={{
              backgroundColor: "white", border: `2px dashed ${THEME.border}`,
              color: THEME.textMuted, width: "100%", padding: "24px",
              borderRadius: "16px", cursor: "pointer", fontWeight: "800",
              display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
            }}
          >
            <Plus size={24} />
            ステップを追加
            {st.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: THEME.textMuted, marginLeft: 4 }}>
                （{Number(st[st.length - 1].elapsedDays) + 1}日後からプリセット）
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}