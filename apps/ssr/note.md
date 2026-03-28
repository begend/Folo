# Folo SSR 架构与时序说明

## 1. 框架栈总览

### 1.1 服务端运行时

- Node Runtime: Fastify + `@fastify/request-context` + `@fastify/middie`
  - 入口：`apps/ssr/index.ts`
  - 路由挂载：`ogRoute(app)` + `globalRoute(app)`
- Edge Runtime: Cloudflare Workers + Hono
  - 入口：`apps/ssr/worker-entry.ts`
  - 路由同样覆盖 OG/Share/Auth 页面
  - 通过 `wrangler.jsonc` 绑定静态资源与 R2 字体桶

### 1.2 客户端（SSR 前端壳）

- React 19 + React Router 7
- Vite 构建，`vite-plugin-route-builder` 从 `client/pages` 生成路由
- TanStack Query 作为数据获取层
- Jotai 维护轻量全局状态

### 1.3 数据与 API 访问

- `@follow-app/client-sdk` 作为统一 API SDK
- SSR 服务端调用上游 API 使用：
  - `createFollowClient()`（SDK）
  - `createApiFetch()`（ofetch）
- 客户端页面调用上游 API 使用：
  - `client/lib/api-fetch.ts` 中的 `followClient`

### 1.4 OG 图片渲染栈

- Satori（React 节点转 SVG）
- Resvg（SVG 转 PNG）
- Node 环境使用 `@resvg/resvg-js`
- Worker 环境使用 wasm shim

---

## 2. 系统架构

### 2.1 高层分层

1. 请求入口层（Fastify/Hono）
2. 路由分发层（OG 路由、Global SSR 路由、Redirect）
3. 元数据注入层（`injectMetaHandler` + metadata map）
4. 上游 API 访问层（Follow SDK/ofetch）
5. HTML 注入层（meta/title/hydrate/env）
6. 浏览器 CSR 层（Router + React Query，优先消费 `window.__HYDRATE__`）

### 2.2 关键目录职责

- `apps/ssr/src/router/*`
  - `global.ts`: HTML 模板渲染与 metadata 注入
  - `og/*`: OG 图片接口
- `apps/ssr/src/meta-handler.ts`
  - URL 匹配 metadata handler
- `apps/ssr/client/pages/*`
  - 页面与 metadata 定义（`metadata.ts`）
- `apps/ssr/client/query/*`
  - 客户端 query hooks（支持 initialData hydrate）
- `apps/ssr/src/lib/api-client.ts`
  - SSR 访问上游 API 的客户端构建与请求头注入

### 2.3 Node 与 Worker 差异

- Node（Fastify）偏本地开发与传统 SSR 服务部署
- Worker（Hono）用于 Cloudflare 生产/边缘部署
- 二者都复用 metadata 注入与 OG 渲染逻辑，保持行为一致

---

## 3. 对外接口清单（apps/ssr 暴露）

## 3.1 OG 接口

- `GET /og/feed/:id`
- `GET /og/list/:id`
- `GET /og/user/:id`

用途：为分享卡片提供动态 OpenGraph 图片。

### 3.2 分享页与认证页 SSR 接口

- `GET /share/feeds/:id`
- `GET /share/lists/:id`
- `GET /share/users/:id`
- `GET /login`
- `GET /register`
- `GET /forget-password`
- `GET /reset-password`

用途：返回注入了 SEO metadata 与 hydrate 数据的 HTML。

### 3.3 Redirect 接口（Worker）

- `GET /feed/:id -> /share/feeds/:id`
- `GET /list/:id -> /share/lists/:id`
- `GET /profile/* -> /share/users/*`

### 3.4 其它

- `GET /healthz`（`worker-app.ts` Fastify 版本中的健康检查）
- `GET *`（Worker SPA fallback，返回静态 index.html 并注入 env）

---

## 4. 核心流程时序图（PC 到最底层）

## 4.1 分享页 SSR 主链路（推荐主读）

