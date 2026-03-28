# Folo 标注系统设计文档

> **项目**: Folo RSS 阅读器
> **功能**: 文章标注与笔记系统
> **文档版本**: 1.0
> **创建日期**: 2026-03-28
> **状态**: 设计阶段

---

## 1. 概述

### 1.1 功能目标

为 Folo RSS 阅读器添加完整的文章标注功能，支持用户在阅读文章时进行高亮、记笔记，并将标注内容以 Markdown 格式存储到数据库，支持本地和云端同步。

### 1.2 核心特性

- **多种标注类型**: 文本高亮、独立笔记、高亮+笔记混合
- **Markdown 笔记**: 使用与项目一致的 Markdown 渲染引擎
- **本地优先**: SQLite 本地存储 + 云端同步
- **跨平台**: 桌面端、移动端、Web端自适应交互
- **精确定位**: 混合定位策略，适应文章内容更新

---

## 2. 数据库设计

### 2.1 表结构

创建新的 `annotations` 表，与现有 `entries` 表关联。

```typescript
export const annotationsTable = sqliteTable("annotations", {
  // 主键和关联
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull().references(() => entriesTable.id, { onDelete: 'cascade' }),
  userId: text("user_id"),

  // 标注类型和内容
  type: text("type").notNull().$type<"highlight" | "note" | "mixed">(),

  // 高亮相关
  text: text("text"), // 高亮的原始文本
  color: text("color"), // Highlight color: yellow | green | blue | pink | orange

  // 笔记相关
  note: text("note"), // Markdown formatted note content

  // 位置定位数据（混合策略）
  positionData: text("position_data", { mode: "json" }).$type<{
    textHash?: string,        // MD5 hash for text matching
    contextBefore?: string,   // Context before highlight
    contextAfter?: string,    // Context after highlight
    offset?: number,          // Character offset
    length?: number,          // Text length
    xpath?: string,           // DOM path (fallback)
  }>(),

  // 时间戳
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
})
```

### 2.2 索引设计

```sql
-- 按文章查询标注
CREATE INDEX idx_annotations_entry_created ON annotations(entry_id, created_at DESC);

-- 按用户查询标注
CREATE INDEX idx_annotations_user_created ON annotations(user_id, created_at DESC);

-- 按类型筛选
CREATE INDEX idx_annotations_type ON annotations(type);

-- 同步状态查询
CREATE INDEX idx_annotations_synced ON annotations(synced_at);
```

### 2.3 数据迁移

创建迁移文件: `packages/internal/database/src/drizzle/0038_annotations.sql`

---

## 3. API 设计

### 3.1 服务接口

```typescript
interface AnnotationService {
  // 创建标注
  createAnnotation(data: CreateAnnotationDTO): Promise<Annotation>

  // 获取文章的所有标注
  getAnnotationsByEntry(entryId: string): Promise<Annotation[]>

  // 更新标注
  updateAnnotation(id: string, data: UpdateAnnotationDTO): Promise<Annotation>

  // 删除标注
  deleteAnnotation(id: string): Promise<void>

  // 批量操作（同步用）
  batchCreate(annotations: Annotation[]): Promise<void>
  batchUpdate(annotations: Annotation[]): Promise<void>
  batchDelete(ids: string[]): Promise<void>

  // 同步相关
  getUnsyncedAnnotations(): Promise<Annotation[]>
  markAsSynced(ids: string[]): Promise<void>
  fetchRemoteAnnotations(entryId: string): Promise<Annotation[]>
}

// 数据传输对象
interface Annotation {
  id: string
  entryId: string
  type: "highlight" | "note" | "mixed"
  text?: string
  color?: string
  note?: string
  positionData: PositionData
  createdAt: number
  updatedAt: number
  syncedAt?: number
}

interface PositionData {
  textHash?: string
  contextBefore?: string
  contextAfter?: string
  offset?: number
  length?: number
  xpath?: string
}
```

### 3.2 服务层实现

创建服务文件: `packages/internal/database/src/services/annotations.ts`

遵循现有服务层模式，参考 `entries`、`summaries` 等服务的实现。

---

## 4. 前端架构

### 4.1 组件结构

```
packages/internal/components/
├── annotations/
│   ├── AnnotationHighlight.tsx        # 文章内高亮渲染
│   ├── AnnotationPanel.tsx            # 统一面板（自适应）
│   ├── AnnotationEditor.tsx           # 笔记编辑器（复用 lexical）
│   ├── AnnotationToolbar.tsx          # 浮动工具栏
│   └── hooks/
│       └── useAnnotations.ts          # 统一的数据 hook
```

