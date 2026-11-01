// Third-party licenses (information-architecture: /licenses). Generated at
// build time from package.json and the notice files the packages ship.
// Phase 6 adds it early for the HEIC decoder (D-6: LGPL-3.0 notices, license
// texts and corresponding source) and the image codecs' BSD/IJG notices;
// Phase 8 completes it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container, Section } from "@/components/layout/Container";
import { TextLink } from "@/components/tool/content";
import { LIBHEIF_BASE, LIBHEIF_VERSION } from "@/lib/image/heic";

export const metadata: Metadata = {
  title: "Open-source licenses",
  description:
    "The open-source software Sprigkit is built with, its licenses and notices, and the source code of the LGPL-licensed HEIC decoder.",
  alternates: { canonical: "/licenses" },
};

const root = process.cwd();
const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

type Package = { name: string; version: string; license: string };

function packages(): Package[] {
  const { dependencies } = JSON.parse(read("package.json")) as {
    dependencies: Record<string, string>;
  };
  return Object.keys(dependencies)
    .sort()
    .map((name) => {
      const pkg = JSON.parse(read("node_modules", name, "package.json")) as {
        version: string;
        license?: string;
      };
      return { name, version: pkg.version, license: pkg.license ?? "See package" };
    });
}

const CODECS: { title: string; parts: string; files: string[] }[] = [
  {
    title: "@jsquash/jpeg",
    parts: "MozJPEG / libjpeg-turbo (IJG License, BSD-3-Clause, zlib)",
    files: ["node_modules/@jsquash/jpeg/codec/LICENSE.codec.md"],
  },
  {
    title: "@jsquash/webp",
    parts: "libwebp (BSD-3-Clause)",
    files: ["node_modules/@jsquash/webp/codec/LICENSE.codec.md"],
  },
  {
    title: "@jsquash/png",
    parts: "PNG codec (BSD-3-Clause style)",
    files: ["node_modules/@jsquash/png/codec/LICENSE.codec.md"],
  },
  {
    title: "@jsquash/oxipng",
    parts: "oxipng (MIT)",
    files: ["node_modules/@jsquash/oxipng/codec/LICENSE.codec.md"],
  },
  {
    title: "@jsquash/avif",
    parts:
      "libavif v1.0.1 (BSD-2-Clause), libaom v3.7.0 (BSD-2-Clause and the AOM Patent License 1.0), libyuv (BSD-3-Clause)",
    files: [
      "src/app/licenses/notices/libavif.txt",
      "src/app/licenses/notices/libaom.txt",
      "src/app/licenses/notices/libaom-patents.txt",
      "src/app/licenses/notices/libyuv.txt",
    ],
  },
];

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-(--header-height) text-h2 text-fg">
      {children}
    </h2>
  );
}

function Notice({ label, text }: { label: string; text: string }) {
  return (
    <details className="rounded-md border border-border bg-surface-2 p-3">
      <summary className="cursor-pointer text-ui text-fg">{label}</summary>
      <pre className="mt-3 max-h-96 overflow-auto font-mono text-small whitespace-pre-wrap text-fg-muted">
        {text}
      </pre>
    </details>
  );
}

