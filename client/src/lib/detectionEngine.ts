/**
 * ProcureGuard AI - Fraud Detection Engine
 * Implements 14 detection rules scoring vendors 0-100.
 * Clean vendors must score near zero.
 */

import type { TenderRecord, VendorInfo } from "./demoData";

export interface DetectionResult {
  ruleId: number;
  ruleName: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  details: string;
  evidence: Evidence[];
}

export interface Evidence {
  type: string;
  label: string;
  value: string;
}

export interface VendorScore {
  vendorId: string;
  vendorName: string;
  totalScore: number;
  maxPossibleScore: number;
  riskLevel: "clean" | "low" | "medium" | "high" | "critical";
  rules: DetectionResult[];
  dossier: DossierEntry[];
}

export interface DossierEntry {
  id: string;
  title: string;
  scheme: string;
  evidence: string;
  nextStep: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface RelationshipEdge {
  from: string;
  to: string;
  label: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
}

// --- Utility Functions ---

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  if (longer.length === 0) return 1;
  const distance = levenshteinDistance(normalizeText(a), normalizeText(b));
  return 1 - distance / longer.length;
}

function parseIndianAmount(text: string): number {
  const cleaned = text.replace(/[₹,，\s]/g, "").replace(/lakhs?/gi, "00000").replace(/crores?/gi, "00000000");
  return parseFloat(cleaned) || 0;
}

function daysBetween(d1: string, d2: string): number {
  return Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
}

// --- Benford's Law ---

function firstDigit(n: number): number {
  const abs = Math.abs(n);
  if (abs < 1) return Math.floor(abs * 10);
  while (abs >= 10) return firstDigit(abs / 10);
  return Math.floor(abs);
}

function benfordDeviation(amounts: number[]): { score: number; chiSquare: number } {
  const expected = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  amounts.forEach((a) => {
    const d = firstDigit(a);
    if (d >= 1 && d <= 9) counts[d]++;
  });
  const total = amounts.length;
  let chiSquare = 0;
  for (let i = 1; i <= 9; i++) {
    const observed = counts[i];
    const exp = expected[i] * total;
    chiSquare += ((observed - exp) ** 2) / exp;
  }
  const score = Math.min(100, (chiSquare / 20) * 100);
  return { score, chiSquare };
}

// --- 14 Detection Rules ---
// Each rule returns a Map of vendorId -> DetectionResult
// Scores are capped per-rule. Total is weighted average, not sum.

function rule1SharedDirectors(vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const directorMap = new Map<string, string[]>();

  vendors.forEach((v) => {
    v.directorNames.forEach((d) => {
      const norm = normalizeText(d);
      if (!directorMap.has(norm)) directorMap.set(norm, []);
      directorMap.get(norm)!.push(v.vendorId);
    });
  });

  vendors.forEach((v) => {
    let maxScore = 0;
    const evidence: Evidence[] = [];
    let details = "";

    directorMap.forEach((ids, dir) => {
      if (ids.length > 1 && ids.includes(v.vendorId)) {
        const otherVendors = vendors.filter((ov) => ids.includes(ov.vendorId) && ov.vendorId !== v.vendorId);
        const score = Math.min(80, (ids.length - 1) * 35);
        if (score > maxScore) maxScore = score;
        otherVendors.forEach((ov) => {
          evidence.push({
            type: "shared_director",
            label: `Shared Director: ${dir}`,
            value: `${v.vendorName} ↔ ${ov.vendorName}`,
          });
        });
        if (!details) details = `Director "${dir}" is shared across ${ids.length} companies.`;
      }
    });

    if (maxScore > 0) {
      results.set(v.vendorId, {
        ruleId: 1,
        ruleName: "Shared Directors",
        description: "Multiple vendors share common directors, suggesting shell companies or coordinated bidding",
        severity: maxScore >= 60 ? "critical" : maxScore >= 35 ? "high" : "medium",
        score: maxScore,
        details,
        evidence,
      });
    }
  });

  return results;
}

