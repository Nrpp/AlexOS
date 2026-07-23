import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function MediaPage() {
  return (
    <ModuleWidgetPage
      title="Media"
      description="Spotify, Apple Music, playback controls, and what's playing."
      moduleName="media"
      fallbackIcon="music_note"
      fallbackMessage="No player connected yet - Spotify is the first module planned here."
    />
  );
}
