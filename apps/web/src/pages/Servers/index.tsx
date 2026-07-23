import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function ServersPage() {
  return (
    <ModuleWidgetPage
      title="Servers"
      description="CPU, RAM, storage, Docker containers, and service status at a glance."
      moduleName="servers"
      fallbackIcon="dns"
      fallbackMessage="No servers module connected yet - Docker and container-level monitoring are next."
    />
  );
}
