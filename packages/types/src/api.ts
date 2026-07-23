/** Response shape for GET /api/v1/system/health. */
export interface SystemHealth {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  modulesLoaded: number;
}

/** Response shape for GET /api/v1/config. */
export interface AppConfig {
  theme: "dark" | "light";
  userName: string;
}

/** Response shape for GET /api/v1/notifications - persisted history, distinct from the live toasts in NotificationsLayer. */
export interface Notification {
  id: string;
  priority: "critical" | "warning" | "information" | "success";
  title: string;
  message: string;
  createdAt: string;
}
