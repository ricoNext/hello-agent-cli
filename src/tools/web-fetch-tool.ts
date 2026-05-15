import type { AgentTool } from "./types";

const MAX_CHARS = 20_000;

export const webFetchTool: AgentTool = {
  name: "web_fetch",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "web_fetch",
      description:
        "获取指定 URL 的网页内容，以 Markdown 格式返回。" +
        "用于读取文档、博客文章、Release Notes 等公开网页。" +
        "获取内容后可结合 web_search 返回的 URL 深入阅读。",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "要获取的完整 URL（须为公开可访问的网页）",
          },
        },
        required: ["url"],
      },
    },
  }),
  async execute(args: unknown) {
    const a = args as { url?: unknown };
    const url = typeof a.url === "string" ? a.url.trim() : "";
    if (!url) {
      return "错误：url 为空";
    }

    // 简单校验 URL 格式
    try {
      new URL(url);
    } catch {
      return `错误：无效的 URL "${url}"`;
    }

    const start = Date.now();
    let response: Response;
    try {
      // Jina AI Reader：将任意网页转换为 Markdown（无需 API Key）
      response = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: "text/markdown" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `错误：网络请求失败 — ${msg}`;
    }

    if (!response.ok) {
      return `错误：HTTP ${response.status} ${response.statusText}`;
    }

    const text = await response.text();
    const durationMs = Date.now() - start;

    // 截断，防止撑爆上下文
    const truncated = text.length > MAX_CHARS;
    const content = truncated ? text.slice(0, MAX_CHARS) : text;

    return JSON.stringify(
      {
        url,
        code: response.status,
        durationMs,
        content: truncated
          ? `${content}\n…(内容已截断，原始长度 ${text.length} 字符)`
          : content,
      },
      null,
      2
    );
  },
};
