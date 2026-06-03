import OpenAI from "openai";
import type {
  AgentAnswer,
  AgentSource,
  AppState,
  NodeType,
  SourceType
} from "@/lib/types";

interface EntryAnalysis {
  summary: string;
  tags: string[];
  nodes: Array<{ type: NodeType; label: string; description: string }>;
  edges: Array<{ fromLabel: string; toLabel: string; relation: string }>;
}

const fallbackKeywords = [
  "知识图谱",
  "Agent",
  "智能体",
  "复盘",
  "用户访谈",
  "客户反馈",
  "假设",
  "决策",
  "商业模式",
  "产品功能",
  "小程序",
  "PWA",
  "仪表盘",
  "增长",
  "定价",
  "痛点",
  "项目想法"
];

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function trimText(text: string, max = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max)}...`;
}

function parseJsonObject<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export function localAnalyzeEntry(input: {
  title: string;
  body: string;
  tags?: string[];
  sourceType?: SourceType;
}): EntryAnalysis {
  const content = `${input.title}\n${input.body}`;
  const found = fallbackKeywords.filter((keyword) => content.includes(keyword));
  const tags = Array.from(new Set([...(input.tags || []), ...found])).slice(0, 8);
  const summary = trimText(input.body || input.title || "这是一条新的创业记录。", 140);
  const ideaLabels = tags.length > 0 ? tags : [input.title || "新想法"];

  return {
    summary,
    tags,
    nodes: [
      ...ideaLabels.slice(0, 5).map((label) => ({
        type: label.includes("决策")
          ? ("decision" as NodeType)
          : label.includes("假设")
            ? ("hypothesis" as NodeType)
            : ("idea" as NodeType),
        label,
        description: summary
      }))
    ],
    edges: ideaLabels.slice(0, 4).map((label) => ({
      fromLabel: input.title || "创业日志",
      toLabel: label,
      relation: "提到"
    }))
  };
}

export async function analyzeEntry(input: {
  title: string;
  body: string;
  tags?: string[];
  sourceType?: SourceType;
}) {
  const fallback = localAnalyzeEntry(input);
  const client = getClient();

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions:
        "你是一个创业记录系统的信息抽取器。请只输出 JSON，不要输出 Markdown。字段：summary 字符串；tags 字符串数组；nodes 数组，每个节点含 type(label 可为 log/project/idea/hypothesis/decision/lesson/feedback/milestone/question 之一), label, description；edges 数组，每个关系含 fromLabel, toLabel, relation。请控制节点不超过 6 个，标签不超过 8 个。",
      input: `标题：${input.title}\n正文：${input.body}\n已有标签：${(input.tags || []).join(", ")}`
    });
    const parsed = parseJsonObject<EntryAnalysis>(response.output_text || "");
    if (!parsed) {
      return fallback;
    }

    return {
      summary: parsed.summary || fallback.summary,
      tags: Array.from(new Set([...(input.tags || []), ...(parsed.tags || [])])).slice(0, 8),
      nodes: (parsed.nodes || fallback.nodes).slice(0, 6),
      edges: (parsed.edges || fallback.edges).slice(0, 8)
    };
  } catch {
    return fallback;
  }
}

function scoreAgainstQuery(query: string, text: string) {
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const queryParts = Array.from(
    new Set(
      normalizedQuery
        .split(/[\s,，。！？、]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
    )
  );

  let score = normalizedText.includes(normalizedQuery) ? 8 : 0;
  for (const part of queryParts) {
    if (normalizedText.includes(part)) {
      score += 3;
    }
  }

  for (const keyword of fallbackKeywords) {
    if (normalizedQuery.includes(keyword.toLowerCase()) && normalizedText.includes(keyword.toLowerCase())) {
      score += 4;
    }
  }

  return score;
}

export function findRelevantSources(question: string, state: AppState): AgentSource[] {
  const entrySources = state.entries.map((entry) => ({
    id: entry.id,
    type: "entry" as const,
    title: entry.title,
    excerpt: trimText(`${entry.aiSummary || entry.body} 标签：${entry.tags.join("、")}`, 220),
    createdAt: entry.createdAt,
    score: scoreAgainstQuery(
      question,
      `${entry.title} ${entry.body} ${entry.aiSummary} ${entry.tags.join(" ")}`
    )
  }));

  const decisionSources = state.decisions.map((decision) => ({
    id: decision.id,
    type: "decision" as const,
    title: decision.title,
    excerpt: trimText(`${decision.context} 决定：${decision.decision} 原因：${decision.reasoning}`, 220),
    createdAt: decision.createdAt,
    score: scoreAgainstQuery(
      question,
      `${decision.title} ${decision.context} ${decision.decision} ${decision.reasoning}`
    )
  }));

  const nodeSources = state.graphNodes.map((node) => ({
    id: node.id,
    type: "node" as const,
    title: node.label,
    excerpt: trimText(`${node.type}：${node.description}`, 180),
    createdAt: node.createdAt,
    score: scoreAgainstQuery(question, `${node.label} ${node.description} ${node.type}`)
  }));

  const ranked = [...entrySources, ...decisionSources, ...nodeSources]
    .sort((left, right) => right.score - left.score || right.createdAt.localeCompare(left.createdAt))
    .filter((source, index) => source.score > 0 || index < 5)
    .slice(0, 8);

  return ranked.map(({ score: _score, ...source }) => source);
}

export async function answerWithAgent(input: {
  question: string;
  state: AppState;
}): Promise<AgentAnswer> {
  const sources = findRelevantSources(input.question, input.state);
  const client = getClient();

  if (!client) {
    const sourceLines = sources
      .slice(0, 4)
      .map((source, index) => `${index + 1}. ${source.title}：${source.excerpt}`)
      .join("\n");
    return {
      answer:
        sources.length === 0
          ? "我还没有找到足够相关的历史记录。可以先补充一条日志、决策或项目节点，我会把它纳入后续检索。"
          : `我先基于当前可见数据做本地检索判断：\n${sourceLines}\n\n综合来看，这个问题最相关的是这些记录背后的主题。配置 OPENAI_API_KEY 后，我会进一步把这些来源交给大模型，给出更完整的推理、复盘和下一步建议。`,
      sources
    };
  }

  try {
    const context = sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.type}｜${source.title}｜${source.createdAt}\n${source.excerpt}`
      )
      .join("\n\n");
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      instructions:
        "你是两位创业者的创业记忆 Agent。只能基于给定来源回答，并结合创业经验提出判断。回答要清晰、克制、可行动。涉及事实必须用 [1] 这样的来源编号引用；如果资料不足，要说明缺口。",
      input: `用户问题：${input.question}\n\n可用来源：\n${context}`
    });

    return {
      answer: response.output_text || "我检索到了资料，但这次没有生成有效回答。",
      sources
    };
  } catch {
    return {
      answer:
        "我已经检索到相关资料，但大模型调用失败。当前先返回来源，你可以稍后重试或检查 OPENAI_API_KEY / OPENAI_MODEL 配置。",
      sources
    };
  }
}

export async function recognizeAsset(input: {
  kind: "image" | "audio";
  dataUrl: string;
  mimeType: string;
  fileName: string;
}) {
  const client = getClient();
  if (!client) {
    return {
      text:
        input.kind === "image"
          ? "已接收图片。配置 OPENAI_API_KEY 后可自动识别图片文字与关键信息。"
          : "已接收音频。配置 OPENAI_API_KEY 后可自动转写语音内容。"
    };
  }

  if (input.kind === "image") {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "请识别这张图片中的文字、白板内容、便签或创业相关线索，输出可直接加入创业日志的中文记录。"
            },
            {
              type: "input_image",
              image_url: input.dataUrl,
              detail: "high"
            }
          ]
        }
      ]
    });
    return { text: response.output_text || "" };
  }

  const base64 = input.dataUrl.split(",")[1] || "";
  const file = new File([Buffer.from(base64, "base64")], input.fileName, {
    type: input.mimeType || "audio/mpeg"
  });
  const transcription = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"
  });

  return { text: transcription.text || "" };
}
