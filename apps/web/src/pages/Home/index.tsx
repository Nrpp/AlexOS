import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardEmpty,
  Button,
  Dialog,
  DialogContent,
  Input,
} from "@alexos/ui";
import { getDayPart, capitalize } from "@alexos/utils";
import { widgetRegistry } from "../../modules/registry";
import { useCore } from "../../core/useCore";
import { useDialogs } from "../../layout/DialogsLayer";

const GREETINGS: Record<ReturnType<typeof getDayPart>, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
};

// weather/calendar/tasks have dedicated cards on Home below; every other
// installed module (study, servers, network, communication, media, ai,
// room, finance) has its own page from the Dock. Excluded here so
// nothing renders twice, and so Home doesn't turn into a dump of every
// installed widget - "clock" is the only one left with no other home.
// A real "favorite" picker is future work; this is the honest default
// until then.
const DEDICATED_HOME_WIDGETS = new Set([
  "weather",
  "calendar",
  "tasks",
  "study",
  "servers",
  "network",
  "communication",
  "media",
  "ai",
  "room",
  "finance",
]);

function Greeting() {
  const { apiClient } = useCore();
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getConfig()
      .then((config) => {
        if (!cancelled) setUserName(config.userName);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const dayPart = getDayPart(new Date());

  return (
    <div>
      <h1 className="text-heading font-semibold text-text-primary">
        {GREETINGS[dayPart]}, {capitalize(userName)}
      </h1>
      <p className="text-body text-text-secondary">Here's what's happening today.</p>
    </div>
  );
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBaseUrl: string;
}

/** Its own component (not the generic DialogsLayer) so the input's live
 * state belongs to something that actually re-renders while typing. */
function AddTaskDialog({ open, onOpenChange, apiBaseUrl }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/tasks/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    setTitle("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add task"
        primaryAction={
          <Button variant="primary" onClick={() => void submit()}>
            Add
          </Button>
        }
        secondaryAction={
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        }
      >
        <Input
          autoFocus
          placeholder="Task title..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submit()}
          aria-label="New task title"
        />
      </DialogContent>
    </Dialog>
  );
}

function QuickActions() {
  const { openDialog } = useDialogs();
  const { apiClient } = useCore();
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const actions = [
    { label: "Add task", icon: "add_task", onClick: () => setAddTaskOpen(true) },
    {
      label: "Start focus mode",
      icon: "timer",
      onClick: () =>
        openDialog({
          title: "Start focus mode",
          description: "This action isn't wired up to a module yet.",
        }),
    },
    {
      label: "New note",
      icon: "note_add",
      onClick: () =>
        openDialog({
          title: "New note",
          description: "This action isn't wired up to a module yet.",
        }),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant="secondary" onClick={action.onClick}>
              <span className="material-symbols-rounded text-lg" aria-hidden>
                {action.icon}
              </span>
              {action.label}
            </Button>
          ))}
        </CardContent>
      </Card>
      <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} apiBaseUrl={apiClient.baseUrl} />
    </>
  );
}

function FavoriteWidgets() {
  const { eventBus, apiClient } = useCore();
  const widgets = Object.values(widgetRegistry).filter(
    ({ moduleName }) => !DEDICATED_HOME_WIDGETS.has(moduleName),
  );

  if (widgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favorite widgets</CardTitle>
        </CardHeader>
        <CardEmpty icon="widgets" message="No favorite widgets yet." />
      </Card>
    );
  }

  return (
    <>
      {widgets.map(({ moduleName, Component }) => (
        <Component key={moduleName} eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />
      ))}
    </>
  );
}

/** Renders a dedicated module's widget if installed, otherwise the honest empty state it replaces. */
function DedicatedWidgetSlot({
  moduleName,
  fallbackIcon,
  fallbackTitle,
  fallbackMessage,
}: {
  moduleName: string;
  fallbackIcon: string;
  fallbackTitle: string;
  fallbackMessage: string;
}) {
  const { eventBus, apiClient } = useCore();
  const entry = widgetRegistry[moduleName];

  if (!entry) {
    return (
      <Card>
        <CardHeader
          icon={
            <span className="material-symbols-rounded" aria-hidden>
              {fallbackIcon}
            </span>
          }
        >
          <CardTitle>{fallbackTitle}</CardTitle>
        </CardHeader>
        <CardEmpty icon={fallbackIcon} message={fallbackMessage} />
      </Card>
    );
  }

  const { Component } = entry;
  return <Component eventBus={eventBus} apiBaseUrl={apiClient.baseUrl} />;
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <Greeting />

      <div className="grid gap-4 sm:grid-cols-2">
        <FavoriteWidgets />

        <DedicatedWidgetSlot
          moduleName="weather"
          fallbackIcon="cloud_off"
          fallbackTitle="Weather"
          fallbackMessage="No weather module connected yet."
        />

        <DedicatedWidgetSlot
          moduleName="calendar"
          fallbackIcon="event_busy"
          fallbackTitle="Today's calendar"
          fallbackMessage="No events today."
        />

        <DedicatedWidgetSlot
          moduleName="tasks"
          fallbackIcon="task_alt"
          fallbackTitle="Today's tasks"
          fallbackMessage="No upcoming tasks."
        />

        <QuickActions />

        <Card>
          <CardHeader
            icon={
              <span className="material-symbols-rounded" aria-hidden>
                notifications
              </span>
            }
          >
            <CardTitle>Recent notifications</CardTitle>
          </CardHeader>
          <CardEmpty icon="notifications_off" message="You're all caught up." />
        </Card>
      </div>
    </div>
  );
}
