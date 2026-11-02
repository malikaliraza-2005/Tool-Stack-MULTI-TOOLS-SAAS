import { CategoryHub } from "@/components/home/CategoryHub";
import { hubMetadata } from "@/lib/seo";

export const metadata = hubMetadata("developer");

export default function Page() {
  return <CategoryHub category="developer" />;
}
