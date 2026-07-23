import type { ComponentType } from "react";

export interface WidgetComponentProps {
  eventBus?: unknown;
  /** Base URL for the widget's own REST calls (initial reads, writes) - most widgets need this alongside the Event Bus. */
  apiBaseUrl?: string;
}

type WidgetComponent = ComponentType<WidgetComponentProps>;

// A module's frontend/index.tsx exports a default widget (its primary
// one) plus, optionally, any number of named widgets for modules that
// need more than one (e.g. Study's Pomodoro + exam countdown + to-do).
// Both show up in `widgets` automatically - no registry changes needed
// to add a second widget to an existing module.
type WidgetModuleFile = { default: WidgetComponent } & Record<string, WidgetComponent>;

// A relative glob (not the "@modules" alias) so Vite's static glob
// analysis always finds it, regardless of alias-resolution quirks.
const widgetModules = import.meta.glob<WidgetModuleFile>("../../../../modules/*/frontend/index.tsx", {
  eager: true,
});

export interface WidgetRegistryEntry {
  moduleName: string;
  /** The module's default-exported (primary) widget. */
  Component: WidgetComponent;
  /** Every widget the module exports, default first, in declaration order. */
  widgets: WidgetComponent[];
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
    const { default: primary, ...named } = mod;
    return [moduleName, { moduleName, Component: primary, widgets: [primary, ...Object.values(named)] }];
  }),
);
