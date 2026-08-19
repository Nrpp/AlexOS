import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreContext, type CoreContextValue } from "../core/CoreProvider";
import { PresenceGate } from "./PresenceGate";

interface FakeStatus {
  locked: boolean;
  home: boolean;
  primaryDeviceId: string | null;
  pinConfigured: boolean;
  devices: unknown[];
}

let currentStatus: FakeStatus = {
  locked: false,
  home: true,
  primaryDeviceId: "phone-1",
  pinConfigured: true,
  devices: [],
};

const fakeCore: CoreContextValue = {
  eventBus: { subscribe: () => () => undefined } as unknown as CoreContextValue["eventBus"],
  apiClient: { baseUrl: "http://localhost:8000" } as unknown as CoreContextValue["apiClient"],
  connectionState: "open",
};

function renderGated(children: ReactNode) {
  return render(
    <CoreContext.Provider value={fakeCore}>
      <PresenceGate>{children}</PresenceGate>
    </CoreContext.Provider>,
  );
}

describe("PresenceGate", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/modules/presence/status")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(currentStatus) } as Response);
        }
        if (url.endsWith("/api/v1/modules")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the routed content immediately, before the first status fetch resolves", async () => {
    renderGated(<div>Dashboard content</div>);
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    // The initial status fetch still resolves in the background - wait
    // for it so its state update lands inside this test's act() scope
    // rather than bleeding into the next test.
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
  });

  it("renders the dashboard normally when home (locked: false)", async () => {
    currentStatus = { locked: false, home: true, primaryDeviceId: "phone-1", pinConfigured: true, devices: [] };
    renderGated(<div>Dashboard content</div>);

    await waitFor(() => expect(screen.getByText("Dashboard content")).toBeInTheDocument());
    expect(screen.queryByLabelText("Dashboard locked - tap to unlock")).not.toBeInTheDocument();
  });

  it("renders the ambient view instead of the routed content when locked", async () => {
    currentStatus = { locked: true, home: false, primaryDeviceId: null, pinConfigured: true, devices: [] };
    renderGated(<div>Dashboard content</div>);

    await waitFor(() => expect(screen.getByLabelText("Dashboard locked - tap to unlock")).toBeInTheDocument());
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("shows a floating Lock button when away but manually unlocked, not when home", async () => {
    currentStatus = { locked: false, home: false, primaryDeviceId: "phone-1", pinConfigured: true, devices: [] };
    renderGated(<div>Dashboard content</div>);

    await waitFor(() => expect(screen.getByLabelText("Lock the dashboard now")).toBeInTheDocument());
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("does not show the floating Lock button while home", async () => {
    currentStatus = { locked: false, home: true, primaryDeviceId: "phone-1", pinConfigured: true, devices: [] };
    renderGated(<div>Dashboard content</div>);

    await waitFor(() => expect(screen.getByText("Dashboard content")).toBeInTheDocument());
    expect(screen.queryByLabelText("Lock the dashboard now")).not.toBeInTheDocument();
  });

  it("clicking the floating Lock button calls POST /lock", async () => {
    currentStatus = { locked: false, home: false, primaryDeviceId: "phone-1", pinConfigured: true, devices: [] };
    renderGated(<div>Dashboard content</div>);

    const lockButton = await screen.findByLabelText("Lock the dashboard now");
    fireEvent.click(lockButton);

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/modules/presence/lock"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
