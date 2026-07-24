import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@alexos/ui";

export interface CurrencyConverterWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "MXN"];

interface ConversionResult {
  from: string;
  to: string;
  rate: number;
  amount: number;
  converted: number;
  date: string;
}

/** Real exchange rates via Frankfurter (European Central Bank data,
 * frankfurter.app) - free, no API key. */
export default function CurrencyConverterWidget({ apiBaseUrl }: CurrencyConverterWidgetProps) {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const convert = async () => {
    if (!apiBaseUrl) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to, amount });
      const response = await fetch(`${apiBaseUrl}/api/v1/modules/currency_converter/convert?${params}`);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data: ConversionResult = await response.json();
      setResult(data);
    } catch {
      setError("Couldn't reach the exchange rate service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            currency_exchange
          </span>
        }
      >
        <CardTitle>Currency converter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount" />
        <div className="flex items-center gap-2">
          <select
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="From currency"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
          <span className="material-symbols-rounded text-text-secondary" aria-hidden>
            arrow_forward
          </span>
          <select
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="To currency"
            className="h-14 flex-1 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <Button variant="primary" disabled={loading} onClick={() => void convert()}>
          {loading ? "Converting..." : "Convert"}
        </Button>

        {error ? <p className="text-caption text-danger">{error}</p> : null}
        {result ? (
          <p className="text-center text-title font-semibold tabular-nums text-text-primary">
            {result.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {result.to}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
