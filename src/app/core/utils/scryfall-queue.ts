/** Thrown when Scryfall responds 403 - treated as a rate limit, distinct from a normal request failure. */
export class ScryfallRateLimitError extends Error {
  constructor() {
    super('Scryfall rate limit (403)');
  }
}

/** Serializes Scryfall requests to at most 10/second (Scryfall's documented limit), regardless of how many callers fire at once. */
export class ScryfallQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = false;
  private lastRequest = 0;
  private readonly minDelay = 100; // 100ms = max 10/sec

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const now = Date.now();
        const wait = Math.max(0, this.minDelay - (now - this.lastRequest));
        await new Promise((r) => setTimeout(r, wait));
        this.lastRequest = Date.now();
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running) void this.processQueue();
    });
  }

  private async processQueue() {
    this.running = true;
    while (this.queue.length > 0) {
      await this.queue.shift()!();
    }
    this.running = false;
  }
}