### 4.2 状态管理

使用项目现有的状态管理架构：

```typescript
// Jotai atoms (packages/internal/atoms/annotations.ts)
export const annotationsAtom = atom<Map<string, Annotation>>(new Map())
export const activeAnnotationAtom = atom<string | null>(null)
export const sidebarVisibleAtom = atom(false)
export const annotationColorsAtom = atom<string>('yellow')

// TanStack Query (packages/internal/store/annotations/hooks.ts)
export function useAnnotationsByEntry(entryId: string) {
  return useQuery({
    queryKey: ['annotations', entryId],
    queryFn: () => annotationService.getAnnotationsByEntry(entryId),
  })
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: annotationService.createAnnotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations'] })
    },
  })
}
```

### 4.3 文本选择和高亮

使用 `react-highlight-within-textarea` 库：

```typescript
// packages/internal/components/annotations/hooks/useAnnotationSelection.ts
export function useAnnotationSelection(entryId: string) {
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString()
    const range = selection.getRangeAt(0)

    // 计算位置数据（混合策略）
    const positionData: PositionData = {
      textHash: md5(text),
      contextBefore: getTextBefore(range, 50),
      contextAfter: getTextAfter(range, 50),
      offset: calculateOffset(range),
      length: text.length,
    }

    // 显示浮动工具栏
    showToolbar(range.getBoundingClientRect())
  }, [entryId])

  return { handleTextSelection }
}
```

### 4.4 Markdown 编辑器

复用项目现有的 Markdown 渲染和编辑方案：

```typescript
// 使用 lexical 富文本编辑器（与 AI Chat 一致）
import { LexicalEditor } from "@follow/components/ui/lexical-rich-editor"

<AnnotationEditor>
  <LexicalEditor
    value={note}
    onChange={setNote}
    features={['markdown', 'gfm', 'code-highlight']}
  />
</AnnotationEditor>
```

---

## 5. 平台适配

### 5.1 响应式布局策略

```typescript
const useAnnotationLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  if (isMobile) return 'drawer'      // 移动端：底部抽屉
  if (isTablet) return 'overlay'     // 平板：浮层
  return 'sidebar'                   // 桌面：右侧边栏
}
```

### 5.2 桌面端实现

```typescript
// apps/desktop/layer/renderer/src/modules/entry-content/annotations/
<EntryContent>
  <EntryText />
  <AnnotationSidebar />    {/* 右侧固定面板 */}
</EntryContent>

// 特性：
- 鼠标选择文本 → 浮动工具栏
- 右侧面板始终可见（可折叠）
- 快捷键：Cmd+H 高亮，Cmd+N 笔记
```

### 5.3 移动端实现

```typescript
// apps/mobile/src/modules/entry-content/annotations/
<EntryContent>
  <EntryText />
  <AnnotationFabButton />  {/* 悬浮按钮 */}
  <AnnotationDrawer />     {/* 底部抽屉 */}
</EntryContent>

// 特性：
- 长按选择文本 → 底部操作菜单
- 触觉反馈
- 滑动手势关闭抽屉
```

### 5.4 WebView 集成

对于使用 WebView 渲染的文章内容：

```typescript
// 注入标注脚本
const injectAnnotationScript = () => {
  window.webkit?.messageHandlers.annotation.postMessage({
    type: 'textSelected',
    text: selectedText,
    range: rangeData
  })
}

// 接收 WebView 消息
useEffect(() => {
  const handler = (data) => {
    if (data.type === 'textSelected') {
      showAnnotationToolbar(data)
    }
  }
  webViewRef.current?.addEventListener('message', handler)
}, [])
```

---

## 6. 数据同步

### 6.1 同步策略

采用与现有 `summaries`、`translations` 相同的同步机制：

```typescript
// 同步流程
1. 定时检查本地未同步标注 (syncedAt === null)
2. 批量上传到服务器
3. 下载服务端最新标注
4. 合并冲突（以 updatedAt 为准）
5. 更新本地数据库
```

### 6.2 冲突解决

