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
              Choose the <Strong>Page size</Strong> (<Strong>Fit to image</Strong>,{" "}
              <Strong>A4</Strong> or <Strong>Letter</Strong>) and a <Strong>Margin</Strong>. For A4
              and Letter you can also set the <Strong>Orientation</Strong>.
            </>,
            <>
              Select <Strong>Convert to PDF</Strong> (with several images it reads, for example,{" "}
              <Strong>Convert 5 images to PDF</Strong>), then <Strong>Download PDF</Strong>.
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
                "The default. Each page is the size of its image at 96 pixels per inch, plus the margin. Very large images are scaled down to 200 inches on the longest side, the largest page PDF readers accept.",
            },
            {
              term: "A4 and Letter",
              description:
                "Each image is scaled up or down to fit inside the margin and centered on the page. Orientation Auto (the default) turns each page to match its image; Portrait or Landscape applies to every page.",
            },
            {
              term: "Margin",
              description:
                "No margin (the default), Small (12 pt, about 4 mm) or Large (36 pt, about 13 mm), on every side.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Image quality">
        <Paragraph>
          JPG images go into the PDF byte for byte, without re-compressing, so there is no quality
          loss. PNG images are stored losslessly, and transparent PNGs stay transparent. Phone
          photos that were taken sideways are turned upright using their orientation tag, again
          without re-encoding the JPG. WebP, GIF (first frame only), BMP, AVIF and HEIC are
          converted once: to PNG when they have transparency, otherwise to JPEG at quality 92 (on a
          scale to 100).
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
            {
              term: "Size",
              description: "Up to 100 MB per image. Images above 25 MB may be slow to convert.",
            },
            {
              term: "Number of images",
              description: "Up to 100 at a time on a computer, 50 on phones and tablets.",
            },
            {
              term: "Output",
              description:
                "One PDF, one page per image. It is named after the image (photo.jpg becomes photo.pdf), or images.pdf for several; you can change the File name before converting.",
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
            <>
              <Strong>“… isn’t a supported file” or “… is a PDF document.”</Strong> Only images can
              be added here. To combine PDF files, use{" "}
              <TextLink href="/merge-pdf">Merge PDF</TextLink> instead.
            </>,
            <>
              <Strong>“Your browser ran out of memory.”</Strong> Large photos take a lot of memory
              while the PDF is built. Convert fewer images at a time, or use a computer.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
