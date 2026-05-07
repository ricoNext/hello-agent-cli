import fs from "node:fs/promises";

import {
  assertPathInsideCwd,
  markFileAsRead,
  toWorkspaceAbsolutePath,
} from "./file-session";

import type { AgentTool } from "./types";

// 行分隔符正则表达式
const LINE_ENDING_REGEXP = /\r?\n/;

// 读取文件工具
export const readFileTool: AgentTool = {
  name: "read_file",
  // 转换为 OpenAI 工具格式
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "read_file",
      description:
        "读取工作区内文本文件。返回带行前缀的行文本，便于 edit_file 精确匹配。" +
        "可选 offset/limit。",
      parameters: {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description: "相对或绝对路径（相对则相对当前工作目录）",
          },
          offset: {
            type: "integer",
            description: "起始行号（从 1 开始）。省略则从文件开头读。",
          },
          limit: {
            type: "integer",
            description: "最多读取行数。省略则读到末尾（受 maxLines 截断）。",
          },
        },
        required: ["file_path"],
      },
    },
  }),
  // 执行工具
  async execute(args: unknown) {
    // 解析参数 file_path, offset, limit
    const a = args as {
      file_path?: unknown;
      offset?: unknown;
      limit?: unknown;
    };
    const filePath = typeof a.file_path === "string" ? a.file_path : "";
    if (!filePath.trim()) {
      return "错误：file_path 为空";
    }
    // 转换为绝对路径
    const abs = toWorkspaceAbsolutePath(filePath);
    // 断言路径是否在当前工作区之内
    const guard = assertPathInsideCwd(abs);
    if (guard) {
      return guard;
    }
    // 读取文件最大行数
    const maxLines = 2000;

    // 解析起始行号：省略则从文件开头读。
    let offset =
      typeof a.offset === "number" && Number.isFinite(a.offset)
        ? Math.trunc(a.offset)
        : 1;
    // 解析最多读取行数：省略则读到末尾（受 maxLines 截断）。
    let limit =
      typeof a.limit === "number" && Number.isFinite(a.limit)
        ? Math.trunc(a.limit)
        : maxLines;

    // 如果起始行号小于 1，则从文件开头读。
    if (offset < 1) {
      offset = 1;
    }
    // 如果最多读取行数小于 1，则读到末尾。
    if (limit < 1) {
      limit = maxLines;
    }

    // 读取文件
    let raw: string;
    try {
      raw = await fs.readFile(abs, "utf8");
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return "错误：文件不存在";
      }
      const msg = e instanceof Error ? e.message : String(e);
      return `错误：读取失败 — ${msg}`;
    }

    // 按行分隔
    const lines = raw.split(LINE_ENDING_REGEXP);
    // 截取指定行数
    const slice = lines.slice(offset - 1, offset - 1 + limit);
    // 格式化输出
    const out = slice
      .map((line, i) => {
        const n = offset + i;
        return `${String(n).padStart(6, " ")}→${line}`;
      })
      .join("\n");

    // 标记文件为已读
    markFileAsRead(abs);
    // 截取最大内容： 取 10⁵ 量级 比较常见（约几十到一百多 KB 量级的 UTF-8 文本）
    const cap = 120_000;
    // 返回结果
    return out.length > cap ? `${out.slice(0, cap)}\n...(truncated)` : out;
  },
};