```typescript
// 合并策略
function mergeAnnotations(local: Annotation[], remote: Annotation[]): Annotation[] {
  const merged = new Map<string, Annotation>()

  // 添加本地标注
  local.forEach(a => merged.set(a.id, a))

  // 合并远程标注（updatedAt 更新的优先）
  remote.forEach(a => {
    const existing = merged.get(a.id)
    if (!existing || a.updatedAt > existing.updatedAt) {
      merged.set(a.id, a)
    }
  })

  return Array.from(merged.values())
}
```

---

## 7. 定位策略实现

### 7.1 混合定位算法

```typescript
// 优先级：文本匹配 > 偏移量 > DOM 路径
function findAnnotationPosition(article: HTMLElement, positionData: PositionData): Range | null {
  // 1. 尝试文本 + 上下文匹配
  const byText = findByTextAndContext(article, positionData)
  if (byText) return byText

  // 2. 尝试偏移量匹配
  if (positionData.offset !== undefined) {
    const byOffset = findByOffset(article, positionData.offset, positionData.length)
    if (byOffset) return byOffset
  }

  // 3. 最后尝试 DOM 路径
  if (positionData.xpath) {
    return findByXPath(article, positionData.xpath)
  }

  return null
}
```

### 7.2 容错处理

```typescript
// 文章内容更新后的标注恢复
function restoreAnnotations(article: HTMLElement, annotations: Annotation[]) {
  const restored: Annotation[] = []

  for (const annotation of annotations) {
    const range = findAnnotationPosition(article, annotation.positionData)
    if (range) {
      // 标注有效，恢复高亮
      highlightRange(range, annotation.color)
      restored.push(annotation)
    } else {
      // 标注失效，标记为"已失效"状态
      markAsInvalid(annotation)
    }
  }

  return restored
}
```

---

## 8. 实现计划

### Phase 1: 基础设施（高优先级）

1. 数据库表创建和迁移
2. 服务层 API 实现
3. TanStack Query hooks
4. 基础 Jotai atoms

### Phase 2: 核心功能（高优先级）

1. 文本选择和高亮组件
2. 标注 CRUD 操作
3. 基础 UI 组件（列表、编辑器）
4. 桌面端侧边栏实现

### Phase 3: 平台适配（中优先级）

1. 移动端抽屉组件
2. WebView 集成
3. 响应式布局
4. 平台特定交互优化

### Phase 4: 高级功能（低优先级）

1. 云端同步集成
2. 标注导出功能
3. 标注搜索
4. 数据统计分析

---

## 9. 技术依赖

### 新增依赖

```json
{
  "dependencies": {
    "react-highlight-within-textarea": "^2.0.0"
  }
}
```

### 复用现有依赖

- `@follow/components` - UI 组件库
- `@follow/store` - 状态管理
- `@follow/database` - 数据库服务
- `lexical` - 富文本编辑器
- `unified` + `remark` - Markdown 渲染

---

## 10. 测试策略

### 单元测试

- 标注服务层 API 测试
- 定位算法测试
- 数据同步逻辑测试

### 集成测试

- CRUD 操作端到端测试
- 跨平台交互测试
- WebView 通信测试

### E2E 测试

- 桌面端：Electron 自动化测试
- 移动端：Expo Detox 测试
- Web端：Playwright 测试

---

## 11. 性能优化

1. **虚拟滚动**: 标注列表使用虚拟滚动处理大量数据
2. **懒加载**: 笔记内容按需加载
3. **防抖**: 文本选择事件防抖处理
4. **缓存**: TanStack Query 自动缓存标注数据

---

## 12. 安全考虑

1. **XSS 防护**: Markdown 内容渲染前进行消毒
2. **数据验证**: 所有用户输入进行验证
3. **权限控制**: 用户只能访问自己的标注
4. **加密传输**: HTTPS 传输敏感数据

---

## 附录

### A. 相关文件清单

```
packages/internal/database/src/schemas/index.ts        # 添加 annotations 表
packages/internal/database/src/services/annotations.ts  # 标注服务
packages/internal/database/src/drizzle/0038_*.sql      # 迁移文件
packages/internal/atoms/annotations.ts                 # 状态管理
packages/internal/components/annotations/              # UI 组件
packages/internal/store/annotations/                   # 数据 hooks
apps/desktop/layer/renderer/src/modules/entry-content/annotations/
apps/mobile/src/modules/entry-content/annotations/
```

### B. 参考文档

- [Folo 架构文档](../../Folo-架构文档.md)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Lexical 编辑器](https://lexical.dev/)

---

**文档结束**
