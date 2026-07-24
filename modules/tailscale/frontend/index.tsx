import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardEmpty, CardLoading } from "@alexos/ui";
import { useEventBus, type EventBusLike } from "@alexos/hooks";

interface TailscaleNode {
  hostname: string;
  ip: string | null;
  online: boolean;
  os: string;
}

interface TailscaleStatus {
  available: boolean;
  backendState: string | null;
  self: TailscaleNode | null;
  peers: TailscaleNode[];
}

export interface TailscaleWidgetProps {
  eventBus?: EventBusLike | null;
  apiBaseUrl?: string;
}

function NodeRow({ node, isSelf }: { node: TailscaleNode; isSelf?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 shrink-0 rounded-full ${node.online ? "bg-success" : "bg-text-secondary"}`} aria-hidden />
        <span className="truncate text-body text-text-primary">
          {node.hostname}
          {isSelf ? " (this device)" : ""}
        </span>
      </div>
      <span className="shrink-0 text-caption text-text-secondary">{node.ip ?? "-"}</span>
    </li>
  );
}

/** Real Tailscale status via the `tailscale` CLI talking to the host's
 * tailscaled over its local control socket - see the module README for
 * the bind-mount this requires and why it can't be tested on this
 * project's Windows dev machine. */
export default function TailscaleWidget({ eventBus, apiBaseUrl }: TailscaleWidgetProps) {
  const [status, setStatus] = useState<TailscaleStatus | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/v1/modules/tailscale/status`)
      .then((response) => response.json())
      .then((result: TailscaleStatus) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEventBus(eventBus, "tailscale.updated", (payload) => setStatus(payload as TailscaleStatus));

  const onlinePeers = status?.peers.filter((peer) => peer.online).length ?? 0;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            hub
          </span>
        }
      >
        <CardTitle>Tailscale</CardTitle>
        {status?.available ? <CardSubtitle>{onlinePeers} of {status.peers.length} peers online</CardSubtitle> : null}
      </CardHeader>
      {status === null ? (
        <CardLoading />
      ) : !status.available ? (
        <CardEmpty icon="hub" message="Tailscale isn't available - see modules/tailscale/README.md." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {status.self ? <NodeRow node={status.self} isSelf /> : null}
            {status.peers.map((peer) => (
              <NodeRow key={peer.hostname} node={peer} />
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
