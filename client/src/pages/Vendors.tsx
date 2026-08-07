import { useApp } from "@/contexts/AppContext";
import { useLocation } from "wouter";
import { Search, Building2, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { useState } from "react";

export default function Vendors() {
  const { vendors, vendorScores } = useApp();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const scoreMap = new Map(vendorScores.map((s) => [s.vendorId, s]));

  const filtered = vendors.filter((v) =>
    v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vendorId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (vendors.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Vendors</h2>
          <p className="text-[#A3A88F]">Load data to see vendor registry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Vendor Registry</h1>
          <p className="text-[#A3A88F] text-sm mt-1">{vendors.length} registered vendors</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A88F]" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#132218] border border-[#24402E] rounded-lg pl-10 pr-4 py-2 text-sm text-[#F2E8D5] placeholder-[#A3A88F] focus:border-[#D9BE7E]/50 focus:outline-none w-64"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((v, i) => {
          const score = scoreMap.get(v.vendorId);
          return (
            <div
              key={v.vendorId}
              className="bg-[#132218] rounded-xl border border-[#24402E] p-5 hover:border-[#D9BE7E]/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1A2C20] border border-[#2B4A36] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#D9BE7E]" />
                  </div>
                  <div>
                    <h3 className="text-[#F2E8D5] font-medium">{v.vendorName}</h3>
                    <p className="text-[#A3A88F] text-xs font-mono mt-0.5">{v.cin}</p>
                  </div>
                </div>
                {score && (
                  <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    score.riskLevel === "critical" ? "bg-[#D9503F]/15 text-[#D9503F]" :
                    score.riskLevel === "high" ? "bg-[#E0A83C]/15 text-[#E0A83C]" :
                    score.riskLevel === "medium" ? "bg-[#CE8F33]/15 text-[#CE8F33]" :
                    score.riskLevel === "low" ? "bg-[#D9BE7E]/15 text-[#D9BE7E]" :
                    "bg-[#86B96A]/15 text-[#86B96A]"
                  }`}>
                    Score: {score.totalScore}
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#A3A88F]">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{v.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#A3A88F]">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{v.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#A3A88F]">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{v.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#A3A88F]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Registered: {v.registrationDate}</span>
                </div>
              </div>
              {score && score.rules.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#24402E]">
                  <p className="text-xs text-[#A3A88F] mb-1.5">
                    <span className="text-[#D9503F]">{score.rules.length}</span> detection rules triggered
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {score.rules.slice(0, 6).map((r) => (
                      <span key={r.ruleId} className="px-1.5 py-0.5 rounded bg-[#1A2C20] text-[10px] text-[#A3A88F] font-mono">
                        R{r.ruleId}: {r.ruleName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
