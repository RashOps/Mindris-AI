import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";

// Compile the base HTML shell with the Shadow DOM implementation
const shellTemplate = Handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mindris AI - Generated CV</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #f3f4f6; display: flex; justify-content: center; }
        #cv-container { width: 210mm; min-height: 297mm; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
        
        /* When printing, remove margins and shadows for perfect A4 fit */
        @media print {
            body { background: none; }
            #cv-container { margin: 0; box-shadow: none; width: 100%; height: 100%; }
        }
    </style>
</head>
<body>
    <div id="cv-container">
        <!-- The Shadow Root will be attached here -->
        <div id="shadow-host"></div>
    </div>

    <script>
        const host = document.getElementById('shadow-host');
        const shadow = host.attachShadow({ mode: 'open' });
        
        // Inject styles
        const style = document.createElement('style');
        style.textContent = \`{{{css}}}\`;
        shadow.appendChild(style);
        
        // Inject content
        const wrapper = document.createElement('div');
        wrapper.innerHTML = \`{{{content}}}\`;
        shadow.appendChild(wrapper);
    </script>
</body>
</html>
`);

// The actual inner content of the CV
const modernTemplate = Handlebars.compile(`
<div class="cv-wrapper">
    <header class="header">
        <h1>{{profile_name}}</h1>
        <p class="tagline">{{profile_title}}</p>
        <p class="summary">{{profile_summary}}</p>
    </header>

    <div class="main-grid">
        <div class="left-column">
            {{#if experience.length}}
            <section class="section">
                <h2 class="section-title">Experience</h2>
                {{#each experience}}
                <div class="item">
                    <div class="item-header">
                        <h3>{{title}}</h3>
                        <span class="company">{{company}}</span>
                        <span class="date">{{start_date}} - {{end_date}}</span>
                    </div>
                    <p class="description">{{description}}</p>
                    {{#if achievements.length}}
                    <ul class="achievements">
                        {{#each achievements}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                    {{/if}}
                </div>
                {{/each}}
            </section>
            {{/if}}
        </div>

        <div class="right-column">
            {{#if skills.length}}
            <section class="section">
                <h2 class="section-title">Skills</h2>
                {{#each skills}}
                <div class="skill-category">
                    <h4>{{category}}</h4>
                    <div class="skill-tags">
                        {{#each items}}
                        <span class="tag">{{this}}</span>
                        {{/each}}
                    </div>
                </div>
                {{/each}}
            </section>
            {{/if}}

            {{#if education.length}}
            <section class="section">
                <h2 class="section-title">Education</h2>
                {{#each education}}
                <div class="item">
                    <h3>{{degree}}</h3>
                    <span class="institution">{{institution}}</span>
                    <span class="date">{{start_date}} - {{end_date}}</span>
                </div>
                {{/each}}
            </section>
            {{/if}}
        </div>
    </div>
</div>
`);

export function generateHtml(cvData: any, templateId: string = "modern"): string {
    // Load CSS
    // Using import.meta.dir to reliably read relative to this file in Bun
    const cssPath = join(import.meta.dir, "styles", `${templateId}.css`);
    let css = "";
    try {
        css = readFileSync(cssPath, "utf-8");
    } catch (e) {
        console.error(`Failed to load CSS for template ${templateId}: `, e);
        css = "/* Fallback CSS */";
    }

    // Generate content
    let content = "";
    if (templateId === "modern") {
        content = modernTemplate(cvData);
    } else {
        throw new Error(`Template ${templateId} is not supported.`);
    }

    // Render shell with Shadow DOM
    return shellTemplate({ css, content });
}
