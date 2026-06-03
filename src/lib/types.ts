export type UserHandle = "lin" | "shelley";
export type Visibility = "private" | "shared";
export type DataScope = "all" | "mine" | "shared" | "partner";
export type SourceType = "text" | "image" | "audio" | "mixed";
export type Mood = "energized" | "steady" | "stuck" | "concerned";
export type NodeType =
  | "log"
  | "project"
  | "idea"
  | "hypothesis"
  | "decision"
  | "lesson"
  | "feedback"
  | "milestone"
  | "question";

export interface User {
  id: string;
  handle: UserHandle;
  name: string;
  avatarColor: string;
}

export interface Project {
  id: string;
  ownerId: string;
  visibility: Visibility;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface Entry {
  id: string;
  ownerId: string;
  visibility: Visibility;
  projectId: string | null;
  title: string;
  body: string;
  sourceType: SourceType;
  mood: Mood;
  confidence: number;
  importance: number;
  tags: string[];
  aiSummary: string;
  assetNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  entryId: string;
  authorId: string;
  intent: "agree" | "question" | "action" | "review";
  body: string;
  createdAt: string;
}

export interface Decision {
  id: string;
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
  actualOutcome: string;
  status: "open" | "reviewed" | "changed";
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNode {
  id: string;
  ownerId: string;
  visibility: Visibility;
  sourceEntryId: string | null;
  projectId: string | null;
  type: NodeType;
  label: string;
  description: string;
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  ownerId: string;
  visibility: Visibility;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  createdAt: string;
}

export interface DashboardPoint {
  date: string;
  count: number;
  confidence: number;
}

export interface Dashboard {
  totalEntries: number;
  sharedEntries: number;
  totalDecisions: number;
  openReviews: number;
  totalNodes: number;
  averageConfidence: number;
  entryTrend: DashboardPoint[];
  tagDistribution: Array<{ name: string; value: number }>;
  projectActivity: Array<{ name: string; value: number }>;
}

export interface AppState {
  viewer: User;
  partner: User;
  users: User[];
  scope: DataScope;
  projects: Project[];
  entries: Entry[];
  comments: Comment[];
  decisions: Decision[];
  graphNodes: KnowledgeNode[];
  graphEdges: KnowledgeEdge[];
  dashboard: Dashboard;
}

export interface AgentSource {
  id: string;
  type: "entry" | "decision" | "node";
  title: string;
  excerpt: string;
  createdAt: string;
}

export interface AgentAnswer {
  answer: string;
  sources: AgentSource[];
}
