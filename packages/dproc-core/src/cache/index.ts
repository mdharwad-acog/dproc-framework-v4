export class CacheManager {
  private store: Map<string, { value: any; expires: number }>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<any> {
    const cached = this.store.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : Infinity;
    this.store.set(key, { value, expires });
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }
}
