import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import Nav from "./components/nav/Nav.jsx";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-var",
  display: "swap",
});

export const metadata = {
  title: "Fair Pass",
  description: "Anti-scalp NFT tickets on Hedera with World ID",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="font-sans min-h-screen antialiased">
        <Providers>
          <AppShell>
            <Nav />
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
