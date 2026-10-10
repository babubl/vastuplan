import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { Container, cx } from "./ui";

const NAV = [["/design", "Design a house"], ["/apartment", "Apartments"], ["/corners", "Vastu guide"], ["/method", "Method"]] as const;

export default function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const app = pathname.startsWith("/design");
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <Container className={cx("flex h-16 items-center gap-8", app && "max-w-none")}>
          <Logo />
          <nav className="ml-auto hidden items-center gap-7 md:flex" aria-label="Main">
            {NAV.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => cx("border-b py-1 text-[15px] no-underline transition-colors", isActive ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}>{l}</NavLink>)}
          </nav>
          <button className="ml-auto rounded-md p-2 text-ink md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? <X className="size-6" /> : <Menu className="size-6" />}</button>
        </Container>
        {open && <nav className="border-t border-line bg-paper md:hidden" aria-label="Mobile"><Container className="py-3">{NAV.map(([to, l]) => <Link key={to} to={to} className="block py-2.5 text-[17px] font-semibold text-ink no-underline">{l}</Link>)}</Container></nav>}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      {!app && (
        <footer className="no-print border-t border-ink bg-paper">
          <Container className="grid gap-10 py-14 text-[14px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-muted">Concept house plans for Indian plots, laid out to Vastu Shastra and checked against the National Building Code of India.</p>
            </div>
            <div><p className="font-semibold text-ink">Design</p><ul className="mt-3 space-y-2"><li><Link to="/design" className="text-muted no-underline hover:text-ink">House on a plot</Link></li><li><Link to="/apartment" className="text-muted no-underline hover:text-ink">Apartment</Link></li><li><Link to="/#studies" className="text-muted no-underline hover:text-ink">Plot studies</Link></li></ul></div>
            <div><p className="font-semibold text-ink">Learn</p><ul className="mt-3 space-y-2"><li><Link to="/corners" className="text-muted no-underline hover:text-ink">Vastu guide and corners</Link></li><li><Link to="/method" className="text-muted no-underline hover:text-ink">How plans are made</Link></li></ul></div>
            <div><p className="font-semibold text-ink">Before you build</p><p className="mt-3 text-muted">Concept plans only. A licensed architect prepares approval drawings; a structural engineer designs the structure.</p></div>
          </Container>
        </footer>
      )}
    </div>
  );
}
