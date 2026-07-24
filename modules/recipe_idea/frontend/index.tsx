import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardLoading, CardError, Button } from "@alexos/ui";

interface Recipe {
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnailUrl: string;
}

export interface RecipeIdeaWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

/** Real recipes via TheMealDB (themealdb.com) - free, no API key. */
export default function RecipeIdeaWidget({ apiBaseUrl }: RecipeIdeaWidgetProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!apiBaseUrl) return;
    setError(null);
    fetch(`${apiBaseUrl}/api/v1/modules/recipe_idea/recipe`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then((result: Recipe) => setRecipe(result))
      .catch(() => setError("Couldn't reach TheMealDB."));
  }, [apiBaseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            restaurant
          </span>
        }
        actions={
          <Button variant="ghost" onClick={refresh}>
            <span className="material-symbols-rounded text-lg" aria-hidden>
              refresh
            </span>
          </Button>
        }
      >
        <CardTitle>Recipe idea</CardTitle>
        {recipe ? <CardSubtitle>{recipe.category} &middot; {recipe.area}</CardSubtitle> : null}
      </CardHeader>
      {error ? (
        <CardError message={error} onRetry={refresh} />
      ) : recipe === null ? (
        <CardLoading />
      ) : (
        <CardContent className="flex gap-3">
          {recipe.thumbnailUrl ? (
            <img
              src={recipe.thumbnailUrl}
              alt={recipe.name}
              className="h-20 w-20 shrink-0 rounded-button object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-body font-semibold text-text-primary">{recipe.name}</p>
            <p className="text-caption text-text-secondary">{truncate(recipe.instructions, 140)}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
