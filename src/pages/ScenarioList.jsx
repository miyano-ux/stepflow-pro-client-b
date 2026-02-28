import React from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Clock, ChevronRight, ListTree } from "lucide-react";

const THEME = { primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF", textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444" };

const styles = {
  main: {  minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card: { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, overflow: "hidden", transition: "0.2s" }
};

export default function ScenarioList({ scenarios = [], onRefresh, gasUrl }) {
  const g = (scenarios || []).reduce((acc, item) => { (acc[item["シナリオID"]] = acc[item["シナリオID"]] || []).push(item); return acc; }, {});

  const handleDelete = async (id) => {
    if (!window.confirm("このシナリオを削除しますか？")) return;
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "deleteScenario", scenarioID: id }), { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      onRefresh();
    } catch (e) { alert("削除失敗"); }
  };

  return (
    <div style={styles.main}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain }}>シナリオ管理</h1>
        <Link to="/scenarios/new" style={{ backgroundColor: THEME.primary, color: "white", padding: "12px 24px", borderRadius: "12px", textDecoration: "none", fontWeight: "900", display: "flex", gap: 8 }}>
          <Plus size={20}/> 新規作成
        </Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "32px" }}>
        {Object.entries(g).map(([id, steps]) => (
          <div key={id} style={styles.card}>
            <div style={{ padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#F5F3FF", color: THEME.primary, padding: "8px 16px", borderRadius: "12px", fontWeight: "900" }}>{id}</div>
                <button onClick={() => handleDelete(id)} style={{ color: THEME.danger, background: "#FEF2F2", padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer" }}><Trash2 size={18}/></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: THEME.textMuted, fontSize: "14px", marginBottom: "20px" }}><Clock size={16} /> {steps.length} ステップ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {steps.sort((a,b)=>a["ステップ数"]-b["ステップ数"]).slice(0,3).map((st, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: THEME.primary }}></div>
                    <span style={{ fontWeight: "800", minWidth: "40px" }}>{st["経過日数"]}日後</span>
                    <span style={{ color: THEME.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st["message"]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "0 24px 24px 24px" }}>
              <Link to={`/scenarios/edit/${encodeURIComponent(id)}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F1F5F9", padding: "12px 16px", borderRadius: "12px", textDecoration: "none", color: THEME.textMain, fontWeight: "800" }}>
                <span>配信ステップを編集</span><ChevronRight size={18} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}