// Tool categories (G-8). A module of its own, so client code (command palette,
// homepage) can use the names and hub links without importing the registry.

import type { ToolCategory } from "./types";

export const CATEGORY_ORDER: readonly ToolCategory[] = ["pdf", "image", "developer"];

export const CATEGORIES: Record<
  ToolCategory,
  { name: string; href: string; applicationCategory: string }
> = {
  pdf: { name: "PDF tools", href: "/pdf-tools", applicationCategory: "UtilitiesApplication" },
  image: {
    name: "Image tools",
    href: "/image-tools",
    applicationCategory: "MultimediaApplication",
  },
  developer: {
    name: "Developer tools",
    href: "/developer-tools",
    applicationCategory: "DeveloperApplication",
  },
};
