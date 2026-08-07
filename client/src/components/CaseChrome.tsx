import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";

/**
 * Chrome that frames the app as case-management software rather than a dashboard:
 * a standing classification/provenance strip, a docket reference derived from the
 * loaded dataset, and keyboard navigation for operators who work at speed.
 */

const ROUTES: [string, string, string][] = [
  ["d", "/dashboard", "Overview"],
  ["n", "/network", "Network"],
  ["f", "/flagged", "Findings"],
  ["v", "/vendors", "Registry"],
  ["r", "/dossiers", "Dossiers"],
  ["t", "/tenders", "Tenders"],
  ["a", "/analytics", "Analytics"],
  ["u", "/", "Intake"],
];

export default function CaseChrome() {
  const [, setLocation] = useLocation();
  const { vendors, tenders, isDemo } = useApp() as any;
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState(false);

  // Deterministic docket ref so the same dataset always reads the same in a demo
  const docket = useMemo(() => {
    const n = (tenders?.length ?? 0) * 31 + (vendors?.length ?? 0) * 7;
    const year = new Date().getFullYear();
    return `PG/${year}/${String(n % 10000).padStart(4, "0")}`;
  }, [tenders, vendors]);

  // Two-key navigation: press "g" then a letter. Escape closes help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el?.isContentEditable) return;

      if (e.key === "Escape") { setShowHelp(false); setPending(false); return; }
      if (e.key === "?") { setShowHelp((v) => !v); return; }
      if (e.key === "/") { e.preventDefault(); setLocation("/search"); return; }
      if (e.key === "g") { setPending(true); return; }

      if (pending) {
        const hit = ROUTES.find(([k]) => k === e.key.toLowerCase());
        if (hit) setLocation(hit[1]);
        setPending(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, setLocation]);

  const loaded = (tenders?.length ?? 0) > 0;

  return (
    <>
      {/* Standing provenance strip — states plainly what data is loaded */}
      <div className="fixed top-0 left-16 right-0 z-40 flex items-center gap-3 h-7 px-4
                      bg-[#0E1A14]/95 backdrop-blur border-b border-[#24402E]
                      font-mono text-[10px] tracking-[0.14em] uppercase text-[#A3A88F]">
        <span className="text-[#D9BE7E]">Restricted — Audit Use</span>
        <span className="text-[#2B4A36]">│</span>
        <span>Docket {docket}</span>
        <span className="text-[#2B4A36]">│</span>
        {loaded ? (
          isDemo === false ? (
            <span className="text-[#86B96A]">Operator dataset — {tenders.length} tenders</span>
          ) : (
            <span className="text-[#E0A83C]">
              Synthetic demonstration data — not real procurement records
            </span>
          )
        ) : (
          <span>No dataset loaded</span>
        )}
        <button
          onClick={() => setShowHelp(true)}
          className="ml-auto hover:text-[#D9BE7E] transition-colors tracking-[0.14em]"
        >
          ? Shortcuts
        </button>
      </div>

      {pending && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5
                        bg-[#132218] border border-[#D9BE7E]/40 rounded-[3px]
                        font-mono text-[11px] text-[#D9BE7E]">
          g — awaiting destination
        </div>
      )}

      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1410]/80 backdrop-blur-[2px] p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md bg-[#132218] border border-[#24402E] rounded-[3px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rule-heading mb-4">Keyboard</div>
            <dl className="space-y-2 text-sm">
              {ROUTES.map(([k, , label]) => (
                <div key={k} className="flex justify-between items-baseline">
                  <dt className="text-[#A3A88F]">{label}</dt>
                  <dd className="font-mono text-[11px] text-[#F2E8D5]">
                    <kbd className="px-1.5 py-0.5 border border-[#2B4A36] rounded-[2px]">g</kbd>
                    {" "}
                    <kbd className="px-1.5 py-0.5 border border-[#2B4A36] rounded-[2px]">{k}</kbd>
                  </dd>
                </div>
              ))}
              <div className="flex justify-between items-baseline pt-2 border-t border-[#24402E]">
                <dt className="text-[#A3A88F]">Search</dt>
                <dd className="font-mono text-[11px] text-[#F2E8D5]">
                  <kbd className="px-1.5 py-0.5 border border-[#2B4A36] rounded-[2px]">/</kbd>
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-[11px] leading-relaxed text-[#A3A88F]">
              ProcureGuard surfaces statistical indicators for human review. Findings are
              investigative leads, not determinations of wrongdoing.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
