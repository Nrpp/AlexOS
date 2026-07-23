import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function CommunicationPage() {
  return (
    <ModuleWidgetPage
      title="Communication"
      description="Gmail today; WhatsApp, Telegram, and quick replies are planned."
      moduleName="communication"
      fallbackIcon="forum"
      fallbackMessage="No accounts connected yet - the Gmail module is next on the roadmap."
    />
  );
}
