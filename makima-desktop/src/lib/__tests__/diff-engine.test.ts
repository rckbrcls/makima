import { describe, expect, it } from "vitest"
import type { DiffLine } from "@/lib/code-types"
import {
  buildRowModels,
  computeIntraline,
  tokenize,
} from "@/lib/diff-engine"

// --- tokenize ---

describe("tokenize", () => {
  it("splits words and non-word tokens", () => {
    expect(tokenize("hello world")).toEqual(["hello", " ", "world"])
  })

  it("handles punctuation", () => {
    expect(tokenize("foo.bar(baz)")).toEqual([
      "foo",
      ".",
      "bar",
      "(",
      "baz",
      ")",
    ])
  })

  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([])
  })

  it("handles whitespace-only input", () => {
    expect(tokenize("   ")).toEqual(["   "])
  })

  it("handles mixed tokens", () => {
    expect(tokenize("a + b")).toEqual(["a", " + ", "b"])
  })
})

// --- computeIntraline ---

describe("computeIntraline", () => {
  it("returns empty spans for identical strings", () => {
    const [oldSpans, newSpans] = computeIntraline("hello", "hello")
    expect(oldSpans).toEqual([])
    expect(newSpans).toEqual([])
  })

  it("highlights a single word change", () => {
    const [oldSpans, newSpans] = computeIntraline("hello world", "hello earth")
    // "world" starts at index 6, length 5
    expect(oldSpans).toEqual([{ start: 6, length: 5 }])
    // "earth" starts at index 6, length 5
    expect(newSpans).toEqual([{ start: 6, length: 5 }])
  })

  it("highlights added tokens", () => {
    const [oldSpans, newSpans] = computeIntraline("a b", "a x b")
    // Old: nothing changed — "a" and "b" are in LCS
    expect(oldSpans).toEqual([])
    // New: "x " is inserted at position 2 (after "a ")
    expect(newSpans.length).toBeGreaterThan(0)
  })

  it("highlights removed tokens", () => {
    const [oldSpans, newSpans] = computeIntraline("a x b", "a b")
    expect(oldSpans.length).toBeGreaterThan(0)
    expect(newSpans).toEqual([])
  })

  it("returns both sides highlighted for completely different strings", () => {
    const [oldSpans, newSpans] = computeIntraline("abc", "xyz")
    expect(oldSpans).toEqual([{ start: 0, length: 3 }])
    expect(newSpans).toEqual([{ start: 0, length: 3 }])
  })

  it("returns empty spans when both sides are empty", () => {
    const [oldSpans, newSpans] = computeIntraline("", "")
    expect(oldSpans).toEqual([])
    expect(newSpans).toEqual([])
  })

  it("bails out for very long lines", () => {
    const longLine = Array.from({ length: 250 }, (_, i) => `word${i}`).join(
      " ",
    )
    const [oldSpans, newSpans] = computeIntraline(longLine, longLine + " extra")
    expect(oldSpans).toEqual([])
    expect(newSpans).toEqual([])
  })

  it("handles one empty side", () => {
    const [oldSpans, newSpans] = computeIntraline("hello", "")
    // "hello" is all changed
    expect(oldSpans).toEqual([{ start: 0, length: 5 }])
    expect(newSpans).toEqual([])
  })
})

// --- buildRowModels ---

