"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  AudioLines,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  GitBranch,
  ImagePlus,
  Lightbulb,
  LogOut,
  MessageSquareText,
  Mic,
  Network,
  Plus,
  Send,
  Sparkles,
  Square,
  Upload,
  UserRoundCheck
} from "lucide-react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  AgentAnswer,
  AppState,
  Comment,
  DataScope,
  Decision,
  Entry,
  KnowledgeNode,
  Mood,
  NodeType,
  SourceType,
  User,
  UserHandle,
  Visibility
} from "@/lib/types";

type View = "dashboard" | "entries" | "decisions" | "graph" | "agent";

interface EntryFormState {
  visibility: Visibility;
  projectId: string;
  title: string;
  body: string;
  sourceType: SourceType;
  mood: Mood;
  confidence: number;
  importance: number;
  tagsInput: string;
  assetNames: string[];
}

interface DecisionFormState {
  visibility: Visibility;
  projectId: string;
  title: string;
  context: string;
  optionsInput: string;
  decision: string;
  reasoning: string;
  confidence: number;
  expectedOutcome: string;
  reviewDate: string;
}

interface NodeFormState {
  visibility: Visibility;
  projectId: string;
  type: NodeType;
  label: string;
  description: string;
}

interface EdgeFormState {
  visibility: Visibility;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
}

const scopeOptions: Array<{ value: DataScope; label: string }> = [
  { value: "all", label: "全部可见" },
  { value: "mine", label: "我的" },
  { value: "shared", label: "共同" },
  { value: "partner", label: "对方共享" }
];

const moodLabels: Record<Mood, string> = {
  energized: "有能量",
  steady: "稳定",
  stuck: "卡住",
  concerned: "担忧"
};

const sourceLabels: Record<SourceType, string> = {
  text: "文字",
  image: "图片",
  audio: "语音",
  mixed: "混合"
};

const nodeTypeLabels: Record<NodeType, string> = {
  log: "日志",
  project: "项目",
  idea: "想法",
  hypothesis: "假设",
  decision: "决策",
  lesson: "经验",
  feedback: "反馈",
  milestone: "里程碑",
  question: "问题"
};

const commentIntentLabels: Record<Comment["intent"], string> = {
  agree: "同意",
  question: "疑问",
  action: "行动",
  review: "复盘"
};

const chartColors = ["#0f9f8f", "#f97373", "#f4b740", "#6b6ee8", "#38a169", "#d946ef"];

const navItems: Array<{ view: View; label: string; icon: typeof BarChart3 }> = [
  { view: "dashboard", label: "仪表盘", icon: BarChart3 },
  { view: "entries", label: "创业日志", icon: MessageSquareText },
  { view: "decisions", label: "决策记录", icon: Check },
  { view: "graph", label: "知识图谱", icon: Network },
  { view: "agent", label: "Agent", icon: Bot }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function splitTags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }

  return payload as T;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Empty({ label }: { label: string }) {
  return <div className="empty">{label}</div>;
}

function VisibilityTag({ visibility }: { visibility: Visibility }) {
  return (
    <span className={`tag ${visibility === "shared" ? "shared" : "private"}`}>
      {visibility === "shared" ? "共同" : "个人"}
    </span>
  );
}

