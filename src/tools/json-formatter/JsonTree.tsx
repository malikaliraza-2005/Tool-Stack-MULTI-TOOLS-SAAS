"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";
import type { TreeNode } from "./logic";

// Mirrors jsonPath() in logic.ts; duplicated so the tree does not pull the
// parser into the page bundle.
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
function pathOf(segments: readonly (string | number)[]): string {
  let path = "$";
  for (const segment of segments) {
    if (typeof segment === "number") path += `[${segment}]`;
    else if (IDENTIFIER.test(segment)) path += `.${segment}`;
    else path += `[${JSON.stringify(segment)}]`;
  }
  return path;
}

type Row = {
  node: TreeNode;
  path: string;
  depth: number;
  /** Position among siblings, for aria-posinset/setsize. */
  position: number;
  siblings: number;
};

const ROW_HEIGHT = 28;
const ROOT = "$";

function flatten(root: TreeNode, expanded: ReadonlySet<string>): Row[] {
  const rows: Row[] = [];
  const visit = (
    node: TreeNode,
    segments: (string | number)[],
    depth: number,
    position: number,
    siblings: number,
  ) => {
    const path = pathOf(segments);
    rows.push({ node, path, depth, position, siblings });
    if (!node.children || !expanded.has(path)) return;
    node.children.forEach((child, index) =>
      visit(child, [...segments, child.key ?? index], depth + 1, index + 1, node.children!.length),
    );
  };
  visit(root, [], 0, 1, 1);
  return rows;
}

function allContainers(root: TreeNode): Set<string> {
  const paths = new Set<string>();
  const visit = (node: TreeNode, segments: (string | number)[]) => {
    if (!node.children) return;
    paths.add(pathOf(segments));
    node.children.forEach((child, index) => visit(child, [...segments, child.key ?? index]));
  };
  visit(root, []);
  return paths;
}

const VALUE_COLOR: Record<TreeNode["type"], string> = {
  string: "text-success",
  number: "text-info",
  boolean: "text-warning",
  null: "text-warning",
  object: "text-fg-muted",
  array: "text-fg-muted",
};

function summary(node: TreeNode): string {
  const count = node.children?.length ?? 0;
  if (node.type === "object") return `{…} ${count} ${count === 1 ? "key" : "keys"}`;
  if (node.type === "array") return `[…] ${count} ${count === 1 ? "item" : "items"}`;
  return node.raw ?? "";
}

/**
 * Tree view (tool-specifications §5.1): virtualized rows, expand/collapse
 * all, copy path. Keyboard: one tab stop; ↑/↓ move, → expands or enters,
 * ← collapses or goes to the parent, Home/End, Enter or Space toggles.
 */
export function JsonTree({ root }: { root: TreeNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT]));
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const treeId = useId();

  const rows = useMemo(() => flatten(root, expanded), [root, expanded]);
  const activeIndex = Math.min(active, rows.length - 1);
  const activeRow = rows[activeIndex];

  // TanStack Virtual re-renders on scroll by design; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  function toggle(path: string, open?: boolean) {
    setExpanded((current) => {
      const next = new Set(current);
      const shouldOpen = open ?? !next.has(path);
      if (shouldOpen) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  function focusRow(index: number) {
    const clamped = Math.max(0, Math.min(index, rows.length - 1));
    setActive(clamped);
    virtualizer.scrollToIndex(clamped, { align: "auto" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const row = activeRow;
    if (!row) return;
    const isOpen = expanded.has(row.path);
    const handled = (() => {
      switch (event.key) {
        case "ArrowDown":
          focusRow(activeIndex + 1);
          return true;
        case "ArrowUp":
          focusRow(activeIndex - 1);
          return true;
        case "Home":
          focusRow(0);
          return true;
        case "End":
          focusRow(rows.length - 1);
          return true;
        case "ArrowRight":
          if (row.node.children?.length) {
            if (!isOpen) toggle(row.path, true);
            else focusRow(activeIndex + 1);
          }
          return true;
        case "ArrowLeft":
          if (row.node.children && isOpen) toggle(row.path, false);
          else {
            const parent = rows
              .slice(0, activeIndex)
              .findLastIndex((r) => r.depth === row.depth - 1);
            if (parent >= 0) focusRow(parent);
          }
          return true;
        case "Enter":
        case " ":
          if (row.node.children?.length) toggle(row.path);
          return true;
        default:
          return false;
      }
    })();
    if (handled) event.preventDefault();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <Button variant="ghost" size="sm" onClick={() => setExpanded(allContainers(root))}>
          <ChevronsUpDown aria-hidden />
          Expand all
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(new Set([ROOT]));
            setActive(0);
          }}
        >
          <ChevronsDownUp aria-hidden />
          Collapse all
        </Button>
        <CopyButton
          label="Copy path"
          value={() => activeRow?.path ?? ROOT}
          variant="ghost"
          size="sm"
          className="ml-auto"
        />
        <span className="max-w-full truncate font-mono text-small text-fg-muted" data-active-path>
          {activeRow?.path}
        </span>
      </div>
      <div
        ref={scroller}
        role="tree"
        aria-label="JSON tree"
        tabIndex={0}
        aria-activedescendant={activeRow ? `${treeId}-${activeIndex}` : undefined}
        onKeyDown={onKeyDown}
        className="group/tree min-h-0 grow overflow-auto py-1"
      >
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            if (!row) return null;
            const { node } = row;
            const expandable = Boolean(node.children?.length);
            const isOpen = expandable && expanded.has(row.path);
            const selected = item.index === activeIndex;
            return (
              <div
                key={row.path}
                id={`${treeId}-${item.index}`}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-posinset={row.position}
                aria-setsize={row.siblings}
                aria-expanded={expandable ? isOpen : undefined}
                aria-selected={selected}
                onClick={() => {
                  setActive(item.index);
                  if (expandable) toggle(row.path);
                }}
                className={cn(
                  "absolute inset-x-0 top-0 flex h-7 cursor-default items-center gap-1 pr-3 font-mono text-code whitespace-nowrap",
                  selected
                    ? "bg-surface-2 group-focus-visible/tree:bg-accent-soft"
                    : "hover:bg-surface-2",
                )}
                style={{
                  transform: `translateY(${item.start}px)`,
                  paddingLeft: `calc(var(--spacing) * ${2 + row.depth * 4})`,
                }}
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 text-fg-subtle transition-control",
                    !expandable && "invisible",
                    isOpen && "rotate-90",
                  )}
                />
                {node.key !== undefined && (
                  <span>
                    <span
                      className={
                        typeof node.key === "number" ? "text-fg-muted" : "text-accent-text"
                      }
                    >
                      {typeof node.key === "number" ? node.key : JSON.stringify(node.key)}
                    </span>
                    <span className="text-fg-muted">:</span>
                  </span>
                )}
                {node.key === undefined && <span className="text-fg-muted">root</span>}
                <span className={cn("ml-1 truncate", VALUE_COLOR[node.type])}>{summary(node)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
