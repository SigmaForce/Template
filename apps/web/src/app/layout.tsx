import type { Metadata } from "next";
import { AppShell, brand, ThemeProvider } from "@saas/ui";
import "@saas/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
