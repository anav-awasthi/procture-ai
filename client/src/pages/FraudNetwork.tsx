import { useApp } from "@/contexts/AppContext";
import { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone";
import { Network as NetworkIcon, Maximize2, Crosshair, Loader2 } from "lucide-react";

export default function FraudNetwork() {
  const { graph } = useApp();
  const [stabilizing, setStabilizing] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0) return;

    const nodes = new DataSet(
      graph.nodes.map((n) => ({
        ...n,
        color: {
          background: n.group === "vendor" ? "#1A2C20" : n.group === "director" ? "#D9503F" : "#8FB27A",
          border: n.group === "vendor" ? "#D9BE7E" : n.group === "director" ? "#E8836B" : "#D9BE7E",
          highlight: { background: "#D9BE7E", border: "#D9BE7E" },
        },
        font: { color: "#F2E8D5", size: 12, face: "Space Grotesk" },
        borderWidth: 2,
        shape: n.group === "vendor" ? "box" : n.group === "director" ? "dot" : "hexagon",
        size: Math.max(15, Math.min(40, (Number(n.value) || 1) * 3)),
      }))
    );

    const edges = new DataSet(
      graph.edges.map((e) => ({
        ...e,
        color: { color: e.color, highlight: e.color },
        width: 1.5,
        smooth: { type: "continuous" },
        font: { color: "#A3A88F", size: 9, face: "Space Grotesk" },
        arrows: { to: { enabled: false } },
      }))
    );

    const data = { nodes, edges };

    const options = {
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity: 0.005,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.9,
        },
        stabilization: { iterations: 200 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
      },
    };

    setStabilizing(true);
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Fit the graph once physics settles, otherwise it renders off-screen
    network.once("stabilizationIterationsDone", () => {
      network.fit({ animation: { duration: 600, easingFunction: "easeInOutQuad" } });
      setStabilizing(false);
    });
    // Safety net: never leave the overlay stuck if the event doesn't fire
    const t = window.setTimeout(() => setStabilizing(false), 6000);

    // vis-network measures its container once; re-measure when the window changes
    const onResize = () => network.redraw();
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", onResize);
      network.destroy();
      networkRef.current = null;
    };
  }, [graph]);

  const fitView = () => networkRef.current?.fit({ animation: { duration: 500, easingFunction: "easeInOutQuad" } });

  if (graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#132218] border border-[#24402E] flex items-center justify-center">
            <NetworkIcon className="w-8 h-8 text-[#2B4A36]" />
          </div>
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Network Data</h2>
          <p className="text-[#A3A88F]">Load the demo dataset to visualize the fraud network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Fraud Relationship Network</h1>
          <p className="text-[#A3A88F] text-sm mt-1">
            {graph.nodes.length} nodes &middot; {graph.edges.length} suspicious connections
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#1A2C20] border-2 border-[#D9BE7E]" />
            <span className="text-[#A3A88F]">Vendor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#D9503F]" />
            <span className="text-[#A3A88F]">Shared Director</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#8FB27A]" />
            <span className="text-[#A3A88F]">Tender</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-[#D9503F]" />
            <span className="text-[#A3A88F]">Shared Identity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-[#E0A83C]" />
            <span className="text-[#A3A88F]">Shared Contact</span>
          </div>
        </div>
      </div>
      <div className="relative flex-1 min-h-[600px]">
        <div
          ref={containerRef}
          className="no-motion-fx absolute inset-0 rounded-xl border border-[#24402E] bg-[#0A1410]"
        />

        {stabilizing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#0A1410]/80 backdrop-blur-[2px] pointer-events-none">
            <div className="flex items-center gap-3 text-[#D9BE7E]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono tracking-wide">Mapping relationships…</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={fitView}
            className="btn-sweep flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#132218]/90 border border-[#24402E] text-[#A3A88F] hover:text-[#D9BE7E] hover:border-[#D9BE7E]/50 text-xs backdrop-blur transition-colors"
            title="Fit graph to view"
          >
            <Crosshair className="w-3.5 h-3.5" /> Fit
          </button>
          <button
            onClick={() => containerRef.current?.parentElement?.requestFullscreen?.()}
            className="btn-sweep flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#132218]/90 border border-[#24402E] text-[#A3A88F] hover:text-[#D9BE7E] hover:border-[#D9BE7E]/50 text-xs backdrop-blur transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
}
