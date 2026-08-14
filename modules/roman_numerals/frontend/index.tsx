import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface RomanNumeralsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const NUMERAL_VALUES: [string, number][] = [
  ["M", 1000],
  ["CM", 900],
  ["D", 500],
  ["CD", 400],
  ["C", 100],
  ["XC", 90],
  ["L", 50],
  ["XL", 40],
  ["X", 10],
  ["IX", 9],
  ["V", 5],
  ["IV", 4],
  ["I", 1],
];

// Real subtractive-notation algorithm - greedily subtracts the largest
// matching value/symbol pair, no lookup table of whole numbers.
function toRoman(input: number): string {
  let remaining = Math.trunc(input);
  let result = "";
  for (const [symbol, value] of NUMERAL_VALUES) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

// Real parser: walks the string, adding each symbol's value, but
// subtracting it instead when a smaller value precedes a larger one
// (the subtractive-notation rule), and validates round-trip correctness.
function fromRoman(input: string): number | null {
  const cleaned = input.trim().toUpperCase();
  if (!cleaned) return null;
  if (!/^[MDCLXVI]+$/.test(cleaned)) return null;

  const SYMBOL_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < cleaned.length; i += 1) {
    const current = SYMBOL_VALUES[cleaned[i] ?? ""] ?? 0;
    const next = SYMBOL_VALUES[cleaned[i + 1] ?? ""];
    if (next && current < next) {
      total -= current;
    } else {
      total += current;
    }
  }

  // Validate by round-tripping - rejects malformed strings like "IIII" or "VV".
  if (total < 1 || total > 3999 || toRoman(total) !== cleaned) return null;
  return total;
}

/** Fully client-side - real subtractive-notation algorithm both ways. */
export default function RomanNumeralsWidget(_props: RomanNumeralsWidgetProps) {
  const [numberInput, setNumberInput] = useState("1994");
  const [romanInput, setRomanInput] = useState("XLII");

  const numberToRomanResult = useMemo(() => {
    const parsed = Number.parseInt(numberInput, 10);
    if (Number.isNaN(parsed)) return { error: "Enter a whole number." };
    if (parsed < 1 || parsed > 3999) return { error: "Must be between 1 and 3999." };
    return { value: toRoman(parsed) };
  }, [numberInput]);

  const romanToNumberResult = useMemo(() => {
    if (!romanInput.trim()) return { error: "Enter a Roman numeral." };
    const parsed = fromRoman(romanInput);
    if (parsed === null) return { error: "Not a valid Roman numeral." };
    return { value: String(parsed) };
  }, [romanInput]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            looks_one
          </span>
        }
      >
        <CardTitle>Roman numerals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-caption text-text-secondary">Number to Roman numeral</span>
          <Input
            type="number"
            value={numberInput}
            onChange={(event) => setNumberInput(event.target.value)}
            aria-label="Number input"
            min={1}
            max={3999}
          />
          {"error" in numberToRomanResult ? (
            <p className="text-caption text-danger">{numberToRomanResult.error}</p>
          ) : (
            <p className="rounded-button border border-border bg-background-secondary px-3 py-2 text-center text-title font-semibold text-text-primary">
              {numberToRomanResult.value}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-caption text-text-secondary">Roman numeral to number</span>
          <Input
            value={romanInput}
            onChange={(event) => setRomanInput(event.target.value)}
            aria-label="Roman numeral input"
          />
          {"error" in romanToNumberResult ? (
            <p className="text-caption text-danger">{romanToNumberResult.error}</p>
          ) : (
            <p className="rounded-button border border-border bg-background-secondary px-3 py-2 text-center text-title font-semibold text-text-primary">
              {romanToNumberResult.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
