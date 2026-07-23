import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PagePlaceholder } from "./PagePlaceholder";

describe("PagePlaceholder", () => {
  it("renders the title, description, and empty-state message", () => {
    render(
      <PagePlaceholder
        title="Study"
        description="Focus tools"
        icon="school"
        comingSoon="Nothing here yet."
      />,
    );

    expect(screen.getByText("Study")).toBeInTheDocument();
    expect(screen.getByText("Focus tools")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("omits the header when no title is given", () => {
    render(<PagePlaceholder icon="build" comingSoon="Coming soon." />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Coming soon.")).toBeInTheDocument();
  });
});
