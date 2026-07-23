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
