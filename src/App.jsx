import React, { useState, useEffect, useCallback, useRef } from "react";
import { ToastProvider, useToast } from "./ToastContext";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

// ── lib ──────────────────────────────────────────
import { CLIENT_COMPANY_NAME, GAS_URL, MASTER_WHITELIST_API, GOOGLE_CLIENT_ID, THEME } from "./lib/constants";
import { globalStyle, styles } from "./lib/styles";
import { apiCall } from "./lib/utils";
import { fromColumnar } from "./lib/columnar";   // 【高速化 B】列指向 → オブジェクト配列
import { appCache } from "./lib/appCache";       // 【高速化 E】IndexedDB stale-while-revalidate
import { prefetchReports, invalidateReports } from "./lib/reportCache";   // 【レポート高速化】

// ── components ───────────────────────────────────
import Sidebar from "./components/Sidebar";

// ── pages (既存) ──────────────────────────────────
import TrackingDashboard  from "./pages/TrackingDashboard";
import AnalysisReport     from "./pages/AnalysisReport.jsx";
import ReportIndex        from "./pages/ReportIndex.jsx";
import SourceReport            from "./pages/SourceReport.jsx";
import StatusAnalysisReport    from "./pages/StatusAnalysisReport.jsx";
import LostReport         from "./pages/LostReport.jsx";
import UserManager        from "./pages/UserManager.jsx";
import KanbanBoard        from "./pages/KanbanBoard.jsx";
import StatusSettings     from "./pages/StatusSettings.jsx";
import CustomerList       from "./pages/CustomerList.jsx";
import ColumnSettings     from "./pages/ColumnSettings.jsx";
import CustomerDetail     from "./pages/CustomerDetail.jsx";
import TemplateManager    from "./pages/TemplateManager.jsx";
import ScenarioList       from "./pages/ScenarioList.jsx";
import ScenarioForm       from "./pages/ScenarioForm.jsx";

// ── pages (今回移管) ──────────────────────────────
import CustomerForm          from "./pages/CustomerForm";
import CustomerSchedule      from "./pages/CustomerSchedule";
import DirectSms             from "./pages/DirectSms";
import FormSettings          from "./pages/FormSettings";
import GmailSettings         from "./pages/GmailSettings";
import ImportErrorList       from "./pages/ImportErrorList";
import ResponseImportPortal  from "./pages/ResponseImportPortal";
import CustomerStatusList    from "./pages/CustomerStatusList";
import UserForm              from "./pages/UserForm";
import TemplateSelect        from "./pages/TemplateSelect.jsx";
import SourceManager         from "./pages/SourceManager";
import ContractTypeManager   from "./pages/ContractTypeManager";
import MasterSettings        from "./pages/MasterSettings";
import SourceIntegrationIndex  from "./pages/SourceIntegrationIndex";
import SourceIntegrationDetail from "./pages/SourceIntegrationDetail";
import SmsUsageReport          from "./pages/SmsUsageReport";

// ── pages (公開ページ) ────────────────────────────
import PublicMemberPage       from "./pages/PublicMemberPage.jsx";
import { useWindowWidth } from "./lib/useWindowWidth";

