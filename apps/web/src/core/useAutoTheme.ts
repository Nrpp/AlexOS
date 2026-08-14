import { useEffect, useSyncExternalStore } from "react";
import { useTheme } from "@alexos/hooks";
import { useCore } from "./useCore";
import { getAutoThemeEnabled, setAutoThemeEnabled, subscribeAutoThemeEnabled } from "./autoTheme";

// Sunrise/sunset don't move fast enough to need more frequent checks;
// this just needs to catch the moment the sun crosses each threshold
// within a few minutes.
const CHECK_INTERVAL_MS = 5 * 60_000;

interface SunTimes {
  sunrise: string;
  sunset: string;
}

/**
 * Automatically switches dark/light theme at real sunset/sunrise for
 * the location configured in modules/weather's config.json - reuses
 * that module's data instead of re-deriving location or re-fetching
 * from a separate source. Falls back to leaving the theme untouched if
 * the weather module isn't installed/configured (no error surfaced -
 * this is a nice-to-have, not something that should ever block Home
 * from rendering).
 *
 * Call this once (in AppShell) - it's a controller, not per-component
 * state. Settings' toggle reads/writes the same enabled flag via
 * autoTheme.ts's external store, so the two stay in sync without a
 * context provider just for one boolean.
 */
export function useAutoTheme(): { enabled: boolean; setEnabled: (enabled: boolean) => void } {
  const { apiClient } = useCore();
  const { setTheme } = useTheme();
  const enabled = useSyncExternalStore(subscribeAutoThemeEnabled, getAutoThemeEnabled, () => true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const applyForCurrentSunPosition = async () => {
      try {
        const response = await fetch(`${apiClient.baseUrl}/api/v1/modules/weather/current`);
        if (!response.ok || cancelled) return;
        const data: SunTimes = await response.json();
        const now = new Date();
        const sunrise = new Date(data.sunrise);
        const sunset = new Date(data.sunset);
        if (cancelled) return;
        setTheme(now >= sunrise && now < sunset ? "light" : "dark");
      } catch {
        // Weather module not installed/configured, or unreachable -
        // leave the theme exactly as it is rather than guessing.
      }
    };

    void applyForCurrentSunPosition();
    const interval = setInterval(() => void applyForCurrentSunPosition(), CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, apiClient, setTheme]);

  return { enabled, setEnabled: setAutoThemeEnabled };
}
