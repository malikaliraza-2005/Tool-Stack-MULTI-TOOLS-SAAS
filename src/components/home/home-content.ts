// Homepage copy (page-seo-specs §4.1). Kept out of page.tsx so the metadata,
// JSON-LD and uniqueness tests can import it without the page's components.

import type { ToolFaq } from "@/tools/types";

export const HOME_SEO = {
  title: "OfflineBench: Private PDF, Image and Developer Tools, No Upload",
  description:
    "Free online PDF, image and developer tools that run in your browser. Files and text never leave your device. No sign-up, no daily limits.",
};

export const HOME_FAQS: ToolFaq[] = [
  {
    q: "Are my files uploaded?",
    a: "No. Every tool runs in your browser, on your device. The site’s security policy stops the page from sending data to any other server, and you can check it in your browser’s developer tools (Network tab).",
  },
  {
    q: "What can I drop or paste on this page?",
    a: "PDFs, images (JPG, PNG, WebP, AVIF, HEIC, GIF, BMP), JSON and text files, or any file to hash. Pasted text such as a JWT, JSON, a Unix timestamp, a URL or Base64 opens the matching tool with the text filled in.",
  },
  {
    q: "Is OfflineBench free?",
    a: "Yes. Every tool is free to use, with no account, no sign-up and no watermarks.",
  },
  {
    q: "Does OfflineBench work offline?",
    a: "Yes. After your first visit, every page opens without a connection. A tool’s larger parts, such as the PDF and image engines, are saved the first time you use it, so it works offline from then on. In Chrome and Edge you can also install OfflineBench as an app: open search (Ctrl+K) and choose “Install OfflineBench as an app”.",
  },
  {
    q: "Which browsers does OfflineBench work in?",
    a: "Current versions of Chrome, Edge, Firefox and Safari, on computers and phones. Very large files work best on a computer, because phones have less memory.",
  },
];
