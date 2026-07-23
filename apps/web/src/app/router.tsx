import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";

// Lazy loaded so navigating to a page you've never visited doesn't cost
// anything on first paint - per the performance rules, nothing heavy
// loads before it's needed.
const HomePage = lazy(() => import("../pages/Home"));
const StudyPage = lazy(() => import("../pages/Study"));
const ServersPage = lazy(() => import("../pages/Servers"));
const NetworkPage = lazy(() => import("../pages/Network"));
const CommunicationPage = lazy(() => import("../pages/Communication"));
const MediaPage = lazy(() => import("../pages/Media"));
const AIPage = lazy(() => import("../pages/AI"));
const RoomPage = lazy(() => import("../pages/Room"));
const FinancePage = lazy(() => import("../pages/Finance"));
const VehiclePage = lazy(() => import("../pages/Vehicle"));
const SettingsPage = lazy(() => import("../pages/Settings"));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/study", element: <StudyPage /> },
      { path: "/servers", element: <ServersPage /> },
      { path: "/network", element: <NetworkPage /> },
      { path: "/communication", element: <CommunicationPage /> },
      { path: "/media", element: <MediaPage /> },
      { path: "/ai", element: <AIPage /> },
      { path: "/room", element: <RoomPage /> },
      { path: "/finance", element: <FinancePage /> },
      { path: "/vehicle", element: <VehiclePage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
