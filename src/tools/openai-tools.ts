import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const openaiTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "bash",
      description:
        "在项目当前工作目录执行一条 shell 命令，返回 stdout、stderr、exitCode 的 JSON。适合统计文件、运行测试、查看 git 状态等。",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "要执行的 shell 命令，一条字符串",
          },
        },
        // 必填参数
        required: ["command"],
      },
    },
  },
];
