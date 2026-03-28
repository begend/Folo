import { useMemo, useState } from "react"

import { AnnotationEditor } from "./annotation-editor"

interface AnnotationPanelProps {
  entryId: string
  annotations: Array<{
    id: string
    type: string
    text?: string | null
    note?: string | null
    createdAt: Date
    positionData: any
  }>
  onCreateAnnotation: (type: "highlight" | "note", data: any) => void
  onUpdateAnnotation?: (id: string, data: any) => void
  onDeleteAnnotation?: (id: string) => void
}

type View = "list" | "editor"

export function AnnotationPanel({
  entryId,
  annotations,
  onCreateAnnotation,
}: AnnotationPanelProps) {
  const [view, setView] = useState<View>("list")
  const [editingAnnotation, setEditingAnnotation] = useState<
    | {
        id: string
        type: string
        note?: string | null
        positionData?: any
      }
    | undefined
  >()

  const handleCreateNote = () => {
    setView("editor")
    setEditingAnnotation(undefined)
  }

  const handleEditAnnotation = (annotation: {
    id: string
    type: string
    text?: string | null
    note?: string | null
    createdAt: Date
    positionData: any
  }) => {
    setView("editor")
    setEditingAnnotation(annotation)
  }

  const handleSaveNote = async (note: string) => {
    if (editingAnnotation) {
      // Update existing annotation
      onCreateAnnotation("note", {
        id: editingAnnotation.id,
        entryId,
        type: editingAnnotation.type,
        note,
        positionData: editingAnnotation.positionData,
      })
    } else {
      // Create new note annotation
      onCreateAnnotation("note", {
        note,
        positionData: {},
      })
    }
    setView("list")
    setEditingAnnotation(undefined)
  }

  const handleDeleteAnnotation = async (id: string) => {
    // Will be connected to delete handler
    console.warn("Delete annotation:", id)
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
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          标注 ({annotations.length})
        </h2>
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
          onClick={handleCreateNote}
        >
          + 笔记
        </button>
      </div>

      {/* Annotation list */}
      <div className="flex-1 overflow-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="mb-2 text-sm">还没有标注</p>
            <p className="text-xs">选择文本创建高亮，或点击上方按钮添加笔记</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAnnotations.map((annotation) => (
              <div
                key={annotation.id}
                className="dark:hover:bg-gray-750 cursor-pointer p-4 hover:bg-gray-50"
                onClick={() => handleEditAnnotation(annotation)}
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
