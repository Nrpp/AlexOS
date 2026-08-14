import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input } from "@alexos/ui";

export interface PeriodicTableWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

interface Element {
  number: number;
  symbol: string;
  name: string;
  mass: number;
  category: string;
}

// All 118 elements - real atomic numbers, symbols, standard atomic weights
// (IUPAC conventional values), and standard 10-way category classification.
const ELEMENTS: Element[] = [
  { number: 1, symbol: "H", name: "Hydrogen", mass: 1.008, category: "reactive nonmetal" },
  { number: 2, symbol: "He", name: "Helium", mass: 4.0026, category: "noble gas" },
  { number: 3, symbol: "Li", name: "Lithium", mass: 6.94, category: "alkali metal" },
  { number: 4, symbol: "Be", name: "Beryllium", mass: 9.0122, category: "alkaline earth metal" },
  { number: 5, symbol: "B", name: "Boron", mass: 10.81, category: "metalloid" },
  { number: 6, symbol: "C", name: "Carbon", mass: 12.011, category: "reactive nonmetal" },
  { number: 7, symbol: "N", name: "Nitrogen", mass: 14.007, category: "reactive nonmetal" },
  { number: 8, symbol: "O", name: "Oxygen", mass: 15.999, category: "reactive nonmetal" },
  { number: 9, symbol: "F", name: "Fluorine", mass: 18.998, category: "reactive nonmetal" },
  { number: 10, symbol: "Ne", name: "Neon", mass: 20.18, category: "noble gas" },
  { number: 11, symbol: "Na", name: "Sodium", mass: 22.99, category: "alkali metal" },
  { number: 12, symbol: "Mg", name: "Magnesium", mass: 24.305, category: "alkaline earth metal" },
  { number: 13, symbol: "Al", name: "Aluminium", mass: 26.982, category: "post-transition metal" },
  { number: 14, symbol: "Si", name: "Silicon", mass: 28.085, category: "metalloid" },
  { number: 15, symbol: "P", name: "Phosphorus", mass: 30.974, category: "reactive nonmetal" },
  { number: 16, symbol: "S", name: "Sulfur", mass: 32.06, category: "reactive nonmetal" },
  { number: 17, symbol: "Cl", name: "Chlorine", mass: 35.45, category: "reactive nonmetal" },
  { number: 18, symbol: "Ar", name: "Argon", mass: 39.948, category: "noble gas" },
  { number: 19, symbol: "K", name: "Potassium", mass: 39.098, category: "alkali metal" },
  { number: 20, symbol: "Ca", name: "Calcium", mass: 40.078, category: "alkaline earth metal" },
  { number: 21, symbol: "Sc", name: "Scandium", mass: 44.956, category: "transition metal" },
  { number: 22, symbol: "Ti", name: "Titanium", mass: 47.867, category: "transition metal" },
  { number: 23, symbol: "V", name: "Vanadium", mass: 50.942, category: "transition metal" },
  { number: 24, symbol: "Cr", name: "Chromium", mass: 51.996, category: "transition metal" },
  { number: 25, symbol: "Mn", name: "Manganese", mass: 54.938, category: "transition metal" },
  { number: 26, symbol: "Fe", name: "Iron", mass: 55.845, category: "transition metal" },
  { number: 27, symbol: "Co", name: "Cobalt", mass: 58.933, category: "transition metal" },
  { number: 28, symbol: "Ni", name: "Nickel", mass: 58.693, category: "transition metal" },
  { number: 29, symbol: "Cu", name: "Copper", mass: 63.546, category: "transition metal" },
  { number: 30, symbol: "Zn", name: "Zinc", mass: 65.38, category: "transition metal" },
  { number: 31, symbol: "Ga", name: "Gallium", mass: 69.723, category: "post-transition metal" },
  { number: 32, symbol: "Ge", name: "Germanium", mass: 72.63, category: "metalloid" },
  { number: 33, symbol: "As", name: "Arsenic", mass: 74.922, category: "metalloid" },
  { number: 34, symbol: "Se", name: "Selenium", mass: 78.971, category: "reactive nonmetal" },
  { number: 35, symbol: "Br", name: "Bromine", mass: 79.904, category: "reactive nonmetal" },
  { number: 36, symbol: "Kr", name: "Krypton", mass: 83.798, category: "noble gas" },
  { number: 37, symbol: "Rb", name: "Rubidium", mass: 85.468, category: "alkali metal" },
  { number: 38, symbol: "Sr", name: "Strontium", mass: 87.62, category: "alkaline earth metal" },
  { number: 39, symbol: "Y", name: "Yttrium", mass: 88.906, category: "transition metal" },
  { number: 40, symbol: "Zr", name: "Zirconium", mass: 91.224, category: "transition metal" },
  { number: 41, symbol: "Nb", name: "Niobium", mass: 92.906, category: "transition metal" },
  { number: 42, symbol: "Mo", name: "Molybdenum", mass: 95.95, category: "transition metal" },
  { number: 43, symbol: "Tc", name: "Technetium", mass: 98, category: "transition metal" },
  { number: 44, symbol: "Ru", name: "Ruthenium", mass: 101.07, category: "transition metal" },
  { number: 45, symbol: "Rh", name: "Rhodium", mass: 102.91, category: "transition metal" },
  { number: 46, symbol: "Pd", name: "Palladium", mass: 106.42, category: "transition metal" },
  { number: 47, symbol: "Ag", name: "Silver", mass: 107.87, category: "transition metal" },
  { number: 48, symbol: "Cd", name: "Cadmium", mass: 112.41, category: "transition metal" },
  { number: 49, symbol: "In", name: "Indium", mass: 114.82, category: "post-transition metal" },
  { number: 50, symbol: "Sn", name: "Tin", mass: 118.71, category: "post-transition metal" },
  { number: 51, symbol: "Sb", name: "Antimony", mass: 121.76, category: "metalloid" },
  { number: 52, symbol: "Te", name: "Tellurium", mass: 127.6, category: "metalloid" },
  { number: 53, symbol: "I", name: "Iodine", mass: 126.9, category: "reactive nonmetal" },
  { number: 54, symbol: "Xe", name: "Xenon", mass: 131.29, category: "noble gas" },
  { number: 55, symbol: "Cs", name: "Caesium", mass: 132.91, category: "alkali metal" },
  { number: 56, symbol: "Ba", name: "Barium", mass: 137.33, category: "alkaline earth metal" },
  { number: 57, symbol: "La", name: "Lanthanum", mass: 138.91, category: "lanthanide" },
  { number: 58, symbol: "Ce", name: "Cerium", mass: 140.12, category: "lanthanide" },
  { number: 59, symbol: "Pr", name: "Praseodymium", mass: 140.91, category: "lanthanide" },
  { number: 60, symbol: "Nd", name: "Neodymium", mass: 144.24, category: "lanthanide" },
  { number: 61, symbol: "Pm", name: "Promethium", mass: 145, category: "lanthanide" },
  { number: 62, symbol: "Sm", name: "Samarium", mass: 150.36, category: "lanthanide" },
  { number: 63, symbol: "Eu", name: "Europium", mass: 151.96, category: "lanthanide" },
  { number: 64, symbol: "Gd", name: "Gadolinium", mass: 157.25, category: "lanthanide" },
  { number: 65, symbol: "Tb", name: "Terbium", mass: 158.93, category: "lanthanide" },
  { number: 66, symbol: "Dy", name: "Dysprosium", mass: 162.5, category: "lanthanide" },
  { number: 67, symbol: "Ho", name: "Holmium", mass: 164.93, category: "lanthanide" },
  { number: 68, symbol: "Er", name: "Erbium", mass: 167.26, category: "lanthanide" },
  { number: 69, symbol: "Tm", name: "Thulium", mass: 168.93, category: "lanthanide" },
  { number: 70, symbol: "Yb", name: "Ytterbium", mass: 173.05, category: "lanthanide" },
  { number: 71, symbol: "Lu", name: "Lutetium", mass: 174.97, category: "lanthanide" },
  { number: 72, symbol: "Hf", name: "Hafnium", mass: 178.49, category: "transition metal" },
  { number: 73, symbol: "Ta", name: "Tantalum", mass: 180.95, category: "transition metal" },
  { number: 74, symbol: "W", name: "Tungsten", mass: 183.84, category: "transition metal" },
  { number: 75, symbol: "Re", name: "Rhenium", mass: 186.21, category: "transition metal" },
  { number: 76, symbol: "Os", name: "Osmium", mass: 190.23, category: "transition metal" },
  { number: 77, symbol: "Ir", name: "Iridium", mass: 192.22, category: "transition metal" },
  { number: 78, symbol: "Pt", name: "Platinum", mass: 195.08, category: "transition metal" },
  { number: 79, symbol: "Au", name: "Gold", mass: 196.97, category: "transition metal" },
  { number: 80, symbol: "Hg", name: "Mercury", mass: 200.59, category: "transition metal" },
  { number: 81, symbol: "Tl", name: "Thallium", mass: 204.38, category: "post-transition metal" },
  { number: 82, symbol: "Pb", name: "Lead", mass: 207.2, category: "post-transition metal" },
  { number: 83, symbol: "Bi", name: "Bismuth", mass: 208.98, category: "post-transition metal" },
  { number: 84, symbol: "Po", name: "Polonium", mass: 209, category: "post-transition metal" },
  { number: 85, symbol: "At", name: "Astatine", mass: 210, category: "metalloid" },
  { number: 86, symbol: "Rn", name: "Radon", mass: 222, category: "noble gas" },
  { number: 87, symbol: "Fr", name: "Francium", mass: 223, category: "alkali metal" },
  { number: 88, symbol: "Ra", name: "Radium", mass: 226, category: "alkaline earth metal" },
  { number: 89, symbol: "Ac", name: "Actinium", mass: 227, category: "actinide" },
  { number: 90, symbol: "Th", name: "Thorium", mass: 232.04, category: "actinide" },
  { number: 91, symbol: "Pa", name: "Protactinium", mass: 231.04, category: "actinide" },
  { number: 92, symbol: "U", name: "Uranium", mass: 238.03, category: "actinide" },
  { number: 93, symbol: "Np", name: "Neptunium", mass: 237, category: "actinide" },
  { number: 94, symbol: "Pu", name: "Plutonium", mass: 244, category: "actinide" },
  { number: 95, symbol: "Am", name: "Americium", mass: 243, category: "actinide" },
  { number: 96, symbol: "Cm", name: "Curium", mass: 247, category: "actinide" },
  { number: 97, symbol: "Bk", name: "Berkelium", mass: 247, category: "actinide" },
  { number: 98, symbol: "Cf", name: "Californium", mass: 251, category: "actinide" },
  { number: 99, symbol: "Es", name: "Einsteinium", mass: 252, category: "actinide" },
  { number: 100, symbol: "Fm", name: "Fermium", mass: 257, category: "actinide" },
  { number: 101, symbol: "Md", name: "Mendelevium", mass: 258, category: "actinide" },
  { number: 102, symbol: "No", name: "Nobelium", mass: 259, category: "actinide" },
  { number: 103, symbol: "Lr", name: "Lawrencium", mass: 266, category: "actinide" },
  { number: 104, symbol: "Rf", name: "Rutherfordium", mass: 267, category: "transition metal" },
  { number: 105, symbol: "Db", name: "Dubnium", mass: 268, category: "transition metal" },
  { number: 106, symbol: "Sg", name: "Seaborgium", mass: 269, category: "transition metal" },
  { number: 107, symbol: "Bh", name: "Bohrium", mass: 270, category: "transition metal" },
  { number: 108, symbol: "Hs", name: "Hassium", mass: 269, category: "transition metal" },
  { number: 109, symbol: "Mt", name: "Meitnerium", mass: 278, category: "unknown" },
  { number: 110, symbol: "Ds", name: "Darmstadtium", mass: 281, category: "unknown" },
  { number: 111, symbol: "Rg", name: "Roentgenium", mass: 282, category: "unknown" },
  { number: 112, symbol: "Cn", name: "Copernicium", mass: 285, category: "transition metal" },
  { number: 113, symbol: "Nh", name: "Nihonium", mass: 286, category: "post-transition metal" },
  { number: 114, symbol: "Fl", name: "Flerovium", mass: 289, category: "post-transition metal" },
  { number: 115, symbol: "Mc", name: "Moscovium", mass: 290, category: "post-transition metal" },
  { number: 116, symbol: "Lv", name: "Livermorium", mass: 293, category: "post-transition metal" },
  { number: 117, symbol: "Ts", name: "Tennessine", mass: 294, category: "unknown" },
  { number: 118, symbol: "Og", name: "Oganesson", mass: 294, category: "noble gas" },
];

