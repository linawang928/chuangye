import crypto from "crypto";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
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

let connection: Database.Database | null = null;

function databasePath() {
  const configured = process.env.DATABASE_PATH || "./data/startup-memory.db";
  if (path.isAbsolute(configured)) {
    return configured;
  }

  const fileName = configured.split(/[\\/]/).pop() || "startup-memory.db";
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", fileName);
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function now() {
  return new Date().toISOString();
}

function parseList(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    handle: row.handle as UserHandle,
    name: String(row.name),
    avatarColor: String(row.avatar_color)
  };
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    visibility: row.visibility as Visibility,
    name: String(row.name),
    description: String(row.description || ""),
    status: String(row.status || "active"),
    createdAt: String(row.created_at)
  };
}

function rowToEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    visibility: row.visibility as Visibility,
    projectId: row.project_id ? String(row.project_id) : null,
    title: String(row.title),
    body: String(row.body),
    sourceType: row.source_type as Entry["sourceType"],
    mood: row.mood as Entry["mood"],
    confidence: Number(row.confidence),
    importance: Number(row.importance),
    tags: parseList(String(row.tags || "[]")),
    aiSummary: String(row.ai_summary || ""),
    assetNames: parseList(String(row.asset_names || "[]")),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    entryId: String(row.entry_id),
    authorId: String(row.author_id),
    intent: row.intent as Comment["intent"],
    body: String(row.body),
    createdAt: String(row.created_at)
  };
}

function rowToDecision(row: Record<string, unknown>): Decision {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    visibility: row.visibility as Visibility,
    projectId: row.project_id ? String(row.project_id) : null,
    title: String(row.title),
    context: String(row.context),
    options: parseList(String(row.options || "[]")),
    decision: String(row.decision),
    reasoning: String(row.reasoning),
    confidence: Number(row.confidence),
    expectedOutcome: String(row.expected_outcome || ""),
    reviewDate: String(row.review_date || ""),
    actualOutcome: String(row.actual_outcome || ""),
    status: row.status as Decision["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function rowToNode(row: Record<string, unknown>): KnowledgeNode {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    visibility: row.visibility as Visibility,
    sourceEntryId: row.source_entry_id ? String(row.source_entry_id) : null,
    projectId: row.project_id ? String(row.project_id) : null,
    type: row.type as KnowledgeNode["type"],
    label: String(row.label),
    description: String(row.description || ""),
    createdAt: String(row.created_at)
  };
}

function rowToEdge(row: Record<string, unknown>): KnowledgeEdge {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    visibility: row.visibility as Visibility,
    sourceNodeId: String(row.source_node_id),
    targetNodeId: String(row.target_node_id),
    relation: String(row.relation),
    createdAt: String(row.created_at)
  };
}

