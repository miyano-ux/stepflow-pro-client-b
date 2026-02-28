import React, { useState } from "react";
import { Plus, Edit3, Trash2, AlertCircle } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";

// ==========================================
// 📧 GmailSettings - Gmail自動取り込み設定ページ
// ==========================================

// モーダルの初期データ
const INITIAL_MODAL = {
  open: false,
  mode: "add",
  id: null,
  data: {
    from: "",
    subject: "",
    nameKey: "氏名：",
    phoneKey: "電話番号：",
    scenarioID: "",
    customKeys: {},
  },
};

/**
 * Gmailからの顧客自動取り込みルールを設定するページ
 * @param {Array} gmailSettings - 既存の取り込みルール一覧
 * @param {Array} scenarios - シナリオ一覧
 * @param {Array} formSettings - カスタム項目定義一覧
 * @param {function} onRefresh - データ再取得コールバック
 */
function GmailSettings({ gmailSettings = [], scenarios = [], formSettings = [], onRefresh }) {
  const [modal, setModal] = useState(INITIAL_MODAL);
  const [testBody, setTestBody] = useState("");
  const [parsePreview, setParsePreview] = useState(null);

  // 編集モーダルを開く
  const handleEdit = (s, index) => {
    let ck = {};
    try {
      ck = s["カスタム項目キー"] ? JSON.parse(s["カスタム項目キー"]) : {};
    } catch (e) {
      ck = {};
    }
    setModal({
      open: true,
      mode: "edit",
      id: index,
      data: {
        from: s["送信元"] || "",
        subject: s["件名"] || "",
        nameKey: s["氏名キー"] || "氏名：",
        phoneKey: s["電話キー"] || "電話番号：",
        scenarioID: s["シナリオID"] || "",
        customKeys: ck,
      },
    });
    setParsePreview(null);
  };

  // ルール削除
  const handleDelete = async (index) => {
    if (!window.confirm("削除しますか？")) return;
    await apiCall.post(GAS_URL, { action: "deleteGmailSetting", id: index });
    onRefresh();
  };

  // 抽出テスト実行
  const handleTestParse = () => {
    if (!testBody) return alert("テスト用の本文を入力してください");
    try {
      const res = {
        name:
          (
            testBody.match(
              new RegExp(modal.data.nameKey + "\\s*(.+)")
            ) || []
          )[1]?.trim() || "失敗",
        phone:
          (
            testBody.match(
              new RegExp(modal.data.phoneKey + "\\s*([\\d-]+)")
            ) || []
          )[1]?.trim() || "失敗",
        customs: {},
      };
      // カスタム項目の抽出テスト
      Object.keys(modal.data.customKeys).forEach((key) => {
        const k = modal.data.customKeys[key];
        if (k) {
          const m = testBody.match(new RegExp(k + "\\s*(.+)"));
          res.customs[key] = m ? m[1].trim() : "失敗";
        }
      });
      setParsePreview(res);
    } catch (e) {
      alert("抽出キーの形式が正しくありません");
    }
  };

  // ルールを保存
  const handleSave = async () => {
    if (!modal.data.from || !modal.data.scenarioID) {
      return alert("送信元とシナリオは必須です");
    }
    const payload = {
      ...modal.data,
      customKeys: JSON.stringify(modal.data.customKeys),
    };
    await apiCall.post(GAS_URL, {
      action: "saveGmailSetting",
      id: modal.id,
      ...payload,
    });
    setModal({ ...modal, open: false });
    onRefresh();
  };

  // カスタム項目キーを更新
  const handleCustomKeyChange = (fieldName, value) => {
    setModal({
      ...modal,
      data: {
        ...modal.data,
        customKeys: { ...modal.data.customKeys, [fieldName]: value },
      },
    });
  };

  // カスタム項目のJSON安全パース
  const safeParseCustomKeys = (str) => {
    try {
      return str ? JSON.parse(str) : {};
    } catch {
      return {};
    }
  };

  return (
    <Page
      title="Gmail自動取り込み設定"
      subtitle="フォーム設定の項目に合わせ、抽出ルールを定義できます"
    >
      {/* ルール一覧グリッド */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {gmailSettings.map((s, i) => {
          const customKeys = safeParseCustomKeys(s["カスタム項目キー"]);
          return (
            <div key={i} style={styles.card}>
              {/* カードヘッダー */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: THEME.primary,
                    color: "white",
                  }}
                >
                  設定 {i + 1}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleEdit(s, i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.textMuted,
                      cursor: "pointer",
                    }}
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.danger,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* カード本文 */}
              <div style={{ fontSize: "14px", display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.textMuted }}>送信元:</span>
                  <span style={{ fontWeight: 700 }}>{s["送信元"]}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.textMuted }}>件名キーワード:</span>
                  <span style={{ fontWeight: 700 }}>{s["件名"]}</span>
                </div>

                {/* 主要項目 */}
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "#F8FAFC",
                    borderRadius: "10px",
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.primary,
                      marginBottom: 8,
                    }}
                  >
                    主要項目
                  </div>
                  <div style={{ fontSize: 12 }}>
                    氏名: {s["氏名キー"]} | 電話: {s["電話キー"]}
                  </div>

                  {/* カスタム項目 */}
                  {Object.keys(customKeys).length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: THEME.primary,
                          marginTop: 8,
                          marginBottom: 4,
                        }}
                      >
                        追加項目
                      </div>
                      {Object.entries(customKeys).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 12 }}>
                          {k}: <span style={{ color: THEME.textMuted }}>{v}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <div style={{ marginTop: 8, textAlign: "right" }}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: "#F1F5F9",
                      color: THEME.primary,
                    }}
                  >
                    シナリオ: {s["シナリオID"]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* 新規追加カード */}
        <button
          onClick={() => setModal({ ...INITIAL_MODAL, open: true })}
          style={{
            ...styles.card,
            border: `2px dashed ${THEME.border}`,
            minHeight: "220px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            cursor: "pointer",
            color: THEME.textMuted,
            transition: "0.2s",
            backgroundColor: "white",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = THEME.primary)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = THEME.border)
          }
        >
          <Plus size={40} />
          <span style={{ fontWeight: 800 }}>新しいルールを追加</span>
        </button>
      </div>

      {/* 編集・追加モーダル */}
      {modal.open && (
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
            zIndex: 2000,
          }}
        >
          <div
            style={{
              ...styles.card,
              width: "950px",
              display: "grid",
              gridTemplateColumns: "1fr 350px",
              gap: "32px",
              padding: "32px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* 左側：設定フォーム */}
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 24 }}>
                {modal.mode === "add" ? "取り込みルールの作成" : "ルールの編集"}
              </h3>

              <div style={{ display: "grid", gap: 16 }}>
                {/* 送信元・件名 */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: THEME.textMuted,
                      }}
                    >
                      送信元アドレス
                    </label>
                    <input
                      style={styles.input}
                      value={modal.data.from}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          data: { ...modal.data, from: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: THEME.textMuted,
                      }}
                    >
                      件名キーワード
                    </label>
                    <input
                      style={styles.input}
                      value={modal.data.subject}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          data: { ...modal.data, subject: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                {/* 抽出キーワード設定 */}
                <div
                  style={{
                    padding: "16px",
                    background: "#F1F5F9",
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 12 }}>
                    項目の抽出用キーワード設定（その文字の「後ろ」を抽出します）
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    {/* 氏名キー */}
                    <div>
                      <label style={{ fontSize: 11 }}>氏名</label>
                      <input
                        style={styles.input}
                        value={modal.data.nameKey}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            data: { ...modal.data, nameKey: e.target.value },
                          })
                        }
                      />
                    </div>
                    {/* 電話番号キー */}
                    <div>
                      <label style={{ fontSize: 11 }}>電話番号</label>
                      <input
                        style={styles.input}
                        value={modal.data.phoneKey}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            data: { ...modal.data, phoneKey: e.target.value },
                          })
                        }
                      />
                    </div>

                    {/* カスタム項目（formSettings から動的生成） */}
                    {formSettings.map((f) => (
                      <div key={f.name}>
                        <label style={{ fontSize: 11 }}>{f.name}</label>
                        <input
                          style={styles.input}
                          value={modal.data.customKeys[f.name] || ""}
                          onChange={(e) =>
                            handleCustomKeyChange(f.name, e.target.value)
                          }
                          placeholder={`（例）${f.name}：`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* シナリオ選択 */}
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.textMuted,
                    }}
                  >
                    適用シナリオ
                  </label>
                  <select
                    style={styles.input}
                    value={modal.data.scenarioID}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        data: { ...modal.data, scenarioID: e.target.value },
                      })
                    }
                  >
                    <option value="">選択してください</option>
                    {[...new Set(scenarios?.map((x) => x["シナリオID"]))].map(
                      (sid) => (
                        <option key={sid} value={sid}>
                          {sid}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* 保存・キャンセルボタン */}
              <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                <button
                  onClick={handleSave}
                  style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}
                >
                  保存
                </button>
                <button
                  onClick={() => setModal({ ...modal, open: false })}
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                >
                  キャンセル
                </button>
              </div>
            </div>

            {/* 右側：テストパネル */}
            <div
              style={{
                borderLeft: `1px solid ${THEME.border}`,
                paddingLeft: "32px",
                backgroundColor: "#F8FAFC",
                margin: "-32px",
                padding: "32px",
              }}
            >
              <h4 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={18} color={THEME.primary} /> テスト
              </h4>
              <textarea
                style={{
                  ...styles.input,
                  height: "180px",
                  fontSize: "12px",
                }}
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder="メール本文を貼り付け"
              />
              <button
                onClick={handleTestParse}
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary,
                  width: "100%",
                  marginTop: "12px",
                  backgroundColor: "white",
                }}
              >
                テスト実行
              </button>

              {/* 抽出結果プレビュー */}
              {parsePreview && (
                <div
                  style={{
                    marginTop: "24px",
                    padding: "16px",
                    background: "white",
                    borderRadius: "12px",
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.primary,
                      marginBottom: 8,
                    }}
                  >
                    抽出結果
                  </div>
                  <div style={{ fontSize: 13 }}>氏名: {parsePreview.name}</div>
                  <div style={{ fontSize: 13 }}>電話: {parsePreview.phone}</div>
                  {Object.entries(parsePreview.customs).map(([k, v]) => (
                    <div key={k} style={{ fontSize: 13 }}>
                      {k}: {v}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default GmailSettings;