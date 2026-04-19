import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Send, CheckCircle2, Trash2, RefreshCw } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, formatDate, smartNormalizePhone } from "../lib/utils";
import Page from "../components/Page";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import { useToast } from "../ToastContext";

function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh }) {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const location  = useLocation();
  const showToast = useToast();

  const justScheduled = location.state?.justScheduled || false;

  const c = customers?.find((x) => String(x.id) === String(id));

  const [edit, setEdit]                 = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [showSuccess, setShowSuccess]   = useState(justScheduled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!justScheduled) return;
    setShowSuccess(true);
    window.history.replaceState({}, "");
    const timer = setTimeout(async () => {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
      setShowSuccess(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    setShowSuccess(false);
  }, [onRefresh]);

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

  const scenarioParentLogs = allLogs
    .filter((l) => !l["親ログID"] && l["ステップ名"] !== "個別SMS")
    .sort((a, b) => new Date(a["配信予定日時"]) - new Date(b["配信予定日時"]));

  const pureIndividualLogs = allLogs
    .filter((l) => !l["親ログID"] && l["ステップ名"] === "個別SMS")
    .sort((a, b) => new Date(b["配信予定日時"]) - new Date(a["配信予定日時"]));

  const handleResend = (messageContent, logId, stepName) => {
    navigate(`/direct-sms/${id}`, {
      state: { prefilledMessage: messageContent, parentId: logId, parentStepName: stepName },
    });
  };

  const handleOpenEdit = (l) => {
    setEdit({
      id: l["ログID"],
      t: new Date(new Date(l["配信予定日時"]).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16),
      m: l["内容"],
    });
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      await apiCall.post(GAS_URL, {
        action: "updateDeliveryTime",
        logId: edit.id,
        newTime: edit.t,
        newMessage: edit.m,
      });
      await onRefresh();
      setEdit(null);
    } catch (e) {
      showToast("更新に失敗しました: " + e.message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiCall.post(GAS_URL, {
        action: "deleteDelivery",
        logId: deleteTarget["ログID"],
      });
      await onRefresh();
      setDeleteTarget(null);
    } catch (e) {
      showToast("削除に失敗しました: " + e.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const getBadgeStyle = (status) => {
    if (status === "配信済み") return { backgroundColor: "#D1FAE5", color: THEME.success };
    if (status === "エラー")   return { backgroundColor: "#FEE2E2", color: THEME.danger };
    return { backgroundColor: "#EEF2FF", color: THEME.primary };
  };

  const LogCard = ({ l, isNested = false }) => (
    <div style={{
      ...styles.card,
      padding: "16px",
      marginLeft: isNested ? "40px" : "0",
      marginTop: isNested ? "8px" : "16px",
      borderLeft: `6px solid ${
        l["ステータス"] === "配信済み" ? THEME.success
        : l["ステータス"] === "エラー"  ? THEME.danger
        : THEME.primary
      }`,
      backgroundColor: isNested ? "#F8FAFC" : "white",
      position: "relative",
      boxShadow: isNested ? "none" : styles.card.boxShadow,
    }}>
      {isNested && (
        <div style={{
          position: "absolute", left: "-24px", top: "-20px",
          width: "24px", height: "46px",
          borderLeft: "2px solid #CBD5E1", borderBottom: "2px solid #CBD5E1",
          borderRadius: "0 0 0 8px",
        }} />
      )}

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

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {l["ステータス"] === "エラー" && (
            <button
              onClick={() => handleResend(l["内容"], l["ログID"], l["ステップ名"])}
              style={{
                ...styles.badge, backgroundColor: THEME.danger, color: "white",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
              }}
            >
              <Send size={10} /> 再送する
            </button>
          )}
          {l["ステータス"] === "配信待ち" && (
            <>
              <button
                onClick={() => handleOpenEdit(l)}
                style={{
                  color: THEME.primary, background: "none", border: "none",
                  cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: "4px 8px",
                }}
              >
                編集
              </button>
              <button
                onClick={() => setDeleteTarget(l)}
                style={{
                  color: THEME.danger, background: "none", border: "none",
                  cursor: "pointer", fontSize: "12px", fontWeight: "800", padding: "4px 8px",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                <Trash2 size={12} /> 削除
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{
        marginTop: "8px", fontSize: "14px", color: THEME.textMain,
        whiteSpace: "pre-wrap", lineHeight: "1.5",
      }}>
        {l["内容"]}
      </div>
    </div>
  );

  return (
    <>
      <Page title="配信状況・履歴" subtitle={`${c["姓"]} ${c["名"]} 様`}>

        {/* ── 登録直後 成功バナー ── */}
        {showSuccess && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#F0FDF4", border: "1px solid #86EFAC",
            borderRadius: "12px", padding: "14px 20px", marginBottom: "24px", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={20} color={THEME.success} />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#065F46" }}>
                  配信予約が完了しました
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#047857", marginTop: 2 }}>
                  {isRefreshing ? "最新データを取得中..." : "まもなく一覧に反映されます"}
                </p>
              </div>
            </div>
            {isRefreshing
              ? <Loader2 size={18} color={THEME.success} className="animate-spin" />
              : (
                <button
                  onClick={handleManualRefresh}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: `1px solid ${THEME.success}`,
                    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                    color: THEME.success, fontSize: 12, fontWeight: 800,
                  }}
                >
                  <RefreshCw size={12} /> 今すぐ更新
                </button>
              )
            }
          </div>
        )}

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

        <div style={{ maxWidth: "850px" }}>
          <h3 style={{
            fontSize: "18px", marginBottom: "20px",
            borderLeft: `4px solid ${THEME.primary}`, paddingLeft: "12px",
          }}>
            シナリオ配信タイムライン
          </h3>
          {scenarioParentLogs.map((pl) => (
            <div key={pl["ログID"]} style={{ marginBottom: "24px" }}>
              <LogCard l={pl} />
              {allLogs
                .filter((cl) => String(cl["親ログID"]) === String(pl["ログID"]))
                .map((cl) => <LogCard key={cl["ログID"]} l={cl} isNested={true} />)}
            </div>
          ))}

          <h3 style={{
            fontSize: "18px", marginTop: "48px", marginBottom: "20px",
            borderLeft: `4px solid ${THEME.textMuted}`, paddingLeft: "12px",
            color: THEME.textMuted,
          }}>
            個別メッセージ履歴
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pureIndividualLogs.map((il) => <LogCard key={il["ログID"]} l={il} />)}
            {pureIndividualLogs.length === 0 && (
              <div style={{ padding: "20px", color: THEME.textMuted, fontSize: "14px", textAlign: "center" }}>
                個別メッセージの履歴はありません
              </div>
            )}
          </div>
        </div>
      </Page>

      {/* ── 編集モーダル ── */}
      {edit && (
        <div
          onClick={() => !isSavingEdit && setEdit(null)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            ...styles.card, width: "550px", padding: "32px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}>
            <h3 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: "900", marginTop: 0 }}>
              配信予定の変更
            </h3>
            <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted, display: "block", marginBottom: "8px" }}>
              新しい配信予定日時
            </label>
            <SmartDateTimePicker value={edit.t} onChange={(t) => setEdit({ ...edit, t })} />
            <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted, display: "block", marginTop: "24px", marginBottom: "8px" }}>
              メッセージ本文の編集
            </label>
            <textarea
              style={{ ...styles.input, height: "180px", resize: "none", lineHeight: "1.6", fontSize: "14px" }}
              value={edit.m}
              onChange={(e) => setEdit({ ...edit, m: e.target.value })}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <button onClick={handleSaveEdit} disabled={isSavingEdit}
                style={{ ...styles.btn, ...styles.btnPrimary, flex: 1, height: "48px" }}>
                {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : "変更を保存"}
              </button>
              <button onClick={() => setEdit(null)} disabled={isSavingEdit}
                style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: "48px" }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 削除確認モーダル ── */}
      {deleteTarget && (
        <div
          onClick={() => !isDeleting && setDeleteTarget(null)}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            ...styles.card, width: "460px", padding: "32px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              backgroundColor: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <Trash2 size={24} color={THEME.danger} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 900 }}>
              配信予定を削除しますか？
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
              この操作は元に戻せません。以下の配信予約を削除します。
            </p>
            <div style={{
              backgroundColor: "#FFF7F7", border: "1px solid #FECACA",
              borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            }}>
              <p style={{ margin: "0 0 4px 0", fontSize: 11, fontWeight: 800, color: THEME.danger }}>
                予定: {formatDate(deleteTarget["配信予定日時"])}
              </p>
              <p style={{
                margin: 0, fontSize: 13, color: THEME.textMain,
                whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 80, overflowY: "auto",
              }}>
                {deleteTarget["内容"]}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                style={{ ...styles.btn, ...styles.btnSecondary, flex: 1, height: 48 }}>
                キャンセル
              </button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting}
                style={{
                  ...styles.btn, flex: 1, height: 48,
                  backgroundColor: THEME.danger, color: "white", border: "none",
                  borderRadius: "10px", fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                {isDeleting
                  ? <Loader2 size={16} className="animate-spin" />
                  : <><Trash2 size={16} /> 削除する</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerSchedule;