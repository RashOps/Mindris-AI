import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { createRendererLogger, type RendererLogger } from "./logger";
import { renderMarkdownToHtml } from "./markdown";
import { RendererMonitor } from "./monitoring";
import { getBrowserManager } from "./pdf/browser-manager";
import {
    generatePDF,
    generatePDFWithManifest,
    inspectRenderedHtml,
} from "./pdf/generator";
import {
    buildDocsHtml,
    buildOpenApiDocument,
    renderMarkdownBodySchema,
    renderPdfBodySchema,
} from "./openapi";
import { renderDocument } from "./templates/engine";
import {
    PUBLIC_CV_SELECTORS,
    RENDERER_ENGINE_VERSION,
    RENDER_MANIFEST_VERSION,
    SELECTOR_CONTRACT_VERSION,
    TEMPLATE_CONTRACT_VERSION,
    TEMPLATE_CONTRACTS,
    TemplateContractError,
} from "./templates/contracts";

const LOOPBACK_BROWSER_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function jsonError(message: string, status = 500, messageId?: string): Response {
    return new Response(
        JSON.stringify({
            status: "error",
            message,
            ...(messageId ? { message_id: messageId } : {}),
        }),
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
    options: { logger?: RendererLogger; monitor?: RendererMonitor } = {},
) {
    const openApiDocument = buildOpenApiDocument(baseUrl);
    const logger = options.logger ?? createRendererLogger();
    const monitor = options.monitor ?? new RendererMonitor();
    const startedAt = new WeakMap<Request, number>();

    const completeRequest = async <T>(
        request: Request,
        response: T,
        explicitStatus?: number,
    ): Promise<T> => {
        const durationMs = Number((performance.now() - (startedAt.get(request) ?? performance.now())).toFixed(2));
        monitor.recordRequest(
            routePathOf(request),
            request.method,
            statusCodeOf(response, explicitStatus),
            durationMs,
        );
        await logger.log({
            level: "info",
            event: "request.completed",
            message: "Request served",
            method: request.method,
            route: routePathOf(request),
            status: statusCodeOf(response, explicitStatus),
            duration_ms: durationMs,
        });

        return response;
    };

    const logRouteError = async (
        event: string,
        request: Request,
        message: string,
        error: unknown,
    ) => {
        monitor.recordRenderFailure(routePathOf(request));
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
        .use(cors({ origin: LOOPBACK_BROWSER_ORIGIN }))
        .onRequest(({ request }) => {
            startedAt.set(request, performance.now());
        })
        .get("/", ({ request }) => completeRequest(request, { status: "healthy", service: "renderer" }))
        .get("/health", ({ request }) => completeRequest(request, { status: "healthy", service: "renderer" }))
        .get("/ready", ({ request }) => {
            const browser = getBrowserManager().status();
            return completeRequest(request, {
                status: "ready",
                service: "renderer",
                checks: {
                    templates: {
                        ok: true,
                        renderer_engine_version: RENDERER_ENGINE_VERSION,
                        template_contract_version: TEMPLATE_CONTRACT_VERSION,
                        selector_contract_version: SELECTOR_CONTRACT_VERSION,
                        render_manifest_version: RENDER_MANIFEST_VERSION,
                    },
                    pdf: { ok: true },
                    browser_manager: {
                        ok: true,
                        ready: browser.ready,
                        active_pages: browser.activePages,
                        max_concurrent_pages: browser.maxConcurrentPages,
                    },
                },
            });
        })
        .get("/metrics", ({ request }) => completeRequest(request, monitor.snapshot()))
        .get("/contracts", ({ request }) => completeRequest(request, {
            status: "success",
            item: {
                renderer_engine_version: RENDERER_ENGINE_VERSION,
                template_contract_version: TEMPLATE_CONTRACT_VERSION,
                selector_contract_version: SELECTOR_CONTRACT_VERSION,
                render_manifest_version: RENDER_MANIFEST_VERSION,
                public_selectors: PUBLIC_CV_SELECTORS,
                templates: Object.values(TEMPLATE_CONTRACTS),
            },
        }))
        .get("/openapi.json", ({ request }) => completeRequest(request, openApiDocument))
        .get("/docs", ({ request }) => completeRequest(request, new Response(buildDocsHtml("/openapi.json"), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        })))
        .post("/render/pdf", async ({ body, request }: { body: any; request: Request }) => {
            const {
                cv_data,
                template_id,
                resume_id,
                resume_revision,
                content_hash,
                return_buffer,
                return_html,
                return_manifest,
            } = body;

            try {
                const document = renderDocument(cv_data, template_id);
                const identity = {
                    resumeId: resume_id,
                    resumeRevision: resume_revision,
                    contentHash: content_hash ?? document.contentHash,
                    templateId: document.template.id,
                    templateVersion: document.template.templateContractVersion,
                    selectorContractVersion:
                        document.template.selectorContractVersion,
                    format: document.format,
                };
                if (return_manifest && return_buffer) {
                    return completeRequest(
                        request,
                        jsonError(
                            "A binary PDF and a JSON manifest cannot share one response.",
                            422,
                            "renderer.binary_manifest_response_unsupported",
                        ),
                        422,
                    );
                }

                if (return_html) {
                    if (return_manifest) {
                        const manifest = await inspectRenderedHtml(
                            document.html,
                            identity,
                        );
                        return completeRequest(request, {
                            status: "success",
                            item: { html: document.html, manifest },
                        });
                    }
                    return completeRequest(request, new Response(document.html, {
                        headers: { "Content-Type": "text/html" },
                    }));
                }

                const filename = `cv_${Date.now()}.pdf`;
                if (return_manifest && !return_buffer) {
                    const { result, manifest } = await generatePDFWithManifest(
                        document.html,
                        identity,
                        filename,
                        false,
                    );
                    return completeRequest(request, {
                        success: true,
                        message: "PDF generated.",
                        path: result,
                        manifest,
                    });
                }
                const result = await generatePDF(
                    document.html,
                    filename,
                    return_buffer,
                );

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
                const status = error instanceof TemplateContractError ? 422 : 500;
                return completeRequest(
                    request,
                    jsonError(
                        errorMessage(error, "CV render failed."),
                        status,
                        error instanceof TemplateContractError
                            ? error.code
                            : "renderer.render_failed",
                    ),
                    status,
                );
            }
        }, {
            body: renderPdfBodySchema,
        })
        .post("/render/manifest", async ({ body, request }: { body: any; request: Request }) => {
            const {
                cv_data,
                template_id,
                resume_id,
                resume_revision,
                content_hash,
            } = body;
            try {
                const document = renderDocument(cv_data, template_id);
                const manifest = await inspectRenderedHtml(document.html, {
                    resumeId: resume_id,
                    resumeRevision: resume_revision,
                    contentHash: content_hash ?? document.contentHash,
                    templateId: document.template.id,
                    templateVersion: document.template.templateContractVersion,
                    selectorContractVersion:
                        document.template.selectorContractVersion,
                    format: document.format,
                });
                return completeRequest(request, {
                    status: "success",
                    item: manifest,
                });
            } catch (error: unknown) {
                await logRouteError("render.manifest.failed", request, "CV inspection failed", error);
                const status = error instanceof TemplateContractError ? 422 : 500;
                return completeRequest(
                    request,
                    jsonError(
                        errorMessage(error, "CV inspection failed."),
                        status,
                        error instanceof TemplateContractError
                            ? error.code
                            : "renderer.inspection_failed",
                    ),
                    status,
                );
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
