import {
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
  TextLink,
} from "@/components/tool/content";

/** Supporting content for Convert Image (no heavy imports: rendered at build time). */
export default function ConvertImageContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to convert images">
        <Steps
          items={[
            <>
              Select <Strong>Choose files</Strong> or drop your images on the page, for example HEIC
              photos from an iPhone.
            </>,
            <>
              Choose what to <Strong>Convert to</Strong>. Auto makes JPG, or PNG for images with
              transparency.
            </>,
            <>
              Select <Strong>Convert</Strong>, then download each image or all of them as one ZIP
              file.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Convert to",
              description:
                "JPG opens everywhere. PNG is lossless and keeps transparency. WebP and AVIF are smaller and keep transparency too; AVIF is the smallest but slowest to create.",
            },
            {
              term: "Quality",
              description: "For JPG, WebP and AVIF: 85 by default, which looks like the original.",
            },
            {
              term: "Background",
              description:
                "JPG can’t store transparency, so transparent areas are filled with white, black or a colour you pick.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What changes when you convert">
        <Paragraph>
          The image is decoded and saved again in the new format. Photos taken sideways are turned
          upright, so they look right in every app. Animated GIFs and WebPs are converted from their
          first frame. Converted files carry no location, camera or date details.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Input",
              description: "JPG, PNG, WebP, AVIF, GIF (first frame), BMP and HEIC/HEIF.",
            },
            { term: "Output", description: "JPG, PNG, WebP or AVIF, with the original name." },
            { term: "Size", description: "Up to 100 MB per image and 50 images at a time." },
            {
              term: "HEIC",
              description: (
                <>
                  Safari opens HEIC itself. In other browsers, HEIC photos are decoded with libheif,
                  open-source software licensed under the LGPL-3.0, loaded only when you add a HEIC
                  file. Its license and source code are on the{" "}
                  <TextLink href="/licenses#libheif">licenses page</TextLink>.
                </>
              ),
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is a HEIC photo that couldn’t be opened.”</Strong> The file may be damaged,
              or the decoder didn’t load (for example on a very slow connection). Try again, or
              export the photo as JPG from your phone.
            </>,
            <>
              <Strong>“Animated image: only the first frame is converted.”</Strong> Still formats
              hold one picture, so only the first frame is kept.
            </>,
            <>
              <Strong>AVIF takes a long time.</Strong> AVIF encoding is slow, especially on phones.
              WebP gives nearly the same saving much faster.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
