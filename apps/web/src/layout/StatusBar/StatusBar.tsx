import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Popover, PopoverTrigger, PopoverContent, Toggle } from "@alexos/ui";
import { formatFriendlyDate, formatTime } from "@alexos/utils";
import { useEventBus, useTheme } from "@alexos/hooks";
import type { Notification } from "@alexos/types";
import { useCore } from "../../core/useCore";

interface WeatherReading {
  icon: string;
  temperature: number;
  units: "metric" | "imperial";
}

function unitSuffix(units: string): string {
  return units === "imperial" ? "°F" : "°C";
}

/** Purely event-driven - Core-level UI never calls a specific module's
 * REST endpoint directly. Core replays the weather module's last known
 * reading to every newly-connected client, so this shows current data
 * almost immediately rather than waiting for the next 15-minute tick.
 * Renders nothing at all if no weather module is installed. */
function WeatherIndicator() {
  const { eventBus } = useCore();
  const [weather, setWeather] = useState<WeatherReading | null>(null);

  useEventBus(eventBus, "weather.updated", (payload) => setWeather(payload as WeatherReading));

  if (!weather) return null;

  return (
    <div className="flex items-center gap-2 text-caption text-text-secondary">
      <span className="material-symbols-rounded text-lg" aria-hidden>
        {weather.icon}
      </span>
      <span className="hidden sm:inline">
        {Math.round(weather.temperature)}
        {unitSuffix(weather.units)}
      </span>
    </div>
  );
}

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

const PRIORITY_DOT: Record<Notification["priority"], string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  information: "bg-information",
  success: "bg-success",
};

function NotificationsPanel() {
  const { apiClient, eventBus } = useCore();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  const refresh = useCallback(() => {
    apiClient
      .getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [apiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEventBus(eventBus, "notification.created", refresh);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-title font-semibold text-text-primary">Notifications</p>
      {notifications === null ? (
        <p className="text-caption text-text-secondary">Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="text-caption text-text-secondary">You&apos;re all caught up.</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[notification.priority]}`}
                aria-hidden
              />
              <div>
                <p className="text-body text-text-primary">{notification.title}</p>
                <p className="text-caption text-text-secondary">{notification.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickSettingsPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-title font-semibold text-text-primary">Quick settings</p>
      <div className="flex items-center justify-between">
        <span className="text-body text-text-primary">Dark theme</span>
        <Toggle
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          label="Toggle dark theme"
        />
      </div>
      <Link to="/settings" className="text-caption text-accent-primary hover:underline">
        All settings
      </Link>
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
        <WeatherIndicator />

        <ConnectionIndicator />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-base ease-out hover:bg-surface-hover hover:text-text-primary"
              aria-label="Notifications"
            >
              <span className="material-symbols-rounded text-lg" aria-hidden>
                notifications
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <NotificationsPanel />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-base ease-out hover:bg-surface-hover hover:text-text-primary"
              aria-label="Quick settings"
            >
              <span className="material-symbols-rounded text-lg" aria-hidden>
                tune
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <QuickSettingsPanel />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
