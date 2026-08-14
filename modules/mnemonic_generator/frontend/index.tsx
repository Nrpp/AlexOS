import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@alexos/ui";

export interface MnemonicGeneratorWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

// Small built-in word bank, a few common words per letter.
const WORD_BANK: Record<string, string[]> = {
  A: ["Amazing", "Ancient", "Angry", "Active"],
  B: ["Brave", "Bright", "Busy", "Bold"],
  C: ["Calm", "Curious", "Clever", "Careful"],
  D: ["Dancing", "Daring", "Dizzy", "Dusty"],
  E: ["Eager", "Elegant", "Energetic", "Early"],
  F: ["Friendly", "Fast", "Funny", "Fierce"],
  G: ["Gentle", "Giant", "Glowing", "Grumpy"],
  H: ["Happy", "Hungry", "Honest", "Hasty"],
  I: ["Icy", "Interesting", "Itchy", "Innocent"],
  J: ["Jolly", "Jumpy", "Jazzy", "Just"],
  K: ["Kind", "Keen", "Kooky", "Knowing"],
  L: ["Lazy", "Loud", "Lucky", "Lively"],
  M: ["Mighty", "Merry", "Modern", "Messy"],
  N: ["Noisy", "Nervous", "Neat", "Nice"],
  O: ["Odd", "Old", "Orange", "Outgoing"],
  P: ["Playful", "Proud", "Patient", "Purple"],
  Q: ["Quiet", "Quick", "Quirky", "Queasy"],
  R: ["Rapid", "Rusty", "Roaring", "Ready"],
  S: ["Silly", "Sleepy", "Speedy", "Shiny"],
  T: ["Tall", "Tiny", "Tired", "Tricky"],
  U: ["Unusual", "Upbeat", "Unique", "Urgent"],
  V: ["Vivid", "Vast", "Victorious", "Vivacious"],
  W: ["Wild", "Wise", "Windy", "Witty"],
  X: ["Xenial", "Xtra-careful", "Xenophile", "Xtreme"],
  Y: ["Young", "Yellow", "Yawning", "Youthful"],
  Z: ["Zany", "Zealous", "Zesty", "Zippy"],
};

function splitItems(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function firstLetter(item: string): string {
  const match = item.match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "?";
}

function pickWord(letter: string, seed: number): string {
  const options = WORD_BANK[letter];
  if (!options || options.length === 0) return letter;
  return options[seed % options.length] ?? letter;
}

function buildSentence(items: string[], variant: number): string {
  return items
    .map((item, index) => pickWord(firstLetter(item), variant + index * 7))
    .join(" ");
}

/** Fully client-side - deterministic word-bank lookup, no backend needed. */
export default function MnemonicGeneratorWidget(_props: MnemonicGeneratorWidgetProps) {
  const [raw, setRaw] = useState("Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune");
  const [variant, setVariant] = useState(0);

  const items = useMemo(() => splitItems(raw), [raw]);
  const acronym = useMemo(() => items.map(firstLetter).join(""), [items]);
  const sentence = useMemo(() => buildSentence(items, variant), [items, variant]);

  const regenerate = () => setVariant((current) => current + Math.floor(Math.random() * 100) + 1);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            psychology
          </span>
        }
      >
        <CardTitle>Mnemonic generator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Items to remember, comma or newline separated..."
          aria-label="Items to remember"
          rows={3}
          className="w-full resize-none rounded-button border border-border bg-background-secondary px-3 py-2 text-body text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />

        {items.length > 0 ? (
          <>
            <div className="flex flex-col gap-1 rounded-button border border-border bg-background-secondary p-3">
              <span className="text-caption text-text-secondary">Mnemonic sentence</span>
              <p className="text-body font-semibold text-text-primary">{sentence}</p>
            </div>
            <div className="flex flex-col gap-1 rounded-button border border-border bg-background-secondary p-3">
              <span className="text-caption text-text-secondary">First-letter acronym</span>
              <p className="text-body tabular-nums text-text-primary">{acronym}</p>
            </div>
            <Button variant="secondary" onClick={regenerate}>
              Regenerate
            </Button>
          </>
        ) : (
          <p className="text-caption text-text-secondary">Enter at least one item to generate a mnemonic.</p>
        )}
      </CardContent>
    </Card>
  );
}
