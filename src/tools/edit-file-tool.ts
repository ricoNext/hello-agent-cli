import fs from "node:fs/promises";

import {
  assertPathInsideCwd,
  markFileAsRead,
  toWorkspaceAbsolutePath,
  wasFileReadInSession,
} from "./file-session";
import type { AgentTool } from "./types";

// 编辑文件工具
export const editFileTool: AgentTool = {
  name: "edit_file",
  // 转换为 OpenAI 工具格式
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "edit_file",
      description:
        "在已读取过的文本文件内做精确字符串替换。" +
        "old_string 须唯一，除非 replace_all 为 true。" +
        "不要包含 read_file 返回的行号前缀。",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string" },
          old_string: {
            type: "string",
            description: "要被替换的原文（唯一匹配）",
          },
          new_string: { type: "string", description: "替换后的内容" },
          replace_all: {
            type: "boolean",
            description: "为 true 时替换所有 old_string",
          },
        },
        required: ["file_path", "old_string", "new_string"],
      },
    },
  }),
  // 执行工具
  async execute(args: unknown) {
    // 解析参数 file_path, old_string, new_string, replace_all
    const a = args as {
      file_path?: unknown;
      old_string?: unknown;
      new_string?: unknown;
      replace_all?: unknown;
    };
    const filePath = typeof a.file_path === "string" ? a.file_path : "";
    const oldStr = typeof a.old_string === "string" ? a.old_string : "";
    const newStr = typeof a.new_string === "string" ? a.new_string : "";
    const replaceAll = a.replace_all === true;
    if (!filePath.trim()) {
      return "错误：file_path 为空";
    }
    if (oldStr === newStr) {
      return "错误：old_string 与 new_string 相同，无需修改";
    }

    // 转换为绝对路径
    const abs = toWorkspaceAbsolutePath(filePath);
    // 断言路径是否在当前工作区之内
    const guard = assertPathInsideCwd(abs);
    // 如果路径不在当前工作区之内，则返回错误
    if (guard) {
      return guard;
    }
    // 如果文件未被读取，则返回错误
    if (!wasFileReadInSession(abs)) {
      return "错误：请先用 read_file 读取该文件，再调用 edit_file";
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
    // 如果 replace_all 为 true，则替换所有 old_string
    if (replaceAll) {
      if (!raw.includes(oldStr)) {
        return "错误：找不到任何 old_string";
      }
      // 替换所有 old_string
      raw = raw.split(oldStr).join(newStr);
    } else {
      // 如果 replace_all 为 false，则替换第一个 old_string
      const first = raw.indexOf(oldStr);
      // 如果找不到 old_string，则返回错误
      if (first === -1) {
        return "错误：找不到 old_string，请与磁盘一致（可重新 read_file）";
      }
      // 查找第二个 old_string
      const second = raw.indexOf(oldStr, first + oldStr.length);
      // 如果找到第二个 old_string，则返回错误
      if (second !== -1) {
        return (
          "错误：old_string 出现多次，请扩大上下文使片段唯一，" +
          "或设置 replace_all: true"
        );
      }
      // 得到新的文件内容
      raw = `${raw.slice(0, first)}${newStr}${raw.slice(first + oldStr.length)}`;
    }

    // 写入文件
    await fs.writeFile(abs, raw, "utf8");
    // 标记文件为已读
    markFileAsRead(abs);
    // 返回结果
    return JSON.stringify({ ok: true, path: abs }, null, 2);
  },
};
