import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { AlertTriangle, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/detectionEngine";

export default function Flagged() {
  const { vendorScores, vendors } = useApp();
  const [, setLocation] = useLocation();

  const flagged = vendorScores.filter((v) => v.totalScore > 20).sort((a, b) => b.totalScore - a.totalScore);

  const exportToExcel = () => {
    const data = flagged.map((v) => ({
      "Vendor Name": v.vendorName,
      "Vendor ID": v.vendorId,
      "Risk Score": v.totalScore,
      "Risk Level": v.riskLevel.toUpperCase(),
      "Rules Triggered": v.rules.length,
      "Rule Names": v.rules.map((r) => `${r.ruleName} (${r.score}pts)`).join("; "),
      "Evidence Count": v.rules.reduce((sum, r) => sum + r.evidence.length, 0),
      "Total Contract Value": formatCurrency(vendors.find((vd) => vd.vendorId === v.vendorId)?.totalValue || 0),
      "Directors": vendors.find((vd) => vd.vendorId === v.vendorId)?.directorNames.join(", ") || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flagged Vendors");
    XLSX.writeFile(wb, "procureguard_flagged_results.xlsx");
    toast.success("Flagged results exported to Excel");
  };

  if (flagged.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Flagged Cases</h2>
          <p className="text-[#A3A88F]">Load data to see flagged vendors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Flagged Cases</h1>
          <p className="text-[#A3A88F] text-sm mt-1">
            {flagged.length} vendors flagged · {flagged.filter((v) => v.riskLevel === "critical").length} critical · {flagged.filter((v) => v.riskLevel === "high").length} high risk
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          className="bg-[#D9BE7E] text-[#0A1410] hover:bg-[#C2A86A] font-semibold active:scale-[0.97]"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <div className="space-y-3">
        {flagged.map((v, i) => {
          const vendor = vendors.find((vd) => vd.vendorId === v.vendorId);
          return (
            <div
              key={v.vendorId}
              className="bg-[#132218] rounded-xl border border-[#24402E] p-5 hover:border-[#D9BE7E]/30 transition-all cursor-pointer"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setLocation("/dossiers")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    v.riskLevel === "critical" ? "bg-[#D9503F]/15 text-[#D9503F]" :
                    v.riskLevel === "high" ? "bg-[#E0A83C]/15 text-[#E0A83C]" :
                    "bg-[#CE8F33]/15 text-[#CE8F33]"
                  }`}>
                    {v.riskLevel.toUpperCase()} · {v.totalScore}/100
                  </div>
                  <h3 className="text-[#F2E8D5] font-medium text-lg">{v.vendorName}</h3>
                </div>
                <div className="text-right">
                  {vendor && <p className="text-[#F2E8D5] font-mono text-sm">{formatCurrency(vendor.totalValue)}</p>}
                  <p className="text-[#A3A88F] text-xs">{v.rules.length} rules triggered</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {v.rules.map((r) => (
                  <span
                    key={r.ruleId}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      r.severity === "critical" ? "bg-[#D9503F]/10 text-[#D9503F]" :
                      r.severity === "high" ? "bg-[#E0A83C]/10 text-[#E0A83C]" :
                      "bg-[#D9BE7E]/10 text-[#D9BE7E]"
                    }`}
                  >
                    R{r.ruleId}: {r.ruleName} ({r.score}pts)
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
