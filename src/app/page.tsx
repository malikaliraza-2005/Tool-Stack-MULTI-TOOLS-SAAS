import { Container, Section } from "@/components/layout/Container";
import { SITE_NAME } from "@/config/site";

// Placeholder until the homepage is built (Phase 7).
export default function Home() {
  return (
    <Section>
      <Container className="flex flex-col gap-4">
        <h1 className="text-display text-fg">{SITE_NAME}</h1>
        <p className="max-w-prose text-body-lg text-fg-muted">
          Private, browser-based tools. Coming soon.
        </p>
      </Container>
    </Section>
  );
}
