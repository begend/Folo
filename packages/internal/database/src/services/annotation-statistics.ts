import type { AnnotationSchema } from "../schemas/types"
import { annotationService } from "./annotation"

export interface AnnotationStatistics {
  totalAnnotations: number
  annotationsByEntry: Record<string, number>
  mostAnnotatedEntries: Array<{ entryId: string; count: number }>
  annotationsByType: Record<string, number>
  annotationsByColor: Record<string, number>
  annotationsWithNotes: number
  averageNotesPerEntry: number
  dateRange: {
    earliest: Date | null
    latest: Date | null
    span: number | null // in days
  }
  recentActivity: Array<{
    date: string
    count: number
  }>
}

class AnnotationStatisticsService {
  // Get comprehensive statistics
  async getStatistics(): Promise<AnnotationStatistics> {
    const allAnnotations = await annotationService.getAnnotationsByEntry("") // Get all

    return this.calculateStatistics(allAnnotations)
  }

  // Calculate statistics from annotations
  calculateStatistics(annotations: AnnotationSchema[]): AnnotationStatistics {
    const stats: AnnotationStatistics = {
      totalAnnotations: annotations.length,
      annotationsByEntry: {},
      mostAnnotatedEntries: [],
      annotationsByType: {},
      annotationsByColor: {},
      annotationsWithNotes: 0,
      averageNotesPerEntry: 0,
      dateRange: {
        earliest: null,
        latest: null,
        span: null,
      },
      recentActivity: [],
    }

    // Count by entry
    const entryCounts: Record<string, number> = {}
    annotations.forEach((annotation) => {
      entryCounts[annotation.entryId] = (entryCounts[annotation.entryId] || 0) + 1

      // Count by type
      stats.annotationsByType[annotation.type] = (stats.annotationsByType[annotation.type] || 0) + 1

      // Count by color
      if (annotation.color) {
        stats.annotationsByColor[annotation.color] =
          (stats.annotationsByColor[annotation.color] || 0) + 1
      }

      // Count with notes
      if (annotation.note) {
        stats.annotationsWithNotes++
      }
    })

    stats.annotationsByEntry = entryCounts

    // Most annotated entries (top 10)
    stats.mostAnnotatedEntries = Object.entries(entryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([entryId, count]) => ({ entryId, count }))

    // Average notes per entry
    const entriesWithNotes = Object.keys(entryCounts).length
    stats.averageNotesPerEntry =
      entriesWithNotes > 0 ? stats.annotationsWithNotes / entriesWithNotes : 0

    // Date range
    const dates = annotations.map((a) => a.createdAt.getTime()).filter((d) => !Number.isNaN(d))
    if (dates.length > 0) {
      stats.dateRange.earliest = new Date(Math.min(...dates))
      stats.dateRange.latest = new Date(Math.max(...dates))
      stats.dateRange.span =
        (stats.dateRange.latest.getTime() - stats.dateRange.earliest.getTime()) /
        (1000 * 60 * 60 * 24)
    }

    // Recent activity (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentAnnotations = annotations.filter((a) => a.createdAt >= thirtyDaysAgo)
    const activityByDate: Record<string, number> = {}

    recentAnnotations.forEach((annotation) => {
      const dateKey = annotation.createdAt.toISOString().slice(0, 10)
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1
    })

    stats.recentActivity = Object.entries(activityByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, count]) => ({ date, count }))
      .slice(0, 30)

    return stats
  }

  // Get user productivity insights
  async getProductivityInsights(days = 30) {
    const allAnnotations = await annotationService.getAnnotationsByEntry("")
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const recentAnnotations = allAnnotations.filter((a) => a.createdAt >= cutoffDate)

    const insights = {
      totalAnnotations: recentAnnotations.length,
      averagePerDay: recentAnnotations.length / days,
      mostActiveDay: this.getMostActiveDay(recentAnnotations),
      peakHours: this.getPeakHours(recentAnnotations),
      favoriteColor: this.getFavoriteColor(recentAnnotations),
      noteRatio: recentAnnotations.filter((a) => a.note).length / recentAnnotations.length,
    }

    return insights
  }

  private getMostActiveDay(annotations: AnnotationSchema[]): string | null {
    const dayCounts: Record<string, number> = {}

    annotations.forEach((annotation) => {
      const dayKey = annotation.createdAt.toISOString().slice(0, 10)
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1
    })

    const sorted = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)
    return sorted.length > 0 ? (sorted[0]?.[0] ?? null) : null
  }

  private getPeakHours(annotations: AnnotationSchema[]): Array<{ hour: number; count: number }> {
    const hourCounts: Record<number, number> = {}

    annotations.forEach((annotation) => {
      const hour = annotation.createdAt.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => b.count - a.count)
  }

  private getFavoriteColor(annotations: AnnotationSchema[]): string | null {
    const colorCounts: Record<string, number> = {}

    annotations.forEach((annotation) => {
      if (annotation.color) {
        colorCounts[annotation.color] = (colorCounts[annotation.color] || 0) + 1
      }
    })

    const sorted = Object.entries(colorCounts).sort(([, a], [, b]) => b - a)
    return sorted.length > 0 ? (sorted[0]?.[0] ?? null) : null
  }
}

export const annotationStatisticsService = new AnnotationStatisticsService()