describe("buildRowModels", () => {
  it("returns empty array for empty input", () => {
    expect(buildRowModels([])).toEqual([])
  })

  it("handles context lines", () => {
    const lines: Array<DiffLine> = [
      { kind: "context", content: "  unchanged", oldLineno: 1, newLineno: 1 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0].isContext).toBe(true)
    expect(rows[0].isSeparator).toBe(false)
    expect(rows[0].left.kind).toBe("context")
    expect(rows[0].right.kind).toBe("context")
    expect(rows[0].left.lineNumber).toBe(1)
    expect(rows[0].right.lineNumber).toBe(1)
  })

  it("handles hunk separators with header text", () => {
    const lines: Array<DiffLine> = [
      { kind: "hunk", content: "@@ -1,5 +1,7 @@" },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0].isSeparator).toBe(true)
    expect(rows[0].hunkHeader).toBe("@@ -1,5 +1,7 @@")
    expect(rows[0].hunkId).toBe(1)
  })

  it("handles single del line", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "old line", oldLineno: 5 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0].left.kind).toBe("del")
    expect(rows[0].left.lineNumber).toBe(5)
    expect(rows[0].right.kind).toBe("placeholder")
    expect(rows[0].right.lineNumber).toBeNull()
  })

  it("handles single add line", () => {
    const lines: Array<DiffLine> = [
      { kind: "add", content: "new line", newLineno: 8 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0].left.kind).toBe("placeholder")
    expect(rows[0].right.kind).toBe("add")
    expect(rows[0].right.lineNumber).toBe(8)
  })

  it("pairs del+add with intraline spans", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "hello world", oldLineno: 1 },
      { kind: "add", content: "hello earth", newLineno: 1 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(1)
    expect(rows[0].left.kind).toBe("del")
    expect(rows[0].right.kind).toBe("add")
    // Intraline spans should be populated
    expect(rows[0].left.spans.length).toBeGreaterThan(0)
    expect(rows[0].right.spans.length).toBeGreaterThan(0)
  })

  it("handles unbalanced block: 3 del + 1 add", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "line A", oldLineno: 1 },
      { kind: "del", content: "line B", oldLineno: 2 },
      { kind: "del", content: "line C", oldLineno: 3 },
      { kind: "add", content: "line X", newLineno: 1 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(3)

    // First row: paired
    expect(rows[0].left.kind).toBe("del")
    expect(rows[0].right.kind).toBe("add")

    // Second row: del on left, placeholder on right
    expect(rows[1].left.kind).toBe("del")
    expect(rows[1].right.kind).toBe("placeholder")

    // Third row: del on left, placeholder on right
    expect(rows[2].left.kind).toBe("del")
    expect(rows[2].right.kind).toBe("placeholder")
  })

  it("handles unbalanced block: 1 del + 3 adds", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "old", oldLineno: 5 },
      { kind: "add", content: "new1", newLineno: 5 },
      { kind: "add", content: "new2", newLineno: 6 },
      { kind: "add", content: "new3", newLineno: 7 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(3)

    expect(rows[0].left.kind).toBe("del")
    expect(rows[0].right.kind).toBe("add")
    expect(rows[1].left.kind).toBe("placeholder")
    expect(rows[1].right.kind).toBe("add")
    expect(rows[2].left.kind).toBe("placeholder")
    expect(rows[2].right.kind).toBe("add")
  })

  it("tracks hunkId across multiple hunks", () => {
    const lines: Array<DiffLine> = [
      { kind: "hunk", content: "@@ -1,3 +1,3 @@" },
      { kind: "context", content: "a", oldLineno: 1, newLineno: 1 },
      { kind: "hunk", content: "@@ -10,3 +10,3 @@" },
      { kind: "context", content: "b", oldLineno: 10, newLineno: 10 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(4)
    expect(rows[0].hunkId).toBe(1) // first hunk separator
    expect(rows[1].hunkId).toBe(1) // context after first hunk
    expect(rows[2].hunkId).toBe(2) // second hunk separator
    expect(rows[3].hunkId).toBe(2) // context after second hunk
  })

  it("handles realistic multi-hunk diff", () => {
    const lines: Array<DiffLine> = [
      { kind: "hunk", content: "@@ -1,4 +1,5 @@" },
      { kind: "context", content: "import React", oldLineno: 1, newLineno: 1 },
      { kind: "del", content: "import { old } from 'old'", oldLineno: 2 },
      { kind: "add", content: "import { new1 } from 'new'", newLineno: 2 },
      { kind: "add", content: "import { new2 } from 'new2'", newLineno: 3 },
      { kind: "context", content: "", oldLineno: 3, newLineno: 4 },
      { kind: "hunk", content: "@@ -10,3 +11,4 @@" },
      {
        kind: "context",
        content: "function render() {",
        oldLineno: 10,
        newLineno: 11,
      },
      { kind: "del", content: "  return null", oldLineno: 11 },
      { kind: "add", content: "  return <div>", newLineno: 12 },
      { kind: "add", content: "    Hello", newLineno: 13 },
      { kind: "add", content: "  </div>", newLineno: 14 },
      { kind: "context", content: "}", oldLineno: 12, newLineno: 15 },
    ]

    const rows = buildRowModels(lines)

    // Hunk 1 separator
    expect(rows[0].isSeparator).toBe(true)
    expect(rows[0].hunkId).toBe(1)

    // Context: import React
    expect(rows[1].isContext).toBe(true)

    // del + first add paired
    expect(rows[2].left.kind).toBe("del")
    expect(rows[2].right.kind).toBe("add")

    // placeholder + second add
    expect(rows[3].left.kind).toBe("placeholder")
    expect(rows[3].right.kind).toBe("add")

    // Context: empty line
    expect(rows[4].isContext).toBe(true)

    // Hunk 2 separator
    expect(rows[5].isSeparator).toBe(true)
    expect(rows[5].hunkId).toBe(2)

    // Context: function render
    expect(rows[6].isContext).toBe(true)

    // del + first add paired
    expect(rows[7].left.kind).toBe("del")
    expect(rows[7].right.kind).toBe("add")

    // placeholder + more adds
    expect(rows[8].left.kind).toBe("placeholder")
    expect(rows[8].right.kind).toBe("add")
    expect(rows[9].left.kind).toBe("placeholder")
    expect(rows[9].right.kind).toBe("add")

    // Context: closing brace
    expect(rows[10].isContext).toBe(true)
  })

  it("unpaired del lines have no intraline spans", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "removed line", oldLineno: 1 },
    ]
    const rows = buildRowModels(lines)
    expect(rows[0].left.spans).toEqual([])
  })

  it("unpaired add lines have no intraline spans", () => {
    const lines: Array<DiffLine> = [
      { kind: "add", content: "added line", newLineno: 1 },
    ]
    const rows = buildRowModels(lines)
    expect(rows[0].right.spans).toEqual([])
  })

  it("placeholder sides have correct properties", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "removed", oldLineno: 5 },
    ]
    const rows = buildRowModels(lines)
    const placeholder = rows[0].right
    expect(placeholder.kind).toBe("placeholder")
    expect(placeholder.content).toBe("")
    expect(placeholder.lineNumber).toBeNull()
    expect(placeholder.spans).toEqual([])
  })

  it("context lines share same content on both sides", () => {
    const lines: Array<DiffLine> = [
      {
        kind: "context",
        content: "shared line",
        oldLineno: 10,
        newLineno: 12,
      },
    ]
    const rows = buildRowModels(lines)
    expect(rows[0].left.content).toBe("shared line")
    expect(rows[0].right.content).toBe("shared line")
    expect(rows[0].left.lineNumber).toBe(10)
    expect(rows[0].right.lineNumber).toBe(12)
  })

  it("handles consecutive context lines", () => {
    const lines: Array<DiffLine> = [
      { kind: "context", content: "line 1", oldLineno: 1, newLineno: 1 },
      { kind: "context", content: "line 2", oldLineno: 2, newLineno: 2 },
      { kind: "context", content: "line 3", oldLineno: 3, newLineno: 3 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(3)
    rows.forEach((row) => {
      expect(row.isContext).toBe(true)
      expect(row.isSeparator).toBe(false)
    })
  })

  it("handles del-context-add as separate blocks", () => {
    const lines: Array<DiffLine> = [
      { kind: "del", content: "old", oldLineno: 1 },
      { kind: "context", content: "middle", oldLineno: 2, newLineno: 1 },
      { kind: "add", content: "new", newLineno: 2 },
    ]
    const rows = buildRowModels(lines)
    expect(rows).toHaveLength(3)
    // Del is not paired with add because context separates them
    expect(rows[0].left.kind).toBe("del")
    expect(rows[0].right.kind).toBe("placeholder")
    expect(rows[1].isContext).toBe(true)
    expect(rows[2].left.kind).toBe("placeholder")
    expect(rows[2].right.kind).toBe("add")
  })
})
