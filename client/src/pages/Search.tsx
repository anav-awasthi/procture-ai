import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/detectionEngine";
import { Search, Building2, FileText, Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function SearchPage() {
  const { vendorScores, vendors, tenders } = useApp();
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const results = {
    vendors: vendors.filter((v) =>
      v.vendorName.toLowerCase().includes(query.toLowerCase()) ||
      v.cin.toLowerCase().includes(query.toLowerCase()) ||
      v.directorNames.some((d) => d.toLowerCase().includes(query.toLowerCase()))
    ),
    tenders: tenders.filter((t) =>
      t.tenderId.toLowerCase().includes(query.toLowerCase()) ||
      t.tenderName.toLowerCase().includes(query.toLowerCase()) ||
      t.department.toLowerCase().includes(query.toLowerCase())
    ),
  };

  const hasResults = query.length > 0 && (results.vendors.length > 0 || results.tenders.length > 0);
  const noResults = query.length > 0 && !hasResults;

  const scoreMap = new Map(vendorScores.map((s) => [s.vendorId, s]));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Intelligence Search</h1>
        <p className="text-[#A3A88F] text-sm mt-1">Search across all vendor profiles, CIN numbers, directors, and tender records</p>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A88F]" />
        <input
          type="text"
          placeholder="Search vendors, CIN numbers, directors, tender IDs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-[#132218] border border-[#24402E] rounded-xl pl-12 pr-4 py-4 text-[#F2E8D5] placeholder-[#A3A88F] focus:border-[#D9BE7E]/50 focus:outline-none text-lg"
        />
      </div>

      {noResults && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-3 text-[#2B4A36]" />
          <p className="text-[#A3A88F]">No results found for "{query}"</p>
        </div>
      )}

      {hasResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.vendors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[#D9BE7E] text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Vendors ({results.vendors.length})
              </h3>
              {results.vendors.map((v) => {
                const score = scoreMap.get(v.vendorId);
                return (
                  <div
                    key={v.vendorId}
                    className="bg-[#132218] rounded-lg border border-[#24402E] p-4 hover:border-[#D9BE7E]/30 transition-all cursor-pointer"
                    onClick={() => setLocation("/vendors")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#F2E8D5] font-medium">{v.vendorName}</p>
                        <p className="text-[#A3A88F] text-xs font-mono mt-0.5">{v.cin}</p>
                      </div>
                      {score && (
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                          score.riskLevel === "critical" ? "bg-[#D9503F]/10 text-[#D9503F]" :
                          score.riskLevel === "high" ? "bg-[#E0A83C]/10 text-[#E0A83C]" :
                          "bg-[#86B96A]/10 text-[#86B96A]"
                        }`}>
                          {score.totalScore}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results.tenders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[#8FB27A] text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> Tenders ({results.tenders.length})
              </h3>
              {results.tenders.map((t) => (
                <div
                  key={t.tenderId}
                  className="bg-[#132218] rounded-lg border border-[#24402E] p-4 hover:border-[#8FB27A]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-[#D9BE7E]">{t.tenderId}</p>
                      <p className="text-[#F2E8D5] font-medium text-sm mt-0.5">{t.tenderName}</p>
                      <p className="text-[#A3A88F] text-xs">{t.department} · {t.state}</p>
                    </div>
                    <span className="text-[#F2E8D5] font-mono text-sm">{formatCurrency(t.estimatedCost)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-16">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <p className="text-[#A3A88F]">Search across all vendor profiles, CIN numbers, directors, and tender records</p>
        </div>
      )}
    </div>
  );
}
