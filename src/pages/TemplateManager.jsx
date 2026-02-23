import React, { useState } from "react";
import axios from "axios";
import { Plus, Edit3, Trash2, Save, X, FileText, Loader2, AlertCircle } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "14px", outline: "none" },
  btn: { padding: "10px 20px", borderRadius: "10px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: "none" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 }
};

export default function TemplateManager({ templates = [], onRefresh, gasUrl }) {
  const [modal, setModal] = useState({ open: false, data: { id: "", name: "", content: "" } });
  const [saving, setSaving] = useState(false);

  const PRESET_CONTENT = "{{姓}} {{名}} 様\n\n[ここにメッセージ本文を入力してください]\n\n" +
    "--------------------------\n" +
    "担当：{{担当者姓}}\n" +
    "電話：{{担当者電話}}\n" +
    "メール：{{担当者メール}}";

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "saveTemplate", ...modal.data }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      setModal({ open: false, data: { id: "", name: "", content: "" } });
      onRefresh();
    } catch (e) { alert("保存に失敗しました"); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("このテンプレートを削除してもよろしいですか？")) return;
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "deleteTemplate", id }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      onRefresh();
    } catch (e) { alert("削除に失敗しました"); }
  };

  return (
    <div style={styles.main}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain }}>テンプレート管理</h1>
          <p style={{ color: THEME.textMuted }}>SMS配信で使用する定型文を作成・編集できます。</p>
        </div>
        <button onClick={() => setModal({ open: true, data: { id: "", name: "", content: PRESET_CONTENT } })} style={{ ...styles.btn, backgroundColor: THEME.primary, color: "white" }}>
          <Plus size={20}/> 新規追加
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "24px" }}>
        {templates.map(t => (
          <div key={t.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900" }}>{t.name}</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setModal({ open: true, data: t })} style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer" }}><Edit3 size={18}/></button>
                <button onClick={() => handleDelete(t.id)} style={{ background: "none", border: "none", color: THEME.danger, cursor: "pointer" }}><Trash2 size={18}/></button>
              </div>
            </div>
            <pre style={{ fontSize: "13px", color: THEME.textMain, whiteSpace: "pre-wrap", background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, maxHeight: "200px", overflowY: "auto" }}>{t.content}</pre>
          </div>
        ))}
      </div>

      {modal.open && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.card, width: "600px", padding: "32px" }}>
            <h2 style={{ marginBottom: "24px", fontWeight: "900" }}>{modal.data.id ? "テンプレートの編集" : "新規テンプレート作成"}</h2>
            <form onSubmit={handleSave}>
              <label style={{ fontSize: 12, fontWeight: 900, color: THEME.textMuted, display: "block", marginBottom: 8 }}>テンプレート名</label>
              <input style={{ ...styles.input, marginBottom: 20 }} value={modal.data.name} onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})} required />
              <label style={{ fontSize: 12, fontWeight: 900, color: THEME.textMuted, display: "block", marginBottom: 8 }}>本文内容</label>
              <textarea style={{ ...styles.input, height: "300px", resize: "none", lineHeight: "1.6", marginBottom: 24 }} value={modal.data.content} onChange={e => setModal({...modal, data: {...modal.data, content: e.target.value}})} required />
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" disabled={saving} style={{ ...styles.btn, backgroundColor: THEME.primary, color: "white", flex: 1, justifyContent: "center" }}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} 保存
                </button>
                <button type="button" onClick={() => setModal({ open: false })} style={{ ...styles.btn, backgroundColor: "#F1F5F9", flex: 1, justifyContent: "center" }}>キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}