function rule2SharedAddress(vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const addrMap = new Map<string, string[]>();

  vendors.forEach((v) => {
    const norm = normalizeText(v.address.substring(0, 30));
    if (!addrMap.has(norm)) addrMap.set(norm, []);
    addrMap.get(norm)!.push(v.vendorId);
  });

  vendors.forEach((v) => {
    const norm = normalizeText(v.address.substring(0, 30));
    const ids = addrMap.get(norm) || [];
    if (ids.length > 1) {
      const otherVendors = vendors.filter((ov) => ids.includes(ov.vendorId) && ov.vendorId !== v.vendorId);
      const score = Math.min(70, (ids.length - 1) * 30);
      const evidence = otherVendors.map((ov) => ({
        type: "shared_address",
        label: "Shared Address",
        value: `${v.vendorName} ↔ ${ov.vendorName}: ${v.address}`,
      }));
      results.set(v.vendorId, {
        ruleId: 2,
        ruleName: "Shared Address",
        description: "Vendors registered at the same physical address, indicating potential shell companies",
        severity: score >= 60 ? "critical" : "high",
        score,
        details: `${ids.length} vendors share the address "${v.address}"`,
        evidence,
      });
    }
  });

  return results;
}

function rule3SharedPhone(vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const phoneMap = new Map<string, string[]>();

  vendors.forEach((v) => {
    const norm = v.phone.replace(/[^0-9]/g, "");
    if (!phoneMap.has(norm)) phoneMap.set(norm, []);
    phoneMap.get(norm)!.push(v.vendorId);
  });

  vendors.forEach((v) => {
    const norm = v.phone.replace(/[^0-9]/g, "");
    const ids = phoneMap.get(norm) || [];
    if (ids.length > 1) {
      const otherVendors = vendors.filter((ov) => ids.includes(ov.vendorId) && ov.vendorId !== v.vendorId);
      const score = Math.min(80, (ids.length - 1) * 35);
      const evidence = otherVendors.map((ov) => ({
        type: "shared_phone",
        label: "Shared Phone",
        value: `${v.vendorName} ↔ ${ov.vendorName}: ${v.phone}`,
      }));
      results.set(v.vendorId, {
        ruleId: 3,
        ruleName: "Shared Phone Number",
        description: "Multiple vendors using the same contact phone number",
        severity: score >= 60 ? "critical" : "high",
        score,
        details: `${ids.length} vendors share phone "${v.phone}"`,
        evidence,
      });
    }
  });

  return results;
}

function rule4SharedEmail(vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const emailMap = new Map<string, string[]>();

  vendors.forEach((v) => {
    const norm = v.email.toLowerCase().trim();
    if (!emailMap.has(norm)) emailMap.set(norm, []);
    emailMap.get(norm)!.push(v.vendorId);
  });

  vendors.forEach((v) => {
    const norm = v.email.toLowerCase().trim();
    const ids = emailMap.get(norm) || [];
    if (ids.length > 1) {
      const otherVendors = vendors.filter((ov) => ids.includes(ov.vendorId) && ov.vendorId !== v.vendorId);
      const score = Math.min(90, (ids.length - 1) * 40);
      const evidence = otherVendors.map((ov) => ({
        type: "shared_email",
        label: "Shared Email",
        value: `${v.vendorName} ↔ ${ov.vendorName}: ${v.email}`,
      }));
      results.set(v.vendorId, {
        ruleId: 4,
        ruleName: "Shared Email",
        description: "Multiple vendors using the same email address, strong indicator of common ownership",
        severity: score >= 60 ? "critical" : "high",
        score,
        details: `${ids.length} vendors share email "${v.email}"`,
        evidence,
      });
    }
  });

  return results;
}

