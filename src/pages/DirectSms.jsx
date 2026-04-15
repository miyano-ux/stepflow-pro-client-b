import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Loader2, UserCheck, Zap, Send, Calendar, MessageSquare, X, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, replaceVariables } from "../lib/utils";
import Page from "../components/Page";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import { useToast } from "../ToastContext";

// ==========================================
// 💬 DirectSms - 個別メッセージ送信ページ
// ==========================================

/** "YYYY-MM-DDTHH:mm" → 読みやすい日本語表記 */
const formatScheduledTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日（${weekdays[d.getDay()]}）${p(d.getHours())}:${p(d.getMinutes())}`;
};

function DirectSms({ customers = [], templates = [], onRefresh, masterUrl, currentUserEmail }) {
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const c = customers?.find((x) => String(x.id) === String(id));

  const [msg, setMsg] = useState(location.state?.prefilledMessage || "");
  const [isConverting, setIsConverting] = useState(false);
  const [staffList, setStaffList] = useState([]);
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

  // スタッフ一覧を取得し、ログイン中ユーザーを初期選択
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(
          `${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`
        );
        const list = res?.data?.users || [];
        setStaffList(list);
        const myProfile = list.find(
          (s) => String(s.email).toLowerCase() === String(currentUserEmail).toLowerCase()
        );
        if (myProfile) {
          setSelectedStaff(myProfile);
        } else if (list.length > 0) {
          setSelectedStaff(list[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (masterUrl) fetchStaff();
  }, [masterUrl, currentUserEmail]);

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
      showToast("トラッキングURLへの変換に失敗しました。Vercelの環境変数BASE_URLが正しく設定されているか確認してください。", "error");
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
    setIsSending(true);
    try {
      await apiCall.post(GAS_URL, {
        action: "sendDirectSms",
        phone: c["電話番号"],
        customerName: `${c["姓"]} ${c["名"]}`,
        scheduledTime: time,
        message: msg,
        parentId: parentId,
        stepName: parentStepName,
      });
      setShowConfirm(false);
      onRefresh();
      // 配信履歴ページへ遷移（配信予約を確認できるように）
      navigate(`/schedule/${id}`, { state: { justScheduled: true } });
    } catch (e) {
      console.error(e);
      showToast("配信予約に失敗しました", "error");
    } finally {
      setIsSending(false);
    }
  };

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}>

          {/* ── 左カラム：送信設定 */}
          <div>

            {/* 送信担当者選択 */}
            <div style={{ ...styles.card, marginBottom: 24, backgroundColor: "#EEF2FF", border: "none", padding: "20px" }}>
              <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, color: THEME.primary }}>
                <UserCheck size={14} /> 送信担当者
              </label>
              <div style={{ position: "relative" }}>
                <select
                  style={styles.select}
                  value={selectedStaff?.email || ""}
                  onChange={(e) =>
                    setSelectedStaff(staffList.find((s) => s.email === e.target.value))
                  }
                >
                  {staffList.map((s) => (
                    <option key={s.email} value={s.email}>
                      {s.lastName} {s.firstName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 配信日時 */}
            <div style={{ marginBottom: 24 }}>
              <label style={styles.label}>配信日時</label>
              <SmartDateTimePicker value={time} onChange={setTime} />
            </div>

            {/* 配信内容 */}
            <div>
              {/* ラベル行：左にタイトル、右にトラッキングボタン */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>配信内容</label>
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

              <textarea
                style={{ ...styles.input, height: "280px", resize: "none" }}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="メッセージを入力してください。URLを入力して上のボタンを押すとクリック計測が可能になります。"
              />
            </div>

            {/* 配信予約ボタン */}
            <button
              onClick={handleConfirmOpen}
              style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: "24px", height: "54px", fontSize: "15px" }}
            >
              <Send size={18} />
              配信予約を確定する
            </button>
          </div>

          {/* ── 右カラム：テンプレート一覧 */}
          <div>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "800" }}>テンプレート</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setMsg(replaceVariables(t.content, c, selectedStaff))}
                  style={{ ...styles.card, padding: "16px", cursor: "pointer" }}
                >
                  {t.name}
                </div>
              ))}
            </div>
          </div>

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
                    {msg}
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