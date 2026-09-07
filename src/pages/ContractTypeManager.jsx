import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Save, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// 📋 ContractTypeManager - 契約種別設定
// ==========================================
// 【E3-010】各種別に「専任系」チェックを追加。
//   流入経路評価レポート（SourceReport）の専任率は、従来の
//   「名称に『専任』を含むか」（改名で数値が変わる落とし穴）ではなく、
//   このチェック（マスタのフラグ）で判定する。
//   props.exclusiveContractTypes は getAppData が返す専任系名称のリスト。
//   旧GAS（未返却＝null）の間は従来判定と同じ初期値
//   （名称に「専任」を含む＝ON）で表示し、保存時に列として確定させる。

export default function ContractTypeManager({ contractTypes: propTypes = [], exclusiveContractTypes: propExclusive = null, customers = [], onRefresh, gasUrl }) {
  const showToast = useToast();
  const navigate = useNavigate();
  const { isMobile } = useWindowWidth();
  const [types, setTypes]     = useState([]);   // [{ name, isExclusive, _originalName }]
  const [saving, setSaving]   = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  // 【G4-012】改名マイグレーションの確認モーダル（StatusSettings の G1-006 と同方針）
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    const base = propTypes.length > 0 ? [...propTypes] : ["一般媒介契約", "専任媒介契約"];
    // 【E3-010】フラグの復元。propExclusive が配列で届いていればその集合、
    // 旧GASなら従来判定（名称に「専任」を含む）を初期値にする。
    const exSet = Array.isArray(propExclusive)
      ? new Set(propExclusive.map(n => String(n).trim()))
      : null;
    setTypes(base.map(n => ({
      name: n,
      isExclusive: exSet ? exSet.has(String(n).trim()) : String(n).includes("専任"),
      // 【G4-012】読み込み時点の名称を控える。保存時に現在の name と突き合わせ、
      // 改名分だけ {from, to} で GAS に送る（StatusSettings の G1-020 と同方式）。
      _originalName: n,
    })));
  }, [propTypes, propExclusive]);

  // 【G4-012】契約種別名ごとの利用顧客件数（StatusSettings の usageByName と同方式）。
  // 契約種別は ID を持たず「名称」だけで顧客レコード（顧客リスト「契約種別」列）と
  // 紐づいているため、改名前に影響件数を提示して無言のデータ書き換えを避ける。
  const usageOf = React.useMemo(() => {
    const map = {};
    (customers || []).forEach(c => {
      const k = String(c?.["契約種別"] || "").trim();
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return (name) => map[String(name || "").trim()] || 0;
  }, [customers]);

  const handleAdd    = () => setTypes(p => [...p, { name: "", isExclusive: false, _originalName: "" }]);
  const handleDelete = (i) => setTypes(p => p.filter((_, idx) => idx !== i));
  const handleChange = (i, v) => setTypes(p => p.map((t, idx) => idx === i ? { ...t, name: v } : t));
  const handleToggleExclusive = (i) =>
    setTypes(p => p.map((t, idx) => idx === i ? { ...t, isExclusive: !t.isExclusive } : t));

  // D&D（PC用）
  const handleDragStart = (e, i) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); };
  const handleDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...types];
    const [d] = next.splice(dragIdx, 1);
    next.splice(i, 0, d);
    setDragIdx(i);
    setTypes(next);
  };

  // 上下移動（モバイル用）
  const handleMoveUp = (i) => {
    if (i === 0) return;
    setTypes(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };
  const handleMoveDown = (i) => {
    setTypes(prev => {
      if (i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const handleSave = async () => {
    const clean = types
      .map(t => ({ ...t, name: t.name.trim() }))
      .filter(t => t.name);
    if (clean.length === 0) { showToast("1件以上入力してください", "warning"); return; }
    // 名称は顧客データとの紐づけキーのため一意にする（ステータス側 G1-031 と同方針）
    const names = clean.map(t => t.name);
    const dups  = names.filter((n, i) => names.indexOf(n) !== i);
    if (dups.length > 0) {
      showToast(`契約種別「${[...new Set(dups)].join("、")}」が重複しています。名称は一意にしてください。`, "warning");
      return;
    }

    // ── 【G4-012】改名マイグレーション用の対応表を作る ──────────────
    // 読み込み時に控えておいた _originalName と現在の name を突き合わせ、
    // 変わっているものだけ {from, to} で GAS に送る。
    // GAS 側（saveContractTypes）が顧客シートの「契約種別」を一括で付け替える。
    // renames が空配列のときは GAS は顧客シートに一切触らない（従来と同じ挙動）。
    const renames = clean
      .filter(t => t._originalName && t._originalName.trim() !== t.name)
      .map(t => ({ from: t._originalName.trim(), to: t.name }));

    const doSave = async () => {
      setConfirmModal(null);
      setSaving(true);
      try {
        // 【G3-001同種対策/G4-002】saveContractTypes は同一ペイロード再送で同一結果になる
        //   冪等な全件上書きのため、GAS一時URLの404（E3-014）に対して retry:true で
        //   自己回復させる（「保存に失敗しました」表示だが実は保存済み、の予防）。
        //   ※ renames も同一対応表の再適用は no-op（from が残っていない）のため冪等。
        await apiCall.post(gasUrl || GAS_URL, {
          action: "saveContractTypes",
          types: names,
          // 【E3-010】専任系フラグ。GAS は「専任系」列（true/false）として保存する
          exclusive: clean.filter(t => t.isExclusive).map(t => t.name),
          // 【G4-012】改名の対応表。旧GASは未知パラメータとして無視する（後方互換）
          renames,
        }, { retry: true });
        await onRefresh();
        showToast("保存しました", "success");
      } catch {
        showToast("保存に失敗しました", "error");
      } finally {
        setSaving(false);
      }
    };

    // 改名がある場合は、影響件数を提示して確認を取る（無言のデータ書き換えを避ける。
    // StatusSettings.jsx handleSave の migrations 確認と同方針）
    if (renames.length > 0) {
      const detail = renames
        .map(r => `・「${r.from}」→「${r.to}」（${usageOf(r.from)} 件）`)
        .join("\n");
      const total = renames.reduce((sum, r) => sum + usageOf(r.from), 0);
      setConfirmModal({
        title: "契約種別の改名を顧客データに反映しますか？",
        message: detail,
        note: total > 0
          ? `該当する ${total} 件の顧客の契約種別を一括で書き換えます。`
          : "該当する顧客はいないため、顧客データは変更されません。",
        onConfirm: doSave,
      });
      return;
    }

    doSave();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: THEME.bg, padding: isMobile ? "20px 16px" : "40px 48px", boxSizing: "border-box" }}>
      {/* 【G4-012】改名マイグレーションの確認モーダル（共通コンポーネント） */}
      <ConfirmModal
        open={!!confirmModal}
        title={confirmModal?.title || ""}
        message={confirmModal?.message}
        note={confirmModal?.note}
        confirmLabel="保存する"
        confirmColor={THEME.primary}
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? 14 : 0, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => navigate("/master-settings")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: THEME.textMuted, fontWeight: 800, fontSize: 14 }}>
              <ChevronLeft size={18} /> 戻る
            </button>
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: THEME.textMain, margin: 0 }}>契約種別設定</h1>
          </div>
          <button
            onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 24px", backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: "pointer", opacity: saving ? 0.7 : 1, ...(isMobile ? { width: "100%", boxSizing: "border-box" } : {}) }}
          >
            <Save size={15} /> {saving ? "保存中..." : "保存する"}
          </button>
        </div>

        <div style={{ backgroundColor: "#EEF2FF", borderRadius: 12, padding: "12px 18px", marginBottom: 24, fontSize: 13, color: THEME.primary, fontWeight: 700 }}>
          {isMobile
            ? "💡 ↑↓ボタンで順番を変更できます。ここで管理した種別が顧客登録画面のプルダウンに反映されます。"
            : "💡 ドラッグで順番を変更できます。ここで管理した種別が顧客登録画面のプルダウンに反映されます。"}
        </div>

        {/* 【E3-010】専任系チェックの説明 */}
        <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 18px", marginBottom: 24, fontSize: 12, color: "#92400E", fontWeight: 700, lineHeight: 1.7 }}>
          「専任系」にチェックした種別が、流入経路評価レポートの「契約獲得力（専任率）」で専任側として集計されます。名称を変更しても集計は変わりません（このチェックだけが判定に使われます）。
        </div>

        {/* 種別一覧 */}
        {types.map((t, i) => (
          <div
            key={i}
            draggable={!isMobile}
            onDragStart={!isMobile ? (e => handleDragStart(e, i)) : undefined}
            onDragOver={!isMobile ? (e => handleDragOver(e, i)) : undefined}
            onDragEnd={!isMobile ? (() => setDragIdx(null)) : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              backgroundColor: "white", border: `1px solid ${THEME.border}`,
              borderRadius: 12, padding: "12px 14px", marginBottom: 8,
              opacity: dragIdx === i ? 0.5 : 1,
              cursor: isMobile ? "default" : "grab",
              flexWrap: isMobile ? "wrap" : "nowrap",
            }}
          >
            {/* モバイル：↑↓ボタン / PC：グリップアイコン */}
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
                <button onClick={() => handleMoveUp(i)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: 2, color: i === 0 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
                  <ChevronUp size={15} />
                </button>
                <button onClick={() => handleMoveDown(i)} disabled={i === types.length - 1} style={{ background: "none", border: "none", cursor: i === types.length - 1 ? "default" : "pointer", padding: 2, color: i === types.length - 1 ? "#E2E8F0" : THEME.textMuted, display: "flex" }}>
                  <ChevronDown size={15} />
                </button>
              </div>
            ) : (
              <GripVertical size={16} color={THEME.textMuted} style={{ flexShrink: 0 }} />
            )}
            <input
              style={{ ...styles.input, margin: 0, flex: 1, minWidth: isMobile ? 140 : 0 }}
              value={t.name}
              onChange={e => handleChange(i, e.target.value)}
              placeholder="例：一般媒介契約"
            />
            {/* 【E3-010】専任系フラグ */}
            <label
              title="流入経路評価レポートの専任率で専任側として集計します"
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                fontSize: 12, fontWeight: 800, cursor: "pointer", userSelect: "none",
                color: t.isExclusive ? "#4F46E5" : THEME.textMuted,
                backgroundColor: t.isExclusive ? "#EEF2FF" : "transparent",
                border: `1px solid ${t.isExclusive ? "#C7D2FE" : THEME.border}`,
                borderRadius: 8, padding: "7px 10px",
              }}
            >
              <input
                type="checkbox"
                checked={t.isExclusive}
                onChange={() => handleToggleExclusive(i)}
                style={{ accentColor: "#4F46E5", width: 14, height: 14, margin: 0, cursor: "pointer" }}
              />
              専任系
            </label>
            <button onClick={() => handleDelete(i)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 6, flexShrink: 0 }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <button
          onClick={handleAdd}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", border: `2px dashed ${THEME.border}`, borderRadius: 12, backgroundColor: "transparent", color: THEME.textMuted, fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}
        >
          <Plus size={16} /> 種別を追加
        </button>
      </div>
    </div>
  );
}