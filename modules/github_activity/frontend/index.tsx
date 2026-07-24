import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading, CardError } from "@alexos/ui";

interface ActivityEvent {
  description: string;
  repo: string;
  createdAt: string;
}

interface ActivityResponse {
  configured: boolean;
  username: string;
  events: ActivityEvent[];
}

export interface GitHubActivityWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Real recent activity via GitHub's public REST API - no API key
 * needed. Username comes from config.json (default "Nrpp"). */
export default function GitHubActivityWidget({ apiBaseUrl }: GitHubActivityWidgetProps) {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/github_activity/activity`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: ActivityResponse) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach GitHub.");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            code
          </span>
        }
      >
        <CardTitle>GitHub activity</CardTitle>
        {data?.username ? <CardSubtitle>@{data.username}</CardSubtitle> : null}
      </CardHeader>
      {error ? (
        <CardError message={error} />
      ) : data === null ? (
        <CardLoading />
      ) : !data.configured ? (
        <CardEmpty icon="code_off" message="Set modules/github_activity/config.json's username to enable this." />
      ) : data.events.length === 0 ? (
        <CardEmpty icon="code_off" message="No recent public activity." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.events.map((event, index) => (
              <li key={index} className="flex items-center justify-between gap-3">
                <span className="truncate text-body text-text-primary">{event.description}</span>
                <span className="shrink-0 text-caption text-text-secondary">{timeAgo(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
