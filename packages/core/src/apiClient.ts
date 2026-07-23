import type { AppConfig, SystemHealth } from "@alexos/types";

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
  constructor(private readonly baseUrl: string) {}

  async getSystemHealth(): Promise<SystemHealth> {
    return this.request<SystemHealth>("/api/v1/system/health");
  }

  async getConfig(): Promise<AppConfig> {
    return this.request<AppConfig>("/api/v1/config");
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
