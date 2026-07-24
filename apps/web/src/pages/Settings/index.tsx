import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, Toggle } from "@alexos/ui";
import { useTheme } from "@alexos/hooks";
import type { SystemHealth } from "@alexos/types";
import { useCore } from "../../core/useCore";
import { PagePlaceholder } from "../../components/PagePlaceholder";
import { widgetRegistry } from "../../modules/registry";

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

function ControlCenterSection() {
  const { eventBus, apiClient } = useCore();
  const widgets = widgetRegistry.control_center?.widgets ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-title font-semibold text-text-primary">Control center</h2>
        <p className="text-caption text-text-secondary">WiFi and Bluetooth for this Raspberry Pi.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {widgets.length > 0 ? (
          widgets.map((Widget, index) => (
            <Widget key={index} eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />
          ))
        ) : (
          <Card>
            <CardEmpty icon="settings_system_daydream" message="Control center module isn't installed." />
          </Card>
        )}
      </div>
    </div>
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
      <ControlCenterSection />
      <PagePlaceholder icon="build" comingSoon="Plugins, accounts, updates, and backups are on the roadmap." />
    </div>
  );
}
