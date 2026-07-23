import { PagePlaceholder } from "../../components/PagePlaceholder";

export default function MediaPage() {
  return (
    <PagePlaceholder
      title="Media"
      description="Spotify, Apple Music, playback controls, and what's playing."
      icon="music_note"
      comingSoon="No player connected yet - Spotify is the first module planned here."
    />
  );
}
