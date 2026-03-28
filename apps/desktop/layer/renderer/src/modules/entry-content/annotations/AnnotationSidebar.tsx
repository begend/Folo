import { useAnnotationSidebarVisible, useSetAnnotationSidebarVisible } from "@follow/atoms"
import { AnnotationPanel } from "@follow/components"
import { useAnnotationsByEntry } from "@follow/store"
import { cn } from "@follow/utils/utils"

interface AnnotationSidebarProps {
  entryId: string
  onCreateAnnotation: (type: "highlight" | "note", data: any) => void
}

export function AnnotationSidebar({ entryId, onCreateAnnotation }: AnnotationSidebarProps) {
  const visible = useAnnotationSidebarVisible()
  const setVisible = useSetAnnotationSidebarVisible()
  const annotations = useAnnotationsByEntry(entryId)

  if (!visible) return null

  return (
    <div
      className={cn(
        "w-80 border-l border-gray-200 dark:border-gray-700",
        "flex flex-col bg-white dark:bg-gray-800",
        "transition-all duration-300 ease-in-out",
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">标注</h2>
        <button
          type="button"
          className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          onClick={() => setVisible(false)}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <AnnotationPanel
          entryId={entryId}
          annotations={annotations}
          onCreateAnnotation={onCreateAnnotation}
        />
      </div>
    </div>
  )
}
