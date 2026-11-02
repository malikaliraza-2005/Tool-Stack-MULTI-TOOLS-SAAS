import { ContentSection, Facts, List, Paragraph, Steps, Strong } from "@/components/tool/content";

/** Supporting content for Resize Image (no heavy imports: rendered at build time). */
export default function ResizeImageContent() {
  return (
    <>
      <ContentSection id="how-to" title="How to resize or crop images">
        <Steps
          items={[
            <>
              Select <Strong>Choose files</Strong> or drop your images on the page.
            </>,
            <>
              Choose the <Strong>Mode</Strong>. <Strong>Resize:</Strong> pick a preset, or enter a
              width and height in pixels or a percentage. <Strong>Crop:</Strong> choose an aspect
              ratio and drag the crop area.
            </>,
            <>
              Select <Strong>Resize image</Strong> or <Strong>Crop image</Strong>, then download
              each image or all of them as one ZIP file.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Preset",
              description:
                "“Custom size” (1920 px wide by default), 3840, 1920 or 1280 wide, or 1080 × 1080 square post, 1080 × 1350 portrait post, 1080 × 1920 story, 1200 × 630 link preview and 1500 × 500 header banner.",
            },
            {
              term: "Keep proportions",
              description:
                "On by default: one side is enough, the other follows (rounded to the nearest pixel). With both sides set, “Fit inside” keeps the whole image within the box; “Fill and crop” fills it exactly, trimming the edges evenly. Presets with both sides start on Fill and crop. With Keep proportions off, images are stretched to exactly the size entered.",
            },
            {
              term: "Percentage",
              description: "From 1% to 400%; 50% by default.",
            },
            {
              term: "Don’t enlarge",
              description:
                "On by default: images are never scaled up, because enlarging only makes them blurry. An image smaller than the target keeps its size (with Fill and crop, it is still trimmed to the shape).",
            },
            {
              term: "Crop",
              description:
                "Free or a fixed aspect ratio (1:1, 4:3, 16:9, 3:2, 9:16). Drag the area or its corners; with the keyboard, arrow keys move it, Shift + arrow keys resize it, and Alt makes the steps bigger. Each image can be cropped separately: select the eye button next to it in the list. Cropping doesn’t scale the image.",
            },
            {
              term: "Format and quality",
              description:
                "“Same as input” by default, or JPG, PNG, WebP or AVIF. JPG, WebP and AVIF are saved at quality 85 unless you change it. Transparent areas turn white in JPG.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Sharp results">
        <Paragraph>
          Images are scaled with Lanczos resampling, a high-quality method common in photo editors,
          so downsized images stay crisp. Photos taken sideways are turned upright first, so widths,
          heights and crops apply to the photo as you see it. The saved images carry no location,
          camera or date details.
        </Paragraph>
      </ContentSection>

      <ContentSection id="formats" title="Formats and limits">
        <Facts
          items={[
            {
              term: "Input",
              description:
                "JPG, PNG, WebP and AVIF. For an animated PNG or WebP, only the first frame is used.",
            },
            {
              term: "Size",
              description:
                "Up to 100 MB per image and 50 images at a time, and up to 120 megapixels per image (50 on phones and tablets).",
            },
            {
              term: "Output",
              description:
                "Named after the original with -resized or -cropped added, e.g. photo-resized.jpg; several images also as one ZIP.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“(not enlarged)”</Strong> after the sizes. The image is already smaller than
              the size you asked for. Turn off Don’t enlarge to scale it up anyway.
            </>,
            <>
              <Strong>The result has a different shape than the size you entered.</Strong> With Fit
              inside, the whole image is kept, so one side can come out shorter. Choose Fill and
              crop for the exact size.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
