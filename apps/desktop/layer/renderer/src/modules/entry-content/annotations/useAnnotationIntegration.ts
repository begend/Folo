import { useSetActiveAnnotationId, useSetAnnotationSidebarVisible } from "@follow/atoms"
import type { AnnotationColor } from "@follow/database/schemas/types"
import { useCreateAnnotation } from "@follow/store"
import { createPositionDataFromSelection } from "@follow/utils"
import { nanoid } from "nanoid"
import { useCallback, useEffect, useState } from "react"

export function useAnnotationIntegration(entryId: string) {
  const createAnnotation = useCreateAnnotation()
  const setSidebarVisible = useSetAnnotationSidebarVisible()
  const setActiveAnnotationId = useSetActiveAnnotationId()

  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectedRange, setSelectedRange] = useState<Range | null>(null)
  const [selectedText, setSelectedText] = useState<string>("")

  // Handle text selection
  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout> | null = null

    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        // Only clear toolbar if not clicking on an existing annotation
        const target = document.activeElement
        if (!target?.closest("[data-annotation-id]")) {
          setToolbarPosition(null)
          setSelectedRange(null)
          setSelectedText("")
        }
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const text = selection.toString()

      // Only show toolbar for text selections inside content
      if (text.length > 0 && rect.width > 0) {
        setToolbarPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        })
        setSelectedRange(range)
        setSelectedText(text)
      }
    }

    const handleMouseUp = () => {
      // Small delay to allow selection to complete
      if (selectionTimeout) {
        clearTimeout(selectionTimeout)
      }
      selectionTimeout = setTimeout(handleSelection, 10)
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("selectionchange", handleSelection)

    return () => {
      if (selectionTimeout) {
        clearTimeout(selectionTimeout)
      }
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("selectionchange", handleSelection)
    }
  }, [entryId])

  const handleCreateHighlight = useCallback(
    async (color: string) => {
      if (!selectedRange || !selectedText) return

      const positionData = createPositionDataFromSelection(selectedRange, selectedText)

      await createAnnotation({
        id: nanoid(),
        entryId,
        type: "highlight",
        text: selectedText,
        color: color as AnnotationColor,
        positionData,
      })

      // Clear selection
      window.getSelection()?.removeAllRanges()
      setToolbarPosition(null)
      setSelectedRange(null)
      setSelectedText("")

      // Show sidebar
      setSidebarVisible(true)
    },
    [createAnnotation, entryId, selectedRange, selectedText, setSidebarVisible],
  )

  const handleCreateNote = useCallback(async () => {
    if (!selectedRange || !selectedText) return

    const positionData = createPositionDataFromSelection(selectedRange, selectedText)

    await createAnnotation({
      id: nanoid(),
      entryId,
      type: "mixed",
      text: selectedText,
      positionData,
    })

    window.getSelection()?.removeAllRanges()
    setToolbarPosition(null)
    setSelectedRange(null)
    setSelectedText("")

    setSidebarVisible(true)
  }, [createAnnotation, entryId, selectedRange, selectedText, setSidebarVisible])

  const handleCreateStandaloneNote = useCallback(
    async (note: string) => {
      await createAnnotation({
        id: nanoid(),
        entryId,
        type: "note",
        note,
        positionData: null,
      })
    },
    [createAnnotation, entryId],
  )

  const handleCloseToolbar = useCallback(() => {
    setToolbarPosition(null)
    setSelectedRange(null)
    setSelectedText("")
  }, [])

  const handleAnnotationClick = useCallback(
    (annotationId: string) => {
      setActiveAnnotationId(annotationId)
      setSidebarVisible(true)
    },
    [setActiveAnnotationId, setSidebarVisible],
  )

  return {
    toolbarPosition,
    selectedText,
    handleCreateHighlight,
    handleCreateNote,
    handleCreateStandaloneNote,
    handleCloseToolbar,
    handleAnnotationClick,
  }
}
