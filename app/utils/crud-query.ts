const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function parsePagination(input: { page?: unknown; limit?: unknown }) {
  const rawPage = Number(input.page ?? DEFAULT_PAGE)
  const rawLimit = Number(input.limit ?? DEFAULT_LIMIT)

  return {
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE,
    limit:
      Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT,
  }
}

export function parsePreloads(rawPreloads: unknown, allowedPreloads: string[]) {
  if (!rawPreloads) {
    return []
  }

  const requestedPreloads = String(rawPreloads)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const invalidPreloads = requestedPreloads.filter((preload) => !allowedPreloads.includes(preload))

  if (invalidPreloads.length > 0) {
    throw {
      message: `Invalid preload(s): ${invalidPreloads.join(', ')}`,
      status: 400,
    }
  }

  return [...new Set(requestedPreloads)]
}
