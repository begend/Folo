import { eq, inArray, isNull } from "drizzle-orm"

import { db } from "../db"
import { annotationsTable } from "../schemas"
import type {
  AnnotationSchema,
  CreateAnnotationDTO,
  UpdateAnnotationDTO,
} from "../schemas/types"
import type { Resetable } from "./internal/base"

class AnnotationServiceStatic implements Resetable {
  async reset() {
    await db.delete(annotationsTable).execute()
  }

  // Create annotation
  async createAnnotation(data: CreateAnnotationDTO & { id: string }): Promise<void> {
    const now = new Date()
    await db
      .insert(annotationsTable)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .execute()
  }

  // Get annotations by entry
  async getAnnotationsByEntry(entryId: string): Promise<AnnotationSchema[]> {
    const result = await db.query.annotationsTable.findMany({
      where: eq(annotationsTable.entryId, entryId),
      orderBy: (annotationsTable, { desc }) => [desc(annotationsTable.createdAt)],
    })
    return result as unknown as AnnotationSchema[]
  }

  // Get annotation by id
  async getAnnotationById(id: string): Promise<AnnotationSchema | undefined> {
    const result = await db.query.annotationsTable.findFirst({
      where: eq(annotationsTable.id, id),
    })
    return result as unknown as AnnotationSchema | undefined
  }

  // Update annotation
  async updateAnnotation(id: string, data: UpdateAnnotationDTO): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      syncedAt: null, // Mark as unsynced when updated
    }

    // Only include fields that are not null/undefined
    if (data.type !== null && data.type !== undefined) {
      updateData.type = data.type
    }
    if (data.text !== null && data.text !== undefined) {
      updateData.text = data.text
    }
    if (data.color !== null && data.color !== undefined) {
      updateData.color = data.color
    }
    if (data.note !== null && data.note !== undefined) {
      updateData.note = data.note
    }
    if (data.positionData !== null && data.positionData !== undefined) {
      updateData.positionData = data.positionData
    }

    await db
      .update(annotationsTable)
      .set(updateData)
      .where(eq(annotationsTable.id, id))
      .execute()
  }

  // Delete annotation
  async deleteAnnotation(id: string): Promise<void> {
    await db.delete(annotationsTable).where(eq(annotationsTable.id, id)).execute()
  }

  // Batch operations for sync
  async batchCreate(annotations: AnnotationSchema[]): Promise<void> {
    if (annotations.length === 0) return
    await db.insert(annotationsTable).values(annotations).execute()
  }

  async batchUpdate(annotations: AnnotationSchema[]): Promise<void> {
    if (annotations.length === 0) return

    for (const annotation of annotations) {
      await db
        .update(annotationsTable)
        .set({
          type: annotation.type,
          text: annotation.text,
          color: annotation.color,
          note: annotation.note,
          positionData: annotation.positionData,
          updatedAt: annotation.updatedAt,
          syncedAt: annotation.syncedAt,
        })
        .where(eq(annotationsTable.id, annotation.id))
        .execute()
    }
  }

  async batchDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await db.delete(annotationsTable).where(inArray(annotationsTable.id, ids)).execute()
  }

  // Sync related methods
  async getUnsyncedAnnotations(): Promise<AnnotationSchema[]> {
    const result = await db.query.annotationsTable.findMany({
      where: isNull(annotationsTable.syncedAt),
    })
    return result as unknown as AnnotationSchema[]
  }

  async markAsSynced(ids: string[], syncedAt: Date = new Date()): Promise<void> {
    if (ids.length === 0) return
    await db
      .update(annotationsTable)
      .set({ syncedAt })
      .where(inArray(annotationsTable.id, ids))
      .execute()
  }

  // Get all annotations for a user
  async getAnnotationsByUser(userId: string): Promise<AnnotationSchema[]> {
    const result = await db.query.annotationsTable.findMany({
      where: eq(annotationsTable.userId, userId),
      orderBy: (annotationsTable, { desc }) => [desc(annotationsTable.createdAt)],
    })
    return result as unknown as AnnotationSchema[]
  }
}

export const annotationService = new AnnotationServiceStatic()
