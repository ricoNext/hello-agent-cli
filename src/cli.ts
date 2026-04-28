import { Command } from "commander";

const { runAgentPipe } = await import("./agent/loop.js");

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
        const { runRepl } = await import("./ui/repl.js");
        await runRepl({ model: opts.model });
        return;
      }

      await runAgentPipe({
        prompt,
        model: opts.model,
        maxTurns: Number(opts.maxTurns ?? 16),
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
