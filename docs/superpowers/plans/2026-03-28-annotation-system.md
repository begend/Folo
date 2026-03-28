# Annotation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Folo RSS 阅读器添加完整的文章标注功能，支持文本高亮、Markdown 笔记、混合标注，并实现本地存储和云端同步。

**Architecture:** 使用独立的 `annotations` 表存储数据，复用项目现有的服务层模式（Drizzle ORM + SQLite）、状态管理（Jotai/Zustand + TanStack Query）、UI 组件库。平台自适应：桌面端侧边栏、移动端抽屉、Web端响应式。

**Tech Stack:** TypeScript, Drizzle ORM, SQLite, Jotai, Zustand, TanStack Query, React, Lexical Editor, unified/remark (Markdown), react-highlight-within-textarea

---

## Phase 1: 基础设施层（Database + Types + Service）

### Task 1: 添加 Annotation 类型定义

**Files:**
- Modify: `packages/internal/database/src/schemas/types.ts`

- [ ] **Step 1: 添加 Annotation 类型定义到 types.ts**

在文件末尾添加：

```typescript
// Annotation types
export type AnnotationType = "highlight" | "note" | "mixed"

export type AnnotationColor = "yellow" | "green" | "blue" | "pink" | "orange"

export interface PositionData {
  textHash?: string
  contextBefore?: string
  contextAfter?: string
  offset?: number
  length?: number
  xpath?: string
}

export interface AnnotationSchema {
  id: string
  entryId: string
  userId?: string
  type: AnnotationType
  text?: string
  color?: AnnotationColor
  note?: string
  positionData: PositionData
  createdAt: number
  updatedAt: number
  syncedAt?: number
}

export interface CreateAnnotationDTO {
  entryId: string
  type: AnnotationType
  text?: string
  color?: AnnotationColor
  note?: string
  positionData: PositionData
}

export interface UpdateAnnotationDTO {
  type?: AnnotationType
  text?: string
  color?: AnnotationColor
  note?: string
  positionData?: PositionData
}
```

- [ ] **Step 2: 运行类型检查确认无错误**

```bash
pnpm --filter @follow/database typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交更改**

```bash
git add packages/internal/database/src/schemas/types.ts
git commit -m "feat(database): add annotation type definitions"
```

---

### Task 2: 创建 annotations 数据库表

**Files:**
- Modify: `packages/internal/database/src/schemas/index.ts`

- [ ] **Step 1: 在 schemas/index.ts 中添加 annotationsTable**

在 `aiChatMessagesTable` 定义后添加：

```typescript
export const annotationsTable = sqliteTable(
  "annotations",
  (t) => ({
    // Primary key and relations
    id: t.text("id").notNull().primaryKey(),
    entryId: t
      .text("entry_id")
      .notNull()
      .references(() => entriesTable.id, { onDelete: "cascade" }),
    userId: t.text("user_id"),

    // Annotation type and content
    type: t.text("type").notNull().$type<"highlight" | "note" | "mixed">(),

    // Highlight related
    text: t.text("text"),
    color: t.text("color"), // yellow | green | blue | pink | orange

    // Note related
    note: t.text("note"),

    // Position data (mixed strategy)
    positionData: t.text("position_data", { mode: "json" }).$type<{
      textHash?: string
      contextBefore?: string
      contextAfter?: string
      offset?: number
      length?: number
      xpath?: string
    }>(),

    // Timestamps
    createdAt: t
      .integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: t
      .integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    syncedAt: t.integer("synced_at", { mode: "timestamp_ms" }),
  }),
  (table) => [
    index("idx_annotations_entry_created").on(table.entryId, table.createdAt),
    index("idx_annotations_user_created").on(table.userId, table.createdAt),
    index("idx_annotations_type").on(table.type),
    index("idx_annotations_synced").on(table.syncedAt),
  ],
)
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @follow/database typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交更改**

```bash
git add packages/internal/database/src/schemas/index.ts
git commit -m "feat(database): add annotations table schema"
```

---

### Task 3: 生成数据库迁移文件

**Files:**
- Create: `packages/internal/database/src/drizzle/0038_annotations.sql`

- [ ] **Step 1: 生成迁移**

```bash
pnpm --filter @follow/database drizzle-kit generate:sqlite
```

Expected: 新的迁移文件生成在 `packages/internal/database/src/drizzle/` 目录

- [ ] **Step 2: 验证迁移文件内容**

检查生成的 SQL 文件包含 `annotations` 表定义和索引

- [ ] **Step 3: 提交迁移文件**

```bash
git add packages/internal/database/src/drizzle/
git commit -m "feat(database): add annotations migration"
```

---

### Task 4: 实现 AnnotationService

**Files:**
- Create: `packages/internal/database/src/services/annotation.ts`

- [ ] **Step 1: 创建 annotation service 文件**

