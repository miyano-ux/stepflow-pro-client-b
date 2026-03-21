import React, { useState } from "react";
import {
  CheckCircle2, XCircle, RefreshCw, Play, Eye, EyeOff,
  AlertCircle, Loader2, Copy, ChevronDown, ChevronUp, Mail
} from "lucide-react";
import { THEME, GAS_URL } from "../lib/constants";
import { styles } from "../lib/styles";
import { apiCall } from "../lib/utils";
import Page from "../components/Page";
import CustomSelect from "../components/CustomSelect";

const SUPPORTED_SOURCES = [
  {
    key: "sumai_step", name: "すまいステップ",
    description: "不動産査定サイト「すまいステップ」からの反響を自動取り込みします",
    icon: "🏠", color: "#0EA5E9", bgColor: "#F0F9FF", borderColor: "#BAE6FD",
    needsLogin: true, loginLabel: "パートナーサイトのログインID（メールアドレス）",
    status: "available",
  },
  {
    key: "lifull_homes", name: "LIFULL HOME'S",
    description: "LIFULL HOME'Sからの問い合わせを自動取り込みします",
    icon: "🏢", color: "#F97316", bgColor: "#FFF7ED", borderColor: "#FED7AA",
    needsLogin: true, loginLabel: "パートナーサイトのログインID",
    status: "coming_soon",
  },
  {
    key: "suumo", name: "SUUMO",
    description: "SUUMOからの問い合わせを自動取り込みします",
    icon: "🔑", color: "#22C55E", bgColor: "#F0FDF4", borderColor: "#BBF7D0",
    needsLogin: false, status: "coming_soon",
  },
];

const Label = ({ children, required }) => (
  <span style={{ fontSize: 11, fontWeight: 800, color: THEME.textMuted, display: "block", marginBottom: 6 }}>
    {children}{required && <span style={{ color: THEME.danger, marginLeft: 3 }}>*</span>}
  </span>
);
const FieldBox = ({ children }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
);
const StatusBadge = ({ connected }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
    backgroundColor: connected ? "#DCFCE7" : "#FEE2E2",
    color: connected ? "#16A34A" : "#DC2626",
  }}>
    {connected ? <><CheckCircle2 size={13} />認証済み</> : <><XCircle size={13} />未設定</>}
  </span>
);

function ForwardingBanner({ clientInfo }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(clientInfo.forwardingAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!clientInfo?.forwardingAddress) {
    return (
      <div style={{
        padding: "16px 20px", marginBottom: 28, backgroundColor: "#FEF9C3",
        borderRadius: 14, border: "1px solid #FEF08A",
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <AlertCircle size={18} color="#CA8A04" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "#92400E" }}>
          <strong>初期設定が必要です。</strong>弊社担当者にご連絡いただくと、転送先メールアドレスを発行します。
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: "20px 24px", marginBottom: 28,
      backgroundColor: "#EEF2FF", borderRadius: 14, border: "1px solid #C7D2FE",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Mail size={16} color={THEME.primary} />
        <span style={{ fontSize: 13, fontWeight: 800, color: THEME.primary }}>
          メール転送先アドレス（Gmailの自動転送に設定してください）
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          flex: 1, padding: "12px 16px", backgroundColor: "white",
          borderRadius: 10, border: `1px solid ${THEME.border}`,
          fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: THEME.textMain,
        }}>
          {clientInfo.forwardingAddress}
        </div>
        <button onClick={handleCopy} style={{
          ...styles.btn,
          backgroundColor: copied ? THEME.success : "white",
          color: copied ? "white" : THEME.textMain,
          border: `1px solid ${THEME.border}`,
          flexShrink: 0, minWidth: 90, transition: "all 0.2s",
        }}>
          {copied ? <><CheckCircle2 size={14} />コピー済</> : <><Copy size={14} />コピー</>}
        </button>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: THEME.textMuted, lineHeight: 1.7 }}>
        <strong style={{ color: THEME.textMain }}>設定手順：</strong>
        Gmailの「設定 → 転送とPOP/IMAP → 転送先アドレスを追加」から、
        各媒体の通知メールをこのアドレスへ転送するよう設定してください。
        設定後、下記の各媒体に認証情報を入力すれば自動取り込みが開始されます。
      </div>
    </div>
  );
}

