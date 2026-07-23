import { ModuleWidgetPage } from "../../components/ModuleWidgetPage";

export default function RoomPage() {
  return (
    <ModuleWidgetPage
      title="Room"
      description="Lights, music, timers, focus mode, and sleep and morning routines."
      moduleName="room"
      fallbackIcon="living"
      fallbackMessage="No smart home connected yet - lighting control is the first step planned here."
    />
  );
}