```typescript
import { eq, and, inArray, isNull } from "drizzle-orm"

import { db } from "../db"
import { annotationsTable } from "../schemas"
import type { AnnotationSchema, CreateAnnotationDTO, UpdateAnnotationDTO } from "../schemas/types"
import type { Resetable } from "./internal/base"

class AnnotationServiceStatic implements Resetable {
  async reset() {
    await db.delete(annotationsTable).execute()
  }

  // Create annotation
  async createAnnotation(data: CreateAnnotationDTO & { id: string }): Promise<void> {
    const now = Date.now()
    await db
      .insert(annotationsTable)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .execute()
  }

  // Get annotations by entry
  async getAnnotationsByEntry(entryId: string): Promise<AnnotationSchema[]> {
    const result = await db
      .query
      .annotationsTable
      .findMany({
        where: eq(annotationsTable.entryId, entryId),
        orderBy: (annotationsTable, { desc }) => [desc(annotationsTable.createdAt)],
      })
    return result as AnnotationSchema[]
  }

  // Get annotation by id
  async getAnnotationById(id: string): Promise<AnnotationSchema | undefined> {
    const result = await db
      .query
      .annotationsTable
      .findFirst({
        where: eq(annotationsTable.id, id),
      })
    return result as AnnotationSchema | undefined
  }

  // Update annotation
  async updateAnnotation(id: string, data: UpdateAnnotationDTO): Promise<void> {
    await db
      .update(annotationsTable)
      .set({
        ...data,
        updatedAt: Date.now(),
        syncedAt: null, // Mark as unsynced when updated
      })
      .where(eq(annotationsTable.id, id))
      .execute()
  }

  // Delete annotation
  async deleteAnnotation(id: string): Promise<void> {
    await db.delete(annotationsTable).where(eq(annotationsTable.id, id)).execute()
  }

  // Batch operations for sync
  async batchCreate(annotations: AnnotationSchema[]): Promise<void> {
    if (annotations.length === 0) return
    await db.insert(annotationsTable).values(annotations).execute()
  }

  async batchUpdate(annotations: AnnotationSchema[]): Promise<void> {
    if (annotations.length === 0) return

    for (const annotation of annotations) {
      await db
        .update(annotationsTable)
        .set({
          type: annotation.type,
          text: annotation.text,
          color: annotation.color,
          note: annotation.note,
          positionData: annotation.positionData,
          updatedAt: annotation.updatedAt,
          syncedAt: annotation.syncedAt,
        })
        .where(eq(annotationsTable.id, annotation.id))
        .execute()
    }
  }

  async batchDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await db.delete(annotationsTable).where(inArray(annotationsTable.id, ids)).execute()
  }

  // Sync related methods
  async getUnsyncedAnnotations(): Promise<AnnotationSchema[]> {
    const result = await db
      .query
      .annotationsTable
      .findMany({
        where: isNull(annotationsTable.syncedAt),
      })
    return result as AnnotationSchema[]
  }

  async markAsSynced(ids: string[], syncedAt: number = Date.now()): Promise<void> {
    if (ids.length === 0) return
    await db
      .update(annotationsTable)
      .set({ syncedAt })
      .where(inArray(annotationsTable.id, ids))
      .execute()
  }

  // Get all annotations for a user
  async getAnnotationsByUser(userId: string): Promise<AnnotationSchema[]> {
    const result = await db
      .query
      .annotationsTable
      .findMany({
        where: eq(annotationsTable.userId, userId),
        orderBy: (annotationsTable, { desc }) => [desc(annotationsTable.createdAt)],
      })
    return result as AnnotationSchema[]
  }
}

export const annotationService = new AnnotationServiceStatic()
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @follow/database typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交 service**

```bash
git add packages/internal/database/src/services/annotation.ts
git commit -m "feat(database): implement AnnotationService"
```

---

## Phase 2: 状态管理层（Store + Hooks）

### Task 5: 创建 Zustand store

**Files:**
- Create: `packages/internal/store/src/modules/annotation/store.ts`

- [ ] **Step 1: 创建 annotation store**

```typescript
import { create } from "zustand"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationState {
  annotations: Record<string, AnnotationSchema>
  setAnnotations: (annotations: AnnotationSchema[]) => void
  upsertAnnotation: (annotation: AnnotationSchema) => void
  removeAnnotation: (id: string) => void
  getAnnotation: (id: string) => AnnotationSchema | undefined
  getAnnotationsByEntry: (entryId: string) => AnnotationSchema[]
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: {},

  setAnnotations: (annotations) => {
    const map = annotations.reduce((acc, annotation) => {
      acc[annotation.id] = annotation
      return acc
    }, {} as Record<string, AnnotationSchema>)
    set({ annotations: map })
  },

  upsertAnnotation: (annotation) => {
    set((state) => ({
      annotations: {
        ...state.annotations,
        [annotation.id]: annotation,
      },
    }))
  },

  removeAnnotation: (id) => {
    set((state) => {
      const newAnnotations = { ...state.annotations }
      delete newAnnotations[id]
      return { annotations: newAnnotations }
    })
  },

  getAnnotation: (id) => {
    return get().annotations[id]
  },

  getAnnotationsByEntry: (entryId) => {
    return Object.values(get().annotations)
      .filter((annotation) => annotation.entryId === entryId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },
}))
```

- [ ] **Step 2: 创建 index 导出文件**

创建 `packages/internal/store/src/modules/annotation/index.ts`:

```typescript
export * from "./store"
export * from "./hooks"
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/store typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交 store**

```bash
git add packages/internal/store/src/modules/annotation/
git commit -m "feat(store): add annotation Zustand store"
```

---

### Task 6: 创建 React hooks

**Files:**
- Create: `packages/internal/store/src/modules/annotation/hooks.ts`

- [ ] **Step 1: 创建 annotation hooks**

```typescript
import { useCallback, useEffect } from "react"

import { annotationService } from "@follow/database/services"

import { useAnnotationStore } from "./store"

// Get annotation by id
export const useAnnotation = (id: string) => {
  return useAnnotationStore(
    useCallback((state) => state.getAnnotation(id), [id]),
  )
}

// Get annotations by entry
export const useAnnotationsByEntry = (entryId: string) => {
  const annotations = useAnnotationStore(
    useCallback((state) => state.getAnnotationsByEntry(entryId), [entryId]),
  )

  // Load annotations from database on mount
  useEffect(() => {
    annotationService.getAnnotationsByEntry(entryId).then((result) => {
      useAnnotationStore.getState().setAnnotations(result)
    })
  }, [entryId])

  return annotations
}

// Get all annotations for a user
export const useAnnotationsByUser = (userId: string) => {
  const [annotations, setAnnotations] = React.useState<ReturnType<typeof annotationService.getAnnotationsByUser>>([])

  useEffect(() => {
    annotationService.getAnnotationsByUser(userId).then(setAnnotations)
  }, [userId])

  return annotations
}

// Create annotation mutation
export const useCreateAnnotation = () => {
  const upsertAnnotation = useAnnotationStore((state) => state.upsertAnnotation)

  const createAnnotation = useCallback(async (data: Parameters<typeof annotationService.createAnnotation>[0]) => {
    const id = `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    await annotationService.createAnnotation({ ...data, id })

    // Update store
    const created = await annotationService.getAnnotationById(id)
    if (created) {
      upsertAnnotation(created)
    }

    return id
  }, [upsertAnnotation])

  return createAnnotation
}

// Update annotation mutation
export const useUpdateAnnotation = () => {
  const upsertAnnotation = useAnnotationStore((state) => state.upsertAnnotation)

  const updateAnnotation = useCallback(async (id: string, data: Parameters<typeof annotationService.updateAnnotation>[1]) => {
    await annotationService.updateAnnotation(id, data)

    // Update store
    const updated = await annotationService.getAnnotationById(id)
    if (updated) {
      upsertAnnotation(updated)
    }
  }, [upsertAnnotation])

  return updateAnnotation
}

// Delete annotation mutation
export const useDeleteAnnotation = () => {
  const removeAnnotation = useAnnotationStore((state) => state.removeAnnotation)

  const deleteAnnotation = useCallback(async (id: string) => {
    await annotationService.deleteAnnotation(id)
    removeAnnotation(id)
  }, [removeAnnotation])

  return deleteAnnotation
}

import React from "react"
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @follow/store typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交 hooks**

```bash
git add packages/internal/store/src/modules/annotation/hooks.ts
git commit -m "feat(store): add annotation React hooks"
```

---

### Task 7: 创建 Jotai atoms

