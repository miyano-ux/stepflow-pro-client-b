import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Calendar, Clock, Save, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "../ToastContext";

const THEME = {
  primary: "#4F46E5", bg: "#F8FAFC", card: "#FFFFFF",
  textMain: "#1E293B", textMuted: "#64748B", border: "#E2E8F0", danger: "#EF4444",
};

const formStyles = {
  main:   { minHeight: "100vh", backgroundColor: THEME.bg, padding: "40px 64px" },
  card:   { backgroundColor: THEME.card, borderRadius: "20px", border: `1px solid ${THEME.border}`, padding: "32px", marginBottom: "24px" },
  input:  { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", boxSizing: "border-box" },
  select: { padding: "12px 14px", borderRadius: "12px", border: `1px solid ${THEME.border}`, fontSize: "15px", outline: "none", backgroundColor: "white", cursor: "pointer" },
};

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── 挿入できる変数一覧（TemplateManagerと共通）────────────
const VARIABLE_GROUPS = [
  {
    label: "顧客情報",
    color: "#4F46E5",
    bg: "#EEF2FF",
    vars: [
      { label: "姓",      value: "{{姓}}"      },
      { label: "名",      value: "{{名}}"      },
      { label: "電話番号", value: "{{電話番号}}" },
      { label: "会社名",  value: "{{会社名}}"   },
    ],
  },
  {
    label: "担当者",
    color: "#0284C7",
    bg: "#E0F2FE",
    vars: [
      { label: "担当者姓",     value: "{{担当者姓}}"     },
      { label: "担当者名",     value: "{{担当者名}}"     },
      { label: "担当者電話",   value: "{{担当者電話}}"   },
      { label: "担当者メール", value: "{{担当者メール}}"  },
    ],
  },
];

const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// ── 変数をハイライト表示するプレビュー（実データ置換対応）──
function renderPreview(text, varMap = {}) {
  if (!text) return <span style={{ color: THEME.textMuted, fontStyle: "italic" }}>本文プレビュー</span>;
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) => {
    if (/^{{.+}}$/.test(part)) {
      const key = part.slice(2, -2);
      const val = varMap[key];
      if (val) {
        // 実データあり → 緑ハイライトで実値を表示
        return (
          <mark key={i} title={`変数: ${part}`} style={{
            backgroundColor: "#ECFDF5", color: "#059669",
            borderRadius: 4, padding: "1px 5px",
            fontWeight: 800, fontStyle: "normal",
            border: "1px solid #A7F3D0",
          }}>
            {val}
          </mark>
        );
      }
      // データなし → 紫ハイライトで変数名そのまま
      return (
        <mark key={i} style={{
          backgroundColor: "#EEF2FF", color: "#4F46E5",
          borderRadius: 4, padding: "1px 5px",
          fontWeight: 800, fontStyle: "normal",
        }}>
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── 変数挿入パネル（各ステップのtextarea上部に表示）──
function VariablePanel({ stepIdx, lastInserted, onInsert }) {
  return (
    <div style={{
      backgroundColor: "#F8FAFC",
      border: `1px solid ${THEME.border}`,
      borderRadius: "12px 12px 0 0",
      padding: "12px 16px",
      borderBottom: "none",
    }}>
      <p style={{
        fontSize: 11, fontWeight: 800, color: THEME.textMuted,
        margin: "0 0 10px", letterSpacing: "0.05em",
      }}>
        変数を挿入　―　クリックするとカーソル位置に挿入されます
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {VARIABLE_GROUPS.map(group => (
          <div key={group.label} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: group.color, minWidth: 56, flexShrink: 0 }}>
              {group.label}
            </span>
            {group.vars.map(v => {
              const justInserted = lastInserted?.idx === stepIdx && lastInserted?.value === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => onInsert(stepIdx, v.value)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 20,
                    border: `1.5px solid ${justInserted ? group.color : group.color + "60"}`,
                    backgroundColor: justInserted ? group.color : group.bg,
                    color: justInserted ? "white" : group.color,
                    fontSize: 12, fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "monospace",
                  }}
                  onMouseEnter={e => {
                    if (!justInserted) {
                      e.currentTarget.style.backgroundColor = group.color;
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!justInserted) {
                      e.currentTarget.style.backgroundColor = group.bg;
                      e.currentTarget.style.color = group.color;
                    }
                  }}
                  title={`クリックで ${v.value} を挿入`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 処理中オーバーレイ ──
function LoadingOverlay({ message = "保存中..." }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000,
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: 20, padding: "36px 48px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
      }}>
        <Loader2 size={40} color={THEME.primary} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain }}>{message}</span>
      </div>
    </div>
  );
}

// ── 成功モーダル ──
function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "white", borderRadius: 20, padding: 40,
        maxWidth: 400, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)", textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", backgroundColor: "#ECFDF5",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <CheckCircle2 size={32} color="#059669" />
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: "#111827" }}>{title}</h3>
        {message && <p style={{ margin: "0 0 28px", fontSize: 14, color: "#6B7280" }}>{message}</p>}
        {!message && <div style={{ marginBottom: 28 }} />}
        <button onClick={onClose} style={{
          width: "100%", padding: "14px", backgroundColor: "#059669", color: "white",
          border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer",
        }}>OK</button>
      </div>
    </div>
  );
}

