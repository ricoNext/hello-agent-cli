import path from "node:path";
import type { AgentTool } from "./types";

const MAX_FILES = 100;

export const globTool: AgentTool = {
  name: "glob",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "glob",
      description:
        "按 glob 模式快速匹配工作区内的文件路径（如 '**/*.ts'、'src/**/*.tsx'）。" +
        "查找文件名时优先使用本工具，而非 bash find 或 ls。" +
        "最多返回 100 条结果。",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "glob 模式，如 '**/*.ts'、'src/**/*.{ts,tsx}'",
          },
          path: {
            type: "string",
            description: "搜索根目录（相对或绝对路径），省略则为当前工作目录",
          },
        },
        required: ["pattern"],
      },
    },
  }),
  async execute(args: unknown) {
    // 解析参数 pattern, path
    const a = args as { pattern?: unknown; path?: unknown };
    const pattern = typeof a.pattern === "string" ? a.pattern : "";
    if (!pattern.trim()) {
      return "错误：pattern 为空";
    }

    // 搜索根目录：有传 path 就 resolve，否则用 cwd
    const root =
      typeof a.path === "string" && a.path.trim()
        ? path.resolve(process.cwd(), a.path)
        : process.cwd();

    // 使用 Bun 内建 Glob，scan 返回相对于 cwd 的路径
    const glob = new Bun.Glob(pattern);
    const files: string[] = [];
    let truncated = false;

    for await (const file of glob.scan({ cwd: root })) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        break;
      }
      files.push(file);
    }

    if (files.length === 0) {
      return JSON.stringify({ files: [], numFiles: 0, truncated: false });
    }

    // 字典序排序，结果稳定
    files.sort();

    return JSON.stringify(
      { files, numFiles: files.length, truncated },
      null,
      2
    );
  },
};
