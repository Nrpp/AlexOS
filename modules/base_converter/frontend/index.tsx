import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface BaseConverterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Base = 2 | 8 | 10 | 16;

const BASES: { base: Base; label: string }[] = [
  { base: 2, label: "Binary" },
  { base: 8, label: "Octal" },
  { base: 10, label: "Decimal" },
  { base: 16, label: "Hexadecimal" },
];

const VALID_DIGITS: Record<Base, RegExp> = {
  2: /^[01]*$/,
  8: /^[0-7]*$/,
  10: /^[0-9]*$/,
  16: /^[0-9a-fA-F]*$/,
};

/** Fully client-side - real base-N parsing/formatting, no backend needed. */
export default function BaseConverterWidget(_props: BaseConverterWidgetProps) {
  const [fromBase, setFromBase] = useState<Base>(10);
  const [input, setInput] = useState("42");

  const isValid = VALID_DIGITS[fromBase].test(input);

  const decimalValue = useMemo(() => {
    if (!isValid || input.trim() === "") return null;
    const parsed = Number.parseInt(input, fromBase);
    return Number.isNaN(parsed) ? null : parsed;
  }, [input, fromBase, isValid]);

  const representations = useMemo(() => {
    if (decimalValue === null) return null;
    return {
      2: decimalValue.toString(2),
      8: decimalValue.toString(8),
      10: decimalValue.toString(10),
      16: decimalValue.toString(16).toUpperCase(),
    } satisfies Record<Base, string>;
  }, [decimalValue]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            pin
          </span>
        }
      >
        <CardTitle>Base converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <select
            value={fromBase}
            onChange={(event) => setFromBase(Number.parseInt(event.target.value, 10) as Base)}
            aria-label="From base"
            className="h-14 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
          >
            {BASES.map(({ base, label }) => (
              <option key={base} value={base}>
                {label}
              </option>
            ))}
          </select>
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Number to convert"
            className="flex-1"
          />
        </div>

        {!isValid ? (
          <p className="text-caption text-danger">
            Invalid digit for {BASES.find((entry) => entry.base === fromBase)?.label.toLowerCase()}.
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {BASES.map(({ base, label }) => (
            <li
              key={base}
              className="flex items-center justify-between gap-3 rounded-button border border-border bg-background-secondary px-3 py-2"
            >
              <span className="text-caption text-text-secondary">{label}</span>
              <span className="overflow-x-auto text-body font-semibold tabular-nums text-text-primary">
                {representations ? representations[base] : "-"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