```mermaid
sequenceDiagram
    autonumber
    actor U as User(Browser PC)
    participant EDGE as SSR Runtime(Fastify/Hono)
    participant GR as globalRoute/ssrHandler
    participant MH as injectMetaHandler
    participant MAP as metadata route map
    participant FC as FollowClient/ofetch
    participant API as api.folo.is
    participant HTML as linkedom(template DOM)
    participant HY as window.__HYDRATE__
    participant CSR as React Query(Client)

    U->>EDGE: GET /share/feeds/:id
    EDGE->>GR: 命中 SSR 页面路由
    GR->>HTML: 读取模板并 parseHTML
    GR->>MH: 触发 metadata 注入
    MH->>MAP: 按 pathname 匹配 metadata handler
    MAP->>FC: 调用上游 API (feeds/lists/profiles...)
    FC->>API: HTTP 请求
    API-->>FC: 返回业务数据
    FC-->>MH: metadata + hydrate 数据
    MH->>HTML: 注入 title/meta/openGraph/window.__HYDRATE__
    GR-->>U: 返回最终 HTML

    U->>CSR: 浏览器执行前端脚本
    CSR->>HY: 读取 initialData
    alt 命中 hydrate
        CSR-->>U: 直接首屏渲染
    else 未命中
        CSR->>API: 发起 query 请求
        API-->>CSR: 返回数据
        CSR-->>U: 渲染
    end
```

## 4.2 OG 图片接口链路

```mermaid
sequenceDiagram
    autonumber
    actor U as User/Crawler
    participant EDGE as SSR Runtime
    participant OGR as ogRoute
    participant FC as FollowClient
    participant API as api.folo.is
    participant RENDER as Satori+Resvg

    U->>EDGE: GET /og/:type/:id
    EDGE->>OGR: 匹配 ogRoute
    OGR->>FC: 根据 type 拉取 feed/list/user 数据
    FC->>API: 请求上游 API
    API-->>FC: 返回实体数据
    OGR->>RENDER: 组件 -> SVG -> PNG
    RENDER-->>OGR: image buffer
    OGR-->>U: 200 image/png + CDN Cache-Control
```

