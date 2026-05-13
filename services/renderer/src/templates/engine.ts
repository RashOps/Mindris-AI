import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// ── Shadow DOM Shell ──────────────────────────────────────────────────────────
const shellTemplate = Handlebars.compile(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mindris AI - Generated CV</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #f3f4f6; display: flex; justify-content: center; }
        #cv-container { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
        @media print {
            body { background: none; }
            #cv-container { margin: 0; box-shadow: none; width: 100%; }
        }
    </style>
</head>
<body>
    <div id="cv-container">
        <div id="shadow-host"></div>
    </div>
    <script>
        const host = document.getElementById('shadow-host');
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = \`{{{css}}}\`;
        shadow.appendChild(style);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = \`{{{content}}}\`;
        shadow.appendChild(wrapper);
    </script>
</body>
</html>`);

// ── Handlebars Helpers ────────────────────────────────────────────────────────

Handlebars.registerHelper("hasItems", (arr: any[]) => Array.isArray(arr) && arr.length > 0);
Handlebars.registerHelper("join", (arr: any[], sep: string) =>
    Array.isArray(arr) ? arr.join(typeof sep === "string" ? sep : ", ") : ""
);
Handlebars.registerHelper("socialIcon", (type: string) => {
    const icons: Record<string, string> = {
        linkedin: "in",
        github: "gh",
        website: "www",
        other: "↗",
    };
    return icons[type] || "↗";
});

// ── Modern Template (aligned with new cv_schema.json structure) ───────────────
const modernTemplate = Handlebars.compile(`
<div class="cv-wrapper">

  {{!-- HEADER --}}
  <header class="header">
    <h1>{{profile.full_name}}</h1>
    <p class="tagline">{{profile.title}}</p>

    {{!-- Contact bar --}}
    <div class="contact-bar">
      {{#if profile.email}}<span class="contact-item">✉ {{profile.email}}</span>{{/if}}
      {{#if profile.phone}}<span class="contact-item">☎ {{profile.phone}}</span>{{/if}}
      {{#if profile.location.city}}<span class="contact-item">📍 {{profile.location.city}}, {{profile.location.country}}</span>{{/if}}
      {{#each profile.socials}}
        <span class="contact-item"><a href="{{url}}" class="contact-link">{{#if label}}{{label}}{{else}}{{type}}{{/if}}</a></span>
      {{/each}}
    </div>

    {{#if profile.text_markdown}}
      <p class="summary">{{profile.text_markdown}}</p>
    {{/if}}
  </header>

  {{!-- MAIN GRID: left column (2/3) + right column (1/3) --}}
  <div class="main-grid">

    {{!-- LEFT COLUMN --}}
    <div class="left-col">

      {{!-- EXPERIENCE --}}
      {{#if (hasItems experience)}}
      <section class="section">
        <h2 class="section-title">Expériences</h2>
        {{#each experience}}
        <div class="item">
          <div class="item-header">
            <h3>{{role}}</h3>
            <span class="company">{{company}}</span>
            <span class="meta">{{period}}{{#if location.city}} · {{location.city}}{{/if}}</span>
          </div>
          {{#if description_markdown}}
            <p class="description">{{description_markdown}}</p>
          {{/if}}
          {{#if (hasItems keywords)}}
          <div class="keyword-tags">
            {{#each keywords}}<span class="kw-tag">{{this}}</span>{{/each}}
          </div>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- PROJECTS --}}
      {{#if (hasItems projects)}}
      <section class="section">
        <h2 class="section-title">Projets</h2>
        {{#each projects}}
        <div class="item">
          <div class="item-header">
            <h3>{{name}}{{#if url}} <a href="{{url}}" class="proj-link">↗</a>{{/if}}</h3>
          </div>
          {{#if description_markdown}}
            <p class="description">{{description_markdown}}</p>
          {{/if}}
          {{#if (hasItems tech_stack)}}
          <div class="keyword-tags">
            {{#each tech_stack}}<span class="kw-tag">{{this}}</span>{{/each}}
          </div>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

    </div>

    {{!-- RIGHT COLUMN --}}
    <div class="right-col">

      {{!-- SKILLS --}}
      {{#if (hasItems skills)}}
      <section class="section">
        <h2 class="section-title">Compétences</h2>
        {{#each skills}}
        <div class="skill-group">
          <h4 class="skill-category">{{category}}</h4>
          <div class="skill-tags">
            {{#each skills}}<span class="tag">{{this}}</span>{{/each}}
          </div>
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- EDUCATION --}}
      {{#if (hasItems education)}}
      <section class="section">
        <h2 class="section-title">Formation</h2>
        {{#each education}}
        <div class="item item--compact">
          <h3>{{degree}}</h3>
          <span class="institution">{{institution}}</span>
          <span class="meta">{{period}}{{#if location}} · {{location}}{{/if}}</span>
          {{#if description_markdown}}
            <p class="description description--sm">{{description_markdown}}</p>
          {{/if}}
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- LANGUAGES --}}
      {{#if (hasItems languages)}}
      <section class="section">
        <h2 class="section-title">Langues</h2>
        {{#each languages}}
        <div class="lang-item">
          <span class="lang-name">{{language}}</span>
          <span class="lang-level">{{level}}</span>
        </div>
        {{/each}}
      </section>
      {{/if}}

      {{!-- HOBBIES --}}
      {{#if (hasItems hobbies)}}
      <section class="section">
        <h2 class="section-title">Intérêts</h2>
        <div class="skill-tags">
          {{#each hobbies}}<span class="tag">{{this}}</span>{{/each}}
        </div>
      </section>
      {{/if}}

    </div>
  </div>
</div>
`);

// ── Engine Entry Point ────────────────────────────────────────────────────────

export function generateHtml(cvData: any, templateId: string = "modern"): string {
    const cssPath = join(import.meta.dir, "styles", `${templateId}.css`);
    let css = "";
    try {
        css = readFileSync(cssPath, "utf-8");
    } catch (e) {
        console.warn(`CSS not found for template "${templateId}", using fallback.`);
        css = ":host { font-family: sans-serif; }";
    }

    let content = "";
    if (templateId === "modern") {
        content = modernTemplate(cvData);
    } else {
        throw new Error(`Template "${templateId}" is not supported.`);
    }

    return shellTemplate({ css, content });
}
