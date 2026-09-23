import { diffWords, diffLines } from "diff"

export type DiffChangeType = "added" | "removed" | "changed" | "unchanged"

export type DiffBlock = {
  value: string
  added?: boolean
  removed?: boolean
}

export type DiffResult = {
  path: string
  type: DiffChangeType
  oldValue?: unknown
  newValue?: unknown
  diffBlocks?: DiffBlock[]
}

export type LineDiffItem = {
  value: string
  type: "added" | "removed" | "unchanged"
}

export type TextDiffSummary = {
  additions: number
  deletions: number
  lines: LineDiffItem[]
}

function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === "object" && !Array.isArray(val)
}

/**
 * Builds a flat list of paths traversing an object or array.
 * Maps Array elements by `id` if available to prevent reorder noise,
 * otherwise falls back to index.
 */
function flatten(obj: unknown, prefix = "", map = new Map<string, unknown>()): Map<string, unknown> {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      let key = `[${index}]`
      if (isObject(item) && "id" in item) {
        key = `[${item.id}]`
      }
      const newPrefix = prefix ? `${prefix}${key}` : key
      if (isObject(item) || Array.isArray(item)) {
        flatten(item, newPrefix, map)
      } else {
        map.set(newPrefix, item)
      }
    })
  } else if (isObject(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${k}` : k
      if (isObject(v) || Array.isArray(v)) {
        flatten(v, newPrefix, map)
      } else {
        map.set(newPrefix, v)
      }
    }
  } else if (obj !== undefined) {
    map.set(prefix, obj)
  }
  return map
}

export function diffDeliverable(oldContent: unknown, newContent: unknown): DiffResult[] {
  const oldFlat = flatten(oldContent)
  const newFlat = flatten(newContent)
  const results: DiffResult[] = []

  const allKeys = new Set([...Array.from(oldFlat.keys()), ...Array.from(newFlat.keys())])
  const sortedKeys = Array.from(allKeys).sort()

  for (const key of sortedKeys) {
    const hasOld = oldFlat.has(key)
    const hasNew = newFlat.has(key)
    const oldVal = oldFlat.get(key)
    const newVal = newFlat.get(key)

    if (hasOld && !hasNew) {
      results.push({
        path: key,
        type: "removed",
        oldValue: oldVal
      })
    } else if (!hasOld && hasNew) {
      results.push({
        path: key,
        type: "added",
        newValue: newVal
      })
    } else if (oldVal !== newVal) {
      let diffBlocks: DiffBlock[] | undefined = undefined
      if (typeof oldVal === "string" && typeof newVal === "string") {
        diffBlocks = diffWords(oldVal, newVal)
      }
      results.push({
        path: key,
        type: "changed",
        oldValue: oldVal,
        newValue: newVal,
        diffBlocks
      })
    } else {
      results.push({
        path: key,
        type: "unchanged",
        oldValue: oldVal,
        newValue: newVal
      })
    }
  }

  return results
}

export function computeDiff(textA: string, textB: string): TextDiffSummary {
  const changes = diffLines(textA, textB)
  let additions = 0
  let deletions = 0
  const lines: LineDiffItem[] = []

  for (const change of changes) {
    const splitLines = change.value.replace(/\n$/, "").split("\n")
    for (const line of splitLines) {
      if (change.added) {
        additions++
        lines.push({ value: line, type: "added" })
      } else if (change.removed) {
        deletions++
        lines.push({ value: line, type: "removed" })
      } else {
        lines.push({ value: line, type: "unchanged" })
      }
    }
  }

  return { additions, deletions, lines }
}
