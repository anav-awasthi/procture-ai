import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Play, Database, Shield, Cpu, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { runAllRules, buildRelationshipGraph, type VendorScore } from "@/lib/detectionEngine";
import type { TenderRecord, VendorInfo } from "@/lib/demoData";

// Column mapping presets for Indian procurement CSV/Excel
const COLUMN_PRESETS: Record<string, string[]> = {
  tenderId: ["tender_id", "tender number", "tender_no", "nid", "notice id", "tenderid", "tnr_id"],
  tenderName: ["tender_name", "title", "description", "subject", "work_name", "tender_title"],
  department: ["department", "dept", "organisation", "org", "authority", "procuring_entity", "dname"],
  state: ["state", "location", "district", "place", "city"],
  date: ["date", "publish_date", "tender_date", "issue_date", "created_at"],
  estimatedCost: ["estimated_cost", "estimate", "budget", "expected_value", "tender_value", "est_cost"],
  vendorName: ["vendor", "bidder", "company", "firm", "contractor", "supplier", "vendor_name", "firm_name"],
  quotedAmount: ["bid_amount", "quoted_amount", "bid_value", "amount", "price", "l1_value", "quoted_price"],
  cin: ["cin", "company_id", "reg_number", "registration_no"],
  phone: ["phone", "mobile", "contact", "tel"],
  email: ["email", "mail", "e_mail"],
  address: ["address", "registered_address", "office_address"],
  directors: ["directors", "director_names", "dir_names"],
  registrationDate: ["reg_date", "registration_date", "incorporation_date", "date_of_incorporation"],
};

function findBestMatch(headers: string[], target: string): { header: string; index: number } | null {
  const targets = COLUMN_PRESETS[target] || [target];
  for (const header of headers) {
    const hNorm = header.toLowerCase().trim();
    for (const t of targets) {
      if (hNorm === t) return { header, index: headers.indexOf(header) };
    }
  }
  // Fuzzy: contains check
  for (const header of headers) {
    const hNorm = header.toLowerCase().trim();
    for (const t of targets) {
      if (hNorm.includes(t) || t.includes(hNorm)) return { header, index: headers.indexOf(header) };
    }
  }
  return null;
}

interface ColumnMapping {
  tenderId: string;
  tenderName: string;
  department: string;
  state: string;
  date: string;
  estimatedCost: string;
  vendorName: string;
  quotedAmount: string;
}

