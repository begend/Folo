# Folo 项目架构文档

> **项目名称**: Folo (RSS 阅读器)
> **项目类型**: 跨平台 Monorepo 应用
> **文档版本**: 1.0
> **生成日期**: 2026-03-28
> **许可证**: AGPL-3.0-only

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 整体架构](#2-整体架构)
- [3. Web/服务器端架构](#3-web服务器端架构)
- [4. Android 端架构](#4-android-端架构)
- [5. 核心业务流程](#5-核心业务流程)
- [6. 数据库设计](#6-数据库设计)

---

## 1. 项目概述

### 1.1 项目定位

**Folo** 是一个现代化的跨平台 RSS 阅读器应用，支持 Web、iOS、Android、macOS、Windows、Linux 全平台。

### 1.2 核心技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.1.0 |
| 状态管理 | Jotai + Zustand | - |
| 数据请求 | TanStack Query | - |
| 样式方案 | Tailwind CSS | 3.4.17 |
| 构建工具 | Vite + Turbo | - |
| 编程语言 | TypeScript | 5.9.3 |
| 包管理器 | pnpm | 10.17.0 |

### 1.3 Monorepo 结构

项目采用 **pnpm workspace** + **Turbo** 构建的典型 Monorepo 架构：

```
Folo/
├── apps/                      # 应用程序
│   ├── desktop/              # 桌面应用 (Electron)
│   ├── mobile/               # 移动应用 (Expo/React Native)
│   ├── landing/              # 落地页 (Next.js)
│   ├── ssr/                  # SSR 服务 (Fastify/Hono)
│   └── cli/                  # CLI 工具
│
├── packages/                 # 共享包
│   ├── internal/             # 内部包
│   │   ├── atoms             # Jotai 状态原子
│   │   ├── components        # UI 组件库
│   │   ├── database          # 数据库层
│   │   ├── hooks             # React Hooks
│   │   ├── logger            # 日志工具
│   │   ├── models            # 数据模型
│   │   ├── shared            # 共享工具
│   │   ├── store             # 状态管理
│   │   ├── tracker           # 分析追踪
│   │   ├── types             # TypeScript 类型
│   │   └── utils             # 工具函数
│   │
│   └── public/               # 公共包
│       ├── configs           # 配置包
│       └── readability       # 文章可读性处理
│
├── pnpm-workspace.yaml       # 工作空间配置
├── turbo.json               # Turbo 配置
└── package.json             # 根包配置
```

---

## 2. 整体架构

### 2.1 应用层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web App   │  │  Desktop    │  │      Mobile         │ │
│  │   (Vite)    │  │  (Electron) │  │  (Expo/React Native)│ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              共享层 (packages/internal)                 ││
│  │  atoms | components | database | hooks | store | utils  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务端层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  SSR Server │  │   Workers   │  │    External API     │ │
│  │  (Fastify)  │  │   (Hono)    │  │  (@follow-app/api)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   数据存储层                             ││
│  │          SQLite (客户端) + Remote API (服务端)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 主要应用概览

| 应用 | 目录 | 技术栈 | 平台 |
|------|------|--------|------|
| **Desktop** | `apps/desktop` | Electron 38.3.0 + React 19 | macOS, Windows, Linux |
| **Mobile** | `apps/mobile` | Expo 54 + React Native 0.81.5 | iOS, Android |
| **Landing** | `apps/landing` | Next.js + React 19 | Web |
| **SSR** | `apps/ssr` | Fastify + Hono | Vercel + Cloudflare Workers |
| **CLI** | `apps/cli` | TypeScript + Commander | Terminal |

### 2.3 共享包说明

| 包名 | 用途 |
|------|------|
| `@follow/atoms` | Jotai 状态原子定义 |
| `@follow/components` | 共享 UI 组件库 |
| `@follow/constants` | 常量定义 |
| `@follow/database` | 数据库层 (Drizzle ORM + SQLite) |
| `@follow/hooks` | 共享 React Hooks |
| `@follow/logger` | 日志工具 |
| `@follow/models` | 数据模型 |
| `@follow/shared` | 共享工具函数 |
| `@follow/store` | Zustand 状态管理 |
| `@follow/tracker` | 分析追踪 |
| `@follow/types` | TypeScript 类型定义 |
| `@follow/utils` | 工具函数库 |

### 2.4 开发工作流

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev:web          # Web 应用
pnpm dev:electron     # 桌面应用
pnpm --filter mobile dev  # 移动应用

# 构建
pnpm build:packages   # 构建共享包
pnpm build:web        # 构建 Web

# 测试
pnpm test             # 运行所有测试
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
```

---

## 3. Web/服务器端架构

### 3.1 服务器架构概览

```
apps/ssr/
├── Fastify 服务器              # 主 SSR 服务器
├── Hono + Cloudflare Workers  # Edge 计算
└── Vercel 部署                # API 入口点
```

### 3.2 环境配置

| 环境 | API URL | Web URL |
|------|---------|---------|
| 生产环境 | `https://api.folo.is` | `https://app.folo.is` |
| 开发环境 | `https://api.dev.follow.is` | `https://dev.follow.is` |
| 本地环境 | `http://localhost:3000` | `http://localhost:2233` |

### 3.3 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Fastify | 5.7.4 | 主要 SSR 服务器 |
| Hono | 4.12.1 | Cloudflare Workers |
| @fastify/middie | 9.1.0 | 中间件支持 |
| Drizzle ORM | 0.45.1 | 数据库 ORM |
| @follow-app/client-sdk | 0.3.92 | API 客户端 |

### 3.4 路由结构

```
/                          # SSR 全局路由处理器
├── og/:type/:id          # Open Graph 图片生成
│   ├── feed/             # Feed OG 图片
│   ├── user/             # 用户 OG 图片
│   └── list/             # 列表 OG 图片
├── healthz               # 健康检查
├── feed/:id              # Feed 分享重定向
├── list/:id              # 列表分享重定向
└── profile/:path         # 用户资料重定向
```

### 3.5 SSR 元数据处理流程

```typescript
// SSR 元数据注入流程
用户请求 → 路由匹配 → 调用元数据处理器 →
获取数据 → 注入元数据 → 返回渲染页面
```

### 3.6 认证系统

**框架**: Better Auth 1.5.5

**支持的认证方式**:
- Google OAuth
- GitHub OAuth
- Apple OAuth
- 邮箱密码登录
- Magic Link 邮箱登录

**附加功能**:
- 双因素认证 (2FA)
- Stripe 订阅集成

**Session 管理**:
```typescript
// Session token 存储在 Cookie
__Secure-better-auth.session_token

// 请求头处理
headers: {
  "Cookie": `__Secure-better-auth.session_token=${token}`,
  "User-Agent": platformInfo,
  "X-Client-Version": appVersion
}
```

### 3.7 数据层架构

**数据流**:
```
API 响应 → API Morph (数据转换) →
Store (Zustand/Jotai) → UI 更新
```

**数据库**:
- 客户端: SQLite (本地数据库)
- 服务端: Remote API

---

## 4. Android 端架构

### 4.1 项目结构

```
apps/mobile/
├── native/android/                    # 原生 Android 代码
│   └── src/main/java/expo/modules/follownative/
│       ├── FollowNativeModule.kt      # 主模块
│       ├── FollowNativeView.kt        # 主视图组件
│       ├── itempressable/             # 可按压组件
│       │   ├── ItemPressableModule.kt
│       │   └── ItemPressableView.kt
│       └── tabbar/                    # 底部标签栏
│           ├── TabBarModule.kt
│           ├── TabBarRootView.kt
│           ├── TabBarPortalModule.kt
│           ├── TabBarPortalView.kt
│           ├── TabScreenModule.kt
│           ├── TabScreenView.kt
│           └── TabScreenFragment.kt
│
├── src/
│   ├── screens/                       # 页面组件
│   │   ├── (stack)/
│   │   │   ├── (tabs)/               # 主标签页
│   │   │   │   ├── subscriptions.tsx # 订阅列表
│   │   │   │   ├── discover.tsx      # 发现页面
│   │   │   │   └── settings.tsx      # 设置页面
│   │   │   └── entries/              # 文章详情
│   │   └── (modal)/                  # 模态页面
│   ├── modules/                       # 业务模块
│   ├── lib/                           # 工具库
│   └── atoms/                         # 状态管理
```

### 4.2 技术栈

| 类型 | 技术 | 版本 |
|------|------|------|
| 框架 | Expo SDK | 54 |
| React Native | - | 0.81.5 |
| React | - | 19.0.0 |
| 原生语言 | Kotlin | - |
| 样式 | NativeWind (Tailwind) | 4.2.1 |
| 导航 | 自定义 Jotai 导航 | - |
| 状态管理 | Jotai + TanStack Query | - |
| SDK 版本 | compileSdk | 34 |
| SDK 版本 | minSdk | 21 |
| SDK 版本 | targetSdk | 34 |

### 4.3 核心原生模块

#### TabBarModule (底部标签栏)

**实现方式**: ViewPager2

**功能**:
- 多标签页流畅切换
- 底部 Portal 支持
- 原生性能优化

#### ItemPressableModule (可按压组件)

**功能**:
- 原生 Ripple 效果
- 触觉反馈
- 可配置高亮状态

### 4.4 页面导航

**自定义导航系统** (基于 Jotai):

```typescript
// 导航操作
navigation.push(route)      # 页面入栈
navigation.present(route)   # 模态展示
navigation.dismiss()        # 关闭页面
navigation.replace(route)   # 替换当前页面
```

**导航栈结构**:
```
(stack) - 主导航栈
├── (tabs) - 标签页
│   ├── subscriptions
│   ├── discover
│   └── settings
├── entries - 文章详情
└── (modal) - 模态页面
    ├── login
    └── profile
```

### 4.5 网络层

**API 客户端**: FollowClient SDK

**请求拦截器**:
```typescript
// 自动添加
- 缓存破坏参数 (时间戳)
- 认证头
- 设备信息 (User-Agent, 平台, 安装包来源)
```

**响应拦截器**:
```typescript
// 自动处理
- 401 未授权 → 跳转登录
- 会话刷新
- 错误提示
```

### 4.6 数据存储

| 存储类型 | 技术 | 用途 |
|---------|------|------|
| 关系型数据 | expo-sqlite | 本地数据库 |
| 键值存储 | expo-sqlite/kv-store | 通用 KV 存储 |
| 安全存储 | Expo SecureStore | 敏感信息 (Token, Cookie) |

**数据库位置**:
```
${FileSystem.documentDirectory}SQLite/follow.db
```

### 4.7 状态管理

**Jotai** (主要状态管理):
- 配置文件: `src/lib/jotai.ts`
- 持久化: expo-sqlite/kv-store
- 原子化状态管理

**TanStack Query** (服务器状态):
- 配置文件: `src/lib/query-client.ts`
- 缓存时间: 10 分钟
- 失败重试机制
- 持久化到 kv-storage

---

## 5. 核心业务流程

### 5.1 订阅管理流程

```
用户操作 → 添加订阅源
    ↓
API 验证 URL 有效性
    ↓
创建/更新 Feed 记录
    ↓
创建 Subscription 关系
    ↓
开始拉取文章 (Entries)
    ↓
存储到本地数据库
    ↓
更新 UI 列表
```

**相关表**: `feeds`, `subscriptions`, `entries`, `unread`

### 5.2 文章阅读流程

```
用户点击文章
    ↓
检查文章内容完整性
    ↓
如需要 → 获取完整内容
    ↓
WebView 渲染文章
    ↓
标记为已读
    ↓
同步未读计数
    ↓
可选操作:
    - AI 摘要
    - 翻译
    - 收藏
    - 分享
```

**相关表**: `entries`, `unread`, `summaries`, `translations`, `collections`

### 5.3 认证流程

```
用户选择登录方式
    ↓
┌─────────┬─────────┬─────────┐
│ OAuth   │ Magic   │ 密码    │
│ (Google)│  Link   │ 登录    │
└────┬────┴────┬────┴────┬────┘
     │         │         │
     └─────────┼─────────┘
               ▼
      重定向到应用
          ↓
   获取 Session Token
          ↓
  存储到 SecureStore
          ↓
   后续请求携带认证头
```

**相关表**: `users`

### 5.4 AI 摘要流程

```
用户请求 AI 摘要
    ↓
检查本地缓存 (summaries 表)
    ↓
如果缓存存在 → 直接返回
    ↓
如果缓存不存在 →
    ↓
调用 AI API (OpenAI/Claude)
    ↓
生成摘要内容
    ↓
存储到 summaries 表
    ↓
返回给用户
```

**相关表**: `summaries`, `entries`

### 5.5 翻译流程

```
用户选择目标语言
    ↓
检查本地缓存 (translations 表)
    ↓
如果缓存存在 → 直接返回
    ↓
如果缓存不存在 →
    ↓
调用翻译 API
    ↓
翻译标题、描述、内容
    ↓
存储到 translations 表
    ↓
返回翻译结果
```

**相关表**: `translations`, `entries`

### 5.6 同步流程

```
定时触发 / 用户主动触发
    ↓
检查本地变更
    ↓
上传本地变更到服务器
    ↓
获取服务器最新数据
    ↓
合并数据 (冲突解决)
    ↓
更新本地数据库
    ↓
刷新 UI
```

**涉及所有表的数据同步**

---

## 6. 数据库设计

### 6.1 数据库概览

| 属性 | 值 |
|------|-----|
| 数据库类型 | SQLite |
| ORM | Drizzle ORM 0.45.1 |
| 总表数 | 13 张 |
| 迁移版本 | 38 个 (0000-0037) |
| Schema 位置 | `packages/internal/database/src/schemas/index.ts` |

### 6.2 表结构详细定义

#### 1. feeds - 订阅源表

存储 RSS/Atom 订阅源信息。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，订阅源ID |
| title | string | ❌ | 订阅源标题 |
| url | string | ✅ | 订阅源URL |
| description | string | ❌ | 订阅源描述 |
| image | string | ❌ | 订阅源图片URL |
| siteUrl | string | ❌ | 网站URL |
| ownerUserId | string | ❌ | 所有者用户ID |
| errorMessage | string | ❌ | 错误信息 |
| errorAt | string | ❌ | 错误发生时间 |
| subscriptionCount | number | ❌ | 订阅数量 |
| updatesPerWeek | number | ❌ | 每周更新次数 |
| latestEntryPublishedAt | string | ❌ | 最新文章发布时间 |
| tipUserIds | string[] | ❌ | 打赏用户ID列表 (JSON) |
| updatedAt | number | ❌ | 更新时间 (时间戳毫秒) |

---

#### 2. subscriptions - 订阅表

存储用户的订阅关系，支持多种订阅类型。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，订阅ID |
| userId | string | ✅ | 用户ID |
| type | string | ✅ | 类型: "feed" \| "list" \| "inbox" |
| feedId | string | ❌ | 订阅源ID |
| listId | string | ❌ | 列表ID |
| inboxId | string | ❌ | 收件箱ID |
| view | number | ✅ | 视图类型 (FeedViewType枚举) |
| isPrivate | boolean | ✅ | 是否私有 |
| hideFromTimeline | boolean | ❌ | 是否从时间线隐藏 |
| title | string | ❌ | 自定义标题 |
| category | string | ❌ | 分类 |
| createdAt | string | ❌ | 创建时间 |

**多态关联设计**: 通过 `type` 字段决定关联 `feedId`、`listId` 或 `inboxId`。

---

#### 3. inboxes - 收件箱表

存储用户的收件箱信息（通过 Email 订阅）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，收件箱ID |
| title | string | ❌ | 收件箱标题 |
| secret | string | ✅ | 密钥 |

---

#### 4. lists - 订阅列表表

存储用户创建的订阅列表（可分享）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，列表ID |
| userId | string | ❌ | 用户ID |
| title | string | ✅ | 列表标题 |
| description | string | ❌ | 列表描述 |
| image | string | ❌ | 列表图片 |
| feedIds | string | ❌ | 包含的订阅源ID列表 (JSON) |
| view | number | ✅ | 视图类型 (FeedViewType枚举) |
| fee | number | ❌ | 费用 |
| ownerUserId | string | ❌ | 所有者用户ID |
| subscriptionCount | number | ❌ | 订阅数量 |
| purchaseAmount | string | ❌ | 购买金额 |

---

#### 5. users - 用户表

存储用户信息。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，用户ID |
| email | string | ❌ | 邮箱 |
| handle | string | ❌ | 用户名/句柄 |
| name | string | ❌ | 显示名称 |
| image | string | ❌ | 头像URL |
| bio | string | ❌ | 个人简介 |
| website | string | ❌ | 网站链接 |
| isMe | boolean | ❌ | 是否为当前用户 |
| emailVerified | boolean | ❌ | 邮箱是否验证 |
| socialLinks | object | ❌ | 社交链接 (JSON) |

**socialLinks 结构**:
```typescript
{
  twitter?: string
  github?: string
  instagram?: string
  facebook?: string
  youtube?: string
  discord?: string
}
```

---

#### 6. entries - 文章表

存储 RSS/Atom 文章内容（核心表）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，文章ID |
| title | string | ❌ | 文章标题 |
| url | string | ❌ | 文章URL |
| description | string | ❌ | 文章描述 |
| content | string | ❌ | 文章内容 |
| readabilityContent | string | ❌ | 可读性处理后的内容 |
| readabilityUpdatedAt | number | ❌ | 可读性内容更新时间 |
| guid | string | ✅ | 文章GUID |
| author | string | ❌ | 作者 |
| authorUrl | string | ❌ | 作者URL |
| authorAvatar | string | ❌ | 作者头像 |
| feedId | string | ❌ | 订阅源ID |
| inboxHandle | string | ❌ | 收件箱句柄 |
| read | boolean | ❌ | 是否已读 |
| publishedAt | number | ✅ | 发布时间 (时间戳毫秒) |
| insertedAt | number | ✅ | 插入时间 (时间戳毫秒) |
| media | object[] | ❌ | 媒体列表 (JSON) |
| categories | string[] | ❌ | 分类列表 (JSON) |
| attachments | object[] | ❌ | 附件列表 (JSON) |
| extra | object | ❌ | 额外信息 (JSON) |
| language | string | ❌ | 语言 |
| sources | string[] | ❌ | 来源列表 (JSON) |
| settings | object | ❌ | 设置 (JSON, EntrySettings) |

**嵌套类型定义**:

```typescript
// MediaModel - 媒体对象
{
  url: string
  type: "photo" | "video"
  preview_image_url?: string
  width?: number
  height?: number
  blurhash?: string
}

// AttachmentsModel - 附件对象
{
  url: string
  duration_in_seconds?: number | string
  mime_type?: string
  size_in_bytes?: number
  title?: string
}

// ExtraModel - 额外信息
{
  links?: Array<{
    url: string
    type: string
    content_html?: string
  }>
  title_keyword?: string
}
```

---

#### 7. collections - 收藏表

存储用户收藏的文章。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entryId | string | ✅ | 主键，文章ID |
| feedId | string | ❌ | 订阅源ID |
| view | number | ✅ | 视图类型 (FeedViewType枚举) |
| createdAt | string | ❌ | 收藏时间 |

---

#### 8. unread - 未读计数表

存储订阅的未读文章数量。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键 (实际存储 subscription_id) |
| count | number | ✅ | 未读数量 |

**设计特点**: `id` 字段直接存储 `subscription_id`，通过软删除实现。

---

#### 9. summaries - 文章摘要表

存储 AI 生成的文章摘要。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entryId | string | ✅ | 文章ID |
| summary | string | ✅ | 摘要内容 |
| readabilitySummary | string | ❌ | 可读性内容的摘要 |
| language | string | ❌ | 语言 |
| createdAt | string | ✅ | 创建时间 (ISO 字符串) |

**唯一索引**: `(entryId, language)`

---

#### 10. translations - 文章翻译表

存储文章的翻译内容。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entryId | string | ✅ | 文章ID |
| language | string | ✅ | 目标语言 |
| title | string | ❌ | 翻译后的标题 |
| description | string | ❌ | 翻译后的描述 |
| content | string | ❌ | 翻译后的内容 |
| readabilityContent | string | ❌ | 翻译后的可读性内容 |
| createdAt | string | ✅ | 创建时间 |

**唯一索引**: `(entryId, language)`

---

#### 11. images - 图片表

存储图片的颜色信息（用于 UI 主题适配）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | ✅ | 主键，图片URL |
| colors | object | ✅ | 颜色信息 |
| createdAt | number | ✅ | 创建时间 (时间戳毫秒) |

**颜色格式支持三种平台**:

```typescript
// Android 格式
{
  dominant: string
  average: string
  vibrant: string
  darkVibrant: string
  lightVibrant: string
  darkMuted: string
  lightMuted: string
  muted: string
}

// iOS 格式
{
  background: string
  primary: string
  secondary: string
  detail: string
}

// Web 格式 (同 Android)
```

---

#### 12. ai_chat_sessions - AI 聊天会话表

存储 AI 聊天会话信息。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，会话ID |
| title | string | ❌ | 会话标题 |
| isLocal | boolean | ✅ | 是否本地 (默认 false) |
| createdAt | number | ✅ | 创建时间 (时间戳毫秒) |
| updatedAt | number | ✅ | 更新时间 (时间戳毫秒) |

**索引**: `(updatedAt)`

---

#### 13. ai_chat_messages - AI 聊天消息表

存储 AI 聊天的消息记录。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 主键，消息ID |
| chatId | string | ✅ | 会话ID (外键) |
| role | string | ✅ | 角色: "user" \| "assistant" \| "system" |
| status | string | ✅ | 状态: "pending" \| "streaming" \| "completed" \| "error" |
| createdAt | number | ✅ | 创建时间 (时间戳毫秒) |
| finishedAt | number | ❌ | 完成时间 (时间戳毫秒) |
| metadata | object | ❌ | 元数据 (JSON) |
| messageParts | object[] | ❌ | 消息部分列表 (JSON) |

**索引**:
- `(chatId, createdAt)`
- `(status)`
- `(chatId, role)`

**外键约束**: `chatId` → `ai_chat_sessions.id` (ON DELETE CASCADE)

---

### 6.3 表关联关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                              用户层                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   users (用户)                                                  │
│      │                                                          │
│      └──► subscriptions (订阅关系) ◄── unread (未读计数)        │
│                 │                                               │
│          ┌──────┼──────┐                                       │
│          │      │      │                                       │
│          ▼      ▼      ▼                                       │
│       feeds  lists  inboxes                                    │
│          │      │      │                                       │
│          └──────┼──────┘                                       │
│                 ▼                                              │
│             entries (文章)                                      │
│                 │                                              │
│          ┌──────┼──────┐                                       │
│          ▼      ▼      ▼                                       │
│      collections summaries translations                        │
│                                                                 │
│   ai_chat_sessions (AI会话)                                    │
│          │                                                     │
│          ▼                                                     │
│   ai_chat_messages (AI消息)                                    │
│                                                                 │
│   images (独立，无关联)                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 索引汇总

**唯一索引**:
| 表 | 索引字段 |
|----|----------|
| summaries | (entryId, language) |
| translations | (entryId, language) |

**普通索引**:
| 表 | 索引字段 |
|----|----------|
| ai_chat_sessions | (updatedAt) |
| ai_chat_messages | (chatId, createdAt) |
| ai_chat_messages | (status) |
| ai_chat_messages | (chatId, role) |

**外键约束**:
| 表 | 外键 | 引用表 | 级联操作 |
|----|------|--------|----------|
| ai_chat_messages | chatId | ai_chat_sessions.id | ON DELETE CASCADE |

### 6.5 关键设计特点

| 特点 | 说明 |
|------|------|
| **多态关联** | `subscriptions` 表通过 `type` 字段实现多态关联 |
| **时间存储** | 混合使用 ISO 字符串、时间戳毫秒、文本格式 |
| **JSON 字段** | 广泛使用 JSON 存储数组、对象（media, socialLinks 等） |
| **级联删除** | 仅 `ai_chat_messages` 使用外键级联删除 |
| **软删除** | `unread` 表通过主键设计实现软删除 |
| **唯一索引** | `summaries` 和 `translations` 使用组合唯一索引 |

### 6.6 相关文件位置

| 文件类型 | 路径 |
|---------|------|
| Schema 定义 | `/packages/internal/database/src/schemas/index.ts` |
| 类型定义 | `/packages/internal/database/src/schemas/types.ts` |
| 迁移文件 | `/packages/internal/database/src/drizzle/*.sql` |
| 服务层 | `/packages/internal/database/src/services/*.ts` |

---

## 附录

### A. 枚举类型定义

#### FeedViewType
```typescript
enum FeedViewType {
  Articles = 0,        // 文章视图
  Pictures = 1,        // 图片视图
  Videos = 2,          // 视频视图
  SocialMedia = 3,     // 社交媒体视图
  Audio = 4,           // 音频视图
  Notifications = 5     // 通知视图
}
```

#### SupportedActionLanguage
```typescript
type SupportedActionLanguage =
  'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru'
```

### B. 技术债务与改进建议

1. **时间格式统一**: 当前混合使用多种时间格式，建议统一为时间戳毫秒
2. **索引优化**: 部分表缺少必要的查询索引，可能影响性能
3. **外键约束**: 多数表未使用外键约束，依赖应用层维护数据一致性
4. **JSON 字段验证**: JSON 字段缺少数据库层面的验证

---

**文档结束**
