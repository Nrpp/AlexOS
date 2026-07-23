import { Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { motion as motionTokens } from "@alexos/config";
import { StatusBar } from "./StatusBar/StatusBar";
import { Dock } from "./Dock/Dock";
import { NotificationsLayer } from "./NotificationsLayer";
import { DialogsLayer } from "./DialogsLayer";

/**
 * The fixed structure every AlexOS screen follows: Status Bar, Main
 * Content, Floating Dock, Notifications Layer, Dialogs Layer.
 */
export function AppShell() {
  const location = useLocation();
  const element = useOutlet();

  return (
    <DialogsLayer>
      <div className="min-h-screen bg-background-primary">
        <StatusBar />
        <main className="mx-auto max-w-[90rem] px-6 pb-32 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              // "easeOut" is Framer Motion's own keyword for the curve the
              // design tokens call "ease-out" in CSS.
              transition={{ duration: motionTokens.durationBase / 1000, ease: "easeOut" }}
            >
              <Suspense fallback={<div className="h-32 animate-pulse rounded-card bg-surface" />}>
                {element}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <Dock />
        <NotificationsLayer />
      </div>
    </DialogsLayer>
  );
}
