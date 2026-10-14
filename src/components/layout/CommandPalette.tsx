"use client";

import { Command } from "cmdk";
import { CornerDownLeft, FileText, House, Image as ImageIcon, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import { commandItemClasses } from "@/components/ui/menu-styles";
import { cn } from "@/lib/cn";
import { THEME_OPTIONS } from "./ThemeToggle";
import { setThemePreference } from "./useTheme";

// Static items until the registry-driven search in Phase 7 (P2-T15). Tools
// with an `href` are live (Phase 3 pilots); the others are marked "Soon".
const PLACEHOLDER_TOOLS: { name: string; icon: typeof FileText; href?: string }[] = [
  { name: "Merge PDF", icon: FileText, href: "/merge-pdf" },
  { name: "Split PDF", icon: FileText },
  { name: "Compress Image", icon: ImageIcon },
  { name: "Convert Image", icon: ImageIcon },
  { name: "JSON Formatter", icon: Wrench, href: "/json-formatter" },
  { name: "JWT Decoder", icon: Wrench },
  { name: "Base64 Encode / Decode", icon: Wrench },
  { name: "Regex Tester", icon: Wrench },
];

const groupClasses = cn(
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1",
  "[&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:text-fg-muted [&_[cmdk-group-heading]]:uppercase",
);

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
};

/** ⌘K / Ctrl+K palette (design-system §8, G-1). */
export function CommandPalette({ open, onOpenChange, onCloseAutoFocus }: CommandPaletteProps) {
  const router = useRouter();
  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Search tools and actions"
        hideTitle
        hideClose
        placement="top"
        width="palette"
        bare
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <Command loop label="Search tools and actions">
          <Command.Input
            placeholder="Search tools and actions…"
            className="h-12 w-full border-b border-border bg-transparent px-4 text-body text-fg outline-none placeholder:text-fg-subtle"
          />
          <Command.List className="max-h-(--sheet-max-height) overflow-y-auto p-2 sm:max-h-96">
            <Command.Empty className="px-2 py-6 text-center text-small text-fg-muted">
              No matching tools yet. Try “PDF”, “image” or “JSON”.
            </Command.Empty>
            <Command.Group heading="Tools" className={groupClasses}>
              {PLACEHOLDER_TOOLS.map(({ name, icon: Icon, href }) => (
                <Command.Item
                  key={name}
                  value={name}
                  disabled={!href}
                  onSelect={href ? () => run(() => router.push(href)) : undefined}
                  className={commandItemClasses}
                >
                  <Icon aria-hidden className="text-fg-muted" />
                  {name}
                  {!href && <Badge className="ml-auto">Soon</Badge>}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Go to" className={groupClasses}>
              <Command.Item
                value="Home"
                onSelect={() => run(() => router.push("/"))}
                className={commandItemClasses}
              >
                <House aria-hidden className="text-fg-muted" />
                Home
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Actions" className={groupClasses}>
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Command.Item
                  key={value}
                  value={`Theme: ${label}`}
                  keywords={["theme", "appearance", "mode"]}
                  onSelect={() => run(() => setThemePreference(value))}
                  className={commandItemClasses}
                >
                  <Icon aria-hidden className="text-fg-muted" />
                  Theme: {label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-small text-fg-muted sm:flex">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to move
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>
                <CornerDownLeft aria-hidden className="size-3" />
                <span className="sr-only">Enter</span>
              </Kbd>
              to select
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
