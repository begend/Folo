import type { AnnotationSchema } from "../schemas/types"
import { annotationService } from "./annotation"

interface SyncResult {
  uploaded: number
  downloaded: number
  failed: number
}

class AnnotationSyncService {
  // Sync annotations with remote server
  async syncAnnotations(): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      failed: 0,
    }

    try {
      // 1. Get unsynced local annotations
      const unsynced = await annotationService.getUnsyncedAnnotations()

      if (unsynced.length > 0) {
        // 2. Upload to server
        // Placeholder: Replace with actual API implementation
        // Example using fetch:
        try {
          // await fetch("/api/annotations/batch", {
          //   method: "POST",
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify(unsynced),
          // })
          result.uploaded = unsynced.length

          // 3. Mark as synced
          const ids = unsynced.map((a) => a.id)
          await annotationService.markAsSynced(ids)
        } catch (error) {
          console.error("Failed to upload annotations:", error)
          result.failed += unsynced.length
        }
      }

      // 4. Download remote annotations
      // Placeholder: Replace with actual API implementation
      // Example using fetch:
      try {
        // const response = await fetch("/api/annotations")
        // if (response.ok) {
        //   const remoteAnnotations: AnnotationSchema[] = await response.json()
        //   await this.mergeRemoteAnnotations(remoteAnnotations)
        //   result.downloaded = remoteAnnotations.length
        // }
      } catch (error) {
        console.error("Failed to download annotations:", error)
        result.failed += 1
      }
    } catch (error) {
      console.error("Annotation sync failed:", error)
      result.failed = 1
    }

    return result
  }

  // Merge remote annotations with local
  private async mergeRemoteAnnotations(remote: AnnotationSchema[]): Promise<void> {
    for (const remoteAnnotation of remote) {
      const existing = await annotationService.getAnnotationById(remoteAnnotation.id)

      if (!existing) {
        // New annotation from server
        await annotationService.batchCreate([remoteAnnotation])
      } else if (remoteAnnotation.updatedAt > existing.updatedAt) {
        // Remote is newer, update local
        await annotationService.batchUpdate([remoteAnnotation])
      }
      // If local is newer, keep it (will be uploaded next sync)
    }
  }

  // Fetch annotations for a specific entry from server
  async fetchRemoteAnnotations(_entryId: string): Promise<AnnotationSchema[]> {
    // Placeholder: Replace with actual API implementation
    // Example:
    // const response = await fetch(`/api/annotations/entry/${_entryId}`)
    // if (response.ok) {
    //   return await response.json()
    // }
    return []
  }
}

export const annotationSyncService = new AnnotationSyncService()
