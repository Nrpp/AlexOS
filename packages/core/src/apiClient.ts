import type { AppConfig, HomeWidgetSelection, Notification, RegisteredModule, SystemHealth } from "@alexos/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thin REST client for the AlexOS API Gateway (`/api/v1/*`). */
export class ApiClient {
  /** Exposed so widgets can build their own module-specific request URLs. */
  constructor(public readonly baseUrl: string) {}

  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>("/api/v1/system/health");
  }

  async getConfig(): Promise<AppConfig> {
    return this.request<AppConfig>("/api/v1/config");
  }

  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/v1/notifications");
  }

  async getModules(): Promise<RegisteredModule[]> {
    return this.request<RegisteredModule[]>("/api/v1/modules");
  }

  async getHomeWidgetSelection(): Promise<HomeWidgetSelection> {
    return this.request<HomeWidgetSelection>("/api/v1/config/home-widgets");
  }

  async updateHomeWidgetSelection(selection: HomeWidgetSelection): Promise<HomeWidgetSelection> {
    return this.request<HomeWidgetSelection>("/api/v1/config/home-widgets", {
      method: "PUT",
      body: JSON.stringify(selection),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!response.ok) {
      throw new ApiError(`Request to ${path} failed`, response.status);
    }
    return (await response.json()) as T;
  }
}
