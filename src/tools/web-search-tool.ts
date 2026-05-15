import { type TavilySearchResponse, tavily } from "@tavily/core";
import type { AgentTool } from "./types";

const MAX_RESULTS = 3;

export const webSearchTool: AgentTool = {
  name: "web_search",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "web_search",
      description:
        "在互联网上搜索关键词，返回最相关的网页列表（标题 + URL + 摘要）。" +
        "适合查找最新信息、技术文档、Changelog 等。" +
        "拿到 URL 后可用 web_fetch 深入读取完整内容。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词",
          },
        },
        required: ["query"],
      },
    },
  }),
  async execute(args: unknown) {
    const a = args as { query?: unknown };
    const query = typeof a.query === "string" ? a.query.trim() : "";
    if (!query) {
      return "错误：query 为空";
    }
    try {
      return await tavilySearch(query);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `错误：搜索失败 — ${msg}`;
    }
  },
};

async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TIVLY_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      error: "未配置 TIVLY_API_KEY，无法执行搜索",
      hint: "请在 https://docs.tavily.com 申请 API Key，并设置环境变量 TIVLY_API_KEY",
    });
  }

  const tvly = tavily({ apiKey });

  // 官方返回值只定义了200的返回值类型，
  // 404 等返回类型未定义， 这里使用联合类型定义了返回值
  const res = (await tvly.search(query, {
    limit: MAX_RESULTS,
  })) as TavilySearchResponse & { detail: { error: string } };

  if (!res.results) {
    return `错误：搜索 API 返回 ${res.detail?.error ?? "未知错误"}`;
  }

  const results = res.results ?? [];

  if (results.length === 0) {
    return JSON.stringify({ query, results: [], message: "未找到相关结果" });
  }

  return JSON.stringify(
    {
      query,
      results,
    },
    null,
    2
  );
}
