export type StoredWebsiteSpec = {
  spec: unknown
  name: string
  savedAt: Date
}

const globalForSpecStore = globalThis as unknown as {
  websiteSpecStore?: Map<string, StoredWebsiteSpec>
}

export const specStore =
  globalForSpecStore.websiteSpecStore ??
  new Map<string, StoredWebsiteSpec>()

// Keep one store during local development hot reloads. Production persistence is
// handled by PostgreSQL in publish-spec; this cache is only a fast-path fallback.
if (process.env.NODE_ENV !== "production") {
  globalForSpecStore.websiteSpecStore = specStore
}
