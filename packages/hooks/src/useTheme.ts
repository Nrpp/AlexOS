import { useCallback, useEffect, useState } from "react";

export type ThemeName = "dark" | "light";

const STORAGE_KEY = "alexos.theme";

/**
 * Dark is the default and only fully-supported theme in the Foundation
 * milestone; light is scaffolded here so it can be turned on later without
 * touching every component that reads `data-theme`.
 */
export function useTheme(): { theme: ThemeName; setTheme: (theme: ThemeName) => void } {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "dark";
    return (window.localStorage.getItem(STORAGE_KEY) as ThemeName | null) ?? "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeName) => setThemeState(next), []);

  return { theme, setTheme };
}
