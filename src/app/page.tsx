import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { SITE_NAME } from "@/config/site";
import { publishedTools } from "@/tools/registry";

// Placeholder until the homepage is built (Phase 7). Lists the published
// tools from the registry, so each new tool is reachable as soon as it ships.
export default function Home() {
  return (
    <Section>
      <Container className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-display text-fg">{SITE_NAME}</h1>
          <p className="max-w-prose text-body-lg text-fg-muted">
            Private, browser-based tools. More coming soon.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publishedTools().map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/${tool.slug}`}
                className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 shadow-1 transition-control hover:border-border-strong hover:bg-surface-2"
              >
                <span className="text-ui text-fg">{tool.name}</span>
                <span className="text-small text-fg-muted">{tool.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
