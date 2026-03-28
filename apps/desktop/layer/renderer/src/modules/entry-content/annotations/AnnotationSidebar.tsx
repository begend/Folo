import {
  useAnnotationSidebarVisible,
  useSetAnnotationSidebarVisible,
} from "@follow/atoms"
import { useAnnotationsByEntry } from "@follow/store"
import { AnnotationPanel } from "@follow/components"
import { cn } from "@follow/utils/utils"

interface AnnotationSidebarProps {
  entryId: string
  onCreateAnnotation: (type: "highlight" | "note", data: any) => void
}

export function AnnotationSidebar({ entryId, onCreateAnnotation }: AnnotationSidebarProps) {
  const [visible, setVisible] = useAnnotationSidebarVisible()
  const annotations = useAnnotationsByEntry(entryId)

  if (!visible) return null

  return (
    <div
      className={cn(
        "w-80 border-l border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-800 flex flex-col",
        "transition-all duration-300 ease-in-out",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">标注</h2>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
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
