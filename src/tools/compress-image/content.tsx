import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

/** Supporting content for Compress Image (no heavy imports: rendered at build time). */
export default function CompressImageContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to compress images">
        <Steps
          items={[
            <>
              Select <Strong>Choose files</Strong> or drop your images on the page.
            </>,
            <>
              Pick the <Strong>Format</Strong> and <Strong>Quality</Strong>; optionally limit the{" "}
              <Strong>Longest side</Strong>.
            </>,
            <>
              Select <Strong>Compress image</Strong>, then drag the divider over the image to
              compare before and after (or focus it and use the arrow keys).
            </>,
            <>Download each image, or all of them as one ZIP file.</>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Format",
              description:
                "“Same as input” keeps each image’s format. WebP and AVIF usually give smaller files than JPG for a similar look; AVIF is the smallest but slowest to create. PNG is lossless.",
            },
            {
              term: "Quality",
              description:
                "0–100 for JPG, WebP and AVIF (default 75). Not used for PNG, which is optimized without changing a pixel.",
            },
            {
              term: "Longest side",
              description:
                "“Keep the size” by default, or 3840, 2560, 1920, 1280 or 1024 px. Scales larger images down so their longest side fits, keeping the proportions; images that are already smaller are not enlarged.",
            },
            {
              term: "Remove metadata",
              description:
                "On by default: the compressed images carry no location, camera or date details. Turn it off to keep them; this works only when a JPG stays a JPG, and other images are saved without them.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Smaller files, same look">
        <Paragraph>
          Lossy formats store what the eye notices and drop fine detail it doesn’t; the Quality
          setting decides how much. Photos taken sideways are turned upright, so they look right in
          every app. If compressing would not make an image smaller, and its size wasn’t reduced
          with Longest side, the original is kept in its own format and the list says so.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            { term: "Input", description: "JPG, PNG, WebP and AVIF." },
            {
              term: "Size",
              description:
                "Up to 100 MB per image and 50 images at a time, and up to 120 megapixels per image (50 on phones and tablets).",
            },
            {
              term: "Output",
              description:
                "Named after the original with -compressed added, e.g. photo-compressed.jpg; several images also as one ZIP, images-compressed.zip.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“Already well optimized, original kept.”</Strong> The result wasn’t smaller,
              so you get the original, even if you chose another format. With Remove metadata on,
              its metadata is still removed (AVIF originals are returned unchanged). For a smaller
              file, lower the quality, choose WebP or AVIF, or reduce the longest side.
            </>,
            <>
              <Strong>AVIF takes a long time.</Strong> AVIF encoding is slow: about 30 seconds per
              12-megapixel photo on a fast computer, and longer on a phone. WebP is about six times
              faster and usually still much smaller than JPG.
            </>,
            <>
              <Strong>“The limit on this device is … megapixels.”</Strong> Very large images need
              more memory than the browser can safely use here. Use a desktop browser or a smaller
              image.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
