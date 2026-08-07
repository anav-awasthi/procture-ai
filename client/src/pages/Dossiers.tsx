import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/detectionEngine";
import { FileSearch, AlertTriangle, ChevronDown, ChevronUp, Shield, Target, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Dossiers() {
  const { vendorScores, vendors } = useApp();
  const [expandedDossier, setExpandedDossier] = useState<string | null>(null);

  const flagged = vendorScores.filter((v) => v.totalScore > 20 && v.dossier.length > 0);

  if (flagged.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileSearch className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Dossiers Generated</h2>
          <p className="text-[#A3A88F]">Load data to generate investigative dossiers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Investigative Dossiers</h1>
        <p className="text-[#A3A88F] text-sm mt-1">
          Detailed fraud analysis with evidence and recommended next steps
        </p>
      </div>

      {flagged.map((vendor) => {
        const vendorInfo = vendors.find((v) => v.vendorId === vendor.vendorId);
        const isExpanded = expandedDossier === vendor.vendorId;

        return (
          <div
            key={vendor.vendorId}
            className={`rounded-xl border transition-all duration-300 ${
              isExpanded
                ? "border-[#D9503F]/30 bg-[#132218]"
                : "border-[#24402E] bg-[#132218] hover:border-[#D9503F]/20"
            }`}
          >
            {/* Header */}
            <button
              onClick={() => setExpandedDossier(isExpanded ? null : vendor.vendorId)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                  vendor.riskLevel === "critical" ? "bg-[#D9503F]/15" : "bg-[#E0A83C]/15"
                }`}>
                  <Shield className={`w-6 h-6 ${vendor.riskLevel === "critical" ? "text-[#D9503F]" : "text-[#E0A83C]"}`} />
                </div>
                <div>
                  <h3 className="text-[#F2E8D5] font-medium text-lg">{vendor.vendorName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      vendor.riskLevel === "critical" ? "bg-[#D9503F]/10 text-[#D9503F]" :
                      vendor.riskLevel === "high" ? "bg-[#E0A83C]/10 text-[#E0A83C]" : "bg-[#CE8F33]/10 text-[#CE8F33]"
                    }`}>
                      {vendor.riskLevel.toUpperCase()} RISK
                    </span>
                    <span className="text-[#A3A88F] text-xs">Score: {vendor.totalScore}/100</span>
                    <span className="text-[#A3A88F] text-xs">
                      {vendorInfo ? formatCurrency(vendorInfo.totalValue) : ""} total value
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#A3A88F] text-xs">{vendor.dossier.length} entries</span>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-[#A3A88F]" /> : <ChevronDown className="w-5 h-5 text-[#A3A88F]" />}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4 border-t border-[#24402E] pt-4">
                {/* Vendor Details */}
                {vendorInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#0A1410] rounded-lg p-3 border border-[#24402E]">
                      <p className="text-[#A3A88F] mb-1">CIN</p>
                      <p className="text-[#F2E8D5] font-mono">{vendorInfo.cin}</p>
                    </div>
                    <div className="bg-[#0A1410] rounded-lg p-3 border border-[#24402E]">
                      <p className="text-[#A3A88F] mb-1">Directors</p>
                      <p className="text-[#F2E8D5]">{vendorInfo.directorNames.join(", ")}</p>
                    </div>
                    <div className="bg-[#0A1410] rounded-lg p-3 border border-[#24402E]">
                      <p className="text-[#A3A88F] mb-1">Address</p>
                      <p className="text-[#F2E8D5]">{vendorInfo.address}</p>
                    </div>
                    <div className="bg-[#0A1410] rounded-lg p-3 border border-[#24402E]">
                      <p className="text-[#A3A88F] mb-1">Contact</p>
                      <p className="text-[#F2E8D5]">{vendorInfo.phone} · {vendorInfo.email}</p>
                    </div>
                  </div>
                )}

                {/* Dossier Entries */}
                <div className="space-y-3">
                  {vendor.dossier.map((d) => (
                    <div key={d.id} className="bg-[#0A1410] rounded-lg border border-[#24402E] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className={`w-4 h-4 ${
                          d.severity === "critical" ? "text-[#D9503F]" :
                          d.severity === "high" ? "text-[#E0A83C]" : "text-[#CE8F33]"
                        }`} />
                        <h4 className="text-[#F2E8D5] text-sm font-medium">{d.title}</h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Target className="w-3 h-3 text-[#E0A83C]" />
                            <span className="text-[10px] text-[#E0A83C] font-mono uppercase tracking-wider">How the Scheme Works</span>
                          </div>
                          <p className="text-[#A3A88F] text-sm">{d.scheme}</p>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Shield className="w-3 h-3 text-[#D9BE7E]" />
                            <span className="text-[10px] text-[#D9BE7E] font-mono uppercase tracking-wider">Evidence</span>
                          </div>
                          <pre className="text-[#A3A88F] text-xs font-mono whitespace-pre-wrap bg-[#132218] rounded p-2 border border-[#24402E]">
                            {d.evidence}
                          </pre>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <ArrowRight className="w-3 h-3 text-[#86B96A]" />
                            <span className="text-[10px] text-[#86B96A] font-mono uppercase tracking-wider">Recommended Next Step</span>
                          </div>
                          <p className="text-[#86B96A] text-sm">{d.nextStep}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rules Summary */}
                <div className="bg-[#0A1410] rounded-lg border border-[#24402E] p-4">
                  <h4 className="text-[#F2E8D5] text-sm font-medium mb-3">Detection Rules Triggered</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vendor.rules.map((r) => (
                      <div key={r.ruleId} className="flex items-center justify-between px-3 py-2 bg-[#132218] rounded border border-[#24402E]">
                        <div>
                          <span className="text-[#F2E8D5] text-xs font-medium">Rule {r.ruleId}: {r.ruleName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#A3A88F] text-xs">{r.score}pts</span>
                          <div className={`w-2 h-2 rounded-full ${
                            r.severity === "critical" ? "bg-[#D9503F]" :
                            r.severity === "high" ? "bg-[#E0A83C]" : "bg-[#CE8F33]"
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
