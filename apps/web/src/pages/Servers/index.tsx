import { Card, CardEmpty } from "@alexos/ui";
import { widgetRegistry } from "../../modules/registry";
import { useCore } from "../../core/useCore";

export default function ServersPage() {
  const { eventBus, apiClient } = useCore();
  const entry = widgetRegistry["servers"];

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-heading font-semibold text-text-primary">Servers</h1>
        <p className="text-body text-text-secondary">
          CPU, RAM, storage, Docker containers, and service status at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {entry ? (
          <entry.Component eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />
        ) : (
          <Card>
            <CardEmpty
              icon="dns"
              message="No servers module connected yet - Docker and container-level monitoring are next."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
