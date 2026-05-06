import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { toolsToOpenAI } from "./registry";

export const openaiTools: ChatCompletionTool[] = toolsToOpenAI();
