import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { createRendererLogger, type RendererLogger } from "./logger";
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

function statusCodeOf(response: unknown, explicitStatus?: unknown): number {
    if (typeof explicitStatus === "number") {
        return explicitStatus;
    }

    if (typeof explicitStatus === "string") {
        const parsed = Number.parseInt(explicitStatus, 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    if (response instanceof Response) {
        return response.status;
    }

    return 200;
}

function routePathOf(request: Request): string {
    return new URL(request.url).pathname;
}

export function buildRendererApp(
    baseUrl = "http://localhost:4000",
    options: { logger?: RendererLogger } = {},
) {
    const openApiDocument = buildOpenApiDocument(baseUrl);
    const logger = options.logger ?? createRendererLogger();
    const startedAt = new WeakMap<Request, number>();

    const completeRequest = async <T>(
        request: Request,
        response: T,
        explicitStatus?: number,
    ): Promise<T> => {
        await logger.log({
            level: "info",
            event: "request.completed",
            message: "Request served",
            method: request.method,
            route: routePathOf(request),
            status: statusCodeOf(response, explicitStatus),
            duration_ms: Number((performance.now() - (startedAt.get(request) ?? performance.now())).toFixed(2)),
        });

        return response;
    };

    const logRouteError = async (
        event: string,
        request: Request,
        message: string,
        error: unknown,
    ) => {
        await logger.log({
            level: "error",
            event,
            message,
            method: request.method,
            route: routePathOf(request),
            duration_ms: Number((performance.now() - (startedAt.get(request) ?? performance.now())).toFixed(2)),
            error: error instanceof Error ? error.message : String(error),
        });
    };

    return new Elysia()
        .use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }))
        .onRequest(({ request }) => {
            startedAt.set(request, performance.now());
        })
        .get("/", ({ request }) => completeRequest(request, { status: "healthy", service: "renderer" }))
        .get("/health", ({ request }) => completeRequest(request, { status: "healthy", service: "renderer" }))
        .get("/ready", ({ request }) => completeRequest(request, {
            status: "ready",
            service: "renderer",
            checks: {
                templates: { ok: true },
                pdf: { ok: true },
            },
        }))
        .get("/openapi.json", ({ request }) => completeRequest(request, openApiDocument))
        .get("/docs", ({ request }) => completeRequest(request, new Response(buildDocsHtml("/openapi.json"), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        })))
        .post("/render/pdf", async ({ body, request }: { body: any; request: Request }) => {
            const { cv_data, template_id, return_buffer, return_html } = body;

            try {
                const html = generateHtml(cv_data, template_id);

                if (return_html) {
                    return completeRequest(request, new Response(html, {
                        headers: { "Content-Type": "text/html" },
                    }));
                }

                const filename = `cv_${Date.now()}.pdf`;
                const result = await generatePDF(html, filename, return_buffer);

                if (return_buffer) {
                    return completeRequest(request, new Response(result as Buffer, {
                        headers: {
                            "Content-Type": "application/pdf",
                            "Content-Disposition": `attachment; filename="${filename}"`,
                        },
                    }));
                }

                return completeRequest(request, { success: true, message: "PDF generated.", path: result });
            } catch (error: unknown) {
                await logRouteError("render.pdf.failed", request, "CV render failed", error);
                return completeRequest(request, jsonError(errorMessage(error, "CV render failed.")), 500);
            }
        }, {
            body: renderPdfBodySchema,
        })
        .post("/render/markdown/preview", async ({ body, request }: { body: any; request: Request }) => {
            const { markdown, style, title } = body;

            try {
                const html = renderMarkdownToHtml({ markdown, style, title });
                return completeRequest(request, new Response(html, {
                    headers: { "Content-Type": "text/html" },
                }));
            } catch (error: unknown) {
                await logRouteError("render.markdown.preview.failed", request, "Markdown preview failed", error);
                return completeRequest(request, jsonError(errorMessage(error, "Markdown preview failed.")), 500);
            }
        }, {
            body: renderMarkdownBodySchema,
        })
        .post("/render/markdown", async ({ body, request }: { body: any; request: Request }) => {
            const { markdown, style = "document", title = "Document" } = body;

            try {
                const html = renderMarkdownToHtml({ markdown, style, title });
                const filename = `${safeFilename(title)}_${Date.now()}.pdf`;
                const pdfBuffer = await generatePDF(html, filename, true);

                return completeRequest(request, new Response(pdfBuffer as Buffer, {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `attachment; filename="${filename}"`,
                    },
                }));
            } catch (error: unknown) {
                await logRouteError("render.markdown.failed", request, "Markdown PDF failed", error);
                return completeRequest(request, jsonError(errorMessage(error, "Markdown PDF failed.")), 500);
            }
        }, {
            body: renderMarkdownBodySchema,
        });
}
