import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function AlexPage() {
  return (
    <ModuleWidgetPage
      title="Alex"
      description="Connection status, reminders, and system health for the Alex personal assistant."
      moduleName="alex_assistant"
      fallbackIcon="smart_toy"
      fallbackMessage="No alex_assistant module connected yet."
    />
  );
}
