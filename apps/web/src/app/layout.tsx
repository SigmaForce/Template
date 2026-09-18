import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { brand, ThemeProvider } from "@saas/ui";
import { getWebEnvironment } from "../environment";
import "@saas/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const environment = getWebEnvironment();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider
          publishableKey={environment.authentication.publishableKey}
        >
          <ThemeProvider>{children}</ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
