type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class CacheManager {
  private store: Map<string, CacheEntry<any>> = new Map()

  async getCachedResult<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    const now = Date.now()
    if (entry.expiresAt <= now) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async setCachedResult<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
  }

  async invalidateCache(pattern: string): Promise<void> {
    const keys = [...this.store.keys()]
    for (const k of keys) {
      if (k.includes(pattern)) this.store.delete(k)
    }
  }

  generateCacheKey(operation: string, params: Record<string, any>): string {
    const serialized = Object.keys(params)
      .sort()
      .map(k => `${k}:${String(params[k])}`)
      .join('|')
    return `${operation}::${serialized}`
  }
}

let _cacheManager: CacheManager | null = null
export const getCacheManager = (): CacheManager => {
  if (!_cacheManager) _cacheManager = new CacheManager()
  return _cacheManager
}

export default CacheManager



