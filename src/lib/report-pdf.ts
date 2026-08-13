import { jsPDF } from "jspdf";
import type { FarmerProfile } from "@/lib/auth";
import type { FeasibilityResult } from "@/lib/poultry-calc";
import type { CountyBylawResult } from "@/lib/bylaws.functions";

const GREEN = [15, 61, 46] as const; // #0F3D2E, matches the project's poster branding
const GOLD = [232, 163, 61] as const; // #E8A33D
const INK = [30, 30, 30] as const;
const MUTED = [110, 110, 110] as const;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function stageLabel(s: FarmerProfile["startingStage"]) {
  return s === "chick" ? "day-old chicks" : s === "grower" ? "growers" : "point-of-lay birds";
}

export function generateFeasibilityPdf(opts: {
  farmerName: string;
  profile: FarmerProfile;
  result: FeasibilityResult;
  bylawResult: CountyBylawResult | null;
}) {
  const { farmerName, profile, result, bylawResult } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // --- Header band ---------------------------------------------------
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PoultryFit Kenya", MARGIN, 18);
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text("Feasibility report", MARGIN, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  const today = new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Prepared for ${farmerName} · ${today}`, MARGIN, 33);
  y = 48;

  // --- Your setup ------------------------------------------------------
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Your setup", MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const setupLines = [
    `Location: ${profile.county}${profile.ward ? `, ${profile.ward} ward` : ""}`,
    `Space: ${profile.spaceM2} m²${profile.lengthM && profile.widthM ? ` (${profile.lengthM}m x ${profile.widthM}m)` : ""}, housing: ${profile.housing.replace("-", " ")}`,
    `Budget: KES ${profile.budgetKes.toLocaleString()}`,
    `Goal: ${profile.goal}, experience: ${profile.experience.replace("-", " ")}`,
    `Starting stage: ${stageLabel(profile.startingStage)}`,
    `Poultry: ${profile.poultryTypes?.length ? profile.poultryTypes.map((t) => t.replace("-", " ")).join(", ") : "chicken"}`,
  ];
  for (const line of setupLines) {
    ensureSpace(6);
    doc.text(line, MARGIN, y);
    y += 6;
  }
  y += 4;

  // --- Recommended flock -------------------------------------------------
  ensureSpace(30);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_W, 26, 3, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("RECOMMENDED FLOCK", MARGIN + 6, y + 8);
  doc.setFontSize(24);
  doc.setTextColor(...GREEN);
  doc.text(`${result.recommended} birds`, MARGIN + 6, y + 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Limited by ${result.bindingConstraint}`, MARGIN + 70, y + 19);
  y += 34;

  // --- Constraints table ---------------------------------------------
  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("How that number was reached", MARGIN, y);
  y += 7;

  const rows: { label: string; value: number | null; hint: string; binding: boolean }[] = [
    {
      label: "By space",
      value: result.maxBySpace,
      hint: `${profile.spaceM2} m² available`,
      binding: result.bindingConstraint === "space",
    },
    {
      label: "By budget",
      value: result.maxByBudget,
      hint: `KES ${profile.budgetKes.toLocaleString()} startup budget`,
      binding: result.bindingConstraint === "budget",
    },
  ];
  if (result.maxByBylaw !== null) {
    rows.push({
      label: `By ${profile.county} bylaw`,
      value: result.maxByBylaw,
      hint: "Advisory maximum for urban backyard keepers",
      binding: result.bindingConstraint === "bylaw",
    });
  }

  for (const row of rows) {
    ensureSpace(14);
    if (row.binding) {
      doc.setFillColor(...GREEN);
      doc.rect(MARGIN, y - 4.5, 2, 12, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(row.label, MARGIN + 5, y);
    doc.text(`${row.value} birds`, MARGIN + CONTENT_W - 25, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(row.hint, MARGIN + 5, y + 5);
    y += 13;
  }
  y += 2;

  // --- Budget breakdown ------------------------------------------------
  ensureSpace(24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Your budget, broken down", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(
    `${result.recommended} birds x KES ${result.budget.costPerBird} = KES ${result.budget.stockCost.toLocaleString()} on stock`,
    MARGIN,
    y,
  );
  y += 6;
  const feedLine =
    result.budget.feedWeeksCovered !== null
      ? `KES ${result.budget.feedBudgetRemaining.toLocaleString()} left for feed, about ${result.budget.feedWeeksCovered} weeks at current prices`
      : `KES ${result.budget.feedBudgetRemaining.toLocaleString()} left for feed`;
  doc.text(feedLine, MARGIN, y);
  y += 6;
  if (result.budget.feedWeeksCovered !== null && result.budget.feedWeeksCovered < result.budget.feedReserveWeeks) {
    doc.setTextColor(176, 96, 25);
    doc.setFont("helvetica", "bold");
    doc.text(`Tight: this plan targets a ${result.budget.feedReserveWeeks}-week feed reserve, this budget falls short.`, MARGIN, y);
    y += 6;
  }
  y += 2;

  // --- Bylaw / regulation guidance -----------------------------------
  const bylaw = bylawResult?.countyBylaw ?? null;
  const hasSummary = !!bylaw?.bylaw_summary && bylaw.bylaw_summary.trim().length > 0;

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`${profile.county} County guidance`, MARGIN, y);
  y += 7;

  if (hasSummary && bylaw) {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(bylaw.permit_required ? 176 : 21, bylaw.permit_required ? 96 : 128, bylaw.permit_required ? 25 : 61);
    doc.text(bylaw.permit_required ? "PERMIT REQUIRED" : "NO PERMIT NEEDED", MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const summaryLines = doc.splitTextToSize(bylaw.bylaw_summary ?? "", CONTENT_W);
    ensureSpace(summaryLines.length * 5 + 4);
    doc.text(summaryLines, MARGIN, y);
    y += summaryLines.length * 5 + 5;

    const checklist: { label: string; detail: string }[] = [];
    if (bylaw.permit_required) {
      checklist.push({ label: "Get a keeping permit", detail: "Visit your ward or sub-county livestock office before you start." });
    }
    if (bylaw.setback_meters !== null) {
      checklist.push({ label: `Keep ${bylaw.setback_meters}m from your neighbour`, detail: "Minimum coop distance from the property boundary." });
    }
    if (bylaw.max_birds_residential !== null) {
      checklist.push({ label: `Stay at or under ${bylaw.max_birds_residential} birds`, detail: "Advisory maximum for a residential/urban plot in this county." });
    }
    if (bylaw.notes) {
      checklist.push({ label: "One more thing", detail: bylaw.notes });
    }

    if (checklist.length > 0) {
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text("BEFORE YOU START", MARGIN, y);
      y += 6;

      checklist.forEach((item, i) => {
        const detailLines = doc.splitTextToSize(item.detail, CONTENT_W - 8);
        ensureSpace(6 + detailLines.length * 4.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...INK);
        doc.text(`${i + 1}. ${item.label}`, MARGIN, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(detailLines, MARGIN + 5, y);
        y += detailLines.length * 4.5 + 3;
      });
    }

    if (bylaw.source_url) {
      ensureSpace(6);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Source: ${bylaw.source_url}`, MARGIN, y);
      y += 5;
    }
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(`No specific bylaw is on record for ${profile.county} County. National regulations apply:`, MARGIN, y);
    y += 8;

    const regs = bylawResult?.nationalRegulations ?? [];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    if (regs.length > 0) {
      ensureSpace(6);
      doc.text("BEFORE YOU START", MARGIN, y);
      y += 6;
    }
    regs.forEach((reg, i) => {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(`${i + 1}. ${reg.category ?? "Regulation"}`, MARGIN, y);
      y += 5;
      if (reg.requirement) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        const reqLines = doc.splitTextToSize(reg.requirement, CONTENT_W - 5);
        ensureSpace(reqLines.length * 4.5);
        doc.text(reqLines, MARGIN + 5, y);
        y += reqLines.length * 4.5 + 2;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`${reg.legal_instrument ?? ""}${reg.source ? ` · ${reg.source}` : ""}`, MARGIN + 5, y);
      y += 6;
    });
  }

  // --- Footer on every page --------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "This report is a planning aid, not a legal document. Confirm requirements with your county office before starting.",
      MARGIN,
      PAGE_H - 10,
      { maxWidth: CONTENT_W },
    );
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN - 20, PAGE_H - 10);
  }

  const filenameSafeCounty = profile.county.replace(/[^a-z0-9]+/gi, "-");
  doc.save(`poultryfit-feasibility-${filenameSafeCounty}.pdf`);
}