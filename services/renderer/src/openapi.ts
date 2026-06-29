import { t } from "elysia";

export const renderPdfBodySchema = t.Object({
    cv_data: t.Any(),
    template_id: t.Optional(t.String()),
    return_buffer: t.Optional(t.Boolean()),
    return_html: t.Optional(t.Boolean()),
});

export const renderMarkdownBodySchema = t.Object({
    markdown: t.String(),
    style: t.Optional(t.Union([t.Literal("document"), t.Literal("letter")])),
    title: t.Optional(t.String()),
});

type OpenApiDocument = {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: Array<{ url: string }>;
    paths: Record<string, Record<string, unknown>>;
};

function jsonResponseSchema(properties: Record<string, unknown>) {
    return {
        type: "object",
        properties,
    };
}

export function buildOpenApiDocument(serverUrl: string): OpenApiDocument {
    return {
        openapi: "3.1.0",
        info: {
            title: "Mindris Renderer API",
            version: "0.1.1",
            description: "Renderer service for CV PDF generation and Markdown to PDF conversion.",
        },
        servers: [{ url: serverUrl }],
        paths: {
            "/": {
                get: {
                    summary: "Renderer health root",
                    responses: {
                        200: {
                            description: "Renderer health response",
                            content: {
                                "application/json": {
                                    schema: jsonResponseSchema({
                                        status: { type: "string" },
                                        service: { type: "string" },
                                    }),
                                },
                            },
                        },
                    },
                },
            },
            "/health": {
                get: {
                    summary: "Renderer health",
                    responses: {
                        200: {
                            description: "Renderer health response",
                            content: {
                                "application/json": {
                                    schema: jsonResponseSchema({
                                        status: { type: "string" },
                                        service: { type: "string" },
                                    }),
                                },
                            },
                        },
                    },
                },
            },
            "/ready": {
                get: {
                    summary: "Renderer readiness",
                    responses: {
                        200: {
                            description: "Renderer readiness response",
                            content: {
                                "application/json": {
                                    schema: jsonResponseSchema({
                                        status: { type: "string" },
                                        service: { type: "string" },
                                        checks: {
                                            type: "object",
                                            additionalProperties: {
                                                type: "object",
                                                properties: {
                                                    ok: { type: "boolean" },
                                                },
                                            },
                                        },
                                    }),
                                },
                            },
                        },
                    },
                },
            },
            "/metrics": {
                get: {
                    summary: "Renderer runtime metrics",
                    responses: {
                        200: {
                            description: "In-memory renderer request and failure metrics",
                            content: {
                                "application/json": {
                                    schema: jsonResponseSchema({
                                        status: { type: "string" },
                                        service: { type: "string" },
                                        readiness: { type: "object" },
                                        requests: { type: "object" },
                                        render: { type: "object" },
                                    }),
                                },
                            },
                        },
                    },
                },
            },
            "/render/pdf": {
                post: {
                    summary: "Render CV as PDF or HTML",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: renderPdfBodySchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "Rendered PDF buffer, HTML, or success payload",
                        },
                    },
                },
            },
            "/render/markdown/preview": {
                post: {
                    summary: "Render Markdown to HTML preview",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: renderMarkdownBodySchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "HTML preview",
                        },
                    },
                },
            },
            "/render/markdown": {
                post: {
                    summary: "Render Markdown to PDF",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: renderMarkdownBodySchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "PDF document",
                        },
                    },
                },
            },
            "/docs": {
                get: {
                    summary: "Renderer API documentation UI",
                    responses: {
                        200: {
                            description: "HTML documentation shell",
                        },
                    },
                },
            },
            "/openapi.json": {
                get: {
                    summary: "Renderer OpenAPI document",
                    responses: {
                        200: {
                            description: "Machine-readable OpenAPI JSON",
                        },
                    },
                },
            },
        },
    };
}

export function buildDocsHtml(openapiPath = "/openapi.json"): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Renderer API Docs</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      body { margin: 0; background: #f8fafc; }
      .wrap { max-width: 1080px; margin: 0 auto; padding: 32px 20px 56px; }
      .hero, .card { border: 1px solid #e2e8f0; background: #fff; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
      .hero { padding: 24px; margin-bottom: 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
      .card { padding: 18px; }
      .eyebrow { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #64748b; }
      h1 { margin: 8px 0 10px; font-size: 28px; }
      h2 { margin: 14px 0 10px; font-size: 18px; }
      p, li, code, pre { font-size: 14px; line-height: 1.6; }
      .method { display: inline-flex; align-items: center; justify-content: center; min-width: 58px; height: 28px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; }
      .path { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 13px; color: #0f172a; }
      pre { margin: 10px 0 0; padding: 12px; overflow: auto; border-radius: 12px; background: #0f172a; color: #e2e8f0; }
      .muted { color: #475569; }
      a { color: #2563eb; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <div class="eyebrow">Mindris Renderer</div>
        <h1>Renderer API Docs</h1>
        <p class="muted">Local documentation exposed by the renderer service itself.</p>
        <p><a href="${openapiPath}">${openapiPath}</a></p>
      </section>
      <section id="routes" class="grid"></section>
    </div>
    <script>
      async function boot() {
        const res = await fetch("${openapiPath}", { cache: "no-store" });
        const spec = await res.json();
        const routes = document.getElementById("routes");
        const entries = Object.entries(spec.paths || {});
        routes.innerHTML = entries.map(([path, methods]) => (
          Object.entries(methods).map(([method, operation]) => {
            const requestSchema = operation.requestBody?.content?.["application/json"]?.schema;
            const schemaBlock = requestSchema
              ? '<pre>' + JSON.stringify(requestSchema, null, 2)
              : "";
            return '<article class="card">' +
              '<div class="method">' + method.toUpperCase() + '</div>' +
              '<h2 class="path">' + path + '</h2>' +
              '<p class="muted">' + (operation.summary || '') + '</p>' +
              schemaBlock +
            '</article>';
          }).join("")
        )).join("");
      }
      boot().catch((error) => {
        const routes = document.getElementById("routes");
        routes.innerHTML = '<article class="card"><h2>Docs unavailable</h2><p class="muted">' + error.message + '</p></article>';
      });
    </script>
  </body>
</html>`;
}
