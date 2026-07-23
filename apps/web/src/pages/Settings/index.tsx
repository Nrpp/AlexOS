import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, Toggle } from "@alexos/ui";
import { useTheme } from "@alexos/hooks";
import type { SystemHealth } from "@alexos/types";
import { useCore } from "../../core/useCore";
import { PagePlaceholder } from "../../components/PagePlaceholder";

function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            dark_mode
          </span>
        }
      >
        <CardTitle>Appearance</CardTitle>
        <CardSubtitle>Dark and light are both fully supported.</CardSubtitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span>Dark theme</span>
        <Toggle
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          label="Toggle dark theme"
        />
      </CardContent>
    </Card>
  );
}

function ModulesCard() {
  const { apiClient } = useCore();
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getSystemHealth()
      .then((result) => {
        if (!cancelled) setHealth(result);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            extension
          </span>
        }
      >
        <CardTitle>Modules</CardTitle>
        <CardSubtitle>Discovered automatically from the modules/ directory.</CardSubtitle>
      </CardHeader>
      <CardContent>
        {health ? `${health.modulesLoaded} module${health.modulesLoaded === 1 ? "" : "s"} loaded` : "Checking..."}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-heading font-semibold text-text-primary">Settings</h1>
        <p className="text-body text-text-secondary">Appearance, modules, accounts, and updates.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AppearanceCard />
        <ModulesCard />
      </div>
      <PagePlaceholder icon="build" comingSoon="Plugins, accounts, updates, and backups are on the roadmap." />
    </div>
  );
}
