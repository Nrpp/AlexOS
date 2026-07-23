import { createContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiClient, EventBusClient, type ConnectionState } from "@alexos/core";

export interface CoreContextValue {
  eventBus: EventBusClient;
  apiClient: ApiClient;
  connectionState: ConnectionState;
}

export const CoreContext = createContext<CoreContextValue | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";

/**
 * The frontend's connection to the AlexOS Core. Nothing below this
 * provider talks to the backend directly - everything goes through the
 * single EventBusClient/ApiClient instance created here.
 */
export function CoreProvider({ children }: { children: ReactNode }) {
  const [eventBus] = useState(() => new EventBusClient(`${WS_BASE_URL}/api/v1/events/ws`));
  const [apiClient] = useState(() => new ApiClient(API_BASE_URL));
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const unsubscribe = eventBus.onStateChange(setConnectionState);
    eventBus.connect();
    return () => {
      unsubscribe();
      eventBus.disconnect();
    };
  }, [eventBus]);

  const value = useMemo<CoreContextValue>(
    () => ({ eventBus, apiClient, connectionState }),
    [eventBus, apiClient, connectionState],
  );

  return <CoreContext.Provider value={value}>{children}</CoreContext.Provider>;
}
