import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { THEME, CLIENT_COMPANY_NAME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import DynamicField from "../components/DynamicField";

// ==========================================
// ✏️ CustomerEdit - 顧客情報編集ページ
// ==========================================

/**
 * 既存顧客の情報を編集するページ
 * @param {Array} customers - 顧客一覧
 * @param {Array} scenarios - シナリオ一覧
 * @param {Array} formSettings - カスタム項目定義一覧
 * @param {Array} statuses - 対応ステータス一覧
 * @param {string} masterUrl - マスタAPIのURL
 * @param {function} onRefresh - データ再取得コールバック
 */
function CustomerEdit({
  customers = [],
  scenarios = [],
  formSettings = [],
  statuses = [],
  masterUrl,
  onRefresh,
}) {
  const { id } = useParams();
  const nav = useNavigate();

  const c = customers?.find((x) => x.id === Number(id));

  const [ln, setLn] = useState("");
  const [fn, setFn] = useState("");
  const [ph, setPh] = useState("");
  const [fd, setFd] = useState({});
  const [sc, setSc] = useState("");
  const [staffList, setStaffList] = useState([]);

  // 顧客データとスタッフ一覧を初期化
  useEffect(() => {
    if (c) {
      setLn(c["姓"] || "");
      setFn(c["名"] || "");
      setPh(c["電話番号"] || "");
      setFd({
        ...c,
        "対応ステータス": c["対応ステータス"] || statuses[0]?.name || "未対応",
        "担当者メール": c["担当者メール"] || "",
      });
      setSc(c["シナリオID"]);
    }

    const fetchStaff = async () => {
      try {
        const res = await axios.get(
          `${masterUrl}?action=list&company=${CLIENT_COMPANY_NAME}`
        );
        setStaffList(res?.data?.users || []);
      } catch (e) {
        console.error(e);
      }
    };
    if (masterUrl) fetchStaff();
  }, [c, masterUrl]);

  // 顧客データ未取得時のローディング表示
  if (!c) {
    return (
      <Page title="読込中...">
        <Loader2 className="animate-spin" />
      </Page>
    );
  }

  // 変更保存
  const handleSubmit = async (e) => {
    e.preventDefault();
    await apiCall.post(GAS_URL, {
      action: "update",
      id,
      lastName: ln,
      firstName: fn,
      phone: ph,
      data: fd,
      status: c["配信ステータス"],
      scenarioID: sc,
    });
    onRefresh();
    nav("/");
  };

  return (
    <Page title="顧客情報の編集">
      <div style={{ ...styles.card, maxWidth: "700px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>

          {/* 姓・名 */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "700" }}>姓</label>
              <input
                style={styles.input}
                value={ln}
                onChange={(e) => setLn(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: "700" }}>名</label>
              <input
                style={styles.input}
                value={fn}
                onChange={(e) => setFn(e.target.value)}
              />
            </div>
          </div>

          {/* 電話番号 */}
          <label style={{ fontWeight: "700" }}>電話番号</label>
          <input
            style={styles.input}
            value={ph}
            onChange={(e) => setPh(e.target.value)}
          />

          {/* 営業管理セクション（担当者・ステータス） */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginTop: 20,
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
                value={fd["担当者メール"] || ""}
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
                value={fd["対応ステータス"] || "未対応"}
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
            <div key={f.name} style={{ marginTop: "20px" }}>
              <label style={{ fontWeight: "700" }}>{f.name}</label>
              <DynamicField
                f={f}
                value={fd[f.name]}
                onChange={(v) => setFd({ ...fd, [f.name]: v })}
              />
            </div>
          ))}

          {/* シナリオ選択 */}
          <label style={{ display: "block", marginTop: "20px", fontWeight: "700" }}>
            シナリオ
          </label>
          <select
            style={styles.input}
            value={sc}
            onChange={(e) => setSc(e.target.value)}
          >
            {[...new Set(scenarios?.map((x) => x["シナリオID"]))].map((sid) => (
              <option key={sid} value={sid}>
                {sid}
              </option>
            ))}
          </select>

          {/* 保存ボタン */}
          <button
            type="submit"
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              width: "100%",
              marginTop: "32px",
              padding: "16px",
            }}
          >
            変更を保存
          </button>
        </form>
      </div>
    </Page>
  );
}

export default CustomerEdit;