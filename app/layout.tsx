import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono, Shantell_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { PostHogInit } from "@/components/PostHogInit";
import AstresTransition from "@/components/astres/AstresTransition";
import { getContent } from "@/lib/content";
import "./styles/td.css";

/* Les trois familles de l'identité, auto-hébergées par next/font (aucune
   requête vers Google au chargement). Archivo et Martian Mono gardent leur
   axe de largeur : le nom et les titres sont en Archivo élargi (125 %), les
   chiffres en Archivo condensé (62 %). */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const martian = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});

const shantell = Shantell_Sans({
  subsets: ["latin"],
  variable: "--font-shantell",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const { profile } = getContent();
  const role = profile.roles[0];
  const title = `${profile.name} · ${role.title}`;
  return {
    metadataBase: new URL("https://theodavid.com"),
    title,
    description: profile.tagline,
    openGraph: {
      title,
      description: profile.tagline,
      url: "https://theodavid.com",
      siteName: profile.name,
      locale: "en_US",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: profile.tagline },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ece9e1" },
    { media: "(prefers-color-scheme: dark)", color: "#14202e" },
  ],
  viewportFit: "cover",
};

/* Le thème suit le système (décidé le 30/10, pas d'interrupteur) : posé sur
   <html data-theme> avant le premier affichage, puis suivi en direct.
   La classe js est posée au même moment : les apparitions au scroll restent en
   pause dès le premier affichage (sans JavaScript, tout s'affiche). */
const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var m=window.matchMedia('(prefers-color-scheme: dark)');var s=function(){d.setAttribute('data-theme',m.matches?'dark':'light')};s();m.addEventListener('change',s)}catch(e){}})();`;

export default function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${archivo.variable} ${martian.variable} ${shantell.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        {modal}
        <AstresTransition />
        <Analytics />
        <PostHogInit />
      </body>
    </html>
  );
}
