import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function NetworkPage() {
  return (
    <ModuleWidgetPage
      title="Network"
      description="Connected devices, bandwidth, latency, and IP addresses."
      moduleName="network"
      fallbackIcon="lan"
      fallbackMessage="No network data yet - device discovery is on the roadmap."
    />
  );
}
