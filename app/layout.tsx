import type { Metadata } from "next";
import { Inter, Montserrat, Playfair_Display, Cinzel, Lora, Crimson_Text, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Load fonts for all themes
const inter = Inter({ subsets: ["latin"], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({ subsets: ["latin"], variable: '--font-montserrat', display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const cinzel = Cinzel({ subsets: ["latin"], variable: '--font-cinzel', display: 'swap' });
const lora = Lora({ subsets: ["latin"], variable: '--font-lora', display: 'swap' });
const crimson = Crimson_Text({ subsets: ["latin"], weight: ["400", "600"], variable: '--font-crimson', display: 'swap' });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: '--font-source-sans', display: 'swap' });

export const metadata: Metadata = {
  title: "dlr1251 blog",
  description: "Personal blog by Daniel Luque",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body 
        className={`${inter.variable} ${montserrat.variable} ${playfair.variable} ${cinzel.variable} ${lora.variable} ${crimson.variable} ${sourceSans.variable} min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

