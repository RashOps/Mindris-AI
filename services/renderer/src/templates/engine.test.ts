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
  certifications: [],
  volunteering: [],
  publications: [],
  references: [],
  custom_sections: [],
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
    expect(html).toContain("--grid-template-columns: 1fr;");
    expect(html).toContain("--main-column: 1;");
    expect(html).toContain("--sidebar-column: 1;");
    expect(html).toContain("--font-family: Merriweather, sans-serif;");
    expect(html).toContain("--heading-font-family: Lato, sans-serif;");
    expect(html).toContain("--font-size-base: 11px;");
    expect(html).toContain("--line-height: 1.35;");
    expect(html).toContain("--primary-color: #0f766e;");
    expect(html).toContain("--text-color: #111827;");
    expect(html).toContain("--header-text-align: center;");
    expect(html).toContain("grid-template-columns: var(--grid-template-columns, var(--col-left-width) 1fr);");
  });

  test("renders advanced sections through fallback groups", () => {
    const html = generateHtml(
      {
        ...baseCv,
        certifications: [
          {
            name: "AWS Certified",
            issuer: "Amazon",
            date: "2025",
            url: "https://example.com/cert",
            description_markdown: "- Cloud architecture",
          },
        ],
        volunteering: [
          {
            organization: "Open Source Org",
            role: "Mentor",
            period: "2024",
            location: "Remote",
            description_markdown: "- Supported contributors",
          },
        ],
        publications: [
          {
            title: "Open Resume Formats",
            publisher: "Mindris Press",
            date: "2023",
            url: "https://example.com/paper",
            description_markdown: "- Semantics first",
          },
        ],
        references: [
          {
            name: "Grace Hopper",
            role: "Engineering Manager",
            company: "Navy",
            contact: "grace@example.com",
            description_markdown: "- Available on request",
          },
        ],
        custom_sections: [
          {
            title: "Awards",
            content_markdown: "- Best OSS tool",
            items: ["Hackathon winner", "Conference speaker"],
          },
        ],
      },
      "modern",
    );

    expect(html).toContain("Certifications");
    expect(html).toContain("AWS Certified");
    expect(html).toContain("Volunteering");
    expect(html).toContain("Open Source Org");
    expect(html).toContain("Publications");
    expect(html).toContain("Open Resume Formats");
    expect(html).toContain("References");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain("Awards");
    expect(html).toContain("Hackathon winner");
  });

  test("tightens layout and emits an overflow warning for one page challenge", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          page: {
            format: "A4",
            one_page_challenge: true,
            margins: { horizontal: "64px", vertical: "48px" },
          },
          layout: {
            columns: 2,
            sidebar_position: "right",
            density: "senior",
            photo: { enabled: true, shape: "round" },
          },
          typography: {
            base_size: "13px",
            line_height: "1.5",
            date_style: "normal",
          },
        },
        experience: Array.from({ length: 6 }, (_, index) => ({
          id: `exp-${index}`,
          role: `Engineer ${index}`,
          company: "Analytical Engines",
          period: "1842 - 1843",
          location: { city: "London", country: "UK" },
          description_markdown:
            "- Built structured notes and shipped dense resume content for one page review.",
          keywords: ["Mathematics", "Optimization"],
        })),
        projects: Array.from({ length: 4 }, (_, index) => ({
          id: `proj-${index}`,
          name: `Project ${index}`,
          description_markdown:
            "Longer project description designed to increase one-page pressure in the renderer.",
          tech_stack: ["Python", "FastAPI", "SQLite"],
        })),
      },
      "modern",
    );

    expect(html).toContain("--font-size-base: 11.5px;");
    expect(html).toContain("--line-height: 1.35;");
    expect(html).toContain("--margin-page-h: 36px;");
    expect(html).toContain("--margin-page-v: 28px;");
    expect(html).toContain("--entry-spacing: 10px;");
    expect(html).toContain("--resume-density: compact;");
    expect(html).toContain('data-overflow-risk="high"');
    expect(html).toContain("likely to overflow one page");
  });

  test("applies advanced css token overrides inside the shadow tree", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          advanced_css: {
            enabled: true,
            mode: "tokens",
            css_text: ":host { --primary-color: #111827; --heading-scale: 1.12; }",
          },
        },
      },
      "modern",
    );

    expect(html).toContain("--primary-color: #111827;");
    expect(html).toContain("--heading-scale: 1.12;");
    expect(html).not.toContain("advanced-css-warning");
  });

  test("strips unsafe advanced css selectors and functions while preserving safe rules", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          advanced_css: {
            enabled: true,
            mode: "css_patch",
            css_text: [
              "body { background: red; }",
              ".section-title { color: #0f766e; }",
              ".tag { background-image: url('https://evil.test/tag.png'); }",
            ].join("\n"),
          },
        },
      },
      "modern",
    );

    expect(html).toContain(".section-title {");
    expect(html).toContain("color: #0f766e;");
    expect(html).not.toContain("body { background: red; }");
    expect(html).not.toContain("evil.test");
    expect(html).toContain("advanced-css-warning");
    expect(html).toContain("Advanced CSS dropped unsupported rules");
  });

  test("sanitizes community-template css passed through advanced css defaults", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          advanced_css: {
            enabled: true,
            mode: "css_patch",
            css_text: ":host { --primary-color: #0f766e; }\nbody { color: red; }\n[data-section-type='experience'] { background: url(https://evil.test/a.png); }",
          },
        },
      },
      "modern",
    );

    expect(html).toContain("--primary-color: #0f766e;");
    expect(html).not.toContain("body { color: red; }");
    expect(html).not.toContain("url(https://evil.test/a.png)");
    expect(html).toContain("Advanced CSS dropped unsupported rules.");
  });
});
