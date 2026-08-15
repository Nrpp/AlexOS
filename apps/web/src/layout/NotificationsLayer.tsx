import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { motion as motionTokens } from "@alexos/config";
import type { CoreEventPayloadMap } from "@alexos/types";
import { useEventBus } from "@alexos/hooks";
import { useCore } from "../core/useCore";

type NotificationPayload = CoreEventPayloadMap["notification.created"];

const AUTO_DISMISS_MS = 6000;

const PRIORITY_STYLES: Record<NotificationPayload["priority"], string> = {
  critical: "border-danger/40 bg-danger/10",
  warning: "border-warning/40 bg-warning/10",
  information: "border-information/40 bg-information/10",
  success: "border-success/40 bg-success/10",
};

const PRIORITY_TONE: Record<NotificationPayload["priority"], { frequency: number; durationMs: number; repeats: number }> = {
  critical: { frequency: 880, durationMs: 180, repeats: 3 },
  warning: { frequency: 660, durationMs: 160, repeats: 2 },
  information: { frequency: 520, durationMs: 140, repeats: 1 },
  success: { frequency: 740, durationMs: 140, repeats: 1 },
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

/**
 * A small synthesized chime, not an audio asset - keeps the bundle free
 * of binary files and sounds identical for every notification source (a
 * module event, a reminder, ...). Browsers block audio before any user
 * gesture on the page; on a touch kiosk that gesture has almost always
 * already happened by the time a notification fires, and if it hasn't,
 * this just stays silent rather than throwing.
 */
function playNotificationSound(priority: NotificationPayload["priority"]): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
  const { frequency, durationMs, repeats } = PRIORITY_TONE[priority];
  for (let i = 0; i < repeats; i += 1) {
    const startAt = context.currentTime + i * (durationMs / 1000) * 1.4;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.15, startAt + 0.015);
    gain.gain.linearRampToValueAtTime(0, startAt + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationMs / 1000 + 0.02);
  }
}

/**
 * Notifications never interrupt: they slide from the top and disappear
 * on their own, except critical ones, which stay until dismissed.
 */
export function NotificationsLayer() {
  const { eventBus } = useCore();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  useEventBus(eventBus, "notification.created", (payload) => {
    const notification = payload as NotificationPayload;
    setNotifications((current) => [...current, notification]);
    try {
      playNotificationSound(notification.priority);
    } catch {
      // A sound failure (blocked autoplay, no AudioContext, ...) must
      // never take the visible notification down with it.
    }
    if (notification.priority !== "critical") {
      setTimeout(() => dismiss(notification.id), AUTO_DISMISS_MS);
    }
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 sm:items-end sm:right-4 sm:left-auto">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            // "easeOut" is Framer Motion's own keyword for the curve the
            // design tokens call "ease-out" in CSS.
            transition={{ duration: motionTokens.durationBase / 1000, ease: "easeOut" }}
            className={`pointer-events-auto w-[min(360px,90vw)] rounded-card border p-4 shadow-soft backdrop-blur-xl ${PRIORITY_STYLES[notification.priority]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-body font-semibold text-text-primary">{notification.title}</p>
                <p className="text-caption text-text-secondary">{notification.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                aria-label="Dismiss notification"
                className="text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden>
                  close
                </span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
