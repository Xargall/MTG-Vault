/**
 * Chains `.abortSignal(signal)` onto a PostgREST query builder, but only
 * when a signal was actually given - `.abortSignal()` itself requires a
 * real AbortSignal (no `| undefined` overload), so every call site would
 * otherwise need its own if/else around the query builder.
 */
export function withSignal<T extends { abortSignal(signal: AbortSignal): T }>(builder: T, signal?: AbortSignal): T {
  return signal ? builder.abortSignal(signal) : builder;
}
