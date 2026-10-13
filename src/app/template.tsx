import { ViewTransition } from "react";

/**
 * Page transition (P2-T10). A template re-mounts on every navigation, so the
 * old page runs its exit and the new page its enter animation (globals.css).
 * Navigations are React transitions, which start a View Transition where the
 * browser supports it; elsewhere the page swaps instantly.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
