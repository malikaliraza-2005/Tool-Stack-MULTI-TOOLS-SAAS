import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

/** Supporting content for Remove EXIF Data (no heavy imports: rendered at build time). */
export default function RemoveExifDataContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to remove EXIF data from photos">
        <Steps
          items={[
            <>
              Select <Strong>Choose files</Strong> or drop your photos on the page.
            </>,
            <>
              Check what each photo contains. The location comes first, as text coordinates; select
              the eye button next to a photo to see its details.
            </>,
            <>
              Choose <Strong>What to remove</Strong>, then select <Strong>Remove metadata</Strong>.
            </>,
            <>Download each cleaned photo, or all of them as one ZIP file.</>,
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="What gets removed">
        <Paragraph>
          Photos carry details you can’t see: the GPS position where they were taken, the date and
          time, the phone or camera model and sometimes its serial number, the editing software, and
          comments or captions. Sharing the original file shares all of it. This tool removes those
          blocks from the file and copies the image data byte for byte, so the photo looks exactly
          the same and loses no quality.
        </Paragraph>
        <Facts
          items={[
            {
              term: "JPG",
              description:
                "EXIF (with GPS), XMP, IPTC, comments, embedded thumbnails, camera-specific blocks and any data stored after the end of the image.",
            },
            {
              term: "PNG",
              description: "eXIf and text chunks (tEXt, iTXt, zTXt) and the last-modified time.",
            },
            { term: "WebP", description: "The EXIF and XMP chunks." },
            {
              term: "Kept",
              description:
                "The color profile and the image data, so colors and sharpness don’t change.",
            },
            {
              term: "Orientation",
              description:
                "Kept by default, so photos taken sideways still appear the right way up. “Everything, including orientation” drops it too: sideways photos are then saved again, upright, at quality 95 (JPG and WebP) or losslessly (PNG), with no metadata at all; other photos are cleaned without re-saving.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            { term: "Input", description: "JPG, PNG and WebP photos. HEIC is not supported yet." },
            {
              term: "Size",
              description:
                "Up to 100 MB per photo and 50 photos at a time. Photos over 120 megapixels (50 on phones and tablets) can’t be added.",
            },
            {
              term: "Output",
              description:
                "Same format and name with -no-metadata added, e.g. IMG_1234-no-metadata.jpg; several photos also as one ZIP, photos-no-metadata.zip.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“… is a HEIC image.”</Strong> Convert it to JPG first with Convert Image, or
              set your iPhone to save photos as JPG (Settings › Camera › Formats › Most Compatible).
            </>,
            <>
              <Strong>“… couldn’t be read. It may be damaged or incomplete.”</Strong> The file’s
              structure is broken, for example from an interrupted download. Open it in an image
              viewer and save it again, then try that copy.
            </>,
            <>
              <Strong>The photo still shows a location in my gallery app.</Strong> Some apps keep
              their own record of where a photo was taken. The downloaded file itself no longer
              contains it; check it again here to be sure.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
