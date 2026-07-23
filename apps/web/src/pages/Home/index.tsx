import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardEmpty,
  Button,
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

function QuickActions() {
  const { openDialog } = useDialogs();

  const actions = [
    { label: "Add task", icon: "add_task" },
    { label: "Start focus mode", icon: "timer" },
    { label: "New note", icon: "note_add" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            onClick={() =>
              openDialog({
                title: action.label,
                description: "This action isn't wired up to a module yet.",
              })
            }
          >
            <span className="material-symbols-rounded text-lg" aria-hidden>
              {action.icon}
            </span>
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function FavoriteWidgets() {
  const { eventBus } = useCore();
  const widgets = Object.values(widgetRegistry);

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
        <Component key={moduleName} eventBus={eventBus} />
      ))}
    </>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <Greeting />

      <div className="grid gap-4 sm:grid-cols-2">
        <FavoriteWidgets />

        <Card>
          <CardHeader
            icon={
              <span className="material-symbols-rounded" aria-hidden>
                partly_cloudy_day
              </span>
            }
          >
            <CardTitle>Weather</CardTitle>
            <CardSubtitle>Local conditions</CardSubtitle>
          </CardHeader>
          <CardEmpty icon="cloud_off" message="No weather module connected yet." />
        </Card>

        <Card>
          <CardHeader
            icon={
              <span className="material-symbols-rounded" aria-hidden>
                calendar_today
              </span>
            }
          >
            <CardTitle>Today's calendar</CardTitle>
          </CardHeader>
          <CardEmpty icon="event_busy" message="No events today." />
        </Card>

        <Card>
          <CardHeader
            icon={
              <span className="material-symbols-rounded" aria-hidden>
                checklist
              </span>
            }
          >
            <CardTitle>Today's tasks</CardTitle>
          </CardHeader>
          <CardEmpty icon="task_alt" message="No upcoming tasks." />
        </Card>

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