function rule5SimilarNames(vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const pairs: { vendorId: string; similarity: number; otherName: string }[] = [];

  for (let i = 0; i < vendors.length; i++) {
    for (let j = i + 1; j < vendors.length; j++) {
      const sim = similarityScore(vendors[i].vendorName, vendors[j].vendorName);
      if (sim > 0.65) {
        pairs.push({ vendorId: vendors[i].vendorId, similarity: sim, otherName: vendors[j].vendorName });
        pairs.push({ vendorId: vendors[j].vendorId, similarity: sim, otherName: vendors[i].vendorName });
      }
    }
  }

  vendors.forEach((v) => {
    const vendorPairs = pairs.filter((p) => p.vendorId === v.vendorId);
    if (vendorPairs.length > 0) {
      const maxSim = Math.max(...vendorPairs.map((p) => p.similarity));
      const score = Math.min(70, Math.round(maxSim * 80));
      const evidence = vendorPairs.map((p) => ({
        type: "similar_name",
        label: "Similar Name",
        value: `${v.vendorName} ≈ ${p.otherName} (${(p.similarity * 100).toFixed(0)}% match)`,
      }));
      results.set(v.vendorId, {
        ruleId: 5,
        ruleName: "Similar Vendor Names",
        description: "Vendor names are suspiciously similar, suggesting deliberate obfuscation",
        severity: maxSim > 0.8 ? "critical" : maxSim > 0.7 ? "high" : "medium",
        score,
        details: `Highest name similarity: ${(maxSim * 100).toFixed(0)}%`,
        evidence,
      });
    }
  });

  return results;
}

function rule6CartelBidSpacing(tenders: TenderRecord[], vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  tenders.forEach((t) => {
    if (t.bidders.length < 3) return; // Need at least 3 bidders for cartel analysis
    const amounts = t.bidders.map((b) => b.quotedAmount).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < amounts.length; i++) {
      const pctDiff = ((amounts[i] - amounts[i - 1]) / amounts[i - 1]) * 100;
      gaps.push(pctDiff);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap < 0.3) {
      t.bidders.forEach((b) => {
        const existing = results.get(b.bidderId);
        if (!existing) {
          results.set(b.bidderId, {
            ruleId: 6,
            ruleName: "Cartel Bid Spacing",
            description: "Bids are suspiciously close together, suggesting pre-arranged cartel pricing",
            severity: "high",
            score: 0,
            details: "",
            evidence: [] as Evidence[],
          });
        }
        const current = results.get(b.bidderId)!;
        current.score = Math.min(100, current.score + 20);
        current.severity = current.score >= 60 ? "critical" : "high";
        current.details = `${t.tenderId}: ${amounts.length} bids within ${avgGap.toFixed(2)}% avg gap`;
        current.evidence.push({
          type: "cartel_spacing",
          label: "Cartel Bid Spacing",
          value: `${t.tenderId}: ${amounts.length} bids, avg gap ${avgGap.toFixed(2)}%`,
        });
      });
    }
  });

  return results;
}

function rule7BidRotation(tenders: TenderRecord[], vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  const deptTenders = new Map<string, TenderRecord[]>();
  tenders.forEach((t) => {
    if (!deptTenders.has(t.department)) deptTenders.set(t.department, []);
    deptTenders.get(t.department)!.push(t);
  });

  deptTenders.forEach((deptTendersList, dept) => {
    const winners: string[] = [];
    deptTendersList.forEach((t) => {
      const winner = t.bidders.find((b) => b.result === "L1");
      if (winner) winners.push(winner.bidderId);
    });

    if (winners.length >= 3) {
      const uniqueWinners = Array.from(new Set(winners));
      if (uniqueWinners.length <= 3 && winners.length >= 4) {
        const patternCount: Record<string, number> = {};
        winners.forEach((w) => {
          patternCount[w!] = (patternCount[w!] || 0) + 1;
        });

        uniqueWinners.forEach((w) => {
          const ratio = patternCount[w!] / winners.length;
          const score = Math.min(85, Math.round(ratio * 90));
          results.set(w!, {
            ruleId: 7,
            ruleName: "Bid Rotation",
            description: "Winners rotate among a small set of vendors in the same department, suggesting a cartel",
            severity: score >= 50 ? "high" : "medium",
            score,
            details: `In ${dept}: ${winners.length} tenders, ${uniqueWinners.length} unique winners. Pattern: ${winners.join("→")}`,
            evidence: [{
              type: "rotation",
              label: "Bid Rotation Pattern",
              value: `Department: ${dept}, Winners: ${winners.join(" → ")}`,
            }],
          });
        });
      }
    }
  });

  return results;
}

