import { useEffect, useState } from "react";
import { formatFriendlyDate, formatTime } from "@alexos/utils";
import { useCore } from "../../core/useCore";

function ConnectionIndicator() {
  const { connectionState } = useCore();

  const label =
    connectionState === "open"
      ? "Connected"
      : connectionState === "connecting"
        ? "Connecting"
        : "Offline";

  const dotClass =
    connectionState === "open"
      ? "bg-success"
      : connectionState === "connecting"
        ? "bg-warning"
        : "bg-danger";

  return (
    <div className="flex items-center gap-2 text-caption text-text-secondary" title={label}>
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/** Always visible, minimal, never crowded - time, date, weather, connection, notifications, quick settings. */
export function StatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 text-text-primary">
      <div className="flex items-center gap-4">
        <span className="text-body font-medium tabular-nums">{formatTime(now)}</span>
        <span className="text-caption text-text-secondary">{formatFriendlyDate(now)}</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-caption text-text-secondary">
          <span className="material-symbols-rounded text-lg" aria-hidden>
            partly_cloudy_day
          </span>
          <span className="hidden sm:inline">--°</span>
        </div>

        <ConnectionIndicator />

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-base ease-out hover:bg-surface-hover hover:text-text-primary"
          aria-label="Notifications"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden>
            notifications
          </span>
        </button>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-base ease-out hover:bg-surface-hover hover:text-text-primary"
          aria-label="Quick settings"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden>
            tune
          </span>
        </button>
      </div>
    </header>
  );
}
