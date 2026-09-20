import { describe, it, expect } from "vitest"
import { diffDeliverable } from "../lib/diff"

describe("diffDeliverable", () => {
  it("detects added, removed, changed and unchanged flat fields", () => {
    const oldVal = { title: "Old", count: 1, toRemove: true }
    const newVal = { title: "New", count: 1, toAdd: false }

    const results = diffDeliverable(oldVal, newVal)

    const titleDiff = results.find(r => r.path === "title")
    expect(titleDiff?.type).toBe("changed")
    expect(titleDiff?.oldValue).toBe("Old")
    expect(titleDiff?.newValue).toBe("New")
    expect(titleDiff?.diffBlocks).toBeDefined()

    const countDiff = results.find(r => r.path === "count")
    expect(countDiff?.type).toBe("unchanged")

    const removedDiff = results.find(r => r.path === "toRemove")
    expect(removedDiff?.type).toBe("removed")

    const addedDiff = results.find(r => r.path === "toAdd")
    expect(addedDiff?.type).toBe("added")
  })

  it("handles empty arrays properly", () => {
    const oldVal = { items: [] }
    const newVal = { items: [{ id: "A", name: "Alpha" }] }

    const results = diffDeliverable(oldVal, newVal)
    const addedDiff = results.find(r => r.path === "items[A].name")
    expect(addedDiff?.type).toBe("added")
    expect(addedDiff?.newValue).toBe("Alpha")
  })

  it("matches objects in arrays by id and ignores reordering", () => {
    const oldVal = {
      items: [
        { id: "1", val: "A" },
        { id: "2", val: "B" }
      ]
    }
    const newVal = {
      items: [
        { id: "2", val: "B Modified" },
        { id: "1", val: "A" }
      ]
    }

    const results = diffDeliverable(oldVal, newVal)

    const val1 = results.find(r => r.path === "items[1].val")
    expect(val1?.type).toBe("unchanged")

    const val2 = results.find(r => r.path === "items[2].val")
    expect(val2?.type).toBe("changed")
    expect(val2?.oldValue).toBe("B")
    expect(val2?.newValue).toBe("B Modified")
  })
})
