import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading, Toggle } from "@alexos/ui";
import { useTheme } from "@alexos/hooks";
import type { RegisteredModule, SystemHealth } from "@alexos/types";
import { useCore } from "../../core/useCore";
import { PagePlaceholder } from "../../components/PagePlaceholder";
import { widgetRegistry } from "../../modules/registry";
import { DEFAULT_HOME_MODULE_NAMES } from "../../core/defaultHomeWidgets";

// weather/calendar/tasks always have their own fixed cards on Home
// (see apps/web/src/pages/Home/index.tsx's DedicatedWidgetSlot) -
// toggling them there wouldn't do anything, so they're left out of
// this picker entirely rather than offering a checkbox that's a no-op.
const ALWAYS_DEDICATED_MODULE_NAMES = new Set(["weather", "calendar", "tasks"]);

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

function moduleDisplayLabel(module: RegisteredModule): string {
  if (module.manifest.widgets.length === 0) return module.manifest.name;
  return module.manifest.widgets.map((widget) => widget.name).join(" + ");
}

/** Lets the user choose which modules' widgets show on Home, persisted
 * server-side via GET/PUT /api/v1/config/home-widgets - survives a Pi
 * restart, unlike a browser-only setting would. Eligible modules are
 * every installed module that actually has a frontend widget (checked
 * against the local widgetRegistry) other than the three with fixed
 * Home cards. See apps/web/src/pages/Home/index.tsx's FavoriteWidgets
 * for where this selection is read back. */
function HomeWidgetsCard() {
  const { apiClient } = useCore();
  const [allModules, setAllModules] = useState<RegisteredModule[] | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiClient.getModules(), apiClient.getHomeWidgetSelection()])
      .then(([modules, selection]) => {
        if (cancelled) return;
        setAllModules(modules);
        setSelected(selection.moduleNames ?? DEFAULT_HOME_MODULE_NAMES);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const eligibleModules = (allModules ?? []).filter(
    (module) =>
      !ALWAYS_DEDICATED_MODULE_NAMES.has(module.manifest.name) &&
      widgetRegistry[module.manifest.name] !== undefined,
  );

  const toggle = (moduleName: string) => {
    if (selected === null) return;
    const next = selected.includes(moduleName)
      ? selected.filter((name) => name !== moduleName)
      : [...selected, moduleName];
    setSelected(next);
    void apiClient.updateHomeWidgetSelection({ moduleNames: next });
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            dashboard_customize
          </span>
        }
      >
        <CardTitle>Home screen widgets</CardTitle>
        <CardSubtitle>Choose what shows on Home - saved and restored after a restart.</CardSubtitle>
      </CardHeader>
      {allModules === null || selected === null ? (
        <CardLoading />
      ) : eligibleModules.length === 0 ? (
        <CardEmpty icon="widgets" message="No toggleable modules installed." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {eligibleModules.map((module) => (
              <li key={module.manifest.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-rounded text-text-secondary" aria-hidden>
                    {module.manifest.icon ?? "widgets"}
                  </span>
                  <span className="truncate text-body text-text-primary">{moduleDisplayLabel(module)}</span>
                </div>
                <Toggle
                  checked={selected.includes(module.manifest.name)}
                  onCheckedChange={() => toggle(module.manifest.name)}
                  label={`Show ${moduleDisplayLabel(module)} on Home`}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      )}
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
        <HomeWidgetsCard />
      </div>
      <ControlCenterSection />
      <PagePlaceholder icon="build" comingSoon="Plugins, accounts, updates, and backups are on the roadmap." />
    </div>
  );
}
