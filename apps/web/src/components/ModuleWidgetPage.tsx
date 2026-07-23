import { Card, CardEmpty } from "@alexos/ui";
import { widgetRegistry } from "../modules/registry";
import { useCore } from "../core/useCore";

export interface ModuleWidgetPageProps {
  title: string;
  description: string;
  moduleName: string;
  fallbackIcon: string;
  fallbackMessage: string;
}

/** A page whose entire content is one module's widget, or an honest empty state if that module isn't installed. */
export function ModuleWidgetPage({
  title,
  description,
  moduleName,
  fallbackIcon,
  fallbackMessage,
}: ModuleWidgetPageProps) {
  const { eventBus, apiClient } = useCore();
  const entry = widgetRegistry[moduleName];

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-heading font-semibold text-text-primary">{title}</h1>
        <p className="text-body text-text-secondary">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {entry ? (
          <entry.Component eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />
        ) : (
          <Card>
            <CardEmpty icon={fallbackIcon} message={fallbackMessage} />
          </Card>
        )}
      </div>
    </div>
  );
}
