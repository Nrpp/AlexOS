import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function StudyPage() {
  return (
    <ModuleWidgetPage
      title="Study"
      description="Pomodoro, exam countdowns, homework, and focus mode."
      moduleName={["study", "focus"]}
      fallbackIcon="school"
      fallbackMessage="No study tools yet - Pomodoro and exam countdowns are next on the roadmap."
    />
  );
}
