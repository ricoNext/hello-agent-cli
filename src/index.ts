// src/index.ts
import OpenAI from 'openai'
import type { Message } from './types/message.js'

// 从环境变量读取配置，支持自定义端点（国内代理、本地 Ollama 等）
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL, // 不设置则使用 OpenAI 官方
})

const MODEL = process.env.MODEL ?? 'gpt-4o'

// 核心：调用 LLM 获取回复
async function query(messages: Message[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages,
  })
  return response.choices[0]?.message?.content ?? ''
}

async function main() {
  // 检查 API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error('错误：请设置 OPENAI_API_KEY 环境变量')
    console.error('  export OPENAI_API_KEY=sk-...')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const isPipe = args.includes('-p') || args.includes('--pipe')
  const prompt = args.filter(a => !a.startsWith('-')).join(' ')

  // 获取用户输入：命令行参数 或 stdin 管道
  let userInput = prompt
  if (!userInput && isPipe) {
    userInput = await Bun.stdin.text()
  }

  if (!userInput.trim()) {
    console.error('用法：')
    console.error('  bun run src/index.ts "你的问题"')
    console.error('  echo "你的问题" | bun run src/index.ts -p')
    process.exit(1)
  }

  try {
    const reply = await query([{ role: 'user', content: userInput.trim() }])
    console.log(reply)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`API 错误：${message}`)
    process.exit(1)
  }
}

main()