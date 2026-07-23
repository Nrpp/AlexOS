import { PagePlaceholder } from "../../components/PagePlaceholder";

export default function ServersPage() {
  return (
    <PagePlaceholder
      title="Servers"
      description="CPU, RAM, storage, Docker containers, and service status at a glance."
      icon="dns"
      comingSoon="No servers connected yet - Docker and system monitoring modules are next."
    />
  );
}
