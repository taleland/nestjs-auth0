export type CacheEvent = 'hit' | 'miss' | 'set' | 'invalidate';

export type CacheMetricsListener = (event: CacheEvent, path: string) => void;

export type Auth0CacheMetricsSnapshot = {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
};

export class Auth0CacheMetrics {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;
  private readonly listeners: CacheMetricsListener[] = [];

  public record (event: CacheEvent, path: string): void {
    switch (event) {
      case 'hit':
        this.hits++;
        break;
      case 'miss':
        this.misses++;
        break;
      case 'set':
        this.sets++;
        break;
      case 'invalidate':
        this.invalidations++;
        break;
    }

    for (const listener of this.listeners) {
      listener(event, path);
    }
  }

  public on (listener: CacheMetricsListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);

      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public snapshot (): Auth0CacheMetricsSnapshot {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
    };
  }

  public reset (): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.invalidations = 0;
  }
}
