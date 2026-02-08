import type { DiffLine } from "@/lib/code-types"

// --- Types ---

export interface IntralineSpan {
  start: number
  length: number
}

export interface RowSide {
  kind: "add" | "del" | "context" | "placeholder"
  content: string
  lineNumber: number | null
  spans: Array<IntralineSpan>
}

export interface RowModel {
  left: RowSide
  right: RowSide
  isSeparator: boolean
  isContext: boolean
  hunkId: number
  hunkHeader: string
}

// --- Tokenizer ---

export function tokenize(text: string): Array<string> {
  return text.match(/\w+|\W+/g) ?? []
}

// --- Intraline highlighting ---

const MAX_TOKENS = 200

export function computeIntraline(
  oldText: string,
  newText: string,
): [Array<IntralineSpan>, Array<IntralineSpan>] {
  const oldTokens = tokenize(oldText)
  const newTokens = tokenize(newText)

  if (
    oldTokens.length > MAX_TOKENS ||
    newTokens.length > MAX_TOKENS
  ) {
    return [[], []]
  }

  if (oldTokens.length === 0 && newTokens.length === 0) {
    return [[], []]
  }

  // DP-LCS on tokens
  const m = oldTokens.length
  const n = newTokens.length
  const dp: Array<Array<number>> = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find which tokens are in LCS
  const oldInLcs = new Set<number>()
  const newInLcs = new Set<number>()
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (oldTokens[i - 1] === newTokens[j - 1]) {
      oldInLcs.add(i - 1)
      newInLcs.add(j - 1)
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  // Build spans for tokens NOT in LCS (= changed tokens)
  const oldSpans = buildSpansFromTokens(oldTokens, oldInLcs)
  const newSpans = buildSpansFromTokens(newTokens, newInLcs)

  return [oldSpans, newSpans]
}

function buildSpansFromTokens(
  tokens: Array<string>,
  inLcs: Set<number>,
): Array<IntralineSpan> {
  const spans: Array<IntralineSpan> = []
  let charOffset = 0

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]
    if (!inLcs.has(t)) {
      // Merge with previous span if adjacent
      const last = spans.length > 0 ? spans[spans.length - 1] : null
      if (last && last.start + last.length === charOffset) {
        last.length += token.length
      } else {
        spans.push({ start: charOffset, length: token.length })
      }
    }
    charOffset += token.length
  }

  return spans
}

// --- Row model builder ---

const PLACEHOLDER: RowSide = {
  kind: "placeholder",
  content: "",
  lineNumber: null,
  spans: [],
}

export function buildRowModels(lines: Array<DiffLine>): Array<RowModel> {
  const rows: Array<RowModel> = []
  let idx = 0
  let hunkId = 0

  while (idx < lines.length) {
    const line = lines[idx]

    // Hunk separator
    if (line.kind === "hunk") {
      hunkId++
      rows.push({
        left: { ...PLACEHOLDER },
        right: { ...PLACEHOLDER },
        isSeparator: true,
        isContext: false,
        hunkId,
        hunkHeader: line.content,
      })
      idx++
      continue
    }

    // Context line
    if (line.kind === "context") {
      const side: RowSide = {
        kind: "context",
        content: line.content,
        lineNumber: null,
        spans: [],
      }
      rows.push({
        left: {
          ...side,
          lineNumber: line.oldLineno ?? null,
        },
        right: {
          ...side,
          lineNumber: line.newLineno ?? null,
        },
        isSeparator: false,
        isContext: true,
        hunkId,
        hunkHeader: "",
      })
      idx++
      continue
    }

    // Collect consecutive del then add blocks
    const dels: Array<DiffLine> = []
    const adds: Array<DiffLine> = []

    while (idx < lines.length && lines[idx].kind === "del") {
      dels.push(lines[idx])
      idx++
    }
    while (idx < lines.length && lines[idx].kind === "add") {
      adds.push(lines[idx])
      idx++
    }

    const maxLen = Math.max(dels.length, adds.length)
    for (let p = 0; p < maxLen; p++) {
      const del = p < dels.length ? dels[p] : null
      const add = p < adds.length ? adds[p] : null

      // Compute intraline if both sides present (paired modification)
      let delSpans: Array<IntralineSpan> = []
      let addSpans: Array<IntralineSpan> = []
      if (del && add) {
        ;[delSpans, addSpans] = computeIntraline(del.content, add.content)
      }

      const left: RowSide = del
        ? {
            kind: "del",
            content: del.content,
            lineNumber: del.oldLineno ?? null,
            spans: delSpans,
          }
        : { ...PLACEHOLDER }

      const right: RowSide = add
        ? {
            kind: "add",
            content: add.content,
            lineNumber: add.newLineno ?? null,
            spans: addSpans,
          }
        : { ...PLACEHOLDER }

      rows.push({
        left,
        right,
        isSeparator: false,
        isContext: false,
        hunkId,
        hunkHeader: "",
      })
    }
  }

  return rows
}
