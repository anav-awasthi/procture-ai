import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/detectionEngine";
import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const { vendorScores, tenders, vendors } = useApp();
  const benfordRef = useRef<HTMLDivElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const chartInstances = useRef<echarts.ECharts[]>([]);

  useEffect(() => {
    if (vendorScores.length === 0) return;

    // Benford's Law Chart
    if (benfordRef.current) {
      const chart = echarts.init(benfordRef.current);
      chartInstances.current.push(chart);
      const allAmounts = tenders.flatMap((t) => t.bidders.map((b) => b.quotedAmount));
      const digitCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      allAmounts.forEach((a) => {
        let n = Math.abs(a);
        while (n >= 10) n = n / 10;
        const d = Math.floor(n);
        if (d >= 1 && d <= 9) digitCounts[d]++;
      });
      const total = allAmounts.length;
      const expected = [0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
      const observed = digitCounts.map((c) => (c / total) * 100);

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis" },
        legend: { data: ["Observed", "Benford Expected"], textStyle: { color: "#A3A88F" }, top: 0 },
        xAxis: { type: "category", data: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], axisLabel: { color: "#A3A88F" }, axisLine: { lineStyle: { color: "#24402E" } } },
        yAxis: { type: "value", name: "%", axisLabel: { color: "#A3A88F" }, splitLine: { lineStyle: { color: "#24402E" } } },
        series: [
          { name: "Observed", type: "bar", data: observed.slice(1), itemStyle: { color: "#D9BE7E" } },
          { name: "Benford Expected", type: "line", data: expected.slice(1), smooth: true, lineStyle: { color: "#D9503F", width: 2 }, itemStyle: { color: "#D9503F" } },
        ],
        grid: { left: 40, right: 10, top: 30, bottom: 30 },
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(benfordRef.current);
    }

    // Department Spend
    if (deptRef.current) {
      const chart = echarts.init(deptRef.current);
      chartInstances.current.push(chart);
      const deptMap = new Map<string, number>();
      tenders.forEach((t) => {
        if (!deptMap.has(t.department)) deptMap.set(t.department, 0);
        deptMap.set(t.department, deptMap.get(t.department)! + t.estimatedCost);
      });
      const deptData = Array.from(deptMap.entries()).sort((a, b) => b[1] - a[1]);

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (params: any) => `${params[0].name}<br/>${formatCurrency(params[0].value)}` },
        xAxis: { type: "value", axisLabel: { color: "#A3A88F" }, splitLine: { lineStyle: { color: "#24402E" } } },
        yAxis: { type: "category", data: deptData.map((d) => d[0].substring(0, 30)), axisLabel: { color: "#A3A88F", fontSize: 10 } },
        series: [{
          type: "bar",
          data: deptData.map((d) => ({ value: d[1], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "#D9BE7E" }, { offset: 1, color: "#8FB27A" }]) } })),
          barWidth: "60%",
        }],
        grid: { left: 160, right: 20, top: 10, bottom: 10 },
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(deptRef.current);
    }

    // Tender Timeline
    if (timelineRef.current) {
      const chart = echarts.init(timelineRef.current);
      chartInstances.current.push(chart);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthly = new Array(12).fill(0);
      tenders.forEach((t) => {
        const month = new Date(t.date).getMonth();
        if (month >= 0 && month < 12) monthly[month]++;
      });

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", data: months, axisLabel: { color: "#A3A88F" }, axisLine: { lineStyle: { color: "#24402E" } } },
        yAxis: { type: "value", axisLabel: { color: "#A3A88F" }, splitLine: { lineStyle: { color: "#24402E" } } },
        series: [{
          type: "line",
          data: monthly,
          smooth: true,
          lineStyle: { color: "#D9BE7E", width: 2 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(217, 190, 126,0.3)" }, { offset: 1, color: "rgba(217, 190, 126,0)" }]) },
          itemStyle: { color: "#D9BE7E" },
        }],
        grid: { left: 40, right: 10, top: 10, bottom: 30 },
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(timelineRef.current);
    }

    // Rule Trigger Frequency
    if (ruleRef.current) {
      const chart = echarts.init(ruleRef.current);
      chartInstances.current.push(chart);
      const ruleNames = ["Shared Directors", "Shared Address", "Shared Phone", "Shared Email", "Similar Names", "Cartel Spacing", "Bid Rotation", "Near Estimate", "Repeat Winner", "New Company", "Single Bidder", "Benford", "Round Numbers", "Price Inflation"];
      const triggerCounts = new Array(14).fill(0);
      vendorScores.forEach((v) => {
        v.rules.forEach((r) => {
          if (r.ruleId >= 1 && r.ruleId <= 14) triggerCounts[r.ruleId - 1]++;
        });
      });

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        xAxis: { type: "category", data: ruleNames.map((n) => n.substring(0, 14)), axisLabel: { color: "#A3A88F", fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: "#24402E" } } },
        yAxis: { type: "value", axisLabel: { color: "#A3A88F" }, splitLine: { lineStyle: { color: "#24402E" } } },
        series: [{
          type: "bar",
          data: triggerCounts.map((c) => ({ value: c, itemStyle: { color: c > 0 ? "#D9503F" : "#2B4A36" } })),
          barWidth: "60%",
        }],
        grid: { left: 40, right: 10, top: 10, bottom: 50 },
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(ruleRef.current);
    }

    return () => {
      chartInstances.current.forEach((c) => c.dispose());
      chartInstances.current = [];
    };
  }, [vendorScores, tenders, vendors]);

  if (vendorScores.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-[#2B4A36]" />
          <h2 className="text-xl text-[#F2E8D5] mb-2">No Analytics Data</h2>
          <p className="text-[#A3A88F]">Load the demo dataset to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-[#F2E8D5]">Analytics</h1>
        <p className="text-[#A3A88F] text-sm mt-1">Statistical analysis across all procurement records</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-3">Benford's Law Deviation</h3>
          <p className="text-[#A3A88F] text-xs mb-3">Comparing observed first-digit distribution against Benford's expected distribution. Deviations suggest fabricated amounts.</p>
          <div ref={benfordRef} className="h-64" />
        </div>
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-3">Department Spend</h3>
          <p className="text-[#A3A88F] text-xs mb-3">Total contract value by department. Large outliers may indicate inflated estimates.</p>
          <div ref={deptRef} className="h-64" />
        </div>
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-3">Tender Timeline</h3>
          <p className="text-[#A3A88F] text-xs mb-3">Monthly distribution of tenders. Clusters may indicate rushed or batched procurement.</p>
          <div ref={timelineRef} className="h-64" />
        </div>
        <div className="bg-[#132218] rounded-xl p-5 border border-[#24402E]">
          <h3 className="text-[#F2E8D5] font-medium mb-3">Rule Trigger Frequency</h3>
          <p className="text-[#A3A88F] text-xs mb-3">How often each detection rule was triggered across all vendors.</p>
          <div ref={ruleRef} className="h-64" />
        </div>
      </div>
    </div>
  );
}