export default function UploadPage() {
  const { isScanning, scanProgress, consoleLogs, loadDemo, vendorScores, vendors, tenders, setIsDemo } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    tenderId: "", tenderName: "", department: "", state: "",
    date: "", estimatedCost: "", vendorName: "", quotedAmount: "",
  });
  const [step, setStep] = useState<"upload" | "mapping" | "scanning" | "done">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  useEffect(() => {
    if (isScanning) setStep("scanning");
    else if (vendorScores.length > 0) setStep("done");
    else if (rawHeaders.length > 0) setStep("mapping");
  }, [isScanning, vendorScores.length, rawHeaders.length]);

  const parseIndianAmount = (val: string): number => {
    const cleaned = val.replace(/[₹,\s]/g, "").replace(/lakh/gi, "00000").replace(/crore/gi, "00000000");
    return parseFloat(cleaned) || 0;
  };

  const parseDate = (val: string): string => {
    if (!val) return new Date().toISOString().split("T")[0];
    // Try DD/MM/YYYY
    if (val.includes("/")) {
      const parts = val.split("/");
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    // Try DD-MM-YYYY
    if (val.includes("-")) {
      const parts = val.split("-");
      if (parts[0].length === 4) return val;
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return val;
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        
        if (json.length < 2) {
          toast.error("File appears empty or has no data rows");
          return;
        }

        const headers = json[0].map((h) => String(h || "").trim());
        setRawHeaders(headers);
        setRawData(json.slice(1));

        // Auto-map columns
        const newMapping: ColumnMapping = {
          tenderId: "", tenderName: "", department: "", state: "",
          date: "", estimatedCost: "", vendorName: "", quotedAmount: "",
        };
        const fields = Object.keys(newMapping) as (keyof ColumnMapping)[];
        fields.forEach((field) => {
          const match = findBestMatch(headers, field);
          if (match) newMapping[field] = match.header;
        });
        setMapping(newMapping);
        toast.success(`Loaded ${json.length - 1} rows from "${file.name}"`);
      } catch (err) {
        toast.error("Failed to parse file. Please check format.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const processMappedData = () => {
    setIsDemo(false);
    if (!rawData.length || !mapping.tenderId) {
      toast.error("Please map at least the Tender ID column");
      return;
    }

    const tenderMap = new Map<string, any>();
    const vendorMap = new Map<string, VendorInfo>();

    rawData.forEach((row) => {
      const headerIdx: Record<string, number> = {};
      Object.entries(mapping).forEach(([key, col]) => {
        if (col) headerIdx[key] = rawHeaders.indexOf(col);
      });

      const getVal = (key: string) => headerIdx[key] !== undefined ? String(row[headerIdx[key]] || "").trim() : "";

      const tenderId = getVal("tenderId");
      const vendorName = getVal("vendorName");
      const quotedAmount = parseIndianAmount(getVal("quotedAmount"));

      if (!tenderId) return;

      if (!tenderMap.has(tenderId)) {
        tenderMap.set(tenderId, {
          tenderId,
          tenderName: getVal("tenderName"),
          department: getVal("department"),
          state: getVal("state"),
          date: parseDate(getVal("date")),
          estimatedCost: parseIndianAmount(getVal("estimatedCost")),
          bidders: [],
        });
      }

      const tender = tenderMap.get(tenderId)!;
      if (vendorName) {
        tender.bidders.push({
          bidderId: vendorName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20),
          vendorName,
          quotedAmount,
          bidDate: tender.date,
          result: "",
        });
      }

      // Track vendors
      if (vendorName && !vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, {
          vendorId: vendorName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20),
          vendorName,
          cin: "",
          directorNames: [],
          address: "",
          phone: "",
          email: "",
          registrationDate: "2020-01-01",
          totalWins: 0,
          totalValue: 0,
        });
      }
    });

    const tenders: TenderRecord[] = Array.from(tenderMap.values());
    const vendors: VendorInfo[] = Array.from(vendorMap.values());

    // Determine winners (lowest bid per tender)
    tenders.forEach((t) => {
      if (t.bidders.length > 0) {
        t.bidders.sort((a, b) => a.quotedAmount - b.quotedAmount);
        t.bidders[0].result = "L1";
        if (t.bidders.length > 1) t.bidders[1].result = "L2";
        if (t.bidders.length > 2) t.bidders[2].result = "L3";

        const winner = t.bidders[0];
        const vendor = vendors.find((v) => v.vendorId === winner.bidderId);
        if (vendor) {
          vendor.totalWins++;
          vendor.totalValue += winner.quotedAmount;
        }
      }
    });

    // Run detection engine
    const scores = runAllRules(tenders, vendors);
    const relGraph = buildRelationshipGraph(vendors, tenders);

    // Update context via scan flow
    toast.success(`Analyzed ${tenders.length} tenders with ${vendors.length} vendors`);
  };

  const handleDemoLoad = () => {
    loadDemo();
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col items-center justify-start py-8 px-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217, 190, 126,0.03)_0%,_transparent_70%)]" />

      {/* Hero */}
      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D9BE7E] to-[#8FB27A] flex items-center justify-center shadow-lg shadow-[#D9BE7E]/20">
            <Shield className="w-7 h-7 text-[#0A1410]" />
          </div>
          <h1 className="text-4xl font-display font-bold text-[#F2E8D5]">
            Procure<span className="gradient-text-teal">Guard</span> AI
          </h1>
        </div>
        <p className="text-[#A3A88F] text-lg max-w-xl mx-auto">
          The system that sees what auditors miss. Automated fraud detection across 14 risk rules.
        </p>
      </div>

      {/* Upload Zone */}
      {step === "upload" && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer relative z-10 ${
              dragOver
                ? "border-[#D9BE7E] bg-[#D9BE7E]/5"
                : "border-[#24402E] hover:border-[#D9BE7E]/40 hover:bg-[#D9BE7E]/3"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInput} className="hidden" />
            <FileSpreadsheet className="w-14 h-14 mx-auto mb-4 text-[#2B4A36]" />
            <p className="text-[#F2E8D5] text-lg font-medium mb-2">
              Drop CSV or Excel file here
            </p>
            <p className="text-[#A3A88F] text-sm">
              Supports Indian procurement formats with fuzzy column mapping
            </p>
          </div>

          {/* Demo Button */}
          <div className="mt-8 flex items-center gap-4 relative z-10">
            <Button
              onClick={handleDemoLoad}
              disabled={isScanning}
              className="bg-[#D9BE7E] text-[#0A1410] hover:bg-[#C2A86A] font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#D9BE7E]/20 active:scale-[0.97]"
            >
              <Play className="w-4 h-4 mr-2" />
              {isScanning ? "Scanning..." : "Load Demo Dataset"}
            </Button>
            <span className="text-[#A3A88F] text-sm">30 tenders with planted fraud patterns</span>
          </div>

          {/* Info Cards */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl w-full relative z-10">
            <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#D9BE7E]/20 transition-all">
              <Database className="w-5 h-5 text-[#D9BE7E] mb-3" />
              <h3 className="text-[#F2E8D5] text-sm font-medium">14 Detection Rules</h3>
              <p className="text-[#A3A88F] text-xs mt-1.5">Shared directors, cartels, Benford deviation, bid rotation, and more</p>
            </div>
            <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#E0A83C]/20 transition-all">
              <Upload className="w-5 h-5 text-[#E0A83C] mb-3" />
              <h3 className="text-[#F2E8D5] text-sm font-medium">CSV/Excel Import</h3>
              <p className="text-[#A3A88F] text-xs mt-1.5">Fuzzy column mapping with auto-detection of Indian formats</p>
            </div>
            <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#D9503F]/20 transition-all">
              <FileSpreadsheet className="w-5 h-5 text-[#D9503F] mb-3" />
              <h3 className="text-[#F2E8D5] text-sm font-medium">Export Results</h3>
              <p className="text-[#A3A88F] text-xs mt-1.5">Download flagged results to Excel with full evidence</p>
            </div>
          </div>
        </>
      )}

      {/* Column Mapping */}
      {step === "mapping" && (
        <div className="w-full max-w-3xl relative z-10 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-[#86B96A]" />
            <h2 className="text-xl font-display font-bold text-[#F2E8D5]">Column Mapping</h2>
          </div>
          <p className="text-[#A3A88F] text-sm -mt-4">Verify and adjust the auto-detected column mappings below</p>

          <div className="bg-[#132218] rounded-xl border border-[#24402E] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#D9BE7E]" />
                <span className="text-[#F2E8D5] text-sm font-medium">{fileName}</span>
              </div>
              <span className="text-xs text-[#A3A88F] font-mono">{rawData.length} rows &middot; {rawHeaders.length} columns</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(mapping) as [keyof ColumnMapping, string][]).map(([field, value]) => (
                <div key={field} className="flex items-center gap-2">
                  <label className="text-xs text-[#A3A88F] w-28 shrink-0 font-mono uppercase tracking-wider">{field}</label>
                  <select
                    value={value}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="flex-1 bg-[#0A1410] border border-[#24402E] rounded-lg px-3 py-1.5 text-xs text-[#F2E8D5] focus:border-[#D9BE7E]/50 focus:outline-none"
                  >
                    <option value="">-- Skip --</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {value && <CheckCircle2 className="w-3.5 h-3.5 text-[#86B96A]" />}
                  {!value && <AlertCircle className="w-3.5 h-3.5 text-[#E0A83C]" />}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={processMappedData}
                className="bg-[#D9BE7E] text-[#0A1410] hover:bg-[#C2A86A] font-semibold active:scale-[0.97]"
              >
                <Cpu className="w-4 h-4 mr-2" />
                Run Detection Engine
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scanning Console */}
      {(step === "scanning" || isScanning) && (
        <div className="w-full max-w-2xl mt-8 relative z-10">
          <div className="bg-[#0A1410] rounded-xl border border-[#24402E] overflow-hidden shadow-xl shadow-black/30">
            <div className="px-4 py-2.5 border-b border-[#24402E] flex items-center justify-between bg-[#0E1A14]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#D9BE7E]" />
                <span className="text-xs text-[#D9BE7E] font-mono uppercase tracking-wider">Detection Engine Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#D9BE7E] pulse-dot" />
                <span className="text-xs text-[#A3A88F] font-mono">{scanProgress}%</span>
              </div>
            </div>
            <Progress value={scanProgress} className="h-0.5 rounded-none" />
            <div className="p-4 h-52 overflow-y-auto font-mono text-xs space-y-1.5">
              {consoleLogs.map((log, i) => (
                <div key={i} className="text-[#A3A88F]">
                  <span className="text-[#D9BE7E]">&gt;</span> {log}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Scan Complete */}
      {step === "done" && (
        <div className="w-full max-w-2xl mt-6 relative z-10">
          <div className="bg-[#132218] rounded-xl border border-[#86B96A]/30 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#86B96A]" />
            <h2 className="text-xl font-display font-bold text-[#F2E8D5] mb-1">Scan Complete</h2>
            <p className="text-[#A3A88F] text-sm mb-4">
              {vendorScores.length} vendors analyzed &middot; {vendorScores.filter((s) => s.totalScore > 20).length} flagged &middot; {tenders.length} tenders processed
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={() => setLocation("/dashboard")}
                className="bg-[#D9BE7E] text-[#0A1410] hover:bg-[#C2A86A] font-semibold active:scale-[0.97]"
              >
                View Dashboard
              </Button>
              <Button
                onClick={() => setLocation("/flagged")}
                variant="outline"
                className="border-[#D9503F]/30 text-[#D9503F] hover:bg-[#D9503F]/10 active:scale-[0.97]"
              >
                View Flagged Cases
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
