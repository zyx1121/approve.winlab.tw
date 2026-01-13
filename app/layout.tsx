import "@/app/globals.css";
import { Background } from "@/components/background";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist_Mono } from "next/font/google";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Approve | Winlab",
  description: "Sign off tool for NYCU Winlab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistMono.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="relative min-h-dvh">
            <div className="fixed inset-0 -z-10">
              <Background />
            </div>
            <div className="relative flex flex-col min-h-dvh">
              <Header />
              <Separator />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
