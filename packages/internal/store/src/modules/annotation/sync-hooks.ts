import { annotationSyncService } from "@follow/database/services/annotation-sync"
import { useCallback, useEffect, useState } from "react"

interface SyncResult {
  uploaded: number
  downloaded: number
  failed: number
}

export function useAnnotationSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  const sync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const result = await annotationSyncService.syncAnnotations()
      setLastResult(result)
      setLastSync(new Date())
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { sync, isSyncing, lastSync, lastResult }
}

// Auto-sync on interval
export function useAnnotationAutoSync(intervalMs = 60000) {
  const { sync } = useAnnotationSync()

  useEffect(() => {
    const interval = setInterval(() => {
      sync()
    }, intervalMs)

    return () => clearInterval(interval)
  }, [sync, intervalMs])
}
