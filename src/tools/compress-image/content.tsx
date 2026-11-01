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
              Select <Strong>Compress</Strong>, then drag the divider over the image to compare
              before and after.
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
                "Same as input keeps each image’s format. WebP and AVIF are usually much smaller than JPG at the same quality; AVIF is the smallest but slowest to create. PNG is lossless.",
            },
            {
              term: "Quality",
              description:
                "0–100 for JPG, WebP and AVIF (default 75). Not used for PNG, which is optimized without changing a pixel.",
            },
            {
              term: "Longest side",
              description:
                "Scales large images down so their longest side fits, keeping the proportions. Images that are already smaller are not enlarged.",
            },
            {
              term: "Remove metadata",
              description:
                "On by default: the compressed images carry no location, camera or date details. Turn it off to keep them (JPG to JPG only).",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Smaller files, same look">
        <Paragraph>
          Lossy formats store what the eye notices and drop fine detail it doesn’t; the Quality
          setting decides how much. Photos taken sideways are turned upright, so they look right in
          every app. If an image is already well optimized and compressing it again would make the
          file bigger, the original is kept and the list says so.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            { term: "Input", description: "JPG, PNG, WebP and AVIF." },
            { term: "Size", description: "Up to 100 MB per image and 50 images at a time." },
            {
              term: "Output",
              description:
                "Named after the original with -compressed added, e.g. photo-compressed.jpg; several images also as one ZIP.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“Already well optimized, original kept.”</Strong> The image was compressed
              well already. Lower the quality, choose WebP or AVIF, or reduce the longest side.
            </>,
            <>
              <Strong>AVIF takes a long time.</Strong> AVIF encoding is slow, especially on phones
              and for large photos. Use WebP for nearly the same saving in a fraction of the time.
            </>,
            <>
              <Strong>“… is … megapixels. The limit on this device is …”</Strong> Very large images
              need more memory than the browser allows here. Use a desktop browser or a smaller
              image.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
