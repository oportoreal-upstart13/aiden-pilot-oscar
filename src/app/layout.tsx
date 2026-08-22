import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@upstart13-com/aiden-ui/layout/theme-provider";
import { Toaster } from "@upstart13-com/aiden-ui";
import { aidenConfig } from "@/../aiden.config";
import { brand } from "@/config/brand";
import "@/lib/styles.css";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? aidenConfig.app.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          {/* Mounted once at the root, per 07-feedback. It was previously
              only inside the dashboard layout, so any toast fired from a
              surface outside that segment would have gone nowhere. */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
