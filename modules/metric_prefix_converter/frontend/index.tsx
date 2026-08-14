import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface MetricPrefixConverterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

// Real power-of-10 exponents for each SI prefix relative to the base unit.
const PREFIXES: Record<string, number> = {
  pico: -12,
  nano: -9,
  micro: -6,
  milli: -3,
  centi: -2,
  deci: -1,
  base: 0,
  deca: 1,
  hecto: 2,
  kilo: 3,
  mega: 6,
  giga: 9,
  tera: 12,
};

const PREFIX_ORDER = Object.keys(PREFIXES);

function convert(value: number, from: string, to: string): number {
  const exponentDiff = (PREFIXES[from] ?? 0) - (PREFIXES[to] ?? 0);
  return value * 10 ** exponentDiff;
}

/** Fully client-side - deterministic power-of-10 math, no backend needed. */
export default function MetricPrefixConverterWidget(_props: MetricPrefixConverterWidgetProps) {
  const [value, setValue] = useState("1");
  const [fromPrefix, setFromPrefix] = useState("base");
  const [toPrefix, setToPrefix] = useState("kilo");

  const result = useMemo(() => {
    const numeric = Number.parseFloat(value);
    if (Number.isNaN(numeric)) return null;
    return convert(numeric, fromPrefix, toPrefix);
  }, [value, fromPrefix, toPrefix]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            swap_vert
          </span>
        }
      >
        <CardTitle>Metric prefix converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Value to convert"
        />

        <div className="flex items-center gap-2">
          <select
            value={fromPrefix}
            onChange={(event) => setFromPrefix(event.target.value)}
            aria-label="From prefix"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body capitalize text-text-primary"
          >
            {PREFIX_ORDER.map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix} (10^{PREFIXES[prefix]})
              </option>
            ))}
          </select>
          <span className="material-symbols-rounded text-text-secondary" aria-hidden>
            arrow_forward
          </span>
          <select
            value={toPrefix}
            onChange={(event) => setToPrefix(event.target.value)}
            aria-label="To prefix"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body capitalize text-text-primary"
          >
            {PREFIX_ORDER.map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix} (10^{PREFIXES[prefix]})
              </option>
            ))}
          </select>
        </div>

        <p className="text-center text-title font-semibold tabular-nums text-text-primary">
          {result !== null ? result.toLocaleString(undefined, { maximumFractionDigits: 10 }) : "-"}
        </p>
      </CardContent>
    </Card>
  );
}
