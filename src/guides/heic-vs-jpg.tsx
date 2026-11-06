import {
  ContentSection,
  Facts,
  List,
  Paragraph,
  Steps,
  Strong,
  TextLink,
} from "@/components/tool/content";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "heic-vs-jpg",
  title: "HEIC vs JPG: What’s the Difference, How to Convert | KeptLocal",
  description:
    "Why iPhones save photos as HEIC, where HEIC files don’t open, how to make an iPhone save JPG instead, and how to convert HEIC to JPG without uploading.",
  h1: "HEIC vs JPG: what’s the difference, and how do you convert?",
  summary:
    "iPhones save photos as HEIC to use less space, but many websites and browsers can’t open them. Here is what that means and how to get a JPG.",
  author: "Ali Raza",
  published: "2026-11-02",
  updated: "2026-11-02",
  tools: ["convert-image", "compress-image", "jpg-to-pdf"],
  sources: [
    {
      title: "Using HEIF or HEVC media on Apple devices",
      publisher: "Apple",
      url: "https://support.apple.com/en-us/116944",
    },
    {
      title: "HEIF/HEIC image format: browser support",
      publisher: "Can I use",
      url: "https://caniuse.com/heif",
    },
  ],
};

export default function HeicVsJpg() {
  return (
    <>
      <ContentSection id="what" title="What HEIC is">
        <Paragraph>
          HEIC files use HEIF, the High Efficiency Image File Format. Since iOS 11, iPhones from the
          iPhone 7 onward can save photos in it, with the camera’s High Efficiency setting. Apple’s
          reason is size: HEIF offers better compression than JPEG, so the same photo takes less
          storage.
        </Paragraph>
        <Paragraph>
          JPG (JPEG) is the format almost everything understands: every browser, operating system,
          upload form and photo printer.
        </Paragraph>
      </ContentSection>

      <ContentSection id="compare" title="HEIC and JPG compared">
        <Facts
          items={[
            {
              term: "File size",
              description:
                "HEIC is usually smaller for the same visible quality, which is why iPhones use it.",
            },
            {
              term: "Browsers",
              description:
                "Safari 17 and later (Mac, iPhone and iPad) display HEIC. Chrome, Edge and Firefox don’t, according to Can I use. JPG works in all of them.",
            },
            {
              term: "Upload forms",
              description:
                "Some websites accept only JPG and PNG, so a HEIC photo is rejected or shows as a broken image.",
            },
            {
              term: "Licensing",
              description:
                "HEIC is complex and expensive to license, which is a large part of why browsers other than Safari haven’t added it.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection id="iphone" title="Get JPG straight from your iPhone">
        <List
          items={[
            <>
              <Strong>Save new photos as JPG:</Strong> in Settings › Camera, tap{" "}
              <Strong>Formats</Strong>, then <Strong>Most Compatible</Strong>. Choose{" "}
              <Strong>High Efficiency</Strong> to go back to HEIF. Photos you already took stay
              HEIC.
            </>,
            <>
              <Strong>Transfers to a computer:</Strong> importing into Photos, Image Capture or a PC
              may convert photos to JPEG on the way. Apple’s <Strong>Keep Originals</Strong>{" "}
              setting, under Settings › Apps › Photos, turns that off.
            </>,
            <>
              <Strong>Sharing:</Strong> AirDrop, Messages and email may send a more compatible
              format, such as JPEG, when the receiving device doesn’t support HEIF. iCloud Photos
              keeps the original.
            </>,
          ]}
        />
      </ContentSection>

      <ContentSection id="convert" title="Convert HEIC to JPG without uploading">
        <Paragraph>
          For photos you already have, on any computer or phone browser, including Chrome and
          Windows:
        </Paragraph>
        <Steps
          items={[
            <>
              Open <TextLink href="/convert-image">Convert Image</TextLink> and drop your HEIC
              photos on the page, up to 50 at a time.
            </>,
            <>
              Leave <Strong>Convert to</Strong> on Auto, or choose JPG. Quality 85, the default, is
              a high setting where differences from the original are hard to see.
            </>,
            <>
              Select <Strong>Convert image</Strong>, then download the JPGs one by one or as a ZIP
              file.
            </>,
          ]}
        />
        <Paragraph>
          The photos are decoded in your browser, with its own HEIC support where it has one and the
          open-source libheif decoder otherwise, and never leave your device. Converted files carry
          no location, camera or date details, which is worth knowing before you share them.
        </Paragraph>
      </ContentSection>

      <ContentSection id="which" title="Which should you keep?">
        <Paragraph>
          Keep HEIC on your phone if storage matters: it holds the same picture in less space, and
          current Apple devices open it. Convert copies to JPG when you need to upload, email or
          print them, or open them on a device without HEIC support. If the JPG is too large for an
          upload form, <TextLink href="/compress-image">Compress Image</TextLink> makes it smaller;
          to send several photos as one document, use{" "}
          <TextLink href="/jpg-to-pdf">JPG to PDF</TextLink>.
        </Paragraph>
      </ContentSection>
    </>
  );
}
