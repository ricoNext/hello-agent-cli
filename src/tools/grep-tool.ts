import path from "node:path";
import type { AgentTool } from "./types";

const MAX_LINES = 250;

export const grepTool: AgentTool = {
  name: "grep",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "grep",
      description:
        "在文件内容中搜索正则表达式，返回匹配行（带行号）。" +
        "搜索代码内容时优先使用本工具，而非 bash grep 或 bash rg。" +
        "支持递归搜索、文件类型过滤、大小写忽略。",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "正则表达式，如 'function\\\\s+\\\\w+' 或 'TODO'",
          },
          path: {
            type: "string",
            description:
              "搜索目录或文件（相对或绝对路径），省略则为当前工作目录",
          },
          glob: {
            type: "string",
            description: "按文件名过滤，如 '*.ts'、'*.{ts,tsx}'",
          },
          case_insensitive: {
            type: "boolean",
            description: "是否忽略大小写，默认 false",
          },
        },
        required: ["pattern"],
      },
    },
  }),
  async execute(args: unknown) {
    // 解析参数 pattern, path, glob, case_insensitive
    const a = args as {
      pattern?: unknown;
      path?: unknown;
      glob?: unknown;
      case_insensitive?: unknown;
    };
    const pattern = typeof a.pattern === "string" ? a.pattern : "";
    if (!pattern.trim()) {
      return "错误：pattern 为空";
    }

    // 搜索根目录
    const searchPath =
      typeof a.path === "string" && a.path.trim()
        ? path.resolve(process.cwd(), a.path)
        : process.cwd();
    // 解析 glob 模式
    const globPattern = typeof a.glob === "string" ? a.glob.trim() : "";
    // 解析是否忽略大小写
    const caseInsensitive = a.case_insensitive === true;

    // 构建 grep 参数
    // -r: 递归  -n: 显示行号  --include: 文件过滤  --exclude-dir: 排除目录
    const grepArgs: string[] = ["-r", "-n", "--exclude-dir=.git"];
    if (caseInsensitive) {
      grepArgs.push("-i");
    }
    if (globPattern) {
      // glob 模式作为 --include 传入（如 "*.ts" → --include=*.ts）
      grepArgs.push(`--include=${globPattern}`);
    }
    // pattern 和搜索路径放最后
    grepArgs.push(pattern, searchPath);

    // 使用 Bun.spawn 执行，与 bash.ts 的 executeBash 保持一致
    const proc = Bun.spawn(["grep", ...grepArgs], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode > 1) {
      // grep 约定：exitCode 0 = 有匹配，1 = 无匹配，>1 = 出错
      return `错误：grep 执行失败\n${stderr.trim()}`;
    }
    if (!stdout.trim()) {
      return "未找到匹配内容";
    }

    // 截断输出，防止撑爆上下文
    const lines = stdout.split("\n").filter(Boolean);
    const truncated = lines.length > MAX_LINES;
    const output = lines.slice(0, MAX_LINES).join("\n");

    return truncated
      ? `${output}\n…(截断，共 ${lines.length} 行，可缩小搜索范围)`
      : output;
  },
};
