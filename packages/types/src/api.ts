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
