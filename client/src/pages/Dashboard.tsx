import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/detectionEngine";
import { useLocation } from "wouter";
import { AlertTriangle, Building2, FileText, Shield, TrendingUp, Users, Cpu } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import * as echarts from "echarts";

function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(target);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (target === 0 || hasAnimated) {
      setCount(target);
      return;
    }
    const duration = 800;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      current += increment;
      if (frame >= steps) {
        setCount(target);
        clearInterval(timer);
        setHasAnimated(true);
      } else {
        setCount(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return <span>{prefix}{count.toLocaleString("en-IN")}{suffix}</span>;
}

function ScoreDial({ score, size = 48 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#D9503F" : score >= 50 ? "#E0A83C" : score >= 25 ? "#CE8F33" : "#86B96A";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="40" fill="none" stroke="#24402E" strokeWidth="4" />
        <circle
          cx="45" cy="45" r="40" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.23, 1, 0.32, 1)", transformOrigin: "45px 45px" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold font-mono" style={{ color, fontSize: size * 0.22 }}>{score}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { vendorScores, tenders, vendors, isScanning } = useApp();
  const [, setLocation] = useLocation();
  const chartRef = useRef<HTMLDivElement>(null);
  const riskChartRef = useRef<HTMLDivElement>(null);

  const flaggedCount = vendorScores.filter((v) => v.totalScore > 20).length;
  const criticalCount = vendorScores.filter((v) => v.riskLevel === "critical").length;
  const highCount = vendorScores.filter((v) => v.riskLevel === "high").length;
  const totalValue = tenders.reduce((sum, t) => sum + t.estimatedCost, 0);
  const flaggedValue = vendorScores
    .filter((v) => v.totalScore > 20)
    .reduce((sum, v) => {
      const vendor = vendors.find((vd) => vd.vendorId === v.vendorId);
      return sum + (vendor?.totalValue || 0);
    }, 0);

  useEffect(() => {
    if (!chartRef.current || vendorScores.length === 0) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: vendorScores.slice(0, 10).map((v) => v.vendorName.substring(0, 18)),
        axisLine: { lineStyle: { color: "#24402E" } },
        axisLabel: { color: "#A3A88F", fontSize: 10, rotate: 25 },
      },
      yAxis: {
        type: "value",
        max: 100,
        axisLine: { lineStyle: { color: "#24402E" } },
        axisLabel: { color: "#A3A88F" },
        splitLine: { lineStyle: { color: "#24402E" } },
      },
      series: [{
        type: "bar",
        data: vendorScores.slice(0, 10).map((v) => ({
          value: v.totalScore,
          itemStyle: {
            color: v.totalScore >= 75 ? "#D9503F" : v.totalScore >= 50 ? "#E0A83C" : "#D9BE7E",
          },
        })),
        barWidth: "60%",
        animationDuration: 1500,
      }],
      grid: { left: 40, right: 10, top: 10, bottom: 50 },
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);
    return () => { chart.dispose(); resizeObserver.disconnect(); };
  }, [vendorScores]);

  useEffect(() => {
    if (!riskChartRef.current || vendorScores.length === 0) return;
    const chart = echarts.init(riskChartRef.current);
    const riskData = [
      { value: vendorScores.filter((v) => v.riskLevel === "clean").length, name: "Clean", itemStyle: { color: "#86B96A" } },
      { value: vendorScores.filter((v) => v.riskLevel === "low").length, name: "Low", itemStyle: { color: "#D9BE7E" } },
      { value: vendorScores.filter((v) => v.riskLevel === "medium").length, name: "Medium", itemStyle: { color: "#E0A83C" } },
      { value: vendorScores.filter((v) => v.riskLevel === "high").length, name: "High", itemStyle: { color: "#E8836B" } },
      { value: vendorScores.filter((v) => v.riskLevel === "critical").length, name: "Critical", itemStyle: { color: "#D9503F" } },
    ];
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [{
        type: "pie",
        radius: ["45%", "72%"],
        avoidLabelOverlap: true,
        label: { color: "#A3A88F", fontSize: 11 },
        data: riskData,
        animationDuration: 1500,
      }],
    });
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(riskChartRef.current);
    return () => { chart.dispose(); resizeObserver.disconnect(); };
  }, [vendorScores]);

  if (vendorScores.length === 0 && !isScanning) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#132218] border border-[#24402E] flex items-center justify-center">
            <Cpu className="w-10 h-10 text-[#2B4A36]" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#F2E8D5] mb-3">System Standby</h2>
          <p className="text-[#A3A88F] mb-6">No procurement data loaded. Navigate to Upload or load the demo dataset to activate detection.</p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-2.5 bg-[#D9BE7E] text-[#0A1410] rounded-lg font-semibold hover:bg-[#C2A86A] transition-all active:scale-[0.97]"
          >
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-3 border-[#D9BE7E]/20 border-t-[#D9BE7E] animate-spin" />
          <p className="text-[#A3A88F] font-mono text-sm">Detection engine scanning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Command Dashboard</h1>
          <p className="text-[#A3A88F] text-sm mt-1">Real-time procurement fraud analysis</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#86B96A]/10 border border-[#86B96A]/20">
          <div className="w-2 h-2 rounded-full bg-[#86B96A] pulse-dot" />
          <span className="text-xs text-[#86B96A] font-mono">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#D9BE7E]/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#D9BE7E]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#D9BE7E]" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F2E8D5]">
            <AnimatedCounter target={tenders.length} />
          </div>
          <p className="text-[#A3A88F] text-xs mt-1">Tenders Analyzed</p>
        </div>

        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#D9503F]/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#D9503F]/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#D9503F]" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-[#D9503F]">
            <AnimatedCounter target={flaggedCount} />
          </div>
          <p className="text-[#A3A88F] text-xs mt-1">Vendors Flagged</p>
        </div>

        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#E0A83C]/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#E0A83C]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#E0A83C]" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-[#E0A83C]">
            {formatCurrency(flaggedValue)}
          </div>
          <p className="text-[#A3A88F] text-xs mt-1">Flagged Value</p>
        </div>

        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E] hover:border-[#86B96A]/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#86B96A]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#86B96A]" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-[#86B96A]">
            <AnimatedCounter target={vendors.length} />
          </div>
          <p className="text-[#A3A88F] text-xs mt-1">Vendor Profiles</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-4">Top Risk Scores</h3>
          <div ref={chartRef} className="h-[288px]" />
        </div>
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-4">Risk Distribution</h3>
          <div ref={riskChartRef} className="h-[288px]" />
        </div>
      </div>

      {/* Flagged Vendors Quick View */}
      <div className="bg-[#132218] rounded-xl border border-[#24402E] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#24402E] flex items-center justify-between">
          <h3 className="text-[#F2E8D5] font-medium">Flagged Vendor Registry</h3>
          <button onClick={() => setLocation("/flagged")} className="text-xs text-[#D9BE7E] hover:text-[#D9BE7E]/80 transition-colors">
            View All →
          </button>
        </div>
        <div className="divide-y divide-[#24402E]">
          {vendorScores.filter((v) => v.totalScore > 20).slice(0, 8).map((v, i) => (
            <div
              key={v.vendorId}
              className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
              onClick={() => setLocation("/dossiers")}
            >
              <div className="flex items-center gap-4">
                <ScoreDial score={v.totalScore} size={52} />
                <div>
                  <p className="text-[#F2E8D5] text-sm font-medium">{v.vendorName}</p>
                  <p className="text-[#A3A88F] text-xs">{v.rules.length} rules triggered</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                v.riskLevel === "critical" ? "bg-[#D9503F]/10 text-[#D9503F]" :
                v.riskLevel === "high" ? "bg-[#E0A83C]/10 text-[#E0A83C]" :
                "bg-[#CE8F33]/10 text-[#CE8F33]"
              }`}>
                {v.riskLevel.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
