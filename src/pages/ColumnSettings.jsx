import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  GripVertical, Save, ArrowLeft, Eye, EyeOff, 
  Search, Loader2, Info, AlertTriangle, CheckCircle2 
} from "lucide-react";

const THEME = { 
  primary: "#4F46E5", 
  bg: "#F8FAFC", 
  card: "#FFFFFF", 
  textMain: "#1E293B", 
  textMuted: "#64748B", 
  border: "#E2E8F0", 
  success: "#10B981",
  danger: "#EF4444"
};

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { 
    backgroundColor: THEME.card, borderRadius: "16px", border: `1px solid ${THEME.border}`, 
    padding: "16px 20px", display: "flex", gap: "16px", alignItems: "center", 
    marginBottom: "10px", transition: "all 0.2s ease", position: "relative"
  },
  btnPrimary: { 
    backgroundColor: THEME.primary, color: "white", border: "none", padding: "16px 32px", 
    borderRadius: "14px", fontWeight: "900", cursor: "pointer", display: "flex", 
    alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)",
    transition: "all 0.2s"
  },
  badge: {
    fontSize: "10px", fontWeight: "900", padding: "2px 8px", borderRadius: "6px", 
    backgroundColor: "#EEF2FF", color: THEME.primary, marginLeft: "8px"
  }
};

export default function ColumnSettings({ displaySettings = [], formSettings = [], onRefresh, gasUrl }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  /**
   * 🆕 マスター同期ロジック (Source of Truth)
   * 項目設定をマスターとし、表示設定をそれに従属させることで不整合をゼロにします。
   */
  useEffect(() => {
    // 1. システム必須項目 + 項目設定(formSettings) からマスターリストを作成
    const essential = ["姓", "名", "電話番号", "シナリオID", "登録日", "対応ステータス", "担当者メール"];
    const fromMaster = (formSettings || []).map(f => f.name);
    
    // 全てをマージし、Setで「名前の重複」を物理的に消去
    const allMasterNames = Array.from(new Set([...essential, ...fromMaster]));

    // 2. 現在の「表示設定」をMap化し、重複を排除しつつ設定値を保持
    const currentSettingsMap = new Map();
    (displaySettings || []).forEach(d => {
      if (d.name && !currentSettingsMap.has(d.name)) {
        currentSettingsMap.set(d.name, {
          name: d.name,
          visible: d.visible !== false, // デフォルト表示
          searchable: d.searchable !== false // デフォルト検索可
        });
      }
    });

    // 3. マスターリストをベースに設定を流し込む。
    // 表示設定に存在しないマスター項目は自動追加され、マスターにないゴミ項目は自動削除される。
    const synchronized = allMasterNames.map(name => {
      const existing = currentSettingsMap.get(name);
      return existing || { name: name, visible: true, searchable: true };
    });

    setItems(synchronized);
  }, [displaySettings, formSettings]);

  /**
   * ドラッグ＆ドロップ処理
   */
  const onDragStart = (idx) => setDragIdx(idx);
  
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const n = [...items];
    const d = n.splice(dragIdx, 1)[0];
    n.splice(i, 0, d);
    setDragIdx(i);
    setItems(n);
  };

  const onDragEnd = () => setDragIdx(null);

  /**
   * 保存処理 (GASへの物理的上書き命令)
   */
  const handleSave = async () => {
    if (!gasUrl || gasUrl === "undefined") return alert("エラー: GAS URLが設定されていません。");
    
    setSaving(true);
    try {
      // 重複のない正規化されたリストを送信
      await axios.post(gasUrl, JSON.stringify({ 
        action: "saveDisplaySettings", 
        settings: items 
      }), { 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
      });
      
      alert("表示設定を同期しました。");
      onRefresh(); // 親のデータを最新にする
      navigate("/"); // ダッシュボードへ戻る
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.main}>
      <header style={{ marginBottom: "40px" }}>
        <button 
          onClick={() => navigate("/")} 
          style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 12 }}
        >
          <ArrowLeft size={18} /> ダッシュボードへ戻る
        </button>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
          表示・検索項目の正規化設定
        </h1>
      </header>

      <div style={{ maxWidth: "800px" }}>
        {/* アラートセクション */}
        <div style={{ marginBottom: 32, padding: "20px", backgroundColor: "#FEF2F2", borderRadius: "16px", display: "flex", gap: "16px", border: "1px solid #FEE2E2" }}>
          <AlertTriangle color={THEME.danger} size={24} />
          <div style={{ fontSize: "14px", color: "#991B1B", fontWeight: "600", lineHeight: "1.5" }}>
            「項目設定」をマスターとして同期しています。
            保存すると、スプレッドシート上の重複行やゴミデータは物理的に消去され、1行に統合されます。
          </div>
        </div>

        {/* リストエリア */}
        <div style={{ marginBottom: "32px" }}>
          {items.map((it, i) => (
            <div 
              key={it.name} 
              draggable 
              onDragStart={() => onDragStart(i)} 
              onDragOver={(e) => onDragOver(e, i)} 
              onDragEnd={onDragEnd} 
              style={{ 
                ...styles.card, 
                opacity: dragIdx === i ? 0.5 : 1, 
                border: dragIdx === i ? `2px solid ${THEME.primary}` : `1px solid ${THEME.border}`, 
                backgroundColor: dragIdx === i ? "#F5F3FF" : "white",
                cursor: "grab"
              }}
            >
              <GripVertical size={20} color={THEME.textMuted} />
              
              <div style={{ flex: 1, fontWeight: "800", color: THEME.textMain, display: "flex", alignItems: "center" }}>
                {it.name}
                {["姓", "電話番号", "対応ステータス"].includes(it.name) && (
                  <span style={styles.badge}>必須項目</span>
                )}
              </div>

              <div style={{ display: "flex", gap: "24px" }}>
                <button 
                  onClick={() => { const n = [...items]; n[i].visible = !n[i].visible; setItems(n); }} 
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.visible ? THEME.primary : THEME.textMuted, fontWeight: "800", fontSize: "13px" }}
                >
                  {it.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  {it.visible ? "表示中" : "非表示"}
                </button>

                <button 
                  onClick={() => { const n = [...items]; n[i].searchable = !n[i].searchable; setItems(n); }} 
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: it.searchable ? THEME.success : THEME.textMuted, fontWeight: "800", fontSize: "13px" }}
                >
                  <Search size={18} />
                  {it.searchable ? "検索可" : "検索不可"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 保存ボタン */}
        <button 
          onClick={handleSave} 
          disabled={saving} 
          style={{ 
            ...styles.btnPrimary, 
            width: "100%", 
            opacity: saving ? 0.7 : 1,
            transform: saving ? "scale(0.98)" : "scale(1)"
          }}
        >
          {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={22} />} 
          {saving ? "データを正規化して保存中..." : "マスターと同期して保存"}
        </button>
      </div>
    </div>
  );
}