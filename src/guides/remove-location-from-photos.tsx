import {
  ContentSection,
  List,
  Paragraph,
  Steps,
  Strong,
  TextLink,
} from "@/components/tool/content";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "remove-location-from-photos",
  title: "How to Remove Location Data from Photos | QuietBench",
  description:
    "Photos can record exactly where they were taken. How to check a photo for location data and remove it on iPhone, Android or a computer before you share it.",
  h1: "How to remove location data from photos",
  summary:
    "Most phones store the place a photo was taken inside the file. Here is how to check for it and remove it on iPhone, Android and computers.",
  author: "Ali Raza",
  published: "2026-11-02",
  updated: "2026-11-02",
  tools: ["remove-exif-data", "convert-image"],
  sources: [
    {
      title: "Manage location metadata in Photos (Personal Safety User Guide)",
      publisher: "Apple",
      url: "https://support.apple.com/guide/personal-safety/manage-location-metadata-in-photos-ips0d7a5df82/web",
    },
    {
      title: "Change your Camera app settings",
      publisher: "Google Pixel Camera Help",
      url: "https://support.google.com/pixelcamera/answer/2838995",
    },
    {
      title: "Understand, find & edit your photos’ locations",
      publisher: "Google Photos Help",
      url: "https://support.google.com/photos/answer/6153599",
    },
  ],
};

export default function RemoveLocationFromPhotos() {
  return (
    <>
      <ContentSection id="why" title="Why photos contain a location">
        <Paragraph>
          When location access is on for the camera, your phone writes the GPS coordinates of each
          photo into the file, in a block of metadata called EXIF, next to the date, time and phone
          model. You don’t see it in the picture, but anyone who receives the original file can read
          it and put it on a map.
        </Paragraph>
        <Paragraph>
          Whether the location travels with a photo depends on how you share it. Some apps remove
          it, but sending the original file, for example by email, as a document attachment or
          through a cloud link, usually keeps it. Removing it yourself is the only way to be sure.
        </Paragraph>
      </ContentSection>

      <ContentSection id="check" title="Check whether a photo has a location">
        <Paragraph>
          Open the photo in <TextLink href="/remove-exif-data">Remove EXIF Data</TextLink>. Before
          anything is removed, it lists what each photo contains, with the location first, as
          coordinates. The photo is read in your browser and never uploaded, so this is safe to do
          with private pictures.
        </Paragraph>
      </ContentSection>

      <ContentSection id="iphone" title="On iPhone or iPad">
        <Paragraph>
          <Strong>Share a photo without its location</Strong> (from Apple’s Personal Safety guide):
        </Paragraph>
        <Steps
          items={[
            "In Photos, select the photo or photos and tap the Share button.",
            <>
              Tap <Strong>Options</Strong>, then turn off <Strong>Location</Strong>. “Location Not
              Included” appears above the Options button.
            </>,
            "Share the photos with any of the methods in the Share Sheet.",
          ]}
        />
        <Paragraph>
          <Strong>Remove the location from a photo in your library:</Strong> open the photo, tap the
          More button, then <Strong>Adjust Info</Strong> › <Strong>Adjust Location</Strong> ›{" "}
          <Strong>No Location</Strong>.
        </Paragraph>
        <Paragraph>
          <Strong>Stop the camera from saving locations:</Strong> go to Settings › Privacy &amp;
          Security › Location Services › Camera, and choose <Strong>Never</Strong>.
        </Paragraph>
      </ContentSection>

      <ContentSection id="android" title="On Android">
        <Paragraph>
          <Strong>Stop the camera from saving locations</Strong> on a Pixel phone: open the Camera
          app, tap <Strong>Settings</Strong> at the bottom left, then <Strong>More settings</Strong>
          , and turn off <Strong>Save location</Strong>. Other phone makers have a similar switch in
          their camera app’s settings; its name varies.
        </Paragraph>
        <Paragraph>
          <Strong>Photos you have already taken</Strong> are harder. Google Photos lets you change
          or remove a location you added or one it estimated, but according to Google’s help page, a
          location added automatically by your camera can’t be removed there. To remove it from the
          file itself, use the steps for computers below; they work in a phone’s browser too.
        </Paragraph>
      </ContentSection>

      <ContentSection id="computer" title="On a computer, or for many photos at once">
        <Steps
          items={[
            <>
              Open <TextLink href="/remove-exif-data">Remove EXIF Data</TextLink> and drop your
              photos on the page (JPG, PNG or WebP, up to 50 at a time).
            </>,
            <>
              Under <Strong>What to remove</Strong>, keep{" "}
              <Strong>All metadata, keep orientation (recommended)</Strong>. It removes the
              location, dates, camera details and comments, and keeps the setting that shows
              sideways photos the right way up.
            </>,
            <>
              Select <Strong>Remove metadata</Strong> and download the cleaned photos, one by one or
              as a ZIP file.
            </>,
            "Share the downloaded copies, not the originals.",
          ]}
        />
        <Paragraph>
          The image itself is copied byte for byte, so the cleaned photo looks exactly the same and
          loses no quality. iPhone photos in HEIC format need converting first: open them in{" "}
          <TextLink href="/convert-image">Convert Image</TextLink>, which also drops the location
          when it saves the JPG.
        </Paragraph>
        <Paragraph>
          On a Mac, the Photos app can hide a location (Image › Location › Hide Location), but that
          changes what Photos shows. Check an exported copy with Remove EXIF Data before you share
          it.
        </Paragraph>
      </ContentSection>

      <ContentSection id="other" title="What else a photo can reveal">
        <List
          items={[
            "The date and time it was taken, often to the second.",
            "The phone or camera model, and with some cameras its serial number.",
            "The software used to edit it, and any captions or comments.",
            "A small embedded preview (thumbnail) of the picture.",
          ]}
        />
        <Paragraph>
          Removing all metadata, as above, takes these out too. Things visible in the picture, such
          as a street sign or a window view, stay: only cropping or editing the image changes those.
        </Paragraph>
      </ContentSection>
    </>
  );
}
