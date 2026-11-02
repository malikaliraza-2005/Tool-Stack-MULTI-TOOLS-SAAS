/** "2026-11-02" → "November 2, 2026" (fixed locale and zone: pages render at build time). */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
