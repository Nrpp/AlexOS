import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from "@alexos/ui";

export interface CitationGeneratorWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type SourceType = "website" | "book" | "journal";

function formatAuthorApa(author: string): string {
  // "First Last" -> "Last, F." (best-effort, handles one author per field).
  const parts = author.trim().split(/\s+/);
  if (parts.length < 2) return author.trim();
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

function formatAuthorMla(author: string): string {
  const parts = author.trim().split(/\s+/);
  if (parts.length < 2) return author.trim();
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return `${last}, ${first}`;
}

function buildApa(
  sourceType: SourceType,
  title: string,
  author: string,
  year: string,
  publisher: string,
  url: string,
): string {
  const authorPart = author ? `${formatAuthorApa(author)} ` : "";
  const yearPart = `(${year || "n.d."}). `;
  if (sourceType === "website") {
    const titlePart = `${title || "Untitled"}. `;
    const sitePart = publisher ? `${publisher}. ` : "";
    const urlPart = url || "";
    return `${authorPart}${yearPart}${titlePart}${sitePart}${urlPart}`.trim();
  }
  if (sourceType === "book") {
    const titlePart = `${title || "Untitled"}. `;
    const publisherPart = publisher ? `${publisher}.` : "";
    return `${authorPart}${yearPart}${titlePart}${publisherPart}`.trim();
  }
  // journal article
  const titlePart = `${title || "Untitled"}. `;
  const journalPart = publisher ? `${publisher}.` : "";
  return `${authorPart}${yearPart}${titlePart}${journalPart}`.trim();
}

function buildMla(
  sourceType: SourceType,
  title: string,
  author: string,
  year: string,
  publisher: string,
  url: string,
): string {
  const authorPart = author ? `${formatAuthorMla(author)}. ` : "";
  if (sourceType === "website") {
    const titlePart = `"${title || "Untitled"}." `;
    const sitePart = publisher ? `${publisher}, ` : "";
    const yearPart = `${year || "n.d."}, `;
    const urlPart = url || "";
    return `${authorPart}${titlePart}${sitePart}${yearPart}${urlPart}`.trim();
  }
  if (sourceType === "book") {
    const titlePart = `${title || "Untitled"}. `;
    const publisherPart = publisher ? `${publisher}, ` : "";
    const yearPart = `${year || "n.d."}.`;
    return `${authorPart}${titlePart}${publisherPart}${yearPart}`.trim();
  }
  const titlePart = `"${title || "Untitled"}." `;
  const journalPart = publisher ? `${publisher}, ` : "";
  const yearPart = `${year || "n.d."}.`;
  return `${authorPart}${titlePart}${journalPart}${yearPart}`.trim();
}

/** Fully client-side - deterministic string formatting, no backend needed. */
export default function CitationGeneratorWidget(_props: CitationGeneratorWidgetProps) {
  const [sourceType, setSourceType] = useState<SourceType>("website");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [copiedStyle, setCopiedStyle] = useState<"apa" | "mla" | null>(null);

  const apaCitation = useMemo(
    () => buildApa(sourceType, title, author, year, publisher, url),
    [sourceType, title, author, year, publisher, url],
  );
  const mlaCitation = useMemo(
    () => buildMla(sourceType, title, author, year, publisher, url),
    [sourceType, title, author, year, publisher, url],
  );

  const copy = async (style: "apa" | "mla", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStyle(style);
      window.setTimeout(() => setCopiedStyle((current) => (current === style ? null : current)), 1500);
    } catch {
      // Clipboard may be unavailable - fail silently, text remains selectable.
    }
  };

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            format_quote
          </span>
        }
      >
        <CardTitle>Citation generator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <select
          value={sourceType}
          onChange={(event) => setSourceType(event.target.value as SourceType)}
          aria-label="Source type"
          className="h-14 rounded-button border border-border bg-background-secondary px-3 text-body text-text-primary"
        >
          <option value="website">Website</option>
          <option value="book">Book</option>
          <option value="journal">Journal article</option>
        </select>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          aria-label="Title"
        />
        <Input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Author (First Last)"
          aria-label="Author"
        />
        <div className="flex gap-2">
          <Input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Year"
            aria-label="Year"
            className="flex-1"
          />
          <Input
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            placeholder={sourceType === "journal" ? "Journal name" : "Publisher / site name"}
            aria-label="Publisher or site name"
            className="flex-[2]"
          />
        </div>
        {sourceType === "website" ? (
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="URL (optional)"
            aria-label="URL"
          />
        ) : null}

        <div className="flex flex-col gap-2 rounded-button border border-border bg-background-secondary p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-secondary">APA</span>
            <Button variant="ghost" onClick={() => void copy("apa", apaCitation)} className="h-8 min-h-0 px-2 text-caption">
              {copiedStyle === "apa" ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-body text-text-primary">{apaCitation}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-button border border-border bg-background-secondary p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-secondary">MLA</span>
            <Button variant="ghost" onClick={() => void copy("mla", mlaCitation)} className="h-8 min-h-0 px-2 text-caption">
              {copiedStyle === "mla" ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-body text-text-primary">{mlaCitation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
