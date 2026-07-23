import { Card, CardEmpty } from "@alexos/ui";
import { widgetRegistry } from "../modules/registry";
import { useCore } from "../core/useCore";

export interface ModuleWidgetPageProps {
  title: string;
  description: string;
  /** One module's widgets, or several modules' widgets combined onto one page (e.g. Study + Focus). */
  moduleName: string | string[];
  fallbackIcon: string;
  fallbackMessage: string;
}

/** A page whose entire content is one or more modules' widgets, or an honest empty state if none are installed. */
export function ModuleWidgetPage({
  title,
  description,
  moduleName,
  fallbackIcon,
  fallbackMessage,
}: ModuleWidgetPageProps) {
  const { eventBus, apiClient } = useCore();
  const moduleNames = Array.isArray(moduleName) ? moduleName : [moduleName];
  const widgets = moduleNames.flatMap((name) => widgetRegistry[name]?.widgets ?? []);

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-heading font-semibold text-text-primary">{title}</h1>
        <p className="text-body text-text-secondary">{description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {widgets.length > 0 ? (
          widgets.map((Widget, index) => (
            <Widget key={index} eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />
          ))
        ) : (
          <Card>
            <CardEmpty icon={fallbackIcon} message={fallbackMessage} />
          </Card>
        )}
      </div>
    </div>
  );
}
