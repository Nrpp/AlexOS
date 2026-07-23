import { PagePlaceholder } from "../../components/PagePlaceholder";

export default function NetworkPage() {
  return (
    <PagePlaceholder
      title="Network"
      description="Connected devices, bandwidth, latency, and IP addresses."
      icon="lan"
      comingSoon="No network data yet - device discovery is on the roadmap."
    />
  );
}
