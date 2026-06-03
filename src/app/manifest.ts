import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "创业记忆平台",
    short_name: "创业记忆",
    description: "双人创业日志、知识图谱、决策复盘与 Agent 工作台",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f7",
    theme_color: "#0f9f8f",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
