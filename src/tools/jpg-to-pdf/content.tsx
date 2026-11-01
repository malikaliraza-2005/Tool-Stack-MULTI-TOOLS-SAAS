import {
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
  TextLink,
} from "@/components/tool/content";

/** Supporting content for JPG to PDF (no heavy imports: rendered at build time). */
export default function JpgToPdfContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to convert images to PDF">
        <Steps
          items={[
            <>
              Select <Strong>Choose files</Strong> or drop your images on the page. Each image
              becomes one page.
            </>,
            <>Put them in order: drag an image by its handle, or use its arrow buttons.</>,
            <>
              Choose the <Strong>Page size</Strong> (Fit to image, A4 or Letter), the orientation
              and a margin.
            </>,
            <>
              Select <Strong>Convert to PDF</Strong> and download the result.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Fit to image",
              description:
                "Each page is exactly the size of its image (at 96 pixels per inch), plus the margin.",
            },
            {
              term: "A4 and Letter",
              description:
                "Each image is scaled to fit the page within the margin and centred. Auto orientation turns the page to match the image.",
            },
            {
              term: "Margin",
              description: "None, small (12 pt, about 4 mm) or large (36 pt, about 13 mm).",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Image quality">
        <Paragraph>
          JPG and PNG images are placed in the PDF exactly as they are, without re-compressing, so
          there is no quality loss and transparent PNGs stay transparent. Phone photos that were
          taken sideways are turned upright using their orientation tag, again without re-encoding.
          WebP, GIF (first frame), BMP, AVIF and HEIC are converted once: to PNG when they have
          transparency, otherwise to high-quality JPEG.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            { term: "Input", description: "JPG, PNG, WebP, GIF, BMP, AVIF and HEIC/HEIF." },
            {
              term: "HEIC",
              description: (
                <>
                  Safari opens HEIC itself. In other browsers, HEIC photos are decoded with libheif,
                  open-source software licensed under the LGPL-3.0, loaded only when needed. Its
                  license and source code are on the{" "}
                  <TextLink href="/licenses#libheif">licenses page</TextLink>.
                </>
              ),
            },
            { term: "Size", description: "Up to 100 MB per image and 100 images (50 on phones)." },
            {
              term: "Output",
              description: "One PDF, named after the image, or images.pdf for several.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is a HEIC photo that couldn’t be opened.”</Strong> The file may be damaged,
              or the decoder didn’t load. Try again, or set your iPhone to save photos as JPG
              (Settings › Camera › Formats › Most Compatible).
            </>,
            <>
              <Strong>“… couldn’t be read.”</Strong> The image is damaged or incomplete. Open it in
              an image viewer and save it again.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
