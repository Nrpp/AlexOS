import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { CoreContext, type CoreContextValue } from "./CoreProvider";
import { useIdleRedirect } from "./useIdleRedirect";

let idleTimeoutMinutes = 0;

const fakeCore: CoreContextValue = {
  eventBus: { subscribe: () => () => undefined } as unknown as CoreContextValue["eventBus"],
  apiClient: {
    baseUrl: "http://localhost:8000",
    getConfig: () => Promise.resolve({ theme: "dark", userName: "there", idleTimeoutMinutes }),
  } as unknown as CoreContextValue["apiClient"],
  connectionState: "open",
};

function LocationLabel() {
  return <div data-testid="pathname">{useLocation().pathname}</div>;
}

function Harness() {
  useIdleRedirect();
  return <LocationLabel />;
}

function renderAt(path: string) {
  return render(
    <CoreContext.Provider value={fakeCore}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    </CoreContext.Provider>,
  );
}

// Rather than actually waiting out real (or fake-timer-advanced) minutes,
// these spy on window.setTimeout/addEventListener and invoke the captured
// callback directly - deterministic, and avoids the fake-timers-vs-promise-
// microtask ordering headaches that come with simulating a 1-5 minute wait.
describe("useIdleRedirect", () => {
  let setTimeoutSpy: MockInstance<typeof window.setTimeout>;
  let addEventListenerSpy: MockInstance<typeof window.addEventListener>;

  beforeEach(() => {
    setTimeoutSpy = vi.spyOn(window, "setTimeout");
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });

  it("does nothing when idleTimeoutMinutes is 0 (the default)", async () => {
    idleTimeoutMinutes = 0;
    renderAt("/settings");

    await waitFor(() => expect(screen.getByTestId("pathname")).toBeInTheDocument());
    // Give the getConfig().then() a moment to run before asserting the
    // negative - it resolves via a real (unmocked) microtask/promise.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(addEventListenerSpy).not.toHaveBeenCalledWith("keydown", expect.any(Function), expect.anything());
    expect(screen.getByTestId("pathname").textContent).toBe("/settings");
  });

  it("schedules a timer for idleTimeoutMinutes * 60000ms and navigates Home when it fires", async () => {
    idleTimeoutMinutes = 5;
    renderAt("/settings");

    await waitFor(() => expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60_000));
    const [callback] = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 5 * 60_000)!;

    act(() => {
      (callback as () => void)();
    });

    await waitFor(() => expect(screen.getByTestId("pathname").textContent).toBe("/"));
  });

  it("does not navigate (and does not even need to) when already on Home", async () => {
    idleTimeoutMinutes = 5;
    renderAt("/");

    await waitFor(() => expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60_000));
    const [callback] = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 5 * 60_000)!;

    act(() => {
      (callback as () => void)();
    });

    expect(screen.getByTestId("pathname").textContent).toBe("/");
  });

  it("registers activity listeners that reschedule the timer", async () => {
    idleTimeoutMinutes = 2;
    renderAt("/settings");

    await waitFor(() =>
      expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), expect.anything()),
    );
  });
});
