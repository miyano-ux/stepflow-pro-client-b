import React from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, ChevronRight, ListTree } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444" };

const styles = {
  main: { marginLeft: "260px", width: "calc(100% - 260px)", minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden", transition: "0.2s" },
  btn: { padding: "10px 20px", borderRadius: "10px", fontWeight: "800", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, border: "none" },
  btnPrimary: { backgroundColor: THEME.primary, color: "white", textDecoration: "none" },
  btnSecondary: { backgroundColor: "#F1F5F9", color: THEME.textMain, textDecoration: "none" }
};

export default function ScenarioList({ scenarios = [], onRefresh, gasUrl }) {
  // シナリオIDでグループ化
  const g = (scenarios || []).reduce((acc, item) => { 
    (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item); 
    return acc; 
  }, {});

  const handleDelete = async (id) => {
    if (!window.confirm(`シナリオ「${id}」を削除してもよろしいですか？`)) return;
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "deleteScenario", scenarioID: id }), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      onRefresh();
    } catch (e) { alert("削除に失敗しました"); }
  };

  return (
    <div style={styles.main}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>シナリオ管理</h1>
          <p style={{ color: THEME.textMuted, marginTop: "8px" }}>自動配信ステップの設計・管理を行います。</p>
        </div>
        <Link to="/scenarios/new" style={{ ...styles.btn, ...styles.btnPrimary }}>
          <Plus size={20}/> 新規シナリオ作成
        </Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "32px" }}>
        {Object.entries(g).map(([id, steps]) => (
          <div key={id} style={styles.card}>
            <div style={{ padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
                <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "8px 16px", borderRadius: "12px", fontWeight: "900", fontSize: "18px" }}>
                  {id}
                </div>
                <button onClick={() => handleDelete(id)} style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}>
                  <Trash2 size={18}/>
                </button>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: THEME.textMuted, fontSize: "14px", marginBottom: "24px" }}>
                <Clock size={16} /> 全 {steps.length} ステップ
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {steps.sort((a,b) => a["ステップ数"] - b["ステップ数"]).slice(0, 3).map((st, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary }}></div>
                    <span style={{ fontWeight: "800", minWidth: "45px", color: THEME.textMain }}>{st["経過日数"]}日後</span>
                    <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
                  </div>
                ))}
                {steps.length > 3 && <div style={{ fontSize: "12px", color: THEME.textMuted, paddingLeft: "18px" }}>...他 {steps.length - 3} ステップ</div>}
              </div>
            </div>

            <div style={{ padding: "0 24px 24px 24px" }}>
              <Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", justifyContent: "space-between" }}>
                <span>配信ステップを編集</span><ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}