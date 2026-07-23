import { RouterProvider } from "react-router-dom";
import { CoreProvider } from "../core/CoreProvider";
import { router } from "./router";

export function App() {
  return (
    <CoreProvider>
      <RouterProvider router={router} />
    </CoreProvider>
  );
}
