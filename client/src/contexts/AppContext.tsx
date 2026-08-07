import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { getDemoTenders, getDemoVendors, type TenderRecord, type VendorInfo } from "@/lib/demoData";
import { runAllRules, buildRelationshipGraph, type VendorScore } from "@/lib/detectionEngine";

interface AppContextType {
  tenders: TenderRecord[];
  vendors: VendorInfo[];
  vendorScores: VendorScore[];
  graph: { nodes: any[]; edges: any[] };
  isDemo: boolean;
  setIsDemo: (v: boolean) => void;
  isScanning: boolean;
  scanProgress: number;
  consoleLogs: string[];
  loadDemo: () => void;
  clearData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tenders, setTenders] = useState<TenderRecord[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [vendorScores, setVendorScores] = useState<VendorScore[]>([]);
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [isDemo, setIsDemo] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  const loadDemo = useCallback(() => {
    setIsDemo(true);
    setIsScanning(true);
    setScanProgress(0);
    setConsoleLogs([]);

    const demoVendors = getDemoVendors();
    const demoTenders = getDemoTenders();

    addLog("Initializing detection engine");
    addLog(`Loading ${demoTenders.length} tender records...`);

    setTimeout(() => {
      setVendors(demoVendors);
      setTenders(demoTenders);
      addLog(`Loaded ${demoVendors.length} vendor profiles (synthetic demonstration set)`);
      addLog(`Loaded ${demoTenders.length} tender records across ${new Set(demoTenders.map(t => t.department)).size} departments`);
      setScanProgress(20);
    }, 500);

    setTimeout(() => {
      addLog("Cross-referencing directorships within loaded dataset...");
      setScanProgress(35);
    }, 1200);

    setTimeout(() => {
      addLog("Executing 14 detection rules...");
      setScanProgress(50);
    }, 2000);

    setTimeout(() => {
      addLog("Rule 1-4: Identity correlation complete — 4 clusters identified");
      setScanProgress(60);
    }, 2800);

    setTimeout(() => {
      addLog("Rule 5-7: Behavioral pattern analysis — rotation patterns detected");
      setScanProgress(70);
    }, 3500);

    setTimeout(() => {
      addLog("Rule 8-11: Bid analysis — estimate proximity and single-bid anomalies found");
      setScanProgress(80);
    }, 4200);

    setTimeout(() => {
      addLog("Rule 12-14: Statistical analysis — Benford deviation and price inflation detected");
      setScanProgress(90);
    }, 5000);

    setTimeout(() => {
      const scores = runAllRules(demoTenders, demoVendors);
      const relGraph = buildRelationshipGraph(demoVendors, demoTenders);
      setVendorScores(scores);
      setGraph(relGraph);
      setScanProgress(100);
      setIsScanning(false);
      addLog(`Scan complete. ${scores.filter(s => s.totalScore > 20).length} vendors flagged out of ${scores.length} analyzed.`);
      addLog(`${relGraph.edges.length} suspicious relationships mapped.`);
    }, 5800);
  }, [addLog]);

  const clearData = useCallback(() => {
    setTenders([]);
    setVendors([]);
    setVendorScores([]);
    setGraph({ nodes: [], edges: [] });
    setConsoleLogs([]);
    setScanProgress(0);
  }, []);

  return (
    <AppContext.Provider
      value={{
        tenders,
        vendors,
        vendorScores,
        graph,
        isDemo,
        setIsDemo,
        isScanning,
        scanProgress,
        consoleLogs,
        loadDemo,
        clearData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
