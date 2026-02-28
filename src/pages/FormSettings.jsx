import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Lock, Trash2, AlertCircle } from "lucide-react";
import { THEME } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import { GAS_URL } from "../lib/constants";
import Page from "../components/Page";

// ==========================================
// ⚙️ FormSettings - 登録項目定義ページ
// ==========================================

/**
 * 顧客登録フォームのカスタム項目を定義・管理するページ
 * @param {Array} formSettings - 現在の項目定義一覧
 * @param {function} onRefresh - データ再取得コールバック
 */
function FormSettings({ formSettings = [], onRefresh }) {
  const [items, setItems] = useState(formSettings || []);
  const nav = useNavigate();

  // 項目名の更新
  const handleNameChange = (index, value) => {
    const next = [...items];
    next[index].name = value;
    setItems(next);
  };

  // 項目タイプの更新
  const handleTypeChange = (index, value) => {
    const next = [...items];
    next[index].type = value;
    setItems(next);
  };

  // 項目の削除
  const handleDelete = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 項目の追加
  const handleAdd = () => {
    setItems([...items, { name: "", type: "text", required: true }]);
  };

  // スプレッドシートへの同期保存
  const handleSave = async () => {
    await apiCall.post(GAS_URL, { action: "saveFormSettings", settings: items });
    alert("スプレッドシートとの同期が完了しました");
    onRefresh();
    nav("/add");
  };

  return (
    <Page
      title="登録項目の定義"
      topButton={
        <button
          onClick={() => nav("/add")}
          style={{ ...styles.btn, ...styles.btnSecondary }}
        >
          登録画面へ戻る
        </button>
      }
    >
      <div style={{ maxWidth: "850px" }}>

        {/* 注意事項バナー */}
        <div
          style={{
            marginBottom: 32,
            padding: 20,
            backgroundColor: "#FFF7ED",
            borderRadius: 12,
            border: `1px solid #FFEDD5`,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              color: "#C2410C",
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            <AlertCircle size={18} />
            重要な注意事項
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#9A3412",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            ここで項目を追加・同期すると、スプレッドシートの「顧客リスト」に新しい列が自動作成されます。
            既存項目の名前を変更するとデータの整合性が失われる可能性があるため、慎重に行ってください。
          </p>
        </div>

        {/* 固定項目（編集不可） */}
        {["姓", "名", "電話番号"].map((f) => (
          <div
            key={f}
            style={{
              ...styles.card,
              marginBottom: "8px",
              padding: "16px 24px",
              display: "flex",
              gap: "20px",
              alignItems: "center",
              backgroundColor: THEME.locked,
              opacity: 0.7,
            }}
          >
            <Lock size={18} color={THEME.textMuted} />
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: "11px" }}>項目名</label>
              <div style={{ fontWeight: "700" }}>{f}</div>
            </div>
            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: "11px" }}>形式</label>
              <div>テキスト (固定)</div>
            </div>
          </div>
        ))}

        {/* カスタム項目一覧 */}
        {items.map((x, i) => (
          <div
            key={i}
            style={{
              ...styles.card,
              marginBottom: "12px",
              display: "flex",
              gap: "15px",
              alignItems: "center",
            }}
          >
            <GripVertical size={20} color={THEME.border} />

            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 11 }}>項目名</label>
              <input
                style={styles.input}
                value={x.name}
                onChange={(e) => handleNameChange(i, e.target.value)}
              />
            </div>

            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: 11 }}>形式</label>
              <select
                style={styles.input}
                value={x.type}
                onChange={(e) => handleTypeChange(i, e.target.value)}
              >
                <option value="text">テキスト</option>
                <option value="date">日付</option>
                <option value="dropdown">選択肢</option>
              </select>
            </div>

            <button
              onClick={() => handleDelete(i)}
              style={{
                color: THEME.danger,
                background: "none",
                border: "none",
                cursor: "pointer",
                marginTop: 16,
              }}
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        {/* 項目追加ボタン */}
        <button
          onClick={handleAdd}
          style={{
            ...styles.btn,
            ...styles.btnSecondary,
            width: "100%",
            borderStyle: "dashed",
            marginTop: 20,
          }}
        >
          + 新しい入力項目を追加
        </button>

        {/* 同期保存ボタン */}
        <button
          onClick={handleSave}
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            width: "100%",
            marginTop: "40px",
          }}
        >
          項目定義を同期する
        </button>

      </div>
    </Page>
  );
}

export default FormSettings;