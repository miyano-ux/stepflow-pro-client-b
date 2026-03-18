import React, { useState } from "react";
import { Plus, Edit3, Trash2, X, AlertCircle, ChevronDown } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import CustomSelect from "../components/CustomSelect";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import StaffGroupSelect from "../components/StaffGroupSelect";

// ==========================================
// 📧 GmailSettings - Gmail自動取り込み設定
// ==========================================

const INITIAL_DATA = {
  from: "",
  subject: "",
  nameKey: "氏名：",
  phoneKey: "電話番号：",
  // 管理項目（固定値として登録）
  status: "",
  source: "",
  staffEmail: "",
  scenarioID: "",
  // カスタム項目（抽出キーワード）
  customKeys: {},
};

const LabelText = ({ children }) => (
  <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, display: "block", marginBottom: 6, userSelect: "none" }}>
    {children}
  </span>
);

const FieldBox = ({ children, style }) => (
  <div style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>
);

function GmailSettings({
  gmailSettings = [], scenarios = [], formSettings = [],
  statuses = [], sources = [], staffList = [], groups = [], onRefresh,
}) {
  const [modal, setModal] = useState({ open: false, mode: "add", id: null, data: INITIAL_DATA });
  const [testBody, setTestBody] = useState("");
  const [parsePreview, setParsePreview] = useState(null);

  const scenarioIds = [...new Set((scenarios || []).map(s => s["シナリオID"]).filter(Boolean))];

  const safeParseCustomKeys = (str) => {
    try { return str ? JSON.parse(str) : {}; } catch { return {}; }
  };

  const setData = (patch) => setModal(m => ({ ...m, data: { ...m.data, ...patch } }));
  const setCustomKey = (name, val) => setData({ customKeys: { ...modal.data.customKeys, [name]: val } });

  const handleEdit = (s, index) => {
    const ck = safeParseCustomKeys(s["カスタム項目キー"]);
    setModal({
      open: true, mode: "edit", id: index,
      data: {
        from:       s["送信元"]    || "",
        subject:    s["件名"]      || "",
        nameKey:    s["氏名キー"]  || "氏名：",
        phoneKey:   s["電話キー"]  || "電話番号：",
        status:     s["対応ステータス"] || "",
        source:     s["流入元"]    || "",
        staffEmail: s["担当者メール"] || "",
        scenarioID: s["シナリオID"] || "",
        customKeys: ck,
      },
    });
    setTestBody("");
    setParsePreview(null);
  };

  const handleDelete = async (index) => {
    if (!window.confirm("削除しますか？")) return;
    await apiCall.post(GAS_URL, { action: "deleteGmailSetting", id: index });
    onRefresh();
  };

  const handleSave = async () => {
    if (!modal.data.from) return alert("送信元アドレスは必須です");
    await apiCall.post(GAS_URL, {
      action: "saveGmailSetting",
      id: modal.id,
      from:       modal.data.from,
      subject:    modal.data.subject,
      nameKey:    modal.data.nameKey,
      phoneKey:   modal.data.phoneKey,
      status:     modal.data.status,
      source:     modal.data.source,
      staffEmail: modal.data.staffEmail,
      scenarioID: modal.data.scenarioID,
      customKeys: JSON.stringify(modal.data.customKeys),
    });
    setModal(m => ({ ...m, open: false }));
    onRefresh();
  };

  const handleTest = () => {
    if (!testBody) return alert("テスト用の本文を入力してください");
    try {
      const extract = (key) => {
        if (!key) return "－";
        const m = testBody.match(new RegExp(key + "\\s*(.+)"));
        return m ? m[1].trim() : "抽出失敗";
      };
      const customs = {};
      Object.entries(modal.data.customKeys).forEach(([k, v]) => {
        if (v) customs[k] = extract(v);
      });
      setParsePreview({ name: extract(modal.data.nameKey), phone: extract(modal.data.phoneKey), customs });
    } catch { alert("キーの形式が正しくありません"); }
  };

  // カード上の管理項目サマリ表示用
  const getStaffName = (email) => {
    const s = staffList.find(s => s.email === email);
    return s ? `${s.lastName} ${s.firstName}` : email;
  };

  return (
    <Page title="Gmail自動取り込み設定" subtitle="メールを受信したとき、自動で顧客を登録するルールを定義できます">

      {/* ルール一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 24, marginBottom: 32 }}>
        {gmailSettings.map((s, i) => {
          const ck = safeParseCustomKeys(s["カスタム項目キー"]);
          const mgmt = [
            s["対応ステータス"] && `ステータス: ${s["対応ステータス"]}`,
            s["流入元"]         && `流入元: ${s["流入元"]}`,
            s["担当者メール"]   && `担当者: ${getStaffName(s["担当者メール"])}`,
            s["シナリオID"]     && `シナリオ: ${s["シナリオID"]}`,
          ].filter(Boolean);

          return (
            <div key={i} style={{ ...styles.card, padding: 24 }}>
              {/* ヘッダー */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ ...styles.badge, backgroundColor: THEME.primary, color: "white", fontSize: 11, padding: "4px 10px" }}>
                  設定 {i + 1}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleEdit(s, i)} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", padding: 6, borderRadius: 6 }}>
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(i)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer", padding: 6, borderRadius: 6 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* 送信元・件名 */}
              <div style={{ display: "grid", gap: 8, fontSize: 13, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.textMuted }}>送信元:</span>
                  <span style={{ fontWeight: 700 }}>{s["送信元"]}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: THEME.textMuted }}>件名キーワード:</span>
                  <span style={{ fontWeight: 700 }}>{s["件名"] || "（未設定）"}</span>
                </div>
              </div>

              {/* 抽出キー */}
              <div style={{ padding: 14, background: "#F8FAFC", borderRadius: 10, border: `1px solid ${THEME.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 6 }}>抽出キーワード</div>
                <div style={{ fontSize: 12, color: THEME.textMain }}>
                  氏名: <span style={{ color: THEME.textMuted }}>{s["氏名キー"]}</span>
                  　電話: <span style={{ color: THEME.textMuted }}>{s["電話キー"]}</span>
                </div>
                {Object.entries(ck).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 12, marginTop: 4 }}>
                    {k}: <span style={{ color: THEME.textMuted }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* 管理項目 */}
              {mgmt.length > 0 && (
                <div style={{ padding: 14, background: "#EEF2FF", borderRadius: 10, border: `1px solid #C7D2FE`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 6 }}>管理項目（自動セット）</div>
                  {mgmt.map((line, j) => (
                    <div key={j} style={{ fontSize: 12, color: THEME.textMain }}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 新規追加カード */}
        <button
          onClick={() => setModal({ open: true, mode: "add", id: null, data: INITIAL_DATA })}
          style={{ ...styles.card, border: `2px dashed ${THEME.border}`, minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", color: THEME.textMuted, backgroundColor: "white" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = THEME.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = THEME.border}
        >
          <Plus size={36} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>新しいルールを追加</span>
        </button>
      </div>

      {/* モーダル */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, padding: 24 }}>
          <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 980, maxHeight: "92vh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 320px", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>

            {/* 左：設定フォーム */}
            <div style={{ padding: 36 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: THEME.textMain }}>
                  {modal.mode === "add" ? "取り込みルールの作成" : "ルールの編集"}
                </h3>
                <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4 }}>
                  <X size={22} />
                </button>
              </div>

              {/* 送信元・件名 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <FieldBox>
                  <LabelText>送信元アドレス *</LabelText>
                  <input style={styles.input} value={modal.data.from} onChange={e => setData({ from: e.target.value })} placeholder="example@gmail.com" />
                </FieldBox>
                <FieldBox>
                  <LabelText>件名キーワード</LabelText>
                  <input style={styles.input} value={modal.data.subject} onChange={e => setData({ subject: e.target.value })} placeholder="例: 反響通知" />
                </FieldBox>
              </div>

              {/* 抽出キーワード */}
              <div style={{ padding: 20, background: "#F8FAFC", borderRadius: 14, border: `1px solid ${THEME.border}`, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 14 }}>
                  抽出キーワード設定（その文字の「後ろ」を取得します）
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <FieldBox>
                    <LabelText>氏名</LabelText>
                    <input style={styles.input} value={modal.data.nameKey} onChange={e => setData({ nameKey: e.target.value })} />
                  </FieldBox>
                  <FieldBox>
                    <LabelText>電話番号</LabelText>
                    <input style={styles.input} value={modal.data.phoneKey} onChange={e => setData({ phoneKey: e.target.value })} />
                  </FieldBox>
                  {formSettings.map(f => (
                    <FieldBox key={f.name}>
                      <LabelText>{f.name}</LabelText>
                      <input
                        style={styles.input}
                        value={modal.data.customKeys[f.name] || ""}
                        onChange={e => setCustomKey(f.name, e.target.value)}
                        placeholder={`例: ${f.name}：`}
                      />
                    </FieldBox>
                  ))}
                </div>
              </div>

              {/* 管理項目（自動セット） */}
              <div style={{ padding: 20, background: "#EEF2FF", borderRadius: 14, border: `1px solid #C7D2FE`, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.primary, marginBottom: 14 }}>
                  管理項目（取り込み時に自動セットする値）
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* 対応ステータス */}
                  <FieldBox>
                    <LabelText>対応ステータス</LabelText>
                    <CustomSelect
                      value={modal.data.status}
                      onChange={v => setData({ status: v })}
                      placeholder="未設定（デフォルト）"
                      options={[{ value: "", label: "未設定（デフォルト）" }, ...statuses.map(st => ({ value: st.name, label: st.name }))]}
                    />
                  </FieldBox>

                  {/* 流入元 */}
                  <FieldBox>
                    <LabelText>流入元</LabelText>
                    <CustomSelect
                      value={modal.data.source}
                      onChange={v => setData({ source: v })}
                      placeholder="未設定"
                      options={[{ value: "", label: "未設定" }, ...sources.map(s => ({ value: s.name, label: s.name }))]}
                    />
                  </FieldBox>

                  {/* 担当者 */}
                  <FieldBox>
                    <LabelText>担当者</LabelText>
                    <CustomSelect
                      value={modal.data.staffEmail}
                      onChange={v => setData({ staffEmail: v })}
                      placeholder="未割当"
                      options={[
                        { value: "", label: "未割当" },
                        ...staffList.map(s => ({ value: s.email, label: `${s.lastName} ${s.firstName}` })),
                        ...groups.map(g => ({ value: `group:${g["グループID"]}`, label: `👥 ${g["グループ名"]}（登録時に自動選出）` })),
                      ]}
                    />
                  </FieldBox>

                  {/* 適用シナリオ */}
                  <FieldBox>
                    <LabelText>適用シナリオ</LabelText>
                    <CustomSelect
                      value={modal.data.scenarioID}
                      onChange={v => setData({ scenarioID: v })}
                      placeholder="未設定"
                      options={[{ value: "", label: "未設定" }, ...scenarioIds.map(sid => ({ value: sid, label: sid }))]}
                    />
                  </FieldBox>
                </div>
              </div>

              {/* 保存・キャンセル */}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={handleSave} style={{ ...styles.btn, ...styles.btnPrimary, flex: 1, height: 48, fontSize: 15 }}>保存</button>
                <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ ...styles.btn, ...styles.btnSecondary, height: 48 }}>キャンセル</button>
              </div>
            </div>

            {/* 右：テストパネル */}
            <div style={{ background: "#F8FAFC", borderRadius: "0 20px 20px 0", padding: 32, borderLeft: `1px solid ${THEME.border}` }}>
              <h4 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: THEME.textMain }}>
                <AlertCircle size={17} color={THEME.primary} /> テスト
              </h4>
              <textarea
                style={{ ...styles.input, height: 200, fontSize: 12, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                value={testBody}
                onChange={e => setTestBody(e.target.value)}
                placeholder="メール本文をここに貼り付け"
              />
              <button onClick={handleTest} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", marginTop: 12, backgroundColor: "white" }}>
                テスト実行
              </button>

              {parsePreview && (
                <div style={{ marginTop: 20, padding: 16, background: "white", borderRadius: 12, border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: THEME.primary, marginBottom: 10 }}>抽出結果</div>
                  <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
                    <div>氏名: <strong>{parsePreview.name}</strong></div>
                    <div>電話: <strong>{parsePreview.phone}</strong></div>
                    {Object.entries(parsePreview.customs).map(([k, v]) => (
                      <div key={k}>{k}: <strong>{v}</strong></div>
                    ))}
                  </div>
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