export interface NavItem {
  path: string;
  label: string;
  /** Material Symbols Rounded ligature name. */
  icon: string;
}

/**
 * The single source of truth for the Dock and the Router. AI, Finance,
 * and Vehicle were removed - AI and Finance were scripted/mock
 * placeholders not worth keeping as nav entries, and Vehicle was never
 * detailed anywhere in the product spec (Part 2 lists it, Part 5 never
 * describes what it should contain).
 */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/study", label: "Study", icon: "school" },
  { path: "/servers", label: "Servers", icon: "dns" },
  { path: "/network", label: "Network", icon: "lan" },
  { path: "/communication", label: "Communication", icon: "forum" },
  { path: "/media", label: "Media", icon: "music_note" },
  { path: "/room", label: "Room", icon: "living" },
  { path: "/settings", label: "Settings", icon: "settings" },
];
