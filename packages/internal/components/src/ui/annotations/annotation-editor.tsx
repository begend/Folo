import { useState } from "react"

import { cn } from "@follow/utils/utils"

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
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm'>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' class='text-blue-500 hover:underline' target='_blank' rel='noopener'>$1</a>")
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
            className={cn(
              "text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none",
              "prose-p:my-1 prose-strong:font-semibold prose-em:italic",
              "prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
              "dark:prose-code:bg-gray-700"
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
