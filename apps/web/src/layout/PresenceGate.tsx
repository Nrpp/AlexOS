import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Dialog, DialogContent, Button } from "@alexos/ui";
import { useEventBus, usePolling } from "@alexos/hooks";
import type { RegisteredModule } from "@alexos/types";
import { useCore } from "../core/useCore";
import { widgetRegistry } from "../modules/registry";

interface PresenceStatus {
  locked: boolean;
  home: boolean;
  primaryDeviceId: string | null;
  pinConfigured: boolean;
  devices: unknown[];
}

const STATUS_POLL_MS = 10_000;
const MODULES_POLL_MS = 5 * 60_000; // the installed-module list changes essentially never at runtime
const MAX_QUICK_ATTEMPTS = 5;
const QUICK_ATTEMPT_WINDOW_MS = 30_000;
const THROTTLE_MS = 30_000;

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/**
 * The ambient/screensaver view shown while away mode is locked: the
 * clock (reused straight from modules/clock rather than re-implemented,
 * per its own module contract) plus every other module marked
 * `"personal": false` in its manifest.json - the modules the owner has
 * explicitly said are fine to leave visible on an always-on display.
 * Deliberately calm: no motion/animation loops, just the widgets
 * themselves (which already render statically).
 */
function AmbientView({
  apiBaseUrl,
  eventBus,
}: {
  apiBaseUrl: string;
  eventBus?: unknown;
}) {
  const fetchModules = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/v1/modules`);
    if (!response.ok) throw new Error("modules request failed");
    return (await response.json()) as RegisteredModule[];
  }, [apiBaseUrl]);
  const { data: modules } = usePolling(fetchModules, MODULES_POLL_MS);

  const ClockWidget = widgetRegistry.clock?.Component;
  const ambientModuleNames = (modules ?? [])
    .filter((module) => module.manifest.personal === false && module.manifest.name !== "clock")
    .map((module) => module.manifest.name)
    .filter((name) => widgetRegistry[name] !== undefined);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="w-full max-w-sm">
        {ClockWidget ? <ClockWidget eventBus={eventBus} /> : null}
      </div>
      {ambientModuleNames.length > 0 ? (
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {ambientModuleNames.map((name) => {
            const Widget = widgetRegistry[name]?.Component;
            return Widget ? <Widget key={name} eventBus={eventBus} apiBaseUrl={apiBaseUrl} /> : null;
          })}
        </div>
      ) : null}
      <p className="text-caption text-text-secondary">Tap anywhere to unlock</p>
    </div>
  );
}

function PinPad({
  open,
  onOpenChange,
  apiBaseUrl,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBaseUrl?: string;
  onUnlocked: () => void;
}) {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentAttempts, setRecentAttempts] = useState<number[]>([]);
  const [throttledUntil, setThrottledUntil] = useState<number | null>(null);
  const [remainingThrottleSeconds, setRemainingThrottleSeconds] = useState(0);

  // Reset all local state every time the pad is (re)opened, so a stale
  // error or a half-typed PIN never carries over from a previous attempt.
  useEffect(() => {
    if (open) {
      setDigits("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (throttledUntil === null) return;
    const tick = () => setRemainingThrottleSeconds(Math.max(0, Math.ceil((throttledUntil - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [throttledUntil]);

  const throttled = throttledUntil !== null && Date.now() < throttledUntil;

  const pressDigit = (digit: string) => {
    if (busy || throttled) return;
    setError(null);
    setDigits((current) => (current.length >= 8 ? current : current + digit));
  };

  const backspace = () => {
    if (busy || throttled) return;
    setDigits((current) => current.slice(0, -1));
  };

  const clearAll = () => {
    if (busy || throttled) return;
    setDigits("");
  };

  const submit = async () => {
    if (!apiBaseUrl || digits.length === 0 || busy || throttled) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/presence/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: digits }),
      });
      if (response.ok) {
        setDigits("");
        onUnlocked();
        onOpenChange(false);
        return;
      }
      const now = Date.now();
      // Client-side throttle only softens brute-forcing on the kiosk
      // touchscreen itself - the real defense is the server-side rate
      // limiter on the module's endpoints.
      const recent = [...recentAttempts.filter((t) => now - t < QUICK_ATTEMPT_WINDOW_MS), now];
      setRecentAttempts(recent);
      setDigits("");
      if (recent.length >= MAX_QUICK_ATTEMPTS) {
        setThrottledUntil(now + THROTTLE_MS);
        setRecentAttempts([]);
      } else {
        setError("Incorrect PIN.");
      }
    } catch {
      setError("Couldn't reach AlexOS. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (key: (typeof KEYPAD_KEYS)[number]) => {
    if (key === "back") backspace();
    else if (key === "clear") clearAll();
    else pressDigit(key);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key >= "0" && event.key <= "9") pressDigit(event.key);
    else if (event.key === "Backspace") backspace();
    else if (event.key === "Enter") void submit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Enter PIN"
        description="AlexOS is away-locked. Enter the PIN to view the full dashboard."
        secondaryAction={
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        }
        primaryAction={
          <Button variant="primary" disabled={busy || throttled || digits.length === 0} onClick={() => void submit()}>
            Unlock
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-4" onKeyDown={handleKeyDown} tabIndex={-1}>
          <div className="flex gap-2" aria-label={`${digits.length} digit${digits.length === 1 ? "" : "s"} entered`}>
            {Array.from({ length: Math.max(digits.length, 4) }).map((_, index) => (
              <span
                key={index}
                className={`h-3 w-3 rounded-full border border-border ${index < digits.length ? "bg-accent-primary" : "bg-transparent"}`}
                aria-hidden
              />
            ))}
          </div>
          {throttled ? (
            <p className="text-caption text-danger">Too many attempts. Try again in {remainingThrottleSeconds}s.</p>
          ) : error ? (
            <p className="text-caption text-danger">{error}</p>
          ) : null}
          <div className="grid grid-cols-3 gap-3">
            {KEYPAD_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                variant={key === "clear" || key === "back" ? "ghost" : "secondary"}
                disabled={busy || throttled}
                onClick={() => handleKey(key)}
                aria-label={key === "back" ? "Backspace" : key === "clear" ? "Clear" : `Digit ${key}`}
                className="h-16 w-16 text-title"
              >
                {key === "back" ? (
                  <span className="material-symbols-rounded" aria-hidden>
                    backspace
                  </span>
                ) : key === "clear" ? (
                  <span className="material-symbols-rounded" aria-hidden>
                    close
                  </span>
                ) : (
                  key
                )}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wraps the routed page. When modules/presence reports `locked` (away,
 * no active unlock session), the routed content is swapped for the
 * ambient view, and a tap/click anywhere brings up the PIN pad. When
 * `home` is true - the primary device is present - this is inert: the
 * dashboard renders exactly as it does today.
 *
 * Polls GET /api/v1/modules/presence/status (via usePolling,
 * packages/hooks) so a server-side unlock TTL quietly expiring is
 * still caught even with no Event Bus push, and also refetches
 * immediately on `presence.updated` for near-live reactions to a
 * webhook call or a Settings change.
 */
export function PresenceGate({ children }: { children: ReactNode }) {
  const { apiClient, eventBus } = useCore();
  const [pinPadOpen, setPinPadOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`${apiClient.baseUrl}/api/v1/modules/presence/status`);
    if (!response.ok) throw new Error("presence status request failed");
    return (await response.json()) as PresenceStatus;
  }, [apiClient]);

  const { data: status, refetch } = usePolling(fetchStatus, STATUS_POLL_MS);
  useEventBus(eventBus, "presence.updated", () => void refetch());

  const handleUnlocked = useCallback(() => {
    setPinPadOpen(false);
    void refetch();
  }, [refetch]);

  // status === null only before the very first fetch resolves - render
  // the dashboard as-is rather than flashing the ambient view on every
  // navigation while a fresh poll is in flight.
  const locked = status?.locked ?? false;

  if (!locked) return <>{children}</>;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Dashboard locked - tap to unlock"
        onClick={() => setPinPadOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setPinPadOpen(true);
        }}
        className="cursor-pointer outline-none"
      >
        <AmbientView apiBaseUrl={apiClient.baseUrl} eventBus={eventBus} />
      </div>
      <PinPad open={pinPadOpen} onOpenChange={setPinPadOpen} apiBaseUrl={apiClient.baseUrl} onUnlocked={handleUnlocked} />
    </>
  );
}
