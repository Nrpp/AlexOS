import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

// The 20 utility modules added in one batch - grouped onto their own
// page instead of cluttering Home. Each is independently optional
// (skipped from the grid if not installed), so removing a folder from
// modules/ never breaks this page - see ModuleWidgetPage.
const UTILITY_MODULE_NAMES = [
  "quotes",
  "currency_converter",
  "jokes",
  "recipe_idea",
  "air_quality",
  "github_activity",
  "astronomy_photo",
  "rss_reader",
  "system_info",
  "unit_converter",
  "dice_coin",
  "password_generator",
  "world_clock",
  "stopwatch",
  "moon_phase",
  "reading_list",
  "habit_tracker",
  "water_tracker",
  "bookmarks",
  "shopping_list",
];

export default function UtilitiesPage() {
  return (
    <ModuleWidgetPage
      title="Utilities"
      description="Quick tools, real data feeds, and personal trackers."
      moduleName={UTILITY_MODULE_NAMES}
      fallbackIcon="widgets"
      fallbackMessage="No utility modules installed."
    />
  );
}
