import React, { useState } from "react";
import axios from "axios";
import { Plus, Trash2, Globe, Loader2, GripVertical, CheckCircle2 } from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import Page from "../components/Page";

// ==========================================
// 🌐 SourceManager - 流入元管理ページ
// ==========================================
// 査定サイトなど「どこから来たか」を自由に追加・削除できる設定画面
// ここで登録した流入元は顧客登録・編集画面のドロップダウンに反映される

const PRESET_SOURCES = [
  { label: "イエウール",        hint: "不動産売却の一括査定サイト" },
  { label: "スーモ売却",        hint: "SUUMO不動産売却査定" },
  { label: "HOME4U",          hint: "NTTデータ運営の査定サイト" },
  { label: "おうちクラドル",    hint: "不動産一括査定" },
  { label: "いえカツ",          hint: "不動産売却サポートサイト" },
  { label: "LINE問い合わせ",   hint: "LINEからの直接問い合わせ" },
  { label: "自社HP",            hint: "自社ホームページからの流入" },
  { label: "紹介",              hint: "既存顧客・知人からの紹介" },
  { label: "その他",            hint: "上記以外の流入" },
];

export default function SourceManager({ sources = [], onRefresh, gasUrl = GAS_URL }) {
  const [input, setInput]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [costEdits, setCostEdits]   = useState({});  // { name: 金額文字列 }
  const [costSaving, setCostSaving] = useState(null); // 保存中の流入元名

  // ── 追加 ──────────────────────────────────
  const handleAdd = async (label) => {
    const name = (label || input).trim();
    if (!name) return;
    if (sources.some((s) => s.name === name)) {
      alert(`「${name}」はすでに登録されています`);
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "addSource", name }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      setInput("");
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      onRefresh();
    } catch { alert("追加に失敗しました"); }
    finally { setSaving(false); }
  };

  // ── コスト更新 ────────────────────────────
  const handleCostSave = async (name) => {
    const cost = Number(costEdits[name] ?? "");
    if (isNaN(cost) || cost < 0) { alert("正しい金額を入力してください"); return; }
    setCostSaving(name);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "updateSourceCost", name, cost }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch { alert("コストの保存に失敗しました"); }
    finally { setCostSaving(null); }
  };

  // ── 削除 ──────────────────────────────────
  const handleDelete = async (name) => {
    if (!window.confirm(`「${name}」を削除しますか？\n※ すでにこの流入元が設定されている顧客データには影響しません。`)) return;
    setDeleting(name);
    try {
      await axios.post(
        gasUrl,
        JSON.stringify({ action: "deleteSource", name }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
      onRefresh();
    } catch { alert("削除に失敗しました"); }
    finally { setDeleting(null); }
  };

  // プリセットのうち未登録のもの
  const unusedPresets = PRESET_SOURCES.filter(
    (p) => !sources.some((s) => s.name === p.label)
  );

  return (
    <Page
      title="流入元の管理"
      subtitle="どの査定サイト・経路から来たお客様かを管理するための選択肢を設定します"
    >
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── 登録済み一覧 ──────────────────────── */}
        <div style={styles.card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain, margin: "0 0 4px" }}>
            登録済みの流入元
          </h2>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 20px" }}>
            顧客登録・編集画面の「流入元」ドロップダウンに表示されます
          </p>

          {sources.length === 0 ? (
            <div style={{
              padding: "40px 0", textAlign: "center",
              color: THEME.textMuted, fontSize: 14,
              background: "#F8FAFC", borderRadius: 12,
              border: `1.5px dashed ${THEME.border}`,
            }}>
              <Globe size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
              まだ流入元が登録されていません<br />
              <span style={{ fontSize: 12 }}>下のフォームまたはクイック追加から登録してください</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sources.map((s, i) => (
                <div
                  key={s.name}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    background: i % 2 === 0 ? "#FAFBFF" : "#FFFFFF",
                    borderRadius: 10,
                    border: `1px solid ${THEME.border}`,
                  }}
                >
                  <GripVertical size={16} color={THEME.border} style={{ flexShrink: 0 }} />
                  <Globe size={15} color={THEME.primary} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: THEME.textMain }}>
                    {s.name}
                  </span>
                  <span style={{
                    fontSize: 11, color: THEME.textMuted,
                    background: "#F1F5F9", borderRadius: 6,
                    padding: "2px 8px",
                    flexShrink: 0,
                  }}>
                    顧客 {s.count ?? 0} 件
                  </span>
                  {/* コスト入力 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: THEME.textMuted }}>コスト</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={costEdits[s.name] ?? s.cost ?? ""}
                      onChange={e => setCostEdits(prev => ({ ...prev, [s.name]: e.target.value }))}
                      style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontSize: 12, fontWeight: 700, textAlign: "right" }}
                    />
                    <span style={{ fontSize: 11, color: THEME.textMuted }}>円</span>
                    <button
                      onClick={() => handleCostSave(s.name)}
                      disabled={costSaving === s.name}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: THEME.primary, color: "white", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: costSaving === s.name ? 0.5 : 1 }}
                    >
                      {costSaving === s.name ? "保存中" : "保存"}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(s.name)}
                    disabled={deleting === s.name}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", padding: 4,
                      color: deleting === s.name ? THEME.border : "#EF4444",
                      flexShrink: 0,
                    }}
                    title="削除"
                  >
                    {deleting === s.name
                      ? <Loader2 size={16} />
                      : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 新規追加フォーム ──────────────────── */}
        <div style={styles.card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain, margin: "0 0 4px" }}>
            流入元を追加する
          </h2>
          <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px" }}>
            査定サイト名・広告媒体名・経路名など自由に入力できます
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              placeholder="例：ライフルホームズ、チラシ、Instagram広告..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              disabled={saving}
            />
            <button
              onClick={() => handleAdd()}
              disabled={saving || !input.trim()}
              style={{
                ...styles.btn, ...styles.btnPrimary,
                minWidth: 96, flexShrink: 0,
                opacity: (!input.trim() || saving) ? 0.5 : 1,
              }}
            >
              {saving
                ? <Loader2 size={16} />
                : saved
                ? <><CheckCircle2 size={16} /> 追加済み</>
                : <><Plus size={16} /> 追加</>}
            </button>
          </div>
        </div>

        {/* ── クイック追加（プリセット） ──────────── */}
        {unusedPresets.length > 0 && (
          <div style={styles.card}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: THEME.textMain, margin: "0 0 4px" }}>
              よく使われる流入元
            </h2>
            <p style={{ fontSize: 13, color: THEME.textMuted, margin: "0 0 16px" }}>
              クリックでそのまま追加できます
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {unusedPresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleAdd(p.label)}
                  disabled={saving}
                  title={p.hint}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 20,
                    border: `1.5px solid ${THEME.primary}60`,
                    background: "#EEF2FF",
                    color: THEME.primary,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.color = THEME.primary; }}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </Page>
  );
}