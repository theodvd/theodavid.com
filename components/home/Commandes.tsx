"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Commandes de l'appareil de l'en-tête, posées par-dessus le dessin (dans .hd-plot).
 * Quatre vrais boutons d'au moins 44 px, l'histoire se joue dans l'ordre de l'accroche :
 * - molette CUSTOMERS, 3 crans : le pic grandit, la flèche « customers » se retrace ;
 * - molette PRODUCT, un cran par produit : sa vague (pic déplacé, lignes réorganisées),
 *   son nom à l'écran, et la note « what breaks » devient son extrait de `problem`,
 *   flèche et cercle recalés sur le nouveau pic ;
 * - SHIP : le pic tombe, la flèche vers « product » et le croquis se retracent, puis la
 *   fiche du produit choisi s'ouvre en surimpression (sans produit, la correction seule) ;
 * - haut-parleur : son synthétisé, coupé par défaut.
 * Tant qu'on n'a pas touché, le dessin rendu par le serveur ne change pas.
 * Libellés : content/ui.json (header.controls) ; extraits : products/*.json (problemExcerpt).
 *
 * Exemple : <Commandes kind="large" labels={ui.header.controls} breaks={ui.header.drawing.breaks} products={items} />
 */

export type CommandesLabels = {
  customers: string;
  product: string;
  step: string;
  ship: string;
  shipProduct: string;
  sound: string;
  productSaid: string;
  shipped: string;
  opening: string;
};

export type CommandesProduct = { slug: string; index: number; name: string; excerpt?: [string, string] };

type Kind = "large" | "vertical";

const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const pad = (n: number) => String(n).padStart(2, "0");
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Crans de CUSTOMERS : angle de l'aiguille et hauteur du pic. */
const CUST_DEG = [-40, 15, 70];
const CUST_K = [0.35, 0.65, 1];

/* Formes de pic, une par produit (on reboucle au-delà de 5) : centre, puis bosses [décalage, hauteur, étirement]. */
const SHAPES: { sx: number; bumps: [number, number, number][] }[] = [
  { sx: 334, bumps: [[0, 1, 1]] },
  { sx: 440, bumps: [[-15, 0.7, 1], [13, 1, 1]] },
  { sx: 410, bumps: [[0, 0.8, 1.9]] },
  { sx: 474, bumps: [[0, 1.1, 0.85]] },
  { sx: 360, bumps: [[-12, 1, 1], [10, 0.6, 1], [30, 0.35, 1]] },
];

/* Flèche « what breaks » : part de x (après le texte de la note) et vise le pic décalé de dx ;
   x = 168 (ou 300) et dx = 0 redonnent le tracé d'origine. */
const r1 = (n: number) => String(Math.round(n * 10) / 10);
const ARROW: Record<Kind, (dx: number, x: number) => string> = {
  large: (dx, x) =>
    `M${r1(x)},392 C${r1(x + 52)},384 ${r1(286 + 0.8 * dx)},372 ${r1(336 + dx)},358 M${r1(321 + dx)},352 L${r1(338 + dx)},357 L${r1(326 + dx)},370`,
  vertical: (dx, x) => {
    const v = dx * 0.6;
    return `M${r1(x)},58 C${r1(x + 24)},150 ${r1(320 + v / 2)},262 ${r1(192 + v)},282 M${r1(206 + v)},273 L${r1(191 + v)},282 L${r1(205 + v)},291`;
  },
};

/* ---------- Son synthétisé dans le navigateur, aucun fichier ---------- */
function makeSound() {
  let ac: AudioContext | null = null;
  return (kind: "tick" | "down" | "up" | "ok") => {
    ac ??= new AudioContext();
    const t = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);
    if (kind === "tick") {
      const buf = ac.createBuffer(1, Math.round(ac.sampleRate * 0.015), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
      const src = ac.createBufferSource();
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2600;
      src.buffer = buf;
      src.connect(bp);
      bp.connect(g);
      g.gain.value = 0.5;
      src.start(t);
      return;
    }
    const o = ac.createOscillator();
    o.connect(g);
    if (kind === "down") {
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.09);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    } else if (kind === "up") {
      o.type = "triangle";
      o.frequency.value = 980;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    } else {
      o.type = "triangle";
      o.frequency.setValueAtTime(660, t);
      o.frequency.setValueAtTime(990, t + 0.07);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    }
    o.start(t);
    o.stop(t + 0.2);
  };
}

