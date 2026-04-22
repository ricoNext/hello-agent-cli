# hello-agent-cli

**Hello Agent CLI** 是一个生产级 Agent CLI 搭建的系列教程， 这个系列教程基于 [Claude Code](https://github.com/ricoNext/claude-code) 的源码，从零开始手把手教你如何搭建一个生产级可用的 Agent CLI 工具，并对比 Claude Code 的实现方式，帮助你理解 Agent CLI 工具的实现原理。

喜欢的话， 可以关注一下这个合集， 我会持续更新这个系列教程。

## 项目运行

### 安装依赖

```bash
bun install
```

### 环境变量

至少需要设置 `OPENAI_API_KEY`：

```bash
# 这里设置为通义千问的 API Key 和 Base URL, 你可以根据实际情况设置。
export OPENAI_API_KEY='sk-...'
export OPENAI_BASE_URL='https://dashscope.aliyuncs.com/compatible-mode/v1'
export OPENAI_MODEL='qwen-max'
```

可选变量：

- `OPENAI_BASE_URL`：自定义 API 地址，不设置时使用 OpenAI 官方地址
- `OPENAI_MODEL`：模型名，默认 `gpt-4o`

## 使用方式

### 1) 命令参数输入

```bash
bun run src/index.ts "用一句话介绍 Bun"
```

### 2) 管道输入

```bash
echo "用一句话介绍 Bun" | bun run src/index.ts -p
```

## 说明

项目由 `bun init` 初始化，运行时依赖 [Bun](https://bun.com)。
