import fs from "node:fs/promises";
import { dirname } from "node:path";

import {
  assertPathInsideCwd,
  clearReadMark,
  toWorkspaceAbsolutePath,
  wasFileReadInSession,
} from "./file-session";
import type { AgentTool } from "./types";

export const writeFileTool: AgentTool = {
  name: "write_file",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "write_file",
      description:
        "向工作区写入文本（整文件覆盖）。若路径已存在须先 read_file；" +
        "新建可直接写入。大段修改更推荐 edit_file。",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "目标路径（相对或绝对）" },
          content: { type: "string", description: "完整文件内容" },
        },
        required: ["file_path", "content"],
      },
    },
  }),
  // 执行工具
  async execute(args: unknown) {
    // 解析参数 file_path, content
    const a = args as { file_path?: unknown; content?: unknown };
    // 解析文件路径
    const filePath = typeof a.file_path === "string" ? a.file_path : "";
    // 解析文件内容
    const content = typeof a.content === "string" ? a.content : "";
    // 如果文件路径为空，则返回错误
    if (!filePath.trim()) {
      return "错误：file_path 为空";
    }
    // 转换为绝对路径
    const abs = toWorkspaceAbsolutePath(filePath);
    // 断言路径是否在当前工作区之内
    const guard = assertPathInsideCwd(abs);
    // 如果路径不在当前工作区之内，则返回错误
    if (guard) {
      return guard;
    }

    // 检查文件是否存在
    let existed = false;
    // 尝试访问文件
    try {
      await fs.access(abs);
      existed = true;
    } catch {
      existed = false;
    }

    // 如果文件存在且未被读取，则返回错误
    // 这个错误主要是用来告诉模型，文件如果存在需要先调用 read_file 读取后再 write_file
    if (existed && !wasFileReadInSession(abs)) {
      return (
        "错误：目标文件已存在，请先用 read_file 读取后再 write_file" +
        "（与先读后写策略一致）"
      );
    }

    // 创建目录
    await fs.mkdir(dirname(abs), { recursive: true });
    // 写入文件
    await fs.writeFile(abs, content, "utf8");
    // 清除文件的已读标记
    clearReadMark(abs);
    // 计算文件字节数
    const bytes = Buffer.byteLength(content, "utf8");
    // 返回结果
    return JSON.stringify({ ok: true, path: abs, bytes }, null, 2);
  },
};
