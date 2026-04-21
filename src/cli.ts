import { Command } from 'commander'
import { runQuery } from './agent/query.js'



async function resolvePrompt(parts: string[], isPipe?: boolean): Promise<string> {
    const direct = parts.join(' ').trim()
    if (direct) return direct
    if (isPipe) return (await Bun.stdin.text()).trim()
    return ''
  }
  

export async function runCli(args: string[]): Promise<void> {
    const program = new Command()
  
    program
      .name('myagent')
      .description('一个手把手造出来的 Agent CLI 工具')
      .version('0.2.0', '-v, --version', '显示版本号')
  
    // 默认命令：直接传问题
    program
      .argument('[prompt...]', '要问的问题')
      .option('-p, --pipe', '从 stdin 读取输入（管道模式）')
      .option('-m, --model <name>', '指定模型', process.env.OPENAI_MODEL ?? 'gpt-4o')
      .action(async (promptParts: string[], opts) => {
        const prompt = await resolvePrompt(promptParts, opts.pipe)
        if (!prompt) {
          program.help()
          return
        }
        await runQuery({ prompt, model: opts.model })
      })
  
    // 子命令骨架：auth login / auth logout（先 stub，后续章节实现）
    const auth = program.command('auth').description('管理 API 凭据')
    auth
      .command('login')
      .description('登录并保存 API Key')
      .action(() => {
        console.log('[stub] auth login 将在后续章节实现')
      })
    auth
      .command('logout')
      .description('清除已保存的 API Key')
      .action(() => {
        console.log('[stub] auth logout 将在后续章节实现')
      })
  
    await program.parseAsync(['node', 'myagent', ...args])
  }