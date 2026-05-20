/**
 * Markdown → HTML renderer for the /render/markdown route.
 *
 * Two styles:
 *  - "document" : full report / notes / technical doc
 *  - "letter"   : cover letter (centred header, sobrer spacing)
 */

import { marked } from "marked";

// ── Marked configuration ──────────────────────────────────────────────────────
marked.setOptions({ gfm: true, breaks: true });

// ── Base A4 shell (same Shadow DOM pattern as CV renderer) ────────────────────
function buildShell(css: string, body: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f3f4f6; }
    #shadow-host { width: 210mm; min-height: 297mm; background: white;
      margin: 20px auto; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
    @media print {
      html, body { background: none; }
      #shadow-host { margin: 0; box-shadow: none; width: 100%; }
    }
  </style>
</head>
<body>
  <div id="shadow-host"></div>
  <script>
    const host = document.getElementById('shadow-host');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(css)};
    shadow.appendChild(style);
    const wrapper = document.createElement('div');
    wrapper.className = 'md-wrapper';
    wrapper.innerHTML = ${JSON.stringify(body)};
    shadow.appendChild(wrapper);
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Style: document ───────────────────────────────────────────────────────────
const DOCUMENT_CSS = `
:host { display: block; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.7; }

.md-wrapper {
  padding: 52px 64px;
  max-width: 100%;
}

/* Typography */
h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 8px; letter-spacing: -0.3px; }
h2 { font-size: 18px; font-weight: 600; color: #0f172a; margin: 32px 0 12px;
     padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
h3 { font-size: 15px; font-weight: 600; color: #334155; margin: 24px 0 8px; }
h4, h5, h6 { font-size: 13px; font-weight: 600; color: #475569; margin: 16px 0 6px; }

p  { font-size: 13px; color: #334155; margin: 0 0 14px; }

/* Lists */
ul, ol { margin: 0 0 14px; padding-left: 22px; }
li { font-size: 13px; color: #334155; margin-bottom: 5px; }
li::marker { color: #2563eb; }

/* Links */
a { color: #2563eb; text-decoration: none; }
a:hover { text-decoration: underline; }

/* Code */
code {
  font-family: 'Fira Code', 'Courier New', monospace;
  background: #f1f5f9; color: #0f172a;
  padding: 2px 6px; border-radius: 3px; font-size: 12px;
}
pre {
  background: #0f172a; color: #e2e8f0;
  padding: 16px 20px; border-radius: 8px; overflow-x: auto;
  margin: 0 0 16px;
}
pre code { background: none; color: inherit; padding: 0; font-size: 12px; }

/* Blockquote */
blockquote {
  border-left: 3px solid #2563eb;
  margin: 0 0 14px; padding: 8px 16px;
  background: #eff6ff; border-radius: 0 6px 6px 0;
}
blockquote p { margin: 0; color: #1e3a8a; font-style: italic; }

/* Table */
table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 12.5px; }
th { background: #f8fafc; font-weight: 600; color: #0f172a; text-align: left;
     padding: 8px 12px; border-bottom: 2px solid #e2e8f0; }
td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
tr:last-child td { border-bottom: none; }

/* HR */
hr { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }

/* Strong / Em */
strong { font-weight: 600; color: #0f172a; }
em { color: #475569; }
`;

// ── Style: letter ─────────────────────────────────────────────────────────────
const LETTER_CSS = `
:host { display: block; font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.75; }

.md-wrapper {
  padding: 60px 72px;
  max-width: 100%;
}

/* The first h1 acts as sender name */
h1 {
  font-size: 20px; font-weight: 600; color: #0f172a;
  margin: 0 0 4px; letter-spacing: 0;
}

/* h2 = section dividers (subtle) */
h2 {
  font-size: 13px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 1px; color: #94a3b8;
  margin: 32px 0 10px; padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

h3 { font-size: 13px; font-weight: 600; color: #334155; margin: 20px 0 6px; }

p { font-size: 13px; color: #334155; margin: 0 0 16px; text-align: justify; }

/* Signature emphasis */
strong { font-weight: 600; color: #0f172a; }
em { color: #64748b; }

a { color: #2563eb; text-decoration: none; }

/* Horizontal rule as separator */
hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }

/* Lists in letters */
ul, ol { margin: 0 0 14px; padding-left: 22px; }
li { font-size: 13px; color: #334155; margin-bottom: 4px; }
`;

// ── Public API ────────────────────────────────────────────────────────────────

export interface RenderMarkdownOptions {
    markdown: string;
    style?: "document" | "letter";
    title?: string;
}

export function renderMarkdownToHtml(options: RenderMarkdownOptions): string {
    const { markdown, style = "document", title = "Document" } = options;

    const body = marked.parse(markdown) as string;
    const css = style === "letter" ? LETTER_CSS : DOCUMENT_CSS;

    return buildShell(css, body, title);
}
