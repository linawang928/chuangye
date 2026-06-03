import crypto from "crypto";
import fs from "fs";
import path from "path";
import type {
  AppState,
  Comment,
  DataScope,
  Dashboard,
  Decision,
  Entry,
  KnowledgeEdge,
  KnowledgeNode,
  Project,
  User,
  UserHandle,
  Visibility
} from "@/lib/types";

interface Store {
  users: User[];
  projects: Project[];
  entries: Entry[];
  comments: Comment[];
  decisions: Decision[];
  graphNodes: KnowledgeNode[];
  graphEdges: KnowledgeEdge[];
}

let store: Store | null = null;

function storePath() {
  const configured = process.env.DATABASE_PATH || "./data/startup-memory.json";
  const normalized = configured.endsWith(".db")
    ? configured.replace(/\.db$/, ".json")
    : configured;
  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  const fileName = normalized.split(/[\\/]/).pop() || "startup-memory.json";
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", fileName);
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now() {
  return new Date().toISOString();
}

function seedStore(): Store {
  const createdAt = now();
  const linId = "user_lin";
  const shelleyId = "user_shelley";
  const projectId = "project_startup_memory";
  const entryId = "entry_seed_graph_agent";
  const shelleyEntryId = "entry_seed_shelley_concern";
  const projectNode = "node_project_startup_memory";
  const graphNode = "node_knowledge_graph";
  const agentNode = "node_agent";
  const decisionNode = "node_decision_web_first";

  return {
    users: [
      { id: linId, handle: "lin", name: "Lin", avatarColor: "#0f9f8f" },
      { id: shelleyId, handle: "shelley", name: "Shelley", avatarColor: "#f97373" }
    ],
    projects: [
      {
        id: projectId,
        ownerId: linId,
        visibility: "shared",
        name: "创业记忆平台",
        description: "记录创业过程、连接想法、支持双人复盘和 Agent 问答。",
        status: "active",
        createdAt
      }
    ],
    entries: [
      {
        id: entryId,
        ownerId: linId,
        visibility: "shared",
        projectId,
        title: "从创业日志升级到创业记忆系统",
        body: "平台不能只是日记。我们需要把每天的想法、项目判断、决策与复盘连接起来，用知识图谱看到想法如何演化，并让 Agent 在提问时检索过往经验。",
        sourceType: "text",
        mood: "energized",
        confidence: 84,
        importance: 5,
        tags: ["知识图谱", "Agent", "复盘", "项目想法"],
        aiSummary: "把日志、知识图谱和 Agent 组合成创业记忆系统。",
        assetNames: [],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: shelleyEntryId,
        ownerId: shelleyId,
        visibility: "shared",
        projectId,
        title: "Shelley 对记录门槛的担忧",
        body: "如果记录入口太复杂，日常就很难坚持。第一版应该优先降低上传门槛，允许文字、图片、语音都能快速沉淀为结构化日志。",
        sourceType: "text",
        mood: "steady",
        confidence: 76,
        importance: 4,
        tags: ["输入门槛", "语音识别", "图片识别"],
        aiSummary: "第一版重点是让记录足够轻，而不是先做复杂管理。",
        assetNames: [],
        createdAt,
        updatedAt: createdAt
      }
    ],
    comments: [
      {
        id: "comment_seed_1",
        entryId,
        authorId: shelleyId,
        intent: "action",
        body: "我同意，但入口要尽量像随手发一条消息一样轻。",
        createdAt
      }
    ],
    decisions: [
      {
        id: "decision_web_first",
        ownerId: linId,
        visibility: "shared",
        projectId,
        title: "先做网页/PWA，再做微信小程序",
        context: "知识图谱、仪表盘和 Agent 更适合网页端；小程序更适合作为后续轻量记录入口。",
        options: ["纯网页", "纯小程序", "网页/PWA + 小程序轻入口"],
        decision: "第一阶段先做网页/PWA MVP，稳定后再加小程序。",
        reasoning: "这样能最快上线，也能降低复杂图谱和 AI 功能的实现风险。",
        confidence: 82,
        expectedOutcome: "两人能先连续记录并完成每周复盘。",
        reviewDate: "2026-07-01",
        actualOutcome: "",
        status: "open",
        createdAt,
        updatedAt: createdAt
      }
    ],
    graphNodes: [
      {
        id: projectNode,
        ownerId: linId,
        visibility: "shared",
        sourceEntryId: null,
        projectId,
        type: "project",
        label: "创业记忆平台",
        description: "双人创业记录、复盘、图谱和 Agent 系统。",
        createdAt
      },
      {
        id: graphNode,
        ownerId: linId,
        visibility: "shared",
        sourceEntryId: entryId,
        projectId,
        type: "idea",
        label: "知识图谱可视化",
        description: "用节点和关系呈现每日想法与项目之间的连接。",
        createdAt
      },
      {
        id: agentNode,
        ownerId: linId,
        visibility: "shared",
        sourceEntryId: entryId,
        projectId,
        type: "idea",
        label: "创业记忆 Agent",
        description: "检索历史经历和思路，再结合大模型回答问题。",
        createdAt
      },
      {
        id: decisionNode,
        ownerId: linId,
        visibility: "shared",
        sourceEntryId: null,
        projectId,
        type: "decision",
        label: "网页/PWA 先行",
        description: "第一阶段优先网页端，之后再做小程序记录入口。",
        createdAt
      }
    ],
    graphEdges: [
      edge(linId, "shared", projectNode, graphNode, "包含", createdAt),
      edge(linId, "shared", projectNode, agentNode, "包含", createdAt),
      edge(linId, "shared", decisionNode, projectNode, "推进", createdAt),
      edge(linId, "shared", graphNode, agentNode, "增强", createdAt)
    ]
  };
}

function edge(
  ownerId: string,
  visibility: Visibility,
  sourceNodeId: string,
  targetNodeId: string,
  relation: string,
  createdAt: string
): KnowledgeEdge {
  return {
    id: uid("edge"),
    ownerId,
    visibility,
    sourceNodeId,
    targetNodeId,
    relation,
    createdAt
  };
}

function loadStore() {
  if (store) {
    return store;
  }

  const filePath = storePath();
  try {
    store = JSON.parse(fs.readFileSync(filePath, "utf8")) as Store;
  } catch {
    store = seedStore();
  }

  return store;
}

function saveStore() {
  if (!store) {
    return;
  }

  const filePath = storePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
  } catch (error) {
    console.warn("Could not persist startup memory store", error);
  }
}

