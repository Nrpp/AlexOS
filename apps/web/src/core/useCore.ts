import { useContext } from "react";
import { CoreContext, type CoreContextValue } from "./CoreProvider";

export function useCore(): CoreContextValue {
  const context = useContext(CoreContext);
  if (!context) {
    throw new Error("useCore() must be called within a <CoreProvider>");
  }
  return context;
}