function init(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      project_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      source_type TEXT NOT NULL,
      mood TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      importance INTEGER NOT NULL,
      tags TEXT NOT NULL,
      ai_summary TEXT NOT NULL DEFAULT '',
      asset_names TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      intent TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entry_id) REFERENCES entries(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      project_id TEXT,
      title TEXT NOT NULL,
      context TEXT NOT NULL,
      options TEXT NOT NULL,
      decision TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      expected_outcome TEXT NOT NULL DEFAULT '',
      review_date TEXT NOT NULL DEFAULT '',
      actual_outcome TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      source_entry_id TEXT,
      project_id TEXT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (source_entry_id) REFERENCES entries(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS knowledge_edges (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      visibility TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id),
      FOREIGN KEY (source_node_id) REFERENCES knowledge_nodes(id),
      FOREIGN KEY (target_node_id) REFERENCES knowledge_nodes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_owner ON entries(owner_id);
    CREATE INDEX IF NOT EXISTS idx_entries_visibility ON entries(visibility);
    CREATE INDEX IF NOT EXISTS idx_nodes_owner ON knowledge_nodes(owner_id);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON knowledge_edges(source_node_id);
  `);

  seed(db);
}

function seed(db: Database.Database) {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

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

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO users (id, handle, name, avatar_color) VALUES (?, ?, ?, ?)").run(
      linId,
      "lin",
      "Lin",
      "#0f9f8f"
    );
    db.prepare("INSERT INTO users (id, handle, name, avatar_color) VALUES (?, ?, ?, ?)").run(
      shelleyId,
      "shelley",
      "Shelley",
      "#f97373"
    );
    db.prepare(
      "INSERT INTO projects (id, owner_id, visibility, name, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      projectId,
      linId,
      "shared",
      "创业记忆平台",
      "记录创业过程、连接想法、支持双人复盘和 Agent 问答。",
      "active",
      createdAt
    );
    db.prepare(
      `INSERT INTO entries
       (id, owner_id, visibility, project_id, title, body, source_type, mood, confidence, importance, tags, ai_summary, asset_names, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entryId,
      linId,
      "shared",
      projectId,
      "从创业日志升级到创业记忆系统",
      "平台不能只是日记。我们需要把每天的想法、项目判断、决策与复盘连接起来，用知识图谱看到想法如何演化，并让 Agent 在提问时检索过往经验。",
      "text",
      "energized",
      84,
      5,
      JSON.stringify(["知识图谱", "Agent", "复盘", "项目想法"]),
      "把日志、知识图谱和 Agent 组合成创业记忆系统。",
      JSON.stringify([]),
      createdAt,
      createdAt
    );
    db.prepare(
      `INSERT INTO entries
       (id, owner_id, visibility, project_id, title, body, source_type, mood, confidence, importance, tags, ai_summary, asset_names, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      shelleyEntryId,
      shelleyId,
      "shared",
      projectId,
      "Shelley 对记录门槛的担忧",
      "如果记录入口太复杂，日常就很难坚持。第一版应该优先降低上传门槛，允许文字、图片、语音都能快速沉淀为结构化日志。",
      "text",
      "steady",
      76,
      4,
      JSON.stringify(["输入门槛", "语音识别", "图片识别"]),
      "第一版重点是让记录足够轻，而不是先做复杂管理。",
      JSON.stringify([]),
      createdAt,
      createdAt
    );
    db.prepare(
      "INSERT INTO comments (id, entry_id, author_id, intent, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      "comment_seed_1",
      entryId,
      shelleyId,
      "action",
      "我同意，但入口要尽量像随手发一条消息一样轻。",
      createdAt
    );
    db.prepare(
      `INSERT INTO decisions
       (id, owner_id, visibility, project_id, title, context, options, decision, reasoning, confidence, expected_outcome, review_date, actual_outcome, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "decision_web_first",
      linId,
      "shared",
      projectId,
      "先做网页/PWA，再做微信小程序",
      "知识图谱、仪表盘和 Agent 更适合网页端；小程序更适合作为后续轻量记录入口。",
      JSON.stringify(["纯网页", "纯小程序", "网页/PWA + 小程序轻入口"]),
      "第一阶段先做网页/PWA MVP，稳定后再加小程序。",
      "这样能最快上线，也能降低复杂图谱和 AI 功能的实现风险。",
      82,
      "两人能先连续记录并完成每周复盘。",
      "2026-07-01",
      "",
      "open",
      createdAt,
      createdAt
    );
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(projectNode, linId, "shared", null, projectId, "project", "创业记忆平台", "双人创业记录、复盘、图谱和 Agent 系统。", createdAt);
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(graphNode, linId, "shared", entryId, projectId, "idea", "知识图谱可视化", "用节点和关系呈现每日想法与项目之间的连接。", createdAt);
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(agentNode, linId, "shared", entryId, projectId, "idea", "创业记忆 Agent", "检索历史经历和思路，再结合大模型回答问题。", createdAt);
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(decisionNode, linId, "shared", null, projectId, "decision", "网页/PWA 先行", "第一阶段优先网页端，之后再做小程序记录入口。", createdAt);
    for (const [source, target, relation] of [
      [projectNode, graphNode, "包含"],
      [projectNode, agentNode, "包含"],
      [decisionNode, projectNode, "推进"],
      [graphNode, agentNode, "增强"]
    ]) {
      db.prepare(
        "INSERT INTO knowledge_edges (id, owner_id, visibility, source_node_id, target_node_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(uid("edge"), linId, "shared", source, target, relation, createdAt);
    }
  });

  tx();
}

export function getDb() {
  if (!connection) {
    const dbPath = databasePath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    connection = new Database(dbPath);
    connection.pragma("journal_mode = WAL");
    init(connection);
  }

  return connection;
}

export function getUsers() {
  return getDb()
    .prepare("SELECT * FROM users ORDER BY handle")
    .all()
    .map((row) => rowToUser(row as Record<string, unknown>));
}

export function getUserByHandle(handle: UserHandle) {
  const row = getDb().prepare("SELECT * FROM users WHERE handle = ?").get(handle);
  if (!row) {
    throw new Error(`Unknown user: ${handle}`);
  }

  return rowToUser(row as Record<string, unknown>);
}

function visibilitySql(alias: string, scope: DataScope) {
  if (scope === "mine") {
    return `${alias}.owner_id = @viewerId`;
  }
  if (scope === "shared") {
    return `${alias}.visibility = 'shared'`;
  }
  if (scope === "partner") {
    return `${alias}.owner_id = @partnerId AND ${alias}.visibility = 'shared'`;
  }
  return `(${alias}.owner_id = @viewerId OR ${alias}.visibility = 'shared')`;
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
  const db = getDb();
  const users = getUsers();
  const viewer = users.find((user) => user.handle === viewerHandle) || users[0];
  const partner = users.find((user) => user.id !== viewer.id) || viewer;
  const params = { viewerId: viewer.id, partnerId: partner.id };
  const where = visibilitySql("item", scope);

  const projects = db
    .prepare(`SELECT * FROM projects item WHERE ${where} ORDER BY created_at DESC`)
    .all(params)
    .map((row) => rowToProject(row as Record<string, unknown>));
  const entries = db
    .prepare(`SELECT * FROM entries item WHERE ${where} ORDER BY created_at DESC`)
    .all(params)
    .map((row) => rowToEntry(row as Record<string, unknown>));
  const decisions = db
    .prepare(`SELECT * FROM decisions item WHERE ${where} ORDER BY created_at DESC`)
    .all(params)
    .map((row) => rowToDecision(row as Record<string, unknown>));
  const graphNodes = db
    .prepare(`SELECT * FROM knowledge_nodes item WHERE ${where} ORDER BY created_at DESC`)
    .all(params)
    .map((row) => rowToNode(row as Record<string, unknown>));
  const nodeIds = graphNodes.map((node) => node.id);
  const comments =
    entries.length === 0
      ? []
      : db
          .prepare(
            `SELECT comments.* FROM comments
             INNER JOIN entries ON entries.id = comments.entry_id
             WHERE comments.entry_id IN (${entries.map(() => "?").join(",")})
             ORDER BY comments.created_at ASC`
          )
          .all(...entries.map((entry) => entry.id))
          .map((row) => rowToComment(row as Record<string, unknown>));
  const graphEdges =
    nodeIds.length === 0
      ? []
      : db
          .prepare(
            `SELECT * FROM knowledge_edges
             WHERE source_node_id IN (${nodeIds.map(() => "?").join(",")})
             AND target_node_id IN (${nodeIds.map(() => "?").join(",")})
             ORDER BY created_at DESC`
          )
          .all(...nodeIds, ...nodeIds)
          .map((row) => rowToEdge(row as Record<string, unknown>));

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
  const db = getDb();
  const createdAt = now();
  const entryId = uid("entry");

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO entries
       (id, owner_id, visibility, project_id, title, body, source_type, mood, confidence, importance, tags, ai_summary, asset_names, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      entryId,
      input.ownerId,
      input.visibility,
      input.projectId,
      input.title,
      input.body,
      input.sourceType,
      input.mood,
      input.confidence,
      input.importance,
      JSON.stringify(input.tags),
      input.aiSummary,
      JSON.stringify(input.assetNames),
      createdAt,
      createdAt
    );

    const logNodeId = uid("node");
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      logNodeId,
      input.ownerId,
      input.visibility,
      entryId,
      input.projectId,
      "log",
      input.title,
      input.aiSummary || input.body.slice(0, 120),
      createdAt
    );

    if (input.projectId) {
      const projectNode = db
        .prepare("SELECT id FROM knowledge_nodes WHERE project_id = ? AND type = 'project' LIMIT 1")
        .get(input.projectId) as { id: string } | undefined;
      if (projectNode) {
        db.prepare(
          "INSERT INTO knowledge_edges (id, owner_id, visibility, source_node_id, target_node_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(uid("edge"), input.ownerId, input.visibility, projectNode.id, logNodeId, "包含", createdAt);
      }
    }

    for (const node of input.analysisNodes.slice(0, 6)) {
      const existing = db
        .prepare(
          "SELECT id FROM knowledge_nodes WHERE label = ? AND type = ? AND (owner_id = ? OR visibility = 'shared') LIMIT 1"
        )
        .get(node.label, node.type, input.ownerId) as { id: string } | undefined;
      const nodeId = existing?.id || uid("node");
      if (!existing) {
        db.prepare(
          "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(
          nodeId,
          input.ownerId,
          input.visibility,
          entryId,
          input.projectId,
          node.type,
          node.label,
          node.description,
          createdAt
        );
      }
      db.prepare(
        "INSERT INTO knowledge_edges (id, owner_id, visibility, source_node_id, target_node_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(uid("edge"), input.ownerId, input.visibility, logNodeId, nodeId, "提到", createdAt);
    }
  });

  tx();
  return entryId;
}

