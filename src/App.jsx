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
import CustomerEdit          from "./pages/CustomerEdit";
import CustomerSchedule      from "./pages/CustomerSchedule";
import DirectSms             from "./pages/DirectSms";
import FormSettings          from "./pages/FormSettings";
import GmailSettings         from "./pages/GmailSettings";
import ImportErrorList       from "./pages/ImportErrorList";
import ResponseImportPortal  from "./pages/ResponseImportPortal";
import UserForm              from "./pages/UserForm";

// ==========================================
// 🚀 App - 認証 & ルーティング
// ==========================================
function App() {
  const [d, setD] = useState({
    customers: [],
    scenarios: [],
    formSettings: [],
    displaySettings: [],
    deliveryLogs: [],
    templates: [],
    gmailSettings: [],
    importErrors: [],
    statuses: [],
    trackingLogs: [],
    scenarioSettings: {},
  });
  const [load, setLoad] = useState(true);
  const [user, setUser] = useState(() => {
    const sUser = localStorage.getItem("sf_user");
    return sUser ? JSON.parse(sUser) : null;
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get(GAS_URL);
      setD(res?.data || {});
    } finally {
      setLoad(false);
    }
  }, [user]);

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
              <Route path="/" element={<CustomerList customers={d?.customers} displaySettings={d?.displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} gasUrl={GAS_URL} companyName={CLIENT_COMPANY_NAME} onRefresh={refresh} />} />
              <Route path="/customers" element={<CustomerList customers={d?.customers} displaySettings={d?.displaySettings} formSettings={d?.formSettings} scenarios={d?.scenarios} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} gasUrl={GAS_URL} companyName={CLIENT_COMPANY_NAME} onRefresh={refresh} />} />
              <Route path="/add" element={<CustomerForm scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} onRefresh={refresh} />} />
              <Route path="/edit/:id" element={<CustomerEdit customers={d?.customers} scenarios={d?.scenarios} formSettings={d?.formSettings} statuses={d?.statuses} masterUrl={MASTER_WHITELIST_API} onRefresh={refresh} />} />
              <Route path="/schedule/:id" element={<CustomerSchedule customers={d?.customers} deliveryLogs={d?.deliveryLogs} onRefresh={refresh} />} />
              <Route path="/detail/:id" element={<CustomerDetail customers={d?.customers} formSettings={d?.formSettings} statuses={d?.statuses} trackingLogs={d?.trackingLogs} masterUrl={MASTER_WHITELIST_API} gasUrl={GAS_URL} companyName={CLIENT_COMPANY_NAME} onRefresh={refresh} />} />
              <Route path="/direct-sms/:id" element={<DirectSms customers={d?.customers} templates={d?.templates} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} currentUserEmail={user?.email} />} />

              {/* 設定 */}
              <Route path="/column-settings" element={<ColumnSettings displaySettings={d?.displaySettings} formSettings={d?.formSettings} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/form-settings" element={<FormSettings formSettings={d?.formSettings} onRefresh={refresh} />} />
              <Route path="/status-settings" element={<StatusSettings statuses={d?.statuses} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* テンプレート・シナリオ */}
              <Route path="/templates" element={<TemplateManager templates={d?.templates} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios" element={<ScenarioList scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} statuses={d?.statuses} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/new" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />
              <Route path="/scenarios/edit/:id" element={<ScenarioForm scenarios={d?.scenarios} onRefresh={refresh} gasUrl={GAS_URL} />} />

              {/* 反響取り込み */}
              <Route path="/response-import" element={<ResponseImportPortal />} />
              <Route path="/gmail-settings" element={<GmailSettings gmailSettings={d?.gmailSettings} scenarios={d?.scenarios} formSettings={d?.formSettings} onRefresh={refresh} />} />
              <Route path="/import-errors" element={<ImportErrorList errors={d?.importErrors} onRefresh={refresh} />} />

              {/* ユーザー管理 */}
              <Route path="/users" element={<UserManager masterUrl={MASTER_WHITELIST_API} companyName={CLIENT_COMPANY_NAME} />} />
              <Route path="/users/add" element={<UserForm masterUrl={MASTER_WHITELIST_API} />} />
              <Route path="/users/edit/:id" element={<UserForm masterUrl={MASTER_WHITELIST_API} />} />

              {/* 分析・トラッキング */}
              <Route path="/analysis" element={<AnalysisReport customers={d?.customers} statuses={d?.statuses} trackingLogs={d?.trackingLogs} masterUrl={MASTER_WHITELIST_API} />} />
              <Route path="/tracking" element={<TrackingDashboard />} />

              {/* カンバン */}
              <Route path="/kanban" element={<KanbanBoard customers={d?.customers} statuses={d?.statuses} scenarios={d?.scenarios} scenarioSettings={d?.scenarioSettings} onRefresh={refresh} masterUrl={MASTER_WHITELIST_API} gasUrl={GAS_URL} companyName={CLIENT_COMPANY_NAME} />} />
            </Routes>
          </main>

        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;