import { useEffect } from "react";

/** Structural contract so this hook stays decoupled from @alexos/core's implementation. */
export interface EventBusLike {
  subscribe(eventName: string, handler: (payload: unknown) => void): () => void;
}

/**
 * Subscribes to a Core event for the lifetime of the component. Widgets use
 * this instead of ever fetching data directly - they ask the Core.
 */
export function useEventBus(
  bus: EventBusLike | null | undefined,
  eventName: string,
  handler: (payload: unknown) => void,
): void {
  useEffect(() => {
    if (!bus) return;
    return bus.subscribe(eventName, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, eventName]);
}
