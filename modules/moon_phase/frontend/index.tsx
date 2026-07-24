import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@alexos/ui";

export interface MoonPhaseWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

// A known new moon (2000-01-06 18:14 UTC, a standard reference epoch)
// and the moon's average synodic period - real astronomical constants,
// not an approximation dressed up as one. Accurate to within roughly a
// day, which is all a glanceable widget needs.
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_DAYS = 29.53058867;

interface MoonPhase {
  name: string;
  icon: string;
  illuminationPercent: number;
}

function computeMoonPhase(date: Date): MoonPhase {
  const daysSinceKnownNewMoon = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const cyclePosition = ((daysSinceKnownNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  const phaseFraction = cyclePosition / SYNODIC_MONTH_DAYS;
  const illuminationPercent = Math.round((1 - Math.cos(2 * Math.PI * phaseFraction)) * 50);

  if (phaseFraction < 0.03 || phaseFraction >= 0.97) return { name: "New Moon", icon: "brightness_1", illuminationPercent };
  if (phaseFraction < 0.22) return { name: "Waxing Crescent", icon: "brightness_2", illuminationPercent };
  if (phaseFraction < 0.28) return { name: "First Quarter", icon: "brightness_3", illuminationPercent };
  if (phaseFraction < 0.47) return { name: "Waxing Gibbous", icon: "brightness_4", illuminationPercent };
  if (phaseFraction < 0.53) return { name: "Full Moon", icon: "circle", illuminationPercent };
  if (phaseFraction < 0.72) return { name: "Waning Gibbous", icon: "brightness_4", illuminationPercent };
  if (phaseFraction < 0.78) return { name: "Last Quarter", icon: "brightness_3", illuminationPercent };
  return { name: "Waning Crescent", icon: "brightness_2", illuminationPercent };
}

/** Fully client-side - the moon's phase is a deterministic function of
 * the date, computed from real astronomical constants rather than
 * fetched from an API that would just be running the same formula. */
export default function MoonPhaseWidget(_props: MoonPhaseWidgetProps) {
  const phase = useMemo(() => computeMoonPhase(new Date()), []);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            bedtime
          </span>
        }
      >
        <CardTitle>Moon phase</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 py-2">
        <span className="material-symbols-rounded text-5xl text-text-primary" aria-hidden>
          {phase.icon}
        </span>
        <p className="text-title font-semibold text-text-primary">{phase.name}</p>
        <p className="text-caption text-text-secondary">{phase.illuminationPercent}% illuminated</p>
      </CardContent>
    </Card>
  );
}
