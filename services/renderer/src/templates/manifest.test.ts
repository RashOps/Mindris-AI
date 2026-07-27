import { afterAll, describe, expect, test } from "bun:test";

import { getBrowserManager } from "../pdf/browser-manager";
import { inspectRenderedHtml } from "../pdf/generator";
import { renderDocument } from "./engine";
import {
  overflowCvFixture,
  photoCvFixture,
  shortCvFixture,
} from "./fixtures";

const fixture = {
  global_settings: {
    template_id: "modern",
    page: { format: "A4" },
    layout: { columns: 2, sidebar_position: "right" },
    sections: [
      {
        id: "experience",
        type: "experience",
        label: "Experience",
        placement: "main",
        page_break_before: true,
      },
      {
        id: "skills",
        type: "skills",
        label: "Skills",
        placement: "sidebar",
      },
    ],
  },
  profile: {
    full_name: "Ada Lovelace",
    title: "Engineer",
    email: "ada@example.com",
    location: { city: "London", country: "UK" },
    socials: [],
    text_markdown: "Reliable rendering.",
  },
  experience: [
    {
      role: "Engineer",
      company: "Analytical Engines",
      period: "1842 - 1843",
      location: { city: "London", country: "UK" },
      description_markdown: "Built deterministic systems.",
      keywords: ["Architecture"],
    },
  ],
  skills: [{ category: "Core", skills: ["TypeScript", "Python"] }],
};

afterAll(async () => {
  await getBrowserManager().close();
});

describe("render manifest", () => {
  test("measures stable semantic sections after layout settles", async () => {
    const rendered = renderDocument(fixture, "modern");
    const identity = {
      resumeId: 12,
      resumeRevision: 18,
      contentHash: rendered.contentHash,
      templateId: rendered.template.id,
      templateVersion: rendered.template.templateContractVersion,
      selectorContractVersion: rendered.template.selectorContractVersion,
      format: rendered.format,
    };
    const first = await inspectRenderedHtml(rendered.html, identity);
    const second = await inspectRenderedHtml(rendered.html, identity);

    expect(first.version).toBe("1");
    expect(first.resumeId).toBe(12);
    expect(first.resumeRevision).toBe(18);
    expect(first.contentHash).toBe(rendered.contentHash);
    expect(first.document.pageCount).toBeGreaterThanOrEqual(1);
    expect(first.sections.map((section) => section.id)).toEqual([
      "experience",
      "skills",
    ]);
    expect(first.sections[0]?.column).toBe("main");
    expect(first.sections[1]?.column).toBe("sidebar");
    expect(first.sections).toEqual(second.sections);
    expect(first.document).toEqual(second.document);
  }, 60_000);

  test("keeps the input immutable while producing a deterministic hash", () => {
    const before = structuredClone(fixture);
    const first = renderDocument(fixture, "modern");
    const second = renderDocument(fixture, "modern");

    expect(fixture).toEqual(before);
    expect(first.contentHash).toBe(second.contentHash);
  });

  test("inspects every built-in template through the same contract", async () => {
    for (const templateId of [
      "modern",
      "atlas-sidebar",
      "compact",
      "ats",
      "student",
      "creative",
      "ledger",
      "executive",
      "signal",
      "scholar",
    ]) {
      const rendered = renderDocument(shortCvFixture, templateId);
      const manifest = await inspectRenderedHtml(rendered.html, {
        contentHash: rendered.contentHash,
        templateId,
        templateVersion: rendered.template.templateContractVersion,
        selectorContractVersion: rendered.template.selectorContractVersion,
        format: rendered.format,
      });
      expect(manifest.template.id).toBe(templateId);
      expect(manifest.sections.length).toBeGreaterThan(0);
      expect(new Set(manifest.sections.map((section) => section.id)).size).toBe(
        manifest.sections.length,
      );
    }
  }, 60_000);

  test("measures photo, page pressure and manual breaks without stale hashes", async () => {
    const photo = renderDocument(photoCvFixture, "modern");
    expect(photo.html).toContain('data-cv-role="profile-photo"');

    const overflow = renderDocument(overflowCvFixture, "modern");
    const manifest = await inspectRenderedHtml(overflow.html, {
      contentHash: overflow.contentHash,
      templateId: overflow.template.id,
      templateVersion: overflow.template.templateContractVersion,
      selectorContractVersion: overflow.template.selectorContractVersion,
      format: overflow.format,
    });
    expect(manifest.document.pageCount).toBeGreaterThan(1);
    expect(manifest.contentHash).toBe(overflow.contentHash);
    expect(
      manifest.warnings.some(
        (warning) => warning.messageId === "renderer.section_crosses_page",
      ),
    ).toBe(true);
  }, 60_000);
});
