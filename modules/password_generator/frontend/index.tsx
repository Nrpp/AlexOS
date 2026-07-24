import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@alexos/ui";

export interface PasswordGeneratorWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const CHAR_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}",
};

/** Real cryptographic randomness via the Web Crypto API
 * (crypto.getRandomValues), not Math.random - the one module here
 * where that distinction actually matters. Fully client-side. */
export default function PasswordGeneratorWidget(_props: PasswordGeneratorWidgetProps) {
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => {
    let alphabet = CHAR_SETS.lower;
    if (useUpper) alphabet += CHAR_SETS.upper;
    if (useDigits) alphabet += CHAR_SETS.digits;
    if (useSymbols) alphabet += CHAR_SETS.symbols;

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    const result = Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join("");
    setPassword(result);
    setCopied(false);
  };

  const copy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };

  const toggles: Array<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = [
    { label: "A-Z", checked: useUpper, onChange: setUseUpper },
    { label: "0-9", checked: useDigits, onChange: setUseDigits },
    { label: "!@#", checked: useSymbols, onChange: setUseSymbols },
  ];

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            password
          </span>
        }
      >
        <CardTitle>Password generator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void copy()}
          className="w-full break-all rounded-button border border-border bg-background-secondary px-4 py-3 text-left font-mono text-body text-text-primary"
          aria-label="Generated password, click to copy"
        >
          {password || "Click Generate"}
        </button>
        {copied ? <p className="text-caption text-success">Copied to clipboard.</p> : null}

        <div className="flex items-center justify-between text-caption text-text-secondary">
          <span>Length: {length}</span>
          <input
            type="range"
            min={8}
            max={32}
            value={length}
            onChange={(event) => setLength(Number(event.target.value))}
            aria-label="Password length"
            className="ml-3 flex-1 accent-accent-primary"
          />
        </div>

        <div className="flex gap-2">
          {toggles.map((toggle) => (
            <button
              key={toggle.label}
              type="button"
              onClick={() => toggle.onChange(!toggle.checked)}
              className={`rounded-button border px-3 py-2 text-caption transition-colors duration-base ease-out ${
                toggle.checked
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border text-text-secondary hover:border-accent-primary"
              }`}
            >
              {toggle.label}
            </button>
          ))}
        </div>

        <Button variant="primary" onClick={generate}>
          <span className="material-symbols-rounded text-lg" aria-hidden>
            refresh
          </span>
          Generate
        </Button>
      </CardContent>
    </Card>
  );
}
