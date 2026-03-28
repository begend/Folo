import type { AnnotationSchema } from "../schemas/types"
import { annotationService } from "./annotation"

interface ExportOptions {
  format: "markdown" | "json"
  includeMetadata?: boolean
}

class AnnotationExportService {
  // Export annotations for an entry
  async exportAnnotations(entryId: string, options: ExportOptions): Promise<string> {
    const annotations = await annotationService.getAnnotationsByEntry(entryId)

    if (options.format === "json") {
      return this.exportAsJSON(annotations, options.includeMetadata)
    } else {
      return this.exportAsMarkdown(annotations, options.includeMetadata)
    }
  }

  // Export as JSON
  private exportAsJSON(annotations: AnnotationSchema[], includeMetadata = true): string {
    const data = includeMetadata
      ? annotations
      : annotations.map(({ id, entryId, type, text, note, color }) => ({
          id,
          entryId,
          type,
          text,
          note,
          color,
        }))

    return JSON.stringify(data, null, 2)
  }

  // Export as Markdown
  private exportAsMarkdown(annotations: AnnotationSchema[], includeMetadata = true): string {
    const lines: string[] = [`# 标注导出`, `导出时间: ${new Date().toLocaleString()}`, ``]

    const highlights = annotations.filter((a) => a.type === "highlight" || a.type === "mixed")
    const notes = annotations.filter((a) => a.type === "note" || a.type === "mixed")

    if (highlights.length > 0) {
      lines.push(`## 高亮 (${highlights.length})`, ``)

      const highlightLines = highlights.flatMap((annotation, index) => {
        const result = []
        if (annotation.text) {
          const color = annotation.color ? `[${annotation.color}] ` : ""
          result.push(`${index + 1}. ${color}"${annotation.text}"`)
        }
        if (annotation.note) {
          result.push(`   笔记: ${annotation.note}`)
        }
        if (includeMetadata) {
          result.push(`   时间: ${new Date(annotation.createdAt).toLocaleString()}`)
        }
        result.push(``)
        return result
      })
      lines.push(...highlightLines)
    }

    if (notes.length > 0) {
      lines.push(`## 独立笔记`, ``)

      const noteAnnotations = annotations.filter((a) => a.type === "note")
      for (const [index, annotation] of noteAnnotations.entries()) {
        if (annotation.note) {
          lines.push(`${index + 1}. ${annotation.note}`)
        }
        if (includeMetadata) {
          lines.push(`   时间: ${new Date(annotation.createdAt).toLocaleString()}`)
        }
        lines.push(``)
      }
    }

    return lines.join("\n")
  }

  // Export single annotation as Markdown quote
  exportAnnotationAsMarkdown(annotation: AnnotationSchema): string {
    if (annotation.text) {
      const color = annotation.color ? `[${annotation.color}] ` : ""
      const text = `${color}> "${annotation.text}"`
      if (annotation.note) {
        return `${text}\n\n**笔记:**\n\n${annotation.note}\n\n*${new Date(annotation.createdAt).toLocaleString()}*`
      }
      return `${text}\n\n*${new Date(annotation.createdAt).toLocaleString()}*`
    } else if (annotation.note) {
      return `**笔记:**\n\n${annotation.note}\n\n*${new Date(annotation.createdAt).toLocaleString()}*`
    } else {
      return `*${new Date(annotation.createdAt).toLocaleString()}*`
    }
  }

  // Download exported annotations as file
  downloadAsFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Export and download annotations
  async exportAndDownload(
    entryId: string,
    entryTitle?: string,
    format: "markdown" | "json" = "markdown",
  ): Promise<void> {
    const content = await this.exportAnnotations(entryId, { format })
    const timestamp = new Date().toISOString().slice(0, 10)
    const safeTitle = entryTitle
      ? entryTitle.replaceAll(/[^a-z0-9\u4e00-\u9fa5]/gi, "_")
      : "annotations"
    const filename = `${safeTitle}_annotations_${timestamp}.${format === "markdown" ? "md" : "json"}`
    const mimeType = format === "markdown" ? "text/markdown" : "application/json"

    this.downloadAsFile(content, filename, mimeType)
  }

  // Export and download annotations
  async exportAndDownload(
    entryId: string,
    entryTitle?: string,
    format: "markdown" | "json" = "markdown",
  ): Promise<void> {
    const content = await this.exportAnnotations(entryId, { format })
    const timestamp = new Date().toISOString().slice(0, 10)
    const safeTitle = entryTitle
      ? entryTitle.replaceAll(/[^a-z0-9\u4e00-\u9fa5]/gi, "_")
      : "annotations"
    const filename = `${safeTitle}_annotations_${timestamp}.${format === "markdown" ? "md" : "json"}`
    const mimeType = format === "markdown" ? "text/markdown" : "application/json"

    this.downloadAsFile(content, filename, mimeType)
  }
}

export const annotationExportService = new AnnotationExportService()
