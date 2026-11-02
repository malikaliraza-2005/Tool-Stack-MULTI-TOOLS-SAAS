import { CategoryHub } from "@/components/home/CategoryHub";
import { hubMetadata } from "@/lib/seo";

export const metadata = hubMetadata("pdf");

export default function Page() {
  return <CategoryHub category="pdf" />;
}
