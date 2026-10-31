# theodavid.com

Personal portfolio of Théo David. The home page is a navigable solar system: a ridgeline sun, six planets in real-time orbit (one per project), marker travel, and case studies that open in place.

Live: [theodavid.com](https://theodavid.com)

## How it works

Capable browsers get the full-screen WebGL experience; crawlers, browsers without WebGL and old devices keep a classic server-rendered page (same content, indexable). The gate is a parser-blocking capability check, not UA sniffing: see `components/astres/HomeSwitch.tsx`.

The scene (`components/astres/createAstresScene.ts`) draws every body as a stack of constant-latitude rings displaced by simplex noise in the vertex shader, one draw call per body, with an opaque inner sphere for the ridgeline occlusion and an UnrealBloomPass for the glow.

## Credits

The solar-system concept is a tribute to [astres](https://trucs.ai/astres/) by trucs.ai and its open-source [ridgeline engine](https://github.com/idle-intelligence/ridgeline) (WebGPU, MIT). This site reimagines the idea in plain Three.js so it runs on any modern browser.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Three.js · GSAP · Lenis · Tailwind CSS. No CMS, no database: all content lives in `data/projects.ts` and `components/astres/astresProjects.ts`.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Where things live

- `components/astres/` : the solar system (scene, UI shell, capability gate, astres-only project data)
- `data/projects.ts` : the case-study content (the only "database")
- `components/three/createHeroScene.ts` : the classic page's particle hero
- `fonts/` : self-hosted Clash Display & Satoshi (Fontshare licence)

Accessibility: reduced motion is honored everywhere (frozen orbits, instant travel), the panels are real dialogs with a focus trap, and the classic page remains the fallback for everything else.