export function getUsers() {
  return [...loadStore().users].sort((left, right) => left.handle.localeCompare(right.handle));
}

export function getUserByHandle(handle: UserHandle) {
  const user = loadStore().users.find((item) => item.handle === handle);
  if (!user) {
    throw new Error(`Unknown user: ${handle}`);
  }

  return user;
}

function isVisible<T extends { ownerId: string; visibility: Visibility }>(
  item: T,
  viewerId: string,
  partnerId: string,
  scope: DataScope
) {
  if (scope === "mine") {
    return item.ownerId === viewerId;
  }
  if (scope === "shared") {
    return item.visibility === "shared";
  }
  if (scope === "partner") {
    return item.ownerId === partnerId && item.visibility === "shared";
  }
  return item.ownerId === viewerId || item.visibility === "shared";
}

function computeDashboard(
  entries: Entry[],
  decisions: Decision[],
  nodes: KnowledgeNode[],
  projects: Project[]
): Dashboard {
  const byDate = new Map<string, { count: number; confidenceTotal: number }>();
  const tags = new Map<string, number>();
  const projectCounts = new Map<string, number>();

  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10);
    const current = byDate.get(date) || { count: 0, confidenceTotal: 0 };
    byDate.set(date, {
      count: current.count + 1,
      confidenceTotal: current.confidenceTotal + entry.confidence
    });
    for (const tag of entry.tags) {
      tags.set(tag, (tags.get(tag) || 0) + 1);
    }
    if (entry.projectId) {
      projectCounts.set(entry.projectId, (projectCounts.get(entry.projectId) || 0) + 1);
    }
  }

  return {
    totalEntries: entries.length,
    sharedEntries: entries.filter((entry) => entry.visibility === "shared").length,
    totalDecisions: decisions.length,
    openReviews: decisions.filter((decision) => decision.status === "open").length,
    totalNodes: nodes.length,
    averageConfidence:
      entries.length === 0
        ? 0
        : Math.round(entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length),
    entryTrend: Array.from(byDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => ({
        date,
        count: value.count,
        confidence: Math.round(value.confidenceTotal / value.count)
      })),
    tagDistribution: Array.from(tags.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value })),
    projectActivity: Array.from(projectCounts.entries()).map(([projectId, value]) => ({
      name: projects.find((project) => project.id === projectId)?.name || "未归类",
      value
    }))
  };
}

