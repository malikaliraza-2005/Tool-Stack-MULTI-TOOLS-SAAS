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
              Choose what to <Strong>Convert to</Strong>. Auto, the default, makes JPG, or PNG for
              images with transparent areas.
            </>,
            <>
              Select <Strong>Convert image</Strong>, then download each image or all of them as one
              ZIP file.
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
                "JPG opens everywhere. PNG is lossless and keeps transparency. WebP and AVIF usually give smaller files and keep transparency too; AVIF is the smallest but slowest to create.",
            },
            {
              term: "Quality",
              description:
                "0–100 for JPG, WebP and AVIF, 85 by default: a high setting where differences from the original are hard to see. Not used for PNG.",
            },
            {
              term: "Background for transparent areas",
              description:
                "Shown when you choose JPG and an image may have transparent areas. JPG can’t store transparency, so they are filled with white (the default), black or a custom color.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What changes when you convert">
        <Paragraph>
          The image is decoded and saved again in the new format. Photos taken sideways are turned
          upright, so they look right in every app. Animated GIF, WebP and PNG images are converted
          from their first frame. Converted files carry no location, camera or date details.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Input",
              description: "JPG, PNG, WebP, AVIF, GIF (first frame), BMP and HEIC/HEIF.",
            },
            {
              term: "Output",
              description:
                "JPG, PNG, WebP or AVIF, with the original name and the new extension, e.g. IMG_1234.jpg. When the format doesn’t change, -converted is added. Several images also as one ZIP.",
            },
            {
              term: "Size",
              description:
                "Up to 100 MB per image and 50 images at a time, and up to 120 megapixels per image (50 on phones and tablets).",
            },
            {
              term: "HEIC",
              description: (
                <>
                  Safari opens HEIC itself. In other browsers, HEIC photos are decoded with libheif,
                  open-source software licensed under the LGPL-3.0, loaded only when a HEIC photo is
                  converted. Its license and source code are on the{" "}
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
              <Strong>“Animated image: only the first frame is converted”</Strong> next to a file.
              JPG, PNG, WebP and AVIF are saved here as still images, so the result holds one
              picture.
            </>,
            <>
              <Strong>AVIF takes a long time.</Strong> AVIF encoding is slow: about 30 seconds per
              12-megapixel photo on a fast computer, and longer on a phone. WebP is about six times
              faster.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
