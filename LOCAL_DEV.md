# 本地开发配置指南

本文档介绍如何在本地运行 Folo 项目。

## 前置要求

- Node.js 18+
- pnpm 10+
- 本地 API 服务器（如果有后端服务）

---

## 快速开始（推荐）

使用自动化脚本一键设置和启动开发环境：

### 1. 首次设置

```bash
# 方式 1：使用 pnpm 命令
pnpm local

# 方式 2：直接运行脚本
./scripts/setup-local.sh
```

脚本会自动：
- 检查 Node.js 和 pnpm 版本
- 创建 `.env` 配置文件
- 交互式选择 API 环境（本地/开发/生产）
- 安装依赖并构建包

### 2. 启动开发服务器

```bash
# 方式 1：使用 pnpm 命令（启动 Web + SSR）
pnpm dev

# 方式 2：直接运行脚本
./scripts/dev.sh
```

访问 http://localhost:2233 查看应用。

### 3. 高级选项

```bash
# 仅启动 Web 应用
./scripts/dev.sh -w

# 启动 Electron 应用
./scripts/dev.sh -e

# 仅启动 SSR 服务
./scripts/dev.sh -s

# 自定义 Web 端口
./scripts/dev.sh --port 3000

# 查看帮助
./scripts/dev.sh --help
```

---

## 手动配置

如果不使用自动化脚本，可以手动完成以下步骤：

### 1. 复制环境变量配置文件

为各个应用创建 `.env` 文件：

```bash
# Desktop 应用
cp apps/desktop/.env.example apps/desktop/.env

# SSR 服务
cp apps/ssr/.env.example apps/ssr/.env

# CLI 工具
cp apps/cli/.env.example apps/cli/.env
```

### 2. 修改 API URL

根据你的本地开发环境，修改各 `.env` 文件中的 `VITE_API_URL` 或 `FOLO_API_URL`：

```bash
# 如果你有本地 API 服务器
VITE_API_URL=http://localhost:3000

# 如果要连接到远程开发环境
VITE_API_URL=https://api.dev.follow.is

# 如果要连接到生产环境
VITE_API_URL=https://api.folo.is
```

### 3. 其他可选配置

#### 关闭第三方服务（本地开发推荐）

在 `apps/desktop/.env` 中留空以下配置以禁用相关服务：

```bash
# 禁用 Sentry 错误监控
VITE_SENTRY_DSN=

# 禁用 PostHog 分析
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=
```

#### RSSHub 配置

在 `apps/landing/.env` 中（如果需要）：

```bash
# RSSHub 路由地址（可选）
RSSHUB_ROUTES_URL=https://docs.rsshub.app/routes.json
```

### 4. 安装依赖

```bash
pnpm install
```

### 5. 启动开发服务器

#### Web/Deskop 应用

```bash
# 开发模式
pnpm dev:web

# 或者单独启动
cd apps/desktop
pnpm dev:web
```

#### SSR 服务

```bash
cd apps/ssr
pnpm dev
```

#### CLI 工具

```bash
cd apps/cli
# 设置 API URL
export FOLO_API_URL=http://localhost:3000

# 登录
pnpm cli login

# 使用 CLI
pnpm cli user
```

---

## 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm local` | 运行环境设置脚本 |
| `pnpm dev` | 运行开发启动脚本（Web + SSR） |
| `pnpm dev:web` | 原生启动 Web + SSR |
| `pnpm dev:electron` | 启动 Electron 应用 |
| `pnpm build:packages` | 构建包 |
| `pnpm typecheck` | 类型检查 |
| `pnpm lint` | 代码检查 |
| `pnpm lint:fix` | 自动修复代码问题 |

---

## 环境变量说明

### Desktop/SSR 应用

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_WEB_URL` | Web 应用地址 | `http://localhost:2233` |
| `VITE_API_URL` | API 服务地址 | `https://api.folo.is` |
| `VITE_IMGPROXY_URL` | 图片代理服务地址 | `http://localhost:2873` |
| `VITE_SENTRY_DSN` | Sentry 错误监控 | - |
| `VITE_INBOXES_EMAIL` | 收件箱邮箱域名 | `@follow.re` |
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog 分析密钥 | - |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog 主机 | - |

### CLI 工具

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FOLO_API_URL` | API 服务地址 | `https://api.folo.is` |
| `FOLO_TOKEN` | 认证令牌 | - |

---

## 故障排除

### API 连接失败

1. 检查 `VITE_API_URL` 是否正确
2. 确认 API 服务器是否正在运行
3. 检查 CORS 配置

### 端口冲突

如果默认端口被占用：

```bash
# 使用自定义端口启动
./scripts/dev.sh --port 3000
```

或修改配置文件：
- Web 应用：修改 `apps/desktop/vite.config.ts` 中的 `server.port`
- SSR 服务：修改 `apps/ssr/index.ts` 中的端口配置

### 认证问题

1. 清除本地存储的认证信息
2. 使用 `folo login` 重新登录
3. 检查 `VITE_API_URL` 指向的环境是否正确

### 依赖安装失败

```bash
# 清理并重新安装
pnpm reinstall
```

---

## 相关文件

### 脚本
- `scripts/setup-local.sh` - 环境设置脚本
- `scripts/dev.sh` - 开发启动脚本

### 配置文件
- `apps/desktop/.env.example` - Desktop 应用环境变量示例
- `apps/ssr/.env.example` - SSR 服务环境变量示例
- `apps/cli/.env.example` - CLI 工具环境变量示例
- `packages/internal/shared/src/env.common.ts` - 通用环境变量默认值
