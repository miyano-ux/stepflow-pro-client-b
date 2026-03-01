import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, SlidersHorizontal, Upload } from "lucide-react";
import axios from "axios";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall, smartNormalizePhone, downloadCSV } from "../lib/utils";
import Page from "../components/Page";
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
function CustomerForm({ formSettings = [], scenarios = [], statuses = [], staffList = [], onRefresh }) {
  const navigate = useNavigate();

  const [ln, setLn] = useState("");
  const [fn, setFn] = useState("");
  const [ph, setPh] = useState("");
  const [fd, setFd] = useState({ "対応ステータス": "未対応", "担当者メール": "" });
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
    try {
      await apiCall.post(GAS_URL, {
        action: "add",
        lastName: ln,
        firstName: fn,
        phone: ph,
        data: fd,
        scenarioID: sc,
      });
      onRefresh();
      navigate("/");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
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

          {/* 営業管理セクション（担当者・ステータス） */}
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
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, color: THEME.primary }}>
                担当者
              </label>
              <select
                style={styles.input}
                value={fd["担当者メール"]}
                onChange={(e) => setFd({ ...fd, "担当者メール": e.target.value })}
              >
                <option value="">未割当</option>
                {staffList.map((s) => (
                  <option key={s.email} value={s.email}>
                    {s.lastName} {s.firstName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontWeight: 700, fontSize: 12, color: THEME.primary }}>
                対応ステータス
              </label>
              <select
                style={styles.input}
                value={fd["対応ステータス"]}
                onChange={(e) =>
                  setFd({ ...fd, "対応ステータス": e.target.value })
                }
              >
                {statuses.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
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

          {/* シナリオ選択 */}
          <label style={{ fontWeight: "700" }}>適用シナリオ</label>
          <select
            style={{ ...styles.input, marginBottom: "32px" }}
            value={sc}
            onChange={(e) => setSc(e.target.value)}
          >
            {[...new Set(scenarios?.map((x) => x["シナリオID"]))].map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          <button
            type="submit"
            style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", padding: "16px" }}
          >
            登録を確定する
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
  );
}

export default CustomerForm;