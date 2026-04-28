import { Command } from "commander";
import { runQuery } from "./agent/query.js";

async function readStdinText(): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function resolvePrompt(
  parts: string[],
  isPipe?: boolean
): Promise<string> {
  const direct = parts.join(" ").trim();
  if (direct) {
    return direct;
  }
  if (isPipe) {
    return (await readStdinText()).trim();
  }
  return "";
}

export async function runCli(args: string[]): Promise<void> {
  const program = new Command();

  program
    .name("myagent")
    .description("一个手把手造出来的 Agent CLI 工具")
    .version("0.2.0", "-v, --version", "显示版本号");

  // 默认命令：直接传问题
  program
    .argument("[prompt...]", "要问的问题")
    .option("-p, --pipe", "从 stdin 读取输入（管道模式）")
    .option("--max-turns <number>", "Agent 最大轮次", "16")
    .option(
      "-m, --model <name>",
      "指定模型",
      process.env.OPENAI_MODEL ?? "gpt-4o"
    )
    .action(async (promptParts: string[], opts) => {
      const prompt = await resolvePrompt(promptParts, opts.pipe);

      // 无参数且非管道：进入交互 REPL
      if (!(prompt || opts.pipe)) {
        // 动态导入 `runRepl` 避免入口阻塞
        const { runRepl } = await import("./ui/repl-app.js");
        await runRepl({ model: opts.model });
        return;
      }

      // 显式指定 -p 才走 Agent 管道
      if (opts.pipe) {
        if (!prompt) {
          console.error("错误：-p 模式下未读取到输入内容");
          return;
        }
        const { runAgentPipe } = await import("./agent/loop.js");
        await runAgentPipe({
          prompt,
          model: opts.model,
          maxTurns: Number(opts.maxTurns ?? 16),
        });
        return;
      }

      // 非 -p 模式：走普通单轮查询
      await runQuery({
        prompt,
        model: opts.model,
      });
    });

  // 子命令骨架：auth login / auth logout（先 stub，后续章节实现）
  const auth = program.command("auth").description("管理 API 凭据");
  auth
    .command("login")
    .description("登录并保存 API Key")
    .action(() => {
      console.log("[stub] auth login 将在后续章节实现");
    });
  auth
    .command("logout")
    .description("清除已保存的 API Key")
    .action(() => {
      console.log("[stub] auth logout 将在后续章节实现");
    });

  await program.parseAsync(["node", "myagent", ...args]);
}
