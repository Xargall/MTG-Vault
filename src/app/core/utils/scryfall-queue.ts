import { RequestQueue } from './request-queue';

/** Thrown when Scryfall responds 403 - treated as a rate limit, distinct from a normal request failure. */
export class ScryfallRateLimitError extends Error {
  constructor() {
    super('Scryfall rate limit (403)');
  }
}

/** Serializes Scryfall requests to at most 10/second (Scryfall's documented limit), regardless of how many callers fire at once. */
export class ScryfallQueue extends RequestQueue {
  constructor() {
    super(100); // 100ms = max 10/sec
  }
}