/* ---------- Le dessin piloté : lit le SVG de son .hd-plot et le modifie sur place ---------- */
function createDevice(plot: HTMLElement, kind: Kind, breaks: [string, string]) {
  const svg = plot.querySelector("svg")!;
  const q = <T extends Element>(s: string) => svg.querySelector<T>(s)!;
  const qa = <T extends Element>(s: string) => Array.from(svg.querySelectorAll<T>(s));
  const pairs = (d: string) =>
    Array.from(d.matchAll(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g), (m) => [Number(m[1]), Number(m[2])] as [number, number]).filter(
      ([, y]) => y < 430,
    );
  const toD = (xs: number[], ys: number[], closed: boolean) =>
    "M" + xs.map((x, i) => `${x},${ys[i].toFixed(1)}`).join(" L") + (closed ? " L512,432 L288,432 Z" : "");

  // Lignes de la vague (fond) et ligne du pic (avec son halo et son impulsion).
  const waves = qa<SVGPathElement>(".a-wave");
  const waveP = waves.map((w) => pairs(w.getAttribute("d")!));
  const spikeEls = qa<SVGPathElement>(".a-spike,.a-glow,.td-pulse");
  const sp = pairs(spikeEls[0].getAttribute("d")!);
  const xs = sp.map(([x]) => x);
  const base = (x: number) => 377.5 + ((x - 344) * (376.1 - 377.5)) / (392 - 344);
  const flat = sp.map(([x, y]) => (x >= 344 && x <= 392 ? base(x) : y));
  // Profil du pic d'origine (centré sur 372), réutilisé pour toutes les formes.
  const tpl = (u: number) => {
    if (u < -28 || u > 20) return 0;
    const x = 372 + u;
    const i = Math.min(xs.length - 2, Math.max(0, Math.floor((x - 288) / 4)));
    const f = (x - xs[i]) / 4;
    const dev = (j: number) => flat[j] - sp[j][1];
    return dev(i) * (1 - f) + dev(i + 1) * f;
  };
  const devOf = (sel: number) => {
    const s = sel < 0 ? { sx: 372, bumps: [[0, 1, 1]] as [number, number, number][] } : SHAPES[sel % SHAPES.length];
    return xs.map((x) => s.bumps.reduce((a, [off, h, st]) => a + h * tpl((x - s.sx - off) / st), 0));
  };
  const centerOf = (sel: number) => {
    if (sel < 0) return 372;
    const s = SHAPES[sel % SHAPES.length];
    const w = s.bumps.reduce((a, [, h]) => a + h, 0);
    return s.sx + s.bumps.reduce((a, [off, h]) => a + off * h, 0) / w;
  };
  // Lignes réorganisées par produit : légère ondulation propre à chaque ligne et à chaque produit.
  const wavesOf = (sel: number) =>
    waveP.map((p, r) =>
      p.map(([x, y]) =>
        sel < 0 ? y : y + 1.6 * Math.sin(((x - 288) / 224) * Math.PI * 2 * (1 + ((sel * 3 + r) % 3) * 0.5) + sel * 1.7 + r * 0.9),
      ),
    );

  let cur = { waves: waveP.map((p) => p.map(([, y]) => y)), spike: sp.map(([, y]) => y) };
  let timer = 0;
  const paint = (s: typeof cur) => {
    cur = s;
    waves.forEach((w, i) => w.setAttribute("d", toD(waveP[i].map(([x]) => x), s.waves[i], true)));
    spikeEls.forEach((e) => e.setAttribute("d", toD(xs, s.spike, e.classList.contains("a-spike"))));
  };
  // Passage d'un état à l'autre en quelques crans francs, comme la molette.
  const morph = (to: typeof cur, steps = 4, ms = 280) => {
    window.clearInterval(timer);
    if (reduced()) return paint(to);
    const from = cur;
    let i = 0;
    timer = window.setInterval(() => {
      i++;
      const t = i / steps;
      const mix = (a: number[], b: number[]) => a.map((v, j) => v + (b[j] - v) * t);
      paint({ waves: from.waves.map((w, r) => mix(w, to.waves[r])), spike: mix(from.spike, to.spike) });
      if (i >= steps) window.clearInterval(timer);
    }, ms / steps);
  };

  // Feutre : retracer un trait ou refaire apparaître un mot, comme au chargement.
  const replay = (el: SVGElement | null, anim: "td-draw var(--dur-draw) var(--ease-draw)" | "td-fade var(--dur-fade) var(--ease-fade)") => {
    if (!el || reduced()) return;
    el.style.animation = "none";
    void el.getBoundingClientRect();
    el.style.animation = `${anim} 0s both`;
  };
  const draw = (el: SVGElement | null) => replay(el, "td-draw var(--dur-draw) var(--ease-draw)");
  const fade = (el: SVGElement | null) => replay(el, "td-fade var(--dur-fade) var(--ease-fade)");

  const needleC = q<SVGLineElement>(".td-knob");
  const needleP = qa<SVGLineElement>(".a-needle").find((n) => n !== needleC)!;
  const turn = (n: SVGLineElement, deg: number) => {
    n.classList.remove("td-knob");
    n.removeAttribute("transform");
    Object.assign(n.style, { transformBox: "fill-box", transformOrigin: "50% 100%", transform: `rotate(${deg}deg)` });
  };

  const arrow = q<SVGPathElement>(".hd-n-breaks");
  const circle = q<SVGPathElement>(".hd-n-circle");
  const btexts = qa<SVGTextElement>(".hd-n-btext");
  const read = q<SVGTextElement>(".hd-read");
  const led = q<SVGCircleElement>(".a-led");
  let ledT = 0;

  let k = 1;
  let sel = -1;
  let shipped = false;
  let back = 0;
  const render = () => {
    const dev = devOf(sel);
    morph({ waves: wavesOf(sel), spike: flat.map((y, j) => y - (shipped ? 0 : k) * dev[j]) });
  };

  return {
    customers(step: number) {
      k = CUST_K[step];
      turn(needleC, CUST_DEG[step]);
      draw(q<SVGPathElement>(".hd-n-cust"));
      if (step === 2) draw(circle);
      render();
    },
    product(i: number, n: number, name: string, excerpt?: [string, string]) {
      sel = i;
      turn(needleP, n > 1 ? -60 + (i * 120) / (n - 1) : 0);
      read.textContent = `${pad(i + 1)} ${name.toUpperCase()}`;
      const dx = centerOf(i) - 372;
      circle.setAttribute("transform", `translate(${r1(kind === "large" ? dx : dx * 0.6)} 0)`);
      const lines = excerpt ?? breaks;
      let from = kind === "large" ? 168 : 300;
      btexts.forEach((t, j) => {
        t.textContent = lines[j];
        const len = t.getComputedTextLength();
        if (kind === "large") {
          // La flèche part après la première ligne de la note, comme sur le dessin d'origine.
          if (j === 0) from = Math.max(168, 30 + len + 14);
        } else {
          // Dessin vertical : la note est collée au bord droit, elle recule si l'extrait est plus long, et la flèche avec elle.
          const x = Math.min(226, 354 - len);
          t.setAttribute("x", r1(x));
          from = Math.min(from, 300 - (226 - x));
        }
        fade(t);
      });
      arrow.setAttribute("d", ARROW[kind](dx, from));
      render();
    },
    ship() {
      shipped = true;
      render();
      draw(q<SVGPathElement>(".hd-n-ship"));
      draw(q<SVGPathElement>(".hd-n-sketch"));
      qa<SVGTextElement>(".hd-n-stext").forEach(fade);
      window.clearTimeout(ledT);
      led.classList.remove("td-blink");
      ledT = window.setTimeout(() => led.classList.add("td-blink"), 1600);
      window.clearTimeout(back);
      // Le terrain casse toujours quelque part : le pic revient.
      back = window.setTimeout(() => {
        shipped = false;
        render();
      }, 2800);
    },
    stop() {
      window.clearInterval(timer);
      window.clearTimeout(ledT);
      window.clearTimeout(back);
    },
  };
}

