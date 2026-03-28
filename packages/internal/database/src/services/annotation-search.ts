import type { AnnotationSchema, AnnotationType } from "@follow/database/schemas/types"

export interface AnnotationSearchParams {
  query?: string
  type?: AnnotationType[]
  colors?: string[]
  dateFrom?: Date
  dateTo?: Date
  hasNote?: boolean
}

export class AnnotationSearchService {
  // Search annotations by query
  search(annotations: AnnotationSchema[], params: AnnotationSearchParams): AnnotationSchema[] {
    let results = annotations

    // Filter by search query (text or note)
    if (params.query) {
      const query = params.query.toLowerCase()
      results = results.filter(
        (a) => a.text?.toLowerCase().includes(query) || a.note?.toLowerCase().includes(query),
      )
    }

    // Filter by type
    if (params.type && params.type.length > 0) {
      results = results.filter((a) => params.type!.includes(a.type))
    }

    // Filter by color
    if (params.colors && params.colors.length > 0) {
      results = results.filter((a) => a.color && params.colors!.includes(a.color))
    }

    // Filter by date range
    if (params.dateFrom) {
      results = results.filter((a) => a.createdAt >= params.dateFrom!)
    }
    if (params.dateTo) {
      results = results.filter((a) => a.createdAt <= params.dateTo!)
    }

    // Filter by note presence
    if (params.hasNote !== undefined) {
      results = results.filter((a) => !!a.note === params.hasNote)
    }

    return results
  }

  // Group annotations by date
  groupByDate(annotations: AnnotationSchema[]): Record<string, AnnotationSchema[]> {
    const groups: Record<string, AnnotationSchema[]> = {}

    annotations.forEach((annotation) => {
      const dateKey = new Date(annotation.createdAt).toISOString().slice(0, 10)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(annotation)
    })

    return groups
  }

  // Group annotations by entry
  groupByEntry(annotations: AnnotationSchema[]): Record<string, AnnotationSchema[]> {
    const groups: Record<string, AnnotationSchema[]> = {}

    annotations.forEach((annotation) => {
      if (!groups[annotation.entryId]) {
        groups[annotation.entryId] = []
      }
      groups[annotation.entryId].push(annotation)
    })

    return groups
  }

  // Get annotation statistics
  getStatistics(annotations: AnnotationSchema[]) {
    const stats = {
      total: annotations.length,
      byType: {
        highlight: 0,
        note: 0,
        mixed: 0,
      },
      byColor: {
        yellow: 0,
        green: 0,
        blue: 0,
        pink: 0,
        orange: 0,
      },
      withNote: 0,
      dateRange: {
        earliest: annotations.length > 0 ? annotations[0].createdAt : null,
        latest: annotations.length > 0 ? annotations[0].createdAt : null,
      },
    }

    annotations.forEach((annotation) => {
      // Count by type
      stats.byType[annotation.type]++

      // Count by color
      if (annotation.color) {
        stats.byColor[annotation.color as keyof typeof stats.byColor]++
      }

      // Count with notes
      if (annotation.note) {
        stats.withNote++
      }

      // Update date range
      if (!stats.dateRange.earliest || annotation.createdAt < stats.dateRange.earliest) {
        stats.dateRange.earliest = annotation.createdAt
      }
      if (!stats.dateRange.latest || annotation.createdAt > stats.dateRange.latest) {
        stats.dateRange.latest = annotation.createdAt
      }
    })

    return stats
  }

  // Find related annotations (same entry, similar content)
  findRelatedAnnotations(
    annotation: AnnotationSchema,
    allAnnotations: AnnotationSchema[],
  ): AnnotationSchema[] {
    return allAnnotations.filter(
      (a) =>
        a.id !== annotation.id &&
        a.entryId === annotation.entryId &&
        (a.type === annotation.type || a.color === annotation.color),
    )
  }
}

export const annotationSearchService = new AnnotationSearchService()
