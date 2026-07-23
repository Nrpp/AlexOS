import type { ComponentType } from "react";

export interface WidgetComponentProps {
  eventBus?: unknown;
  /** Base URL for the widget's own REST calls (initial reads, writes) - most widgets need this alongside the Event Bus. */
  apiBaseUrl?: string;
}

interface WidgetModuleFile {
  default: ComponentType<WidgetComponentProps>;
}

// A relative glob (not the "@modules" alias) so Vite's static glob
// analysis always finds it, regardless of alias-resolution quirks.
const widgetModules = import.meta.glob<WidgetModuleFile>("../../../../modules/*/frontend/index.tsx", {
  eager: true,
});

export interface WidgetRegistryEntry {
  moduleName: string;
  Component: WidgetModuleFile["default"];
}

/**
 * Built at build time by scanning every module's frontend/index.tsx under
 * `modules/`. Dropping a new module folder in there is the entire
 * frontend registration step - nothing here needs to change.
 */
export const widgetRegistry: Record<string, WidgetRegistryEntry> = Object.fromEntries(
  Object.entries(widgetModules).map(([path, mod]) => {
    const match = /modules\/([^/]+)\/frontend\/index\.tsx$/.exec(path);
    const moduleName = match?.[1] ?? path;
    return [moduleName, { moduleName, Component: mod.default }];
  }),
);
