import { describe, expect, test } from "bun:test";
import { generateHtml } from "./engine";

const baseCv = {
  global_settings: {
    template_id: "modern",
    sections: [
      {
        id: "skills",
        type: "skills",
        label: "Core Skills",
        visible: true,
        placement: "sidebar",
        display_mode: "compact",
      },
      {
        id: "experience",
        type: "experience",
        label: "Selected Experience",
        visible: true,
        placement: "main",
        display_mode: "list",
      },
      {
        id: "projects",
        type: "projects",
        label: "Hidden Projects",
        visible: false,
        placement: "main",
        display_mode: "list",
      },
    ],
  },
  profile: {
    full_name: "Ada Lovelace",
    title: "AI Engineer",
    email: "ada@example.com",
    phone: "",
    location: { city: "Paris", country: "France" },
    socials: [],
    text_markdown: "Analytical engine pioneer.",
  },
  experience: [
    {
      role: "Engineer",
      company: "Analytical Engines",
      period: "1842 - 1843",
      location: { city: "London", country: "UK" },
      description_markdown: "- Built structured notes",
      keywords: ["Mathematics"],
    },
  ],
  projects: [
    {
      name: "Hidden Project",
      description_markdown: "Should not render.",
      tech_stack: ["Secret"],
    },
  ],
  skills: [{ category: "Backend", skills: ["Python", "FastAPI"] }],
  education: [],
  languages: [],
  hobbies: [],
};

describe("generateHtml semantic sections", () => {
  test("uses section configuration for label, visibility, order, and placement", () => {
    const html = generateHtml(baseCv, "modern");

    expect(html).toContain("Selected Experience");
    expect(html).toContain("Core Skills");
    expect(html).not.toContain("Hidden Projects");
    expect(html).not.toContain("Hidden Project");
    expect(html.indexOf("Core Skills")).toBeLessThan(
      html.indexOf("Selected Experience"),
    );
    expect(html).toContain('data-section-placement="sidebar"');
    expect(html).toContain('data-section-placement="main"');
  });

  test("applies nested customization tokens for page, layout, typography, and colors", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          page: {
            format: "Letter",
            margins: { horizontal: "36px", vertical: "40px" },
          },
          layout: {
            columns: 1,
            sidebar_position: "none",
            sidebar_width: "30%",
            density: "compact",
            header_alignment: "center",
            photo: { enabled: false, shape: "square" },
          },
          typography: {
            body_font: "Merriweather",
            heading_font: "Lato",
            base_size: "11px",
            heading_scale: "1.25",
            line_height: "1.35",
            date_style: "right",
            bullet_style: "dash",
          },
          colors: {
            primary: "#0f766e",
            secondary: "#64748b",
            text: "#111827",
            heading: "#020617",
            sidebar_background: "#f8fafc",
            separators: "#cbd5e1",
            palette_preset: "minimal",
            monochrome: false,
          },
        },
      },
      "modern",
    );

    expect(html).toContain("#cv-container { width: 216mm; min-height: 279mm;");
    expect(html).toContain("--margin-page-h: 36px;");
    expect(html).toContain("--margin-page-v: 40px;");
    expect(html).toContain("--col-left-width: 100%;");
    expect(html).toContain("--font-family: 'Merriweather', sans-serif;");
    expect(html).toContain("--heading-font-family: Lato, sans-serif;");
    expect(html).toContain("--font-size-base: 11px;");
    expect(html).toContain("--line-height: 1.35;");
    expect(html).toContain("--primary-color: #0f766e;");
    expect(html).toContain("--text-color: #111827;");
    expect(html).toContain("--header-text-align: center;");
  });
});
