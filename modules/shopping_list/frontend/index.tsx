import { useCallback, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardEmpty, CardLoading, CardFooter, Input, Button } from "@alexos/ui";

interface ShoppingItem {
  id: string;
  title: string;
  checked: boolean;
}

export interface ShoppingListWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

/** Real, persisted shopping list (see modules/shopping_list/backend). */
export default function ShoppingListWidget({ apiBaseUrl }: ShoppingListWidgetProps) {
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [title, setTitle] = useState("");

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    fetch(`${apiBaseUrl}/api/v1/modules/shopping_list/items`)
      .then((response) => response.json())
      .then((result: ShoppingItem[]) => setItems(result))
      .catch(() => undefined);
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async () => {
    const trimmed = title.trim();
    if (!trimmed || !apiBaseUrl) return;
    setTitle("");
    await fetch(`${apiBaseUrl}/api/v1/modules/shopping_list/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    refresh();
  };

  const toggleItem = async (item: ShoppingItem) => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/shopping_list/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    refresh();
  };

  const clearChecked = async () => {
    if (!apiBaseUrl) return;
    await fetch(`${apiBaseUrl}/api/v1/modules/shopping_list/items/clear-checked`, { method: "POST" });
    refresh();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void addItem();
  };

  const hasChecked = items?.some((item) => item.checked) ?? false;

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            shopping_cart
          </span>
        }
        actions={
          hasChecked ? (
            <button type="button" onClick={() => void clearChecked()} className="text-caption text-accent-primary">
              Clear checked
            </button>
          ) : undefined
        }
      >
        <CardTitle>Shopping list</CardTitle>
      </CardHeader>

      {items === null ? (
        <CardLoading />
      ) : items.length === 0 ? (
        <CardEmpty icon="shopping_cart" message="Nothing on your list." />
      ) : (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void toggleItem(item)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ease-out ${
                      item.checked
                        ? "border-success bg-success/20 text-success"
                        : "border-border text-transparent hover:border-accent-primary"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base" aria-hidden>
                      check
                    </span>
                  </span>
                  <span
                    className={`text-body ${item.checked ? "text-text-secondary line-through" : "text-text-primary"}`}
                  >
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      <CardFooter className="gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add an item..."
          aria-label="New shopping item"
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => void addItem()}>
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
