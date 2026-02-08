export type ConfigPathSegment = string | number
export type ConfigPath = Array<ConfigPathSegment>

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value]
  if (isRecord(value)) return { ...value }
  return value
}

function buildContainer(next: ConfigPathSegment): Record<string, unknown> | Array<unknown> {
  return typeof next === "number" ? [] : {}
}

export function getAtPath(source: unknown, path: ConfigPath): unknown {
  let current: unknown = source

  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined
      current = current[segment]
      continue
    }

    if (!isRecord(current)) return undefined
    current = current[segment]
  }

  return current
}

export function setAtPath<T>(source: T, path: ConfigPath, value: unknown): T {
  if (path.length === 0) {
    return value as T
  }

  const [head, ...tail] = path
  const root: unknown = cloneValue(source) ?? buildContainer(head)

  if (typeof head === "number") {
    const nextArray = Array.isArray(root) ? [...root] : []
    const existing = nextArray[head]
    nextArray[head] =
      tail.length === 0
        ? value
        : setAtPath(existing ?? buildContainer(tail[0]), tail, value)
    return nextArray as T
  }

  const nextObject = isRecord(root) ? { ...root } : {}
  const existing = nextObject[head]
  nextObject[head] =
    tail.length === 0
      ? value
      : setAtPath(existing ?? buildContainer(tail[0]), tail, value)
  return nextObject as T
}

export function unsetAtPath<T>(source: T, path: ConfigPath): T {
  if (path.length === 0) return source

  const [head, ...tail] = path
  const root: unknown = cloneValue(source)

  if (typeof head === "number") {
    if (!Array.isArray(root)) return source
    const nextArray = [...root]

    if (tail.length === 0) {
      if (head >= 0 && head < nextArray.length) {
        nextArray.splice(head, 1)
      }
      return nextArray as T
    }

    if (head < 0 || head >= nextArray.length) return source
    nextArray[head] = unsetAtPath(nextArray[head], tail)
    return nextArray as T
  }

  if (!isRecord(root)) return source
  const nextObject: Record<string, unknown> = { ...root }

  if (!(head in nextObject)) return source
  if (tail.length === 0) {
    delete nextObject[head]
    return nextObject as T
  }

  nextObject[head] = unsetAtPath(nextObject[head], tail)
  return nextObject as T
}
