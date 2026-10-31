import { getContent } from "@/lib/content";
import Header from "@/components/home/Header";
import About from "@/components/home/About";
import Experience from "@/components/home/Experience";
import Products from "@/components/home/Products";
import Founder from "@/components/home/Founder";
import Workbench from "@/components/home/Workbench";
import Now from "@/components/home/Now";
import RevealRoot from "@/components/home/RevealRoot";
import NavMotion from "@/components/home/NavMotion";
import "./styles/home.css";
import "./styles/fix-hd.css";
import "./styles/fix-ab.css";
import "./styles/fix-ex.css";
import "./styles/fix-pr.css";
import "./styles/fix-fo.css";
import "./styles/fix-wb.css";
import "./styles/fix-nw.css";
import "./styles/fix-pg.css";
import "./styles/nav.css";

/**
 * La home de theodavid.com, composée d'après le canevas « Composition
 * theodavid.com » (figé le 30/10/2026) : en-tête, À propos, puis les cinq
 * sections numérotées. Tout le texte vient de content/ via lib/content.ts.
 */
export default function Home() {
  const c = getContent();
  return (
    <>
      <a className="td-skip" href="#main">
        {c.ui.nav.skip}
      </a>
      <Header c={c} />
      <main className="pg" id="main">
        <About c={c} />
        <Experience c={c} />
        <Products c={c} />
        <Founder c={c} />
        <Workbench c={c} />
        <Now c={c} />
      </main>
      <RevealRoot />
      <NavMotion />
    </>
  );
}
