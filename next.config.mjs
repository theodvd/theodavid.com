/** @type {import('next').NextConfig} */
const nextConfig = {
  // Relais PostHog (mesure d'audience) : le navigateur parle à /ingest sur ce
  // domaine, Vercel transmet à PostHog EU ; les bloqueurs de pub ne le coupent pas.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://eu-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://eu-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ];
  },
  // Anciennes études de cas (/project/<slug>, avant la refonte du 30/10/2026) :
  // redirigées vers leur nouvelle place, aucun lien partagé ne casse.
  async redirects() {
    return [
      { source: '/project/multi-agent-fact-checker', destination: '/products/fact-checker', permanent: true },
      { source: '/project/newsletter-studio', destination: '/products/newsletter-studio', permanent: true },
      { source: '/project/tiro', destination: '/#founder', permanent: true },
      { source: '/project/solen', destination: '/#founder', permanent: true },
      { source: '/project/:slug*', destination: '/#products', permanent: true },
      { source: '/project', destination: '/#products', permanent: true },
    ];
  },
  reactStrictMode: true,
  // Le texte du site est lu dans content/ au moment du rendu (lib/content.ts,
  // chemin calculé) : le traçage de Vercel ne le voit pas. Sans cette ligne,
  // une route rendue à la visite (la 404) n'a pas content/ et rend une page vide.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*.json"],
  },
  // Verification builds (NEXT_DIST_DIR=.next-verify) use a separate output
  // dir so they never corrupt the dev server's .next cache. Vercel and
  // `npm run dev` use the default.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
