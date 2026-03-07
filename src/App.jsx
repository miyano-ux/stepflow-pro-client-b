import React, { useState, useEffect, useCallback } from "react";
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

// ==========================================
// 🚀 App - 認証 & ルーティング
// ==========================================
function App() {
  const [d, setD] = useState({
    customers: [],
    scenarios: [],
    formSettings: [],
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

  const saveDisplaySettings = useCallback((settings) => {
    const email = JSON.parse(localStorage.getItem("sf_user") || "{}")?.email || "default";
    localStorage.setItem(`sf_display_${email}`, JSON.stringify(settings));
    setDisplaySettings(settings);
  }, []);
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => {
    const sUser = localStorage.getItem("sf_user");
    return sUser ? JSON.parse(sUser) : null;
  });

  // ── スタッフ一覧: App.jsx で一元管理・キャッシュ ──────────────
  // 各コンポーネントが個別に fetch しないよう、ここで取得して props で渡す
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
              onSuccess={(res) => {
                const dec = jwtDecode(res.credential);
                setUser(dec);
                localStorage.setItem("sf_user", JSON.stringify(dec));
              }}
            />
          </GoogleOAuthProvider>
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
              <Route path="/" element={<CustomerList customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} gasUrl={GAS_URL} onRefresh={refresh} />} />
              <Route path="/customers" element={<CustomerList customers={d?.customers} displaySettings={displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} staffList={staffList} scenarioSettings={d?.scenarioSettings} sources={d?.sources} gasUrl={GAS_URL} onRefresh={refresh} />} />
              <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} staffList={staffList} sources={d?.sources} groups={d?.groups} onRefresh={refresh} />} />
              <Route path="/schedule/:id" element={<CustomerSchedule customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
              <Route path="/detail/:id" element={<CustomerDetail customers={d?.customers} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} trackingLogs={d?.trackingLogs} staffList={staffList} groups={d?.groups} statusHistory={d?.statusHistory} gasUrl={GAS_URL} onRefresh={refresh} />} />
              <Route path="/direct-sms/:id" element={<DirectSms customers={d?.customers} templates={d?.templates} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />

              {/* 設定 */}
              <Route path="/column-settings" element={<ColumnSettings displaySettings={displaySettings} formSettings={d?.formSettings} onSaveDisplaySettings={saveDisplaySettings} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} onRefresh={refresh} />} />
              <Route path="/sources" element={<SourceManager sources={d?.sources} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/status-settings" element={<StatusSettings statuses={d?.statuses} scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* テンプレート・シナリオ */}
              <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} statuses={d?.statuses} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* 反響取り込み */}
              <Route path="/response-import" element={<ResponseImportPortal />} />
              <Route path="/gmail-settings" element={<GmailSettings gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} sources={d?.sources} staffList={staffList} groups={d?.groups} onRefresh={refresh} />} />
              <Route path="/import-errors" element={<ImportErrorList errors={d?.importErrors} onRefresh={refresh} />} />

              {/* ユーザー管理 */}
              <Route path="/users" element={<UserManager staffList={staffList} groups={d?.groups} statuses={d?.statuses} onRefreshStaff={refreshStaff} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} companyName={CLIENT_COMPANY_NAME} gasUrl={GAS_URL} />} />
              <Route path="/users/add" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} />} />
              <Route path="/users/edit/:id" element={<UserForm masterUrl={MASTER_WHITELIST_API} onRefreshStaff={refreshStaff} />} />

              {/* 分析・トラッキング */}
              <Route path="/analysis" element={<AnalysisReport customers={d?.customers} statuses={d?.statuses} trackingLogs={d?.trackingLogs} staffList={staffList} />} />
              <Route path="/tracking" element={<TrackingDashboard />} />

              {/* ステータス別リスト */}
              <Route path="/status-list/:type" element={<CustomerStatusList customers={d?.customers} statuses={d?.statuses} staffList={staffList} />} />

              {/* カンバン */}
              <Route path="/kanban" element={<KanbanBoard customers={d?.customers} statuses={d?.statuses} scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} staffList={staffList} onRefresh={refresh} gasUrl={GAS_URL} />} />
            </Routes>
          </main>

        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;