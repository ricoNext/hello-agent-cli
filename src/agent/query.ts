import OpenAI from 'openai'
import type { Message } from '../types/message.js'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

export interface QueryOptions {
  prompt: string
  model: string
}

export async function runQuery(opts: QueryOptions): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error('错误：请设置 OPENAI_API_KEY 环境变量')
    process.exit(1)
  }

  try {
    const response = await client.chat.completions.create({
      model: opts.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: opts.prompt }] as Message[],
    })
    console.log(response.choices[0]?.message?.content ?? '')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`API 错误：${message}`)
    process.exit(1)
  }
}