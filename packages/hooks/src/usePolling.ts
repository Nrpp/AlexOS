import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePollingResult<T> {
  data: T | null;
  /** Fetches immediately, outside the regular interval - e.g. right
   * after an Event Bus push tells you server state just changed, so the
   * UI doesn't wait for the next tick to catch up. */
  refetch: () => Promise<T | undefined>;
}

export interface UsePollingOptions {
  enabled?: boolean;
}

/**
 * Polls `fetcher` on a fixed interval and keeps the latest result in
 * state - for state the Event Bus can't tell you about by itself (a
 * server-side TTL quietly expiring, for instance) where periodically
 * re-checking is the only way to notice. Widgets that only need "tell
 * me when this changes" should keep using useEventBus instead; this is
 * for "and also check every so often regardless."
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options?: UsePollingOptions,
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const enabled = options?.enabled ?? true;

  const refetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      return result;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
    const interval = setInterval(() => void refetch(), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, enabled, refetch]);

  return { data, refetch };
}
