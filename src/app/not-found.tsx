import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Go to the homepage</Link>
      </p>
    </main>
  );
}
