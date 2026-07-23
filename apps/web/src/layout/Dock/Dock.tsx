import { NAV_ITEMS } from "../../app/navigation";
import { DockIcon } from "./DockIcon";

/**
 * Always visible, centered, floating, blurred, rounded. One of AlexOS's
 * identity elements - never hide it, never remove it from the layout.
 */
export function Dock() {
  return (
    <nav
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
      aria-label="Primary navigation"
    >
      <div className="flex max-w-[92vw] items-center gap-2 overflow-x-auto rounded-dock border border-border bg-surface/80 px-3 py-2 shadow-soft backdrop-blur-xl">
        {NAV_ITEMS.map((item) => (
          <DockIcon key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
}