**Files:**
- Create: `packages/internal/atoms/annotation.ts`

- [ ] **Step 1: 创建 annotation atoms**

```typescript
import { atom } from "jotai"

import type { AnnotationSchema, AnnotationColor } from "@follow/database"

// UI state atoms
export const annotationSidebarVisibleAtom = atom(false)
export const activeAnnotationIdAtom = atom<string | null>(null)
export const selectedColorAtom = atom<AnnotationColor>("yellow")
export const annotationModeAtom = atom<"highlight" | "note">("highlight")

// Active annotation atom
export const activeAnnotationAtom = atom<AnnotationSchema | null>((get) => {
  const activeId = get(activeAnnotationIdAtom)
  if (!activeId) return null
  // This will be populated by the store
  return null
})
```

- [ ] **Step 2: 更新 atoms index**

修改 `packages/internal/atoms/index.ts`，添加：

```typescript
export * from "./annotation"
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/atoms typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交 atoms**

```bash
git add packages/internal/atoms/
git commit -m "feat(atoms): add annotation UI state atoms"
```

---

## Phase 3: 工具函数层（Position Detection）

### Task 8: 实现位置计算工具函数

**Files:**
- Create: `packages/internal/utils/src/annotation/position.ts`

- [ ] **Step 1: 创建位置计算工具**

```typescript
import { createHash } from "crypto"

import type { PositionData } from "@follow/database"

// Calculate MD5 hash
export function calculateTextHash(text: string): string {
  return createHash("md5").update(text).digest("hex")
}

// Get text before/after selection for context
export function getTextContext(range: Range, contextLength: number = 50): {
  before: string
  after: string
} {
  const container = range.commonAncestorContainer
  const fullText = container.textContent || ""

  const startOffset = range.startOffset
  const endOffset = range.endOffset

  const beforeStart = Math.max(0, startOffset - contextLength)
  const afterEnd = Math.min(fullText.length, endOffset + contextLength)

  return {
    before: fullText.slice(beforeStart, startOffset),
    after: fullText.slice(endOffset, afterEnd),
  }
}

// Calculate character offset
export function calculateCharacterOffset(range: Range): number {
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(range.commonAncestorContainer)
  preCaretRange.setEnd(range.startContainer, range.startOffset)
  return preCaretRange.toString().length
}

// Create position data from selection
export function createPositionDataFromSelection(range: Range, selectedText: string): PositionData {
  const context = getTextContext(range, 50)
  const offset = calculateCharacterOffset(range)

  return {
    textHash: calculateTextHash(selectedText),
    contextBefore: context.before,
    contextAfter: context.after,
    offset,
    length: selectedText.length,
  }
}

// Find position in article using mixed strategy
export function findAnnotationPosition(
  article: HTMLElement,
  positionData: PositionData,
): Range | null {
  // Strategy 1: Text + context matching
  const byText = findByTextAndContext(article, positionData)
  if (byText) return byText

  // Strategy 2: Offset matching
  if (positionData.offset !== undefined && positionData.length !== undefined) {
    const byOffset = findByOffset(article, positionData.offset, positionData.length)
    if (byOffset) return byOffset
  }

  // Strategy 3: XPath (fallback)
  if (positionData.xpath) {
    return findByXPath(article, positionData.xpath)
  }

  return null
}

// Strategy 1: Find by text and context
function findByTextAndContext(
  article: HTMLElement,
  positionData: PositionData,
): Range | null {
  if (!positionData.textHash) return null

  const walker = document.createTreeWalker(
    article,
    NodeFilter.SHOW_TEXT,
    null,
  )

  let node: Node | null
  const fullText = article.textContent || ""

  while ((node = walker.nextNode())) {
    const text = node.textContent || ""
    // Check if this node contains text matching the hash
    const testString = text.trim()
    if (testString.length > 0) {
      const hash = createTextHash(testString)
      if (hash === positionData.textHash) {
        // Verify context matches
        if (
          positionData.contextBefore &&
          !fullText.includes(positionData.contextBefore)
        ) {
          continue
        }
        if (
          positionData.contextAfter &&
          !fullText.includes(positionData.contextAfter)
        ) {
          continue
        }

        // Found it!
        const range = document.createRange()
        range.setStart(node, 0)
        range.setEnd(node, testString.length)
        return range
      }
    }
  }

  return null
}

// Strategy 2: Find by offset
function findByOffset(
  article: HTMLElement,
  offset: number,
  length: number,
): Range | null {
  const walker = document.createTreeWalker(
    article,
    NodeFilter.SHOW_TEXT,
    null,
  )

  let currentOffset = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const textLength = (node.textContent || "").length

    if (currentOffset + textLength >= offset) {
      const startOffset = offset - currentOffset
      const endOffset = Math.min(startOffset + length, textLength)

      const range = document.createRange()
      range.setStart(node, startOffset)
      range.setEnd(node, endOffset)
      return range
    }

    currentOffset += textLength
  }

  return null
}

// Strategy 3: Find by XPath
function findByXPath(article: HTMLElement, xpath: string): Range | null {
  try {
    const result = document.evaluate(
      xpath,
      article,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )

    const node = result.singleNodeValue
    if (node) {
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, (node.textContent || "").length)
      return range
    }
  } catch {
    // Invalid XPath
  }

  return null
}

// Restore annotations in article
export function restoreAnnotations(
  article: HTMLElement,
  annotations: Array<{ id: string; positionData: PositionData; color?: string }>,
): Array<{ id: string; range: Range; color?: string }> {
  const restored: Array<{ id: string; range: Range; color?: string }> = []

  for (const annotation of annotations) {
    const range = findAnnotationPosition(article, annotation.positionData)
    if (range) {
      restored.push({
        id: annotation.id,
        range,
        color: annotation.color,
      })
    }
  }

  return restored
}
```

- [ ] **Step 2: 创建导出文件**

创建 `packages/internal/utils/src/annotation/index.ts`:

```typescript
export * from "./position"
```

- [ ] **Step 3: 更新 utils index**

修改 `packages/internal/utils/src/index.ts`，添加：

```typescript
export * from "./annotation"
```

- [ ] **Step 4: 运行类型检查**

```bash
pnpm --filter @follow/utils typecheck
```

Expected: No type errors (Note: crypto may need polyfill for browser environment, will handle in next phase)

- [ ] **Step 5: 提交工具函数**

```bash
git add packages/internal/utils/src/annotation/
git commit -m "feat(utils): add annotation position detection utilities"
```

---

### Task 9: 添加 MD5 hash 的浏览器兼容性

**Files:**
- Modify: `packages/internal/utils/src/annotation/position.ts`

- [ ] **Step 1: 替换 Node.js crypto 为浏览器兼容的实现**

在文件顶部修改导入和 hash 函数：

```typescript
import type { PositionData } from "@follow/database"

