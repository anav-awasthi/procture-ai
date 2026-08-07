import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import Sidebar from "./components/Sidebar";
import CaseChrome from "./components/CaseChrome";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import FraudNetwork from "./pages/FraudNetwork";
import Flagged from "./pages/Flagged";
import Vendors from "./pages/Vendors";
import Dossiers from "./pages/Dossiers";
import Tenders from "./pages/Tenders";
import Analytics from "./pages/Analytics";
import SearchPage from "./pages/Search";

// On GitHub Pages the app lives at /<repo>/, so wouter needs that prefix.
// import.meta.env.BASE_URL is injected by Vite from the `base` config.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Upload} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/network"} component={FraudNetwork} />
      <Route path={"/flagged"} component={Flagged} />
      <Route path={"/vendors"} component={Vendors} />
      <Route path={"/dossiers"} component={Dossiers} />
      <Route path={"/tenders"} component={Tenders} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/search"} component={SearchPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AnimatedRoutes() {
  // Re-keying on the path replays the page entrance animation on every navigation
  const [location] = useLocation();
  return (
    <div key={location} className="page-enter">
      <Router />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppProvider>
            <WouterRouter base={BASE}>
            <div className="min-h-screen bg-[#0A1410]">
              <Sidebar />
              <CaseChrome />
              <main className="ml-16 min-h-screen relative z-[2] pt-7">
                <AnimatedRoutes />
              </main>
            </div>
            </WouterRouter>
          </AppProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
