#!/usr/bin/env node

const VERSION = "0.3.0";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 快速路径 1：--version / -v 直接打印退出，零业务模块加载
  if (args.length === 1 && (args[0] === "--version" || args[0] === "-v")) {
    console.log(VERSION);
    return;
  }

  // 走到这里说明不是快速路径，才动态加载完整 CLI, 下面会实现
  const { runCli } = await import("./cli.js");
  await runCli(args);
}

main();
