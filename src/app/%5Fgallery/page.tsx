import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";
import { Container, Section } from "@/components/layout/Container";

// Component gallery for design review (P2-T17). The `%5F` folder prefix makes
// the URL `/_gallery` (a plain `_` folder is private in the App Router). Not
// linked anywhere, not in the sitemap, and never indexed.
export const metadata: Metadata = {
  title: "Component gallery",
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 text-fg">Component gallery</h1>
          <p className="max-w-prose text-body-lg text-fg-muted">
            Every component and state in both themes. Use the keyboard to check focus and the theme
            menu to check overlays in each theme.
          </p>
        </div>
        <Gallery />
      </Container>
    </Section>
  );
}
