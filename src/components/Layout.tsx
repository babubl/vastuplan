import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { Container, cx } from "./ui";

const NAV = [["/design", "Design a house"], ["/apartment", "Plan an apartment"], ["/method", "How it works"]] as const;

export default function Layout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const app = pathname.startsWith("/design");
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <Container className={cx("flex h-16 items-center gap-8", app && "max-w-none")}>
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => cx("rounded-md px-3 py-2 text-[15px] font-semibold no-underline", isActive ? "text-ink" : "text-muted hover:text-ink")}>{l}</NavLink>)}
          </nav>
          <Link to="/design" className="ml-auto hidden rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-indigo md:inline-flex">Start with your plot</Link>
          <button className="ml-auto rounded-md p-2 text-ink md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? <X className="size-6" /> : <Menu className="size-6" />}</button>
        </Container>
        {open && <nav className="border-t border-line bg-paper md:hidden" aria-label="Mobile"><Container className="py-3">{NAV.map(([to, l]) => <Link key={to} to={to} className="block py-2.5 text-[17px] font-semibold text-ink no-underline">{l}</Link>)}</Container></nav>}
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
      {!app && (
        <footer className="no-print border-t border-line">
          <Container className="grid gap-8 py-12 text-sm md:grid-cols-[1.5fr_1fr_1fr]">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-3 text-muted">Concept floor plans for Indian homes, aligned with Vastu Shastra and checked against the National Building Code. Free, and nothing to sign up for.</p>
            </div>
            <div><p className="font-semibold text-ink">Plan</p><ul className="mt-3 space-y-2">{NAV.map(([to, l]) => <li key={to}><Link to={to} className="text-muted no-underline hover:text-ink">{l}</Link></li>)}</ul></div>
            <div><p className="font-semibold text-ink">Before you build</p><p className="mt-3 text-muted">These are concept plans. Approval drawings must come from a licensed architect, and the structure from a structural engineer, following your local building rules.</p></div>
          </Container>
        </footer>
      )}
    </div>
  );
}
