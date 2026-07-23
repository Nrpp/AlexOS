import type { AlexEvent } from "@alexos/types";

export type ConnectionState = "connecting" | "open" | "closed";
type Handler = (payload: unknown) => void;
type StateListener = (state: ConnectionState) => void;

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

/**
 * The frontend's view of the AlexOS Core Event Bus. Widgets never fetch
 * external data directly - they subscribe here, and the backend Core is
 * the only thing that ever pushes real data through it.
 */
export class EventBusClient {
  private socket: WebSocket | null = null;
  private readonly subscribers = new Map<string, Set<Handler>>();
  private readonly stateListeners = new Set<StateListener>();
  private state: ConnectionState = "closed";
  private reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByCaller = false;

  constructor(private readonly url: string) {}

  connect(): void {
    this.closedByCaller = false;
    this.open();
  }

  disconnect(): void {
    this.closedByCaller = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }

  /** Subscribe to a named event, or "*" for every event. Returns an unsubscribe function. */
  subscribe(eventName: string, handler: Handler): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    this.subscribers.get(eventName)?.add(handler);
    return () => {
      this.subscribers.get(eventName)?.delete(handler);
    };
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  emit(eventName: string, payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ name: eventName, payload }));
    }
  }

  private open(): void {
    this.setState("connecting");
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
      this.setState("open");
    });

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener("close", () => {
      this.setState("closed");
      if (!this.closedByCaller) this.scheduleReconnect();
    });

    socket.addEventListener("error", () => {
      socket.close();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
      this.open();
    }, this.reconnectDelayMs);
  }

  private handleMessage(data: string): void {
    let event: AlexEvent;
    try {
      event = JSON.parse(data) as AlexEvent;
    } catch {
      return;
    }
    this.subscribers.get(event.name)?.forEach((handler) => handler(event.payload));
    this.subscribers.get("*")?.forEach((handler) => handler(event));
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
}
