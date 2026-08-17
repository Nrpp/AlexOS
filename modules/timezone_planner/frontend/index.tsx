import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Zone {
  id: string;
  name: string;
  label: string;
}

interface Conversion {
  name: string;
  label: string;
  localTime: string;
}

export interface TimezonePlannerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

export default function TimezonePlannerWidget({ apiBaseUrl }: TimezonePlannerWidgetProps) {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneLabel, setZoneLabel] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [baseTimezone, setBaseTimezone] = useState<string | null>(null);
  const [conversions, setConversions] = useState<Conversion[] | null>(null);
  const [status, setStatus] = useState("");

  const refreshZones = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/timezone_planner/zones`)
      .then((response) => response.json())
      .then((result: Zone[]) => setZones(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refreshZones();
  }, [refreshZones]);

  const addZone = async () => {
    const trimmed = zoneName.trim();
    if (!trimmed || !apiBaseUrl) return;
    setZoneName("");
    setZoneLabel("");
    await fetch(`${apiBaseUrl}/api/v1/modules/timezone_planner/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, label: zoneLabel.trim() }),
    });
    refreshZones();
  };

  const removeZone = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/timezone_planner/zones/${id}`, { method: "DELETE" });
    refreshZones();
  };

  const convert = async () => {
    if (!meetingTime || !apiBaseUrl) return;
    setStatus("");
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/timezone_planner/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iso: meetingTime }),
    });
    if (!response.ok) {
      setStatus("Couldn't convert that time.");
      return;
    }
    const data = await response.json();
    setBaseTimezone(data.baseTimezone);
    setConversions(data.conversions);
  };

  const createMeeting = async () => {
    const trimmedTitle = meetingTitle.trim();
    if (!trimmedTitle || !meetingTime || !apiBaseUrl) return;
    const response = await fetch(`${apiBaseUrl}/api/v1/modules/timezone_planner/meeting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmedTitle, iso: meetingTime }),
    });
    const data = await response.json();
    setStatus(data.calendarEventCreated ? "Added to Google Calendar." : "Google Calendar isn't connected.");
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            public
          </span>
        }
      >
        <CardTitle>Timezone planner</CardTitle>
      </CardHeader>

      {zones === null ? (
        <CardLoading />
      ) : (
        <CardContent>
          {zones.length === 0 ? (
            <CardEmpty icon="public" message="No saved timezones yet." />
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {zones.map((zone) => (
                <li key={zone.id} className="flex items-center justify-between gap-3">
                  <span className="text-body text-text-primary">{zone.label}</span>
                  <button
                    type="button"
                    onClick={() => void removeZone(zone.id)}
                    aria-label={`Remove ${zone.label}`}
                    className="text-text-secondary hover:text-danger"
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden>
                      close
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              value={zoneName}
              onChange={(event) => setZoneName(event.target.value)}
              placeholder="IANA zone, e.g. America/New_York"
              aria-label="Timezone name"
              className="flex-1"
            />
            <Input
              value={zoneLabel}
              onChange={(event) => setZoneLabel(event.target.value)}
              placeholder="Label (optional)"
              aria-label="Timezone label"
              className="w-32"
            />
            <Button variant="secondary" onClick={() => void addZone()}>
              Add
            </Button>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <Input
              value={meetingTitle}
              onChange={(event) => setMeetingTitle(event.target.value)}
              placeholder="Meeting title"
              aria-label="Meeting title"
              className="mb-2"
            />
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={meetingTime}
                onChange={(event) => setMeetingTime(event.target.value)}
                aria-label="Meeting time (your timezone)"
                className="flex-1"
              />
              <Button variant="secondary" onClick={() => void convert()}>
                Convert
              </Button>
            </div>

            {conversions ? (
              <ul className="mt-3 flex flex-col gap-1">
                <li className="text-caption text-text-secondary">Base ({baseTimezone}): {meetingTime.replace("T", " ")}</li>
                {conversions.map((conversion) => (
                  <li key={conversion.name} className="flex justify-between text-caption text-text-secondary">
                    <span>{conversion.label}</span>
                    <span className="text-text-primary">{conversion.localTime}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {status ? <p className="mt-2 text-caption text-text-secondary">{status}</p> : null}
          </div>
        </CardContent>
      )}

      <CardFooter className="justify-end">
        <Button onClick={() => void createMeeting()}>Create calendar event</Button>
      </CardFooter>
    </Card>
  );
}
