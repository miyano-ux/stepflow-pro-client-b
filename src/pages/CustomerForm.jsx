import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, SlidersHorizontal, Upload } from "lucide-react";
import axios from "axios";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";


import { apiCall, smartNormalizePhone, downloadCSV } from "../lib/utils";
import Page from "../components/Page";
import StaffGroupSelect from "../components/StaffGroupSelect";
import DynamicField from "../components/DynamicField";

// ==========================================
// ➕ CustomerForm - 新規顧客登録ページ
// ==========================================

/**
 * 新規顧客を登録するページ（個別入力・CSVインポート対応）
 * @param {Array} formSettings - カスタム項目定義一覧
 * @param {Array} scenarios - シナリオ一覧
 * @param {Array} statuses - 対応ステータス一覧
 * @param {string} masterUrl - マスタAPIのURL
 * @param {function} onRefresh - データ再取得コールバック
 */
function CustomerForm({ formSettings = [], scenarios = [], statuses = [], staffList = [], sources = [], groups = [], contractTypes = [], onRefresh }) {
  const navigate = useNavigate();

  const [ln, setLn] = useState("");
  const [fn, setFn] = useState("");
  const [ph, setPh] = useState("");
  const [fd, setFd] = useState({ "対応ステータス": "未対応", "担当者メール": "" });
  const [successModal, setSuccessModal] = useState(null); // 登録完了ポップアップ
  const [submitting, setSubmitting] = useState(false); // 二重送信防止
  const [sc, setSc] = useState("");

  // 初期化：シナリオの先頭をデフォルト選択
  useEffect(() => {
    if (scenarios?.length > 0) setSc(scenarios[0]["シナリオID"]);
  }, [scenarios]);

  // CSVインポート処理
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rows = ev.target.result
        .split("\n")
        .map((r) =>
          r.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
        );

      const items = rows
        .slice(1)
        .filter((r) => r.length > 2)
        .map((row) => {
          const obj = {
            lastName: row[0],
            firstName: row[1],
            phone: smartNormalizePhone(row[2]),
            scenarioID: row[3],
            data: { "対応ステータス": "未対応" },
          };
          rows[0].slice(4).forEach((h, i) => {
            if (h) obj.data[h] = row[i + 4];
          });
          return obj;
        });

      try {
        await apiCall.post(GAS_URL, { action: "bulkAdd", customers: items });
        alert("一括登録完了");
        onRefresh();
        navigate("/");
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
  };

  // CSVテンプレートダウンロード
  const handleDownloadTemplate = () => {
    const headers = [
      "姓", "名", "電話番号", "シナリオID",
      ...(formSettings || []).map((f) => f.name),
    ];
    downloadCSV(
      [headers, ["山田", "太郎", "09012345678", scenarios[0]?.["シナリオID"] || "A"]],
      "template.csv"
    );
  };

  // ファイル選択ダイアログを開く
  const handleOpenFileDialog = () => {
    const f = document.createElement("input");
    f.type = "file";
    f.accept = ".csv";
    f.onchange = handleUpload;
    f.click();
  };

  // 顧客登録送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // 二重送信防止
    setSubmitting(true);
    try {
      let resolvedData = { ...fd };
      let assignedGroupName = null;
      let assignedStaffName = null;

      // グループ指定の場合、登録前に担当者を解決する
      if (resolvedData["担当者メール"]?.startsWith("group:")) {
        const groupId = resolvedData["担当者メール"].replace("group:", "");
        const res = await apiCall.post(GAS_URL, { action: "assignGroup", groupId });
        if (res?.email) {
          // 割り当てられたグループ名・担当者名を記録（完了モーダル表示用）
          const grp = (groups || []).find(g => g["グループID"] === groupId);
          assignedGroupName = grp?.["グループ名"] || groupId;
          const staff = staffList.find(s => s.email === res.email);
          assignedStaffName = staff ? `${staff.lastName} ${staff.firstName}` : res.email;
          resolvedData = { ...resolvedData, "担当者メール": res.email };
        } else {
          alert("グループ割り当てに失敗しました: " + (res?.message || ""));
          return;
        }
      } else if (resolvedData["担当者メール"]) {
        const staff = staffList.find(s => s.email === resolvedData["担当者メール"]);
        if (staff) assignedStaffName = `${staff.lastName} ${staff.firstName}`;
      }

      await apiCall.post(GAS_URL, {
        action: "add",
        lastName: ln,
        firstName: fn,
        phone: ph,
        data: resolvedData,
        scenarioID: sc,
      });

      // 登録完了モーダルを表示
      setSuccessModal({
        name: `${ln} ${fn}`,
        status: resolvedData["対応ステータス"] || "未対応",
        contractType: resolvedData["契約種別"] || null,
        source: resolvedData["流入元"] || null,
        assignedGroupName,
        assignedStaffName,
        scenarioID: sc || null,
        optimisticCustomer: {
          id: `optimistic_${Date.now()}`,
          姓: ln, 名: fn, 電話番号: ph,
          シナリオID: sc,
          登録日: new Date().toISOString(),
          対応ステータス: resolvedData["対応ステータス"] || "未対応",
          担当者メール: resolvedData["担当者メール"] || "",
          配信ステータス: "配信中",
          ...resolvedData,
          _optimistic: true,
        },
      });
      onRefresh();
    } catch (err) {
      alert(err.message);
      setSubmitting(false); // エラー時はボタンを戻す
    }
  };

  // 登録完了モーダルを閉じてリストへ遷移
  const handleSuccessClose = () => {
    const { optimisticCustomer } = successModal;
    setSuccessModal(null);
    navigate("/", { state: { newCustomer: optimisticCustomer } });
  };

  return (
    <>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    {/* 登録完了モーダル */}
    {successModal && (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
        <div style={{ backgroundColor: "white", borderRadius: 20, padding: 40, maxWidth: 480, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 28 }}>✓</span>
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#166534" }}>登録完了しました</h3>
          <p style={{ margin: "0 0 24px", fontSize: 15, color: "#374151" }}>
            <strong>{successModal.name}</strong> 様を以下の設定で登録しました。
          </p>
          <div style={{ textAlign: "left", backgroundColor: "#F8FAFC", borderRadius: 12, padding: "16px 20px", marginBottom: 28, display: "grid", gap: 10, fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6B7280" }}>対応ステータス</span>
              <strong>{successModal.status}</strong>
            </div>
            {successModal.source && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7280" }}>流入元</span>
                <strong>{successModal.source}</strong>
              </div>
            )}
                    {successModal.contractType && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7280" }}>契約種別</span>
                <strong>{successModal.contractType}</strong>
              </div>
            )}
            {successModal.assignedGroupName ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7280" }}>担当者（グループ割当）</span>
                <span>
                  <span style={{ fontSize: 12, color: "#6366F1", fontWeight: 700 }}>👥 {successModal.assignedGroupName}</span>
                  <span style={{ margin: "0 6px", color: "#D1D5DB" }}>→</span>
                  <strong>{successModal.assignedStaffName}</strong>
                </span>
              </div>
            ) : successModal.assignedStaffName ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7280" }}>担当者</span>
                <strong>{successModal.assignedStaffName}</strong>
              </div>
            ) : null}
            {successModal.scenarioID && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6B7280" }}>適用シナリオ</span>
                <strong>{successModal.scenarioID}</strong>
              </div>
            )}
          </div>
          <button
            onClick={handleSuccessClose}
            style={{ width: "100%", padding: "14px", backgroundColor: "#6366F1", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
          >
            顧客一覧へ戻る
          </button>
        </div>
      </div>
    )}
    <Page
      title="新規顧客登録"
      topButton={
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleDownloadTemplate}
            style={{ ...styles.btn, ...styles.btnSecondary }}
          >
            <FileSpreadsheet size={18} />
            登録テンプレートDL
          </button>
          <button
            onClick={() => navigate("/form-settings")}
            style={{ ...styles.btn, ...styles.btnPrimary }}
          >
            <SlidersHorizontal size={18} />
            登録項目の調整
          </button>
        </div>
      }
    >
      <div style={{ ...styles.card, maxWidth: "700px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>

          {/* 姓・名 */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "700" }}>姓 *</label>
              <input
                style={styles.input}
                required
                onChange={(e) => setLn(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "700" }}>名 *</label>
              <input
                style={styles.input}
                required
                onChange={(e) => setFn(e.target.value)}
              />
            </div>
          </div>

          {/* 電話番号 */}
          <label style={{ fontWeight: "700" }}>電話番号 *</label>
          <input
            style={{ ...styles.input, marginBottom: "20px" }}
            required
            value={ph}
            onChange={(e) => setPh(e.target.value)}
            placeholder="09012345678"
          />

          {/* 営業管理セクション（担当者・ステータス・流入元・シナリオ） */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 20,
              padding: 20,
              background: "#F8FAFC",
              borderRadius: 12,
              border: `1px solid ${THEME.border}`,
            }}
          >
            {/* 担当者 */}
            <div>
              <label htmlFor="form-staff" style={{ fontWeight: 700, fontSize: 12, color: THEME.primary, userSelect: "none" }}>
                担当者
              </label>
              <CustomSelect
                value={fd["担当者メール"]}
                onChange={v => setFd({ ...fd, "担当者メール": v })}
                placeholder="未割当"
                options={[
                  { value: "", label: "未割当" },
                  ...staffList.map(s => ({ value: s.email, label: `${s.lastName} ${s.firstName}` })),
                  ...groups.map(g => ({ value: `group:${g["グループID"]}`, label: `👥 ${g["グループ名"]}（登録時に自動選出）` })),
                ]}
              />
            </div>

            {/* 対応ステータス */}
            <div>
              <label htmlFor="form-status" style={{ fontWeight: 700, fontSize: 12, color: THEME.primary, userSelect: "none" }}>
                対応ステータス
              </label>
              <CustomSelect
                value={fd["対応ステータス"]}
                onChange={v => setFd({ ...fd, "対応ステータス": v })}
                options={statuses.map(st => ({ value: st.name, label: st.name }))}
              />
            </div>

            {/* 流入元 */}
            {sources.length > 0 ? (
              <div>
                <label htmlFor="form-source" style={{ fontWeight: 700, fontSize: 12, color: THEME.primary, userSelect: "none" }}>
                  流入元
                </label>
                <CustomSelect
                  value={fd["流入元"] || ""}
                  onChange={v => setFd({ ...fd, "流入元": v })}
                  placeholder="未選択"
                  options={[{ value: "", label: "未選択" }, ...sources.map(s => ({ value: s.name, label: s.name }))]}
                />
              </div>
            ) : <div />}

            {/* 契約種別 */}
            {contractTypes.length > 0 ? (
              <div>
                <label htmlFor="form-contract" style={{ fontWeight: 700, fontSize: 12, color: THEME.primary, userSelect: "none" }}>
                  契約種別
                </label>
                <CustomSelect
                  value={fd["契約種別"] || ""}
                  onChange={v => setFd({ ...fd, "契約種別": v })}
                  placeholder="未選択"
                  options={[{ value: "", label: "未選択" }, ...contractTypes.map(t => ({ value: t, label: t }))]}
                />
              </div>
            ) : <div />}

            {/* 適用シナリオ（2カラム全幅） */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="form-scenario" style={{ fontWeight: 700, fontSize: 12, color: THEME.primary, userSelect: "none" }}>
                適用シナリオ
              </label>
              <CustomSelect
                value={sc}
                onChange={v => setSc(v)}
                options={[...new Set(scenarios?.map(x => x["シナリオID"]))].map(sid => ({ value: sid, label: sid }))}
              />
            </div>
          </div>

          {/* カスタム項目 */}
          {formSettings.map((f) => (
            <div key={f.name} style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "700" }}>{f.name}</label>
              <DynamicField
                f={f}
                value={fd[f.name]}
                onChange={(v) => setFd({ ...fd, [f.name]: v })}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", padding: "16px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                登録中...
              </span>
            ) : "登録を確定する"}
          </button>
        </form>

        {/* CSVインポート */}
        <div
          style={{
            marginTop: "24px",
            borderTop: `1px solid ${THEME.border}`,
            paddingTop: "24px",
          }}
        >
          <button
            onClick={handleOpenFileDialog}
            style={{ ...styles.btn, ...styles.btnSecondary, width: "100%" }}
          >
            <Upload size={18} />
            CSVファイルから一括インポート
          </button>
        </div>
      </div>
    </Page>
    </>
  );
}

export default CustomerForm;