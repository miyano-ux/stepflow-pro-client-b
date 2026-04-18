import React, { useState, useEffect, useCallback } from "react";
import { ToastProvider, useToast } from "./ToastContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import { MessageSquare, Loader2 } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

// ── lib ──────────────────────────────────────────
import { CLIENT_COMPANY_NAME, GAS_URL, MASTER_WHITELIST_API, GOOGLE_CLIENT_ID, THEME } from "./lib/constants";
import { globalStyle, styles } from "./lib/styles";

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
import SourceManager         from "./pages/SourceManager";
import ContractTypeManager   from "./pages/ContractTypeManager";
import MasterSettings        from "./pages/MasterSettings";
import SourceIntegrationIndex  from "./pages/SourceIntegrationIndex";
import SourceIntegrationDetail from "./pages/SourceIntegrationDetail";

// ==========================================
// 🚀 App - 認証 & ルーティング
// ==========================================
function App() {
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

  // displaySettings: ユーザー個別に localStorage で管理
  // キー: sf_display_${user.email} → 同じブラウザでも別ユーザーは別設定
  const getDisplaySettings = useCallback(() => {
    const email = JSON.parse(localStorage.getItem("sf_user") || "{}")?.email || "default";
    try {
      const raw = localStorage.getItem(`sf_display_${email}`);
      return raw ? JSON.parse(raw) : null; // null = 未設定（GASのデフォルトを使う）
    } catch { return null; }
  }, []);

  const [displaySettings, setDisplaySettings] = useState(() => getDisplaySettings() || []);

  const saveDisplaySettings = useCallback(async (settings) => {
    // ① React state とlocalStorageを即時更新（画面の即時反映）
    const email = JSON.parse(localStorage.getItem("sf_user") || "{}")?.email || "default";
    localStorage.setItem(`sf_display_${email}`, JSON.stringify(settings));
    setDisplaySettings(settings);
    // ② GAS（スプレッドシート）にも保存してlocalStorageと常に一致させる
    try {
      await axios.post(
        GAS_URL,
        JSON.stringify({ action: "saveDisplaySettings", settings }),
        { headers: { "Content-Type": "text/plain;charset=utf-8" } }
      );
    } catch (e) {
      console.warn("[saveDisplaySettings] GAS sync failed (localStorage は保存済み):", e);
    }
  }, []);
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => {
    const sUser = localStorage.getItem("sf_user");
    return sUser ? JSON.parse(sUser) : null;
  });

  // ── スタッフ一覧: App.jsx で一元管理・キャッシュ ──────────────
  // 各コンポーネントが個別に fetch しないよう、ここで取得して props で渡す
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
      const res = await axios.get(`${MASTER_WHITELIST_API}?action=list&company=${CLIENT_COMPANY_NAME}&_t=${Date.now()}`);
      const list = res?.data?.users || [];
      setStaffList(list);
      // 次回起動時の初期表示用にキャッシュ（古くても画面は即表示、裏で更新）
      localStorage.setItem("sf_staff_cache", JSON.stringify(list));
    } catch (e) { console.error("スタッフ取得エラー", e); }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [gasRes] = await Promise.all([
        axios.get(GAS_URL),
        refreshStaff(), // GASデータと並列で取得
      ]);
      const data = gasRes?.data || {};
      // statuses をシート行順ではなく order 値でソートして全コンポーネントに渡す
      if (data.statuses) {
        data.statuses = [...data.statuses].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      }
      setD(data);
      // displaySettings はlocalStorageが未設定の場合のみGAS値を初期値として使う
      const local = getDisplaySettings();
      if (!local && data.displaySettings?.length > 0) {
        setDisplaySettings(data.displaySettings);
      }
    } finally {
      setLoad(false);
    }
  }, [user, getDisplaySettings, refreshStaff]);

  // 顧客データのみを高速再取得（カンバン↔顧客リスト間の即時同期用）
  // doGet の全シート読み込み（2〜5秒）と違い、顧客シートだけ読むため高速
  const lightRefresh = useCallback(async () => {
    if (!GAS_URL) return;
    try {
      const res = await axios.post(GAS_URL, JSON.stringify({ action: "getCustomers" }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      });
      const customers = res?.data?.customers;
      if (customers) setD(prev => ({ ...prev, customers }));
    } catch (e) {
      console.warn("[lightRefresh] 失敗 → フルリフレッシュにフォールバック", e);
      refresh();
    }
  }, [refresh]);

  // シナリオの楽観的UI更新（新規追加・編集後にGAS再取得を待たずに即時反映）
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
        // 編集の場合は既存ステップを除去してから追加（新規の場合はそのまま追加）
        ...prev.scenarios.filter(s => s["シナリオID"] !== scenarioID),
        ...newRows,
      ],
    }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── 未ログイン：ログイン画面 ──────────────────
  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: THEME.bg,
        }}
      >
        <style>{globalStyle}</style>
        <div
          style={{
            ...styles.card,
            textAlign: "center",
            width: "400px",
            padding: "48px",
          }}
        >
          <div
            style={{
              backgroundColor: THEME.primary,
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)",
            }}
          >
            <MessageSquare color="white" size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
            StepFlow
          </h1>
          <p style={{ fontSize: 14, color: THEME.textMuted, marginBottom: 40 }}>
            マーケティングSMS・配信管理 [V34.0]
          </p>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <GoogleLogin
              onSuccess={async (res) => {
                const dec = jwtDecode(res.credential);
                const email = dec.email || "";
                // ── 許可リストチェック（会社名×メール） ──────────
                try {
                  const url = `${MASTER_WHITELIST_API}?action=checkAllowUser&email=${encodeURIComponent(email)}&company=${encodeURIComponent(CLIENT_COMPANY_NAME)}`;
                  const check = await axios.get(url);
                  if (!check.data?.allowed) {
                    setAuthError(`${email} はこの環境へのアクセス権がありません。管理者に連絡してください。`);
                    return;
                  }
                } catch (e) {
                  console.error("[checkAllowUser] 通信エラー", e);
                  setAuthError("認証サーバーとの通信に失敗しました。しばらく経ってから再度お試しください。");
                  return;
                }
                // ── 認証OK ─────────────────────────────────────
                setUser(dec);
                localStorage.setItem("sf_user", JSON.stringify(dec));
              }}
              onError={() => setAuthError("Googleログインに失敗しました。再度お試しください。")}
            />
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

  // ── ローディング ──────────────────────────────
  if (load) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: THEME.bg,
        }}
      >
        <Loader2 size={48} className="animate-spin" color={THEME.primary} />
      </div>
    );
  }

  // ── メインレイアウト ──────────────────────────
  return (
    <ToastProvider>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{globalStyle}</style>
      <Router>
        <div style={{ display: "flex", minHeight: "100vh" }}>

          {/* サイドバー（260px 固定） */}
          <Sidebar
            onLogout={() => {
              setUser(null);
              localStorage.removeItem("sf_user");
            }}
          />

          {/* メインコンテンツ */}
          <main
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: THEME.bg,
              minHeight: "100vh",
            }}
          >
            <Routes>
              {/* 顧客管理 */}
              <Route path="/" element={<CustomerList customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} properties={d?.properties} gasUrl={GAS_URL} onRefresh={refresh} onLightRefresh={lightRefresh} />} />
              <Route path="/customers" element={<CustomerList customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} properties={d?.properties} gasUrl={GAS_URL} onRefresh={refresh} onLightRefresh={lightRefresh} />} />
              <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} staffList={staffList} sources={d?.sources} groups={d?.groups} contractTypes={d?.contractTypes} onRefresh={refresh} />} />
              <Route path="/schedule/:id" element={<CustomerSchedule customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
              <Route path="/detail/:id" element={<CustomerDetail customers={d?.customers} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} trackingLogs={d?.trackingLogs} staffList={staffList} groups={d?.groups} statusHistory={d?.statusHistory} properties={d?.properties} scenarios={d?.scenarios} gasUrl={GAS_URL} onRefresh={refresh} />} />
              <Route path="/direct-sms/:id" element={<DirectSms customers={d?.customers} templates={d?.templates} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />

              {/* 設定 */}
              <Route path="/column-settings" element={<ColumnSettings displaySettings={displaySettings} formSettings={d?.formSettings} onSaveDisplaySettings={saveDisplaySettings} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} sheetCustomColumns={d?.sheetCustomColumns || []} onRefresh={refresh} />} />
              <Route path="/sources" element={<SourceManager sources={d?.sources} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/contract-types" element={<ContractTypeManager contractTypes={d?.contractTypes} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/master-settings" element={<MasterSettings statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} scenarios={d?.scenarios} />} />
              <Route path="/status-settings" element={<StatusSettings statuses={d?.statuses} scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* テンプレート・シナリオ */}
              <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} statuses={d?.statuses} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} customers={d?.customers} staffList={staffList} currentUser={user} onRefresh={refresh} onOptimisticAdd={optimisticAddScenario} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} customers={d?.customers} staffList={staffList} currentUser={user} onRefresh={refresh} onOptimisticAdd={optimisticAddScenario} gasUrl={GAS_URL} />} />

              {/* 媒体連携設定 */}
              <Route path="/source-integrations" element={<SourceIntegrationIndex sourceCredsStatus={d?.sourceCredsStatus ?? {}} clientInfo={d?.clientInfo ?? {}} gmailSettings={d?.gmailSettings ?? []} />} />
              <Route path="/source-integrations/:sourceKey" element={<SourceIntegrationDetail sourceIntegrations={d?.sourceIntegrations ?? []} sourceCredsStatus={d?.sourceCredsStatus ?? {}} sourceLoginIds={d?.sourceLoginIds ?? {}} clientInfo={d?.clientInfo ?? {}} scenarios={d?.scenarios} statuses={d?.statuses} sources={d?.sources} staffList={staffList} groups={d?.groups} formSettings={d?.formSettings} fieldMappings={d?.fieldMappings ?? {}} gasUrl={GAS_URL} onRefresh={refresh} />} />

              {/* 反響取り込み */}
              <Route path="/response-import" element={<ResponseImportPortal />} />
              <Route path="/gmail-settings" element={<GmailSettings gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} staffList={staffList} groups={d?.groups} clientInfo={d?.clientInfo ?? {}} onRefresh={refresh} />} />
              <Route path="/import-errors" element={<ImportErrorList errors={d?.importErrors} onRefresh={refresh} />} />

              {/* ユーザー管理 */}
              <Route path="/users" element={<UserManager staffList={staffList} groups={d?.groups} statuses={d?.statuses} onRefreshStaff={refreshStaff} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} companyName={CLIENT_COMPANY_NAME} gasUrl={GAS_URL} />} />
              <Route path="/users/add" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} />} />
              <Route path="/users/edit/:id" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} />} />

              {/* 分析・トラッキング */}
              <Route path="/analysis" element={<ReportIndex />} />
              <Route path="/analysis/sales" element={<AnalysisReport customers={d?.customers} statuses={d?.statuses} trackingLogs={d?.trackingLogs} staffList={staffList} statusHistory={d?.statusHistory} />} />
              <Route path="/analysis/source" element={<SourceReport customers={d?.customers} statuses={d?.statuses} sources={d?.sources} contractTypes={d?.contractTypes} statusHistory={d?.statusHistory} properties={d?.properties} />} />
              <Route path="/analysis/status" element={<StatusAnalysisReport customers={d?.customers} statuses={d?.statuses} sources={d?.sources} />} />
              <Route path="/analysis/lost" element={<LostReport customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />
              <Route path="/tracking" element={<TrackingDashboard />} />

              {/* ステータス別リスト */}
              <Route path="/status-list/:type" element={<CustomerStatusList customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />
              <Route path="/status-list/:type/:name" element={<CustomerStatusList customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />

              {/* カンバン */}
              <Route path="/kanban" element={<KanbanBoard customers={d?.customers} statuses={d?.statuses} scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} staffList={staffList} properties={d?.properties} onRefresh={refresh} onLightRefresh={lightRefresh} gasUrl={GAS_URL} sources={d?.sources} contractTypes={d?.contractTypes} />} />
            </Routes>
          </main>

        </div>
      </Router>
    </GoogleOAuthProvider>
    </ToastProvider>
  );
}

export default App;