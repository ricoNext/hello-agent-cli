import { executeBash } from "./bash";
import type { AgentTool } from "./types";

export const bashTool: AgentTool = {
  name: "bash",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "bash",
      description:
        "在项目当前工作目录执行一条 shell 命令，返回 stdout、stderr、exitCode 的 JSON。",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "要执行的一条 shell 命令" },
        },
        required: ["command"],
      },
    },
  }),
  execute(args: unknown): Promise<string> {
    const command =
      typeof (args as { command?: unknown })?.command === "string"
        ? (args as { command: string }).command
        : "";
    if (!command.trim()) {
      return Promise.resolve("错误：command 为空");
    }
    return executeBash(command);
  },
};
