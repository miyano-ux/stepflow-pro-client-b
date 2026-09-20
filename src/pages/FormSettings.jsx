import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lock, Trash2, Plus, ChevronDown, ChevronUp,
  Type, Calendar, List, ToggleLeft, ToggleRight, GripVertical, X, CheckCircle2, Loader2, Pencil, Hash
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../ToastContext";
import { useWindowWidth } from "../lib/useWindowWidth";

// ==========================================
// ⚙️ FormSettings - 登録項目定義ページ
// ==========================================

const FIELD_TYPES = [
  { value: "text",     label: "テキスト", icon: <Type size={15} /> },
  // 【A2-031】仕様書4.11「フィールドタイプ: テキスト / 数値 / 日付 / 選択肢」に合わせて
  //   数値型を追加。入力制限は DynamicField.jsx / CustomerDetail.jsx(EditNumber)、
  //   保存時検証は CustomerForm.jsx handleSubmit / CustomerDetail.jsx handleSave、
  //   CSV取込の不正値は GAS bulkAdd 側で空欄化＋取り込みエラー記録（A2-012 のQ7-C方式と同方針）。
  //   GAS saveFormSettings / getAppData は type を素通しするため（gas_updated.js:1381, 3597）
  //   サーバー側の定義変更は不要。
  { value: "number",   label: "数値",     icon: <Hash size={15} /> },
  { value: "date",     label: "日付",     icon: <Calendar size={15} /> },
  { value: "dropdown", label: "選択肢",   icon: <List size={15} /> },
];

const FIXED_FIELDS = ["姓", "名", "電話番号", "メールアドレス"];

// 【G2-014】確認モーダルの文言用：型値 → 日本語ラベル
const typeLabelOf = (v) => FIELD_TYPES.find(t => t.value === v)?.label || v || "テキスト";

// 【G2-015】顧客リストのシステム管理列（gas_updated.js CUSTOMER_SYSTEM_COLS と対応）。
// カスタム項目にこれらの名前を付けると既存列と衝突するため、保存前に弾く。
const RESERVED_FIELDS = [
  "顧客ID", "登録日", "シナリオID", "配信ステータス", "対応ステータス",
  "担当者メール", "流入元", "ステータス変更日", "失注理由", "契約種別",
];

function buildItems(formSettings) {
  return (formSettings || []).map(f => ({
    name:     f.name || "",
    // 【G2-015】読み込み時点の項目名を保持する。保存時に「名称変更」と「削除＋新規追加」を
    // 区別するための識別子で、これが無いと名前を変えただけで削除扱いになる。
    // 新規追加した項目は "" のまま＝リネーム対象外。
    originalName: f.name || "",
    type:     f.type || "text",
    required: f.required !== false && f.required !== "false",
    options:  (typeof f.options === "string" && f.options)
                ? f.options.split(",").map(o => o.trim()).filter(Boolean)
                : [""],
  }));
}

