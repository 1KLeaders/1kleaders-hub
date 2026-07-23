import type { Metadata } from "next";
import { Rethink_Sans, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";

const rethinkSans = Rethink_Sans({
  variable: "--font-rethink-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "1000 Leaders: Venture Builder and Community - Invent, Build, Scale",
  description: "We are a start-up venture builder that is transforming ideas into scalable start-ups through dedicated regional expertise. We are driven by collective professionals, leaders, advisors, and investors.",
  keywords: ["venture builder", "united arab emirates", "saudi arabia", "bahrain", "middle east", "entrepreneurship", "venture funding", "startup", "investors", "investment", "venture capitalists", "angel investors"],
  authors: [{ name: "1000 Leaders Holding Limited" }],
  icons: { icon: "/logo-accent.png" },
  openGraph: {
    title: "1000 Leaders: Venture Builder and Community",
    description: "Invent, Build, Scale - Transforming ideas into scalable startups",
    url: "https://1kleaders.com",
    siteName: "1K Leaders",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "1000 Leaders: Venture Builder and Community",
    description: "Invent, Build, Scale - Transforming ideas into scalable startups",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('1kl-theme');
              var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (t === 'dark' || (t === 'system' && systemDark)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className={`${rethinkSans.variable} ${manrope.variable} antialiased bg-[#fbfbfb] dark:bg-[#0f0f0f] text-[#222] dark:text-[#f0f0f0]`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
