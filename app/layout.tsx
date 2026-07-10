import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sketch2LaTeX",
  description: "Draw structured STEM diagrams and generate compilable LaTeX.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
