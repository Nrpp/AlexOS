import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface Package {
  id: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDeliveryDate: string | null;
  calendarEventCreated: boolean;
}

export interface PackageTrackerWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

export default function PackageTrackerWidget({ apiBaseUrl }: PackageTrackerWidgetProps) {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [label, setLabel] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/package_tracker/packages`)
      .then((response) => response.json())
      .then((result: Package[]) => setPackages(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPackage = async () => {
    const trimmed = label.trim();
    if (!trimmed || !apiBaseUrl) return;
    setLabel("");
    setCarrier("");
    setTrackingNumber("");
    setEstimatedDeliveryDate("");
    await fetch(`${apiBaseUrl}/api/v1/modules/package_tracker/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: trimmed,
        carrier,
        trackingNumber,
        estimatedDeliveryDate: estimatedDeliveryDate || null,
      }),
    });
    refresh();
  };

  const removePackage = async (id: string) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/package_tracker/packages/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            local_shipping
          </span>
        }
      >
        <CardTitle>Packages</CardTitle>
      </CardHeader>

      {packages === null ? (
        <CardLoading />
      ) : packages.length === 0 ? (
        <CardEmpty icon="local_shipping" message="No packages tracked." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-3">
            {packages.map((pkg) => (
              <li key={pkg.id} className="flex items-start justify-between gap-3">
                <div>
                  <a
                    href={pkg.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body font-semibold text-text-primary hover:text-accent-primary"
                  >
                    {pkg.label}
                  </a>
                  <p className="text-caption text-text-secondary">
                    {pkg.carrier || "Unknown carrier"}
                    {pkg.estimatedDeliveryDate ? ` - ETA ${pkg.estimatedDeliveryDate}` : ""}
                  </p>
                  {pkg.calendarEventCreated ? (
                    <p className="text-caption text-success">Added to Google Calendar</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void removePackage(pkg.id)}
                  aria-label={`Remove ${pkg.label}`}
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
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="What's in it? (e.g. new headphones)"
          aria-label="Package label"
        />
        <div className="flex gap-2">
          <Input
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            placeholder="Carrier"
            aria-label="Carrier"
            className="flex-1"
          />
          <Input
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder="Tracking #"
            aria-label="Tracking number"
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={estimatedDeliveryDate}
            onChange={(event) => setEstimatedDeliveryDate(event.target.value)}
            aria-label="Estimated delivery date"
            className="flex-1"
          />
          <Button variant="secondary" onClick={() => void addPackage()}>
            Save
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
