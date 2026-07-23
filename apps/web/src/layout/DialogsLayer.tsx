import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, Button } from "@alexos/ui";

export interface DialogDescriptor {
  title: string;
  description?: string;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

interface DialogsContextValue {
  openDialog: (dialog: DialogDescriptor) => void;
  closeDialog: () => void;
}

const DialogsContext = createContext<DialogsContextValue | null>(null);

export function useDialogs(): DialogsContextValue {
  const context = useContext(DialogsContext);
  if (!context) throw new Error("useDialogs() must be called within a <DialogsLayer>");
  return context;
}

/**
 * The one place in the app that ever mounts a dialog. Pages/widgets call
 * useDialogs().openDialog(...) instead of rendering their own overlay -
 * keeps every dialog centered, rounded, and minimal by construction.
 */
export function DialogsLayer({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogDescriptor | null>(null);

  const closeDialog = useCallback(() => setDialog(null), []);
  const openDialog = useCallback((next: DialogDescriptor) => setDialog(next), []);

  const value = useMemo<DialogsContextValue>(() => ({ openDialog, closeDialog }), [openDialog, closeDialog]);

  return (
    <DialogsContext.Provider value={value}>
      {children}
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        {dialog ? (
          <DialogContent
            title={dialog.title}
            {...(dialog.description !== undefined ? { description: dialog.description } : {})}
            primaryAction={
              <Button
                variant="primary"
                onClick={() => {
                  dialog.onConfirm?.();
                  closeDialog();
                }}
              >
                {dialog.confirmLabel ?? "Confirm"}
              </Button>
            }
            secondaryAction={
              <Button variant="ghost" onClick={closeDialog}>
                {dialog.cancelLabel ?? "Cancel"}
              </Button>
            }
          >
            {dialog.content}
          </DialogContent>
        ) : null}
      </Dialog>
    </DialogsContext.Provider>
  );
}
