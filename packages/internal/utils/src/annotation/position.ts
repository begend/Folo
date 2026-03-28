// Browser-compatible MD5-like hash function
export function calculateTextHash(text: string): string {
  // Simple hash function (djb2 algorithm)
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    const char = text.codePointAt(i) ?? 0
    hash = (hash << 5) + hash + char // hash * 33 + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

// Get text before/after selection for context
export function getTextContext(
  range: Range,
  contextLength = 50,
): {
  before: string
  after: string
} {
  const container = range.commonAncestorContainer
  const fullText = container.textContent || ""

  const { startOffset } = range
  const { endOffset } = range

  const beforeStart = Math.max(0, startOffset - contextLength)
  const afterEnd = Math.min(fullText.length, endOffset + contextLength)

  return {
    before: fullText.slice(beforeStart, startOffset),
    after: fullText.slice(endOffset, afterEnd),
  }
}

// Calculate character offset
export function calculateCharacterOffset(range: Range): number {
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(range.commonAncestorContainer)
  preCaretRange.setEnd(range.startContainer, range.startOffset)
  return preCaretRange.toString().length
}

// Position data interface
export interface PositionData {
  textHash?: string
  contextBefore?: string
  contextAfter?: string
  offset?: number
  length?: number
  xpath?: string
}

// Create position data from selection
export function createPositionDataFromSelection(range: Range, selectedText: string): PositionData {
  const context = getTextContext(range, 50)
  const offset = calculateCharacterOffset(range)

  return {
    textHash: calculateTextHash(selectedText),
    contextBefore: context.before,
    contextAfter: context.after,
    offset,
    length: selectedText.length,
  }
}

// Find position in article using mixed strategy
export function findAnnotationPosition(
  article: HTMLElement,
  positionData: PositionData,
): Range | null {
  // Strategy 1: Text + context matching
  const byText = findByTextAndContext(article, positionData)
  if (byText) return byText

  // Strategy 2: Offset matching
  if (positionData.offset !== undefined && positionData.length !== undefined) {
    const byOffset = findByOffset(article, positionData.offset, positionData.length)
    if (byOffset) return byOffset
  }

  // Strategy 3: XPath (fallback)
  if (positionData.xpath) {
    return findByXPath(article, positionData.xpath)
  }

  return null
}

// Strategy 1: Find by text and context
function findByTextAndContext(article: HTMLElement, positionData: PositionData): Range | null {
  if (!positionData.textHash) return null

  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null)

  let node: Node | null
  const fullText = article.textContent || ""

  while ((node = walker.nextNode())) {
    const text = node.textContent || ""
    // Check if this node contains text matching the hash
    const testString = text.trim()
    if (testString.length > 0) {
      const hash = calculateTextHash(testString)
      if (hash === positionData.textHash) {
        // Verify context matches
        if (positionData.contextBefore && !fullText.includes(positionData.contextBefore)) {
          continue
        }
        if (positionData.contextAfter && !fullText.includes(positionData.contextAfter)) {
          continue
        }

        // Found it!
        const range = document.createRange()
        range.setStart(node, 0)
        range.setEnd(node, testString.length)
        return range
      }
    }
  }

  return null
}

// Strategy 2: Find by offset
function findByOffset(article: HTMLElement, offset: number, length: number): Range | null {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, null)

  let currentOffset = 0
  let node: Node | null

  while ((node = walker.nextNode())) {
    const textLength = (node.textContent || "").length

    if (currentOffset + textLength >= offset) {
      const startOffset = offset - currentOffset
      const endOffset = Math.min(startOffset + length, textLength)

      const range = document.createRange()
      range.setStart(node, startOffset)
      range.setEnd(node, endOffset)
      return range
    }

    currentOffset += textLength
  }

  return null
}

// Strategy 3: Find by XPath
function findByXPath(article: HTMLElement, xpath: string): Range | null {
  try {
    const result = document.evaluate(
      xpath,
      article,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    )

    const node = result.singleNodeValue
    if (node) {
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, (node.textContent || "").length)
      return range
    }
  } catch {
    // Invalid XPath
  }

  return null
}

// Restore annotations in article
export function restoreAnnotations(
  article: HTMLElement,
  annotations: Array<{ id: string; positionData: PositionData; color?: string }>,
): Array<{ id: string; range: Range; color?: string }> {
  const restored: Array<{ id: string; range: Range; color?: string }> = []

  for (const annotation of annotations) {
    const range = findAnnotationPosition(article, annotation.positionData)
    if (range) {
      restored.push({
        id: annotation.id,
        range,
        color: annotation.color,
      })
    }
  }

  return restored
}
