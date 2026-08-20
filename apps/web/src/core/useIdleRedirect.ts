import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCore } from "./useCore";

// A representative but not exhaustive set - enough to catch touch,
// mouse, keyboard and scroll wheel interaction on a kiosk touchscreen
// without attaching a listener for every possible input event.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Returns the always-on display to Home after `idleTimeoutMinutes`
 * (Settings -> the idle timeout field, backed by GET/PUT /api/v1/config)
 * of no interaction - e.g. someone opened Settings or a module page,
 * got up, and it's been sitting there since. 0 (the default) disables
 * this entirely; nothing here does anything unless the owner opts in.
 *
 * Reads the config once per app session (this hook is called once, in
 * AppShell, which stays mounted across every route change) rather than
 * polling - a rarely-changed setting doesn't need that, but it does
 * mean a value changed in Settings only takes effect after the page is
 * next reloaded, same as several other "restart to apply" settings in
 * this app. Documented in the Settings UI copy itself.
 *
 * Call this once (in AppShell) - it's a controller, not per-component
 * state, mirroring useAutoTheme.ts's shape.
 */
export function useIdleRedirect(): void {
  const { apiClient } = useCore();
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    let cancelled = false;
    let timeoutMinutes = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const goHome = () => {
      if (pathnameRef.current !== "/") navigate("/", { replace: true });
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(goHome, timeoutMinutes * 60_000);
    };

    apiClient
      .getConfig()
      .then((config) => {
        if (cancelled || config.idleTimeoutMinutes <= 0) return;
        timeoutMinutes = config.idleTimeoutMinutes;
        resetTimer();
        ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // apiClient/navigate are stable for the app's lifetime (see
    // CoreProvider/react-router) - this effect is meant to run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
