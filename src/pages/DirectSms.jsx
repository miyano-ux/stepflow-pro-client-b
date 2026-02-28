import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Loader2, UserCheck, Zap } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, replaceVariables } from "../lib/utils";
import Page from "../components/Page";
import SmartDateTimePicker from "../components/SmartDateTimePicker";

// ==========================================
// 💬 DirectSms - 個別メッセージ送信ページ
// ==========================================

/**
 * 顧客への個別SMSを作成・送信予約するページ
 * @param {Array} customers - 顧客一覧
 * @param {Array} templates - テンプレート一覧
 * @param {function} onRefresh - データ再取得コールバック
 * @param {string} masterUrl - マスタAPIのURL
 * @param {string} currentUserEmail - ログイン中のユーザーメールアドレス
 */
function DirectSms({ customers = [], templates = [], onRefresh, masterUrl, currentUserEmail }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const c = customers?.find((x) => x.id === Number(id));

  const [msg, setMsg] = useState(location.state?.prefilledMessage || "");
  const [isConverting, setIsConverting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [time, setTime] = useState(
    new Date(new Date().getTime() + 10 * 60000).toISOString().slice(0, 16)
  );

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
          (s) =>
            String(s.email).toLowerCase() ===
            String(currentUserEmail).toLowerCase()
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
        // すでにトラッキング済みのURLはスキップ
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
      alert(
        "トラッキングURLへの変換に失敗しました。Vercelの環境変数BASE_URLが正しく設定されているか確認してください。"
      );
    } finally {
      setIsConverting(false);
    }
  };

  // 配信予約を確定
  const handleSend = async () => {
    if (!msg) return alert("本文を入力してください");
    await apiCall.post(GAS_URL, {
      action: "sendDirectSms",
      phone: c["電話番号"],
      customerName: `${c["姓"]} ${c["名"]}`,
      scheduledTime: time,
      message: msg,
      parentId: parentId,
      stepName: parentStepName,
    });
    alert("配信予約完了");
    navigate("/");
    onRefresh();
  };

  if (!c) {
    return (
      <Page title="読込中...">
        <Loader2 className="animate-spin" />
      </Page>
    );
  }

  return (
    <Page title="個別メッセージ送信" subtitle={`${c["姓"]} ${c["名"]} 様`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "32px" }}>

        {/* 左カラム：送信設定 */}
        <div>

          {/* 送信担当者選択 */}
          <div
            style={{
              ...styles.card,
              marginBottom: 24,
              backgroundColor: "#EEF2FF",
              border: "none",
              padding: "20px",
            }}
          >
            <label
              style={{
                fontWeight: "800",
                fontSize: 11,
                color: THEME.primary,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <UserCheck size={16} /> 送信担当者
            </label>
            <select
              style={styles.input}
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

          {/* 配信内容入力 */}
          <div style={{ position: "relative" }}>
            <label
              style={{
                fontWeight: "700",
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              配信内容
            </label>

            {/* トラッキングURL変換ボタン（URLが含まれる場合のみ表示） */}
            {hasUrl && (
              <button
                onClick={handleConvertToTracking}
                disabled={isConverting}
                style={{
                  position: "absolute",
                  right: 0,
                  top: -5,
                  ...styles.btn,
                  backgroundColor: "white",
                  color: THEME.primary,
                  border: `1px solid ${THEME.primary}`,
                  padding: "4px 12px",
                  height: "30px",
                  fontSize: "12px",
                }}
              >
                {isConverting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                URLをトラッキング化
              </button>
            )}

            <SmartDateTimePicker value={time} onChange={setTime} />

            <textarea
              style={{
                ...styles.input,
                height: "300px",
                resize: "none",
                marginTop: "24px",
              }}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="メッセージを入力してください。URLを入力して上のボタンを押すとクリック計測が可能になります。"
            />
          </div>

          {/* 配信予約ボタン */}
          <button
            onClick={handleSend}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              width: "100%",
              marginTop: "24px",
              height: "54px",
            }}
          >
            配信予約を確定する
          </button>
        </div>

        {/* 右カラム：テンプレート一覧 */}
        <div>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "800" }}>
            テンプレート
          </h3>
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
  );
}

export default DirectSms;