export default function ScenarioForm({ scenarios = [], customers = [], staffList = [], currentUser = null, onRefresh, onOptimisticAdd, gasUrl }) {
  const showToast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName]       = useState("");
  const [st, setSt]           = useState([{ elapsedDays: 1, deliveryHour: 10, deliveryMinute: 0, message: "" }]);
  const [saving, setSaving]   = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // 各ステップのtextarea ref（動的配列）
  const textareaRefs = useRef([]);

  // 直近挿入した変数（フラッシュ表示用）: { idx, value } | null
  const [lastInserted, setLastInserted] = useState(null);

  // ── プレビュー用の変数マップを構築 ──────────────────────────
  const { varMap, previewMeta } = React.useMemo(() => {
    // 最新登録顧客（登録日降順の先頭）
    const latestCustomer = [...customers]
      .filter(c => c["登録日"])
      .sort((a, b) => new Date(b["登録日"]) - new Date(a["登録日"]))[0]
      || customers[customers.length - 1]
      || null;

    // ログインユーザーをstaffListから検索
    const staffData = staffList.find(s => s.email === currentUser?.email) || null;

    const map = {};

    if (latestCustomer) {
      map["姓"]      = latestCustomer["姓"]      || "";
      map["名"]      = latestCustomer["名"]      || "";
      map["電話番号"] = latestCustomer["電話番号"] || "";
      map["会社名"]  = latestCustomer["会社名"]  || "";
    }

    if (staffData) {
      map["担当者姓"]     = staffData.lastName  || "";
      map["担当者名"]     = staffData.firstName || "";
      map["担当者電話"]   = staffData.phone     || "";
      map["担当者メール"] = staffData.email     || "";
    } else if (currentUser) {
      // staffListに未登録でもGoogleアカウント情報でフォールバック
      map["担当者姓"]     = currentUser.family_name || "";
      map["担当者名"]     = currentUser.given_name  || "";
      map["担当者メール"] = currentUser.email        || "";
    }

    const customerLabel = latestCustomer
      ? `${latestCustomer["姓"] || ""}${latestCustomer["名"] || ""} (最新登録)`
      : null;
    const staffLabel = staffData
      ? `${staffData.lastName}${staffData.firstName}`
      : currentUser?.name || null;

    return { varMap: map, previewMeta: { customerLabel, staffLabel } };
  }, [customers, staffList, currentUser]);

  useEffect(() => {
    if (id) {
      const dId = decodeURIComponent(id);
      setName(dId);
      const ex = (scenarios || [])
        .filter(item => item["シナリオID"] === dId)
        .sort((a, b) => a["ステップ数"] - b["ステップ数"]);
      if (ex.length) {
        setSt(ex.map(item => ({
          elapsedDays:    item["経過日数"],
          deliveryHour:   item["配信時間"],
          deliveryMinute: item["配信分"] ?? 0,
          message:        item["message"],
        })));
      }
    }
  }, [id, scenarios]);

  const updateStep = (idx, field, value) => {
    setSt(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // 変数をカーソル位置に挿入
  const insertVariable = (stepIdx, varValue) => {
    const ta = textareaRefs.current[stepIdx];
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;

    setSt(prev => {
      const next = [...prev];
      const before = next[stepIdx].message.slice(0, start);
      const after  = next[stepIdx].message.slice(end);
      next[stepIdx] = { ...next[stepIdx], message: before + varValue + after };
      return next;
    });

    // フラッシュフィードバック
    setLastInserted({ idx: stepIdx, value: varValue });
    setTimeout(() => setLastInserted(null), 1200);

    // カーソルを挿入後の位置に戻す
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + varValue.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const addStep = () => {
    const prev = st[st.length - 1];
    setSt([...st, {
      elapsedDays:    prev ? Number(prev.elapsedDays) + 1 : 1,
      deliveryHour:   prev ? prev.deliveryHour   : 10,
      deliveryMinute: prev ? prev.deliveryMinute : 0,
      message: "",
    }]);
  };

  const handleSave = async () => {
    if (!name) return showToast("シナリオ名を入力してください", "warning");
    setSaving(true);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "saveScenario", scenarioID: name, steps: st }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      // 楽観的UI更新：GAS再取得を待たずに一覧を即時反映
      onOptimisticAdd?.(name, st);
      onRefresh();
      setSaving(false);
      setSuccessModal(true);
    } catch {
      setSaving(false);
      showToast("保存失敗", "error");
    }
  };

  return (
    <>
      <style>{spinStyle}</style>

      {saving && <LoadingOverlay message="保存中..." />}

      <SuccessModal
        open={successModal}
        title="保存しました"
        message={`シナリオ「${name}」を保存しました。`}
        onClose={() => { setSuccessModal(false); navigate("/scenarios"); }}
      />

      <div style={formStyles.main}>
        {/* ヘッダー */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <div>
            <button
              onClick={() => navigate("/scenarios")}
              style={{ background: "none", border: "none", color: THEME.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: "800", marginBottom: 8 }}
            >
              <ArrowLeft size={18} /> 戻る
            </button>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: THEME.textMain, margin: 0 }}>
              {id ? "シナリオ編集" : "新規シナリオ作成"}
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? "#A5B4FC" : THEME.primary,
              color: "white", padding: "14px 28px", borderRadius: "12px",
              border: "none", fontWeight: "900",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", gap: 10, alignItems: "center",
              transition: "background-color 0.2s",
            }}
          >
            <Save size={20} /> 保存
          </button>
        </header>

        <div style={{ maxWidth: "850px" }}>
          {/* シナリオ名 */}
          <div style={formStyles.card}>
            <label style={{ fontSize: "13px", fontWeight: "900", color: THEME.textMuted, display: "block", marginBottom: "12px" }}>
              シナリオ名（ID）
            </label>
            <input
              style={formStyles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!!id}
              placeholder="例：売却反響自動追客"
            />
          </div>

          {/* ステップ一覧 */}
          {st.map((item, idx) => (
            <div key={idx} style={{ ...formStyles.card, padding: 0, overflow: "hidden" }}>
              {/* ステップヘッダー */}
              <div style={{ backgroundColor: "#1E293B", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontWeight: "900" }}>STEP {idx + 1}</span>
                <button
                  onClick={() => setSt(st.filter((_, i) => i !== idx))}
                  style={{ color: "#94A3B8", background: "none", border: "none", cursor: "pointer" }}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div style={{ padding: "28px 32px" }}>
                {/* 経過日数 ＋ 配信時刻 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "28px" }}>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 8, color: THEME.textMain }}>
                      <Calendar size={14} /> 経過日数
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        style={{ ...formStyles.input, width: "90px" }}
                        type="number" min={1}
                        value={item.elapsedDays}
                        onChange={e => updateStep(idx, "elapsedDays", e.target.value)}
                      />
                      <span style={{ fontSize: 13, color: THEME.textMuted, whiteSpace: "nowrap" }}>日後</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 8, color: THEME.textMain }}>
                      <Clock size={14} /> 配信時刻
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        style={formStyles.select}
                        value={item.deliveryHour}
                        onChange={e => updateStep(idx, "deliveryHour", Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 15, fontWeight: 700, color: THEME.textMuted }}>:</span>
                      <select
                        style={formStyles.select}
                        value={item.deliveryMinute}
                        onChange={e => updateStep(idx, "deliveryMinute", Number(e.target.value))}
                      >
                        {MINUTE_OPTIONS.map(m => (
                          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 13, color: THEME.textMuted, whiteSpace: "nowrap" }}>に配信</span>
                    </div>
                  </div>
                </div>

                {/* 本文エリア */}
                <label style={{ fontWeight: 900, fontSize: 12, display: "flex", gap: 6, alignItems: "center", marginBottom: 0, color: THEME.textMain }}>
                  本文
                </label>

                {/* 変数挿入パネル（textarea上部に接続） */}
                <div style={{ marginTop: 8 }}>
                  <VariablePanel
                    stepIdx={idx}
                    lastInserted={lastInserted}
                    onInsert={insertVariable}
                  />
                  {/* textarea（パネルと接続した見た目） */}
                  <textarea
                    ref={el => textareaRefs.current[idx] = el}
                    style={{
                      ...formStyles.input,
                      height: "160px",
                      resize: "vertical",
                      borderRadius: "0 0 12px 12px",
                      lineHeight: 1.7,
                      fontFamily: "monospace",
                      fontSize: 14,
                    }}
                    value={item.message}
                    onChange={e => updateStep(idx, "message", e.target.value)}
                    placeholder="本文を入力、または上のボタンで変数を挿入..."
                  />
                </div>

                {/* プレビュー（変数を実データで置換して表示） */}
                {item.message && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, margin: 0, letterSpacing: "0.05em" }}>
                        プレビュー
                      </p>
                      {/* プレビューデータの出典表示 */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {previewMeta.customerLabel && (
                          <span style={{ fontSize: 11, color: "#059669", backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                            顧客: {previewMeta.customerLabel}
                          </span>
                        )}
                        {previewMeta.staffLabel && (
                          <span style={{ fontSize: 11, color: "#0284C7", backgroundColor: "#E0F2FE", border: "1px solid #BAE6FD", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                            担当者: {previewMeta.staffLabel}
                          </span>
                        )}
                        {!previewMeta.customerLabel && !previewMeta.staffLabel && (
                          <span style={{ fontSize: 11, color: THEME.textMuted }}>
                            ※ 変数データなし（登録後に反映されます）
                          </span>
                        )}
                      </div>
                    </div>
                    <pre style={{
                      fontSize: 13, color: THEME.textMain,
                      whiteSpace: "pre-wrap", lineHeight: 1.7,
                      background: "#F8FAFC", padding: "14px 16px",
                      borderRadius: 12, border: `1px solid ${THEME.border}`,
                      margin: 0, fontFamily: "sans-serif",
                    }}>
                      {renderPreview(item.message, varMap)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* ステップ追加ボタン */}
          <button
            onClick={addStep}
            style={{
              backgroundColor: "white", border: `2px dashed ${THEME.border}`,
              color: THEME.textMuted, width: "100%", padding: "24px",
              borderRadius: "16px", cursor: "pointer", fontWeight: "800",
              display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
            }}
          >
            <Plus size={24} />
            ステップを追加
            {st.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: THEME.textMuted, marginLeft: 4 }}>
                （{Number(st[st.length - 1].elapsedDays) + 1}日後からプリセット）
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}