export function insertComment(input: {
  entryId: string;
  authorId: string;
  intent: Comment["intent"];
  body: string;
}) {
  getDb()
    .prepare("INSERT INTO comments (id, entry_id, author_id, intent, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(uid("comment"), input.entryId, input.authorId, input.intent, input.body, now());
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
  const db = getDb();
  const createdAt = now();
  const decisionId = uid("decision");
  const nodeId = uid("node");
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO decisions
       (id, owner_id, visibility, project_id, title, context, options, decision, reasoning, confidence, expected_outcome, review_date, actual_outcome, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      decisionId,
      input.ownerId,
      input.visibility,
      input.projectId,
      input.title,
      input.context,
      JSON.stringify(input.options),
      input.decision,
      input.reasoning,
      input.confidence,
      input.expectedOutcome,
      input.reviewDate,
      "",
      "open",
      createdAt,
      createdAt
    );
    db.prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      nodeId,
      input.ownerId,
      input.visibility,
      null,
      input.projectId,
      "decision",
      input.title,
      `${input.decision}。${input.reasoning}`,
      createdAt
    );
  });
  tx();
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
  getDb()
    .prepare(
      "INSERT INTO knowledge_nodes (id, owner_id, visibility, source_entry_id, project_id, type, label, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      uid("node"),
      input.ownerId,
      input.visibility,
      null,
      input.projectId,
      input.type,
      input.label,
      input.description,
      now()
    );
}

export function insertGraphEdge(input: {
  ownerId: string;
  visibility: Visibility;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
}) {
  getDb()
    .prepare(
      "INSERT INTO knowledge_edges (id, owner_id, visibility, source_node_id, target_node_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      uid("edge"),
      input.ownerId,
      input.visibility,
      input.sourceNodeId,
      input.targetNodeId,
      input.relation,
      now()
    );
}

export function canViewEntry(entryId: string, viewerId: string) {
  const row = getDb()
    .prepare("SELECT owner_id, visibility FROM entries WHERE id = ?")
    .get(entryId) as { owner_id: string; visibility: Visibility } | undefined;
  return Boolean(row && (row.owner_id === viewerId || row.visibility === "shared"));
}
