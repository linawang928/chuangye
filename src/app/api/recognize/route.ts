import { NextRequest, NextResponse } from "next/server";
import { recognizeAsset } from "@/lib/ai";
import { getViewerHandle } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const handle = getViewerHandle(request);
  if (!handle) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await request.json()) as {
    kind?: "image" | "audio";
    dataUrl?: string;
    mimeType?: string;
    fileName?: string;
  };
  if (!body.kind || !body.dataUrl) {
    return NextResponse.json({ error: "文件信息不完整" }, { status: 400 });
  }

  try {
    const result = await recognizeAsset({
      kind: body.kind,
      dataUrl: body.dataUrl,
      mimeType: body.mimeType || "",
      fileName: body.fileName || "asset"
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "识别失败，请稍后重试或检查 AI 配置" }, { status: 500 });
  }
}
