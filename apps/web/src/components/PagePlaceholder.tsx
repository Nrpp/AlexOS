import { Card, CardEmpty } from "@alexos/ui";

export interface PagePlaceholderProps {
  /** Omit to render just the empty-state card - e.g. as a lower section on an already-titled page. */
  title?: string;
  description?: string;
  icon: string;
  /** What this page will eventually contain - keeps the empty state honest instead of just "Empty". */
  comingSoon: string;
}

/** Shared shell for every not-yet-built page - never a blank screen. */
export function PagePlaceholder({ title, description, icon, comingSoon }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6 py-6">
      {title ? (
        <div>
          <h1 className="text-heading font-semibold text-text-primary">{title}</h1>
          {description ? <p className="text-body text-text-secondary">{description}</p> : null}
        </div>
      ) : null}
      <Card>
        <CardEmpty icon={icon} message={comingSoon} />
      </Card>
    </div>
  );
}
