import { expect, test } from "./fixtures";

// Structured data on every page in the sitemap (P8-T14): valid JSON-LD, known
// types, the properties Google documents as required for each type, and
// absolute same-origin URLs. The Rich Results Test on a preview deployment is
// the manual complement (seo-strategy §4).

type Node = Record<string, unknown>;

const REQUIRED: Record<string, string[]> = {
  BreadcrumbList: ["itemListElement"],
  WebApplication: ["name", "url", "offers", "applicationCategory", "operatingSystem"],
  FAQPage: ["mainEntity"],
  CollectionPage: ["name", "url", "mainEntity"],
  WebSite: ["name", "url"],
  Organization: ["name", "url", "logo"],
  WebPage: ["name", "url", "description"],
  AboutPage: ["name", "url", "description"],
  Article: ["headline", "author", "datePublished", "dateModified", "publisher", "url"],
};

function urls(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string" && /^https?:\/\//.test(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => urls(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => urls(v, found));
  return found;
}

function check(node: Node, where: string) {
  const type = node["@type"] as string;
  expect(Object.keys(REQUIRED), `${where}: unknown @type ${type}`).toContain(type);
  for (const prop of REQUIRED[type]!) {
    expect(node[prop], `${where}: ${type}.${prop}`).toBeTruthy();
  }
  if (type === "BreadcrumbList") {
    const items = node.itemListElement as Node[];
    expect(items.map((item) => item.position)).toEqual(items.map((_, i) => i + 1));
    for (const item of items) expect(item.name && item.item, `${where}: crumb`).toBeTruthy();
  }
  if (type === "FAQPage") {
    for (const q of node.mainEntity as Node[]) {
      expect(q["@type"]).toBe("Question");
      expect((q.acceptedAnswer as Node).text, `${where}: answer`).toBeTruthy();
    }
  }
  if (type === "Article") {
    expect((node.author as Node).name, `${where}: author`).toBeTruthy();
    expect(node.datePublished as string).toMatch(/^\d{4}-\d{2}-\d{2}/);
  }
  if (type === "WebApplication") {
    expect((node.offers as Node).price).toBe("0");
  }
}

test("every page in the sitemap has valid structured data", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const pages = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  expect(pages.length).toBeGreaterThan(30);
  const origin = new URL(pages[0]!).origin;

  for (const url of pages) {
    const path = new URL(url).pathname;
    const html = await (await request.get(path)).text();
    const scripts = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ];
    expect(scripts, `${path}: one JSON-LD script`).toHaveLength(1);
    const data = JSON.parse(scripts[0]![1]!) as Node;
    expect(data["@context"]).toBe("https://schema.org");
    const graph = data["@graph"] as Node[];
    expect(graph.length, path).toBeGreaterThan(0);
    for (const node of graph) check(node, path);
    for (const link of urls(graph)) {
      // Guide sources are external by design; everything else is ours.
      if (graph.some((node) => (node.citation as string[] | undefined)?.includes(link))) continue;
      expect(new URL(link).origin, `${path}: ${link}`).toBe(origin);
    }
  }
});
