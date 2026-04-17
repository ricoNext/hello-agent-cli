# hello-agent-cli

一个基于 Bun + OpenAI SDK 的命令行问答工具，支持：

- 直接通过命令参数提问
- 通过 `stdin` 管道输入提问（`-p` / `--pipe`）
- 自定义 `baseURL`（例如代理服务或兼容 OpenAI API 的本地服务）

## 安装依赖

```bash
bun install
```

## 环境变量

至少需要设置 `OPENAI_API_KEY`：

```bash
export OPENAI_API_KEY=sk-...
```

可选变量：

- `OPENAI_BASE_URL`：自定义 API 地址，不设置时使用 OpenAI 官方地址
- `MODEL`：模型名，默认 `gpt-4o`

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
