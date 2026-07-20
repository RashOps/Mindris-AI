import { afterAll, describe, expect, test } from "bun:test";

import { generateHtml } from "../templates/engine";
import { getBrowserManager } from "./browser-manager";
import { generatePDF } from "./generator";

const TEMPLATE_FAMILIES = [
  { family: "generalist", templateId: "modern", format: "A4" },
  { family: "engineering", templateId: "compact", format: "Letter" },
  { family: "ats", templateId: "ats", format: "A4" },
  { family: "early-career", templateId: "student", format: "Letter" },
  { family: "editorial", templateId: "creative", format: "A4" },
] as const;

function exportFixture(format: "A4" | "Letter") {
  return {
    global_settings: {
      page: { format },
      layout: { columns: 2, sidebar_position: "right" },
      sections: [
        {
          id: "experience",
          type: "experience",
          label: "Experience",
          visible: true,
          placement: "main",
        },
        {
          id: "skills",
          type: "skills",
          label: "Skills",
          visible: true,
          placement: "sidebar",
        },
      ],
    },
    profile: {
      full_name: "Ada Lovelace",
      title: "Software Engineer",
      email: "ada@example.com",
      location: { city: "London", country: "UK" },
      socials: [],
      text_markdown: "Evidence-driven product engineering.",
    },
    experience: [
      {
        role: "Engineer",
        company: "Analytical Engines",
        period: "1842 - 1843",
        location: { city: "London", country: "UK" },
        description_markdown: "Built reliable rendering systems.",
        keywords: ["Architecture", "Delivery"],
      },
    ],
    skills: [{ category: "Core", skills: ["TypeScript", "Python"] }],
  };
}

function mediaBox(pdf: Buffer): { width: number; height: number } {
  const match = pdf
    .toString("latin1")
    .match(/\/MediaBox\s*\[0\s+0\s+([\d.]+)\s+([\d.]+)\]/);
  if (!match) throw new Error("Generated PDF does not expose a MediaBox.");
  return { width: Number(match[1]), height: Number(match[2]) };
}

afterAll(async () => {
  await getBrowserManager().close();
});

describe("template family PDF exports", () => {
  for (const { family, templateId, format } of TEMPLATE_FAMILIES) {
    test(`${family} exports ${format} as a real PDF`, async () => {
      const html = generateHtml(exportFixture(format), templateId);
      const result = await generatePDF(html, `${family}-${format}.pdf`, true);

      expect(Buffer.isBuffer(result)).toBe(true);
      const pdf = result as Buffer;
      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(pdf.byteLength).toBeGreaterThan(5_000);
      const page = mediaBox(pdf);
      if (format === "Letter") {
        expect(page.width).toBeGreaterThan(611);
        expect(page.width).toBeLessThan(613);
        expect(page.height).toBeGreaterThan(790);
        expect(page.height).toBeLessThan(793);
      } else {
        expect(page.width).toBeGreaterThan(594);
        expect(page.width).toBeLessThan(596);
        expect(page.height).toBeGreaterThan(841);
        expect(page.height).toBeLessThan(843);
      }
    }, 60_000);
  }
});