const CATEGORY_STYLES: Record<string, string> = {
  "alkali metal": "border-danger/40 bg-danger/10 text-danger",
  "alkaline earth metal": "border-warning/40 bg-warning/10 text-warning",
  lanthanide: "border-information/40 bg-information/10 text-information",
  actinide: "border-accent-secondary/40 bg-accent-secondary/10 text-accent-secondary",
  "transition metal": "border-accent-primary/40 bg-accent-primary/10 text-accent-primary",
  "post-transition metal": "border-success/40 bg-success/10 text-success",
  metalloid: "border-warning/40 bg-warning/20 text-warning",
  "reactive nonmetal": "border-success/40 bg-success/20 text-success",
  "noble gas": "border-accent-secondary/40 bg-accent-secondary/20 text-accent-secondary",
  unknown: "border-border bg-background-secondary text-text-secondary",
};

/** Fully client-side - static element data, no backend or network needed. */
export default function PeriodicTableWidget(_props: PeriodicTableWidgetProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Element | null>(null);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return ELEMENTS;
    return ELEMENTS.filter(
      (element) =>
        element.name.toLowerCase().includes(trimmed) || element.symbol.toLowerCase().includes(trimmed),
    );
  }, [query]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            science
          </span>
        }
      >
        <CardTitle>Periodic table</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or symbol..."
          aria-label="Search elements"
        />

        {selected ? (
          <div className="flex items-center gap-4 rounded-button border border-border bg-background-secondary p-3">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-button border text-title font-semibold ${
                CATEGORY_STYLES[selected.category] ?? CATEGORY_STYLES.unknown
              }`}
            >
              {selected.symbol}
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-body font-semibold text-text-primary">
                {selected.name} ({selected.number})
              </span>
              <span className="text-caption capitalize text-text-secondary">{selected.category}</span>
              <span className="text-caption text-text-secondary">Atomic mass: {selected.mass}</span>
            </div>
          </div>
        ) : (
          <p className="text-caption text-text-secondary">Tap an element to see its details.</p>
        )}

        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {filtered.map((element) => (
            <button
              key={element.number}
              type="button"
              onClick={() => setSelected(element)}
              className={`flex aspect-square flex-col items-center justify-center rounded-button border text-[10px] transition-colors duration-base ease-out ${
                CATEGORY_STYLES[element.category] ?? CATEGORY_STYLES.unknown
              } ${selected?.number === element.number ? "ring-2 ring-accent-primary" : ""}`}
              title={element.name}
            >
              <span className="text-[8px] opacity-70">{element.number}</span>
              <span className="text-caption font-semibold">{element.symbol}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-caption text-text-secondary">No elements match your search.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