export function readAppState(viewerHandle: UserHandle, scope: DataScope): AppState {
  const data = loadStore();
  const users = getUsers();
  const viewer = users.find((user) => user.handle === viewerHandle) || users[0];
  const partner = users.find((user) => user.id !== viewer.id) || viewer;
  const visible = <T extends { ownerId: string; visibility: Visibility }>(items: T[]) =>
    items.filter((item) => isVisible(item, viewer.id, partner.id, scope));

  const projects = visible(data.projects).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const entries = visible(data.entries).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const decisions = visible(data.decisions).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const graphNodes = visible(data.graphNodes).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const entryIds = new Set(entries.map((entry) => entry.id));
  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const comments = data.comments
    .filter((comment) => entryIds.has(comment.entryId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const graphEdges = data.graphEdges
    .filter((item) => nodeIds.has(item.sourceNodeId) && nodeIds.has(item.targetNodeId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    viewer,
    partner,
    users,
    scope,
    projects,
    entries,
    comments,
    decisions,
    graphNodes,
    graphEdges,
    dashboard: computeDashboard(entries, decisions, graphNodes, projects)
  };
}

export function insertEntry(input: {
  ownerId: string;
  visibility: Visibility;
  projectId: string | null;
  title: string;
  body: string;
  sourceType: Entry["sourceType"];
  mood: Entry["mood"];
  confidence: number;
  importance: number;
  tags: string[];
  aiSummary: string;
  assetNames: string[];
  analysisNodes: Array<{ type: KnowledgeNode["type"]; label: string; description: string }>;
}) {
  const data = loadStore();
  const createdAt = now();
  const entryId = uid("entry");
  const logNodeId = uid("node");

  data.entries.push({
    id: entryId,
    ownerId: input.ownerId,
    visibility: input.visibility,
    projectId: input.projectId,
    title: input.title,
    body: input.body,
    sourceType: input.sourceType,
    mood: input.mood,
    confidence: input.confidence,
    importance: input.importance,
    tags: input.tags,
    aiSummary: input.aiSummary,
    assetNames: input.assetNames,
    createdAt,
    updatedAt: createdAt
  });
  data.graphNodes.push({
    id: logNodeId,
    ownerId: input.ownerId,
    visibility: input.visibility,
    sourceEntryId: entryId,
    projectId: input.projectId,
    type: "log",
    label: input.title,
    description: input.aiSummary || input.body.slice(0, 120),
    createdAt
  });

  if (input.projectId) {
    const projectNode = data.graphNodes.find((node) => node.projectId === input.projectId && node.type === "project");
    if (projectNode) {
      data.graphEdges.push(edge(input.ownerId, input.visibility, projectNode.id, logNodeId, "包含", createdAt));
    }
  }

  for (const node of input.analysisNodes.slice(0, 6)) {
    const existing = data.graphNodes.find(
      (item) =>
        item.label === node.label &&
        item.type === node.type &&
        (item.ownerId === input.ownerId || item.visibility === "shared")
    );
    const nodeId = existing?.id || uid("node");
    if (!existing) {
      data.graphNodes.push({
        id: nodeId,
        ownerId: input.ownerId,
        visibility: input.visibility,
        sourceEntryId: entryId,
        projectId: input.projectId,
        type: node.type,
        label: node.label,
        description: node.description,
        createdAt
      });
    }
    data.graphEdges.push(edge(input.ownerId, input.visibility, logNodeId, nodeId, "提到", createdAt));
  }

  saveStore();
  return entryId;
}

export function insertComment(input: {
  entryId: string;
  authorId: string;
  intent: Comment["intent"];
  body: string;
}) {
  loadStore().comments.push({
    id: uid("comment"),
    entryId: input.entryId,
    authorId: input.authorId,
    intent: input.intent,
    body: input.body,
    createdAt: now()
  });
  saveStore();
}

export function insertDecision(input: {
  ownerId: string;
  visibility: Visibility;
  projectId: string | null;
  title: string;
  context: string;
  options: string[];
  decision: string;
  reasoning: string;
  confidence: number;
  expectedOutcome: string;
  reviewDate: string;
}) {
  const data = loadStore();
  const createdAt = now();
  const decisionId = uid("decision");
  data.decisions.push({
    id: decisionId,
    ownerId: input.ownerId,
    visibility: input.visibility,
    projectId: input.projectId,
    title: input.title,
    context: input.context,
    options: input.options,
    decision: input.decision,
    reasoning: input.reasoning,
    confidence: input.confidence,
    expectedOutcome: input.expectedOutcome,
    reviewDate: input.reviewDate,
    actualOutcome: "",
    status: "open",
    createdAt,
    updatedAt: createdAt
  });
  data.graphNodes.push({
    id: uid("node"),
    ownerId: input.ownerId,
    visibility: input.visibility,
    sourceEntryId: null,
    projectId: input.projectId,
    type: "decision",
    label: input.title,
    description: `${input.decision}。${input.reasoning}`,
    createdAt
  });
  saveStore();
  return decisionId;
}

export function insertGraphNode(input: {
  ownerId: string;
  visibility: Visibility;
  projectId: string | null;
  type: KnowledgeNode["type"];
  label: string;
  description: string;
}) {
  loadStore().graphNodes.push({
    id: uid("node"),
    ownerId: input.ownerId,
    visibility: input.visibility,
    sourceEntryId: null,
    projectId: input.projectId,
    type: input.type,
    label: input.label,
    description: input.description,
    createdAt: now()
  });
  saveStore();
}

export function insertGraphEdge(input: {
  ownerId: string;
  visibility: Visibility;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
}) {
  loadStore().graphEdges.push(
    edge(input.ownerId, input.visibility, input.sourceNodeId, input.targetNodeId, input.relation, now())
  );
  saveStore();
}

export function canViewEntry(entryId: string, viewerId: string) {
  const entry = loadStore().entries.find((item) => item.id === entryId);
  return Boolean(entry && (entry.ownerId === viewerId || entry.visibility === "shared"));
}
