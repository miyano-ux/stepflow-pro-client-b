import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, SlidersHorizontal, Upload } from "lucide-react";
import axios from "axios";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";


import { apiCall, smartNormalizePhone, downloadCSV } from "../lib/utils";
import ExcelJS from "exceljs";
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
  const [em, setEm] = useState("");
  const [fd, setFd] = useState({ "対応ステータス": "", "担当者メール": "" });
  const [successModal, setSuccessModal] = useState(null); // 登録完了ポップアップ
  const [submitting, setSubmitting] = useState(false); // 二重送信防止
  const [sc, setSc] = useState("");

  // 行データ（ヘッダー名→値マップの配列）をAPIに送信する共通処理
  const bulkSubmit = async (rowMaps) => {
    const items = rowMaps.map((row) => {
      const get = (name) => row[name] ?? "";

      // 担当者名→メール変換：「担当者名」列があればメールに解決、なければ「担当者メール」列をそのまま使用
      let staffEmail = get("担当者メール");
      const staffName = get("担当者名");
      if (staffName && staffName !== "未選択") {
        const matched = (staffList || []).find(
          (s) => `${s.lastName} ${s.firstName}` === staffName || `${s.lastName}${s.firstName}` === staffName
        );
        if (matched) staffEmail = matched.email;
      }

      // シナリオID・契約種別の「未選択」を空文字に正規化
      const rawScenario = get("シナリオID");
      const rawContract = get("契約種別");

      const obj = {
        lastName:   get("姓"),
        firstName:  get("名"),
        phone:      smartNormalizePhone(get("電話番号")),
        email:      get("メールアドレス"),
        scenarioID: rawScenario === "未選択" ? "" : rawScenario,
        data: {
          "対応ステータス": get("対応ステータス") || "未対応",
          "担当者メール":   staffEmail,
          "流入元":         get("流入元")         || "",
          "契約種別":       rawContract === "未選択" ? "" : rawContract,
        },
      };
      (formSettings || []).forEach((f) => {
        if (f.name in row) {
          const v = get(f.name);
          obj.data[f.name] = (f.type === "dropdown" && v === "未選択") ? "" : v;
        }
      });
      return obj;
    });
    await apiCall.post(GAS_URL, { action: "bulkAdd", customers: items });
    alert("一括登録完了");
    onRefresh();
    navigate("/");
  };

  // CSV / xlsx どちらでもインポート可能
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        let rowMaps = [];

        if (isXlsx) {
          // ── xlsx ──────────────────────────────────────────
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(ev.target.result);
          // "顧客登録" シートを優先、なければ最初のシート
          const ws = wb.getWorksheet("顧客登録") || wb.worksheets[0];
          const allRows = [];
          ws.eachRow((row) => { allRows.push(row.values.slice(1)); }); // index 0 は空
          if (allRows.length < 2) return;
          const headers = allRows[0].map((v) => String(v ?? "").trim());
          rowMaps = allRows.slice(1)
            .filter((r) => r.some(Boolean))
            .map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "").trim()])));
        } else {
          // ── CSV ───────────────────────────────────────────
          const rows = ev.target.result
            .split("\n")
            .map((r) => r.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
          if (rows.length < 2) return;
          const headers = rows[0];
          rowMaps = rows.slice(1)
            .filter((r) => r.length > 2)
            .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
        }

        await bulkSubmit(rowMaps);
      } catch (err) {
        alert(err.message);
      }
    };

    if (isXlsx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, "UTF-8");
    }
  };

  // Excelテンプレートダウンロード（ドロップダウン付き）
  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();

    // ── 選択肢データを準備 ──────────────────────────────────
    const statusOpts   = statuses.map((s) => s.name);
    const staffEmails  = staffList.map((s) => s.email);
    const staffOpts    = staffList.map((s) => `${s.lastName} ${s.firstName}`);
    const sourceOpts   = sources.map((s) => s.name);

    // 契約種別：「未選択」を先頭に追加
    const contractOpts = ["未選択", ...contractTypes];

    // シナリオID：ステータスに紐づいているものを除外し「未選択」を先頭に追加
    const linkedScenarioIds = new Set(statuses.map((s) => s.scenarioId).filter(Boolean));
    const scenarioOpts = [
      "未選択",
      ...new Set((scenarios || []).map((x) => x["シナリオID"]).filter((sid) => !linkedScenarioIds.has(sid))),
    ];

    // カスタム項目のドロップダウン選択肢（dropdown型のみ）
    const customDropdowns = (formSettings || [])
      .map((f, i) => {
        if (f.type !== "dropdown") return null;
        const opts = ["未選択", ...(f.options || "").split(",").map((o) => o.trim()).filter(Boolean)];
        return { field: f, fieldIndex: i, opts };
      })
      .filter(Boolean);

    // ── 選択肢シート（非表示）──────────────────────────────
    const optSheet = wb.addWorksheet("選択肢", { state: "veryHidden" });

    // 固定列：A=対応ステータス, B=担当者名, C=流入元, D=契約種別, E=シナリオID
    // カスタムドロップダウン列：F列以降
    const colLetters = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

    optSheet.getCell("A1").value = "対応ステータス";
    optSheet.getCell("B1").value = "担当者名";
    optSheet.getCell("C1").value = "流入元";
    optSheet.getCell("D1").value = "契約種別";
    optSheet.getCell("E1").value = "シナリオID";

    statusOpts.forEach((v, i)  => { optSheet.getCell(`A${i + 2}`).value = v; });
    staffOpts.forEach((v, i)   => { optSheet.getCell(`B${i + 2}`).value = v; });
    sourceOpts.forEach((v, i)  => { optSheet.getCell(`C${i + 2}`).value = v; });
    contractOpts.forEach((v, i) => { optSheet.getCell(`D${i + 2}`).value = v; });
    scenarioOpts.forEach((v, i) => { optSheet.getCell(`E${i + 2}`).value = v; });

    // カスタムドロップダウンの選択肢をF列以降に格納
    customDropdowns.forEach(({ field, opts }, ci) => {
      const colLetter = colLetters[5 + ci]; // F から開始
      optSheet.getCell(`${colLetter}1`).value = field.name;
      opts.forEach((v, i) => { optSheet.getCell(`${colLetter}${i + 2}`).value = v; });
    });

    // ── データシート ────────────────────────────────────────
    const ws = wb.addWorksheet("顧客登録");

    const fixedHeaders = [
      { key: "姓",             note: "（必須）",                                              type: "text" },
      { key: "名",             note: "（必須）",                                              type: "text" },
      { key: "電話番号",       note: "例: 09012345678（必須）",                               type: "text" },
      { key: "メールアドレス", note: "例: example@email.com",                                 type: "text" },
      { key: "対応ステータス", note: "プルダウンから選択",                                     type: "dropdown" },
      { key: "担当者名",       note: "プルダウンから担当者を選択",                         type: "dropdown" },
      { key: "流入元",         note: "プルダウンから選択",                                     type: "dropdown" },
      { key: "契約種別",       note: "プルダウンから選択（未選択も可）",                       type: "dropdown" },
      { key: "シナリオID",     note: "プルダウンから選択（ステータス未紐付けのもののみ表示）", type: "dropdown" },
    ];
    const customHeaders = (formSettings || []).map((f) => ({
      key:  f.name,
      note: f.type === "date"     ? "例: 2025/01/31（YYYY/MM/DD形式）"
          : f.type === "dropdown" ? "プルダウンから選択（未選択も可）"
          : "",
      type: f.type,
      field: f,
    }));
    const allHeaders = [...fixedHeaders, ...customHeaders];

    // ヘッダー行
    ws.addRow(allHeaders.map((h) => h.key));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
    ws.getRow(1).height = 22;

    // サンプルデータ行
    const sampleRow = allHeaders.map((h) => {
      if (h.key === "姓")             return "山田";
      if (h.key === "名")             return "太郎";
      if (h.key === "電話番号")       return "09012345678";
      if (h.key === "メールアドレス") return "yamada@example.com";
      if (h.key === "対応ステータス") return statusOpts[0] || "";
      if (h.key === "担当者名")       return staffOpts[0] || "";
      if (h.key === "流入元")         return sourceOpts[0] || "";
      if (h.key === "契約種別")       return "未選択";
      if (h.key === "シナリオID")     return "未選択";
      // カスタム項目
      if (h.type === "date")          return "2025/01/31";
      if (h.type === "dropdown") {
        const cd = customDropdowns.find((d) => d.field.name === h.key);
        return cd ? cd.opts[0] : "未選択"; // 先頭は「未選択」
      }
      return "";
    });
    ws.addRow(sampleRow);

    // 列幅
    ws.getColumn(1).width = 12;
    ws.getColumn(2).width = 12;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 24;
    ws.getColumn(5).width = 18;
    ws.getColumn(6).width = 28;
    ws.getColumn(7).width = 16;
    ws.getColumn(8).width = 16;
    ws.getColumn(9).width = 18;
    customHeaders.forEach((_, i) => { ws.getColumn(10 + i).width = 18; });

    // コメント（ノート）
    allHeaders.forEach((h, i) => {
      if (h.note) ws.getCell(1, i + 1).note = h.note;
    });

    // ── データバリデーション（ドロップダウン）2〜1001行目 ──
    const addDropdown = (colIndex, sheetColLetter, len) => {
      if (len === 0) return;
      const colLetter = ws.getColumn(colIndex).letter;
      ws.dataValidations.add(`${colLetter}2:${colLetter}1001`, {
        type: "list",
        allowBlank: true,
        formulae: [`選択肢!$${sheetColLetter}$2:$${sheetColLetter}$${len + 1}`],
        showErrorMessage: true,
        errorTitle: "入力エラー",
        error: "リストから選択してください",
      });
    };

    addDropdown(5, "A", statusOpts.length);                // 対応ステータス
    addDropdown(6, "B", staffOpts.length);                 // 担当者名
    addDropdown(7, "C", sourceOpts.length);                // 流入元
    addDropdown(8, "D", contractOpts.length);              // 契約種別（未選択含む）
    addDropdown(9, "E", scenarioOpts.length);              // シナリオID（未選択・未紐付けのみ）

    // カスタムドロップダウン
    customDropdowns.forEach(({ field, opts }, ci) => {
      const dataColIndex = 10 + (formSettings || []).findIndex((f) => f.name === field.name);
      const sheetColLetter = colLetters[5 + ci];
      addDropdown(dataColIndex, sheetColLetter, opts.length);
    });

    // ダウンロード
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "顧客登録テンプレート.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ファイル選択ダイアログを開く
  const handleOpenFileDialog = () => {
    const f = document.createElement("input");
    f.type = "file";
    f.accept = ".csv,.xlsx,.xls";
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
        email: em,
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
          姓: ln, 名: fn, 電話番号: ph, メールアドレス: em,
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

          {/* メールアドレス */}
          <label style={{ fontWeight: "700" }}>メールアドレス</label>
          <input
            type="email"
            style={{ ...styles.input, marginBottom: "20px" }}
            value={em}
            onChange={(e) => setEm(e.target.value)}
            placeholder="example@email.com"
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
                placeholder="未選択"
                options={[{ value: "", label: "未選択" }, ...statuses.map(st => ({ value: st.name, label: st.name }))]}
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
              {(() => {
                const linkedScenarioIds = new Set(statuses.map(s => s.scenarioId).filter(Boolean));
                const availableScenarios = [...new Set(scenarios?.map(x => x["シナリオID"]))]
                  .filter(sid => !linkedScenarioIds.has(sid));
                return (
                  <CustomSelect
                    value={sc}
                    onChange={v => setSc(v)}
                    placeholder="未選択"
                    options={[
                      { value: "", label: "未選択" },
                      ...availableScenarios.map(sid => ({ value: sid, label: sid })),
                    ]}
                  />
                );
              })()}
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