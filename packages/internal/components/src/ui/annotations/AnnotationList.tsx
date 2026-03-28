import { cn } from "@follow/utils/utils"
import { memo, useCallback, useMemo } from "react"

export interface AnnotationData {
  id: string
  entryId: string
  type: string
  text?: string | null
  color?: string | null
  note?: string | null
  createdAt: Date
}

interface AnnotationListProps {
  annotations: AnnotationData[]
  activeAnnotationId?: string | null
  onAnnotationClick?: (annotation: AnnotationData) => void
  onAnnotationDelete?: (id: string) => void
  renderEmpty?: () => React.ReactNode
  className?: string
}

// Memoized annotation item for better performance
const AnnotationListItem = memo<{
  annotation: AnnotationData
  isActive: boolean
  onClick: (annotation: AnnotationData) => void
  onDelete?: (id: string) => void
}>(({ annotation, isActive, onClick, onDelete }) => {
  const handleClick = useCallback(() => {
    onClick(annotation)
  }, [annotation, onClick])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.(annotation.id)
    },
    [annotation.id, onDelete],
  )

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg p-4 transition-all",
        "dark:hover:bg-gray-750 hover:bg-gray-50",
        isActive && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900",
        "dark:bg-gray-750 bg-gray-50",
      )}
      onClick={handleClick}
    >
      {annotation.text && (
        <p className="mb-2 line-clamp-2 text-sm text-gray-700 dark:text-gray-300">
          "{annotation.text}"
        </p>
      )}
      {annotation.note && (
        <div className="prose prose-sm max-w-none text-sm text-gray-600 dark:prose-invert dark:text-gray-400">
          {annotation.note}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(annotation.createdAt).toLocaleString()}
        </span>
        {onDelete && (
          <button
            type="button"
            className="text-xs text-red-500 transition-colors hover:text-red-700"
            onClick={handleDelete}
          >
            删除
          </button>
        )}
      </div>
    </div>
  )
})

AnnotationListItem.displayName = "AnnotationListItem"

// Optimized annotation list with virtual scrolling hint
export const AnnotationList = memo<AnnotationListProps>(
  ({
    annotations,
    activeAnnotationId,
    onAnnotationClick,
    onAnnotationDelete,
    renderEmpty,
    className,
  }) => {
    // Group annotations by date for better UX
    const groupedAnnotations = useMemo(() => {
      const groups: Record<string, AnnotationData[]> = {}

      annotations.forEach((annotation) => {
        const dateKey = new Date(annotation.createdAt).toISOString().slice(0, 10)
        if (!groups[dateKey]) {
          groups[dateKey] = []
        }
        groups[dateKey].push(annotation)
      })

      return groups
    }, [annotations])

    const sortedDates = useMemo(() => {
      return Object.keys(groupedAnnotations).sort((a, b) => b.localeCompare(a))
    }, [groupedAnnotations])

    // Memoized empty state
    const emptyState = useMemo(() => {
      if (renderEmpty) {
        return renderEmpty()
      }
      return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
          <p className="mb-2 text-sm">还没有标注</p>
          <p className="text-xs">选择文本创建高亮，或点击上方按钮添加笔记</p>
        </div>
      )
    }, [renderEmpty])

    if (annotations.length === 0) {
      return <div className={className}>{emptyState}</div>
    }

    return (
      <div className={cn("divide-y divide-gray-200 dark:divide-gray-700", className)}>
        {sortedDates.map((date) => (
          <div key={date} className="annotation-group">
            {/* Date header */}
            <div className="dark:bg-gray-750 sticky top-0 z-10 bg-gray-50 px-4 py-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {formatDate(date)}
              </span>
            </div>

            {/* Annotations for this date */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupedAnnotations[date]?.map((annotation) => (
                <AnnotationListItem
                  key={annotation.id}
                  annotation={annotation}
                  isActive={annotation.id === activeAnnotationId}
                  onClick={onAnnotationClick || (() => {})}
                  onDelete={onAnnotationDelete}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
)

AnnotationList.displayName = "AnnotationList"

// Helper function to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)) {
    return "今天"
  } else if (date.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10)) {
    return "昨天"
  } else {
    return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
  }
}
