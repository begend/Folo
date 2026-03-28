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
  created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
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

在 `packages/internal/components/src/ui/annotations/AnnotationHighlight.tsx` 中修改 `colorClasses` 对象。

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