export default function LicensesPage() {
  const vendor = LIBHEIF_BASE;
  const source = `${vendor}/source`;
  return (
    <Section>
      <Container size="content" className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-h1 text-fg">Open-source licenses</h1>
          <p className="text-body-lg text-fg-muted">
            Sprigkit is built with open-source software. This page lists it with its licenses and
            the notices those licenses ask us to show.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <Heading id="libheif">HEIC decoder: libheif (LGPL-3.0)</Heading>
          <p className="text-body text-fg">
            Convert Image and JPG to PDF open HEIC/HEIF photos with{" "}
            <strong className="font-medium">libheif-js {LIBHEIF_VERSION}</strong>, a WebAssembly
            build of libheif {LIBHEIF_VERSION} and the HEVC decoder libde265 1.0.15. They are
            licensed under the GNU Lesser General Public License version 3 (LGPL-3.0), which
            includes the GNU General Public License version 3 by reference.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-fg">
            <li>libheif: Copyright © 2017–2025 Dirk Farin.</li>
            <li>libde265: Copyright © 2013–2014 struktur AG, Dirk Farin.</li>
            <li>libheif-js: packaging by Kiril Vatev (LGPL-3.0).</li>
          </ul>
          <p className="text-body text-fg">
            The decoder is not part of Sprigkit’s code: it is served unmodified as a separate file,{" "}
            <TextLink href={`${vendor}/libheif-wasm/libheif-bundle.mjs`} prefetch={false}>
              libheif-bundle.mjs
            </TextLink>
            , and loaded only when you add a HEIC file. You may replace it with your own compatible
            build of libheif-js {LIBHEIF_VERSION} served at the same address.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-fg">
            <li>
              License texts:{" "}
              <TextLink href={`${vendor}/libheif-wasm/LICENSE`} prefetch={false}>
                libheif (LGPL-3.0 and GPL-3.0)
              </TextLink>
              ,{" "}
              <TextLink href={`${vendor}/LICENSE`} prefetch={false}>
                libheif-js (LGPL-3.0)
              </TextLink>
            </li>
            <li>
              Corresponding source, hosted here:{" "}
              <TextLink href={`${source}/libheif-${LIBHEIF_VERSION}.tar.gz`} prefetch={false}>
                libheif {LIBHEIF_VERSION}
              </TextLink>
              ,{" "}
              <TextLink href={`${source}/libde265-1.0.15.tar.gz`} prefetch={false}>
                libde265 1.0.15
              </TextLink>
              ,{" "}
              <TextLink
                href={`${source}/libheif-emscripten-${LIBHEIF_VERSION}.tar.gz`}
                prefetch={false}
              >
                build scripts (libheif-emscripten {LIBHEIF_VERSION})
              </TextLink>
              ,{" "}
              <TextLink href={`${source}/libheif-js-${LIBHEIF_VERSION}.tar.gz`} prefetch={false}>
                libheif-js {LIBHEIF_VERSION}
              </TextLink>
            </li>
            <li>
              Upstream: github.com/strukturag/libheif (tag v{LIBHEIF_VERSION}),
              github.com/strukturag/libde265 (v1.0.15), github.com/catdad-experiments/libheif-js
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <Heading id="codecs">Image codecs</Heading>
          <p className="text-body text-fg">
            The image tools encode and decode with jSquash (Apache-2.0), which bundles these codecs.
            Their notices follow.
          </p>
          {CODECS.map((codec) => (
            <div key={codec.title} className="flex flex-col gap-2">
              <h3 className="text-h3 text-fg">{codec.title}</h3>
              <p className="text-small text-fg-muted">{codec.parts}</p>
              {codec.files.map((file) => (
                <Notice
                  key={file}
                  label={`Notice: ${file.split("/").pop()}`}
                  text={read(...file.split("/"))}
                />
              ))}
            </div>
          ))}
          <p className="text-body text-fg">
            The PDF tools use pdf.js (Apache-2.0) with its runtime files: PDFium’s JBIG2 decoder
            (BSD-3-Clause), OpenJPEG (BSD-2-Clause), qcms (MIT) and its CMaps and standard fonts.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <Heading id="packages">All packages</Heading>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-small">
              <thead className="bg-surface-2 text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Package
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Version
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    License
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {packages().map((pkg) => (
                  <tr key={pkg.name}>
                    <td className="px-3 py-2 font-mono text-fg">{pkg.name}</td>
                    <td className="px-3 py-2 font-mono text-fg-muted tabular-nums">
                      {pkg.version}
                    </td>
                    <td className="px-3 py-2 text-fg">{pkg.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </Section>
  );
}