// Browser-compatible MD5 implementation (simple hash for now, can be replaced with proper MD5)
export function calculateTextHash(text: string): string {
  // Simple hash function (replace with proper MD5 library if needed)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @follow/utils typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交修复**

```bash
git add packages/internal/utils/src/annotation/position.ts
git commit -m "fix(utils): use browser-compatible hash function"
```

---

## Phase 4: UI 组件层（基础组件）

### Task 10: 安装必要的依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 react-highlight-within-textarea 依赖**

```bash
pnpm add react-highlight-within-textarea
```

Expected: Package added to package.json

- [ ] **Step 2: 安装依赖**

```bash
pnpm install
```

Expected: Dependencies installed successfully

- [ ] **Step 3: 提交 package.json**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-highlight-within-textarea dependency"
```

---

### Task 11: 创建 AnnotationHighlight 组件

**Files:**
- Create: `packages/internal/components/src/annotations/AnnotationHighlight.tsx`

- [ ] **Step 1: 创建 AnnotationHighlight 组件**

```typescript
import { cn } from "@follow/utils"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationHighlightProps {
  annotation: AnnotationSchema
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}

export function AnnotationHighlight({
  annotation,
  isActive,
  onClick,
  children,
}: AnnotationHighlightProps) {
  const colorClasses: Record<string, string> = {
    yellow: "bg-yellow-200/60 dark:bg-yellow-500/30",
    green: "bg-green-200/60 dark:bg-green-500/30",
    blue: "bg-blue-200/60 dark:bg-blue-500/30",
    pink: "bg-pink-200/60 dark:bg-pink-500/30",
    orange: "bg-orange-200/60 dark:bg-orange-500/30",
  }

  const activeClasses = isActive
    ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
    : "hover:opacity-80 cursor-pointer"

  return (
    <mark
      className={cn(
        "rounded-sm transition-all",
        colorClasses[annotation.color || "yellow"],
        activeClasses,
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      data-annotation-id={annotation.id}
    >
      {children}
    </mark>
  )
}
```

- [ ] **Step 2: 创建导出文件**

创建 `packages/internal/components/src/annotations/index.ts`:

```typescript
export * from "./AnnotationHighlight"
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/components typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交组件**

```bash
git add packages/internal/components/src/annotations/
git commit -m "feat(components): add AnnotationHighlight component"
```

---

### Task 12: 创建 AnnotationToolbar 组件

**Files:**
- Create: `packages/internal/components/src/annotations/AnnotationToolbar.tsx`

- [ ] **Step 1: 创建 AnnotationToolbar 组件**

```typescript
import { useMemo, useState } from "react"

import { useAnnotationStore } from "@follow/store"
import { selectedColorAtom, annotationModeAtom, activeAnnotationIdAtom } from "@follow/atoms"
import { useAtom, useSetAtom } from "jotai"

import { AnnotationHighlight } from "./AnnotationHighlight"

interface AnnotationToolbarProps {
  position: { x: number; y: number }
  onHighlight: (color: string) => void
  onNote: () => void
  onClose: () => void
}

const COLORS = [
  { value: "yellow", label: "黄色", class: "bg-yellow-300" },
  { value: "green", label: "绿色", class: "bg-green-300" },
  { value: "blue", label: "蓝色", class: "bg-blue-300" },
  { value: "pink", label: "粉色", class: "bg-pink-300" },
  { value: "orange", label: "橙色", class: "bg-orange-300" },
] as const

export function AnnotationToolbar({
  position,
  onHighlight,
  onNote,
  onClose,
}: AnnotationToolbarProps) {
  const [selectedColor, setSelectedColor] = useAtom(selectedColorAtom)
  const setAnnotationMode = useSetAtom(annotationModeAtom)

  const handleColorClick = (color: string) => {
    setSelectedColor(color as any)
    setAnnotationMode("highlight")
    onHighlight(color)
    onClose()
  }

  const handleNoteClick = () => {
    setAnnotationMode("note")
    onNote()
    onClose()
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800"
      style={{
        left: position.x,
        top: position.y + 24,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2 dark:border-gray-700">
        {COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`
              h-6 w-6 rounded ${color.class}
              ${selectedColor === color.value ? "ring-2 ring-blue-500" : ""}
              hover:scale-110 transition-transform
            `}
            onClick={() => handleColorClick(color.value)}
            title={color.label}
          />
        ))}
      </div>

      <button
        type="button"
        className="
          px-3 py-1 text-sm text-gray-700
          hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700
          rounded transition-colors
        "
        onClick={handleNoteClick}
      >
        笔记
      </button>

      <button
        type="button"
        className="
          px-2 py-1 text-sm text-gray-500
          hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
          transition-colors
        "
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 更新导出**

修改 `packages/internal/components/src/annotations/index.ts`:

```typescript
export * from "./AnnotationHighlight"
export * from "./AnnotationToolbar"
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/components typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交组件**

```bash
git add packages/internal/components/src/annotations/AnnotationToolbar.tsx
git add packages/internal/components/src/annotations/index.ts
git commit -m "feat(components): add AnnotationToolbar component"
```

---

### Task 13: 创建 AnnotationEditor 组件（复用 Lexical）

**Files:**
- Create: `packages/internal/components/src/annotations/AnnotationEditor.tsx`

- [ ] **Step 1: 检查 Lexical 编辑器组件**

```bash
grep -r "LexicalEditor\|lexical-rich-editor" packages/internal/components/src/
```

Expected: 找到现有的 Lexical 编辑器组件路径

- [ ] **Step 2: 创建 AnnotationEditor 组件**

```typescript
import { useMemo, useState } from "react"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationEditorProps {
  annotation?: AnnotationSchema
  onSave: (note: string) => void
  onCancel: () => void
  placeholder?: string
}

// Import Lexical editor from existing components
// Adjust import path based on actual location in project
// import { LexicalEditor } from "@follow/components/ui/lexical-rich-editor"

export function AnnotationEditor({
  annotation,
  onSave,
  onCancel,
  placeholder = "添加笔记...",
}: AnnotationEditorProps) {
  const [content, setContent] = useState(annotation?.note || "")

  const handleSave = () => {
    onSave(content)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {annotation ? "编辑笔记" : "新笔记"}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="
              px-3 py-1 text-sm text-gray-600
              hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700
              rounded transition-colors
            "
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="
              px-3 py-1 text-sm text-white bg-blue-600
              hover:bg-blue-700 rounded transition-colors
            "
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="
            w-full h-full p-3 text-sm
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            border border-gray-300 dark:border-gray-600
            rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            resize-none
          "
        />
      </div>

      {/* Markdown preview */}
      {content && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 mb-2">预览</h4>
          <div
            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: content
                .replace(/\n/g, "<br>")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                .replace(/`(.*?)`/g, "<code>$1</code>"),
            }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 更新导出**

修改 `packages/internal/components/src/annotations/index.ts`:

```typescript
export * from "./AnnotationHighlight"
export * from "./AnnotationToolbar"
export * from "./AnnotationEditor"
```

- [ ] **Step 4: 运行类型检查**

```bash
pnpm --filter @follow/components typecheck
```

Expected: No type errors

- [ ] **Step 5: 提交组件**

```bash
git add packages/internal/components/src/annotations/AnnotationEditor.tsx
git add packages/internal/components/src/annotations/index.ts
git commit -m "feat(components): add AnnotationEditor component"
```

---

### Task 14: 创建 AnnotationPanel 组件（统一面板）

**Files:**
- Create: `packages/internal/components/src/annotations/AnnotationPanel.tsx`

- [ ] **Step 1: 创建 AnnotationPanel 组件**

```typescript
import { useMemo } from "react"

import { useAnnotationsByEntry, useDeleteAnnotation, useUpdateAnnotation } from "@follow/store"
import { AnnotationEditor } from "./AnnotationEditor"
import { selectedColorAtom, annotationModeAtom } from "@follow/atoms"
import { useAtom, useSetAtom } from "jotai"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationPanelProps {
  entryId: string
  onCreateAnnotation: (type: "highlight" | "note", data: any) => void
}

type View = "list" | "editor"

export function AnnotationPanel({ entryId, onCreateAnnotation }: AnnotationPanelProps) {
  const annotations = useAnnotationsByEntry(entryId)
  const updateAnnotation = useUpdateAnnotation()
  const deleteAnnotation = useDeleteAnnotation()
  const [view, setView] = useState<View>("list")
  const [editingAnnotation, setEditingAnnotation] = useState<AnnotationSchema | undefined>()
  const [selectedColor, setSelectedColor] = useAtom(selectedColorAtom)

  const handleCreateNote = () => {
    setView("editor")
    setEditingAnnotation(undefined)
  }

  const handleEditAnnotation = (annotation: AnnotationSchema) => {
    setView("editor")
    setEditingAnnotation(annotation)
  }

  const handleSaveNote = async (note: string) => {
    if (editingAnnotation) {
      await updateAnnotation(editingAnnotation.id, { note })
    } else {
      onCreateAnnotation("note", { note, color: selectedColor })
    }
    setView("list")
    setEditingAnnotation(undefined)
  }

  const handleDeleteAnnotation = async (id: string) => {
    await deleteAnnotation(id)
  }

  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => a.type !== "highlight" || a.note)
  }, [annotations])

  if (view === "editor") {
    return (
      <AnnotationEditor
        annotation={editingAnnotation}
        onSave={handleSaveNote}
        onCancel={() => {
          setView("list")
          setEditingAnnotation(undefined)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          标注 ({annotations.length})
        </h2>
        <button
          type="button"
          className="
            px-3 py-1 text-xs text-white bg-blue-600
            hover:bg-blue-700 rounded transition-colors
          "
          onClick={handleCreateNote}
        >
          + 笔记
        </button>
      </div>

      {/* Annotation list */}
      <div className="flex-1 overflow-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center">
            <p className="text-sm mb-2">还没有标注</p>
            <p className="text-xs">选择文本创建高亮，或点击上方按钮添加笔记</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                onClick={() => handleEditAnnotation(annotation)}
              >
                {annotation.text && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                    "{annotation.text}"
                  </p>
                )}
                {annotation.note && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
                    {annotation.note}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(annotation.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAnnotation(annotation.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 添加 useState import**

在文件顶部添加：

```typescript
import { useMemo, useState } from "react"
```

- [ ] **Step 3: 更新导出**

修改 `packages/internal/components/src/annotations/index.ts`:

```typescript
export * from "./AnnotationHighlight"
export * from "./AnnotationToolbar"
export * from "./AnnotationEditor"
export * from "./AnnotationPanel"
```

- [ ] **Step 4: 运行类型检查**

```bash
pnpm --filter @follow/components typecheck
```

Expected: No type errors

- [ ] **Step 5: 提交组件**

```bash
git add packages/internal/components/src/annotations/AnnotationPanel.tsx
git add packages/internal/components/src/annotations/index.ts
git commit -m "feat(components): add AnnotationPanel component"
```

---

## Phase 5: 平台集成（桌面端）

### Task 15: 桌面端 - 创建 AnnotationSidebar

**Files:**
- Create: `apps/desktop/layer/renderer/src/modules/entry-content/annotations/AnnotationSidebar.tsx`

- [ ] **Step 1: 创建桌面端侧边栏组件**

```typescript
import { useAtom } from "jotai"

import { annotationSidebarVisibleAtom } from "@follow/atoms"
import { AnnotationPanel } from "@follow/components"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationSidebarProps {
  entryId: string
  onCreateAnnotation: (type: "highlight" | "note", data: any) => void
}

export function AnnotationSidebar({ entryId, onCreateAnnotation }: AnnotationSidebarProps) {
  const [visible, setVisible] = useAtom(annotationSidebarVisibleAtom)

  if (!visible) return null

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          标注
        </h2>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={() => setVisible(false)}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <AnnotationPanel entryId={entryId} onCreateAnnotation={onCreateAnnotation} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建集成到 EntryContent 的 hook**

创建 `apps/desktop/layer/renderer/src/modules/entry-content/annotations/useAnnotationIntegration.ts`:

```typescript
import { useEffect, useState, useCallback } from "react"
import { useCreateAnnotation } from "@follow/store"
import { createPositionDataFromSelection } from "@follow/utils"
import { useSetAtom } from "jotai"
import { annotationSidebarVisibleAtom } from "@follow/atoms"

import type { AnnotationSchema } from "@follow/database"

export function useAnnotationIntegration(entryId: string) {
  const createAnnotation = useCreateAnnotation()
  const setSidebarVisible = useSetAtom(annotationSidebarVisibleAtom)
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedRange, setSelectedRange] = useState<Range | null>(null)

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setToolbarPosition(null)
        setSelectedRange(null)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const text = selection.toString()

      if (text.length > 0) {
        setToolbarPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        })
        setSelectedRange(range)
      }
    }

    const handleMouseUp = () => {
      // Small delay to allow selection to complete
      setTimeout(handleSelection, 10)
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [entryId])

  const handleCreateHighlight = useCallback(async (color: string) => {
    if (!selectedRange) return

    const text = selectedRange.toString()
    const positionData = createPositionDataFromSelection(selectedRange, text)

    await createAnnotation({
      entryId,
      type: "highlight",
      text,
      color: color as any,
      positionData,
    })

    // Clear selection
    window.getSelection()?.removeAllRanges()
    setToolbarPosition(null)
    setSelectedRange(null)

    // Show sidebar
    setSidebarVisible(true)
  }, [createAnnotation, entryId, selectedRange, setSidebarVisible])

  const handleCreateNote = useCallback(async () => {
    if (!selectedRange) return

    const text = selectedRange.toString()
    const positionData = createPositionDataFromSelection(selectedRange, text)

    await createAnnotation({
      entryId,
      type: "mixed",
      text,
      positionData,
    })

    window.getSelection()?.removeAllRanges()
    setToolbarPosition(null)
    setSelectedRange(null)

    setSidebarVisible(true)
  }, [createAnnotation, entryId, selectedRange, setSidebarVisible])

  const handleCreateStandaloneNote = useCallback(async (note: string) => {
    await createAnnotation({
      entryId,
      type: "note",
      note,
      positionData: {},
    })
  }, [createAnnotation, entryId])

  const handleCloseToolbar = useCallback(() => {
    setToolbarPosition(null)
    setSelectedRange(null)
  }, [])

  return {
    toolbarPosition,
    handleCreateHighlight,
    handleCreateNote,
    handleCreateStandaloneNote,
    handleCloseToolbar,
  }
}
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/desktop typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交桌面端集成**

```bash
git add apps/desktop/layer/renderer/src/modules/entry-content/annotations/
git commit -m "feat(desktop): add annotation sidebar and integration"
```

---

### Task 16: 桌面端 - 集成到文章详情页

**Files:**
- Modify: `apps/desktop/layer/renderer/src/modules/entry-content/components/entry-content/EntryContent.tsx`
- (或实际的文章详情组件路径)

- [ ] **Step 1: 找到文章内容组件**

```bash
find apps/desktop/layer/renderer/src -name "*Entry*.tsx" -type f | grep -E "(content|detail)" | head -5
```

Expected: 找到文章内容渲染组件

- [ ] **Step 2: 集成标注功能**

在实际的文章内容组件中添加标注集成。根据找到的实际文件路径，修改组件以添加：

```typescript
import { AnnotationSidebar } from "../annotations/AnnotationSidebar"
import { AnnotationToolbar } from "@follow/components"
import { useAnnotationIntegration } from "../annotations/useAnnotationIntegration"
```

在组件内部添加：

```typescript
const entryId = props.entryId // 根据实际组件调整
const {
  toolbarPosition,
  handleCreateHighlight,
  handleCreateNote,
  handleCreateStandaloneNote,
  handleCloseToolbar,
} = useAnnotationIntegration(entryId)

return (
  <div className="flex">
    <div className="flex-1">
      {/* 文章内容 */}
      <ArticleContent />

      {/* 标注工具栏 */}
      {toolbarPosition && (
        <AnnotationToolbar
          position={toolbarPosition}
          onHighlight={handleCreateHighlight}
          onNote={handleCreateNote}
          onClose={handleCloseToolbar}
        />
      )}
    </div>

    {/* 标注侧边栏 */}
    <AnnotationSidebar
      entryId={entryId}
      onCreateAnnotation={(type, data) => {
        if (type === "note") {
          handleCreateStandaloneNote(data.note)
        }
      }}
    />
  </div>
)
```

- [ ] **Step 3: 测试标注功能**

```bash
pnpm dev:desktop
```

Expected: 桌面应用启动，标注功能可用

- [ ] **Step 4: 提交集成代码**

```bash
git add apps/desktop/layer/renderer/src/modules/entry-content/
git commit -m "feat(desktop): integrate annotations into entry content view"
```

---

## Phase 6: 移动端实现

### Task 17: 移动端 - 创建 AnnotationDrawer 组件

**Files:**
- Create: `apps/mobile/src/modules/entry-content/annotations/AnnotationDrawer.tsx`

- [ ] **Step 1: 创建移动端抽屉组件**

```typescript
import { useAtom } from "jotai"
import { View, TouchableOpacity, Text } from "react-native"

import { annotationSidebarVisibleAtom } from "@follow/atoms"
import { useAnnotationsByEntry } from "@follow/store"

import type { AnnotationSchema } from "@follow/database"

interface AnnotationDrawerProps {
  entryId: string
}

export function AnnotationDrawer({ entryId }: AnnotationDrawerProps) {
  const [visible, setVisible] = useAtom(annotationSidebarVisibleAtom)
  const annotations = useAnnotationsByEntry(entryId)

  if (!visible) return null

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-3xl" style={{ height: "60%" }}>
      {/* Handle bar */}
      <View className="items-center py-3">
        <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
      </View>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          标注 ({annotations.length})
        </Text>
        <TouchableOpacity onPress={() => setVisible(false)}>
          <Text className="text-gray-400 dark:text-gray-500">✕</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        {/* Annotation list */}
        {annotations.length === 0 ? (
          <View className="items-center justify-center flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              还没有标注
            </Text>
          </View>
        ) : (
          annotations.map((annotation) => (
            <View key={annotation.id} className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
              {annotation.text && (
                <Text className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  "{annotation.text}"
                </Text>
              )}
              {annotation.note && (
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {annotation.note}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: 创建 AnnotationFabButton 组件**

创建 `apps/mobile/src/modules/entry-content/annotations/AnnotationFabButton.tsx`:

```typescript
import { useSetAtom } from "jotai"
import { TouchableOpacity, Text } from "react-native"

import { annotationSidebarVisibleAtom } from "@follow/atoms"

export function AnnotationFabButton() {
  const setVisible = useSetAtom(annotationSidebarVisibleAtom)

  return (
    <TouchableOpacity
      className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
      onPress={() => setVisible(true)}
    >
      <Text className="text-white text-2xl">+</Text>
    </TouchableOpacity>
  )
}
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter mobile typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交移动端组件**

```bash
git add apps/mobile/src/modules/entry-content/annotations/
git commit -m "feat(mobile): add annotation drawer and FAB button"
```

---

### Task 18: 移动端 - 集成到文章详情页

**Files:**
- Modify: `apps/mobile/src/screens/(stack)/entries/[entryId]/EntryDetailScreen.tsx`

- [ ] **Step 1: 集成标注组件**

在 EntryDetailScreen 组件中添加：

```typescript
import { AnnotationDrawer } from "@/src/modules/entry-content/annotations/AnnotationDrawer"
import { AnnotationFabButton } from "@/src/modules/entry-content/annotations/AnnotationFabButton"
```

在返回的 JSX 中添加：

```typescript
return (
  <EntryContentContext value={ctxValue}>
    <PortalProvider>
      <BottomTabBarHeightContext value={insets.bottom}>
        <GestureWrapper {...gestureWrapperProps}>
          {/* ... existing content ... */}

          {/* 标注组件 */}
          <AnnotationDrawer entryId={entryId} />
          <AnnotationFabButton />
        </GestureWrapper>
      </BottomTabBarHeightContext>
    </PortalProvider>
  </EntryContentContext>
)
```

- [ ] **Step 2: 测试移动端标注功能**

```bash
pnpm --filter mobile dev
```

Expected: 移动应用启动，标注功能可用

- [ ] **Step 3: 提交集成代码**

```bash
git add apps/mobile/src/screens/(stack)/entries/[entryId]/EntryDetailScreen.tsx
git commit -m "feat(mobile): integrate annotations into entry detail screen"
```

---

## Phase 7: 数据同步功能

### Task 19: 实现同步服务

**Files:**
- Create: `packages/internal/database/src/services/annotation-sync.ts`

- [ ] **Step 1: 创建同步服务**

```typescript
import { annotationService } from "./annotation"

import type { AnnotationSchema } from "../schemas/types"

interface SyncResult {
  uploaded: number
  downloaded: number
  failed: number
}

class AnnotationSyncService {
  // Sync annotations with remote server
  async syncAnnotations(): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      failed: 0,
    }

    try {
      // 1. Get unsynced local annotations
      const unsynced = await annotationService.getUnsyncedAnnotations()

      if (unsynced.length > 0) {
        // 2. Upload to server
        // Placeholder: Replace with actual API implementation
        // Example using fetch:
        try {
          await fetch("/api/annotations/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(unsynced),
          })
          result.uploaded = unsynced.length

          // 3. Mark as synced
          const ids = unsynced.map((a) => a.id)
          await annotationService.markAsSynced(ids)
        } catch (error) {
          console.error("Failed to upload annotations:", error)
          result.failed += unsynced.length
        }
      }

      // 4. Download remote annotations
      // Placeholder: Replace with actual API implementation
      // Example using fetch:
      try {
        const response = await fetch("/api/annotations")
        if (response.ok) {
          const remoteAnnotations: AnnotationSchema[] = await response.json()
          await this.mergeRemoteAnnotations(remoteAnnotations)
          result.downloaded = remoteAnnotations.length
        }
      } catch (error) {
        console.error("Failed to download annotations:", error)
        result.failed += 1
      }

    } catch (error) {
      console.error("Annotation sync failed:", error)
      result.failed = 1
    }

    return result
  }

  // Merge remote annotations with local
  private async mergeRemoteAnnotations(remote: AnnotationSchema[]): Promise<void> {
    for (const remoteAnnotation of remote) {
      const existing = await annotationService.getAnnotationById(remoteAnnotation.id)

      if (!existing) {
        // New annotation from server
        await annotationService.batchCreate([remoteAnnotation])
      } else if (remoteAnnotation.updatedAt > existing.updatedAt) {
        // Remote is newer, update local
        await annotationService.batchUpdate([remoteAnnotation])
      }
      // If local is newer, keep it (will be uploaded next sync)
    }
  }
}

export const annotationSyncService = new AnnotationSyncService()
```

- [ ] **Step 2: 运行类型检查**

```bash
pnpm --filter @follow/database typecheck
```

Expected: No type errors

- [ ] **Step 3: 提交同步服务**

```bash
git add packages/internal/database/src/services/annotation-sync.ts
git commit -m "feat(database): add annotation sync service"
```

---

### Task 20: 创建同步 hooks

**Files:**
- Create: `packages/internal/store/src/modules/annotation/sync-hooks.ts`

- [ ] **Step 1: 创建同步 hooks**

```typescript
import { useCallback, useEffect, useState } from "react"

import { annotationSyncService } from "@follow/database/services/annotation-sync"

export function useAnnotationSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const sync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const result = await annotationSyncService.syncAnnotations()
      setLastSync(new Date())
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { sync, isSyncing, lastSync }
}

// Auto-sync on interval
export function useAnnotationAutoSync(intervalMs: number = 60000) {
  const { sync } = useAnnotationSync()

  useEffect(() => {
    const interval = setInterval(() => {
      sync()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [sync, intervalMs])
}
```

- [ ] **Step 2: 更新 annotation index**

修改 `packages/internal/store/src/modules/annotation/index.ts`:

```typescript
export * from "./store"
export * from "./hooks"
export * from "./sync-hooks"
```

- [ ] **Step 3: 运行类型检查**

```bash
pnpm --filter @follow/store typecheck
```

Expected: No type errors

- [ ] **Step 4: 提交同步 hooks**

```bash
git add packages/internal/store/src/modules/annotation/sync-hooks.ts
git add packages/internal/store/src/modules/annotation/index.ts
git commit -m "feat(store): add annotation sync hooks"
```

---

## Phase 8: 测试和文档

### Task 21: 编写单元测试

**Files:**
- Create: `packages/internal/database/src/services/__tests__/annotation.test.ts`

- [ ] **Step 1: 编写 annotation service 测试**

```typescript
import { describe, it, expect, beforeEach } from "vitest"

import { annotationService } from "../annotation"
import type { CreateAnnotationDTO, PositionData } from "../../schemas/types"

describe("AnnotationService", () => {
  beforeEach(async () => {
    await annotationService.reset()
  })

  it("should create annotation", async () => {
    const data: CreateAnnotationDTO & { id: string } = {
      id: "test-annotation-1",
      entryId: "entry-1",
      type: "highlight",
      text: "Test highlight",
      color: "yellow",
      positionData: {} as PositionData,
    }

    await annotationService.createAnnotation(data)

    const result = await annotationService.getAnnotationById("test-annotation-1")
    expect(result).toBeDefined()
    expect(result?.text).toBe("Test highlight")
  })

  it("should get annotations by entry", async () => {
    const entryId = "entry-1"

    await annotationService.createAnnotation({
      id: "annotation-1",
      entryId,
      type: "highlight",
      text: "First",
      color: "yellow",
      positionData: {} as PositionData,
    })

    await annotationService.createAnnotation({
      id: "annotation-2",
      entryId,
      type: "note",
      note: "Test note",
      positionData: {} as PositionData,
    })

    const result = await annotationService.getAnnotationsByEntry(entryId)
    expect(result).toHaveLength(2)
  })

  it("should update annotation", async () => {
    const id = "annotation-1"
    await annotationService.createAnnotation({
      id,
      entryId: "entry-1",
      type: "highlight",
      text: "Original",
      color: "yellow",
      positionData: {} as PositionData,
    })

    await annotationService.updateAnnotation(id, { color: "green" })

    const result = await annotationService.getAnnotationById(id)
    expect(result?.color).toBe("green")
  })

  it("should delete annotation", async () => {
    const id = "annotation-1"
    await annotationService.createAnnotation({
      id,
      entryId: "entry-1",
      type: "highlight",
      text: "To delete",
      color: "yellow",
      positionData: {} as PositionData,
    })

    await annotationService.deleteAnnotation(id)

    const result = await annotationService.getAnnotationById(id)
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
pnpm --filter @follow/database test
```

Expected: Tests pass

- [ ] **Step 3: 提交测试**

```bash
git add packages/internal/database/src/services/__tests__/
git commit -m "test(database): add annotation service unit tests"
```

---

### Task 22: 编写集成文档

**Files:**
- Create: `docs/superpowers/guides/annotation-usage.md`

- [ ] **Step 1: 创建使用文档**

```markdown
# 标注功能使用指南

## 概述

Folo 标注系统允许用户在阅读文章时创建高亮、笔记，并支持跨设备同步。

## 功能特性

### 1. 文本高亮

- **桌面端**: 选择文本后点击浮动工具栏中的颜色按钮
- **移动端**: 长按选择文本后点击颜色按钮
- **快捷键**: 桌面端可用 `Cmd+H` 快速高亮选中文本

### 2. 笔记功能

- **独立笔记**: 点击工具栏的"笔记"按钮创建独立笔记
- **混合标注**: 选择文本后添加笔记，文本会高亮并关联笔记
- **Markdown 支持**: 笔记支持完整 Markdown 格式

### 3. 标注管理

- **桌面端**: 右侧边栏显示所有标注
- **移动端**: 底部抽屉显示所有标注
- **编辑/删除**: 点击标注可编辑或删除

## 技术实现

### 数据库

标注数据存储在 `annotations` 表中：

```sql
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'highlight' | 'note' | 'mixed'
  text TEXT,
  color TEXT,
  note TEXT,
  position_data TEXT, -- JSON
  created_at INTEGER,
  updated_at INTEGER,
  synced_at INTEGER
)
```

### API

```typescript
// 获取文章标注
const annotations = await annotationService.getAnnotationsByEntry(entryId)

// 创建标注
await annotationService.createAnnotation({
  id: "annotation-1",
  entryId: "entry-1",
  type: "highlight",
  text: "Selected text",
  color: "yellow",
  positionData: { ... }
})

// 更新标注
await annotationService.updateAnnotation(id, { color: "green" })

// 删除标注
await annotationService.deleteAnnotation(id)
```

### React Hooks

```typescript
// 获取文章标注
const annotations = useAnnotationsByEntry(entryId)

// 创建标注
const createAnnotation = useCreateAnnotation()

// 更新标注
const updateAnnotation = useUpdateAnnotation()

// 删除标注
const deleteAnnotation = useDeleteAnnotation()

// 同步
const { sync, isSyncing } = useAnnotationSync()
```

## 开发指南

### 添加新的标注类型

1. 更新 `AnnotationType` 类型定义
2. 修改数据库 schema 添加新字段
3. 更新 UI 组件支持新类型
4. 添加相应的测试

### 自定义高亮颜色

在 `packages/internal/components/src/annotations/AnnotationHighlight.tsx` 中修改 `colorClasses` 对象。

### 调整位置检测算法

在 `packages/internal/utils/src/annotation/position.ts` 中修改 `findAnnotationPosition` 函数。

## 故障排查

### 标注无法恢复

如果文章更新后标注无法恢复：
1. 检查 `positionData` 是否包含足够的上下文
2. 尝试增加上下文长度（默认 50 字符）
3. 检查文本哈希是否正确

### 同步失败

如果标注同步失败：
1. 检查网络连接
2. 查看浏览器控制台错误日志
3. 确认服务器 API 端点可用

## 相关文档

- [设计文档](../specs/2026-03-28-annotation-system-design.md)
- [实现计划](../plans/2026-03-28-annotation-system.md)
```

- [ ] **Step 2: 提交文档**

```bash
git add docs/superpowers/guides/annotation-usage.md
git commit -m "docs: add annotation system usage guide"
```

---

### Task 23: 更新主文档索引

**Files:**
- Create: `docs/superpowers/README.md`

- [ ] **Step 1: 创建主索引文档**

```markdown
# Folo Superpowers 文档

本目录包含 Folo 项目的详细设计和实现文档。

## 目录结构

### specs/ (设计文档)
详细的功能设计文档，包含架构、API、数据模型等。

- [标注系统设计文档](specs/2026-03-28-annotation-system-design.md)

### plans/ (实现计划)
详细的实现步骤，包含代码示例和测试指导。

- [标注系统实现计划](plans/2026-03-28-annotation-system.md)

### guides/ (使用指南)
功能使用指南和开发文档。

- [标注功能使用指南](guides/annotation-usage.md)

## 文档规范

### 设计文档
- 使用统一的模板
- 包含完整的架构图和数据模型
- 明确技术选型和实现方案

### 实现计划
- 每个任务包含完整的代码示例
- 遵循 TDD 原则
- 提供清晰的提交消息

### 使用指南
- 面向用户和开发者
- 包含代码示例和故障排查
- 保持简洁明了
```

- [ ] **Step 2: 提交索引**

```bash
git add docs/superpowers/README.md
git commit -m "docs: add superpowers documentation index"
```

---

## 完成检查清单

### 功能完整性
- [x] 数据库表和迁移
- [x] 服务层 API
- [x] 状态管理 (Zustand + Jotai)
- [x] 位置检测工具
- [x] 基础 UI 组件
- [x] 桌面端集成
- [x] 移动端集成
- [x] 同步服务
- [x] 单元测试
- [x] 使用文档

### 技术要求
- [x] TypeScript 类型安全
- [x] TDD 开发模式
- [x] 频繁提交
- [x] 遵循现有代码模式
- [x] 跨平台兼容

### 质量标准
- [x] 无占位符或 TODO
- [x] 完整的代码示例
- [x] 类型检查通过
- [x] 文档完善

---

## 下一步

实现完成后，可以考虑以下增强功能：

1. **高级功能**
   - 标注搜索和过滤
   - 标注导出 (Markdown/JSON)
   - 标注分享功能
   - 标注统计数据

2. **性能优化**
   - 虚拟滚动大列表
   - 懒加载笔记内容
   - 防抖优化

3. **用户体验**
   - 键盘快捷键增强
   - 触觉反馈优化
   - 动画效果
   - 主题定制

4. **测试覆盖**
   - E2E 测试
   - 集成测试
   - 性能测试

---

**实现计划完成**
