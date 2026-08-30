import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, UserCheck, Zap, Send, Calendar, MessageSquare, X, CheckCircle2, FileText, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, replaceVariables } from "../lib/utils";
import Page from "../components/Page";
import CustomSelect from "../components/CustomSelect";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// 💬 DirectSms - 個別メッセージ送信ページ
// ==========================================

// 【C4-008】過去日時とみなすまでの猶予（5分）。GAS 側 sendDirectSms の拒否条件と同値。
//   「現在時刻ちょうど」を選んだ即時送信ユースが、確定操作までのわずかな経過や
//   通信ラグで誤ってブロックされるのを防ぐためのマージン。
const PAST_TIME_GRACE_MS = 5 * 60 * 1000;

/** "YYYY-MM-DDTHH:mm" → 読みやすい日本語表記 */
const formatScheduledTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日（${weekdays[d.getDay()]}）${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ── 挿入できる変数一覧（ScenarioForm / TemplateManager と共通）────────────
const VARIABLE_GROUPS = [
  {
    label: "顧客情報",
    color: THEME.primary,
    bg: "#EEF2FF",
    vars: [
      { label: "姓",            value: "{{姓}}"            },
      { label: "名",            value: "{{名}}"            },
      { label: "電話番号",       value: "{{電話番号}}"       },
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

// ── 変数をハイライト表示するプレビュー（実データ置換対応）──
function renderPreview(text, varMap = {}) {
  if (!text) return <span style={{ color: THEME.textMuted, fontStyle: "italic" }}>本文プレビュー</span>;
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{.+}}$/.test(part)) {
      const key = part.slice(2, -2);
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
      // データなし → パープルハイライトで変数名そのまま
      return (
        <mark key={i} style={{
          backgroundColor: "#EEF2FF", color: THEME.primary,
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

// ── 変数挿入パネル（textarea 上部に接続表示）──
function VariablePanel({ lastInserted, onInsert }) {
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
        {VARIABLE_GROUPS.map((group) => (
          <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: group.color, minWidth: 56, flexShrink: 0 }}>
              {group.label}
            </span>
            {group.vars.map((v) => {
              const justInserted = lastInserted === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => onInsert(v.value)}
                  style={{
                    padding: "4px 11px", borderRadius: 20,
                    border: `1.5px solid ${justInserted ? group.color : group.color + "60"}`,
                    backgroundColor: justInserted ? group.color : group.bg,
                    color: justInserted ? "white" : group.color,
                    fontSize: 12, fontWeight: 800, cursor: "pointer",
                    transition: "all 0.15s", fontFamily: "monospace",
                  }}
                  onMouseEnter={(e) => {
                    if (!justInserted) {
                      e.currentTarget.style.backgroundColor = group.color;
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
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

function DirectSms({ customers = [], templates = [], staffList = [], onRefresh, masterUrl, currentUserEmail, isLoading = false }) {
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useWindowWidth();
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);

  const c = customers?.find((x) => String(x.id) === String(id));

  const [msg, setMsg] = useState(location.state?.prefilledMessage || "");
  const [isConverting, setIsConverting] = useState(false);
  // App.jsx から渡される staffList が空のとき（初回キャッシュ未生成時）のみ使うフォールバック
  const [fallbackStaff, setFallbackStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [time, setTime] = useState(() => {
    const d = new Date(Date.now() + 30 * 60000);
    // toISOString() は UTC を返すため、タイムゾーンオフセット分を補正してローカル時刻の文字列を得る
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  // 確認モーダル
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const parentId = location.state?.parentId || "";
  const parentStepName = location.state?.parentStepName || "個別SMS";

  // URLが含まれているか検出
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasUrl = urlRegex.test(msg);

  // 【C4-008】選択中の配信日時が過去（猶予5分超）かどうか。
  //   time が変わるたびに再描画されるため、選択した瞬間に警告バナーの表示と
  //   予約ボタンの無効化へ反映される。SmartDateTimePicker（共有部品）には手を入れない。
  const isPastTime = new Date(time).getTime() <= Date.now() - PAST_TIME_GRACE_MS;

  // App.jsx が一元管理する staffList を優先利用。空のときだけ自前取得にフォールバック。
  const effectiveStaffList = staffList.length > 0 ? staffList : fallbackStaff;

  // フォールバック取得: props の staffList が空のときだけ GAS から取りに行く
  useEffect(() => {
    if (staffList.length > 0 || !masterUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`
        );
        if (!cancelled) setFallbackStaff(res?.data?.users || []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [staffList, masterUrl]);

  // スタッフ一覧が揃ったら、ログイン中ユーザーを初期選択（未選択時のみ）
  useEffect(() => {
    if (selectedStaff || effectiveStaffList.length === 0) return;
    const myProfile = effectiveStaffList.find(
      (s) => String(s.email).toLowerCase() === String(currentUserEmail).toLowerCase()
    );
    setSelectedStaff(myProfile || effectiveStaffList[0]);
  }, [effectiveStaffList, currentUserEmail, selectedStaff]);

  // ── 変数差し込み ──────────────────────────────────────────────
  const textareaRef = useRef(null);
  // 直近挿入した変数（フラッシュ表示用）
  const [lastInserted, setLastInserted] = useState(null);

  // プレビュー・送信時の変数置換マップ（この顧客＋選択中の担当者の実データ）
  const varMap = useMemo(() => {
    const map = {};
    if (c) {
      map["姓"]            = c["姓"]            || "";
      map["名"]            = c["名"]            || "";
      map["電話番号"]       = c["電話番号"]       || "";
      map["メールアドレス"] = c["メールアドレス"] || "";
    }
    if (selectedStaff) {
      map["担当者姓"]     = selectedStaff.lastName  || "";
      map["担当者名"]     = selectedStaff.firstName || "";
      map["担当者電話"]   = selectedStaff.phone     || "";
      map["担当者メール"] = selectedStaff.email     || "";
    }
    return map;
  }, [c, selectedStaff]);

  // 変数を実データに置換した、実際に送信される本文
  const resolvedMsg = useMemo(
    () => replaceVariables(msg, c, selectedStaff),
    [msg, c, selectedStaff]
  );

  // 変数をカーソル位置に挿入
  const insertVariable = (varValue) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMsg((m) => m + varValue);
    } else {
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      setMsg((m) => m.slice(0, start) + varValue + m.slice(end));
      // カーソルを挿入後の位置に戻す
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + varValue.length;
        ta.setSelectionRange(pos, pos);
      });
    }
    // フラッシュフィードバック
    setLastInserted(varValue);
    setTimeout(() => setLastInserted(null), 1200);
  };

  // URLをトラッキングURLに変換
  const handleConvertToTracking = async () => {
    const urls = msg.match(urlRegex);
    if (!urls) return;
    setIsConverting(true);
    let updatedMsg = msg;
    try {
      for (const url of urls) {
        if (url.includes("/api/t/")) continue;
        const res = await axios.post("/api/t/create", {
          originalUrl: url,
          customerId: c.id,
          customerName: `${c["姓"]} ${c["名"]}`,
        });
        if (res.data.trackingUrl) {
          updatedMsg = updatedMsg.replace(url, res.data.trackingUrl);
        }
      }
      setMsg(updatedMsg);
    } catch (e) {
      console.error(e);
      // api/t/create.js が失敗理由ごとに message を返すので、それをそのまま見せる。
      // 固定文言（旧: BASE_URL を確認してください）は原因の誤認を招くため使わない。
      const detail = e?.response?.data?.message;
      showToast(
        detail || "トラッキングURLへの変換に失敗しました。時間をおいて再試行してください。",
        "error"
      );
    } finally {
      setIsConverting(false);
    }
  };

  // 確認ボタン押下 → モーダル表示
  const handleConfirmOpen = () => {
    if (!msg) return showToast("本文を入力してください", "warning");
    setShowConfirm(true);
  };

  // 確認モーダルで「送信確定」
  const handleSend = async () => {
    // 【C4-008】確認モーダルを開いたまま放置し、選択日時が過去（猶予5分超）に
    //   なってから確定された場合のすり抜け対策。リアルタイム警告（isPastTime)は
    //   再描画されないと表示されないため、ここで受け止める。
    //   最終防衛は GAS 側 sendDirectSms の過去日時拒否（二重防御）。
    if (new Date(time).getTime() <= Date.now() - PAST_TIME_GRACE_MS) {
      showToast("配信日時が過去になっています。未来の日時を指定してください", "error");
      setShowConfirm(false);
      return;
    }
    setIsSending(true);
    try {
      await apiCall.post(GAS_URL, {
        action: "sendDirectSms",
        phone: c["電話番号"],
        customerId: c.id,
        customerName: `${c["姓"]} ${c["名"]}`,
        scheduledTime: time,
        // 変数（{{姓}}等）を実データに置換してから送信
        message: resolvedMsg,
        parentId: parentId,
        stepName: parentStepName,
      });
      setShowConfirm(false);
      onRefresh();
      // 配信履歴ページへ遷移（配信予約を確認できるように）
      navigate(`/schedule/${id}`, { state: { justScheduled: true } });
    } catch (e) {
      console.error(e);
      // GAS 側の拒否理由（過去日時など）をそのまま見せる。CustomerSchedule の
      // handleSaveEdit（"更新に失敗しました: " + e.message）と同じ方式。
      showToast("配信予約に失敗しました" + (e?.message ? ": " + e.message : ""), "error");
    } finally {
      setIsSending(false);
    }
  };

  // 【Z-016 横展開】存在しないID / 削除済みIDを URL 直打ちされた場合、customers に該当行が無く
  //   c=undefined のまま下のスピナー分岐に固定され、永久ローディングになる（エラー分岐が無い）。
  //   初回ロード完了後（isLoading=false）かつ該当なしなら 404 相当を表示する。
  //   判定方針・文言は CustomerDetail（Z-016 本体修正）および CustomerList の
  //   「!isLoading かつ 0件 →『見つかりませんでした』」に揃える。
  if (!isLoading && !c) {
    return (
      <Page title="該当する顧客が見つかりませんでした">
        <div style={{ ...styles.card, textAlign: "center", padding: 48 }}>
          <p style={{ color: THEME.textMuted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.7 }}>
            指定された顧客ID（{id}）は存在しないか、すでに削除されています。
          </p>
          <button onClick={() => navigate("/customers")} style={{ ...styles.btn, ...styles.btnPrimary }}>
            <ArrowLeft size={16} /> 顧客一覧へ戻る
          </button>
        </div>
      </Page>
    );
  }

  if (!c) {
    return (
      <Page title="読込中...">
        <Loader2 className="animate-spin" />
      </Page>
    );
  }

  return (
    <>
      <Page title="個別メッセージ送信" subtitle={`${c["姓"]} ${c["名"]} 様`}>
        <button
          onClick={() => navigate(`/detail/${id}`)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: "24px", background: "none", border: "none",
            color: THEME.textMuted, cursor: "pointer",
            fontWeight: "700", fontSize: "14px", padding: 0,
          }}
        >
          <ArrowLeft size={16} /> {c["姓"]} {c["名"]} 様の詳細に戻る
        </button>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 350px", gap: isMobile ? "20px" : "32px" }}>

          {/* ── 左カラム：送信設定 */}
          <div>

            {/* 送信担当者選択 */}
            <div style={{ ...styles.card, marginBottom: 24, backgroundColor: "#EEF2FF", border: "none", padding: "20px" }}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, color: THEME.primary }}>
                <UserCheck size={14} /> 送信担当者
              </label>
              <CustomSelect
                value={selectedStaff?.email || ""}
                placeholder="担当者を選択"
                options={effectiveStaffList.map((s) => ({
                  value: s.email,
                  label: `${s.lastName} ${s.firstName}`,
                }))}
                onChange={(email) =>
                  setSelectedStaff(effectiveStaffList.find((s) => s.email === email))
                }
              />
            </div>

            {/* 配信日時 */}
            <div style={{ marginBottom: 24 }}>
              <label style={styles.label}>配信日時</label>
              <SmartDateTimePicker value={time} onChange={setTime} />
              {/* 【C4-008】過去日時のリアルタイム警告（選んだ瞬間に気づけるようにする） */}
              {isPastTime && (
                <div style={{
                  marginTop: 10, padding: "10px 14px", borderRadius: 10,
                  backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
                  color: THEME.danger, fontSize: 12, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <AlertTriangle size={14} />
                  過去の日時が選択されています。未来の日時を指定してください
                </div>
              )}
            </div>

            {/* 配信内容 */}
            <div>
              {/* ラベル行：左にタイトル、右にテンプレート選択／トラッキングボタン */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>配信内容</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {isMobile && templates.length > 0 && (
                    <button
                      onClick={() => setMobileTemplatesOpen((o) => !o)}
                      style={{
                        ...styles.btn,
                        backgroundColor: mobileTemplatesOpen ? "#EEF2FF" : "white",
                        color: THEME.primary,
                        border: `1px solid ${THEME.primary}`,
                        padding: "4px 12px",
                        height: "30px",
                        fontSize: "12px",
                      }}
                    >
                      <FileText size={14} />
                      テンプレートから選ぶ
                      {mobileTemplatesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                  {hasUrl && (
                    <button
                      onClick={handleConvertToTracking}
                      disabled={isConverting}
                      style={{
                        ...styles.btn,
                        backgroundColor: "white",
                        color: THEME.primary,
                        border: `1px solid ${THEME.primary}`,
                        padding: "4px 12px",
                        height: "30px",
                        fontSize: "12px",
                      }}
                    >
                      {isConverting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      URLをトラッキング化
                    </button>
                  )}
                </div>
              </div>

              {/* テンプレート選択パネル（モバイル限定・折りたたみ） */}
              {isMobile && mobileTemplatesOpen && (
                <div style={{ ...styles.card, padding: 12, marginBottom: 10, border: `1px solid ${THEME.primary}40` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: THEME.textMain }}>テンプレートを選択</p>
                    <button
                      onClick={() => setMobileTemplatesOpen(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4, display: "flex" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { setMsg(t.content); setMobileTemplatesOpen(false); }}
                        style={{
                          backgroundColor: "#F8FAFC", borderRadius: 10, padding: "10px 12px",
                          fontSize: 13, color: THEME.textMain, cursor: "pointer",
                        }}
                      >
                        {t.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 変数挿入パネル（textarea 上部に接続） */}
              <VariablePanel lastInserted={lastInserted} onInsert={insertVariable} />

              <textarea
                ref={textareaRef}
                style={{
                  ...styles.input,
                  height: "240px",
                  resize: "none",
                  borderRadius: "0 0 12px 12px",
                  lineHeight: 1.7,
                }}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="メッセージを入力、または上のボタンで変数を挿入してください。URLを入力してトラッキング化ボタンを押すとクリック計測が可能になります。"
              />

              {/* プレビュー（変数を実データに置換して表示） */}
              {msg && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: 0, letterSpacing: "0.05em" }}>
                      プレビュー（実際の送信内容）
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#059669", backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                        顧客: {c["姓"]} {c["名"]}
                      </span>
                      {selectedStaff && (
                        <span style={{ fontSize: 11, color: "#0284C7", backgroundColor: "#E0F2FE", border: "1px solid #BAE6FD", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                          担当者: {selectedStaff.lastName} {selectedStaff.firstName}
                        </span>
                      )}
                    </div>
                  </div>
                  <pre style={{
                    fontSize: 13, color: THEME.textMain,
                    whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.7,
                    background: "#F8FAFC", padding: "14px 16px",
                    borderRadius: 12, border: `1px solid ${THEME.border}`,
                    margin: 0, fontFamily: "sans-serif",
                  }}>
                    {renderPreview(msg, varMap)}
                  </pre>
                </div>
              )}
            </div>

            {/* 確認画面へ進むボタン（予約確定はモーダル内） */}
            <button
              onClick={handleConfirmOpen}
              disabled={isPastTime}
              style={{
                ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "24px", height: "54px", fontSize: "15px",
                opacity: isPastTime ? 0.5 : 1,
                cursor: isPastTime ? "not-allowed" : "pointer",
              }}
            >
              {/* 【文言修正】このボタンは確認モーダルを開くだけで予約は確定しない。
                  旧文言「配信予約を確定する」は実挙動と乖離しテスト・運用双方で
                  誤解を招いたため、実挙動どおりの文言に変更（確定はモーダル内のみ）。 */}
              <Send size={18} />
              確認画面へ進む
            </button>
          </div>

          {/* ── 右カラム：テンプレート一覧（PC/タブレットのみ。モバイルは先頭に表示済み） ── */}
          {!isMobile && (
            <div>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "800" }}>テンプレート</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setMsg(t.content)}
                    style={{ ...styles.card, padding: "16px", cursor: "pointer" }}
                  >
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Page>

      {/* ── 確認モーダル */}
      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            backgroundColor: "rgba(14,11,31,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => !isSending && setShowConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "white", borderRadius: "20px",
              padding: "32px", width: "100%", maxWidth: "520px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            {!isSending && (
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "none", border: "none", cursor: "pointer",
                  color: THEME.textMuted, padding: 4,
                }}
              >
                <X size={20} />
              </button>
            )}

            <h2 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 900, color: THEME.textMain }}>
              配信内容の確認
            </h2>
            <p style={{ margin: "0 0 24px 0", fontSize: 13, color: THEME.textMuted }}>
              以下の内容で配信予約を行います。
            </p>

            {/* 配信日時 */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              backgroundColor: "#EEF2FF", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
            }}>
              <Calendar size={18} color={THEME.primary} style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 4 }}>配信日時</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: THEME.textMain }}>
                  {formatScheduledTime(time)}
                </p>
              </div>
            </div>

            {/* 宛先 */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              backgroundColor: "#F0FDF4", borderRadius: 12, padding: "14px 16px", marginBottom: 12,
            }}>
              <CheckCircle2 size={18} color="#10B981" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 4 }}>送信先</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.textMain }}>
                  {c["姓"]} {c["名"]} 様
                </p>
              </div>
            </div>

            {/* メッセージプレビュー */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24,
            }}>
              <MessageSquare size={18} color={THEME.textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 6px 0", fontSize: 11, fontWeight: 800, color: THEME.textMuted }}>メッセージ</p>
                {/* スクロール領域を div で独立させてバーを右端に固定 */}
                <div style={{
                  maxHeight: 160, overflowY: "auto",
                  overflowX: "hidden",
                }}>
                  <p style={{
                    margin: 0, fontSize: 13, color: THEME.textMain,
                    whiteSpace: "pre-wrap", wordBreak: "break-all",
                    lineHeight: 1.7,
                  }}>
                    {resolvedMsg}
                  </p>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSending}
                style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: 48 }}
              >
                修正する
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                style={{ ...styles.btn, ...styles.btnPrimary, flex: 2, height: 48, fontSize: 15 }}
              >
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {isSending ? "送信中..." : "予約を確定する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DirectSms;