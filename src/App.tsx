import { lazy, Suspense } from "react";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

const Designer = lazy(() => import("./pages/Designer"));
const Apartment = lazy(() => import("./pages/Apartment"));
const Method = lazy(() => import("./pages/Method"));
const Corners = lazy(() => import("./pages/Corners"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Hash routing for static previews where the page's path is unknown (VITE_HASH_ROUTER=1).
const hash = import.meta.env.VITE_HASH_ROUTER === "1";
function Router({ children }: { children: React.ReactNode }) {
  return hash ? <HashRouter>{children}</HashRouter> : <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>{children}</BrowserRouter>;
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div className="p-10 text-muted">Loading…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="design" element={<Designer />} />
            <Route path="apartment" element={<Apartment />} />
            <Route path="method" element={<Method />} />
            <Route path="corners" element={<Corners />} />
            <Route path="legal" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}
