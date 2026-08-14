import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function StudyPage() {
  return (
    <ModuleWidgetPage
      title="Study"
      description="Pomodoro, exam countdowns, homework, and focus mode."
      moduleName={[
        "study",
        "focus",
        "dictionary",
        "thesaurus",
        "wikipedia_summary",
        "arxiv_search",
        "trivia_quiz",
        "periodic_table",
        "science_constants",
        "citation_generator",
        "calculator",
        "metric_prefix_converter",
        "base_converter",
        "roman_numerals",
        "typing_speed_test",
        "reading_speed",
        "study_break_suggester",
        "gpa_whatif",
        "mnemonic_generator",
        "times_tables_practice",
        "break_reminder",
        "flashcards",
        "class_schedule",
        "grade_tracker",
        "study_timer_log",
        "course_list",
        "assignment_tracker",
        "vocabulary_builder",
        "cheat_sheet",
        "study_contacts",
        "cornell_notes",
        "study_goals",
      ]}
      fallbackIcon="school"
      fallbackMessage="No study tools yet - Pomodoro and exam countdowns are next on the roadmap."
    />
  );
}
