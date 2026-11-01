"use client";

import { Star } from "lucide-react";
import { toggleFavorite, useFavorites } from "@/components/layout/useToolPrefs";
import { IconButton } from "@/components/ui/IconButton";
import { notify } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/** Adds the tool to the favorites shown first in the command palette (G-6). */
export function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const favorite = useFavorites().includes(slug);
  return (
    <IconButton
      label="Favorite"
      aria-pressed={favorite}
      variant="secondary"
      icon={<Star aria-hidden className={cn(favorite && "fill-current text-accent-text")} />}
      onClick={() => {
        if (!toggleFavorite(slug)) {
          notify.warning("Favorites couldn’t be saved", {
            description: "Your browser blocks local storage for this site.",
          });
        } else if (!favorite) {
          notify.success(`${name} added to favorites`, {
            description: "Favorites are listed first in search (Ctrl K or ⌘K).",
          });
        }
      }}
    />
  );
}
