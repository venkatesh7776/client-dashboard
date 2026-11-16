import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { AgentPanel } from "@/components/agent/agent-panel";
import { BottomBar, MobileTopBar, Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/toast";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Desk",
  description: "Leads, projects, payments and to-dos in one place.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <MobileTopBar />
              <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-24 sm:px-8 md:pt-10 md:pb-16 lg:px-12">
                <Suspense>{children}</Suspense>
              </main>
            </div>
          </div>
          <BottomBar />
          <AgentPanel />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
