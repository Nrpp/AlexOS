/** Formats a Date as "Tuesday, July 23" - used by the Status Bar and Home page. */
export function formatFriendlyDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Formats a Date as "14:32" (24h) - used by the Status Bar clock and the Clock widget. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

/** Determines the part of day, driving contextual greetings on the Home page. */
export function getDayPart(date: Date): DayPart {
  const hour = date.getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}
