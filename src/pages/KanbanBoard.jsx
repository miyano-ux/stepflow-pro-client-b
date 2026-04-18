import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ListTodo, UserCircle, MessageSquare,
  Loader2, ExternalLink, ChevronDown, Check
} from "lucide-react";
import { THEME } from "../lib/constants";
import { StaffDropdown } from "../components/StaffDropdown";
import { apiCall, customerStore } from "../lib/utils";
import PromptFieldsModal from "../components/PromptFieldsModal";
import { useToast } from "../ToastContext";

// ─────────────────────────────────────────────────────────
// スタイル定数
// ─────────────────────────────────────────────────────────
const S = {
  // ページ全体を 100vh に収める → ページ自体はスクロールしない
  main:    { height: "100vh", backgroundColor: THEME.bg, display: "flex", flexDirection: "column", overflow: "hidden" },
  // wrapper: ヘッダー固定 + body がのこりを占有
  wrapper: { padding: "0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 },
  // ヘッダー：高さ固定で縮まない
  header:  { padding: "28px 40px 20px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: THEME.bg, borderBottom: `1px solid ${THEME.border}`, zIndex: 20 },
  // body：残り高さを占有、横に並ぶ
  body:    { flex: 1, display: "flex", minHeight: 0, overflow: "hidden" },
  // 左：フロー列エリア（横スクロールのみ）
  flowArea:  { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", padding: "16px 0 0 40px" },
  kanban:    { display: "flex", gap: "16px", overflowX: "auto", overflowY: "hidden", flex: 1, alignItems: "stretch", paddingBottom: "16px", paddingRight: "16px" },
  // col：高さいっぱいに伸ばしてカードのみ縦スクロール
  col:       { minWidth: "300px", width: "300px", borderRadius: "20px", border: `1px solid ${THEME.border}`, transition: "background-color 0.2s, border-color 0.2s", flexShrink: 0, display: "flex", flexDirection: "column" },
  colHeader: { padding: "16px 16px 12px", flexShrink: 0, borderRadius: "20px 20px 0 0" },
  colCards:  { padding: "0 16px 16px", overflowY: "auto", flex: 1 },
  card:      { backgroundColor: "#FFF", borderRadius: "14px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "grab", border: "2px solid transparent", userSelect: "none", transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s", marginBottom: "10px" },
  // 右：終点パネル（bodyと同じ高さ、スクロールしない）
  rightPanel: { width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${THEME.border}`, marginLeft: "16px", overflow: "hidden", padding: "16px 0 0 0" },
  rightZone:  { flex: 1, padding: "16px 14px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", minHeight: 0 },
  // 底部行：ボトムバー(flex:1) + 除外コーナー(固定幅) 横並び
  bottomRow: { flexShrink: 0, display: "flex", zIndex: 10, borderTop: `1px solid ${THEME.border}` },
  bottomBar: { flex: 1, backgroundColor: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "16px 40px", display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap", alignItems: "stretch", minHeight: "120px" },
  excludedCorner: { width: "256px", flexShrink: 0, borderLeft: `1px solid ${THEME.border}`, backgroundColor: "#F1F2F4", padding: "0", marginLeft: "16px" },
  zone:      { minWidth: "260px", height: "96px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontWeight: "900", fontSize: "15px", border: "3px dashed transparent", transition: "all 0.2s", cursor: "default", padding: "0 24px" },
  overlay:   { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" },
  modal:     { backgroundColor: "white", borderRadius: 24, padding: "40px", width: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" },
};

// ─────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────
function calcDaysInStatus(customer) {
  const base = customer["ステータス変更日"] || customer["登録日"];
  if (!base) return null;
  const diff = Math.floor((Date.now() - new Date(base).getTime()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? null : diff;
}
function daysColor(days) {
  if (days === null) return null;
  if (days <= 7)  return { bg: "#DCFCE7", text: "#166534" };
  if (days <= 14) return { bg: "#FEF3C7", text: "#92400E" };
  if (days <= 30) return { bg: "#FED7AA", text: "#9A3412" };
  return               { bg: "#FEE2E2", text: "#991B1B" };
}

// ─────────────────────────────────────────────────────────
// terminalType ごとのビジュアル設定
// ─────────────────────────────────────────────────────────
const TERMINAL_VISUAL = {
  dormant:  { emoji: "⏸",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", routeType: "dormant" },
  won:      { emoji: "🏆", color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", routeType: "won"     },
  lost:     { emoji: "🗑",  color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", routeType: "lost"    },
  excluded: { emoji: "🚫", color: "#9CA3AF", bg: "#F3F4F6", border: "#E5E7EB", routeType: null       },
};

// ─────────────────────────────────────────────────────────
// モーダル群
// ─────────────────────────────────────────────────────────
function ScenarioConfirmModal({ info, onConfirm, onCancel }) {
  if (!info) return null;
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔄</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 12px" }}>
            ステータスを変更しますか？
          </h3>
          <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.8, margin: 0 }}>
            <strong style={{ color: THEME.primary }}>「{info.newStatus}」</strong> に変更します。
            {info.scenarioId && (<><br />シナリオ <strong>「{info.scenarioId}」</strong> が自動で適用されます。</>)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: THEME.primary, color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>変更する</button>
          <button onClick={onCancel}  style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// 汎用終点モーダル（休眠系 / 除外）
function DormantModal({ info, scenarios, gasUrl, onDone, onCancel }) {
  const [selected, setSelected]   = useState(null);
  const [scenarioId, setScenarioId] = useState("");
  const [saving, setSaving]       = useState(false);
  const OPTS = [
    { months: 1, label: "1ヶ月後" }, { months: 2, label: "2ヶ月後" },
    { months: 3, label: "3ヶ月後" }, { months: 6, label: "6ヶ月後" },
    { months: 12, label: "12ヶ月後" }, { months: 0, label: "設定しない" },
  ];
  if (!info) return null;
  const handleConfirm = async () => {
    setSaving(true);
    await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: info.customerId, status: info.newStatus, applyScenario: "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    if (selected?.months > 0 && scenarioId) {
      await axios.post(gasUrl, JSON.stringify({ action: "scheduleDormantReapproach", id: info.customerId, months: selected.months, scenarioId }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    }
    setSaving(false);
    onDone();
  };
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 500 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌙</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 8px" }}>「{info.newStatus}」に変更</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0 }}>再アプローチするタイミングを設定できます</p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 10 }}>再アプローチ時期</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {OPTS.map(opt => (
              <button key={opt.months} onClick={() => setSelected(opt)} style={{ padding: "8px 18px", borderRadius: 99, fontWeight: 800, fontSize: 13, cursor: "pointer", border: `2px solid ${selected?.months === opt.months ? "#D97706" : THEME.border}`, backgroundColor: selected?.months === opt.months ? "#FFFBEB" : "white", color: selected?.months === opt.months ? "#D97706" : THEME.textMuted }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {selected?.months > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>適用シナリオ（任意）</div>
            <select value={scenarioId} onChange={e => setScenarioId(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 14, fontWeight: 700 }}>
              <option value="">シナリオを選択しない</option>
              {[...new Set(scenarios.map(s => s["シナリオID"]))].map(sid => <option key={sid} value={sid}>{sid}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleConfirm} disabled={saving || selected === null} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: selected ? "#D97706" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: selected ? "pointer" : "not-allowed" }}>
            {saving ? "処理中..." : "確定する"}
          </button>
          <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

// 失注モーダル用カスタムセレクト
function LostReasonSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ACCENT = "#DC2626";

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isEmpty = !value;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* トリガーボタン */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "12px 16px",
          border: `2px solid ${open ? ACCENT : isEmpty ? `${ACCENT}60` : THEME.border}`,
          borderRadius: 12, backgroundColor: "white",
          color: isEmpty ? THEME.textMuted : THEME.textMain,
          fontSize: 14, fontWeight: 700,
          cursor: "pointer", boxSizing: "border-box",
          outline: "none", transition: "border-color 0.15s",
          boxShadow: open ? `0 0 0 3px ${ACCENT}18` : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "選択してください"}
        </span>
        <ChevronDown
          size={15}
          color={isEmpty ? THEME.textMuted : ACCENT}
          style={{ flexShrink: 0, marginLeft: 8, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {/* ドロップダウンリスト */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          backgroundColor: "white", borderRadius: 12,
          border: `1px solid ${THEME.border}`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          zIndex: 3500, overflow: "hidden",
          maxHeight: 260, overflowY: "auto",
        }}>
          {options.map((opt) => {
            const isActive = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "11px 16px",
                  border: "none",
                  backgroundColor: isActive ? `${ACCENT}12` : "transparent",
                  color: isActive ? ACCENT : THEME.textMain,
                  fontSize: 14, fontWeight: isActive ? 800 : 600,
                  cursor: "pointer", textAlign: "left", boxSizing: "border-box",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "#FEF2F2"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span>{opt}</span>
                {isActive && <Check size={14} color={ACCENT} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 失注モーダル
const DEFAULT_LOST_REASONS = ["金額条件が合わなかった", "他社に決まった", "売却を取り止めた", "時期を再検討する", "連絡が取れなくなった", "その他"];
function LostModal({ info, gasUrl, onDone, onCancel }) {
  const [reason, setReason]     = useState("");
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving]     = useState(false);
  if (!info) return null;

  const options = (info.lostReasonOptions && info.lostReasonOptions.length > 0)
    ? [...info.lostReasonOptions, "その他"]
    : DEFAULT_LOST_REASONS;

  const handleConfirm = async () => {
    if (!reason) return;
    setSaving(true);
    const finalReason = reason === "その他" ? freeText || "その他" : reason;
    await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: info.customerId, status: info.newStatus, applyScenario: "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    await axios.post(gasUrl, JSON.stringify({ action: "saveLostReason", id: info.customerId, reason: finalReason }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    setSaving(false);
    onDone();
  };

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 480 }}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 26 }}>🗑</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>失注に変更</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0, lineHeight: 1.6 }}>失注の理由を記録しておきましょう</p>
        </div>

        {/* 失注理由セレクト */}
        <div style={{ marginBottom: reason === "その他" ? 16 : 28 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            失注理由 <span style={{ color: "#DC2626", fontSize: 11 }}>必須</span>
          </div>
          <LostReasonSelect value={reason} options={options} onChange={setReason} />
        </div>

        {/* その他：自由記述 */}
        {reason === "その他" && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>詳細（任意）</div>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="失注の詳細を入力してください"
              rows={3}
              autoFocus
              style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${THEME.border}`, fontSize: 14, fontWeight: 600, resize: "vertical", boxSizing: "border-box", outline: "none", color: THEME.textMain, lineHeight: 1.6, fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = "#DC2626"}
              onBlur={e => e.target.style.borderColor = THEME.border}
            />
          </div>
        )}

        {/* アクションボタン */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleConfirm}
            disabled={saving || !reason}
            style={{
              flex: 2, padding: "14px 0", borderRadius: 12, border: "none",
              backgroundColor: reason ? "#DC2626" : "#E5E7EB",
              color: "white", fontWeight: 900, fontSize: 15,
              cursor: reason ? "pointer" : "not-allowed",
              transition: "opacity 0.15s, background-color 0.15s",
              opacity: saving ? 0.75 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {saving ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> 処理中...</> : "確定する"}
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: `1.5px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// 受託越え前進モーダル（2フェーズ：物件選択 → 物件ごとの金額入力）
function UketsukeModal({ info, gasUrl, contractTypes, staffList, onDone, onCancel }) {
  const hasProps = info?.customerProperties && info.customerProperties.length > 0;

  // フェーズ: "select"（物件選択＋共通項目）| "price"（物件ごと金額入力）| "new"（新規物件登録）
  const [phase, setPhase] = useState(hasProps ? "select" : "new");

  // フェーズ1: 選択状態（全デフォルトON）
  const [checkedIds, setCheckedIds] = useState(
    () => new Set((info?.customerProperties || []).map(p => p.id))
  );
  const [contractType, setContractType] = useState("");
  const [staffEmail,   setStaffEmail]   = useState(info?.currentStaff || "");

  // フェーズ2: 物件ごとの金額入力
  const [priceStep,   setPriceStep]   = useState(0);   // 現在入力中の物件インデックス
  const [priceMap,    setPriceMap]    = useState({});   // { propId: assessmentPrice }

  // フェーズ3（新規物件）
  const [propName,        setPropName]        = useState("");
  const [propAddr,        setPropAddr]        = useState("");
  const [newAssessPrice,  setNewAssessPrice]  = useState("");

  const [saving, setSaving] = useState(false);

  if (!info) return null;

  const selectStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700,
    backgroundColor: "white", color: THEME.textMain, cursor: "pointer",
    appearance: "none", boxSizing: "border-box",
  };
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700,
    backgroundColor: "white", color: THEME.textMain, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 5, display: "block" };

  // 選択された物件リスト（順序保持）
  const checkedProps = (info.customerProperties || []).filter(p => checkedIds.has(p.id));

  // フェーズ1 → フェーズ2 への進行可否
  const canProceed = contractType && staffEmail && checkedIds.size > 0;

  // フェーズ2: 現在の物件
  const currentProp = checkedProps[priceStep];
  const currentPrice = priceMap[currentProp?.id] || "";
  const isLastProp = priceStep === checkedProps.length - 1;

  // フェーズ2: OK ボタン（次の物件 or 最終確定）
  const handlePriceNext = () => {
    if (!currentPrice) return;
    setPriceMap(prev => ({ ...prev, [currentProp.id]: currentPrice }));
    if (!isLastProp) {
      setPriceStep(s => s + 1);
    } else {
      handleFinalSubmit({ ...priceMap, [currentProp.id]: currentPrice });
    }
  };

  // 最終確定処理
  const handleFinalSubmit = async (finalPriceMap) => {
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({
        action: "updateStatus", id: info.customerId,
        status: info.newStatus, applyScenario: info.scenarioId || "",
      }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });

      await axios.post(gasUrl, JSON.stringify({
        action: "updateFields", id: info.customerId,
        fields: { "契約種別": contractType, "担当者メール": staffEmail },
      }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });

      if (hasProps) {
        await Promise.all(
          Object.entries(finalPriceMap).map(([propId, assessmentPrice]) =>
            axios.post(gasUrl, JSON.stringify({
              action: "updateProperty", id: propId, assessmentPrice,
            }), { headers: { "Content-Type": "text/plain;charset=utf-8" } })
          )
        );
      } else {
        await axios.post(gasUrl, JSON.stringify({
          action: "addProperty",
          customerId: info.customerId,
          name: propName, address: propAddr, assessmentPrice: newAssessPrice,
          propertyType: "マンション", status: "検討中",
        }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      }
      onDone(info.customerId, info.newStatus, info.prevStatus, staffEmail);
    } catch {
      showToast("更新に失敗しました", "error");
      setSaving(false);
    }
  };

  // ── レンダリング ──────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 24, padding: "36px 40px", width: 500, boxShadow: "0 24px 48px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔑</div>
          <h3 style={{ fontSize: 19, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>契約に進みます</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "#0EA5E9" }}>「{info.newStatus}」</strong> への変更に必要な情報を入力してください。
          </p>
        </div>

        {/* ── フェーズ1: 物件選択 + 共通項目 ── */}
        {phase === "select" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* 物件チェックボックス */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>
                  対象物件を選択 <span style={{ color: "#DC2626" }}>*</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0EA5E9", marginLeft: 8 }}>（契約する物件にチェック）</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {info.customerProperties.map(p => {
                    const checked = checkedIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setCheckedIds(prev => {
                          const next = new Set(prev);
                          next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                          return next;
                        })}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${checked ? "#0EA5E9" : THEME.border}`,
                          backgroundColor: checked ? "#F0F9FF" : "white",
                          transition: "all 0.15s", userSelect: "none",
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? "#0EA5E9" : "#CBD5E1"}`,
                          backgroundColor: checked ? "#0EA5E9" : "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {checked && <span style={{ color: "white", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: checked ? "#0C4A6E" : THEME.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name || "（物件名未設定）"}
                          </div>
                          {p.address && (
                            <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.address}
                            </div>
                          )}
                        </div>
                        {p.assessmentPrice && (
                          <div style={{ fontSize: 12, fontWeight: 800, color: checked ? "#0EA5E9" : THEME.textMuted, flexShrink: 0 }}>
                            {p.assessmentPrice}万円
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {checkedIds.size === 0 && (
                    <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, paddingLeft: 2 }}>1件以上選択してください</div>
                  )}
                </div>
              </div>

              {/* 契約種別 */}
              <div>
                <label style={labelStyle}>契約種別 <span style={{ color: "#DC2626" }}>*</span></label>
                <select style={selectStyle} value={contractType} onChange={e => setContractType(e.target.value)}>
                  <option value="">選択してください</option>
                  {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* 担当者 */}
              <div>
                <label style={labelStyle}>担当者 <span style={{ color: "#DC2626" }}>*</span></label>
                <select style={selectStyle} value={staffEmail} onChange={e => setStaffEmail(e.target.value)}>
                  <option value="">選択してください</option>
                  {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button
                onClick={() => { setPriceStep(0); setPhase("price"); }}
                disabled={!canProceed}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: canProceed ? "#0EA5E9" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: canProceed ? "pointer" : "not-allowed" }}
              >
                次へ（金額を入力）
              </button>
              <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </>
        )}

        {/* ── フェーズ2: 物件ごとの金額入力（ステッパー） ── */}
        {phase === "price" && currentProp && (
          <>
            {/* ステップインジケーター */}
            {checkedProps.length > 1 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
                {checkedProps.map((p, i) => (
                  <div key={p.id} style={{
                    width: 28, height: 6, borderRadius: 3,
                    backgroundColor: i < priceStep ? "#BAE6FD" : i === priceStep ? "#0EA5E9" : "#E2E8F0",
                    transition: "background-color 0.2s",
                  }} />
                ))}
              </div>
            )}

            {/* 物件情報表示 */}
            <div style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0EA5E9", marginBottom: 4 }}>
                物件 {priceStep + 1} / {checkedProps.length}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#0C4A6E" }}>{currentProp.name || "（物件名未設定）"}</div>
              {currentProp.address && <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>{currentProp.address}</div>}
            </div>

            {/* 査定金額入力 */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>査定金額（万円）<span style={{ color: "#DC2626" }}>*</span></label>
              <input
                style={inputStyle}
                type="number"
                value={currentPrice}
                onChange={e => setPriceMap(prev => ({ ...prev, [currentProp.id]: e.target.value }))}
                placeholder="例：3500"
                autoFocus
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handlePriceNext}
                disabled={saving || !currentPrice}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: currentPrice ? "#0EA5E9" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: currentPrice ? "pointer" : "not-allowed" }}
              >
                {saving ? "処理中..." : isLastProp ? "契約確定" : "OK（次の物件へ）"}
              </button>
              <button
                onClick={() => priceStep > 0 ? setPriceStep(s => s - 1) : setPhase("select")}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
              >
                戻る
              </button>
            </div>
          </>
        )}

        {/* ── フェーズ3（新規物件なし）: 新規登録フォーム ── */}
        {phase === "new" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#0EA5E9", marginBottom: 10 }}>新規物件を登録</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>物件名 <span style={{ color: "#DC2626" }}>*</span></label>
                    <input style={inputStyle} value={propName} onChange={e => setPropName(e.target.value)} placeholder="例：〇〇マンション101号室" />
                  </div>
                  <div>
                    <label style={labelStyle}>住所 <span style={{ color: "#DC2626" }}>*</span></label>
                    <input style={inputStyle} value={propAddr} onChange={e => setPropAddr(e.target.value)} placeholder="例：東京都渋谷区〇〇1-2-3" />
                  </div>
                  <div>
                    <label style={labelStyle}>査定金額（万円）<span style={{ color: "#DC2626" }}>*</span></label>
                    <input style={inputStyle} type="number" value={newAssessPrice} onChange={e => setNewAssessPrice(e.target.value)} placeholder="例：3500" />
                  </div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>契約種別 <span style={{ color: "#DC2626" }}>*</span></label>
                <select style={selectStyle} value={contractType} onChange={e => setContractType(e.target.value)}>
                  <option value="">選択してください</option>
                  {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>担当者 <span style={{ color: "#DC2626" }}>*</span></label>
                <select style={selectStyle} value={staffEmail} onChange={e => setStaffEmail(e.target.value)}>
                  <option value="">選択してください</option>
                  {staffList.map(s => <option key={s.email} value={s.email}>{s.lastName} {s.firstName}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button
                onClick={() => handleFinalSubmit({})}
                disabled={saving || !propName || !propAddr || !newAssessPrice || !contractType || !staffEmail}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: (propName && propAddr && newAssessPrice && contractType && staffEmail) ? "#0EA5E9" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: (propName && propAddr && newAssessPrice && contractType && staffEmail) ? "pointer" : "not-allowed" }}
              >
                {saving ? "処理中..." : "契約確定"}
              </button>
              <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// 成約モーダル（物件ごとに成約金額を入力するウィザード）
function WonModal({ info, gasUrl, onDone, onCancel }) {
  const hasProps = info?.customerProperties && info.customerProperties.length > 0;
  const [phase, setPhase]           = useState(hasProps ? "select" : "confirm");
  const [checkedIds, setCheckedIds] = useState(
    () => new Set((info?.customerProperties || []).map(p => p.id))
  );
  const [priceStep, setPriceStep] = useState(0);
  const [priceMap,  setPriceMap]  = useState({});
  const [saving,    setSaving]    = useState(false);

  if (!info) return null;

  const checkedProps  = (info.customerProperties || []).filter(p => checkedIds.has(p.id));
  const currentProp   = checkedProps[priceStep];
  const currentPrice  = priceMap[currentProp?.id] || "";
  const isLastProp    = priceStep === checkedProps.length - 1;

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700,
    backgroundColor: "white", color: THEME.textMain, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 5, display: "block" };

  const handleFinalSubmit = async (finalPriceMap) => {
    setSaving(true);
    try {
      await axios.post(gasUrl, JSON.stringify({
        action: "updateStatus", id: info.customerId,
        status: info.newStatus, applyScenario: info.scenarioId || "",
      }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });

      if (Object.keys(finalPriceMap).length > 0) {
        await Promise.all(
          Object.entries(finalPriceMap).map(([propId, contractPrice]) =>
            axios.post(gasUrl, JSON.stringify({
              action: "updateProperty", id: propId,
              contractPrice, status: "成約",
            }), { headers: { "Content-Type": "text/plain;charset=utf-8" } })
          )
        );
      }
      onDone(info.customerId, info.newStatus, info.prevStatus);
    } catch {
      showToast("更新に失敗しました", "error");
      setSaving(false);
    }
  };

  const handlePriceNext = () => {
    if (!currentPrice) return;
    const next = { ...priceMap, [currentProp.id]: currentPrice };
    setPriceMap(next);
    if (!isLastProp) {
      setPriceStep(s => s + 1);
    } else {
      handleFinalSubmit(next);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 24, padding: "36px 40px", width: 500, boxShadow: "0 24px 48px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏆</div>
          <h3 style={{ fontSize: 19, fontWeight: 900, color: THEME.textMain, margin: "0 0 6px" }}>成約に進みます</h3>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "#059669" }}>「{info.newStatus}」</strong> への変更に必要な情報を入力してください。
          </p>
        </div>

        {/* フェーズ1: 物件選択 */}
        {phase === "select" && (
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.textMuted, marginBottom: 8 }}>
                成約物件を選択 <span style={{ color: "#DC2626" }}>*</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginLeft: 8 }}>（成約した物件にチェック）</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {info.customerProperties.map(p => {
                  const checked = checkedIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => setCheckedIds(prev => {
                        const next = new Set(prev);
                        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                        return next;
                      })}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        border: `1.5px solid ${checked ? "#059669" : THEME.border}`,
                        backgroundColor: checked ? "#ECFDF5" : "white",
                        transition: "all 0.15s", userSelect: "none",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${checked ? "#059669" : "#CBD5E1"}`,
                        backgroundColor: checked ? "#059669" : "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {checked && <span style={{ color: "white", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: checked ? "#065F46" : THEME.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name || "（物件名未設定）"}
                        </div>
                        {p.address && (
                          <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.address}
                          </div>
                        )}
                      </div>
                      {p.assessmentPrice && (
                        <div style={{ fontSize: 12, fontWeight: 800, color: checked ? "#059669" : THEME.textMuted, flexShrink: 0 }}>
                          査定 {p.assessmentPrice}万円
                        </div>
                      )}
                    </div>
                  );
                })}
                {checkedIds.size === 0 && (
                  <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, paddingLeft: 2 }}>1件以上選択してください</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => { setPriceStep(0); setPhase("price"); }}
                disabled={checkedIds.size === 0}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: checkedIds.size > 0 ? "#059669" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: checkedIds.size > 0 ? "pointer" : "not-allowed" }}
              >
                次へ（成約金額を入力）
              </button>
              <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </>
        )}

        {/* フェーズ2: 物件ごとの成約金額入力 */}
        {phase === "price" && currentProp && (
          <>
            {checkedProps.length > 1 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
                {checkedProps.map((p, i) => (
                  <div key={p.id} style={{
                    width: 28, height: 6, borderRadius: 3,
                    backgroundColor: i < priceStep ? "#BBF7D0" : i === priceStep ? "#059669" : "#E2E8F0",
                    transition: "background-color 0.2s",
                  }} />
                ))}
              </div>
            )}
            <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 4 }}>
                物件 {priceStep + 1} / {checkedProps.length}
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#065F46" }}>{currentProp.name || "（物件名未設定）"}</div>
              {currentProp.address && <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>{currentProp.address}</div>}
              {currentProp.assessmentPrice && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginTop: 6 }}>査定金額：{currentProp.assessmentPrice}万円</div>
              )}
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>成約金額（万円）<span style={{ color: "#DC2626" }}>*</span></label>
              <input
                style={inputStyle} type="number" value={currentPrice}
                onChange={e => setPriceMap(prev => ({ ...prev, [currentProp.id]: e.target.value }))}
                placeholder="例：3200" autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handlePriceNext}
                disabled={saving || !currentPrice}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: currentPrice ? "#059669" : "#E5E7EB", color: "white", fontWeight: 900, fontSize: 15, cursor: currentPrice ? "pointer" : "not-allowed" }}
              >
                {saving ? "処理中..." : isLastProp ? "成約確定" : "OK（次の物件へ）"}
              </button>
              <button
                onClick={() => priceStep > 0 ? setPriceStep(s => s - 1) : setPhase("select")}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
              >
                戻る
              </button>
            </div>
          </>
        )}

        {/* 物件なし: シンプル確認 */}
        {phase === "confirm" && (
          <>
            <p style={{ fontSize: 14, color: THEME.textMuted, textAlign: "center", lineHeight: 1.8, marginBottom: 28 }}>
              成約ステータスに変更します。<br />よろしいですか？
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => handleFinalSubmit({})}
                disabled={saving}
                style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", backgroundColor: "#059669", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}
              >
                {saving ? "処理中..." : "成約確定"}
              </button>
              <button onClick={onCancel} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 受託越え後退モーダル（警告・契約種別リセット）
function UketsukeBackModal({ info, onConfirm, onCancel }) {
  if (!info) return null;
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "white", borderRadius: 24, padding: "40px", width: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⚠️</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: THEME.textMain, margin: "0 0 12px" }}>契約済みステータスを前に戻します</h3>
          <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.8, margin: 0 }}>
            <strong style={{ color: "#D97706" }}>「{info.newStatus}」</strong> に変更します。<br />
            <span style={{ fontSize: 13 }}>契約種別がリセットされます。この操作は取り消せません。</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: "#D97706", color: "white", fontWeight: 900, fontSize: 15, cursor: "pointer" }}
          >
            戻す
          </button>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${THEME.border}`, backgroundColor: "white", color: THEME.textMuted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DropZone コンポーネント（右パネル・下部バー共用）
// ─────────────────────────────────────────────────────────
function DropZone({ status, count, isDragging, isOver, visual, onDragOver, onDragLeave, onDrop, compact = false }) {
  const { emoji, color, bg, border } = visual;
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        borderRadius: 16,
        border: `2.5px dashed ${isOver ? color : isDragging ? `${color}70` : THEME.border}`,
        backgroundColor: isOver ? bg : isDragging ? `${bg}99` : "white",
        padding: compact ? "16px 14px" : "16px 32px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        transition: "all 0.2s",
        transform: isOver ? "scale(1.03)" : "scale(1)",
        boxShadow: isOver ? `0 0 0 3px ${color}25` : "none",
        minHeight: compact ? 80 : undefined,
        alignSelf: compact ? undefined : "stretch",
        minWidth: compact ? undefined : "200px",
        flex: compact ? 1 : "1 1 200px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: compact ? 14 : 15, color }}>
        <span style={{ fontSize: compact ? 20 : 22 }}>{emoji}</span>
        <span>{status.name}</span>
        <span style={{ backgroundColor: count > 0 ? color : "#9CA3AF", color: "white", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 20 }}>
          {count}
        </span>
      </div>
      <Link
        to={`/status-list/by-name/${encodeURIComponent(status.name)}`}
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color, backgroundColor: bg, border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 8, textDecoration: "none" }}
      >
        <ExternalLink size={10} /> リスト
      </Link>
    </div>
  );
}

// 除外ゾーン（灰色・右下コーナー）
function ExcludedZone({ statuses, customers, isDragging, overColumn, onDragOver, onDragLeave, onDrop }) {
  if (statuses.length === 0) return null;
  return (
    <div style={{ ...S.excludedZone }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", marginBottom: 8 }}>🚫 除外</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {statuses.map(st => {
          const count = customers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;
          const isOver = overColumn === st.name;
          return (
            <div
              key={st.name}
              onDragOver={e => onDragOver(e, st.name)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, st.name)}
              style={{
                borderRadius: 10, border: `2px dashed ${isOver ? "#9CA3AF" : "#D1D5DB"}`,
                backgroundColor: isOver ? "#E5E7EB" : "#F9FAFB",
                padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: "#6B7280" }}>🚫 {st.name}</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: "white", backgroundColor: count > 0 ? "#9CA3AF" : "#D1D5DB", padding: "1px 7px", borderRadius: 20 }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────
export default function KanbanBoard({
  customers = [], statuses = [], scenarios = [], scenarioSettings = {},
  onRefresh, onLightRefresh, staffList = [], properties = [], gasUrl, sources = [], contractTypes = [],
}) {
  const showToast = useToast();
  const navigate = useNavigate();
  const [filterStaff, setFilterStaff]       = useState("");
  // 初期値をストアのパッチ適用済みデータで初期化
  // → CustomerListで更新後にKanbanBoardへ遷移した瞬間から正しい状態で表示
  const [localCustomers, setLocalCustomers] = useState(() => customerStore.applyTo(customers));
  const [draggingId, setDraggingId]         = useState(null);
  const [overColumn, setOverColumn]         = useState(null);
  const [syncing, setSyncing]               = useState(false);

  const [scenarioModal, setScenarioModal] = useState(null);
  const [promptModal,   setPromptModal]   = useState(null);
  const [dormantModal,  setDormantModal]  = useState(null);
  const [lostModal,     setLostModal]     = useState(null);
  const [uketsukeModal,     setUketsukeModal]     = useState(null);
  const [uketsukeBackModal, setUketsukeBackModal] = useState(null);
  const [wonModal,          setWonModal]          = useState(null);

  // pending管理: Map<id, newStatus> でステータスまで記憶する
  const pendingUpdates = useRef(new Map());
  // 並行更新カウンター（全処理完了で syncing=false）
  const syncCount = useRef(0);

  // customerStore の購読 → CustomerList がマウント中に更新した場合も即時反映
  useEffect(() => {
    return customerStore.subscribe(() => {
      setLocalCustomers(prev => customerStore.applyTo(prev));
    });
  }, []);

  useEffect(() => {
    setLocalCustomers(prev => {
      // 親がローディング中で一時的に空を渡してきた場合はスキップ
      if (customers.length === 0 && prev.length > 0) return prev;

      const serverMap = new Map(customers.map(c => [String(c.id), c]));
      const prevIds   = new Set(prev.map(c => String(c.id)));

      // ① 既存カードはローカルの並び順を保持しつつサーバーデータで更新
      //    pendingUpdates（カンバン操作）はステータスを強制上書き
      //    customerStore（顧客リスト操作）はその他フィールドを上書き
      const merged = prev.map(c => {
        const cid     = String(c.id);
        const serverC = serverMap.get(cid) || c;
        const base    = customerStore.applyTo([serverC])[0];
        if (pendingUpdates.current.has(cid)) {
          const pendingStatus = pendingUpdates.current.get(cid);
          // サーバーがpendingと同じステータスを返してきた = 書き込み確認済み → pendingを解放
          if ((serverC["対応ステータス"] || "").trim() === pendingStatus.trim()) {
            pendingUpdates.current.delete(cid);
          }
          // 確認済みでも未確認でも、このリフレッシュではpendingStatusを優先して表示
          return { ...base, "対応ステータス": pendingStatus };
        }
        return base;
      });

      // ② サーバーに存在する新規カードは末尾に追加（パッチ適用済み）
      customers.forEach(c => {
        if (!prevIds.has(String(c.id))) merged.push(customerStore.applyTo([c])[0]);
      });

      return merged;
    });
  }, [customers]);

  // ── ステータス分類 ──────────────────────────────────
  // フロー：terminalTypeなし
  const flowStatuses = statuses.filter(s => !s.terminalType);
  // 終点：placement別
  // bottomTerminals は StatusSettings の表示と同じ種別グループ順（dormant→won→lost）で並べる
  const TERMINAL_ORDER = { dormant: 0, won: 1, lost: 2 };
  const bottomTerminals = statuses
    .filter(s => s.terminalType && s.terminalType !== "excluded" && (s.placement || "bottom") === "bottom")
    .sort((a, b) => {
      const ga = TERMINAL_ORDER[a.terminalType] ?? 9;
      const gb = TERMINAL_ORDER[b.terminalType] ?? 9;
      if (ga !== gb) return ga - gb;
      // 同じ種別内はstatuses配列のインデックス順（シート行順）を維持
      return statuses.indexOf(a) - statuses.indexOf(b);
    });
  const rightTerminals  = statuses.filter(s => s.terminalType && s.terminalType !== "excluded" && (s.placement || "bottom") === "right");
  const excludedStatuses = statuses.filter(s => s.terminalType === "excluded");

  // 右パネルを表示するか
  const hasRightPanel = rightTerminals.length > 0; // excludedはbottomRow右下コーナーに配置

  // ── ドラッグ処理 ──────────────────────────────────
  const onDragStart = useCallback((e, cid) => {
    e.dataTransfer.setData("customerId", String(cid));
    e.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => setDraggingId(String(cid)));
  }, []);
  const onDragEnd   = useCallback(() => { setDraggingId(null); setOverColumn(null); }, []);
  const onDragOver  = useCallback((e, col) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverColumn(col); }, []);
  const onDragLeave = useCallback((e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setOverColumn(null); }, []);

  const onDrop = useCallback((e, newStatus) => {
    e.preventDefault();
    const cid = e.dataTransfer.getData("customerId");
    setDraggingId(null); setOverColumn(null);
    if (!cid) return;
    const target = localCustomers.find(c => String(c.id) === cid);
    if (!target || target["対応ステータス"] === newStatus) return;
    const prevStatus = target["対応ステータス"];
    const statusDef  = statuses.find(s => s.name === newStatus);

    // ── 受託固定ステータス越え判定 ──────────────────────
    const fixedIdx = flowStatuses.findIndex(s => s.isFixed);
    if (fixedIdx !== -1) {
      const prevIdx = flowStatuses.findIndex(s => s.name === prevStatus);
      const newIdx  = flowStatuses.findIndex(s => s.name === newStatus);
      // ケース A: 受託前 → 受託（受託自身含む）以降
      if (prevIdx !== -1 && prevIdx < fixedIdx && newIdx >= fixedIdx) {
        const customerProperties = properties.filter(p => String(p.customerId) === String(cid));
        const currentStaff = target["担当者メール"] || "";
        const scenarioId = statusDef?.scenarioId || "";
        setUketsukeModal({ customerId: cid, newStatus, prevStatus, scenarioId, customerProperties, currentStaff });
        return;
      }
      // ケース B: 受託後 → 受託前（終点からの復帰 prevIdx=-1 は除く）
      if (prevIdx !== -1 && prevIdx >= fixedIdx && newIdx !== -1 && newIdx < fixedIdx) {
        setUketsukeBackModal({ customerId: cid, newStatus, prevStatus });
        return;
      }
      // ケース C: それ以外（通常処理へフォールスルー）
    }

    // 失注
    if (statusDef?.terminalType === "lost") {
      setLostModal({ customerId: cid, newStatus, prevStatus, lostReasonOptions: statusDef.lostReasonOptions || [] });
      return;
    }
    // 成約 → WonModal（物件ごとの成約金額入力）
    if (statusDef?.terminalType === "won") {
      const scenarioId = statusDef?.scenarioId || "";
      const customerProperties = properties.filter(p => String(p.customerId) === String(cid));
      setWonModal({ customerId: cid, newStatus, prevStatus, scenarioId, customerProperties });
      return;
    }
    // 休眠系（dormant）→ 再アプローチモーダル
    if (statusDef?.terminalType === "dormant") {
      setDormantModal({ customerId: cid, newStatus, prevStatus });
      return;
    }
    // 除外 → シンプル更新（モーダルなし）
    if (statusDef?.terminalType === "excluded") {
      execUpdate(cid, newStatus, prevStatus, "");
      return;
    }
    // 通常フロー
    const scenarioId = statusDef?.scenarioId || "";
    if (scenarioId) {
      setScenarioModal({ customerId: cid, newStatus, prevStatus, scenarioId });
    } else {
      execUpdate(cid, newStatus, prevStatus, "");
    }
  }, [localCustomers, statuses, flowStatuses, properties]);

  const execUpdate = useCallback(async (cid, newStatus, prevStatus, scenarioId) => {
    // ── 楽観的更新：ストアとpendingの両方に登録 ──
    // ストアへの書き込みにより CustomerList 側も即時反映される
    customerStore.patch(cid, { "対応ステータス": newStatus });
    pendingUpdates.current.set(cid, newStatus);
    syncCount.current += 1;
    setSyncing(true);

    // ドロップ先カラムの先頭に挿入（移動を視覚的に明確にする）
    setLocalCustomers(prev => {
      const card    = prev.find(c => String(c.id) === cid);
      if (!card) return prev;
      const without = prev.filter(c => String(c.id) !== cid);
      const updated = { ...card, "対応ステータス": newStatus };
      const firstIdx = without.findIndex(c => (c["対応ステータス"] || "").trim() === newStatus.trim());
      if (firstIdx === -1) return [...without, updated];
      return [...without.slice(0, firstIdx), updated, ...without.slice(firstIdx)];
    });

    let needsPrompt = false;
    try {
      await axios.post(gasUrl, JSON.stringify({ action: "updateStatus", id: cid, status: newStatus, applyScenario: scenarioId || "" }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      customerStore.clear(cid);
      const pf = statuses.find(s => s.name === newStatus)?.promptFields || [];
      if (pf.length > 0) {
        needsPrompt = true;
        setPromptModal({ customerId: cid, promptFields: pf });
      }
    } catch {
      // ロールバック（失敗時のみpendingUpdatesから削除）
      pendingUpdates.current.delete(cid);
      customerStore.patch(cid, { "対応ステータス": prevStatus });
      setLocalCustomers(prev => prev.map(c => String(c.id) === cid ? { ...c, "対応ステータス": prevStatus } : c));
      showToast("更新に失敗しました", "error");
    } finally {
      // ※ pendingUpdates.delete はここでは行わない
      //    サーバー確認（useEffect内）で削除することで、リフレッシュ後の先祖がえりを防ぐ
      syncCount.current -= 1;
      if (syncCount.current === 0) {
        setSyncing(false);
        if (!needsPrompt) (onLightRefresh ?? onRefresh)();
      }
    }
  }, [gasUrl, onRefresh, onLightRefresh, statuses]);

  const handlePromptConfirm = useCallback(async (values) => {
    if (!promptModal) return;
    const updates = Object.entries(values).filter(([, v]) => v);
    if (updates.length > 0) {
      try {
        await axios.post(gasUrl, JSON.stringify({ action: "updateFields", id: promptModal.customerId, fields: Object.fromEntries(updates) }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
      } catch {}
    }
    setPromptModal(null);
    onRefresh();
  }, [promptModal, gasUrl, onRefresh]);

  const handleScenarioConfirm = () => {
    const { customerId, newStatus, prevStatus, scenarioId } = scenarioModal;
    setScenarioModal(null);
    execUpdate(customerId, newStatus, prevStatus, scenarioId);
  };
  const handleModalDone = () => { setDormantModal(null); setLostModal(null); onRefresh(); };

  const handleUketsukeDone = useCallback((cid, newStatus, prevStatus, staffEmail) => {
    // execUpdate の楽観的更新を模倣（GASへのステータス更新は UketsukeModal 内で済み）
    customerStore.patch(cid, { "対応ステータス": newStatus, "担当者メール": staffEmail });
    setLocalCustomers(prev => {
      const card    = prev.find(c => String(c.id) === cid);
      if (!card) return prev;
      const without = prev.filter(c => String(c.id) !== cid);
      const updated = { ...card, "対応ステータス": newStatus, "担当者メール": staffEmail };
      const firstIdx = without.findIndex(c => (c["対応ステータス"] || "").trim() === newStatus.trim());
      if (firstIdx === -1) return [...without, updated];
      return [...without.slice(0, firstIdx), updated, ...without.slice(firstIdx)];
    });
    setUketsukeModal(null);
    onRefresh();
  }, [onRefresh]);

  const handleUketsukeBackConfirm = useCallback(async () => {
    const { customerId, newStatus, prevStatus } = uketsukeBackModal;
    setUketsukeBackModal(null);
    execUpdate(customerId, newStatus, prevStatus, "");
    try {
      await axios.post(gasUrl, JSON.stringify({
        action: "updateFields", id: customerId,
        fields: { "契約種別": "" },
      }), { headers: { "Content-Type": "text/plain;charset=utf-8" } });
    } catch { /* 契約種別リセット失敗は無視しない：再試行は手動対応 */ }
  }, [uketsukeBackModal, gasUrl, execUpdate]);

  const handleWonDone = useCallback((cid, newStatus) => {
    customerStore.patch(cid, { "対応ステータス": newStatus });
    setLocalCustomers(prev => {
      const card = prev.find(c => String(c.id) === cid);
      if (!card) return prev;
      const without  = prev.filter(c => String(c.id) !== cid);
      const updated  = { ...card, "対応ステータス": newStatus };
      const firstIdx = without.findIndex(c => (c["対応ステータス"] || "").trim() === newStatus.trim());
      if (firstIdx === -1) return [...without, updated];
      return [...without.slice(0, firstIdx), updated, ...without.slice(firstIdx)];
    });
    setWonModal(null);
    onRefresh();
  }, [onRefresh]);

  // ── フィルタ ──────────────────────────────────────
  const filtered = filterStaff ? localCustomers.filter(c => c["担当者メール"] === filterStaff) : localCustomers;
  const colCustomers = (st, idx) => filtered.filter(c => {
    const cur = (c["対応ステータス"] || "").trim();
    if (cur === st.name.trim()) return true;
    const known = statuses.some(s => s.name.trim() === cur);
    return idx === 0 && (!cur || !known);
  });
  const termCount = (st) => localCustomers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;

  // ─────────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────────
  return (
    <>
      <div style={S.main}>
        <div style={S.wrapper}>

          {/* ヘッダー（固定） */}
          <header style={S.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>案件進捗管理</h1>
              {syncing && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>
                  <Loader2 className="animate-spin" size={14} /> 同期中
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button onClick={() => navigate("/status-settings")} style={{ backgroundColor: "#FFF", border: `1px solid ${THEME.border}`, padding: "10px 20px", borderRadius: "10px", fontWeight: "800", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: THEME.textMain }}>
                <ListTodo size={18} /> ステータス調整
              </button>
              <StaffDropdown staffList={staffList} value={filterStaff} onChange={setFilterStaff} />
            </div>
          </header>

          {/* ボディ：フロー列 ＋ 右パネル */}
          <div style={S.body}>

            {/* ── 左：フロー列 ── */}
            <div style={S.flowArea}>
              <div style={S.kanban}>
                {flowStatuses.map((st, idx) => {
                  const cards  = colCustomers(st, idx);
                  const isOver = overColumn === st.name;
                  const fixed  = !!st.isFixed;
                  const colBg       = fixed ? (isOver ? "#E0F2FE" : "#F0F9FF") : (isOver ? "#E0E7FF" : "#EDF2F7");
                  const colBorder   = fixed ? (isOver ? "#0EA5E9" : "#BAE6FD") : (isOver ? THEME.primary : THEME.border);
                  const badgeColor  = fixed ? "#0EA5E9" : THEME.primary;
                  const colShadow   = isOver ? `0 0 0 2px ${fixed ? "#0EA5E940" : `${THEME.primary}40`}` : "none";
                  return (
                    <div
                      key={st.name}
                      onDragOver={e => onDragOver(e, st.name)}
                      onDragLeave={onDragLeave}
                      onDrop={e => onDrop(e, st.name)}
                      style={{ ...S.col, backgroundColor: colBg, borderColor: colBorder, boxShadow: colShadow }}
                    >
                      {/* ── 固定ヘッダー（ステータス名表示 - スクロールしない） ── */}
                      <div style={{ ...S.colHeader, backgroundColor: colBg }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {fixed && (
                                <span style={{ fontSize: 10, fontWeight: 900, backgroundColor: "#0EA5E9", color: "white", padding: "2px 7px", borderRadius: 99, letterSpacing: "0.03em" }}>
                                  📋 契約
                                </span>
                              )}
                              <h3 style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>{st.name}</h3>
                            </div>
                            {st.scenarioId && <div style={{ fontSize: 10, color: fixed ? "#0EA5E9" : THEME.primary, fontWeight: 700, marginTop: 2 }}>▶ {st.scenarioId}</div>}
                            {fixed && (
                              <Link
                                to={`/status-list/by-name/${encodeURIComponent(st.name)}`}
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: "#0EA5E9", backgroundColor: "#E0F2FE", border: "1px solid #BAE6FD", padding: "2px 8px", borderRadius: 8, textDecoration: "none", marginTop: 4 }}
                              >
                                <ExternalLink size={10} /> リスト
                              </Link>
                            )}
                          </div>
                          <span style={{ backgroundColor: badgeColor, color: "white", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "900" }}>{cards.length}</span>
                        </div>
                      </div>

                      {/* ── スクロールするカード領域 ── */}
                      <div style={S.colCards}>
                        {cards.map(c => {
                          const dragging  = draggingId === String(c.id);
                          const staff     = staffList.find(s => s.email === c["担当者メール"]);
                          const days      = calcDaysInStatus(c);
                          const color     = daysColor(days);
                          // 物件サマリー
                          const cProps    = properties.filter(p => String(p.customerId) === String(c.id));
                          const wonProps  = cProps.filter(p => p.status === "成約");
                          const activeProps = cProps.filter(p => p.status === "検討中");
                          const formatPrice = (p) => {
                            const n = Number(String(p).replace(/[^0-9.]/g, ""));
                            if (!n) return null;
                            if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}億`;
                            return `${n.toLocaleString()}万`;
                          };
                          const wonTotal  = wonProps.reduce((s, p) => s + (Number(String(p.contractPrice || "").replace(/[^0-9.]/g, "")) || 0), 0);
                          const maxActive = activeProps.length > 0
                            ? Math.max(...activeProps.map(p => Number(String(p.assessmentPrice || "").replace(/[^0-9.]/g, "")) || 0))
                            : 0;
                          return (
                            <div
                              key={c.id}
                              draggable
                              onDragStart={e => onDragStart(e, c.id)}
                              onDragEnd={onDragEnd}
                              style={{ ...S.card, borderColor: dragging ? THEME.primary : "transparent", opacity: dragging ? 0.3 : 1, transform: dragging ? "scale(1.03) rotate(1.5deg)" : "scale(1)", boxShadow: dragging ? "0 16px 32px rgba(91,79,206,0.25)" : S.card.boxShadow }}
                            >
                              <Link
                                to={`/detail/${c.id}`}
                                onClick={e => e.stopPropagation()}
                                draggable={false}
                                style={{ fontWeight: "900", marginBottom: "10px", fontSize: "15px", color: THEME.primary, textDecoration: "none", display: "block", lineHeight: 1.3 }}
                              >
                                {c["姓"]} {c["名"]} 様
                              </Link>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "11px", color: THEME.textMuted, display: "flex", alignItems: "center", gap: 5, fontWeight: "700" }}>
                                  <UserCircle size={14} color={THEME.primary} />
                                  {staff ? `${staff.lastName} ${staff.firstName}` : "未割当"}
                                </div>
                                <Link to={`/direct-sms/${c.id}`} onClick={e => e.stopPropagation()} style={{ color: THEME.primary, backgroundColor: "#EEF2FF", padding: "6px", borderRadius: "8px", display: "flex" }}>
                                  <MessageSquare size={14} />
                                </Link>
                              </div>
                              {days !== null && color && (
                                <div style={{ marginTop: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: color.bg, color: color.text, padding: "3px 10px", borderRadius: 99 }}>
                                    {days === 0 ? "本日" : `${days}日滞留中`}
                                  </span>
                                </div>
                              )}
                              {/* 物件サマリーバッジ */}
                              {cProps.length > 0 && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    {wonProps.length > 0 && (
                                      <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#DCFCE7", color: "#166534", padding: "2px 7px", borderRadius: 99 }}>
                                        成約{wonProps.length}件
                                      </span>
                                    )}
                                    {activeProps.length > 0 && (
                                      <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#EEF2FF", color: THEME.primary, padding: "2px 7px", borderRadius: 99 }}>
                                        検討{activeProps.length}件
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: wonTotal > 0 ? "#166534" : THEME.textMain }}>
                                    {wonTotal > 0
                                      ? `¥${formatPrice(wonTotal)}`
                                      : maxActive > 0 ? `〜¥${formatPrice(maxActive)}` : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* ドロップ受け取り用の最低高さ確保 */}
                        {cards.length === 0 && <div style={{ height: 80 }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 右パネル（right配置の終点ステータス） ── */}
            {rightTerminals.length > 0 && (
              <div style={S.rightPanel}>
                <div style={S.rightZone}>
                  {/* セクションラベル */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingBottom: 10, borderBottom: `1px solid ${THEME.border}` }}>
                    <div style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: THEME.primary }} />
                    <span style={{ fontSize: 13, fontWeight: 900, color: THEME.textMain, letterSpacing: "0.02em" }}>終点ステータス</span>
                  </div>
                  {rightTerminals.map(st => {
                    const visual = TERMINAL_VISUAL[st.terminalType] || TERMINAL_VISUAL.dormant;
                    return (
                      <DropZone
                        key={st.name}
                        status={st}
                        count={termCount(st)}
                        isDragging={!!draggingId}
                        isOver={overColumn === st.name}
                        visual={visual}
                        onDragOver={e => onDragOver(e, st.name)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, st.name)}
                        compact
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 底部行：ボトムバー + 右下除外コーナー ── */}
        {(bottomTerminals.length > 0 || excludedStatuses.length > 0) && (
          <div style={S.bottomRow}>
            {/* ボトムバー（left flex:1） */}
            <div style={{ ...S.bottomBar, ...(bottomTerminals.length === 0 ? { flex: 1 } : {}) }}>
              {bottomTerminals.map(st => {
                const visual = TERMINAL_VISUAL[st.terminalType] || TERMINAL_VISUAL.dormant;
                return (
                  <DropZone
                    key={st.name}
                    status={st}
                    count={termCount(st)}
                    isDragging={!!draggingId}
                    isOver={overColumn === st.name}
                    visual={visual}
                    onDragOver={e => onDragOver(e, st.name)}
                    onDragLeave={onDragLeave}
                    onDrop={e => onDrop(e, st.name)}
                  />
                );
              })}
              {bottomTerminals.length === 0 && (
                <span style={{ color: THEME.textMuted, fontSize: 13, fontWeight: 700 }}>—</span>
              )}
            </div>

            {/* 右下コーナー：除外ゾーン（エリア全体がドロップ対象） */}
            {excludedStatuses.length > 0 && (() => {
              // 除外ステータスが複数あっても先頭1つをドロップ先として使う
              const primaryExcluded = excludedStatuses[0];
              const totalCount = excludedStatuses.reduce((sum, st) =>
                sum + localCustomers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length, 0);
              const isOver = excludedStatuses.some(st => overColumn === st.name);
              return (
                <div
                  onDragOver={e => onDragOver(e, primaryExcluded.name)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, primaryExcluded.name)}
                  style={{
                    ...S.excludedCorner,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, cursor: "default", transition: "all 0.2s",
                    backgroundColor: isOver ? "#E5E7EB" : "#F1F2F4",
                    border: isOver ? "2px dashed #9CA3AF" : "2px dashed transparent",
                    boxShadow: isOver ? "inset 0 0 0 2px #9CA3AF22" : "none",
                  }}
                >
                  <span style={{ fontSize: 28 }}>🚫</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#6B7280" }}>除外</span>
                  <span style={{
                    fontSize: 11, fontWeight: 900, color: "white",
                    backgroundColor: totalCount > 0 ? "#9CA3AF" : "#D1D5DB",
                    padding: "2px 10px", borderRadius: 20,
                  }}>{totalCount}</span>
                  {/* 除外ステータスごとのリストリンク */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                    {excludedStatuses.map(st => {
                      const cnt = localCustomers.filter(c => (c["対応ステータス"] || "").trim() === st.name.trim()).length;
                      return (
                        <Link
                          key={st.name}
                          to={`/status-list/by-name/${encodeURIComponent(st.name)}`}
                          onClick={e => e.stopPropagation()}
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: "#6B7280", backgroundColor: "#E5E7EB", border: "1px solid #D1D5DB", padding: "2px 8px", borderRadius: 8, textDecoration: "none" }}
                        >
                          <ExternalLink size={10} /> {st.name}（{cnt}）
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* モーダル群 */}
      <ScenarioConfirmModal info={scenarioModal} onConfirm={handleScenarioConfirm} onCancel={() => setScenarioModal(null)} />
      <DormantModal info={dormantModal} scenarios={scenarios} gasUrl={gasUrl} onDone={handleModalDone} onCancel={() => setDormantModal(null)} />
      <LostModal info={lostModal} gasUrl={gasUrl} onDone={handleModalDone} onCancel={() => setLostModal(null)} />
      {wonModal && (
        <WonModal
          info={wonModal}
          gasUrl={gasUrl}
          onDone={handleWonDone}
          onCancel={() => setWonModal(null)}
        />
      )}
      {uketsukeModal && (
        <UketsukeModal
          info={uketsukeModal}
          gasUrl={gasUrl}
          contractTypes={contractTypes}
          staffList={staffList}
          onDone={handleUketsukeDone}
          onCancel={() => setUketsukeModal(null)}
        />
      )}
      <UketsukeBackModal
        info={uketsukeBackModal}
        onConfirm={handleUketsukeBackConfirm}
        onCancel={() => setUketsukeBackModal(null)}
      />
      {promptModal && (
        <PromptFieldsModal
          newStatus={localCustomers.find(c => String(c.id) === promptModal.customerId)?.["対応ステータス"] || ""}
          promptFields={promptModal.promptFields}
          sources={sources} contractTypes={contractTypes} staffList={staffList}
          onConfirm={handlePromptConfirm}
          onSkip={() => { setPromptModal(null); onRefresh(); }}
        />
      )}
    </>
  );
}