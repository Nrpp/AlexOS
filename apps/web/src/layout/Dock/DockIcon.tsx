import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { motion as motionTokens } from "@alexos/config";
import type { NavItem } from "../../app/navigation";

export function DockIcon({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.path} end={item.path === "/"} aria-label={item.label} className="relative">
      {({ isActive }) => (
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          // Framer Motion's own easing keyword for the same curve the design
          // tokens call "ease-out" in CSS - the two libraries spell it differently.
          transition={{ duration: motionTokens.durationFast / 1000, ease: "easeOut" }}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-base ease-out ${
            isActive ? "bg-accent-primary text-text-primary" : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          <span className="material-symbols-rounded text-2xl" aria-hidden>
            {item.icon}
          </span>
        </motion.div>
      )}
    </NavLink>
  );
}
