import { AnnotationToolbar } from "@follow/components"
import { RootPortal } from "@follow/components/ui/portal/index.js"

import { AnnotationSidebar } from "./AnnotationSidebar"
import { useAnnotationIntegration } from "./useAnnotationIntegration"

interface AnnotationContainerProps {
  entryId: string
}

export function AnnotationContainer({ entryId }: AnnotationContainerProps) {
  const { toolbarPosition, handleCreateHighlight, handleCreateNote, handleCloseToolbar } =
    useAnnotationIntegration(entryId)

  const handleCreateAnnotation = (_type: "highlight" | "note", _data: unknown) => {
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
