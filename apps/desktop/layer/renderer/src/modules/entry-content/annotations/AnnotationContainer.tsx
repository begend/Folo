import { RootPortal } from "@follow/components/ui/portal"
import { AnnotationSidebar } from "./AnnotationSidebar"
import { AnnotationToolbar } from "@follow/components"
import { useAnnotationIntegration } from "./useAnnotationIntegration"

interface AnnotationContainerProps {
  entryId: string
}

export function AnnotationContainer({ entryId }: AnnotationContainerProps) {
  const {
    toolbarPosition,
    selectedText,
    handleCreateHighlight,
    handleCreateNote,
    handleCloseToolbar,
  } = useAnnotationIntegration(entryId)

  const handleCreateAnnotation = (type: "highlight" | "note", data: any) => {
    console.log("Create annotation:", type, data)
    // This will be handled by the integration hook
  }

  return (
    <>
      {/* Annotation Sidebar */}
      <AnnotationSidebar entryId={entryId} onCreateAnnotation={handleCreateAnnotation} />

      {/* Floating Toolbar */}
      {toolbarPosition && (
        <RootPortal>
          <AnnotationToolbar
            position={toolbarPosition}
            onHighlight={handleCreateHighlight}
            onNote={handleCreateNote}
            onClose={handleCloseToolbar}
          />
        </RootPortal>
      )}
    </>
  )
}
