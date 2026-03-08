import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, formatDate, smartNormalizePhone } from "../lib/utils";
import Page from "../components/Page";
import SmartDateTimePicker from "../components/SmartDateTimePicker";

// ==========================================
// 📋 CustomerSchedule - 配信状況・履歴ページ
// ==========================================

/**
 * 顧客ごとの配信状況・配信履歴を表示するページ
 * @param {Array} customers - 顧客一覧
 * @param {Array} deliveryLogs - 配信ログ一覧
 * @param {function} onRefresh - データ再取得コールバック
 */
function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const c = customers?.find((x) => String(x.id) === String(id));

  // 編集モーダルの開閉と編集データを管理
  const [edit, setEdit] = useState(null);

  // データ未取得時のローディング表示
  if (!customers.length || !c) {
    return (
      <Page title="読込中...">
        <Loader2 size={24} className="animate-spin" />
      </Page>
    );
  }

  const cP = smartNormalizePhone(c["電話番号"]);
  const allLogs = (deliveryLogs || []).filter(
    (l) => smartNormalizePhone(l["電話番号"]) === cP
  );

  // シナリオ配信の親ログ（個別SMS以外・親ログIDなし）
  const scenarioParentLogs = allLogs
    .filter((l) => !l["親ログID"] && l["ステップ名"] !== "個別SMS")
    .sort(
      (a, b) =>
        new Date(a["配信予定日時"]) - new Date(b["配信予定日時"])
    );

  // 独立した個別SMSログ
  const pureIndividualLogs = allLogs
    .filter((l) => !l["親ログID"] && l["ステップ名"] === "個別SMS")
    .sort(
      (a, b) =>
        new Date(b["配信予定日時"]) - new Date(a["配信予定日時"])
    );

  // エラー時の再送画面へ遷移
  const handleResend = (messageContent, logId, stepName) => {
    navigate(`/direct-sms/${id}`, {
      state: {
        prefilledMessage: messageContent,
        parentId: logId,
        parentStepName: stepName,
      },
    });
  };

  // 編集モーダルを開く（配信予定日時をローカル時間に変換してセット）
  const handleOpenEdit = (l) => {
    setEdit({
      id: l["ログID"],
      t: new Date(
        new Date(l["配信予定日時"]).getTime() -
          new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16),
      m: l["内容"],
    });
  };

  // 編集内容を保存
  const handleSaveEdit = async () => {
    try {
      await apiCall.post(GAS_URL, {
        action: "updateDeliveryTime",
        logId: edit.id,
        newTime: edit.t,
        newMessage: edit.m,
      });
      alert("配信予定を更新しました");
      onRefresh();
      setEdit(null);
    } catch (e) {
      alert("更新に失敗しました: " + e.message);
    }
  };

  // ステータスに応じたバッジカラーを返す
  const getBadgeStyle = (status) => {
    if (status === "配信済み") {
      return { backgroundColor: "#D1FAE5", color: THEME.success };
    }
    if (status === "エラー") {
      return { backgroundColor: "#FEE2E2", color: THEME.danger };
    }
    return { backgroundColor: "#EEF2FF", color: THEME.primary };
  };

  // ログ1件を表示するカード
  const LogCard = ({ l, isNested = false }) => (
    <div
      style={{
        ...styles.card,
        padding: "16px",
        marginLeft: isNested ? "40px" : "0",
        marginTop: isNested ? "8px" : "16px",
        borderLeft: `6px solid ${
          l["ステータス"] === "配信済み"
            ? THEME.success
            : l["ステータス"] === "エラー"
            ? THEME.danger
            : THEME.primary
        }`,
        backgroundColor: isNested ? "#F8FAFC" : "white",
        position: "relative",
        boxShadow: isNested ? "none" : styles.card.boxShadow,
      }}
    >
      {/* ネスト時のコネクター線 */}
      {isNested && (
        <div
          style={{
            position: "absolute",
            left: "-24px",
            top: "-20px",
            width: "24px",
            height: "46px",
            borderLeft: "2px solid #CBD5E1",
            borderBottom: "2px solid #CBD5E1",
            borderRadius: "0 0 0 8px",
          }}
        />
      )}

      {/* ヘッダー行 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ ...styles.badge, ...getBadgeStyle(l["ステータス"]) }}>
            {l["ステータス"]}
          </span>
          <span style={{ fontWeight: "800", marginLeft: "12px", fontSize: "13px" }}>
            {l["完了日時"]
              ? `完了: ${formatDate(l["完了日時"])}`
              : `予定: ${formatDate(l["配信予定日時"])}`}
          </span>
          <span style={{ marginLeft: "12px", color: THEME.textMuted, fontSize: "11px" }}>
            {l["ステップ名"]}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {l["ステータス"] === "エラー" && (
            <button
              onClick={() => handleResend(l["内容"], l["ログID"], l["ステップ名"])}
              style={{
                ...styles.badge,
                backgroundColor: THEME.danger,
                color: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
              }}
            >
              <Send size={10} /> 再送する
            </button>
          )}
          {l["ステータス"] === "配信待ち" && (
            <button
              onClick={() => handleOpenEdit(l)}
              style={{
                color: THEME.primary,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "800",
                padding: "4px 8px",
              }}
            >
              編集
            </button>
          )}
        </div>
      </div>

      {/* メッセージ本文 */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "14px",
          color: THEME.textMain,
          whiteSpace: "pre-wrap",
          lineHeight: "1.5",
        }}
      >
        {l["内容"]}
      </div>
    </div>
  );

  return (
    <Page title="配信状況・履歴" subtitle={`${c["姓"]} ${c["名"]} 様`}>

      {/* 戻るリンク */}
      <Link
        to="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "24px",
          color: THEME.primary,
          textDecoration: "none",
          fontWeight: "700",
          fontSize: "14px",
        }}
      >
        ← 戻る
      </Link>

      <div style={{ maxWidth: "850px" }}>

        {/* シナリオ配信タイムライン */}
        <h3
          style={{
            fontSize: "18px",
            marginBottom: "20px",
            borderLeft: `4px solid ${THEME.primary}`,
            paddingLeft: "12px",
          }}
        >
          シナリオ配信タイムライン
        </h3>
        {scenarioParentLogs.map((pl) => (
          <div key={pl["ログID"]} style={{ marginBottom: "24px" }}>
            <LogCard l={pl} />
            {allLogs
              .filter((cl) => String(cl["親ログID"]) === String(pl["ログID"]))
              .map((cl) => (
                <LogCard key={cl["ログID"]} l={cl} isNested={true} />
              ))}
          </div>
        ))}

        {/* 個別メッセージ履歴 */}
        <h3
          style={{
            fontSize: "18px",
            marginTop: "48px",
            marginBottom: "20px",
            borderLeft: `4px solid ${THEME.textMuted}`,
            paddingLeft: "12px",
            color: THEME.textMuted,
          }}
        >
          個別メッセージ履歴
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pureIndividualLogs.map((il) => (
            <LogCard key={il["ログID"]} l={il} />
          ))}
          {pureIndividualLogs.length === 0 && (
            <div
              style={{
                padding: "20px",
                color: THEME.textMuted,
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              個別メッセージの履歴はありません
            </div>
          )}
        </div>
      </div>

      {/* 配信予定編集モーダル */}
      {edit && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              ...styles.card,
              width: "550px",
              padding: "32px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "900", marginTop: 0 }}>
              配信予定の変更
            </h3>

            <label
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: THEME.textMuted,
                display: "block",
                marginBottom: "8px",
              }}
            >
              新しい配信予定日時
            </label>
            <SmartDateTimePicker
              value={edit.t}
              onChange={(t) => setEdit({ ...edit, t })}
            />

            <label
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: THEME.textMuted,
                display: "block",
                marginTop: "24px",
                marginBottom: "8px",
              }}
            >
              メッセージ本文の編集
            </label>
            <textarea
              style={{
                ...styles.input,
                height: "180px",
                resize: "none",
                lineHeight: "1.6",
                fontSize: "14px",
              }}
              value={edit.m}
              onChange={(e) => setEdit({ ...edit, m: e.target.value })}
            />

            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <button
                onClick={handleSaveEdit}
                style={{ ...styles.btn, ...styles.btnPrimary, flex: 1, height: "48px" }}
              >
                変更を確定して保存
              </button>
              <button
                onClick={() => setEdit(null)}
                style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: "48px" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default CustomerSchedule;