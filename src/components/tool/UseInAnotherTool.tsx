"use client";

import { ChevronDown, Forward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { handOff } from "@/lib/handoff";
import { useHandoffTargets, useToolSlug } from "./useHandoff";

export type ToolOutput = { blob: Blob; name: string };

/**
 * "Use in another tool" (G-11, design-system §8 ResultPanel): opens a tool
 * from the registry's `handoff` list with this result already added. The
 * files stay in memory (lib/handoff). Tools that take one file are offered
 * only for a single result.
 */
export function UseInAnotherTool({ outputs }: { outputs: ToolOutput[] }) {
  const router = useRouter();
  const source = useToolSlug();
  // Navigate once the menu has closed: leaving the page mid-exit crashed WebKit.
  const chosen = useRef<string | null>(null);
  const targets = useHandoffTargets().filter((target) => outputs.length === 1 || target.multiple);
  if (targets.length === 0 || outputs.length === 0 || !source) return null;

  function open(slug: string) {
    const files = outputs.map(({ blob, name }) => new File([blob], name, { type: blob.type }));
    handOff(slug, { files, source: source! });
    router.push(`/${slug}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <Forward aria-hidden />
          Use in another tool
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => {
          if (!chosen.current) return;
          event.preventDefault();
          open(chosen.current);
          chosen.current = null;
        }}
      >
        <DropdownMenuLabel>
          Open {outputs.length === 1 ? "the result" : `the ${outputs.length} files`} in
        </DropdownMenuLabel>
        {targets.map((target) => (
          <DropdownMenuItem key={target.slug} onSelect={() => (chosen.current = target.slug)}>
            {target.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
