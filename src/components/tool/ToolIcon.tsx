import {
  Binary,
  Braces,
  Clock,
  Eraser,
  FileImage,
  Files,
  Fingerprint,
  GitCompare,
  Hash,
  Image,
  ImageDown,
  KeyRound,
  LayoutGrid,
  Link,
  Regex,
  Repeat,
  Scaling,
  Scissors,
  Signature,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Lucide icons by the registry's `icon` name. Named imports keep the bundle
 * to these icons only; registry.test.ts checks that every tool's icon is here.
 */
export const TOOL_ICONS: Record<string, LucideIcon> = {
  binary: Binary,
  braces: Braces,
  clock: Clock,
  eraser: Eraser,
  "file-image": FileImage,
  files: Files,
  fingerprint: Fingerprint,
  "git-compare": GitCompare,
  hash: Hash,
  image: Image,
  "image-down": ImageDown,
  "key-round": KeyRound,
  "layout-grid": LayoutGrid,
  link: Link,
  regex: Regex,
  repeat: Repeat,
  scaling: Scaling,
  scissors: Scissors,
  signature: Signature,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOOL_ICONS[name] ?? Wrench;
  return <Icon aria-hidden className={className} />;
}
