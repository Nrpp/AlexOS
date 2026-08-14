import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface ScienceConstantsWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface Constant {
  name: string;
  symbol: string;
  value: string;
  unit: string;
}

// Real, accurate physical constants (CODATA / SI values).
const CONSTANTS: Constant[] = [
  { name: "Speed of light in vacuum", symbol: "c", value: "299792458", unit: "m/s" },
  { name: "Planck constant", symbol: "h", value: "6.62607015e-34", unit: "J*s" },
  { name: "Reduced Planck constant", symbol: "hbar", value: "1.054571817e-34", unit: "J*s" },
  { name: "Gravitational constant", symbol: "G", value: "6.67430e-11", unit: "m^3/(kg*s^2)" },
  { name: "Elementary charge", symbol: "e", value: "1.602176634e-19", unit: "C" },
  { name: "Avogadro constant", symbol: "N_A", value: "6.02214076e23", unit: "1/mol" },
  { name: "Boltzmann constant", symbol: "k_B", value: "1.380649e-23", unit: "J/K" },
  { name: "Gas constant", symbol: "R", value: "8.314462618", unit: "J/(mol*K)" },
  { name: "Standard gravity", symbol: "g", value: "9.80665", unit: "m/s^2" },
  { name: "Electron mass", symbol: "m_e", value: "9.1093837015e-31", unit: "kg" },
  { name: "Proton mass", symbol: "m_p", value: "1.67262192369e-27", unit: "kg" },
  { name: "Neutron mass", symbol: "m_n", value: "1.67492749804e-27", unit: "kg" },
  { name: "Fine-structure constant", symbol: "alpha", value: "7.2973525693e-3", unit: "dimensionless" },
  { name: "Vacuum electric permittivity", symbol: "epsilon_0", value: "8.8541878128e-12", unit: "F/m" },
  { name: "Vacuum magnetic permeability", symbol: "mu_0", value: "1.25663706212e-6", unit: "N/A^2" },
  { name: "Stefan-Boltzmann constant", symbol: "sigma", value: "5.670374419e-8", unit: "W/(m^2*K^4)" },
  { name: "Faraday constant", symbol: "F", value: "96485.33212", unit: "C/mol" },
  { name: "Atomic mass unit", symbol: "u", value: "1.66053906660e-27", unit: "kg" },
  { name: "Bohr radius", symbol: "a_0", value: "5.29177210903e-11", unit: "m" },
  { name: "Astronomical unit", symbol: "AU", value: "1.495978707e11", unit: "m" },
];

/** Fully client-side - static reference data, no backend or network needed. */
export default function ScienceConstantsWidget(_props: ScienceConstantsWidgetProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return CONSTANTS;
    return CONSTANTS.filter(
      (constant) =>
        constant.name.toLowerCase().includes(trimmed) || constant.symbol.toLowerCase().includes(trimmed),
    );
  }, [query]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            functions
          </span>
        }
      >
        <CardTitle>Science constants</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search constants..."
          aria-label="Search constants"
        />

        <ul className="flex flex-col gap-2">
          {filtered.map((constant) => (
            <li
              key={constant.symbol}
              className="flex items-center justify-between gap-3 rounded-button border border-border bg-background-secondary px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-body text-text-primary">{constant.name}</span>
                <span className="text-caption text-text-secondary">{constant.symbol}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-body font-semibold tabular-nums text-text-primary">{constant.value}</span>
                <span className="text-caption text-text-secondary">{constant.unit}</span>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="text-center text-caption text-text-secondary">No constants match your search.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
