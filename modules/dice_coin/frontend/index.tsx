import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@alexos/ui";

export interface DiceCoinWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

const DIE_SIZES = [4, 6, 8, 10, 12, 20];

/** Fully client-side - no backend needed for rolling a die or
 * flipping a coin (same "frontend-only module" precedent as
 * modules/study's Pomodoro). */
export default function DiceCoinWidget(_props: DiceCoinWidgetProps) {
  const [dieSize, setDieSize] = useState(6);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [coinResult, setCoinResult] = useState<"Heads" | "Tails" | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    setCoinResult(null);
    setRollResult(Math.floor(Math.random() * dieSize) + 1);
    window.setTimeout(() => setRolling(false), 300);
  };

  const flip = () => {
    setRolling(true);
    setRollResult(null);
    setCoinResult(Math.random() < 0.5 ? "Heads" : "Tails");
    window.setTimeout(() => setRolling(false), 300);
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            casino
          </span>
        }
      >
        <CardTitle>Dice &amp; coin</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <span
          className={`text-display font-semibold tabular-nums text-text-primary transition-transform duration-base ease-out ${rolling ? "scale-110" : ""}`}
        >
          {rollResult ?? coinResult ?? "-"}
        </span>

        <div className="flex flex-wrap justify-center gap-2">
          {DIE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setDieSize(size)}
              className={`rounded-button border px-3 py-2 text-caption transition-colors duration-base ease-out ${
                dieSize === size
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border text-text-secondary hover:border-accent-primary"
              }`}
            >
              d{size}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onClick={roll}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              casino
            </span>
            Roll d{dieSize}
          </Button>
          <Button variant="secondary" onClick={flip}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              monetization_on
            </span>
            Flip coin
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
