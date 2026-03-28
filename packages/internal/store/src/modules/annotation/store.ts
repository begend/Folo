import type { AnnotationSchema, UpdateAnnotationDTO } from "@follow/database/schemas/types"
import { annotationService } from "@follow/database/services/annotation"

import type { Hydratable, Resetable } from "../../lib/base"
import { createImmerSetter, createTransaction, createZustandStore } from "../../lib/helper"
import type { AnnotationModel } from "./types"

interface AnnotationState {
  /**
   * Key: annotation id
   * Value: AnnotationModel
   */
  data: Record<string, AnnotationModel>

  /**
   * Key: entryId
   * Value: Set of annotation ids
   */
  entryAnnotations: Record<string, Set<string>>
}

const emptyData: Record<string, AnnotationModel> = {}
const emptyEntryAnnotations: Record<string, Set<string>> = {}

export const useAnnotationStore = createZustandStore<AnnotationState>("annotation")(() => ({
  data: emptyData,
  entryAnnotations: emptyEntryAnnotations,
}))

const get = useAnnotationStore.getState
const set = useAnnotationStore.setState
const immerSet = createImmerSetter(useAnnotationStore)

class AnnotationActions implements Resetable, Hydratable {
  async hydrate() {
    const annotations = await annotationService.getAnnotationsByEntry("") // Get all for now
    this.upsertManyInSession(annotations)
  }

  upsertManyInSession(annotations: AnnotationSchema[]) {
    immerSet((state) => {
      annotations.forEach((annotation) => {
        // Add to data
        state.data[annotation.id] = annotation

        // Add to entry index
        if (!state.entryAnnotations[annotation.entryId]) {
          state.entryAnnotations[annotation.entryId] = new Set()
        }
        state.entryAnnotations[annotation.entryId]!.add(annotation.id)
      })
    })
  }

  async upsertMany(annotations: AnnotationSchema[]) {
    this.upsertManyInSession(annotations)

    for (const annotation of annotations) {
      await annotationService.createAnnotation(annotation)
    }
  }

  getAnnotation(id: string): AnnotationModel | undefined {
    return get().data[id]
  }

  getAnnotationsByEntry(entryId: string): AnnotationSchema[] {
    const state = get()
    const annotationIds = state.entryAnnotations[entryId]
    if (!annotationIds) return []

    return Array.from(annotationIds)
      .map((id) => state.data[id])
      .filter((annotation): annotation is AnnotationSchema => annotation !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async createAnnotation(annotation: AnnotationSchema) {
    immerSet((state) => {
      // Add to data
      state.data[annotation.id] = annotation

      // Add to entry index
      if (!state.entryAnnotations[annotation.entryId]) {
        state.entryAnnotations[annotation.entryId] = new Set()
      }
      state.entryAnnotations[annotation.entryId]!.add(annotation.id)
    })

    await annotationService.createAnnotation(annotation)
  }

  async updateAnnotation(id: string, updates: Partial<Omit<AnnotationSchema, "id" | "entryId">> | UpdateAnnotationDTO) {
    immerSet((state) => {
      const existing = state.data[id]
      if (existing) {
        // Filter out null/undefined values from updates
        const filteredUpdates: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(updates)) {
          if (value !== null && value !== undefined) {
            filteredUpdates[key] = value
          }
        }
        state.data[id] = { ...existing, ...filteredUpdates }
      }
    })

    // The service handles null filtering internally
    await annotationService.updateAnnotation(id, updates)
  }

  async deleteAnnotation(id: string) {
    const state = get()
    const annotation = state.data[id]

    immerSet((state) => {
      // Remove from data
      delete state.data[id]

      // Remove from entry index
      if (annotation) {
        const entrySet = state.entryAnnotations[annotation.entryId]
        if (entrySet) {
          entrySet.delete(id)
          if (entrySet.size === 0) {
            delete state.entryAnnotations[annotation.entryId]
          }
        }
      }
    })

    await annotationService.deleteAnnotation(id)
  }

  async reset() {
    const tx = createTransaction()
    tx.store(() => {
      set({
        data: emptyData,
        entryAnnotations: emptyEntryAnnotations,
      })
    })
    tx.persist(() => {
      annotationService.reset()
    })

    await tx.run()
  }
}

export const annotationActions = new AnnotationActions()
