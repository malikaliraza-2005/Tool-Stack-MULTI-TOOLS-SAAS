import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Section>
      <Container size="content" className="flex flex-col items-start gap-4">
        <h1 className="text-h1 text-fg">Page not found</h1>
        <p className="text-body-lg text-fg-muted">
          This page doesn’t exist or hasn’t been built yet. Check the address, or start from the
          homepage.
        </p>
        <Link href="/" className={buttonClasses({ variant: "primary" })}>
          Go to the homepage
        </Link>
      </Container>
    </Section>
  );
}
