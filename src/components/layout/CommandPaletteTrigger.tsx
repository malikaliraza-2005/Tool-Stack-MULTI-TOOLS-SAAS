"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";

// cmdk and the palette load on first open, not with the page (dependencies-licenses §2.1).
const loadPalette = () => import("./CommandPalette");
const CommandPalette = dynamic(() => loadPalette().then((mod) => mod.CommandPalette), {
  ssr: false,
});

const noopSubscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** ⌘K on Apple devices, Ctrl K elsewhere (design-system §8). */
export function useModKeyLabel() {
  return useSyncExternalStore(
    noopSubscribe,
    () => (isApple() ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mod = useModKeyLabel();
  // The palette has no DialogTrigger (it opens from two buttons and a shortcut),
  // so it returns focus to whatever was focused when it opened.
  const returnFocus = useRef<HTMLElement | null>(null);

  function setPaletteOpen(next: boolean) {
    if (next && !open) {
      const active = document.activeElement;
      returnFocus.current = active instanceof HTMLElement ? active : null;
    }
    setLoaded(true);
    setOpen(next);
  }

  const onShortcut = useEffectEvent(() => setPaletteOpen(!open));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        onShortcut();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const show = () => setPaletteOpen(true);
  // Start fetching the palette chunk when the user shows intent.
  const prefetch = () => void loadPalette();

  return (
    <>
      <button
        type="button"
        onClick={show}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(
          "hidden h-9 w-56 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 pr-1.5 pl-3 text-ui text-fg-muted transition-control md:inline-flex",
          "hover:border-border-strong hover:text-fg",
        )}
      >
        <Search aria-hidden className="size-4" />
        <span className="grow text-left">Search tools…</span>
        <span className="inline-flex gap-0.5" aria-hidden>
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <IconButton
        label="Search tools"
        icon={<Search aria-hidden />}
        onClick={show}
        aria-haspopup="dialog"
        className="md:hidden"
      />
      {loaded && (
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        />
      )}
    </>
  );
}