export default function Commandes({
  kind,
  labels: t,
  breaks,
  products,
}: {
  kind: Kind;
  labels: CommandesLabels;
  breaks: [string, string];
  products: CommandesProduct[];
}) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const dev = useRef<ReturnType<typeof createDevice> | null>(null);
  const sound = useRef<ReturnType<typeof makeSound> | null>(null);
  const [cust, setCust] = useState(-1);
  const [sel, setSel] = useState(-1);
  const [on, setOn] = useState(false);
  const [said, setSaid] = useState("");
  const custRef = useRef(-1);
  const selRef = useRef(-1);
  const drag = useRef<{ y: number; acc: number; moved: boolean } | null>(null);
  const go = useRef(0);

  const plot = () => root.current!.parentElement as HTMLElement;
  const play = (s: Parameters<ReturnType<typeof makeSound>>[0]) => {
    if (on) sound.current?.(s);
  };
  const say = (s: string) => {
    setSaid("");
    window.setTimeout(() => setSaid(s), 30);
  };

  useEffect(() => {
    dev.current = createDevice(plot(), kind, breaks);
    return () => {
      dev.current?.stop();
      window.clearTimeout(go.current);
    };
    // Le dessin ne change pas après le montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepCust = (d: number) => {
    const c = custRef.current < 0 ? (d > 0 ? 0 : 2) : (((custRef.current + d) % 3) + 3) % 3;
    custRef.current = c;
    setCust(c);
    dev.current?.customers(c);
    play("tick");
    say(`${t.customers}, ${fill(t.step, { n: c + 1, total: 3 })}`);
  };
  const stepProd = (d: number) => {
    const n = products.length;
    if (!n) return;
    const i = selRef.current < 0 ? (d > 0 ? 0 : n - 1) : (((selRef.current + d) % n) + n) % n;
    selRef.current = i;
    setSel(i);
    const p = products[i];
    dev.current?.product(i, n, p.name, p.excerpt);
    play("tick");
    router.prefetch(`/products/${p.slug}`);
    say(fill(t.productSaid, { name: p.name, excerpt: (p.excerpt ?? breaks).join(" ") }));
  };

  // Molette : tap ou clic = un cran ; glisser vertical à la souris ; flèches ; molette de souris une fois la molette choisie.
  const dial = (step: (d: number) => void) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      drag.current = { y: e.clientY, acc: 0, moved: false };
      if (e.pointerType === "mouse") e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => {
      const g = drag.current;
      if (!g || e.pointerType !== "mouse" || !e.buttons) return;
      const s = Math.trunc((g.y - e.clientY) / 18);
      if (s !== g.acc) {
        step(s - g.acc);
        g.acc = s;
        g.moved = true;
      }
    },
    onClick: () => {
      if (drag.current?.moved) {
        drag.current = null;
        return;
      }
      drag.current = null;
      step(1);
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowDown" || e.key === "ArrowLeft") step(-1);
      else return;
      e.preventDefault();
    },
  });

  // Molette de souris : écouteur non passif, actif seulement quand la molette a le focus (le défilement de la page reste libre).
  useEffect(() => {
    const btns = Array.from(root.current!.querySelectorAll<HTMLButtonElement>("[data-dial]"));
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      const b = e.currentTarget as HTMLButtonElement;
      if (document.activeElement !== b) return;
      e.preventDefault();
      if (performance.now() - last < 140) return;
      last = performance.now();
      b.dispatchEvent(new CustomEvent("td-step", { detail: e.deltaY < 0 ? 1 : -1 }));
    };
    btns.forEach((b) => b.addEventListener("wheel", onWheel, { passive: false }));
    return () => btns.forEach((b) => b.removeEventListener("wheel", onWheel));
  }, []);
  useEffect(() => {
    const el = root.current!;
    const onStep = (e: Event) => {
      const d = (e as CustomEvent<number>).detail;
      if ((e.target as HTMLElement).dataset.dial === "cust") stepCust(d);
      else stepProd(d);
    };
    el.addEventListener("td-step", onStep);
    return () => el.removeEventListener("td-step", onStep);
  });

  // SHIP : enfoncé à la pression (souris, doigt, Espace, Entrée), action au relâchement.
  const press = () => {
    plot().classList.add("is-down");
    play("down");
  };
  const release = () => {
    if (!plot().classList.contains("is-down")) return;
    plot().classList.remove("is-down");
    play("up");
  };
  const ship = () => {
    dev.current?.ship();
    window.setTimeout(() => play("ok"), 60);
    const p = selRef.current >= 0 ? products[selRef.current] : null;
    if (!p) return say(t.shipped);
    say(fill(t.opening, { name: p.name }));
    window.clearTimeout(go.current);
    // La correction se voit, puis la fiche s'ouvre.
    go.current = window.setTimeout(() => router.push(`/products/${p.slug}`, { scroll: false }), reduced() ? 150 : 800);
  };

  const chosen = sel >= 0 ? products[sel] : null;

  return (
    <div className={`hd-ctl hd-ctl-${kind}`} ref={root}>
      <button
        type="button"
        className="hd-k hd-k-cust"
        data-dial="cust"
        aria-label={cust < 0 ? t.customers : `${t.customers}, ${fill(t.step, { n: cust + 1, total: 3 })}`}
        {...dial(stepCust)}
      />
      <button
        type="button"
        className="hd-k hd-k-prod"
        data-dial="prod"
        aria-label={chosen ? `${t.product}, ${chosen.name}` : t.product}
        {...dial(stepProd)}
      />
      <button
        type="button"
        className="hd-k hd-k-ship"
        aria-label={chosen ? fill(t.shipProduct, { name: chosen.name }) : t.ship}
        aria-haspopup={chosen ? "dialog" : undefined}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) press();
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") release();
        }}
        onClick={ship}
      />
      <button
        type="button"
        className="hd-k hd-k-spk"
        aria-label={t.sound}
        aria-pressed={on}
        onClick={() => {
          const next = !on;
          setOn(next);
          plot().classList.toggle("is-sound", next);
          if (next) {
            sound.current ??= makeSound();
            sound.current("tick");
          }
        }}
      />
      <p className="hd-sr" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
