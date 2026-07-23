export interface NavItem {
  path: string;
  label: string;
  /** Material Symbols Rounded ligature name. */
  icon: string;
}

/**
 * The single source of truth for the Dock and the Router. Part 2 of the
 * spec lists "Vehicle" among the pages but never details it in Part 5;
 * Part 5 instead details a "Room" page absent from Part 2's list. Both
 * are kept here as placeholders so neither spec section is silently
 * dropped - real content for either is future work.
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/study", label: "Study", icon: "school" },
  { path: "/servers", label: "Servers", icon: "dns" },
  { path: "/network", label: "Network", icon: "lan" },
  { path: "/communication", label: "Communication", icon: "forum" },
  { path: "/media", label: "Media", icon: "music_note" },
  { path: "/ai", label: "AI", icon: "smart_toy" },
  { path: "/room", label: "Room", icon: "living" },
  { path: "/finance", label: "Finance", icon: "savings" },
  { path: "/vehicle", label: "Vehicle", icon: "directions_car" },
  { path: "/settings", label: "Settings", icon: "settings" },
];
