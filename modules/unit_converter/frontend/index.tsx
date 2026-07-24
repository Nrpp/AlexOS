import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface UnitConverterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Category = "length" | "weight" | "temperature";

// Each non-temperature unit's factor converts 1 of that unit into the
// category's base unit (meters, kilograms) - real, deterministic math,
// no external service needed.
const LENGTH_UNITS = { m: 1, km: 1000, cm: 0.01, mi: 1609.344, ft: 0.3048, in: 0.0254 } as const;
const WEIGHT_UNITS = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523125 } as const;

type TemperatureUnit = "C" | "F" | "K";

const UNITS_BY_CATEGORY: Record<Category, string[]> = {
  length: Object.keys(LENGTH_UNITS),
  weight: Object.keys(WEIGHT_UNITS),
  temperature: ["C", "F", "K"],
};

function convertLinear(value: number, from: string, to: string, factors: Record<string, number>): number {
  const base = value * (factors[from] ?? 1);
  return base / (factors[to] ?? 1);
}

function toCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === "C") return value;
  if (unit === "F") return ((value - 32) * 5) / 9;
  return value - 273.15;
}

function fromCelsius(celsius: number, unit: TemperatureUnit): number {
  if (unit === "C") return celsius;
  if (unit === "F") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  return fromCelsius(toCelsius(value, from), to);
}

/** Fully client-side - deterministic conversion math, no backend or
 * external service needed (see modules/study's Pomodoro for the same
 * "frontend-only module" precedent). */
export default function UnitConverterWidget(_props: UnitConverterWidgetProps) {
  const [category, setCategory] = useState<Category>("length");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");
  const [value, setValue] = useState("1");

  const units = UNITS_BY_CATEGORY[category];

  const result = useMemo(() => {
    const numeric = Number.parseFloat(value);
    if (Number.isNaN(numeric)) return null;
    if (category === "length") return convertLinear(numeric, fromUnit, toUnit, LENGTH_UNITS);
    if (category === "weight") return convertLinear(numeric, fromUnit, toUnit, WEIGHT_UNITS);
    return convertTemperature(numeric, fromUnit as TemperatureUnit, toUnit as TemperatureUnit);
  }, [category, fromUnit, toUnit, value]);

  const changeCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    const nextUnits = UNITS_BY_CATEGORY[nextCategory];
    setFromUnit(nextUnits[0] ?? "");
    setToUnit(nextUnits[1] ?? nextUnits[0] ?? "");
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            swap_horiz
          </span>
        }
      >
        <CardTitle>Unit converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(["length", "weight", "temperature"] as Category[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeCategory(option)}
              className={`rounded-button border px-3 py-2 text-caption capitalize transition-colors duration-base ease-out ${
                category === option
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border text-text-secondary hover:border-accent-primary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Input
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Value to convert"
        />

        <div className="flex items-center gap-2">
          <select
            value={fromUnit}
            onChange={(event) => setFromUnit(event.target.value)}
            aria-label="Convert from unit"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <span className="material-symbols-rounded text-text-secondary" aria-hidden>
            arrow_forward
          </span>
          <select
            value={toUnit}
            onChange={(event) => setToUnit(event.target.value)}
            aria-label="Convert to unit"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <p className="text-center text-title font-semibold text-text-primary tabular-nums">
          {result !== null ? result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "-"} {toUnit}
        </p>
      </CardContent>
    </Card>
  );
}
