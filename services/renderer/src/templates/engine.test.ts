import { describe, expect, test } from "bun:test";
import { generateHtml } from "./engine";

const builtInTemplateIds = ["modern", "compact", "ats", "student", "creative"];

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
        detail_level: "normal",
      },
      {
        id: "experience",
        type: "experience",
        label: "Selected Experience",
        visible: true,
        placement: "main",
        display_mode: "timeline",
        detail_level: "short",
      },
      {
        id: "projects",
        type: "projects",
        label: "Hidden Projects",
        visible: false,
        placement: "main",
        display_mode: "list",
      },
      {
        id: "certifications",
        type: "certifications",
        label: "Licences",
        visible: true,
        placement: "main",
        display_mode: "cards",
        detail_level: "detailed",
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
  certifications: [
    {
      name: "Machine Learning Specialty",
      issuer: "Mindris Academy",
      date: "2026",
      url: "https://example.com/cert",
      description_markdown: "- Backend-driven rendering",
    },
  ],
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
    expect(html).toContain('data-section-display-mode="timeline"');
    expect(html).toContain('data-section-detail-level="short"');
  });

  test("keeps every built-in template aligned with dynamic section placement", () => {
    for (const templateId of builtInTemplateIds) {
      const html = generateHtml(
        {
          ...baseCv,
          global_settings: {
            ...baseCv.global_settings,
            template_id: templateId,
          },
        },
        templateId,
      );

      expect(html).toContain(".section-placement-sidebar");
      expect(html).toContain(".section-placement-main");
      expect(html).toContain(".section-display-compact");
      expect(html).toContain(".section-display-timeline");
      expect(html).toContain(".section-display-cards");
      expect(html).toContain(".section-detail-short");
      expect(html).toContain(".section-detail-detailed");
      expect(html).toContain('data-section-placement="sidebar"');
      expect(html).toContain('data-section-placement="main"');
      expect(html).toContain('data-section-display-mode="compact"');
      expect(html).toContain('data-section-display-mode="timeline"');
      expect(html).toContain('data-section-display-mode="cards"');
      expect(html).toContain('data-section-detail-level="short"');
      expect(html).toContain('data-section-detail-level="detailed"');
    }
  });

  test("renders each built-in template through the backend-driven semantic contract", () => {
    for (const templateId of builtInTemplateIds) {
      const html = generateHtml(
        {
          ...baseCv,
          global_settings: {
            ...baseCv.global_settings,
            template_id: templateId,
          },
        },
        templateId,
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(
        "const shadow = host.attachShadow({ mode: 'open' })",
      );
      expect(html).toContain("#cv-container");
      expect(html).toContain("Ada Lovelace");
      expect(html).toContain("AI Engineer");
      expect(html).toContain("Core Skills");
      expect(html).toContain("Selected Experience");
      expect(html).toContain("Licences");
      expect(html).toContain("Machine Learning Specialty");
      expect(html).not.toContain("Hidden Projects");
      expect(html).not.toContain("Hidden Project");
      expect(html).toContain('data-section-type="skills"');
      expect(html).toContain('data-section-type="experience"');
      expect(html).toContain('data-section-type="certifications"');
      expect(html).toContain('data-section-placement="sidebar"');
      expect(html).toContain('data-section-placement="main"');
    }
  });

  test("applies section display controls for dates and locations", () => {
    for (const templateId of builtInTemplateIds) {
      const html = generateHtml(
        {
          ...baseCv,
          global_settings: {
            ...baseCv.global_settings,
            template_id: templateId,
            sections: [
              {
                id: "experience",
                type: "experience",
                label: "Experience without metadata",
                visible: true,
                placement: "main",
                display_mode: "list",
                detail_level: "normal",
                show_dates: false,
                show_locations: false,
              },
            ],
          },
        },
        templateId,
      );

      expect(html).toContain("Experience without metadata");
      expect(html).toContain("Engineer");
      expect(html).toContain("Analytical Engines");
      expect(html).not.toContain("1842 - 1843");
      expect(html).not.toContain("London");
    }
  });

  test("applies advanced section style controls in renderer-owned markup", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          sections: [
            {
              id: "experience",
              type: "experience",
              label: "Experience",
              visible: true,
              placement: "main",
              display_mode: "list",
              detail_level: "normal",
              heading_style: "accent",
              heading_capitalization: "normal",
              title_subtitle_order: "subtitle_first",
              date_location_position: "right",
            },
            {
              id: "skills",
              type: "skills",
              label: "Skills",
              visible: true,
              placement: "sidebar",
              skill_style: "bars",
            },
          ],
        },
      },
      "modern",
    );

    expect(html).toContain('data-section-heading-style="accent"');
    expect(html).toContain('data-section-heading-capitalization="normal"');
    expect(html).toContain('data-section-date-location-position="right"');
    expect(html).toContain('data-section-skill-style="bars"');
    expect(html).toContain(
      '<span class="company">Analytical Engines</span><h3>Engineer</h3>',
    );
    expect(html).toContain(".section-heading-accent .section-title");
    expect(html).toContain(".section-meta-right .item-header");
    expect(html).toContain(".section-skill-style-bars .tag::after");
  });

  test("renders manual page breaks as renderer-owned section metadata", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          page: {
            page_break_mode: "manual",
          },
          sections: [
            {
              id: "experience",
              type: "experience",
              label: "Experience",
              visible: true,
              placement: "main",
              page_break_before: true,
            },
          ],
        },
      },
      "modern",
    );

    expect(html).toContain("section-page-break-before");
    expect(html).toContain('data-section-page-break-before="true"');
    expect(html).toContain("break-before: page;");
    expect(html).toContain("page-break-before: always;");
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
            body_size: "12px",
            name_size: "32px",
            title_size: "16px",
            section_heading_size: "11px",
            entry_heading_size: "15px",
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
            accent_targets: ["name", "dates"],
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
    expect(html).toContain("--font-size-body: 12px;");
    expect(html).toContain("--font-size-name: 32px;");
    expect(html).toContain("--font-size-title: 16px;");
    expect(html).toContain("--font-size-section-heading: 11px;");
    expect(html).toContain("--font-size-entry-heading: 15px;");
    expect(html).toContain("--line-height: 1.35;");
    expect(html).toContain("--primary-color: #0f766e;");
    expect(html).toContain("--text-color: #111827;");
    expect(html).toContain(".header h1");
    expect(html).toContain("color: var(--primary-color, #2563eb);");
    expect(html).toContain(".tagline");
    expect(html).toContain("color: var(--text-color, #334155);");
    expect(html).toContain(".meta");
    expect(html).toContain("--header-text-align: center;");
    expect(html).toContain("grid-template-columns: var(--grid-template-columns, var(--col-left-width) 1fr);");
  });

  test("renders advanced sections through fallback groups", () => {
    const html = generateHtml(
      {
        ...baseCv,
        global_settings: {
          ...baseCv.global_settings,
          sections: baseCv.global_settings.sections.filter(
            (section) => section.type !== "certifications",
          ),
        },
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

  test("renders an enabled profile photo with all renderer-backed options", () => {
    const html = generateHtml(
      {
        ...baseCv,
        profile: {
          ...baseCv.profile,
          photo_url: "data:image/png;base64,iVBORw0KGgo=",
        },
        global_settings: {
          ...baseCv.global_settings,
          layout: {
            columns: 2,
            sidebar_position: "right",
            photo: {
              enabled: true,
              grayscale: true,
              position: "left",
              size: "l",
              shape: "rounded",
            },
          },
        },
      },
      "modern",
    );

    expect(html).toContain(
      'class="profile-photo profile-photo-left profile-photo-l profile-photo-rounded profile-photo-grayscale"',
    );
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo&#x3D;"');
  });

  test("does not render a disabled or unsafe profile photo", () => {
    const html = generateHtml(
      {
        ...baseCv,
        profile: { ...baseCv.profile, photo_url: "https://example.com/photo.png" },
        global_settings: {
          ...baseCv.global_settings,
          layout: { photo: { enabled: true } },
        },
      },
      "modern",
    );

    expect(html).not.toContain('<img class="profile-photo');
    expect(html).not.toContain("example.com/photo.png");
  });
});
