/**
 * Event contracts for the AlexOS Event Bus.
 *
 * Modules are free to define their own event names (declared in their
 * manifest.json). This file only lists the envelope shape and the small set
 * of core-level events that ship in the Foundation milestone. As modules are
 * added, extend `CoreEventName` and `CoreEventPayloadMap` rather than
 * hardcoding new modules' events here.
 */

export const CORE_EVENT_NAMES = [
  "core.connected",
  "core.disconnected",
  "module.registered",
  "notification.created",
] as const;

export type CoreEventName = (typeof CORE_EVENT_NAMES)[number];

export interface CoreEventPayloadMap {
  "core.connected": { clientId: string };
  "core.disconnected": { clientId: string };
  "module.registered": { name: string; version: string };
  "notification.created": {
    id: string;
    priority: "critical" | "warning" | "information" | "success";
    title: string;
    message: string;
  };
}

/** Generic envelope for any event flowing through the bus, core or module. */
export interface AlexEvent<TPayload = unknown> {
  name: string;
  payload: TPayload;
  emittedAt: string;
  source: string;
}
