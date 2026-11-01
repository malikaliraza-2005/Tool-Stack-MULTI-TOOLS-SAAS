import type { ToolDefinition } from "../types";

const MB = 2 ** 20;

export const meta: ToolDefinition = {
  slug: "sign-pdf",
  category: "pdf",
  status: "live",
  name: "Fill & Sign PDF",
  tagline:
    "Fill in PDF forms and add your signature, text, dates and checkmarks, right in your browser. Nothing is uploaded.",
  icon: "signature",
  keywords: [
    "sign pdf",
    "fill pdf form",
    "add signature to pdf",
    "e-sign pdf",
    "pdf signature",
    "fill and sign",
    "sign document online",
  ],
  seo: {
    title: "Fill & Sign PDF: Sign and Fill Forms (No Upload) | Sprigkit",
    description:
      "Fill in PDF forms and add a drawn, typed or uploaded signature, text, dates and checkmarks. Your PDF stays on your device; nothing is uploaded.",
    h1: "Fill and sign a PDF",
    faqs: [
      {
        q: "How do I sign a PDF?",
        a: "Choose the PDF, select Add signature, then draw, type or upload your signature. Drag it into place on the page and resize it with the corner handle (or move it with the arrow keys), then save and download the signed PDF.",
      },
      {
        q: "Is this a legally valid signature?",
        a: "It adds a visual signature: an image of your signature on the page. It is not a certified digital signature with a certificate. Many people and businesses accept signatures like this, but check whether the recipient accepts electronic signatures.",
      },
      {
        q: "Can I fill in a PDF form?",
        a: "Yes, when the PDF has fillable fields (text boxes, checkboxes, radio buttons and dropdowns). They are listed beside the page; type or choose a value for each. XFA forms (made with Adobe LiveCycle) aren’t supported. For a PDF without fields, place text, dates and checkmarks anywhere on the page.",
      },
      {
        q: "Is my PDF or signature uploaded?",
        a: "No. Everything happens in your browser, on your device. Your signature is not saved unless you choose “Remember my signature on this device”, and you can delete it at any time.",
      },
      {
        q: "What does “Flatten” do?",
        a: "With Flatten on (the default), the filled-in fields become part of the page, so they can’t be changed by accident and look the same in every PDF reader. Turn it off to keep the form fields editable.",
      },
    ],
  },
  related: ["merge-pdf", "organize-pdf", "split-pdf", "jpg-to-pdf"],
  input: {
    kind: "files",
    accepts: { mime: ["application/pdf"], extensions: [".pdf"], multiple: false },
  },
  limits: {
    desktop: { softBytes: 100 * MB, hardBytes: 500 * MB, maxFiles: 1 },
    mobile: { softBytes: 50 * MB, hardBytes: 150 * MB, maxFiles: 1 },
  },
  // offline becomes true when the service worker ships (G-5, Phase 7).
  processing: { local: true, worker: true, offline: false },
  handoff: ["merge-pdf"],
  addedAt: "2026-11-01",
  updatedAt: "2026-11-01",
};
