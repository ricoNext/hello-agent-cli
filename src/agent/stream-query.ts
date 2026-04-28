import OpenAI from "openai";
import type { Message } from "../types/message.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export interface StreamQueryOptions {
  messages: Message[];
  model: string;
  /** 每收到一段增量文本时调用（调用频率可能很高） */
  onDelta: (text: string) => void;
}

export interface StreamQueryOptions {
  messages: Message[];
  model: string;
  /** 每收到一段增量文本时调用（调用频率可能很高） */
  onDelta: (text: string) => void;
}

export async function streamChatCompletion(
  opts: StreamQueryOptions
): Promise<void> {
  const stream = await client.chat.completions.create({
    model: opts.model,
    messages: opts.messages,
    max_tokens: 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content ?? "";
    if (piece) {
      opts.onDelta(piece);
    }
  }
}
