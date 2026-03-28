import { useCallback, useEffect, useMemo, useState } from "react"

import { annotationService } from "@follow/database/services/annotation"
import type { CreateAnnotationDTO, UpdateAnnotationDTO } from "@follow/database/schemas/types"

import { annotationActions } from "./store"

// Get annotation by id
export const useAnnotation = (id: string) => {
  const annotation = annotationActions.getAnnotation(id)
  return annotation
}

// Get annotations by entry
export const useAnnotationsByEntry = (entryId: string) => {
  const annotations = useMemo(
    () => annotationActions.getAnnotationsByEntry(entryId),
    [entryId],
  )

  // Load annotations from database on mount or when entryId changes
  useEffect(() => {
    if (!entryId) return

    let cancelled = false

    annotationService.getAnnotationsByEntry(entryId).then((result) => {
      if (!cancelled) {
        annotationActions.upsertManyInSession(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [entryId])

  return annotations
}

// Get all annotations for a user
export const useAnnotationsByUser = (userId: string) => {
  const [annotations, setAnnotations] = useState<
    ReturnType<typeof annotationService.getAnnotationsByUser> extends Promise<infer T> ? T : never
  >([])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    annotationService.getAnnotationsByUser(userId).then((result) => {
      if (!cancelled) {
        setAnnotations(result)
        annotationActions.upsertManyInSession(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  return annotations
}

// Create annotation mutation
export const useCreateAnnotation = () => {
  const createAnnotation = useCallback(
    async (data: CreateAnnotationDTO & { id: string }) => {
      // Add timestamps
      const now = new Date()
      const fullAnnotation = {
        ...data,
        createdAt: now,
        updatedAt: now,
        userId: null,
        text: data.text ?? null,
        color: data.color ?? null,
        note: data.note ?? null,
        positionData: data.positionData ?? null,
      }
      await annotationActions.createAnnotation(fullAnnotation)
      return data.id
    },
    [],
  )

  return createAnnotation
}

// Update annotation mutation
export const useUpdateAnnotation = () => {
  const updateAnnotation = useCallback(async (id: string, data: UpdateAnnotationDTO) => {
    await annotationActions.updateAnnotation(id, data)
  }, [])

  return updateAnnotation
}

// Delete annotation mutation
export const useDeleteAnnotation = () => {
  const deleteAnnotation = useCallback(async (id: string) => {
    await annotationActions.deleteAnnotation(id)
  }, [])

  return deleteAnnotation
}