function rule8BidsNearEstimate(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  // Count wins per vendor first
  const winCounts: Record<string, number> = {};
  tenders.forEach((t) => {
    const winner = t.bidders.find((b) => b.result === "L1");
    if (winner) winCounts[winner.bidderId] = (winCounts[winner.bidderId] || 0) + 1;
  });

  tenders.forEach((t) => {
    const l1 = t.bidders.find((b) => b.result === "L1");
    if (!l1) return;
    const pctBelow = ((t.estimatedCost - l1.quotedAmount) / t.estimatedCost) * 100;

    // Only flag if within 0.2% AND the vendor has multiple wins (suggesting pattern)
    if (pctBelow >= 0 && pctBelow <= 0.2 && (winCounts[l1.bidderId] || 0) >= 3) {
      const score = Math.min(75, Math.round((1 - pctBelow * 3) * 70));
      results.set(l1.bidderId, {
        ruleId: 8,
        ruleName: "Bid Near Confidential Estimate",
        description: "Winning bid is within 0.2% of the estimated cost with repeated pattern, suggesting insider information leakage",
        severity: score >= 60 ? "high" : "medium",
        score,
        details: `Tender ${t.tenderId}: L1 bid ₹${(l1.quotedAmount / 100000).toFixed(1)}L vs estimate ₹${(t.estimatedCost / 100000).toFixed(1)}L (${pctBelow.toFixed(2)}% below)`,
        evidence: [{
          type: "estimate_proximity",
          label: "Near Estimate",
          value: `${t.tenderId}: Bid ₹${l1.quotedAmount.toLocaleString("en-IN")} vs ₹${t.estimatedCost.toLocaleString("en-IN")} (${pctBelow.toFixed(2)}% below)`,
        }],
      });
    }
  });

  return results;
}

function rule9RepeatWinners(tenders: TenderRecord[], vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const winCounts: Record<string, number> = {};

  tenders.forEach((t) => {
    const winner = t.bidders.find((b) => b.result === "L1");
    if (winner) {
      winCounts[winner.bidderId] = (winCounts[winner.bidderId] || 0) + 1;
    }
  });

  const totalTenders = tenders.length;
  Object.entries(winCounts).forEach(([vendorId, wins]) => {
    const ratio = wins / totalTenders;
    const vendor = vendors.find((v) => v.vendorId === vendorId);
    // Only flag if vendor wins >30% of tenders OR wins >5 tenders
    if ((ratio > 0.30 || wins > 5) && vendor) {
      const score = Math.min(80, Math.round(Math.max(ratio * 100, wins * 10)));
      const wonTenders = tenders.filter((t) => t.bidders.some((b) => b.bidderId === vendorId && b.result === "L1"));
      results.set(vendorId, {
        ruleId: 9,
        ruleName: "Repeat Winner",
        description: "Vendor has won an unusually high percentage of tenders, suggesting favoritism or rigged bidding",
        severity: score >= 60 ? "high" : "medium",
        score,
        details: `${vendor.vendorName}: ${wins} wins out of ${totalTenders} tenders (${(ratio * 100).toFixed(1)}%)`,
        evidence: wonTenders.map((t) => ({
          type: "repeat_win",
          label: "Won Tender",
          value: `${t.tenderId}: ${t.tenderName} — ₹${t.estimatedCost.toLocaleString("en-IN")}`,
        })),
      });
    }
  });

  return results;
}