function SourceCard({ source, isConnected, integration, savedLoginId, scenarios, statuses, sources, staffList, groups, onRefresh }) {
  const isAvailable = source.status === "available";
  const [expanded, setExpanded] = useState(false);
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rule, setRule] = useState({
    source:     integration?.["流入元"]         || source.name,
    status:     integration?.["対応ステータス"] || "",
    staffEmail: integration?.["担当者メール"]   || "",
    scenarioId: integration?.["シナリオID"]     || "",
  });
  const [credSaving, setCredSaving] = useState(false);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [running,    setRunning]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [runResult,  setRunResult]  = useState(null);

  const scenarioIds = [...new Set((scenarios||[]).map(s=>s["シナリオID"]).filter(Boolean))];

  const handleSaveCreds = async () => {
    if (!loginId || !password) return alert("ログインIDとパスワードを入力してください");
    setCredSaving(true); setTestResult(null);
    try {
      await apiCall.post(GAS_URL, { action:"saveSourceCredentials", sourceKey:source.key, loginId, password });
      setLoginId(""); setPassword(""); onRefresh();
    } catch(e) { alert("保存に失敗しました: "+e.message); }
    finally { setCredSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await apiCall.post(GAS_URL, { action:"testSourceLogin", sourceKey:source.key });
      setTestResult({ ok: res.status==="success", msg: res.message });
    } catch(e) { setTestResult({ ok:false, msg:e.message }); }
    finally { setTesting(false); }
  };

  const handleSaveRule = async () => {
    setRuleSaving(true);
    try {
      await apiCall.post(GAS_URL, { action:"saveSourceIntegration", sourceKey:source.key, ...rule });
      onRefresh();
    } catch(e) { alert("保存に失敗しました: "+e.message); }
    finally { setRuleSaving(false); }
  };

  const handleRun = async () => {
    if (!window.confirm(source.name+"の取り込みを今すぐ実行しますか？\n（未登録の反響をすべて取り込みます）")) return;
    setRunning(true); setRunResult(null);
    try {
      const res = await apiCall.post(GAS_URL, { action:"runSourceScraping", sourceKey:source.key });
      setRunResult({
        ok: res.status==="success",
        msg: res.status==="success" ? (res.registered??0)+"件の顧客を登録しました" : res.message,
      });
    } catch(e) { setRunResult({ ok:false, msg:e.message }); }
    finally { setRunning(false); }
  };

  return (
    <div style={{
      backgroundColor:"white", borderRadius:16,
      border:`1px solid ${isAvailable ? source.borderColor : THEME.border}`,
      overflow:"hidden",
      boxShadow: isAvailable ? `0 2px 12px ${source.color}18` : "none",
      opacity: isAvailable ? 1 : 0.55,
    }}>
      <div onClick={() => isAvailable && setExpanded(p=>!p)} style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"18px 24px",
        backgroundColor: isAvailable ? source.bgColor : "#F9FAFB",
        borderBottom:`1px solid ${isAvailable ? source.borderColor : THEME.border}`,
        cursor: isAvailable ? "pointer" : "default",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{
            width:44, height:44, borderRadius:12, flexShrink:0, fontSize:22,
            backgroundColor: isAvailable ? source.color+"20" : "#F3F4F6",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>{source.icon}</div>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15, fontWeight:800, color:THEME.textMain }}>{source.name}</span>
              {!isAvailable && (
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, backgroundColor:"#F3F4F6", color:THEME.textMuted }}>準備中</span>
              )}
            </div>
            <div style={{ fontSize:12, color:THEME.textMuted, marginTop:2 }}>{source.description}</div>
          </div>
        </div>
        {isAvailable && (
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <StatusBadge connected={isConnected} />
            {expanded ? <ChevronUp size={18} color={THEME.textMuted}/> : <ChevronDown size={18} color={THEME.textMuted}/>}
          </div>
        )}
      </div>

      {isAvailable && expanded && (
        <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:24 }}>

          {/* ① 認証設定 */}
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:THEME.textMain, marginBottom:4 }}>① 認証設定</div>
            <div style={{ fontSize:12, color:THEME.textMuted, marginBottom:14 }}>
              {source.name}のパートナーサイトのログイン情報を入力してください。パスワードは暗号化して保存されます。
            </div>
            <div style={{ padding:18, backgroundColor:"#F8FAFC", borderRadius:12, border:`1px solid ${THEME.border}`, display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldBox>
                  <Label required>{source.loginLabel}</Label>
                  <input style={styles.input} value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="例: user@example.com" autoComplete="off" />
                </FieldBox>
                <FieldBox>
                  <Label required>パスワード</Label>
                  <div style={{ position:"relative" }}>
                    <input
                      style={{ ...styles.input, paddingRight:44 }}
                      type={showPass?"text":"password"} value={password}
                      onChange={e=>setPassword(e.target.value)} placeholder="パスワードを入力" autoComplete="new-password"
                    />
                    <button onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:THEME.textMuted, padding:4 }}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </FieldBox>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <button onClick={handleSaveCreds} disabled={credSaving} style={{ ...styles.btn, backgroundColor:source.color, color:"white", boxShadow:`0 4px 14px ${source.color}40`, minWidth:110, opacity:credSaving?0.7:1 }}>
                  {credSaving && <Loader2 size={15} className="animate-spin"/>} 保存する
                </button>
                {isConnected && (
                  <button onClick={handleTest} disabled={testing} style={{ ...styles.btn, ...styles.btnSecondary, minWidth:130 }}>
                    {testing ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>} 接続テスト
                  </button>
                )}
                {testResult && (
                  <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, fontWeight:700, color:testResult.ok?THEME.success:THEME.danger }}>
                    {testResult.ok ? <CheckCircle2 size={15}/> : <XCircle size={15}/>} {testResult.msg}
                  </span>
                )}
              </div>
              {isConnected && (
                <div style={{ fontSize:12, color:"#166534", display:"flex", alignItems:"center", gap:6, padding:"10px 14px", backgroundColor:"#DCFCE7", borderRadius:8 }}>
                  <CheckCircle2 size={13} color={THEME.success}/>
                  <span>
                    保存済みログインID: <strong style={{ fontFamily:"monospace" }}>{savedLoginId || "（取得中）"}</strong>
                    　変更する場合は新しい情報を入力して保存してください。
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ② 取り込みルール */}
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:THEME.textMain, marginBottom:4 }}>② 取り込みルール</div>
            <div style={{ fontSize:12, color:THEME.textMuted, marginBottom:14 }}>この媒体から登録された顧客に自動でセットする値を設定します</div>
            <div style={{ padding:18, backgroundColor:"#EEF2FF", borderRadius:12, border:"1px solid #C7D2FE", display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldBox>
                  <Label>流入元</Label>
                  <CustomSelect value={rule.source} onChange={v=>setRule(r=>({...r,source:v}))} placeholder="未設定"
                    options={[{value:"",label:"未設定"},...(sources||[]).map(s=>({value:s.name,label:s.name}))]} />
                </FieldBox>
                <FieldBox>
                  <Label>対応ステータス</Label>
                  <CustomSelect value={rule.status} onChange={v=>setRule(r=>({...r,status:v}))} placeholder="未設定（デフォルト）"
                    options={[{value:"",label:"未設定（デフォルト）"},...(statuses||[]).map(s=>({value:s.name,label:s.name}))]} />
                </FieldBox>
                <FieldBox>
                  <Label>担当者</Label>
                  <CustomSelect value={rule.staffEmail} onChange={v=>setRule(r=>({...r,staffEmail:v}))} placeholder="未割当"
                    options={[
                      {value:"",label:"未割当"},
                      ...(staffList||[]).map(s=>({value:s.email,label:s.lastName+" "+s.firstName})),
                      ...(groups||[]).map(g=>({value:"group:"+g["グループID"],label:"👥 "+g["グループ名"]+"（登録時に自動選出）"})),
                    ]} />
                </FieldBox>
                <FieldBox>
                  <Label>適用シナリオ</Label>
                  <CustomSelect value={rule.scenarioId} onChange={v=>setRule(r=>({...r,scenarioId:v}))} placeholder="未設定"
                    options={[{value:"",label:"未設定"},...scenarioIds.map(id=>({value:id,label:id}))]} />
                </FieldBox>
              </div>
              <div>
                <button onClick={handleSaveRule} disabled={ruleSaving} style={{ ...styles.btn, ...styles.btnPrimary, minWidth:120, opacity:ruleSaving?0.7:1 }}>
                  {ruleSaving && <Loader2 size={15} className="animate-spin"/>} ルールを保存
                </button>
              </div>
            </div>
          </div>

          {/* ③ 手動実行 */}
          <div style={{ padding:16, backgroundColor:"#FAFAFA", borderRadius:12, border:`1px solid ${THEME.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:THEME.textMain }}>手動で今すぐ取り込む</div>
              <div style={{ fontSize:12, color:THEME.textMuted, marginTop:2 }}>未登録の反響をすべてチェックして取り込みます（通常は自動実行されます）</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
              {runResult && (
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:runResult.ok?THEME.success:THEME.danger }}>
                  {runResult.ok ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {runResult.msg}
                </span>
              )}
              <button onClick={handleRun} disabled={running||!isConnected}
                style={{ ...styles.btn, backgroundColor:isConnected?THEME.textMain:THEME.border, color:"white", minWidth:130, opacity:(running||!isConnected)?0.6:1, cursor:!isConnected?"not-allowed":"pointer" }}>
                {running ? <><Loader2 size={15} className="animate-spin"/>実行中...</> : <><Play size={15}/>今すぐ実行</>}
              </button>
            </div>
          </div>

          {!isConnected && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"12px 16px", backgroundColor:"#FEF9C3", borderRadius:10, border:"1px solid #FEF08A" }}>
              <AlertCircle size={16} color="#CA8A04" style={{ flexShrink:0, marginTop:1 }}/>
              <span style={{ fontSize:13, color:"#92400E" }}>「①認証設定」でログイン情報を保存すると、自動取り込みが有効になります。</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceIntegrationSettings({
  sourceIntegrations=[], sourceCredsStatus={}, sourceLoginIds={}, clientInfo={},
  scenarios=[], statuses=[], sources=[], staffList=[], groups=[], onRefresh,
}) {
  const connectedCount = SUPPORTED_SOURCES.filter(s=>s.status==="available"&&sourceCredsStatus[s.key]).length;
  const availableCount = SUPPORTED_SOURCES.filter(s=>s.status==="available").length;

  return (
    <Page title="媒体連携設定" subtitle="不動産媒体からの反響をSMOOSyに自動登録する設定を行います">
      <ForwardingBanner clientInfo={clientInfo} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"接続済み媒体", value:connectedCount+" / "+availableCount, color:THEME.success,  bg:"#DCFCE7" },
          { label:"準備中の媒体", value:SUPPORTED_SOURCES.filter(s=>s.status==="coming_soon").length, color:THEME.textMuted, bg:"#F3F4F6" },
          { label:"自動実行",     value:"メール転送で動作",  color:"#7C3AED", bg:"#EDE9FE" },
        ].map((item,i)=>(
          <div key={i} style={{ backgroundColor:item.bg, borderRadius:14, padding:"18px 22px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:item.color, marginBottom:4 }}>{item.label}</div>
            <div style={{ fontSize:20, fontWeight:900, color:item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {SUPPORTED_SOURCES.map(source=>(
          <SourceCard key={source.key} source={source}
            isConnected={!!sourceCredsStatus[source.key]}
            integration={sourceIntegrations.find(r=>String(r["sourceKey"]).trim()===source.key)}
            scenarios={scenarios} statuses={statuses} sources={sources}
            staffList={staffList} groups={groups} onRefresh={onRefresh}
          />
        ))}
      </div>

      <div style={{ marginTop:28, padding:"18px 22px", backgroundColor:"white", borderRadius:14, border:`1px solid ${THEME.border}`, display:"flex", gap:14, alignItems:"flex-start" }}>
        <AlertCircle size={18} color={THEME.primary} style={{ flexShrink:0, marginTop:1 }}/>
        <div style={{ fontSize:13, color:THEME.textMuted, lineHeight:1.8 }}>
          <strong style={{ color:THEME.textMain }}>自動取り込みの仕組み：</strong>
          各媒体からの通知メールを上記の転送先アドレスに転送すると、弊社システムが自動で検知して顧客登録を行います。
          通常、メール受信から <strong style={{ color:THEME.primary }}>3分以内</strong> に登録が完了します。
        </div>
      </div>
    </Page>
  );
}

export default SourceIntegrationSettings;