export default function FormSettings({ formSettings = [], sheetCustomColumns = [], customers = [], isLoading = false, loadError = false, onRefresh }) {
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const backTo    = from === "master-settings" ? "/master-settings" : "/add";
  const backLabel = from === "master-settings" ? "管理項目設定へ戻る" : "登録画面へ戻る";
  const showToast = useToast();
  const { isMobile } = useWindowWidth();

  const [items, setItems]         = useState(() => buildItems(formSettings));
  const [openIndex, setOpenIndex] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // ── 【G2-012改】props 到着後の再同期 ────────────────────────────────
  // App.jsx は load=true の間もルートを描画する（App.jsx:287-289）ため、
  // /form-settings に直接アクセス／再読み込みすると GAS 取得完了前の
  // formSettings=[]（App.jsx:74）を初期値として掴むことがある。
  //
  // 旧実装は「最初にデータが届いた1回だけ」取り込む方式だったが、
  // stale-while-revalidate（App.jsx: IndexedDB の前回データを即描画→裏で refresh）
  // 環境では、マウント時にキャッシュ由来の古い formSettings で hydrated 扱いになり、
  // その後に届く最新データ（例: 一時URL404で応答が喪失した保存＝実際にはシート反映済みの
  // 項目や、別端末・別タブでの保存で増えた項目）が
  // 画面に一切反映されなかった。ヘッダーの「データを同期」も同じ理由で無効化していた。
  // さらに doSave の knownNames が props 直参照だったため、「props は最新・画面は古い」
  // 状態で保存すると、画面に表示されていない既存項目が knownNames に含まれて
  // GAS の部分減少ガードを通過し、列がデータごと無言削除される危険があった。
  //
  // 対策: props の内容が変わるたびに再同期する。
  //   ・未編集（dirtyRef=false）→ 全量を再取り込み（originalName も最新化される）
  //   ・編集中（dirtyRef=true）→ 編集内容は保持しつつ、画面に無い既存項目だけ末尾に補完
  // 併せて hydratedNamesRef（画面が実際に取り込んだ既存項目名）を保持し、
  // doSave の knownNames はこれを使う。「GASに削除してよいと伝える集合」＝
  // 「ユーザーが画面上で見て判断できた集合」を厳密に一致させるため。
  const dirtyRef = useRef(false);   // ユーザーが items を編集したか（保存成功でリセット）
  const hydratedSigRef   = useRef((formSettings || []).length > 0 ? JSON.stringify(formSettings) : null);
  const hydratedNamesRef = useRef(new Set(
    (formSettings || []).map(f => String(f?.name || "").trim()).filter(Boolean)
  ));
  useEffect(() => {
    const list = formSettings || [];
    if (list.length === 0) return;                    // 未ロード（or 取得失敗）は据え置き
    const sig = JSON.stringify(list);
    if (sig === hydratedSigRef.current) return;       // 内容変化なし
    hydratedSigRef.current = sig;
    hydratedNamesRef.current = new Set(list.map(f => String(f?.name || "").trim()).filter(Boolean));
    if (!dirtyRef.current) {
      setItems(buildItems(list));
      return;
    }
    // 編集中: 編集内容は保持し、画面に存在しない既存項目だけ末尾に補完する。
    // 補完しないと、ユーザーが見ていない項目を「削除の意思あり」として送る事故か、
    // knownNames に載らず部分減少ガードで保存不能になるかのどちらかになる。
    setItems(prev => {
      const seen = new Set(
        prev.flatMap(i => [String(i.originalName || "").trim(), String(i.name || "").trim()]).filter(Boolean)
      );
      const additions = buildItems(list.filter(f => !seen.has(String(f?.name || "").trim())));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [formSettings]);

  // ── 【G2-014】画面離脱後の強制遷移を防ぐ生存フラグ ──────────────
  // 保存後の onRefresh()（App.jsx refresh＝全件GET・最大3リトライ）は数秒〜数十秒
  // かかることがある。react-router v7 の navigate はアンマウント後も無効化されない
  // ため、待機中にユーザーが「新規登録」等へ移動していると、完了時に nav(backTo) が
  // 発火して作業中の画面から管理項目設定へ引き戻してしまう。
  // 「完了表示」「画面遷移」「state 更新」はすべてこのフラグの確認後に行う。
  // ※ StrictMode（開発時）は mount→cleanup→mount と二重実行されるため、
  //   マウント時に必ず true へ戻してから cleanup を登録する。
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // ── 【G2-012 / G2-015】保存内容の差分（削除・名称変更）─────────────
  // カスタム項目は「名称」で顧客シートの列と紐づく。旧実装は「現在の項目名」だけで
  // 差分を取っていたため、名前を変更しただけの項目が『旧名の削除』に見えていた。
  // originalName を突き合わせることで、削除（項目そのものが無くなった）と
  // 名称変更（同じ項目の名前だけ変わった）を切り分ける。
  const { removedFields, renamedFields, typeChangedFields } = useMemo(() => {
    const countOf = (n) => (customers || []).filter(c => String(c?.[n] ?? "").trim() !== "").length;
    const oldNames = (formSettings || []).map(f => String(f?.name || "").trim()).filter(Boolean);

    // 画面に残っている項目の「元の名前」＝削除されていない旧名
    const survivingOld = new Set(items.map(i => String(i.originalName || "").trim()).filter(Boolean));
    const currentNames = new Set(items.map(i => String(i.name || "").trim()).filter(Boolean));

    const renamed = items
      .map(i => ({ from: String(i.originalName || "").trim(), to: String(i.name || "").trim() }))
      .filter(r => r.from && r.to && r.from !== r.to)
      .map(r => ({ ...r, count: countOf(r.from) }));

    // 旧名のうち、どの項目にも引き継がれておらず、同名で作り直してもいないものが「削除」
    const removed = oldNames
      .filter(n => !survivingOld.has(n) && !currentNames.has(n))
      .map(n => ({ name: n, count: countOf(n) }));

    // 【G2-014】入力形式（型）の変更検知。型変更は既存値を変換・クリアせず
    // そのまま保持する（gas_updated.js saveFormSettings は定義シートを書き換えるだけで
    // 顧客列には触れない）ため、選択肢に無い既存値は編集画面で未選択に見える
    // などの不整合が起こりうる。保存前に確認モーダルで明示する。
    // 照合は originalName（読み込み時の名前）基準＝名称変更と同時でも検知できる。
    const oldByName = new Map((formSettings || []).map(f => [String(f?.name || "").trim(), f]));
    const typeChanged = items
      .map(i => {
        const from = String(i.originalName || "").trim();
        if (!from) return null;                          // 新規追加は対象外
        const old = oldByName.get(from);
        if (!old) return null;
        const oldType = old.type || "text";
        if (oldType === i.type) return null;
        return { name: String(i.name || "").trim() || from, fromType: oldType, toType: i.type, count: countOf(from) };
      })
      .filter(Boolean);

    return { removedFields: removed, renamedFields: renamed, typeChangedFields: typeChanged };
  }, [items, formSettings, customers]);

  // ── 項目操作 ──────────────────────────────────────
  const updateItem = useCallback((index, patch) => {
    dirtyRef.current = true;   // 【G2-012改】編集開始＝props 再同期は「補完のみ」に切替
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  }, []);

  const handleAdd = () => {
    dirtyRef.current = true;   // 【G2-012改】
    setItems(prev => {
      const next = [...prev, { name: "", type: "text", required: true, options: [""], originalName: "" }];
      setOpenIndex(next.length - 1);
      return next;
    });
  };

  const handleDelete = (index) => {
    dirtyRef.current = true;   // 【G2-012改】
    setItems(prev => prev.filter((_, i) => i !== index));
    setOpenIndex(null);
  };

  const addOption    = (ii)          => updateItem(ii, { options: [...items[ii].options, ""] });
  const updateOption = (ii, oi, val) => updateItem(ii, { options: items[ii].options.map((o, i) => i === oi ? val : o) });
  const deleteOption = (ii, oi)      => {
    const opts = items[ii].options.filter((_, i) => i !== oi);
    updateItem(ii, { options: opts.length ? opts : [""] });
  };

  // ── 保存（差分計算はGAS側で行う） ─────────────────
  const doSave = async (confirmWipe = false) => {
    const settings = items.map(item => ({
      name:     item.name.trim(),
      // 【G2-015】GAS 側はこの originalName を見て「列のリネーム」を行い、
      // 入力済みデータを保持したまま項目名を変更する（gas_updated.js saveFormSettings）。
      originalName: String(item.originalName || "").trim(),
      type:     item.type,
      required: item.required,
      options:  item.type === "dropdown" ? item.options.filter(o => o.trim()).join(",") : "",
    }));

    setSaving(true);
    setSaved(false);
    try {
      // 【G2-012】confirmWipe: 全件削除の明示同意。GAS側ガード（saveFormSettings）と対。
      // 【G2-012追加ガード】knownNames: この画面が読み込み時に認識していた既存項目名。
      // GAS側は「クライアントが見ていない既存項目の削除」を拒否する（部分減少ガード）。
      // 古い表示のまま保存した場合に、画面に無かった項目が黙って消える事故を防ぐ。
      // 【G2-012改】knownNames は props ではなく「画面が実際に取り込んだ既存項目名」を送る。
      // props 直参照だと、裏で refresh が完了して props だけ最新化された瞬間に、
      // 画面に表示されていない既存項目まで「認識済み（＝削除の意思あり）」として
      // 送ってしまい、GAS の部分減少ガードを通過して列がデータごと無言削除される。
      const knownNames = [...hydratedNamesRef.current];
      // 【既知事象対策】GAS WebアプリのPOSTは 302 → script.googleusercontent.com の一時URLへ
      // リダイレクトされて応答が返るが、GAS側の処理完了「後」にこの一時URLが404を返す
      // ことがある（＝シートには保存済みなのにフロントだけ「保存に失敗しました: 404」になる）。
      // saveFormSettings は同一ペイロードの再送が冪等であることを確認済み：
      //   ・1回目が成功済みの再送では、rename は oldCustomNames に旧名が無くスキップ、
      //     新規列は既存判定でスキップ、削除対象（toRemove）は空、と全て no-op になる。
      // そのため retry:true で自動再試行し、この既知404を自己回復させる。
      // ※ 他の書き込みアクション（add 等）は再送で重複登録が起きうるため一律有効化はしないこと。
      await apiCall.post(
        GAS_URL,
        { action: "saveFormSettings", settings, confirmWipe, knownNames },
        { retry: true }
      );

      // 【G2-012改】保存成功＝編集内容はサーバーへ反映済み。dirty を解除しておくことで、
      // 直後の onRefresh で届く最新 formSettings が全量再取り込みされ、
      // originalName・hydratedNamesRef が最新状態に揃う。
      dirtyRef.current = false;

      // 【G2-014改】完了表示・画面遷移を、全件再取得（onRefresh）の完了から切り離す。
      // 従来は await onRefresh()（全件GET・数秒〜十数秒）の後にしか「同期完了！」が
      // 出なかったため、待ち時間中にユーザーがリロード／離脱すると
      //   ・保存は成功しているのに完了表示を一度も見られない
      //   ・リロード後は IndexedDB の旧データが先に描画され、裏の refresh が
      //     失敗し続けるとシートと画面の表記が乖離したままになる
      // という事故が起きていた。saveFormSettings が成功した時点でサーバー側は
      // 確定しているため、完了表示と遷移は即時に行い、再取得は待たずに裏で開始する
      // （refresh は App 側の関数なので、この画面のアンマウント後も安全に完走して
      // d と IndexedDB キャッシュを最新化する）。
      // 旧G2-014の懸念「遅延して発火する nav に引き戻される」は、nav を即時実行する
      // ことで待機中の nav 自体が存在しなくなり解消する。
      if (onRefresh) onRefresh();   // await しない（背景で最新化）

      if (!aliveRef.current) {
        showToast("登録項目の保存が完了しました", "success");
        return;
      }

      setSaved(true);
      nav(backTo);
    } catch (err) {
      console.error("saveFormSettings error:", err);
      // 【既知事象対策】transient＝応答が届かなかっただけの失敗（apiCall が付与）。
      // リトライ上限まで応答が取れなかった場合でも保存自体は完了している可能性が
      // 高いため、英語の生エラーではなく再読み込みでの確認を促す文言にする。
      const msg = err?.transient
        ? "通信エラーで保存結果を確認できませんでした。保存自体は完了している可能性があります。ページを再読み込みして項目をご確認ください"
        : "保存に失敗しました: " + (err?.message || "不明なエラー");
      if (aliveRef.current) {
        showToast(msg, "error");
      } else {
        showToast("登録項目の保存に失敗しました。設定画面で再度お試しください", "error");
      }
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  };

  const handleSave = () => {
    // 【G2-012】読み込み未完了のまま保存すると空定義で全項目を上書きしてしまう
    if (isLoading) return showToast("項目を読み込み中です。完了までお待ちください", "warning");
    // 【G2-012】取得失敗中は画面の items が実データと乖離している（0件誤表示等）。
    // このまま保存すると空定義での全件置換になるため、保存自体を止める。
    if (loadError) return showToast("データの取得に失敗しています。ページを再読み込みしてから保存してください", "error");

    // 【G2-012】0件保存＝サーバー上の全カスタム項目定義と顧客リストの該当列
    // （入力済みデータ含む）の全削除。誤表示に気づかず押した事故を防ぐため、
    // 通常の削除確認とは別に、全削除専用の確認を必ず挟み confirmWipe を付けて送る。
    // （GAS側ガードは confirmWipe が無い0件保存を status:"error" で拒否する）
    if (items.length === 0) {
      setConfirmModal({
        title: "カスタム項目をすべて削除します",
        message: "カスタム項目が0件の状態で保存しようとしています。\n保存すると、登録済みのカスタム項目定義と、顧客リストの該当列（入力済みデータを含む）がすべて削除され、復元できません。",
        note: "既存の項目が表示されていないだけの可能性があります。全削除が目的でない場合はキャンセルし、ページを再読み込みしてください。",
        confirmLabel: "全カスタム項目を削除して保存する",
        onConfirm: () => { setConfirmModal(null); doSave(true); },
      });
      return;
    }

    const seen = new Set();
    for (const item of items) {
      const name = item.name.trim();
      if (!name) return showToast("項目名が未入力の項目があります", "warning");
      // 【G2-015】名称変更を許可する以上、固定項目や他項目との衝突は保存前に弾く。
      // 重複した項目名は顧客シート上で同じ列を指してしまい、データが混ざる。
      if (FIXED_FIELDS.includes(name) || RESERVED_FIELDS.includes(name))
        return showToast(`「${name}」は固定項目のため、項目名に使用できません`, "warning");
      if (seen.has(name)) return showToast(`「${name}」が重複しています`, "warning");
      seen.add(name);
      if (item.type === "dropdown" && !item.options.filter(o => o.trim()).length)
        return showToast(`「${name}」の選択肢が空です`, "warning");
    }

    // 【G2-015】A→B / B→A のような入れ替えは、どの列をどの列にリネームすべきかが
    // 一意に決まらず GAS 側もリネームを見送る（＝データが入れ替わったように見える）。
    // 事故になりやすいので1回の保存では受け付けない。
    const originals = new Set(items.map(i => String(i.originalName || "").trim()).filter(Boolean));
    const swapped = items.find(i => {
      const from = String(i.originalName || "").trim();
      const to   = String(i.name || "").trim();
      return from && to && from !== to && originals.has(to);
    });
    if (swapped) {
      return showToast(
        `「${swapped.name}」は他の項目の元の名前と重複しています。項目名の入れ替えは1項目ずつ保存してください`,
        "warning"
      );
    }

    const hasRemoval    = removedFields.length > 0;
    const hasRename     = renamedFields.length > 0;
    const hasTypeChange = typeChangedFields.length > 0;

    // 【G2-012 / G2-014 / G2-015】既存項目が消える／名前が変わる／入力形式が変わる保存は
    // 確認モーダルを挟む。名称・形式の変更はデータが保持される非破壊操作なので、
    // 削除とは文言・配色・アイコンを分ける。
    if (hasRemoval || hasRename || hasTypeChange) {
      const lines = [];
      if (hasRename) {
        lines.push("【項目名の変更】");
        renamedFields.forEach(f => lines.push(
          `・${f.from} → ${f.to}${f.count > 0 ? `（入力済み ${f.count} 件はそのまま引き継がれます）` : ""}`
        ));
      }
      // 【G2-014】型変更の確認。値は変換されないことを明示する
      if (hasTypeChange) {
        if (lines.length) lines.push("");
        lines.push("【入力形式の変更】");
        typeChangedFields.forEach(f => lines.push(
          `・${f.name}：${typeLabelOf(f.fromType)} → ${typeLabelOf(f.toType)}${f.count > 0 ? `（入力済み ${f.count} 件は変換されずそのまま保持）` : ""}`
        ));
      }
      if (hasRemoval) {
        if (lines.length) lines.push("");
        lines.push("【項目の削除】");
        removedFields.forEach(f => lines.push(
          `・${f.name}${f.count > 0 ? `（入力済み ${f.count} 件）` : "（データなし）"}`
        ));
      }

      const titleParts = [];
      if (hasRename)     titleParts.push(`${renamedFields.length}件の名称変更`);
      if (hasTypeChange) titleParts.push(`${typeChangedFields.length}件の形式変更`);
      if (hasRemoval)    titleParts.push(`${removedFields.length}件の削除`);
      const title = `${titleParts.join("と")}を保存します`;

      const note = hasRemoval
        ? (removedFields.some(f => f.count > 0)
            ? "削除した項目は顧客リストの該当列ごと削除され、入力済みのデータは復元できません。意図した削除かご確認ください。"
            : "削除した項目は顧客リストから列ごと削除されます。")
        : hasTypeChange
            ? "形式を変更しても、入力済みの値は自動変換・削除されずそのまま保持されます。選択肢型へ変更した場合、選択肢に無い既存値は編集画面で未選択に見えますが、選択し直して保存するまで値は保持されます。"
            : "顧客リストの列名を変更するだけで、入力済みのデータはそのまま保持されます。表示設定・媒体連携のマッピングも自動で追従します。";

      setConfirmModal({
        title,
        message: lines.join("\n"),
        note,
        confirmLabel: hasRemoval ? "この内容で保存する" : "この内容で変更して保存する",
        // 削除を含まない場合は破壊的操作ではないため、赤いゴミ箱を出さない
        confirmColor: hasRemoval ? undefined : THEME.primary,
        icon:   hasRemoval ? undefined : <Pencil size={26} color={THEME.primary} />,
        iconBg: hasRemoval ? undefined : "#EEF2FF",
        onConfirm: () => { setConfirmModal(null); doSave(); },
      });
      return;
    }
    doSave();
  };

  // ── レンダリング ──────────────────────────────────
  return (
    <Page
      title="登録項目の定義"
      topButton={
        <button onClick={() => nav(backTo)} style={{ ...styles.btn, ...styles.btnSecondary }}>
          {backLabel}
        </button>
      }
    >
      <div style={{ maxWidth: "720px" }}>

        <ConfirmModal
          open={!!confirmModal}
          title={confirmModal?.title || ""}
          message={confirmModal?.message}
          note={confirmModal?.note}
          confirmLabel={confirmModal?.confirmLabel}
          confirmColor={confirmModal?.confirmColor}
          icon={confirmModal?.icon}
          iconBg={confirmModal?.iconBg}
          onConfirm={confirmModal?.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />

        {/* 案内 */}
        <div style={{ marginBottom: 24, padding: "14px 18px", backgroundColor: "#F8FAFC", borderRadius: 12, border: `1px solid ${THEME.border}`, fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>
          項目を追加・保存すると、データが自動で更新されます。既存項目の名前変更はデータの整合性が失われる可能性があるため慎重に行ってください。
        </div>

        {/* 固定項目 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
            固定項目（変更不可）
          </p>
          {FIXED_FIELDS.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 14, padding: isMobile ? "12px 16px" : "14px 20px", backgroundColor: "#F8FAFC", borderRadius: 10, border: `1px solid ${THEME.border}`, marginBottom: 6, opacity: 0.7 }}>
              <Lock size={15} color={THEME.textMuted} />
              <span style={{ fontSize: 14, fontWeight: 700, color: THEME.textMain, flex: 1 }}>{f}</span>
              <span style={{ fontSize: 12, color: THEME.textMuted, backgroundColor: "white", padding: "3px 10px", borderRadius: 99, border: `1px solid ${THEME.border}` }}>テキスト</span>
            </div>
          ))}
        </div>

        {/* カスタム項目 */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
            カスタム項目
          </p>

          {isLoading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 12, marginBottom: 12 }}>
              項目を読み込み中...
            </div>
          )}

          {/* 【G2-012 / E3-014】「取得失敗」と「取得成功かつ0件」を区別する
              （SourceManager.jsx:296-315 と同方針）。取得失敗時に作成可能な空状態を
              出すと、実データがあるのに0件と誤認され、そのまま保存→全削除の事故になる。 */}
          {!isLoading && loadError && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#B45309", fontSize: 14, border: "2px dashed #FCD34D", backgroundColor: "#FFFBEB", borderRadius: 12, marginBottom: 12, lineHeight: 1.7 }}>
              カスタム項目の取得に失敗しました。<br />
              実際の登録内容が表示されていない可能性があります。ページを再読み込みしてください。
            </div>
          )}

          {!isLoading && !loadError && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: THEME.textMuted, fontSize: 14, border: `2px dashed ${THEME.border}`, borderRadius: 12, marginBottom: 12 }}>
              「+ 項目を追加」ボタンでカスタム項目を作成できます
            </div>
          )}

          {items.map((item, i) => {
            const isOpen    = openIndex === i;
            const typeLabel = FIELD_TYPES.find(t => t.value === item.type)?.label || "テキスト";
            const typeIcon  = FIELD_TYPES.find(t => t.value === item.type)?.icon;

            return (
              <div
                key={i}
                style={{
                  backgroundColor: "white", borderRadius: 12, marginBottom: 10,
                  border: isOpen ? `1.5px solid ${THEME.primary}` : `1px solid ${THEME.border}`,
                  overflow: "hidden", transition: "border 0.15s",
                }}
              >
                {/* ヘッダー行（クリックで開閉） */}
                <div
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center",
                    gap: isMobile ? 8 : 12,
                    padding: isMobile ? "14px 16px" : "16px 20px",
                    cursor: "pointer", userSelect: "none",
                    backgroundColor: isOpen ? "#F6F5FF" : "white",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <GripVertical size={16} color={THEME.border} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: item.name ? THEME.textMain : THEME.textMuted }}>
                      {item.name || "（未入力）"}
                    </span>
                    {isMobile && (isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, ...(isMobile ? { paddingLeft: 28 } : {}) }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: THEME.textMuted, backgroundColor: "#F8FAFC", padding: "3px 10px", borderRadius: 99, border: `1px solid ${THEME.border}` }}>
                      {typeIcon} {typeLabel}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.required ? THEME.primary : THEME.textMuted, backgroundColor: item.required ? "#EEF2FF" : "#F1F5F9", padding: "3px 8px", borderRadius: 99 }}>
                      {item.required ? "必須" : "任意"}
                    </span>
                    {!isMobile && (isOpen ? <ChevronUp size={16} color={THEME.textMuted} /> : <ChevronDown size={16} color={THEME.textMuted} />)}
                  </div>
                </div>

                {/* 展開時の編集フォーム */}
                {isOpen && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${THEME.border}` }}>
                    {/* 項目名 */}
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>項目名 *</label>
                      <input
                        style={styles.input}
                        value={item.name}
                        placeholder="例：会社名、備考 など"
                        onChange={e => updateItem(i, { name: e.target.value })}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    </div>

                    {/* 入力形式 */}
                    <div style={{ marginTop: 16 }}>
                      <label style={styles.label}>入力形式</label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {FIELD_TYPES.map(t => (
                          <button
                            key={t.value}
                            onClick={e => { e.stopPropagation(); updateItem(i, { type: t.value }); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 12px" : "8px 14px", borderRadius: 8, border: `1.5px solid ${item.type === t.value ? THEME.primary : THEME.border}`, backgroundColor: item.type === t.value ? "#EEF2FF" : "white", color: item.type === t.value ? THEME.primary : THEME.textMuted, fontWeight: item.type === t.value ? 700 : 500, fontSize: 13, cursor: "pointer" }}
                          >
                            {t.icon} {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 選択肢（dropdownのみ） */}
                    {item.type === "dropdown" && (
                      <div style={{ marginTop: 16 }}>
                        <label style={styles.label}>選択肢</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {item.options.map((opt, oi) => (
                            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: THEME.textMuted, fontSize: 13, minWidth: 20, textAlign: "center" }}>{oi + 1}.</span>
                              <input
                                style={{ ...styles.input, flex: 1 }}
                                value={opt}
                                placeholder={`選択肢 ${oi + 1}`}
                                onChange={e => updateOption(i, oi, e.target.value)}
                              />
                              <button onClick={() => deleteOption(i, oi)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}>
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addOption(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: `1px dashed ${THEME.border}`, borderRadius: 8, background: "white", color: THEME.textMuted, fontSize: 13, cursor: "pointer", width: "fit-content" }}>
                            <Plus size={14} /> 選択肢を追加
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 必須・削除 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${THEME.border}`, flexWrap: "wrap", gap: 12 }}>
                      <button
                        onClick={() => updateItem(i, { required: !item.required })}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: item.required ? THEME.primary : THEME.textMuted, fontSize: 13, fontWeight: 600, padding: 0 }}
                      >
                        {item.required ? <ToggleRight size={22} color={THEME.primary} /> : <ToggleLeft size={22} color={THEME.textMuted} />}
                        {item.required ? "必須項目" : "任意項目"}
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #FCA5A520", backgroundColor: "#FEF2F2", color: "#EF4444", fontSize: 13, cursor: "pointer" }}
                      >
                        <Trash2 size={14} /> この項目を削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 追加ボタン */}
          <button
            onClick={handleAdd}
            style={{ ...styles.btn, ...styles.btnSecondary, width: "100%", borderStyle: "dashed", marginTop: 8, gap: 8 }}
          >
            <Plus size={16} /> 項目を追加
          </button>
        </div>

        {/* 保存ボタン */}
        {/* 【G2-014改】「同期完了！」は saveFormSettings 成功の直後に立つ（doSave 参照）。
            最新データの再取得は背景で行われるため、待機は保存POSTの間のみ。 */}
        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          style={{ ...styles.btn, ...styles.btnPrimary, width: "100%", marginTop: 40, height: 52, fontSize: 15, opacity: (saving || isLoading) ? 0.7 : 1, cursor: (saving || isLoading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {isLoading
            ? "読み込み中..."
            : saved
              ? <><CheckCircle2 size={18} /> 同期完了！</>
              : saving
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> 同期中...</>
                : "データに同期して保存"
          }
        </button>

        {saving && (
          <p style={{ marginTop: 12, fontSize: 12, color: THEME.textMuted, textAlign: "center", lineHeight: 1.7 }}>
            保存内容をサーバーへ反映しています（通常は数秒で完了します）。<br />
            完了後、最新データの再取得は自動的に背景で行われます。
          </p>
        )}
      </div>
    </Page>
  );
}