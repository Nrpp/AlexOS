import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function CommunicationPage() {
  return (
    <ModuleWidgetPage
      title="Communication"
      description="Gmail today, and your calendar; WhatsApp, Telegram, and quick replies are planned."
      moduleName={["communication", "calendar"]}
      fallbackIcon="forum"
      fallbackMessage="No accounts connected yet - see modules/communication and modules/calendar's READMEs to connect Gmail/Google Calendar."
    />
  );
}
