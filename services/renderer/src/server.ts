import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { generatePDF } from "./pdf/generator";
import { renderMarkdownToHtml } from "./markdown";
import { generateHtml } from "./templates/engine";

function safeFilename(title: string, fallback = "document"): string {
    const cleaned = title
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
    return cleaned || fallback;
}

const app = new Elysia()
    .use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"] }))

    .get("/", () => ({ status: "Renderer Service is running" }))

    .post("/render/pdf", async ({ body }: any) => {
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
        } catch (error: any) {
            console.error("CV render failed:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } },
            );
        }
    }, {
        body: t.Object({
            cv_data: t.Any(),
            template_id: t.Optional(t.String()),
            return_buffer: t.Optional(t.Boolean()),
            return_html: t.Optional(t.Boolean()),
        }),
    })

    .post("/render/markdown/preview", async ({ body }: any) => {
        const { markdown, style, title } = body;

        try {
            const html = renderMarkdownToHtml({ markdown, style, title });
            return new Response(html, {
                headers: { "Content-Type": "text/html" },
            });
        } catch (error: any) {
            console.error("Markdown preview failed:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } },
            );
        }
    }, {
        body: t.Object({
            markdown: t.String(),
            style: t.Optional(t.Union([t.Literal("document"), t.Literal("letter")])),
            title: t.Optional(t.String()),
        }),
    })

    .post("/render/markdown", async ({ body }: any) => {
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
        } catch (error: any) {
            console.error("Markdown PDF failed:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { "Content-Type": "application/json" } },
            );
        }
    }, {
        body: t.Object({
            markdown: t.String(),
            style: t.Optional(t.Union([t.Literal("document"), t.Literal("letter")])),
            title: t.Optional(t.String()),
        }),
    })

    .listen(4000);

console.log(`Mindris Renderer running at http://${app.server?.hostname}:${app.server?.port}`);