## 4.3 PC 主应用（`/timeline`）数据主链路（对照）

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant R as Desktop Renderer
    participant INIT as initializeApp
    participant HYD as hydrateDatabaseToStore
    participant DB as Local SQLite
    participant STORE as Zustand Store
    participant Q as useEntriesByView
    participant ES as entrySyncServices
    participant API as api.folo.is
    participant EC as EntryContent

    U->>R: 打开 /timeline/*
    R->>INIT: initializeApp
    INIT->>HYD: hydrateDatabaseToStore
    HYD->>DB: 读取本地缓存
    DB-->>STORE: 回灌 feed/subscription/entry

    R->>Q: 拉取条目列表
    Q->>ES: fetchEntries
    ES->>API: entries.list/inbox.list
    API-->>ES: 返回条目
    ES-->>STORE: upsert + 持久化

    U->>EC: 打开某 entry
    EC->>ES: fetchEntryDetail
    ES->>API: entries.get
    API-->>EC: content/readability
    EC-->>U: 渲染详情
```

---

## 5. 接口逐条流程详解

## 5.1 `GET /share/feeds/:id`

1. `globalRoute` 接收请求，创建模板 DOM
2. `injectMetaHandler` 根据 path 匹配 `share/feeds/[id]/metadata.ts`
3. metadata 中调用 `apiClient.api.feeds.get({ id })`
4. 返回 `openGraph + title + hydrate + apple-itunes-app`
5. 注入 HTML 后返回
6. 客户端 `useFeed()` 从 hydrate key `feeds.$get,query:id=${id}` 读取 initialData

## 5.2 `GET /share/lists/:id`

1. 匹配 `share/lists/[id]/metadata.ts`
2. 调用 `apiClient.api.lists.get({ listId })`
3. 注入 OG/title/hydrate
4. 客户端 `useList()` 使用 hydrate key `lists.$get,query:listId=${id}`

## 5.3 `GET /share/users/:id`

1. 匹配 `share/users/[id]/metadata.ts`
2. 先 `profiles.getProfile({ id/handle })`
3. 并行尝试 `subscriptions.get({ userId })` + `lists.list({ userId })`
4. 按成功结果注入多段 hydrate（profile、subscriptions、lists）
5. 客户端页面分别消费三个 query 的 initialData

## 5.4 `GET /login`

1. 匹配 `login/metadata.ts`
2. 服务器请求 `/better-auth/get-providers`
3. 注入 `betterAuth` hydrate
4. 客户端 `useAuthProviders()` 直接使用该 hydrate，减少首屏请求

## 5.5 `GET /og/:type/:id`

1. `ogRoute` 解析 `type`
2. 对应调用 `renderFeedOG/renderListOG/renderUserOG`
3. 渲染函数内部先请求上游 API 获取实体数据
4. 用 Satori + Resvg 生成 PNG
5. 返回图片流并附带缓存头

---

## 6. 最底层组件与职责

- 本地模板/注入层：`linkedom + html-minifier-terser`
- 元数据路由器：`meta-handler.ts + meta-handler.map.ts`
- 上游访问层：`FollowClient/ofetch`
- 图片渲染引擎：`Satori + Resvg(js/wasm)`
- 客户端消费层：`React Router + React Query + window.__HYDRATE__`

---

## 7. 关键源码索引

- Node SSR 入口：`apps/ssr/index.ts`
- Worker 入口：`apps/ssr/worker-entry.ts`
- 全局 SSR 路由：`apps/ssr/src/router/global.ts`
- OG 路由：`apps/ssr/src/router/og/index.ts`
- Metadata 注入器：`apps/ssr/src/meta-handler.ts`
- Metadata 映射：`apps/ssr/src/meta-handler.map.ts`
- Feed metadata：`apps/ssr/client/pages/(main)/share/feeds/[id]/metadata.ts`
- List metadata：`apps/ssr/client/pages/(main)/share/lists/[id]/metadata.ts`
- User metadata：`apps/ssr/client/pages/(main)/share/users/[id]/metadata.ts`
- Login metadata：`apps/ssr/client/pages/(login)/login/metadata.ts`
- 客户端 API：`apps/ssr/client/lib/api-fetch.ts`
- 服务端 API：`apps/ssr/src/lib/api-client.ts`

---

## 8. SSR 在整体系统中的定位

### 8.1 SSR 的角色

- `apps/ssr` 是“渲染与分发层”，核心职责是：
  - 分享页 HTML 输出（包含 SEO metadata）
  - OG 图片动态渲染
  - 登录/注册/找回密码等 Web 页面壳
  - 给浏览器注入 `window.__HYDRATE__` 初始数据
- SSR 不是“业务主存储层”，不负责维护订阅表、文章表等本地业务库。

### 8.2 SSR 与上游 API 的关系

- SSR 通过 Follow SDK/ofetch 调上游 API 拿数据后，组装 HTML 与 metadata。
- 数据主来源是上游 API（`api.folo.is` 或由环境变量指定的 API），而不是 SSR 本地数据库。
- SSR 本身没有“列表同步、详情同步、离线缓存落库”等职责。

### 8.3 SSR 与客户端（Desktop/Mobile）的边界

- SSR：负责“首屏可分享、可爬虫、可预览”。
- Desktop/Mobile：负责“完整阅读体验、同步策略、离线缓存、本地 DB 落库与回灌”。

---

## 9. DB 操作环节说明（谁在写用户订阅表/文章表）

### 9.1 结论

- `apps/ssr` 不承担本地数据库持久化主流程。
- 用户订阅表、文章表等主要由 `@follow/store` + `@follow/database` 在 Desktop/Mobile 运行时操作。

### 9.2 Desktop/Mobile 的本地 DB 流程

1. 启动阶段初始化数据库并做 migrate（平台相关实现）。
2. `hydrateDatabaseToStore` 将本地 DB 数据回灌到内存 store。
3. 业务请求（entries/subscriptions）命中上游 API 后，写入 store。
4. store 的 `tx.persist` 钩子调用 `EntryService/SubscriptionService` 持久化到 DB。

### 9.3 关键写库点

- 文章落库：`entryActions.upsertMany -> EntryService.upsertMany`
- 文章详情 patch：`entryActions.updateEntryContent -> EntryService.patch`
- 订阅落库：`subscriptionActions.upsertMany -> SubscriptionService.upsertMany`
- 订阅清理：`SubscriptionService.delete/reset`

### 9.4 关键代码索引

- Store hydrate：`packages/internal/store/src/hydrate.ts`
- Entry store：`packages/internal/store/src/modules/entry/store.ts`
- Subscription store：`packages/internal/store/src/modules/subscription/store.ts`
- EntryService：`packages/internal/database/src/services/entry.ts`
- SubscriptionService：`packages/internal/database/src/services/subscription.ts`
- Desktop DB：`packages/internal/database/src/db.desktop.ts`
- Mobile DB：`packages/internal/database/src/db.rn.ts`

---

## 10. SSR 依赖上游 API 接口清单（场景 + 入参 + 出参）

### 10.1 服务端 metadata / OG 阶段调用

#### A. `feeds.get`

- 场景：
  - `/share/feeds/:id` 注入 title/description/openGraph/hydrate
  - `/og/feed/:id` 渲染 OG 图
- 入参：`{ id: string }`
- 出参（代码中实际消费）：
  - `data.feed.title`
  - `data.feed.description`
  - `data.entries`（hydrate 给客户端用）
- 代码：
  - `client/pages/(main)/share/feeds/[id]/metadata.ts`
  - `src/router/og/feed.tsx`

#### B. `lists.get`

- 场景：
  - `/share/lists/:id` metadata + hydrate
  - `/og/list/:id` OG 图
- 入参：`{ listId: string }`
- 出参：
  - `data.list.title`
  - `data.list.description`
  - `data.feeds`/`data.list`（hydrate）
- 代码：
  - `client/pages/(main)/share/lists/[id]/metadata.ts`
  - `src/router/og/list.tsx`

#### C. `profiles.getProfile`

- 场景：
  - `/share/users/:id` metadata + hydrate
  - `/og/user/:id` OG 图
- 入参：`{ id?: string, handle?: string }`
  - 若 path 参数是 BizId 则传 `id`
  - 否则传 `handle`
- 出参：
  - `data.id`
  - `data.name`
  - `data.image`
  - 其它 profile 字段（hydrate）
- 代码：
  - `client/pages/(main)/share/users/[id]/metadata.ts`
  - `src/router/og/user.tsx`

#### D. `subscriptions.get`

- 场景：用户分享页并行拉取公开订阅，用于描述文案与 hydrate
- 入参：`{ userId: string }`
- 出参：`data`（订阅数组）
- 代码：`client/pages/(main)/share/users/[id]/metadata.ts`

#### E. `lists.list`

- 场景：用户分享页并行拉取用户列表数据并 hydrate
- 入参：`{ userId: string }`
- 出参：`data`（list 数组）
- 代码：`client/pages/(main)/share/users/[id]/metadata.ts`

#### F. `GET /better-auth/get-providers`（ofetch）

- 场景：`/login` 页面服务端预取登录 provider，首屏直接可渲染
- 入参：无
- 出参：`Record<string, AuthProvider>`
  - 典型字段：`name`、`id`、`icon64`、`iconDark64`
- 代码：`client/pages/(login)/login/metadata.ts`

### 10.2 浏览器端（SSR 页面 hydrate 后）调用

#### A. `status.getConfigs`

- 场景：`ServerConfigsProvider` 拉服务端功能配置并写入 atom
- 入参：无
- 出参：`data`（配置对象）
- 代码：`client/providers/server-configs-provider.tsx`

#### B. `feeds.get`

- 场景：分享 feed 页 query（优先命中 hydrate，未命中再请求）
- 入参：`{ id: string, entriesLimit: 8 }`
- 出参：`data`（feed + entries）
- 代码：`client/query/feed.ts`

#### C. `lists.get`

- 场景：分享 list 页 query
- 入参：`{ listId: string }`
- 出参：`data`
- 代码：`client/query/list.ts`

#### D. `lists.list`

- 场景：用户页 query（用户公开列表）
- 入参：`{ userId: string }`
- 出参：`data`
- 代码：`client/query/list.ts`

#### E. `profiles.getProfile`

- 场景：用户页 query（用户 profile）
- 入参：`{ id?: string, handle?: string }`
- 出参：`data`
- 代码：`client/query/users.ts`

#### F. `subscriptions.get`

- 场景：用户页 query（用户订阅分组）
- 入参：`{ userId?: string }`
- 出参：`data`（订阅数组，前端按 category 分组）
- 代码：`client/query/users.ts`

#### G. `entries.preview`

- 场景：分享页条目预览
- 入参：`{ id: string }`
- 出参：`data`（预览条目数组）
- 代码：`client/query/entries.ts`

### 10.3 认证接口（Auth Client）

#### A. 会话与 provider

- `getSession()`
- `getProviders()`
- 场景：登录状态判断、社交登录入口展示

#### B. 登录注册与找回

- `signIn.social({ provider, callbackURL })`
- `loginHandler("credential", "app", { email, password, headers? })`
- `signUp.email({ email, password, name, callbackURL }, { headers?, onSuccess, onError })`
- `forgetPassword({ email, redirectTo }, { headers? })`
- `resetPassword({ newPassword, token })`
- `twoFactor.verifyTotp({ code })`
- `oneTimeToken.generate()`
- 场景：登录、注册、2FA、找回密码、CLI/DeepLink 一次性令牌

#### C. 代码索引

- Auth 客户端导出：`client/lib/auth.ts`
- 登录流程：`client/modules/login/index.tsx`
- 注册流程：`client/pages/(login)/register.tsx`
- 忘记密码：`client/pages/(login)/forget-password.tsx`
- 重置密码：`client/pages/(login)/reset-password.tsx`
