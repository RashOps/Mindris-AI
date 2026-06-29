import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { renderMarkdownToHtml } from "./markdown";
import { generatePDF } from "./pdf/generator";
import {
    buildDocsHtml,
    buildOpenApiDocument,
    renderMarkdownBodySchema,
    renderPdfBodySchema,
} from "./openapi";
import { generateHtml } from "./templates/engine";

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function jsonError(message: string, status = 500): Response {
    return new Response(
        JSON.stringify({ status: "error", message }),
        { status, headers: { "Content-Type": "application/json" } },
    );
}

function safeFilename(title: string, fallback = "document"): string {
    const cleaned = title
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
    return cleaned || fallback;
}

export function buildRendererApp(baseUrl = "http://localhost:4000") {
    const openApiDocument = buildOpenApiDocument(baseUrl);

    return new Elysia()
        .use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }))
        .get("/", () => ({ status: "healthy", service: "renderer" }))
        .get("/health", () => ({ status: "healthy", service: "renderer" }))
        .get("/ready", () => ({
            status: "ready",
            service: "renderer",
            checks: {
                templates: { ok: true },
                pdf: { ok: true },
            },
        }))
        .get("/openapi.json", () => openApiDocument)
        .get("/docs", () => new Response(buildDocsHtml("/openapi.json"), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        }))
        .post("/render/pdf", async ({ body }: { body: any }) => {
            const { cv_data, template_id, return_buffer, return_html } = body;

            try {
                const html = generateHtml(cv_data, template_id);

                if (return_html) {
                    return new Response(html, {
                        headers: { "Content-Type": "text/html" },
                    });
                }

                const filename = `cv_${Date.now()}.pdf`;
                const result = await generatePDF(html, filename, return_buffer);

                if (return_buffer) {
                    return new Response(result as Buffer, {
                        headers: {
                            "Content-Type": "application/pdf",
                            "Content-Disposition": `attachment; filename="${filename}"`,
                        },
                    });
                }

                return { success: true, message: "PDF generated.", path: result };
            } catch (error: unknown) {
                console.error("CV render failed:", error);
                return jsonError(errorMessage(error, "CV render failed."));
            }
        }, {
            body: renderPdfBodySchema,
        })
        .post("/render/markdown/preview", async ({ body }: { body: any }) => {
            const { markdown, style, title } = body;

            try {
                const html = renderMarkdownToHtml({ markdown, style, title });
                return new Response(html, {
                    headers: { "Content-Type": "text/html" },
                });
            } catch (error: unknown) {
                console.error("Markdown preview failed:", error);
                return jsonError(errorMessage(error, "Markdown preview failed."));
            }
        }, {
            body: renderMarkdownBodySchema,
        })
        .post("/render/markdown", async ({ body }: { body: any }) => {
            const { markdown, style = "document", title = "Document" } = body;

            try {
                const html = renderMarkdownToHtml({ markdown, style, title });
                const filename = `${safeFilename(title)}_${Date.now()}.pdf`;
                const pdfBuffer = await generatePDF(html, filename, true);

                return new Response(pdfBuffer as Buffer, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `attachment; filename="${filename}"`,
                    },
                });
            } catch (error: unknown) {
                console.error("Markdown PDF failed:", error);
                return jsonError(errorMessage(error, "Markdown PDF failed."));
            }
        }, {
            body: renderMarkdownBodySchema,
        });
}
