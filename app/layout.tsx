import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sketch2latex-20260710.imouchiha3.chatgpt.site/"),
  title: "Sketch2LaTeX",
  description: "Draw STEM diagrams on a blank canvas or over a PDF and export clean, editable TikZ/LaTeX.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Sketch2LaTeX",
    description: "Draw STEM diagrams on a blank canvas or over a PDF and export clean, editable TikZ/LaTeX.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Sketch2LaTeX",
    description: "Draw STEM diagrams on a blank canvas or over a PDF and export clean, editable TikZ/LaTeX.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