function rule10NewCompanyWins(tenders: TenderRecord[], vendors: VendorInfo[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const now = new Date();

  vendors.forEach((v) => {
    const regDate = new Date(v.registrationDate);
    const ageInYears = (now.getTime() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageInYears < 2.5 && v.totalWins >= 3) {
      const score = Math.min(70, Math.round((2.5 - ageInYears) * 15 + v.totalWins * 5));
      const recentWins = tenders.filter((t) => t.bidders.some((b) => b.bidderId === v.vendorId && b.result === "L1"));
      results.set(v.vendorId, {
        ruleId: 10,
        ruleName: "New Company Wins",
        description: "Recently registered company winning multiple tenders — potential shell company created for fraud",
        severity: score >= 60 ? "high" : "medium",
        score,
        details: `${v.vendorName}: Registered ${v.registrationDate}, ${v.totalWins} wins in ${ageInYears.toFixed(1)} years`,
        evidence: recentWins.map((t) => ({
          type: "new_company_win",
          label: "Recent Win",
          value: `${t.tenderId}: ${t.tenderName} — ₹${t.estimatedCost.toLocaleString("en-IN")}`,
        })),
      });
    }
  });

  return results;
}

function rule11SingleBidder(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  tenders.forEach((t) => {
    if (t.bidders.length === 1) {
      const winner = t.bidders[0];
      results.set(winner.bidderId, {
        ruleId: 11,
        ruleName: "Single Bidder Tender",
        description: "Tender received only one bid, suggesting other qualified bidders were discouraged or excluded",
        severity: "medium",
        score: 30,
        details: `Tender ${t.tenderId} received only 1 bid from ${winner.vendorName}`,
        evidence: [{
          type: "single_bid",
          label: "Single Bidder",
          value: `${t.tenderId}: Only ${winner.vendorName} bid`,
        }],
      });
    }
  });

  return results;
}

function rule12BenfordDeviation(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();
  const allAmounts = tenders.flatMap((t) => t.bidders.map((b) => b.quotedAmount));

  if (allAmounts.length >= 10) {
    const { score: overallScore, chiSquare } = benfordDeviation(allAmounts);

    // Only flag if deviation is statistically significant (chi-square > 30)
    if (chiSquare > 30) {
      // Only flag vendors whose individual bids deviate significantly from Benford
      const vendorFirstDigits: Record<string, number[]> = {};
      tenders.forEach((t) => {
        t.bidders.forEach((b) => {
          if (!vendorFirstDigits[b.bidderId]) vendorFirstDigits[b.bidderId] = [];
          vendorFirstDigits[b.bidderId].push(b.quotedAmount);
        });
      });

      // Calculate per-vendor Benford deviation
      Object.entries(vendorFirstDigits).forEach(([vendorId, amounts]) => {
        const { chiSquare: vendorChi } = benfordDeviation(amounts);
        // Only flag vendors with individual chi-square > 35
        if (vendorChi > 35) {
          const score = Math.min(50, Math.round(vendorChi * 0.25));
          results.set(vendorId, {
            ruleId: 12,
            ruleName: "Benford's Law Deviation",
            description: "This vendor's bid amounts deviate significantly from Benford's Law, suggesting fabricated pricing",
            severity: score >= 30 ? "high" : "medium",
            score,
            details: `Vendor's bids show abnormal first-digit distribution. χ² = ${vendorChi.toFixed(2)} (threshold: 35)`,
            evidence: [{
              type: "benford",
              label: "Benford Deviation",
              value: `χ² = ${vendorChi.toFixed(2)}, Sample size: ${amounts.length}`,
            }],
          });
        }
      });
    }
  }

  return results;
}

function rule13RoundNumbers(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  // Count round number frequency per vendor
  const vendorRoundCounts: Record<string, { total: number; round: number; examples: { vendorName: string; amount: number; tenderId: string }[] }> = {};
  tenders.forEach((t) => {
    t.bidders.forEach((b) => {
      const amount = b.quotedAmount;
      // Only flag extremely round numbers (ending in 000000 - exact crores or lakhs with no remainder)
      if (amount % 1000000 === 0) {
        if (!vendorRoundCounts[b.bidderId]) vendorRoundCounts[b.bidderId] = { total: 0, round: 0, examples: [] };
        vendorRoundCounts[b.bidderId].total++;
        vendorRoundCounts[b.bidderId].round++;
        vendorRoundCounts[b.bidderId].examples.push({ vendorName: b.vendorName, amount, tenderId: t.tenderId });
      } else {
        if (!vendorRoundCounts[b.bidderId]) vendorRoundCounts[b.bidderId] = { total: 0, round: 0, examples: [] };
        vendorRoundCounts[b.bidderId].total++;
      }
    });
  });

  // Only flag vendors where >60% of their bids are round numbers AND they have at least 3 bids
  Object.entries(vendorRoundCounts).forEach(([vendorId, data]) => {
    if (data.total >= 3 && data.round / data.total > 0.6) {
      const score = Math.min(30, Math.round((data.round / data.total) * 30));
      results.set(vendorId, {
        ruleId: 13,
        ruleName: "Round Number Bids",
        description: "Vendor consistently bids in suspiciously round figures, suggesting estimates rather than actual cost calculations",
        severity: "low",
        score,
        details: `${data.examples[0]?.vendorName || vendorId}: ${data.round} of ${data.total} bids are round numbers (crore-level multiples)`,
        evidence: data.examples.slice(0, 3).map((e) => ({
          type: "round_number",
          label: "Round Number",
          value: `${e.tenderId}: ₹${e.amount.toLocaleString("en-IN")}`,
        })),
      });
    }
  });

  return results;
}

function rule14PriceInflation(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  // Group by similar tender types (department)
  const deptCosts: Record<string, { tenderId: string; vendorId: string; vendorName: string; cost: number }[]> = {};
  tenders.forEach((t) => {
    if (!deptCosts[t.department]) deptCosts[t.department] = [];
    const winner = t.bidders.find((b) => b.result === "L1");
    if (winner) {
      deptCosts[t.department].push({
        tenderId: t.tenderId,
        vendorId: winner.bidderId,
        vendorName: winner.vendorName,
        cost: winner.quotedAmount,
      });
    }
  });

  Object.entries(deptCosts).forEach(([dept, entries]) => {
    if (entries.length < 3) return; // Need enough samples for meaningful stats
    const costs = entries.map((e) => e.cost);
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    const stdDev = Math.sqrt(costs.reduce((sum, c) => sum + (c - avg) ** 2, 0) / costs.length);

    entries.forEach((entry) => {
      const zScore = (entry.cost - avg) / (stdDev || 1);
      if (zScore > 2.0) {
        const score = Math.min(60, Math.round(zScore * 20));
        results.set(entry.vendorId, {
          ruleId: 14,
          ruleName: "Price Inflation",
          description: "Winning bid is statistically inflated compared to department averages",
          severity: zScore > 2.5 ? "high" : "medium",
          score,
          details: `${entry.tenderId}: ₹${entry.cost.toLocaleString("en-IN")} is ${zScore.toFixed(1)}σ above department average of ₹${avg.toLocaleString("en-IN")}`,
          evidence: [{
            type: "price_inflation",
            label: "Price Inflation",
            value: `${entry.tenderId}: Z-score ${zScore.toFixed(2)}, Avg: ₹${avg.toLocaleString("en-IN")}`,
          }],
        });
      }
    });
  });

  return results;
}

// --- Timing Anomaly (statistical outliers) ---

function rule15TimingAnomalies(tenders: TenderRecord[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  tenders.forEach((t) => {
    const bidDates = t.bidders.map((b) => new Date(b.bidDate).getTime());
    const minDate = Math.min(...bidDates);
    const maxDate = Math.max(...bidDates);
    const range = maxDate - minDate;
    const avgDate = bidDates.reduce((a, b) => a + b, 0) / bidDates.length;

    t.bidders.forEach((b) => {
      const bidTime = new Date(b.bidDate).getTime();
      const deviation = Math.abs(bidTime - avgDate) / (range || 1);
      if (deviation > 0.8 && t.bidders.length >= 3) {
        const score = Math.min(40, Math.round(deviation * 40));
        results.set(b.bidderId, {
          ruleId: 15,
          ruleName: "Timing Anomaly",
          description: "Bid submitted at an unusual time relative to other bidders, suggesting late entry or pre-planned timing",
          severity: "low",
          score,
          details: `${b.vendorName} bid at unusual time in ${t.tenderId}`,
          evidence: [{
            type: "timing",
            label: "Timing Anomaly",
            value: `${b.vendorName}: ${b.bidDate} in ${t.tenderId}`,
          }],
        });
      }
    });
  });

  return results;
}

// --- Main Detection Engine ---

export function runAllRules(tenders: TenderRecord[], vendors: VendorInfo[]): VendorScore[] {
  const vendorMap = new Map<string, VendorInfo>();
  vendors.forEach((v) => vendorMap.set(v.vendorId, v));

  // Run all 14 rules
  const r1 = rule1SharedDirectors(vendors);
  const r2 = rule2SharedAddress(vendors);
  const r3 = rule3SharedPhone(vendors);
  const r4 = rule4SharedEmail(vendors);
  const r5 = rule5SimilarNames(vendors);
  const r6 = rule6CartelBidSpacing(tenders, vendors);
  const r7 = rule7BidRotation(tenders, vendors);
  const r8 = rule8BidsNearEstimate(tenders);
  const r9 = rule9RepeatWinners(tenders, vendors);
  const r10 = rule10NewCompanyWins(tenders, vendors);
  const r11 = rule11SingleBidder(tenders);
  const r12 = rule12BenfordDeviation(tenders);
  const r13 = rule13RoundNumbers(tenders);
  const r14 = rule14PriceInflation(tenders);

  const allRules = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14];

  // Rule weights: identity rules are more significant than behavioral
  const ruleWeights: Record<number, number> = {
    1: 1.0,  // Shared Directors - very strong signal
    2: 0.8,  // Shared Address
    3: 0.9,  // Shared Phone
    4: 1.0,  // Shared Email - very strong signal
    5: 0.7,  // Similar Names
    6: 0.5,  // Cartel Spacing - behavioral
    7: 0.6,  // Bid Rotation
    8: 0.7,  // Near Estimate
    9: 0.5,  // Repeat Winners
    10: 0.6, // New Company Wins
    11: 0.3, // Single Bidder - weak signal
    12: 0.4, // Benford - statistical
    13: 0.2, // Round Numbers - weak
    14: 0.4, // Price Inflation
  };

  // Aggregate scores per vendor
  const scores: VendorScore[] = [];

  vendors.forEach((v) => {
    const rules: DetectionResult[] = [];
    allRules.forEach((ruleMap) => {
      const result = ruleMap.get(v.vendorId);
      if (result) rules.push(result);
    });

    // Weighted average instead of sum - prevents over-flagging
    let weightedSum = 0;
    let totalWeight = 0;
    rules.forEach((r) => {
      const weight = ruleWeights[r.ruleId] || 0.5;
      weightedSum += r.score * weight;
      totalWeight += weight;
    });

    const totalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const riskLevel =
      totalScore >= 60 ? "critical" :
      totalScore >= 40 ? "high" :
      totalScore >= 20 ? "medium" :
      totalScore > 0 ? "low" : "clean";

    // Generate dossiers only for flagged vendors
    const dossiers: DossierEntry[] = rules.map((r) => ({
      id: `${v.vendorId}-R${r.ruleId}`,
      title: `Rule ${r.ruleId}: ${r.ruleName}`,
      scheme: r.description,
      evidence: r.evidence.map((e) => e.value).join("\n"),
      nextStep: r.severity === "critical"
        ? "Immediate field investigation recommended. Verify physical existence of offices, interview directors separately."
        : r.severity === "high"
        ? "Cross-reference with MCA21 filings. Request PAN/Aadhaar linking data from IT department."
        : "Monitor future bidding patterns. Request additional documentation from the tendering authority.",
      severity: r.severity,
    }));

    scores.push({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      totalScore,
      maxPossibleScore: 100,
      riskLevel,
      rules,
      dossier: dossiers,
    });
  });

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

// --- Relationship Graph ---

export function buildRelationshipGraph(vendors: VendorInfo[], tenders: TenderRecord[]): {
  nodes: { id: string; label: string; group: string; value: number }[];
  edges: { from: string; to: string; label: string; color: string }[];
} {
  const vendorMap = new Map<string, VendorInfo>();
  vendors.forEach((v) => vendorMap.set(v.vendorId, v));

  const nodeSet = new Set<string>();
  const edgeSet = new Set<string>();
  const nodes: { id: string; label: string; group: string; value: number }[] = [];
  const edges: { from: string; to: string; label: string; color: string }[] = [];

  // Add vendor nodes
  vendors.forEach((v) => {
    if (!nodeSet.has(v.vendorId)) {
      nodes.push({ id: v.vendorId, label: v.vendorName, group: "vendor", value: v.totalWins });
      nodeSet.add(v.vendorId);
    }
  });

  // Add tender nodes and bidder edges
  tenders.forEach((t) => {
    const tenderNodeId = `T_${t.tenderId.replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (!nodeSet.has(tenderNodeId)) {
      nodes.push({ id: tenderNodeId, label: t.tenderId, group: "tender", value: 1 });
      nodeSet.add(tenderNodeId);
    }

    t.bidders.forEach((b) => {
      if (!nodeSet.has(b.bidderId)) {
        nodes.push({ id: b.bidderId, label: b.vendorName, group: "vendor", value: 1 });
        nodeSet.add(b.bidderId);
      }
    });
  });

  // Add director nodes and edges
  const directorMap = new Map<string, string[]>();
  vendors.forEach((v) => {
    v.directorNames.forEach((d) => {
      const norm = normalizeText(d);
      if (!directorMap.has(norm)) directorMap.set(norm, []);
      directorMap.get(norm)!.push(v.vendorId);
    });
  });

  directorMap.forEach((vendorIds, dirName) => {
    if (vendorIds.length > 1) {
      const dirNodeId = `D_${normalizeText(dirName).substring(0, 20)}`;
      if (!nodeSet.has(dirNodeId)) {
        nodes.push({ id: dirNodeId, label: dirName, group: "director", value: vendorIds.length });
        nodeSet.add(dirNodeId);
      }

      vendorIds.forEach((vid) => {
        const edgeKey = `${vid}-${dirNodeId}`;
        if (!edgeSet.has(edgeKey)) {
          edges.push({ from: vid, to: dirNodeId, label: "Director", color: "#D9503F" });
          edgeSet.add(edgeKey);
        }
      });
    }
  });

  // Add edges for shared attributes
  const sharedAttrs = new Map<string, { type: string; vendors: string[] }[]>();
  vendors.forEach((v) => {
    const attrs = [
      { key: `addr_${normalizeText(v.address.substring(0, 30))}`, type: "Shared Address", vendorId: v.vendorId },
      { key: `phone_${v.phone.replace(/[^0-9]/g, "")}`, type: "Shared Phone", vendorId: v.vendorId },
      { key: `email_${v.email.toLowerCase().trim()}`, type: "Shared Email", vendorId: v.vendorId },
    ];
    attrs.forEach((attr) => {
      if (!sharedAttrs.has(attr.key)) sharedAttrs.set(attr.key, []);
      sharedAttrs.get(attr.key)!.push({ type: attr.type, vendors: [attr.vendorId] });
    });
  });

  sharedAttrs.forEach((entries, key) => {
    const vendorIds = entries.map((e) => e.vendors[0]);
    if (vendorIds.length > 1) {
      const type = entries[0].type;
      for (let i = 0; i < vendorIds.length; i++) {
        for (let j = i + 1; j < vendorIds.length; j++) {
          const edgeKey = `${vendorIds[i]}-${vendorIds[j]}-${type}`;
          if (!edgeSet.has(edgeKey)) {
            edges.push({
              from: vendorIds[i],
              to: vendorIds[j],
              label: type,
              color: type.includes("Email") ? "#D9503F" : type.includes("Phone") ? "#E0A83C" : "#E8836B",
            });
            edgeSet.add(edgeKey);
          }
        }
      }
    }
  });

  return { nodes, edges };
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function parseDate(str: string): Date {
  // Handle Indian date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  if (str.includes("/")) {
    const parts = str.split("/");
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts[0].length === 4) return new Date(str);
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(str);
}
