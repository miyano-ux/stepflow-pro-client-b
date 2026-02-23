// --- KanbanBoard.jsx 内の重要な修正箇所 ---

export default function KanbanBoard({ customers = [], statuses = [], onRefresh, masterUrl, gasUrl, companyName }) {
  // ...省略...

  // 最新のステータス配列から、目的別のラベルを特定（最後から3つを目的として固定）
  const wonLabel = statuses[statuses.length - 3]?.name || "成約";
  const dormantLabel = statuses[statuses.length - 2]?.name || "休眠";
  const lostLabel = statuses[statuses.length - 1]?.name || "失注";

  // 上部のカラム（進行中）からは固定の3つを除外
  const flowingStatuses = statuses.slice(0, statuses.length - 3);

  const onDrop = async (e, newStatus) => {
    const cid = e.dataTransfer.getData("customerId");
    if (!cid) return;
    setDraggingId(null);

    // 楽観的更新
    const updated = localCustomers.map(c => 
      String(c.id) === String(cid) ? { ...c, "対応ステータス": newStatus } : c
    );
    setLocalCustomers(updated);

    try {
      // 🆕 同期エラーを防止する厳密な送信形式
      await axios.post(gasUrl, 
        JSON.stringify({ action: "updateStatus", id: String(cid), status: newStatus }), 
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
      );
      onRefresh();
    } catch (err) {
      onRefresh();
    }
  };

  return (
    <div style={styles.main}>
      {/* ...上部ヘッダー・カラム表示... */}
      <div style={styles.kanbanContainer}>
        {flowingStatuses.map(st => (
           <div key={st.name} onDragOver={onDragOver} onDrop={(e) => onDrop(e, st.name)} style={styles.column}>
             {/* ...カード表示ロジック... */}
           </div>
        ))}
      </div>

      {/* 下部：目的別スペシャルゾーン */}
      <div style={styles.bottomBar}>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, wonLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#ECFDF5" : "#F9FAFB", color: THEME.success }}>
          <Trophy size={22} /> {wonLabel}
        </div>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, dormantLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#FFFBEB" : "#F9FAFB", color: THEME.warning }}>
          <Moon size={22} /> {dormantLabel}
        </div>
        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, lostLabel)} style={{ ...styles.specialZone, backgroundColor: draggingId ? "#FEF2F2" : "#F9FAFB", color: THEME.danger }}>
          <Trash size={22} /> {lostLabel}
        </div>
      </div>
    </div>
  );
}