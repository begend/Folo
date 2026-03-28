import { cn } from "@follow/utils/utils"

interface AnnotationHighlightProps {
  annotation: {
    id: string
    color?: string | null
  }
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
