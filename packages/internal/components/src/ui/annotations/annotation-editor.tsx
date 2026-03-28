import { cn } from "@follow/utils/utils"
import { useState } from "react"

interface AnnotationEditorProps {
  annotation?: {
    note?: string | null
  }
  onSave: (note: string) => void
  onCancel: () => void
  placeholder?: string
}

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

  // Simple Markdown-to-HTML conversion
  const renderMarkdown = (text: string) => {
    return text
      .replaceAll("\n", "<br>")
      .replaceAll(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replaceAll(/\*(.*?)\*/g, "<em>$1</em>")
      .replaceAll(
        /`(.*?)`/g,
        "<code class='px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm'>$1</code>",
      )
      .replaceAll(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        "<a href='$2' class='text-blue-500 hover:underline' target='_blank' rel='noopener'>$1</a>",
      )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {annotation ? "编辑笔记" : "新笔记"}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
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
          className="h-full w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Markdown preview */}
      {content && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <h4 className="mb-2 text-xs font-medium text-gray-500">预览</h4>
          <div
            className={cn(
              "prose prose-sm max-w-none text-sm text-gray-700 dark:prose-invert dark:text-gray-300",
              "prose-p:my-1 prose-strong:font-semibold prose-em:italic",
              "prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5",
              "dark:prose-code:bg-gray-700",
            )}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content),
            }}
          />
        </div>
      )}
    </div>
  )
}
