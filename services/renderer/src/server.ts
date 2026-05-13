import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { generateHtml } from "./templates/engine";
import { generatePDF } from "./pdf/generator";

// Setup Elysia application
const app = new Elysia()
    .use(cors()) // Enable CORS for the Next.js frontend
    // Basic health check
    .get("/", () => ({ status: "Renderer Service is running" }))
    
    // PDF Generation route
    .post("/render/pdf", async ({ body }: any) => {
        const { cv_data, template_id, return_buffer, return_html } = body;

        try {
            // 1. Generate HTML with Shadow DOM isolation
            const html = generateHtml(cv_data, template_id);

            // If the frontend only wants the HTML for the Live Preview:
            if (return_html) {
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html' }
                });
            }

            // 2. Generate a unique filename
            const filename = `cv_${Date.now()}.pdf`;

            // 3. Render PDF via Puppeteer
            const result = await generatePDF(html, filename, return_buffer);

            // 4. Return the correct format
            if (return_buffer) {
                // Return binary stream
                return new Response(result as Buffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${filename}"`
                    }
                });
            } else {
                // Return the local file path for debugging
                return {
                    success: true,
                    message: "PDF generated successfully.",
                    path: result
                };
            }

        } catch (error: any) {
            console.error("Rendering failed:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }, {
        // Validation using Elysia's built-in TypeBox wrapper (similar to Zod)
        body: t.Object({
            cv_data: t.Any(), // In a real app, strict typing would be mapped here
            template_id: t.Optional(t.String({ default: "modern" })),
            return_buffer: t.Optional(t.Boolean({ default: false })),
            return_html: t.Optional(t.Boolean({ default: false }))
        })
    })
    .listen(4000);

console.log(
    `🚀 Mindris Renderer Service running at http://${app.server?.hostname}:${app.server?.port}`
);
