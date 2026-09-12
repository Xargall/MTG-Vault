/** Serializes async calls to at most one per `minDelayMs`, regardless of how many callers fire at once - shared by ScryfallQueue and MoxfieldService, each with their own API's own documented rate limit. */
export class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = false;
  private lastRequest = 0;

  constructor(private readonly minDelayMs: number) {}

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        const now = Date.now();
        const wait = Math.max(0, this.minDelayMs - (now - this.lastRequest));
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
