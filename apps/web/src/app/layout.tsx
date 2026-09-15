import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Nest SaaS Starter",
  description: "A production-minded foundation for B2B SaaS products.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
