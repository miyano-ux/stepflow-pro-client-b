import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Send, CheckCircle2, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, formatDate, smartNormalizePhone } from "../lib/utils";
import Page from "../components/Page";
import SmartDateTimePicker from "../components/SmartDateTimePicker";
import { useToast } from "../ToastContext";

function CustomerSchedule({ customers = [], deliveryLogs = [], onRefresh, isLoading = false }) {
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

  // 【ペイロード分離】配信ログは props ではなく getCustomerBundle で顧客単位に取得する
  // 【C4-002 / Z-004 横展開】取得失敗を無言で握りつぶすと fetchedLogs が null のままとなり、
  //   props の deliveryLogs（getAppData はペイロード分離で配信ログを返さない）へフォールバックして
  //   シートに配信ログがあっても「0件」と表示され、"データが無い" のか "取得に失敗した" のかを
  //   画面から切り分けられなくなる（GAS の再デプロイ漏れ＝unknown action が典型例）。
  //   ローディング / エラー / 0件 の3状態を明示的に区別する。CustomerDetail の reloadBundle と同方針。
  const [fetchedLogs, setFetchedLogs]         = useState(null);
  const [logsError, setLogsError]             = useState(null);
  const [isLogsLoading, setIsLogsLoading]     = useState(true);
  const reloadLogs = useCallback(async () => {
    if (!id) return;
    setIsLogsLoading(true);
    try {
      // 【高速化】本画面は deliveryLogs しか使わないため、only 指定で
      //   GAS 側のステータス履歴/トラッキング/物件シートの読み取りをスキップさせる。
      //   （only 未対応の旧GASに対してはパラメータが無視され全量が返るだけで後方互換）
      const res = await apiCall.post(GAS_URL, { action: "getCustomerBundle", customerId: id, only: "deliveryLogs" });
      setFetchedLogs(res?.deliveryLogs || []);
      setLogsError(null);
    } catch (e) {
      console.warn("[CustomerSchedule] getCustomerBundle 取得失敗", e);
      setLogsError(e?.message || "配信履歴の取得に失敗しました");
      showToast("配信履歴の取得に失敗しました（表示が最新でない可能性があります）", "error");
    } finally {
      setIsLogsLoading(false);
    }
  }, [id, showToast]);
  useEffect(() => { reloadLogs(); }, [reloadLogs]);

  useEffect(() => {
    if (!justScheduled) return;
    setShowSuccess(true);
    window.history.replaceState({}, "");
    const timer = setTimeout(async () => {
      setIsRefreshing(true);
      // 【高速化】handleManualRefresh と同様に並列化
      await Promise.all([onRefresh(), reloadLogs()]);
      setIsRefreshing(false);
      setShowSuccess(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // 【高速化】互いに独立した取得のため並列化（直列 await で合計時間が倍になっていた）
    await Promise.all([onRefresh(), reloadLogs()]);
    setIsRefreshing(false);
    setShowSuccess(false);
  }, [onRefresh, reloadLogs]);

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

  if (!customers.length || !c) {
    return (
      <Page title="読込中...">
        <Loader2 size={24} className="animate-spin" />
      </Page>
    );
  }

  const cP = smartNormalizePhone(c["電話番号"]);
  // 【C4-002】getCustomerBundle は「顧客ID ∪ 電話番号」でサーバー側フィルタ済み
  // （gas_updated.js:1344-1347）。ここで電話番号だけの絞り込みを重ねると、
  // 顧客ID でしか紐づかない行（電話番号が空／登録後に電話番号を変更した等）を
  // 取りこぼして「シートに4件あるのにUIは0件」になる。
  // CustomerDetail の statusHistory / properties / trackingLogs と同様、
  // サーバーと同一キーで突合する。
  // ※ cP が空のときに電話番号突合を行わないのは、電話番号未登録の顧客で
  //   "" === "" が成立し他顧客の空電話ログを拾ってしまうのを防ぐため。
  // 【C4-001】顧客IDの突合を GAS 側（gas_updated.js getCustomerBundle の
  //   String(o["顧客ID"]||"").trim() === cid）と同一化する。
  //   GAS は C4-002 対応で末尾スペース等の表記揺れを trim で吸収して行を返すが、
  //   フロントのこの再フィルタが「trim なしの厳密一致」のままだと、
  //   GAS が返した行をここで全件振り落とし、シナリオ配信タイムラインと
  //   個別メッセージ履歴の両方が 0 件（＝タイムライン常時空欄）になる。
  const cidNorm = String(id).trim();
  const allLogs = ((fetchedLogs ?? deliveryLogs) || []).filter(
    (l) =>
      String(l["顧客ID"] ?? "").trim() === cidNorm ||
      (cP && smartNormalizePhone(l["電話番号"]) === cP)
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
    // 【C4-008】過去日時のすり抜け対策（保存時チェック）
    //   未来日時を選んだままモーダルを放置し、その時刻を過ぎてから保存された場合、
    //   リアルタイム警告（isPastEditTime）は再描画されず表示されないため、ここで受け止める。
    //   最終防衛は GAS 側 updateDeliveryTime の過去日時拒否（二重防御）。
    if (new Date(edit.t).getTime() <= Date.now()) {
      showToast("過去の日時は指定できません。未来の日時を指定してください", "error");
      return;
    }
    setIsSavingEdit(true);
    try {
      await apiCall.post(GAS_URL, {
        action: "updateDeliveryTime",
        logId: edit.id,
        newTime: edit.t,
        newMessage: edit.m,
      });
      // 【高速化】updateDeliveryTime は配信管理シートのみ更新し顧客データに影響しない。
      //   さらにペイロード分離後の getAppData は deliveryLogs を返さないため、
      //   onRefresh（全件 ~数百KB の再取得）をここで待つ意味がなく、体感を著しく悪化させていた。
      //   本画面の一覧は reloadLogs（getCustomerBundle）だけで最新化できる。
      await reloadLogs();
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
      // 【高速化】handleSaveEdit と同理由。deleteDelivery は配信管理シートのみ更新。
      await reloadLogs();
      setDeleteTarget(null);
    } catch (e) {
      showToast("削除に失敗しました: " + e.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ローディング / 取得失敗 / 取得済み の3状態。
  // 「0件」と表示してよいのは logsState === "ready" のときだけ。
  const logsState = logsError ? "error" : (fetchedLogs === null ? "loading" : "ready");

  // 【C4-008】編集モーダルで選択中の日時が過去かどうか。
  //   edit.t が変わるたびに再描画されるため、選択した瞬間に警告バナーの表示と
  //   保存ボタンの無効化へ反映される。SmartDateTimePicker（共有部品）には手を入れない。
  const isPastEditTime = edit ? new Date(edit.t).getTime() <= Date.now() : false;

  const LogsPlaceholder = ({ label }) => {
    if (logsState === "loading") {
      return (
        <div style={{ padding: "20px", color: THEME.textMuted, fontSize: "14px", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 size={16} className="animate-spin" /> 配信履歴を取得中...
        </div>
      );
    }
    if (logsState === "error") {
      return (
        <div style={{ padding: "20px", color: THEME.danger, fontSize: "14px", textAlign: "center" }}>
          配信履歴を取得できませんでした（0件ではありません）
        </div>
      );
    }
    return (
      <div style={{ padding: "20px", color: THEME.textMuted, fontSize: "14px", textAlign: "center" }}>
        {label}
      </div>
    );
  };

  const getBadgeStyle = (status) => {
    if (status === "配信済み") return { backgroundColor: "#D1FAE5", color: THEME.success };
    if (status === "エラー")   return { backgroundColor: "#FEE2E2", color: THEME.danger };
    // 【C4-003】「中止」は期待3色（緑/紫/赤）に含まれない第4のステータス。
    //   定義が無いと else に落ちて「配信待ち」と同じ紫になり見分けがつかないため、
    //   グレーで明示的に区別する（左端の縦線も同色 → LogCard 側と対で変更）。
    if (status === "中止")     return { backgroundColor: "#F1F5F9", color: "#64748B" };
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
        : l["ステータス"] === "中止"    ? "#94A3B8"   // 【C4-003】バッジと同系色（グレー）
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

        {/* ── 【C4-002】配信履歴の取得失敗バナー ──
            取得に失敗したまま「履歴はありません」と出すと、実データの有無と切り分けできないため明示する ── */}
        {logsState === "error" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: "12px", padding: "14px 20px", marginBottom: "24px", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={20} color={THEME.danger} />
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#991B1B" }}>
                  配信履歴を取得できませんでした
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#B91C1C" }}>
                  下の一覧は最新ではありません（「0件」ではなく取得エラーです）。{logsError}
                </p>
              </div>
            </div>
            <button
              onClick={reloadLogs}
              disabled={isLogsLoading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: `1px solid ${THEME.danger}`,
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                color: THEME.danger, fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}
            >
              {isLogsLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <><RefreshCw size={12} /> 再読込</>}
            </button>
          </div>
        )}

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
          {scenarioParentLogs.length === 0 && (
            <LogsPlaceholder label="シナリオ配信の履歴はありません" />
          )}

          <h3 style={{
            fontSize: "18px", marginTop: "48px", marginBottom: "20px",
            borderLeft: `4px solid ${THEME.textMuted}`, paddingLeft: "12px",
            color: THEME.textMuted,
          }}>
            個別メッセージ履歴
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* 【C4-014】個別SMS(エラー)を再送した場合の子ログ(親ログID=個別SMSのログID)は
                従来どちらのセクションにも描画されず行方不明になっていた。
                シナリオ配信タイムライン側(上)と同じ親子ネスト描画をこちらにも設ける。 */}
            {pureIndividualLogs.map((il) => (
              <div key={il["ログID"]}>
                <LogCard l={il} />
                {allLogs
                  .filter((cl) => String(cl["親ログID"]) === String(il["ログID"]))
                  .map((cl) => <LogCard key={cl["ログID"]} l={cl} isNested={true} />)}
              </div>
            ))}
            {pureIndividualLogs.length === 0 && (
              <LogsPlaceholder label="個別メッセージの履歴はありません" />
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
            {/* 【C4-008】過去日時のリアルタイム警告（選んだ瞬間に気づけるようにする） */}
            {isPastEditTime && (
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
            <label style={{ fontSize: "12px", fontWeight: "800", color: THEME.textMuted, display: "block", marginTop: "24px", marginBottom: "8px" }}>
              メッセージ本文の編集
            </label>
            <textarea
              style={{ ...styles.input, height: "180px", resize: "none", lineHeight: "1.6", fontSize: "14px" }}
              value={edit.m}
              onChange={(e) => setEdit({ ...edit, m: e.target.value })}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <button onClick={handleSaveEdit} disabled={isSavingEdit || isPastEditTime}
                style={{
                  ...styles.btn, ...styles.btnPrimary, flex: 1, height: "48px",
                  opacity: isPastEditTime ? 0.5 : 1,
                  cursor: isPastEditTime ? "not-allowed" : "pointer",
                }}>
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