// ==========================================
// 🚀 App - 認証 & ルーティング
// ==========================================
function App() {
  const { isMobile } = useWindowWidth();

  // ── 公開メンバーページ ───────────────────────────
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/m/")) {
    return (
      <Router>
        <Routes>
          <Route path="/m/:slug" element={<PublicMemberPage />} />
        </Routes>
      </Router>
    );
  }

  const [d, setD] = useState({
    customers: [],
    scenarios: [],
    formSettings: [],
    sheetCustomColumns: [],
    deliveryLogs: [],
    templates: [],
    gmailSettings: [],
    importErrors: [],
    statuses: [],
    trackingLogs: [],
    scenarioSettings: { wonScenarioId: "", dormantScenarioId: "" },
    sources: [],
    groups: [],
    statusHistory: [],
    contractTypes: [],
    properties: [],
  });

  const getUserEmail = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem("sf_user") || "{}")?.email || "default";
    } catch { return "default"; }
  }, []);

  const getDisplaySettings = useCallback(() => {
    try {
      const raw = localStorage.getItem(`sf_display_${getUserEmail()}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [getUserEmail]);

  const [displaySettings, setDisplaySettings] = useState(() => getDisplaySettings() || []);

  // 表示列設定の保存
  // ※ GAS（スプレッドシート）を先に確定させ、失敗は呼び出し元へ throw する。
  //    以前は生の axios.post + catch=console.warn だったため、GAS が HTTP 200 で
  //    {status:"error"} を返しても（未知アクション/一時URL404など）成功扱いになり、
  //    localStorage にしか残らない状態を検知できなかった。
  //    他画面と同じ apiCall.post（utils.js）に統一し status!=="success" を例外化する。
  const saveDisplaySettings = useCallback(async (settings) => {
    const email = getUserEmail();
    await apiCall.post(GAS_URL, { action: "saveDisplaySettings", email, settings });
    localStorage.setItem(`sf_display_${email}`, JSON.stringify(settings));
    setDisplaySettings(settings);
  }, [getUserEmail]);

  const [load, setLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // 【高速化 E】最終更新時刻 / 前回データ表示中フラグ
  const [lastUpdated, setLastUpdated] = useState(null);
  // 【乖離自己修復】refresh 全試行失敗後の自動再試行タイマーと、
  // setTimeout から常に最新の refresh を呼ぶための参照（下で毎レンダー更新）
  const refreshRetryTimer = useRef(null);
  const refreshFnRef      = useRef(null);
  const [fromCache,   setFromCache]   = useState(false);
  const [user, setUser] = useState(() => {
    const sUser = localStorage.getItem("sf_user");
    return sUser ? JSON.parse(sUser) : null;
  });
  const userRef = useRef(
    (() => { try { return JSON.parse(localStorage.getItem("sf_user")); } catch { return null; } })()
  );

  const [authError, setAuthError] = useState("");
  const [staffList, setStaffList] = useState(() => {
    try {
      const raw = localStorage.getItem("sf_staff_cache");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const refreshStaff = useCallback(async () => {
    if (!MASTER_WHITELIST_API || !CLIENT_COMPANY_NAME) return;
    try {
      const res = await axios.get(`${MASTER_WHITELIST_API}?action=list&company=${CLIENT_COMPANY_NAME}&_t=${Date.now()}`, { timeout: 15000 });   // 【ストール対策】
      const list = res?.data?.users || [];
      setStaffList(list);
      localStorage.setItem("sf_staff_cache", JSON.stringify(list));
    } catch (e) { console.error("スタッフ取得エラー", e); }
  }, []);

  const refresh = useCallback(async () => {
    if (!userRef.current) return;
    // doGet(getAppData) も GAS の 302 → script.googleusercontent.com/.../echo の
    // 一時URLが 404（「ページが見つかりません」HTML）を返すことがある。1万件で ~669kB と
    // 大きく当たりやすいので、数回リトライしてから初めてエラー画面に落とす。
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const [gasRes] = await Promise.all([
          // 【ストール対策】timeout 無指定（＝無制限）だと、一時URLが応答を
          // 返さないまま接続を保持した場合に await が永遠に終わらない。
          // FormSettings 等の保存処理は保存後に await refresh() でここを待つため、
          // ストールすると保存スピナーが止まらなくなる。~669kB の大きな応答と
          // GAS 側の集計時間を考慮して90秒で打ち切り、既存のリトライ（最大3回）
          // → loadError 確定の経路に乗せる。refresh は例外を内部で握って必ず
          // 返る設計なので、これで保存スピナーも必ず終了する。
          axios.get(`${GAS_URL}?_t=${Date.now()}&email=${encodeURIComponent(getUserEmail())}`, { timeout: 90000 }),
          attempt === 1 ? refreshStaff() : Promise.resolve(),
        ]);
        const data = gasRes?.data;
        // 一時URLの404はHTML文字列で返るため、JSONオブジェクトでなければ失敗扱いにしてリトライ
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("GASレスポンスが想定形式(JSON)ではありません");
        }
        // 【E3-014】HTTP 200 で JSON が返っても、必須キーを欠く退行レスポンスは失敗として
        //   リトライへ回す。これを素通しすると sources/customers が undefined の d で
        //   各画面が「まだ登録されていません」等の空状態を誤表示するうえ、下の
        //   appCache.set で壊れたデータが IndexedDB に固定化され、リロード後も
        //   空表示が続く（実データはスプレッドシート上に健在のまま）。
        // 【A2-026/E3-014残穴】scenarios / groups もチェック対象に追加。
        //   これらのキーを欠く退行レスポンスが素通りすると、/scenarios が
        //   「シナリオがありません」、/add の担当者プルダウンからグループが
        //   消える等の空誤表示になり、appCache 経由で固定化される。
        // 【D1-004/D1-006】clientInfo / sourceCredsStatus / sourceIntegrations /
        //   fieldMappings もチェック対象に追加。これらを欠く退行レスポンスが
        //   素通りすると、媒体連携の転送先アドレスが「取得できません」表示のまま
        //   appCache（IndexedDB）に固定化され、以後のリロードでも成功した
        //   refresh が上書きするまでエラー表示が再現し続けていた。
        //   ※ 前提: GAS（gas_updated.js getAppData）がこれらのキーを返す版で
        //     あること。旧版GASに対しては常時リトライ失敗になるため、
        //     本変更はGASと同時にデプロイすること。
        if (!("customers" in data) || !("sources" in data) || !("statuses" in data)
            || !("formSettings" in data) || !("gmailSettings" in data)
            || !("scenarios" in data) || !("groups" in data)
            || !("clientInfo" in data) || !("sourceCredsStatus" in data)
            || !("sourceIntegrations" in data) || !("fieldMappings" in data)) {
          throw new Error("GASレスポンスに必須キー(customers/sources/statuses/formSettings/gmailSettings/scenarios/groups/clientInfo/sourceCredsStatus/sourceIntegrations/fieldMappings)がありません");
        }
        // 【高速化 B】列指向 {headers, rows} を受信直後に復元（以降のコンポーネントは無改修）
        //   getCustomers（lightRefresh）や旧GASの配列形もそのまま通る
        data.customers  = fromColumnar(data.customers,  { idFrom: "顧客ID" });
        data.properties = fromColumnar(data.properties);
        if (data.statuses) {
          data.statuses = [...data.statuses].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        }
        setD(data);
        setLoadError(false);
        // 【乖離自己修復】成功したので予約済みの自動再試行を解除
        if (refreshRetryTimer.current) { clearTimeout(refreshRetryTimer.current); refreshRetryTimer.current = null; }
        // 【高速化 E】復元済みの d を次回起動用に保存（ユーザー単位キー）
        setLastUpdated(Date.now());
        setFromCache(false);
        appCache.set(getUserEmail(), data);
        // 【レポート高速化】初回データ確定後、アイドル時にレポート集計を温める（失敗は無視）
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
        idle(() => prefetchReports());
        // 別PC/別ブラウザからの復元：localStorage に無ければ GAS の設定を採用し、
        // 以後は即時反映できるよう localStorage にも書き戻す
        const local = getDisplaySettings();
        if (!local && data.displaySettings?.length > 0) {
          setDisplaySettings(data.displaySettings);
          try {
            localStorage.setItem(`sf_display_${getUserEmail()}`, JSON.stringify(data.displaySettings));
          } catch (err) {
            console.warn("[refresh] displaySettings の localStorage 書き戻しに失敗", err);
          }
        }
        setLoad(false);
        return;
      } catch (e) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 500 * attempt)); // 0.5s, 1.0s の指数バックオフ
          continue;
        }
        console.error("[refresh] データ取得に失敗しました（リトライ上限）", e);
        setLoadError(true);
        setLoad(false);
        // 【乖離自己修復】失敗をここで打ち切ると、IndexedDB の旧データが描画された
        // まま次のリロードまで最新化の機会が無く、サーバー（スプレッドシート）と
        // 画面の表記が乖離し続ける。20秒後に自動で再試行を予約し、回復し次第
        // d とキャッシュを最新化して乖離を自己修復する（成功時に予約は解除される。
        // ログアウト時は userRef ガードで自然に停止する）。
        if (refreshRetryTimer.current) clearTimeout(refreshRetryTimer.current);
        refreshRetryTimer.current = setTimeout(() => {
          refreshRetryTimer.current = null;
          if (userRef.current) refreshFnRef.current?.();
        }, 20000);
      }
    }
  }, [getDisplaySettings, getUserEmail, refreshStaff]);
  refreshFnRef.current = refresh;   // 【乖離自己修復】setTimeout から最新版を呼ぶための同期

  // 【G2-016】登録項目 保存直後の楽観反映。
  // saveFormSettings が成功した時点で settings はサーバー確定値なので、
  // 全件再取得（refresh: 数秒〜十数秒）の完了を待たずに、d.formSettings と
  // IndexedDB キャッシュへ直接反映する。これにより保存→/add 遷移直後の
  // 新規登録フォームや顧客一覧・詳細が旧名称のまま表示される時間差が消える。
  // renames（旧名→新名）が渡された場合は、GAS 側の migrate と同等の
  // キー付け替えをローカルの顧客データにも適用し、詳細画面の入力値が
  // 「新名称なのに空欄」になる不整合も防ぐ。裏で走る refresh が完了すれば
  // 同内容のサーバー値で上書きされ、最終的な整合はサーバーが担保する。
  const applyFormSettings = useCallback((settings, renames) => {
    setD(prev => {
      if (!prev) return prev;
      let customers = prev.customers;
      if (Array.isArray(renames) && renames.length && Array.isArray(customers)) {
        customers = customers.map(c => {
          let changed = false;
          const nc = { ...c };
          for (const { from, to } of renames) {
            if (from && to && from !== to && Object.prototype.hasOwnProperty.call(nc, from)) {
              nc[to] = nc[from];
              delete nc[from];
              changed = true;
            }
          }
          return changed ? nc : c;
        });
      }
      const next = { ...prev, formSettings: settings, customers };
      // リロード耐性: 楽観反映をIndexedDBにも書く（保存直後にリロードされても
      // 旧名称に戻らない）。put は冪等なので StrictMode 等で二重実行されても無害。
      appCache.set(getUserEmail(), next);
      return next;
    });
  }, [getUserEmail]);

  const lightRefresh = useCallback(async () => {
    if (!GAS_URL) return;
    try {
      const res = await axios.post(GAS_URL, JSON.stringify({ action: "getCustomers" }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        timeout: 60000,   // 【ストール対策】refresh と同趣旨（無応答ストールでの無限待機を防ぐ）
      });
      const customers = res?.data?.customers;
      if (customers) setD(prev => ({ ...prev, customers }));
    } catch (e) {
      console.warn("[lightRefresh] 失敗", e);
    }
  }, [refresh]);

  const optimisticAddScenario = useCallback((scenarioID, steps) => {
    const newRows = steps.map((step, i) => ({
      シナリオID:  scenarioID,
      ステップ数:  i + 1,
      経過日数:    step.elapsedDays,
      配信時間:    step.deliveryHour,
      配信分:      step.deliveryMinute ?? 0,
      message:     step.message,
    }));
    setD(prev => ({
      ...prev,
      scenarios: [
        ...prev.scenarios.filter(s => s["シナリオID"] !== scenarioID),
        ...newRows,
      ],
    }));
  }, []);

  // 【高速化 E】起動時: IndexedDB の前回データがあれば即描画 → 裏で refresh()
  //   ログイン直後（user.email が入った時）もこの effect が拾う
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      // 【F1-012 / H-005】起動時に許可リストを再照合し、削除済みユーザーの
      //   既存セッション（localStorage の sf_user）を失効させる。
      //   ・allowed === false の明示的な拒否のみ失効させる
      //   ・照合サーバー不達・応答不正時は可用性を優先して従来どおり継続する
      //   ・タブを開いたまま（再読込なし）のセッションまでは失効できない点は
      //     既知の限界（完全な失効はGAS側のリクエスト毎認証が必要）
      try {
        const url = `${MASTER_WHITELIST_API}?action=checkAllowUser&email=${encodeURIComponent(user.email)}&company=${encodeURIComponent(CLIENT_COMPANY_NAME)}&_t=${Date.now()}`;
        // 【ストール対策】この await の先に前回データ描画（appCache.get→setD）があるため、
        // ここが無応答ストールすると起動画面のまま固まる。15秒で打ち切れば既存 catch が
        // 「可用性優先で継続」してくれる。
        const check = await axios.get(url, { timeout: 15000 });
        if (check?.data?.allowed === false) {
          if (!cancelled) {
            localStorage.removeItem("sf_user");
            userRef.current = null;
            setUser(null);
            setAuthError(`${user.email} はこの環境へのアクセス権がありません。管理者に連絡してください。`);
          }
          return;
        }
      } catch (e) {
        console.warn("[boot] 許可リスト再照合に失敗（継続します）", e);
      }
      if (cancelled) return;
      const hit = await appCache.get(user.email);
      if (!cancelled && hit?.d) {
        setD(hit.d);
        setLastUpdated(hit.savedAt);
        setFromCache(true);
        setLoad(false);
      }
      refresh();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // ── 未ログイン：ログイン画面 ──────────────────
  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg }}>
        <style>{globalStyle}</style>
        <div style={{ ...styles.card, textAlign: "center", width: "400px", padding: "48px" }}>
          <div style={{ margin: "0 auto 40px", display: "flex", justifyContent: "center" }}>
            <img src="/logo_beta.png" alt="SMOOSy" style={{ height: "80px", width: "auto", objectFit: "contain" }} />
          </div>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <GoogleLogin
                onSuccess={async (res) => {
                  const dec = jwtDecode(res.credential);
                  const email = dec.email || "";
                  try {
                    const url = `${MASTER_WHITELIST_API}?action=checkAllowUser&email=${encodeURIComponent(email)}&company=${encodeURIComponent(CLIENT_COMPANY_NAME)}`;
                    const check = await axios.get(url, { timeout: 15000 });   // 【ストール対策】無応答時にログインが固まるのを防ぐ
                    if (!check.data?.allowed) {
                      setAuthError(`${email} はこの環境へのアクセス権がありません。管理者に連絡してください。`);
                      return;
                    }
                  } catch (e) {
                    console.error("[checkAllowUser] 通信エラー", e);
                    setAuthError("認証サーバーとの通信に失敗しました。しばらく経ってから再度お試しください。");
                    return;
                  }
                  userRef.current = dec;
                  setUser(dec);
                  localStorage.setItem("sf_user", JSON.stringify(dec));
                  // refresh() は user.email を監視する起動 effect（高速化 E）が実行する
                }}
                onError={() => setAuthError("Googleログインに失敗しました。再度お試しください。")}
              />
            </div>
          </GoogleOAuthProvider>
          {authError && (
            <div style={{ marginTop: 16, padding: "12px 16px", backgroundColor: "#FEE2E2", borderRadius: 10, fontSize: 13, color: "#991B1B", fontWeight: 600, lineHeight: 1.6 }}>
              {authError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── GAS 接続エラー画面 ────────────────────────
  // 【高速化 E】前回データを表示できている場合はエラー画面に落とさない（バッジで「最新化に失敗」を表示）
  if (loadError && !fromCache) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: THEME.bg, padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%", backgroundColor: "white", borderRadius: 16, padding: "40px 32px", textAlign: "center", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <AlertTriangle size={30} color="#D97706" />
          </div>
          <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 900, color: THEME.textMain }}>サーバーに接続できません</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: THEME.textMuted, lineHeight: 1.7 }}>
            データの取得に失敗しました。インターネット接続をご確認のうえ、再読み込みをお試しください。改善しない場合は、サーバー（GAS）のデプロイ設定が原因の可能性があります。
          </p>
          <button
            onClick={() => { setLoad(true); setLoadError(false); refresh(); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: THEME.primary, color: "white", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
          >
            <RefreshCw size={16} /> 再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ── メインレイアウト ──────────────────────────
  // ※ load=true の間も描画を継続し、CustomerList の isLoading={load} で
  //   Skeleton アニメーションを表示する（if(load) return は削除済み）
  return (
    <ToastProvider>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{globalStyle}</style>
      <Router>
        <div translate="no" className="notranslate" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>

          {/* サイドバー */}
          <Sidebar
            userEmail={user?.email || ""}   // 【H-008】ログイン中アカウントの表示用
            onLogout={() => {
              appCache.del(user?.email);   // 【高速化 E】前回データ破棄
              invalidateReports();         // 【レポート高速化】メモリキャッシュ破棄
              setUser(null);
              localStorage.removeItem("sf_user");
              // 【H-006】共用端末対策：ユーザー共通キーのスタッフ一覧キャッシュ
              //   （氏名・メール・電話を含む）を残さない。次ログイン時は
              //   起動時の refreshStaff が再取得する。
              //   ※ sf_display_{email} はユーザー別キーで混在しない設計（G5-008）のため残置。
              localStorage.removeItem("sf_staff_cache");
            }}
          />

          {/* 【高速化 E】最終更新バッジ */}
          {/* 【乖離自己修復】失敗時はバッジを操作可能にし、自動再試行（20秒毎）を
              待たずにタップで即時再試行できるようにする。従来は pointerEvents:none の
              小さな「・最新化に失敗」だけで、失敗に気づけず古い表示を信じてしまっていた。 */}
          {lastUpdated && (
            <div
              onClick={loadError ? () => refresh() : undefined}
              title={loadError ? "タップで最新データを再取得します" : undefined}
              style={{ position: "fixed", right: 12, bottom: 8, zIndex: 50, fontSize: 11,
                       color: loadError ? "#B91C1C" : THEME.textMuted,
                       background: loadError ? "#FEF2F2" : "rgba(255,255,255,.9)",
                       border: loadError ? "1px solid #FECACA" : "none",
                       padding: "2px 8px", borderRadius: 6,
                       pointerEvents: loadError ? "auto" : "none",
                       cursor: loadError ? "pointer" : "default" }}>
              最終更新 {new Date(lastUpdated).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              {fromCache && !loadError && "（更新中…）"}
              {loadError && "・最新化に失敗（タップで再試行）"}
            </div>
          )}

          {/* メインコンテンツ */}
          <AnimatedMain isMobile={isMobile}>
            <Routes>
              {/* 顧客管理 */}
              {/* 【G5-002】contractTypes を伝播（契約種別列の検索プルダウン用） */}
              <Route path="/" element={<CustomerList isLoading={load} customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} properties={d?.properties} contractTypes={d?.contractTypes} gasUrl={GAS_URL} onRefresh={refresh} onLightRefresh={lightRefresh} />} />
              <Route path="/customers" element={<CustomerList isLoading={load} customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} properties={d?.properties} contractTypes={d?.contractTypes} gasUrl={GAS_URL} onRefresh={refresh} onLightRefresh={lightRefresh} />} />
              <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} staffList={staffList} sources={d?.sources} groups={d?.groups} contractTypes={d?.contractTypes} onRefresh={refresh} isLoading={load} />} />
              <Route path="/schedule/:id" element={<CustomerSchedule isLoading={load} customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
              <Route path="/detail/:id" element={<CustomerDetail isLoading={load} customers={d?.customers} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} trackingLogs={d?.trackingLogs} staffList={staffList} groups={d?.groups} statusHistory={d?.statusHistory} properties={d?.properties} scenarios={d?.scenarios} gasUrl={GAS_URL} onRefresh={refresh} onLightRefresh={lightRefresh} />} />
              <Route path="/direct-sms/:id" element={<DirectSms isLoading={load} customers={d?.customers} templates={d?.templates} staffList={staffList} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />

              {/* 設定 */}
              <Route path="/column-settings" element={<ColumnSettings displaySettings={displaySettings} formSettings={d?.formSettings} onSaveDisplaySettings={saveDisplaySettings} onRefresh={refresh} gasUrl={GAS_URL} />} />
              {/* 【G2-014】isLoading / customers 未伝播だと FormSettings 側の安全装置が無効化される。
                  ・isLoading: 取得完了前に保存すると items=[] のまま saveFormSettings が飛び、
                    GAS が顧客シートのカスタム列ごと削除する（FormSettings.jsx handleSave のガード）。
                  ・customers: 削除確認モーダルの「入力済み N 件」が常に 0 件表示になる。 */}
              <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} sheetCustomColumns={d?.sheetCustomColumns || []} customers={d?.customers} isLoading={load} loadError={loadError} onRefresh={refresh} onApplySaved={applyFormSettings} />} />
              <Route path="/sources" element={<SourceManager sources={d?.sources} onRefresh={refresh} gasUrl={GAS_URL} isLoading={load} loadError={loadError} />} />
              {/* 【G4-012】customers を伝播（改名マイグレーションの影響件数提示用。G2-014 と同方針） */}
              <Route path="/contract-types" element={<ContractTypeManager contractTypes={d?.contractTypes} exclusiveContractTypes={d?.exclusiveContractTypes} customers={d?.customers} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/master-settings" element={<MasterSettings isLoading={load} statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} scenarios={d?.scenarios} />} />
              <Route path="/status-settings" element={<StatusSettings statuses={d?.statuses} scenarios={d?.scenarios} customers={d?.customers} isLoading={load} loadError={loadError} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* テンプレート・シナリオ */}
              <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} statuses={d?.statuses} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} customers={d?.customers} staffList={staffList} templates={d?.templates} formSettings={d?.formSettings} currentUser={user} onRefresh={refresh} onOptimisticAdd={optimisticAddScenario} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} customers={d?.customers} staffList={staffList} templates={d?.templates} formSettings={d?.formSettings} currentUser={user} onRefresh={refresh} onOptimisticAdd={optimisticAddScenario} gasUrl={GAS_URL} />} />

              {/* 媒体連携設定 */}
              <Route path="/source-integrations" element={<SourceIntegrationIndex sourceCredsStatus={d?.sourceCredsStatus ?? {}} clientInfo={d?.clientInfo ?? {}} gmailSettings={d?.gmailSettings ?? []} />} />
              <Route path="/source-integrations/:sourceKey" element={<SourceIntegrationDetail sourceIntegrations={d?.sourceIntegrations ?? []} sourceCredsStatus={d?.sourceCredsStatus ?? {}} sourceLoginIds={d?.sourceLoginIds ?? {}} clientInfo={d?.clientInfo ?? {}} scenarios={d?.scenarios} statuses={d?.statuses} sources={d?.sources} staffList={staffList} groups={d?.groups} formSettings={d?.formSettings} fieldMappings={d?.fieldMappings ?? {}} gasUrl={GAS_URL} onRefresh={refresh} />} />

              {/* 反響取り込み */}
              <Route path="/response-import" element={<ResponseImportPortal />} />
              <Route path="/gmail-settings" element={<GmailSettings isLoading={load} gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} staffList={staffList} groups={d?.groups} clientInfo={d?.clientInfo ?? {}} onRefresh={refresh} />} />
              <Route path="/import-errors" element={<ImportErrorList errors={d?.importErrors} onRefresh={refresh} />} />

              {/* 管理（ユーザー / SMS配信） */}
              <Route path="/users" element={<UserManager staffList={staffList} groups={d?.groups} statuses={d?.statuses} onRefreshStaff={refreshStaff} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} companyName={CLIENT_COMPANY_NAME} gasUrl={GAS_URL} />} />
              <Route path="/users/add" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} staffList={staffList} />} />
              <Route path="/users/template-select" element={<TemplateSelect />} />
              <Route path="/users/edit/:id" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} />} />
              <Route path="/sms-usage" element={<SmsUsageReport isLoading={load} deliveryLogs={d?.deliveryLogs} customers={d?.customers} />} />

              {/* 分析・トラッキング */}
              <Route path="/analysis" element={<ReportIndex />} />
              <Route path="/analysis/sales" element={<AnalysisReport customers={d?.customers} statuses={d?.statuses} trackingLogs={d?.trackingLogs} staffList={staffList} statusHistory={d?.statusHistory} />} />
              <Route path="/analysis/source" element={<SourceReport isLoading={load} loadError={loadError} customers={d?.customers} statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} exclusiveContractTypes={d?.exclusiveContractTypes} statusHistory={d?.statusHistory} properties={d?.properties} />} />
              <Route path="/analysis/status" element={<StatusAnalysisReport customers={d?.customers} statuses={d?.statuses} sources={d?.sources} staffList={staffList} />} />
              {/* 【E5-012】LostReport.jsx:98-106 のローディング表示は isLoading 前提。
                  未伝播だと取得中に「失注データがありません」＋失注率「–」を誤表示する。
                  SourceReport（同ファイル 347行）と同方針で load を渡す。 */}
              <Route path="/analysis/lost" element={<LostReport isLoading={load} customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />
              <Route path="/tracking" element={<TrackingDashboard />} />

              {/* ステータス別リスト */}
              <Route path="/status-list/:type" element={<CustomerStatusList isLoading={load} customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />
              <Route path="/status-list/:type/:name" element={<CustomerStatusList isLoading={load} customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />

              {/* カンバン */}
              <Route path="/kanban" element={<KanbanBoard customers={d?.customers} statuses={d?.statuses} scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} staffList={staffList} properties={d?.properties} onRefresh={refresh} onLightRefresh={lightRefresh} gasUrl={GAS_URL} sources={d?.sources} contractTypes={d?.contractTypes} />} />
            </Routes>
          </AnimatedMain>

        </div>
      </Router>
    </GoogleOAuthProvider>
    </ToastProvider>
  );
}

// ── ページ遷移アニメーション用コンポーネント ──────────
// useLocation は <Router> の内側でのみ使用可能なため、
// main を切り出して pathname が変わるたびに key を更新する。
function AnimatedMain({ isMobile, children }) {
  const location = useLocation();
  return (
    <main
      key={location.pathname}
      style={{
        flex: 1,
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: THEME.bg,
        minHeight: "100vh",
        paddingTop: isMobile ? "56px" : 0,
        animation: "fadeSlideIn 0.25s ease-out",
      }}
    >
      {children}
    </main>
  );
}

export default App;