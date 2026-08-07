import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/detectionEngine";
import { Search, Calendar, FileText } from "lucide-react";
import { useState } from "react";

export default function Tenders() {
  const { tenders } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const states = Array.from(new Set(tenders.map((t) => t.state)));

  const filtered = tenders.filter((t) => {
    const matchSearch = !searchTerm ||
      t.tenderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenderName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchState = !stateFilter || t.state === stateFilter;
    return matchSearch && matchState;
  });

  if (tenders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Tenders</h2>
          <p className="text-[#A3A88F]">Load data to see tender records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Tender Explorer</h1>
          <p className="text-[#A3A88F] text-sm mt-1">{tenders.length} tenders across {states.length} states</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A88F]" />
          <input
            type="text"
            placeholder="Search tenders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#132218] border border-[#24402E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#F2E8D5] placeholder-[#A3A88F] focus:border-[#D9BE7E]/50 focus:outline-none w-72"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="bg-[#132218] border border-[#24402E] rounded-lg px-3 py-2 text-sm text-[#F2E8D5] focus:border-[#D9BE7E]/50 focus:outline-none"
        >
          <option value="">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tender List */}
      <div className="space-y-3">
        {filtered.map((t, i) => (
          <div
            key={t.tenderId}
            className="bg-[#132218] rounded-xl border border-[#24402E] p-5 hover:border-[#D9BE7E]/20 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[#D9BE7E]">{t.tenderId}</span>
                  <span className="text-xs text-[#A3A88F]">{t.state}</span>
                </div>
                <h3 className="text-[#F2E8D5] font-medium">{t.tenderName}</h3>
                <p className="text-[#A3A88F] text-xs mt-0.5">{t.department}</p>
              </div>
              <div className="text-right">
                <p className="text-[#F2E8D5] font-mono font-medium">{formatCurrency(t.estimatedCost)}</p>
                <p className="text-[#A3A88F] text-xs flex items-center justify-end gap-1">
                  <Calendar className="w-3 h-3" />
                  {t.date}
                </p>
              </div>
            </div>

            {/* Bidders */}
            <div className="mt-3 space-y-1.5">
              {t.bidders.map((b) => (
                <div key={b.bidderId} className="flex items-center justify-between px-3 py-1.5 bg-[#0A1410] rounded border border-[#24402E]">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      b.result === "L1" ? "bg-[#86B96A]/10 text-[#86B96A]" :
                      b.result === "L2" ? "bg-[#D9BE7E]/10 text-[#D9BE7E]" :
                      "bg-[#A3A88F]/10 text-[#A3A88F]"
                    }`}>
                      {b.result}
                    </span>
                    <span className="text-[#F2E8D5] text-sm">{b.vendorName}</span>
                  </div>
                  <span className="text-[#A3A88F] text-xs font-mono">{formatCurrency(b.quotedAmount)}</span>
                </div>
              ))}
            </div>

            {/* Anomaly indicator */}
            {t.bidders.length <= 1 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#D9503F]/5 border border-[#D9503F]/20 rounded">
                <span className="text-[#D9503F] text-xs font-medium">Single bidder — potential exclusion</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
