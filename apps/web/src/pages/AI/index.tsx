import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function AIPage() {
  return (
    <ModuleWidgetPage
      title="AI"
      description="Alex Assistant - chat, history, and quick actions."
      moduleName="ai"
      fallbackIcon="smart_toy"
      fallbackMessage="Alex Assistant hasn't arrived yet - the chat interface is on the roadmap."
    />
  );
}