export function StartupMemoryApp() {
  const [viewer, setViewer] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginHandle, setLoginHandle] = useState<UserHandle>("lin");
  const [passcode, setPasscode] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [scope, setScope] = useState<DataScope>("all");
  const [state, setState] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const voiceBaseRef = useRef("");

  const [entryForm, setEntryForm] = useState<EntryFormState>({
    visibility: "shared" as Visibility,
    projectId: "",
    title: "",
    body: "",
    sourceType: "text" as SourceType,
    mood: "steady" as Mood,
    confidence: 75,
    importance: 3,
    tagsInput: "",
    assetNames: [] as string[]
  });
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>({
    visibility: "shared" as Visibility,
    projectId: "",
    title: "",
    context: "",
    optionsInput: "",
    decision: "",
    reasoning: "",
    confidence: 70,
    expectedOutcome: "",
    reviewDate: ""
  });
  const [nodeForm, setNodeForm] = useState<NodeFormState>({
    visibility: "shared" as Visibility,
    projectId: "",
    type: "idea" as NodeType,
    label: "",
    description: ""
  });
  const [edgeForm, setEdgeForm] = useState<EdgeFormState>({
    visibility: "shared" as Visibility,
    sourceNodeId: "",
    targetNodeId: "",
    relation: "关联"
  });
  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, { intent: Comment["intent"]; body: string }>
  >({});
  const [agentQuestion, setAgentQuestion] = useState("");
  const [agentAnswer, setAgentAnswer] = useState<AgentAnswer | null>(null);

  useEffect(() => {
    requestJson<{ viewer: User }>("/api/auth/me")
      .then((payload) => setViewer(payload.viewer))
      .catch(() => setViewer(null))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    requestJson<AppState>(`/api/state?scope=${scope}`)
      .then(setState)
      .catch((error) => setNotice(error.message));
  }, [viewer, scope]);

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const user of state?.users || []) {
      map.set(user.id, user);
    }
    return map;
  }, [state?.users]);

  const projectsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of state?.projects || []) {
      map.set(project.id, project.name);
    }
    return map;
  }, [state?.projects]);

  const commentsByEntry = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const comment of state?.comments || []) {
      map.set(comment.entryId, [...(map.get(comment.entryId) || []), comment]);
    }
    return map;
  }, [state?.comments]);

  const flow = useMemo(() => {
    const nodes = state?.graphNodes || [];
    const radius = Math.max(180, nodes.length * 18);
    const flowNodes: FlowNode[] = nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
      const layerOffset = (index % 3) * 42;
      return {
        id: node.id,
        position: {
          x: 420 + Math.cos(angle) * (radius + layerOffset),
          y: 280 + Math.sin(angle) * (radius * 0.68 + layerOffset)
        },
        data: {
          label: `${node.label}\n${nodeTypeLabels[node.type]}`
        },
        style: {
          borderRadius: 8,
          border: "1px solid #dfe8e5",
          boxShadow: "0 10px 22px rgba(23, 33, 31, 0.08)",
          background: node.visibility === "shared" ? "#e2f6ef" : "#f3edf8",
          color: "#17211f",
          width: 168,
          minHeight: 58,
          fontWeight: 700,
          whiteSpace: "pre-line",
          lineHeight: 1.35
        }
      };
    });
    const flowEdges: FlowEdge[] = (state?.graphEdges || []).map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      label: edge.relation,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "#8aa09a", strokeWidth: 1.6 },
      labelStyle: { fill: "#40504b", fontWeight: 700 }
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [state?.graphEdges, state?.graphNodes]);

  const pageTitle = {
    dashboard: "可视化仪表盘",
    entries: "创业日志",
    decisions: "决策记录",
    graph: "知识图谱",
    agent: "创业记忆 Agent"
  }[view];

  async function refresh() {
    if (!viewer) {
      return;
    }

    setState(await requestJson<AppState>(`/api/state?scope=${scope}`));
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const payload = await requestJson<{ viewer: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ handle: loginHandle, passcode })
      });
      setViewer(payload.viewer);
      setPasscode("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await requestJson("/api/auth/logout", { method: "POST", body: "{}" });
    setViewer(null);
    setState(null);
  }

  async function createEntry(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await requestJson("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          visibility: entryForm.visibility,
          projectId: entryForm.projectId || null,
          title: entryForm.title,
          body: entryForm.body,
          sourceType: entryForm.sourceType,
          mood: entryForm.mood,
          confidence: entryForm.confidence,
          importance: entryForm.importance,
          tags: splitTags(entryForm.tagsInput),
          assetNames: entryForm.assetNames
        })
      });
      setEntryForm({
        visibility: "shared",
        projectId: "",
        title: "",
        body: "",
        sourceType: "text",
        mood: "steady",
        confidence: 75,
        importance: 3,
        tagsInput: "",
        assetNames: []
      });
      await refresh();
      setView("entries");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建日志失败");
    } finally {
      setBusy(false);
    }
  }

  async function recognizeFile(file: File, kind: "image" | "audio") {
    setBusy(true);
    setNotice("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await requestJson<{ text: string }>("/api/recognize", {
        method: "POST",
        body: JSON.stringify({
          kind,
          dataUrl,
          mimeType: file.type,
          fileName: file.name
        })
      });
      setEntryForm((current) => ({
        ...current,
        body: [current.body, result.text].filter(Boolean).join("\n"),
        sourceType: current.sourceType === "text" ? kind : "mixed",
        assetNames: Array.from(new Set([...current.assetNames, file.name]))
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "文件识别失败");
    } finally {
      setBusy(false);
    }
  }

  function toggleSpeech() {
    if (listening) {
      const recognition = recognitionRef.current as { stop?: () => void } | null;
      recognition?.stop?.();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice("当前浏览器不支持即时语音输入，可以上传音频文件识别。");
      return;
    }

    const recognition = new SpeechRecognition() as {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    let finalTranscript = "";
    voiceBaseRef.current = entryForm.body ? `${entryForm.body}\n` : "";
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }
      setEntryForm((current) => ({
        ...current,
        sourceType: current.sourceType === "text" ? "audio" : "mixed",
        body: `${voiceBaseRef.current}${finalTranscript}${interim}`
      }));
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  async function createComment(entryId: string) {
    const draft = commentDrafts[entryId];
    if (!draft?.body) {
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      await requestJson("/api/comments", {
        method: "POST",
        body: JSON.stringify({ entryId, intent: draft.intent, body: draft.body })
      });
      setCommentDrafts((current) => ({ ...current, [entryId]: { intent: "review", body: "" } }));
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "点评失败");
    } finally {
      setBusy(false);
    }
  }

  async function createDecision(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await requestJson("/api/decisions", {
        method: "POST",
        body: JSON.stringify({
          visibility: decisionForm.visibility,
          projectId: decisionForm.projectId || null,
          title: decisionForm.title,
          context: decisionForm.context,
          options: splitTags(decisionForm.optionsInput),
          decision: decisionForm.decision,
          reasoning: decisionForm.reasoning,
          confidence: decisionForm.confidence,
          expectedOutcome: decisionForm.expectedOutcome,
          reviewDate: decisionForm.reviewDate
        })
      });
      setDecisionForm({
        visibility: "shared",
        projectId: "",
        title: "",
        context: "",
        optionsInput: "",
        decision: "",
        reasoning: "",
        confidence: 70,
        expectedOutcome: "",
        reviewDate: ""
      });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建决策失败");
    } finally {
      setBusy(false);
    }
  }

  async function createNode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await requestJson("/api/graph/nodes", {
        method: "POST",
        body: JSON.stringify({
          visibility: nodeForm.visibility,
          projectId: nodeForm.projectId || null,
          type: nodeForm.type,
          label: nodeForm.label,
          description: nodeForm.description
        })
      });
      setNodeForm({
        visibility: "shared",
        projectId: "",
        type: "idea",
        label: "",
        description: ""
      });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建节点失败");
    } finally {
      setBusy(false);
    }
  }

  async function createEdge(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await requestJson("/api/graph/edges", {
        method: "POST",
        body: JSON.stringify(edgeForm)
      });
      setEdgeForm({ visibility: "shared", sourceNodeId: "", targetNodeId: "", relation: "关联" });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "创建关系失败");
    } finally {
      setBusy(false);
    }
  }

  async function askAgent(event: React.FormEvent) {
    event.preventDefault();
    if (!agentQuestion.trim()) {
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const answer = await requestJson<AgentAnswer>("/api/agent", {
        method: "POST",
        body: JSON.stringify({ question: agentQuestion, scope })
      });
      setAgentAnswer(answer);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Agent 回答失败");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return <div className="login-screen">正在进入工作台...</div>;
  }

  if (!viewer) {
    return (
      <main className="login-screen">
        <section className="panel login-panel">
          <div className="panel-body">
            <div className="login-logo">
              <BrainCircuit size={28} />
            </div>
            <h1 className="page-title">创业记忆平台</h1>
            <p className="page-meta">Lin / Shelley 双人工作台</p>
            <form className="form-grid" onSubmit={login}>
              <div className="field">
                <label htmlFor="handle">身份</label>
                <select
                  id="handle"
                  className="select"
                  value={loginHandle}
                  onChange={(event) => setLoginHandle(event.target.value as UserHandle)}
                >
                  <option value="lin">Lin</option>
                  <option value="shelley">Shelley</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="passcode">口令</label>
                <input
                  id="passcode"
                  className="input"
                  type="password"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                />
              </div>
              {notice ? <div className="notice">{notice}</div> : null}
              <button className="primary-button" type="submit" disabled={busy}>
                <UserRoundCheck size={18} />
                进入
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrainCircuit size={24} />
          </div>
          <div>
            <div className="brand-title">创业记忆</div>
            <div className="brand-subtitle">日志 · 图谱 · Agent</div>
          </div>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                className={`nav-button ${view === item.view ? "active" : ""}`}
                onClick={() => setView(item.view)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar" style={{ background: viewer.avatarColor }}>
              {viewer.name.slice(0, 1)}
            </div>
            <div>
              <strong>{viewer.name}</strong>
              <div className="muted">当前身份</div>
            </div>
          </div>
          <button className="secondary-button" type="button" onClick={logout}>
            <LogOut size={17} />
            退出
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <div className="page-meta">
              {state ? `${viewer.name} 可见数据 · ${state.entries.length} 条日志` : "加载中"}
            </div>
          </div>
          <div className="toolbar">
            <div className="segmented" aria-label="数据范围">
              {scopeOptions.map((option) => (
                <button
                  key={option.value}
                  className={scope === option.value ? "active" : ""}
                  type="button"
                  onClick={() => setScope(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button className="icon-button" type="button" onClick={refresh} title="刷新">
              <Sparkles size={18} />
            </button>
          </div>
        </header>

        {notice ? <div className="notice" style={{ marginBottom: 14 }}>{notice}</div> : null}
        {!state ? <Empty label="正在加载数据" /> : null}
        {state && view === "dashboard" ? (
          <DashboardView state={state} usersById={usersById} setView={setView} />
        ) : null}
        {state && view === "entries" ? (
          <EntriesView
            state={state}
            entryForm={entryForm}
            setEntryForm={setEntryForm}
            createEntry={createEntry}
            busy={busy}
            recognizeFile={recognizeFile}
            listening={listening}
            toggleSpeech={toggleSpeech}
            commentsByEntry={commentsByEntry}
            usersById={usersById}
            projectsById={projectsById}
            commentDrafts={commentDrafts}
            setCommentDrafts={setCommentDrafts}
            createComment={createComment}
          />
        ) : null}
        {state && view === "decisions" ? (
          <DecisionsView
            state={state}
            decisionForm={decisionForm}
            setDecisionForm={setDecisionForm}
            createDecision={createDecision}
            busy={busy}
            projectsById={projectsById}
          />
        ) : null}
        {state && view === "graph" ? (
          <GraphView
            state={state}
            flowNodes={flow.nodes}
            flowEdges={flow.edges}
            nodeForm={nodeForm}
            setNodeForm={setNodeForm}
            edgeForm={edgeForm}
            setEdgeForm={setEdgeForm}
            createNode={createNode}
            createEdge={createEdge}
            busy={busy}
          />
        ) : null}
        {state && view === "agent" ? (
          <AgentView
            question={agentQuestion}
            setQuestion={setAgentQuestion}
            answer={agentAnswer}
            askAgent={askAgent}
            busy={busy}
          />
        ) : null}
      </main>
    </div>
  );
}

function DashboardView({
  state,
  usersById,
  setView
}: {
  state: AppState;
  usersById: Map<string, User>;
  setView: (view: View) => void;
}) {
  const stats = [
    { label: "日志", value: state.dashboard.totalEntries },
    { label: "共同日志", value: state.dashboard.sharedEntries },
    { label: "决策", value: state.dashboard.totalDecisions },
    { label: "待复盘", value: state.dashboard.openReviews },
    { label: "图谱节点", value: state.dashboard.totalNodes }
  ];

  return (
    <>
      <section className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">记录趋势与信心</h2>
          </div>
          <div className="panel-body chart-box">
            {state.dashboard.entryTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={state.dashboard.entryTrend}>
                  <CartesianGrid stroke="#edf2f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="记录数" stroke="#0f9f8f" strokeWidth={3} />
                  <Line type="monotone" dataKey="confidence" name="信心" stroke="#f97373" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty label="暂无趋势数据" />
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">标签分布</h2>
          </div>
          <div className="panel-body chart-box">
            {state.dashboard.tagDistribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={state.dashboard.tagDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={94}
                    paddingAngle={4}
                  >
                    {state.dashboard.tagDistribution.map((item, index) => (
                      <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty label="暂无标签数据" />
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">项目活跃度</h2>
          </div>
          <div className="panel-body chart-box">
            {state.dashboard.projectActivity.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={state.dashboard.projectActivity}>
                  <CartesianGrid stroke="#edf2f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="记录数" fill="#6b6ee8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty label="暂无项目数据" />
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">最近记录</h2>
          </div>
          <div className="panel-body list">
            {state.entries.slice(0, 4).map((entry) => (
              <article className="entry-card" key={entry.id}>
                <div className="card-head">
                  <h3 className="card-title">{entry.title}</h3>
                  <VisibilityTag visibility={entry.visibility} />
                </div>
                <p className="card-body">{entry.aiSummary || entry.body}</p>
                <div className="tag-row">
                  <span className="tag">{usersById.get(entry.ownerId)?.name || "未知"}</span>
                  <span className="tag">信心 {entry.confidence}</span>
                </div>
              </article>
            ))}
            <button className="secondary-button" type="button" onClick={() => setView("entries")}>
              <Plus size={17} />
              新增日志
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function EntriesView({
  state,
  entryForm,
  setEntryForm,
  createEntry,
  busy,
  recognizeFile,
  listening,
  toggleSpeech,
  commentsByEntry,
  usersById,
  projectsById,
  commentDrafts,
  setCommentDrafts,
  createComment
}: {
  state: AppState;
  entryForm: EntryFormState;
  setEntryForm: React.Dispatch<React.SetStateAction<EntryFormState>>;
  createEntry: (event: React.FormEvent) => void;
  busy: boolean;
  recognizeFile: (file: File, kind: "image" | "audio") => void;
  listening: boolean;
  toggleSpeech: () => void;
  commentsByEntry: Map<string, Comment[]>;
  usersById: Map<string, User>;
  projectsById: Map<string, string>;
  commentDrafts: Record<string, { intent: Comment["intent"]; body: string }>;
  setCommentDrafts: React.Dispatch<
    React.SetStateAction<Record<string, { intent: Comment["intent"]; body: string }>>
  >;
  createComment: (entryId: string) => void;
}) {
  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">新增日志</h2>
        </div>
        <form className="panel-body form-grid" onSubmit={createEntry}>
          <div className="two-col">
            <div className="field">
              <label htmlFor="entry-visibility">数据</label>
              <select
                id="entry-visibility"
                className="select"
                value={entryForm.visibility}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, visibility: event.target.value as Visibility }))
                }
              >
                <option value="shared">共同</option>
                <option value="private">个人</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="entry-project">项目</label>
              <select
                id="entry-project"
                className="select"
                value={entryForm.projectId}
                onChange={(event) => setEntryForm((current) => ({ ...current, projectId: event.target.value }))}
              >
                <option value="">未关联</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="entry-title">标题</label>
            <input
              id="entry-title"
              className="input"
              value={entryForm.title}
              onChange={(event) => setEntryForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="entry-body">内容</label>
            <textarea
              id="entry-body"
              className="textarea"
              value={entryForm.body}
              onChange={(event) => setEntryForm((current) => ({ ...current, body: event.target.value }))}
            />
          </div>
          <div className="toolbar" style={{ justifyContent: "flex-start" }}>
            <label className="secondary-button" title="图片识别">
              <ImagePlus size={17} />
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    recognizeFile(file, "image");
                  }
                  event.target.value = "";
                }}
              />
            </label>
            <label className="secondary-button" title="音频识别">
              <Upload size={17} />
              <input
                hidden
                type="file"
                accept="audio/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    recognizeFile(file, "audio");
                  }
                  event.target.value = "";
                }}
              />
            </label>
            <button className="secondary-button" type="button" onClick={toggleSpeech}>
              {listening ? <Square size={16} /> : <Mic size={17} />}
              {listening ? "停止" : "语音"}
            </button>
          </div>
          <div className="three-col">
            <div className="field">
              <label htmlFor="entry-mood">状态</label>
              <select
                id="entry-mood"
                className="select"
                value={entryForm.mood}
                onChange={(event) => setEntryForm((current) => ({ ...current, mood: event.target.value as Mood }))}
              >
                {Object.entries(moodLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="entry-confidence">信心 {entryForm.confidence}</label>
              <input
                id="entry-confidence"
                type="range"
                min={0}
                max={100}
                value={entryForm.confidence}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, confidence: Number(event.target.value) }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="entry-importance">重要度 {entryForm.importance}</label>
              <input
                id="entry-importance"
                type="range"
                min={1}
                max={5}
                value={entryForm.importance}
                onChange={(event) =>
                  setEntryForm((current) => ({ ...current, importance: Number(event.target.value) }))
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="entry-tags">标签</label>
            <input
              id="entry-tags"
              className="input"
              value={entryForm.tagsInput}
              onChange={(event) => setEntryForm((current) => ({ ...current, tagsInput: event.target.value }))}
            />
          </div>
          <button className="primary-button" type="submit" disabled={busy}>
            <Plus size={18} />
            保存日志
          </button>
        </form>
      </div>

      <div className="list">
        {state.entries.length === 0 ? <Empty label="暂无日志" /> : null}
        {state.entries.map((entry) => (
          <EntryCard
            entry={entry}
            key={entry.id}
            usersById={usersById}
            projectsById={projectsById}
            comments={commentsByEntry.get(entry.id) || []}
            draft={commentDrafts[entry.id] || { intent: "review", body: "" }}
            setDraft={(draft) => setCommentDrafts((current) => ({ ...current, [entry.id]: draft }))}
            createComment={() => createComment(entry.id)}
          />
        ))}
      </div>
    </section>
  );
}

function EntryCard({
  entry,
  usersById,
  projectsById,
  comments,
  draft,
  setDraft,
  createComment
}: {
  entry: Entry;
  usersById: Map<string, User>;
  projectsById: Map<string, string>;
  comments: Comment[];
  draft: { intent: Comment["intent"]; body: string };
  setDraft: (draft: { intent: Comment["intent"]; body: string }) => void;
  createComment: () => void;
}) {
  return (
    <article className="entry-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">{entry.title}</h3>
          <div className="page-meta">
            {usersById.get(entry.ownerId)?.name || "未知"} · {formatDate(entry.createdAt)}
            {entry.projectId ? ` · ${projectsById.get(entry.projectId) || "项目"}` : ""}
          </div>
        </div>
        <VisibilityTag visibility={entry.visibility} />
      </div>
      <p className="card-body">{entry.body}</p>
      {entry.aiSummary ? <p className="card-body muted">AI 摘要：{entry.aiSummary}</p> : null}
      <div className="tag-row">
        <span className="tag">{sourceLabels[entry.sourceType]}</span>
        <span className="tag">{moodLabels[entry.mood]}</span>
        <span className="tag">信心 {entry.confidence}</span>
        {entry.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      {comments.length ? (
        <div className="comment-list">
          {comments.map((comment) => (
            <div className="comment-card" key={comment.id}>
              <div className="comment-meta">
                <span>{usersById.get(comment.authorId)?.name || "未知"}</span>
                <span>{commentIntentLabels[comment.intent]}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <div>{comment.body}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="inline-form">
        <select
          className="select"
          value={draft.intent}
          onChange={(event) => setDraft({ ...draft, intent: event.target.value as Comment["intent"] })}
        >
          {Object.entries(commentIntentLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="input"
          value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })}
        />
        <button className="icon-button" type="button" onClick={createComment} title="发送点评">
          <Send size={17} />
        </button>
      </div>
    </article>
  );
}

function DecisionsView({
  state,
  decisionForm,
  setDecisionForm,
  createDecision,
  busy,
  projectsById
}: {
  state: AppState;
  decisionForm: DecisionFormState;
  setDecisionForm: React.Dispatch<React.SetStateAction<DecisionFormState>>;
  createDecision: (event: React.FormEvent) => void;
  busy: boolean;
  projectsById: Map<string, string>;
}) {
  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">新增决策</h2>
        </div>
        <form className="panel-body form-grid" onSubmit={createDecision}>
          <div className="two-col">
            <div className="field">
              <label htmlFor="decision-visibility">数据</label>
              <select
                id="decision-visibility"
                className="select"
                value={decisionForm.visibility}
                onChange={(event) =>
                  setDecisionForm((current) => ({ ...current, visibility: event.target.value as Visibility }))
                }
              >
                <option value="shared">共同</option>
                <option value="private">个人</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="decision-project">项目</label>
              <select
                id="decision-project"
                className="select"
                value={decisionForm.projectId}
                onChange={(event) =>
                  setDecisionForm((current) => ({ ...current, projectId: event.target.value }))
                }
              >
                <option value="">未关联</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="decision-title">标题</label>
            <input
              id="decision-title"
              className="input"
              value={decisionForm.title}
              onChange={(event) => setDecisionForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="decision-context">背景</label>
            <textarea
              id="decision-context"
              className="textarea"
              value={decisionForm.context}
              onChange={(event) => setDecisionForm((current) => ({ ...current, context: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="decision-options">选项</label>
            <input
              id="decision-options"
              className="input"
              value={decisionForm.optionsInput}
              onChange={(event) =>
                setDecisionForm((current) => ({ ...current, optionsInput: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="decision-final">最终决定</label>
            <textarea
              id="decision-final"
              className="textarea"
              value={decisionForm.decision}
              onChange={(event) => setDecisionForm((current) => ({ ...current, decision: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="decision-reasoning">原因</label>
            <textarea
              id="decision-reasoning"
              className="textarea"
              value={decisionForm.reasoning}
              onChange={(event) => setDecisionForm((current) => ({ ...current, reasoning: event.target.value }))}
            />
          </div>
          <div className="two-col">
            <div className="field">
              <label htmlFor="decision-confidence">信心 {decisionForm.confidence}</label>
              <input
                id="decision-confidence"
                type="range"
                min={0}
                max={100}
                value={decisionForm.confidence}
                onChange={(event) =>
                  setDecisionForm((current) => ({ ...current, confidence: Number(event.target.value) }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="decision-review-date">复盘日期</label>
              <input
                id="decision-review-date"
                className="input"
                type="date"
                value={decisionForm.reviewDate}
                onChange={(event) =>
                  setDecisionForm((current) => ({ ...current, reviewDate: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="decision-outcome">预期结果</label>
            <input
              id="decision-outcome"
              className="input"
              value={decisionForm.expectedOutcome}
              onChange={(event) =>
                setDecisionForm((current) => ({ ...current, expectedOutcome: event.target.value }))
              }
            />
          </div>
          <button className="primary-button" type="submit" disabled={busy}>
            <Check size={18} />
            保存决策
          </button>
        </form>
      </div>
      <div className="list">
        {state.decisions.length === 0 ? <Empty label="暂无决策" /> : null}
        {state.decisions.map((decision) => (
          <DecisionCard key={decision.id} decision={decision} projectsById={projectsById} />
        ))}
      </div>
    </section>
  );
}

function DecisionCard({ decision, projectsById }: { decision: Decision; projectsById: Map<string, string> }) {
  return (
    <article className="decision-card">
      <div className="card-head">
        <div>
          <h3 className="card-title">{decision.title}</h3>
          <div className="page-meta">
            {formatDate(decision.createdAt)}
            {decision.projectId ? ` · ${projectsById.get(decision.projectId) || "项目"}` : ""}
          </div>
        </div>
        <VisibilityTag visibility={decision.visibility} />
      </div>
      <p className="card-body">{decision.context}</p>
      <p className="card-body">
        <strong>决定：</strong>
        {decision.decision}
      </p>
      <p className="card-body">
        <strong>原因：</strong>
        {decision.reasoning}
      </p>
      <div className="tag-row">
        <span className="tag">信心 {decision.confidence}</span>
        <span className="tag">{decision.status === "open" ? "待复盘" : "已复盘"}</span>
        {decision.reviewDate ? <span className="tag">复盘 {decision.reviewDate}</span> : null}
        {decision.options.map((option) => (
          <span className="tag" key={option}>
            {option}
          </span>
        ))}
      </div>
    </article>
  );
}

function GraphView({
  state,
  flowNodes,
  flowEdges,
  nodeForm,
  setNodeForm,
  edgeForm,
  setEdgeForm,
  createNode,
  createEdge,
  busy
}: {
  state: AppState;
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  nodeForm: NodeFormState;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeFormState>>;
  edgeForm: EdgeFormState;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeFormState>>;
  createNode: (event: React.FormEvent) => void;
  createEdge: (event: React.FormEvent) => void;
  busy: boolean;
}) {
  return (
    <>
      <section className="graph-tools">
        <form className="panel" onSubmit={createNode}>
          <div className="panel-header">
            <h2 className="panel-title">新增节点</h2>
          </div>
          <div className="panel-body form-grid">
            <div className="three-col">
              <select
                className="select"
                value={nodeForm.visibility}
                onChange={(event) =>
                  setNodeForm((current) => ({ ...current, visibility: event.target.value as Visibility }))
                }
              >
                <option value="shared">共同</option>
                <option value="private">个人</option>
              </select>
              <select
                className="select"
                value={nodeForm.type}
                onChange={(event) => setNodeForm((current) => ({ ...current, type: event.target.value as NodeType }))}
              >
                {Object.entries(nodeTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={nodeForm.projectId}
                onChange={(event) => setNodeForm((current) => ({ ...current, projectId: event.target.value }))}
              >
                <option value="">未关联</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="input"
              value={nodeForm.label}
              onChange={(event) => setNodeForm((current) => ({ ...current, label: event.target.value }))}
            />
            <input
              className="input"
              value={nodeForm.description}
              onChange={(event) => setNodeForm((current) => ({ ...current, description: event.target.value }))}
            />
            <button className="secondary-button" type="submit" disabled={busy}>
              <Lightbulb size={17} />
              添加节点
            </button>
          </div>
        </form>
        <form className="panel" onSubmit={createEdge}>
          <div className="panel-header">
            <h2 className="panel-title">新增关系</h2>
          </div>
          <div className="panel-body form-grid">
            <div className="two-col">
              <select
                className="select"
                value={edgeForm.sourceNodeId}
                onChange={(event) => setEdgeForm((current) => ({ ...current, sourceNodeId: event.target.value }))}
              >
                <option value="">起点</option>
                {state.graphNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={edgeForm.targetNodeId}
                onChange={(event) => setEdgeForm((current) => ({ ...current, targetNodeId: event.target.value }))}
              >
                <option value="">终点</option>
                {state.graphNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="two-col">
              <select
                className="select"
                value={edgeForm.visibility}
                onChange={(event) =>
                  setEdgeForm((current) => ({ ...current, visibility: event.target.value as Visibility }))
                }
              >
                <option value="shared">共同</option>
                <option value="private">个人</option>
              </select>
              <input
                className="input"
                value={edgeForm.relation}
                onChange={(event) => setEdgeForm((current) => ({ ...current, relation: event.target.value }))}
              />
            </div>
            <button className="secondary-button" type="submit" disabled={busy}>
              <GitBranch size={17} />
              添加关系
            </button>
          </div>
        </form>
      </section>
      <section className="graph-shell">
        <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
          <Background color="#d9e6e2" />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </section>
    </>
  );
}

function AgentView({
  question,
  setQuestion,
  answer,
  askAgent,
  busy
}: {
  question: string;
  setQuestion: (value: string) => void;
  answer: AgentAnswer | null;
  askAgent: (event: React.FormEvent) => void;
  busy: boolean;
}) {
  const suggestions = [
    "过去一个月我们反复提到的问题是什么？",
    "关于知识图谱，我们有哪些相关想法？",
    "请基于当前记录生成本周复盘。"
  ];

  return (
    <section className="agent-layout">
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">提问</h2>
        </div>
        <div className="panel-body form-grid">
          <form className="form-grid" onSubmit={askAgent}>
            <textarea
              className="textarea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={busy}>
              <Bot size={18} />
              发送
            </button>
          </form>
          <div className="tag-row">
            {suggestions.map((item) => (
              <button className="secondary-button" key={item} type="button" onClick={() => setQuestion(item)}>
                <AudioLines size={16} />
                {item}
              </button>
            ))}
          </div>
          {answer ? (
            <div className="panel" style={{ boxShadow: "none" }}>
              <div className="panel-body agent-answer">{answer.answer}</div>
            </div>
          ) : (
            <Empty label="暂无回答" />
          )}
        </div>
      </div>
      <aside className="panel">
        <div className="panel-header">
          <h2 className="panel-title">来源</h2>
        </div>
        <div className="panel-body list">
          {answer?.sources.length ? (
            answer.sources.map((source, index) => (
              <article className="source-card" key={source.id}>
                <div className="panel-body">
                  <div className="tag-row" style={{ marginTop: 0 }}>
                    <span className="tag">[{index + 1}]</span>
                    <span className="tag">{source.type}</span>
                  </div>
                  <h3 className="card-title" style={{ marginTop: 10 }}>
                    {source.title}
                  </h3>
                  <p className="card-body">{source.excerpt}</p>
                </div>
              </article>
            ))
          ) : (
            <Empty label="暂无来源" />
          )}
        </div>
      </aside>
    </section>
  );
}
