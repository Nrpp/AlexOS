import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Flight {
  id: string;
  flightNumber: string;
  departureIso: string;
  arrivalIso: string | null;
  airline: string;
  notes: string;
  trackingUrl: string;
  calendarEventCreated: boolean;
}

export interface FlightTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function formatDeparture(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FlightTrackerWidget({ apiBaseUrl }: FlightTrackerWidgetProps) {
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [flightNumber, setFlightNumber] = useState("");
  const [departure, setDeparture] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/flight_tracker/flights`)
      .then((response) => response.json())
      .then((result: Flight[]) => setFlights(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFlight = async () => {
    const trimmed = flightNumber.trim();
    if (!trimmed || !departure || !apiBaseUrl) return;
    setFlightNumber("");
    setDeparture("");
    await fetch(`${apiBaseUrl}/api/v1/modules/flight_tracker/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightNumber: trimmed, departureIso: new Date(departure).toISOString() }),
    });
    refresh();
  };

  const removeFlight = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/flight_tracker/flights/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            flight
          </span>
        }
      >
        <CardTitle>Flights</CardTitle>
      </CardHeader>

      {flights === null ? (
        <CardLoading />
      ) : flights.length === 0 ? (
        <CardEmpty icon="flight" message="No flights saved." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {flights.map((flight) => (
              <li key={flight.id} className="flex items-start justify-between gap-3">
                <div>
                  <a
                    href={flight.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body font-semibold text-text-primary hover:text-accent-primary"
                  >
                    {flight.flightNumber}
                  </a>
                  <p className="text-caption text-text-secondary">{formatDeparture(flight.departureIso)}</p>
                  {flight.calendarEventCreated ? (
                    <p className="text-caption text-success">Added to Google Calendar</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void removeFlight(flight.id)}
                  aria-label={`Remove ${flight.flightNumber}`}
                  className="shrink-0 text-text-secondary hover:text-danger"
                >
                  <span className="material-symbols-rounded text-lg" aria-hidden>
                    close
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-2">
        <Input
          value={flightNumber}
          onChange={(event) => setFlightNumber(event.target.value)}
          placeholder="Flight number, e.g. IB1234"
          aria-label="Flight number"
        />
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={departure}
            onChange={(event) => setDeparture(event.target.value)}
            aria-label="Departure date and time"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addFlight()}>
            Save
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
