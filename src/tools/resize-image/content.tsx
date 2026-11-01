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
              <Strong>Resize:</Strong> pick a preset, or enter a width and height in pixels or a
              percentage. <Strong>Crop:</Strong> choose an aspect ratio and drag the crop area.
            </>,
            <>
              Select <Strong>Resize</Strong> or <Strong>Crop</Strong>, then download each image or
              all of them as one ZIP file.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="options" title="Options">
        <Facts
          items={[
            {
              term: "Keep proportions",
              description:
                "On by default: one side is enough, the other follows (rounded to the nearest pixel). With both sides set, Fit inside keeps the whole image within the box; Fill and crop fills it exactly, trimming the edges evenly.",
            },
            {
              term: "Don’t enlarge",
              description:
                "On by default: images already smaller than the target keep their size, because enlarging only makes them blurry.",
            },
            {
              term: "Crop",
              description:
                "Free or fixed aspect ratio (1:1, 4:3, 16:9, 3:2, 9:16). Drag the area or its corners; with the keyboard, arrow keys move it and Shift + arrow keys resize it. Each image can be cropped separately: select it in the list.",
            },
            {
              term: "Format and quality",
              description:
                "Same as input by default. JPG, WebP and AVIF are saved at quality 85 unless you change it.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="explanation" title="Sharp results">
        <Paragraph>
          Images are scaled with Lanczos resampling, the same high-quality method used by photo
          editors, so downsized images stay crisp. Photos taken sideways are turned upright first,
          so widths, heights and crops apply to the photo as you see it.
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
                "Named after the original with -resized or -cropped added; several images also as one ZIP.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="troubleshooting" title="Troubleshooting">
        <List
          items={[
            <>
              <Strong>“(not enlarged)”.</Strong> The image is already smaller than the size you
              asked for. Turn off Don’t enlarge to scale it up anyway.
            </>,
            <>
              <Strong>The result has a different shape than the preset.</Strong> With Fit inside,
              the whole image is kept. Choose Fill and crop for the exact size.
            </>,
          ]}
        />
      </ContentSection>
    </>
  );
}
