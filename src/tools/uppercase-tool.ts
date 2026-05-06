import type { AgentTool } from "./types";

export const uppercaseTool: AgentTool = {
  name: "uppercase",
  toOpenAI: () => ({
    type: "function",
    function: {
      name: "uppercase",
      description: '将输入字符串转为大写，返回 JSON：`{ "result": "..." }`。',
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "原始字符串" },
        },
        required: ["text"],
      },
    },
  }),
  execute(args: unknown): Promise<string> {
    const text =
      typeof (args as { text?: unknown })?.text === "string"
        ? (args as { text: string }).text
        : "";
    return Promise.resolve(
      JSON.stringify({ result: text.toUpperCase() }, null, 2)
    );
  },
};
