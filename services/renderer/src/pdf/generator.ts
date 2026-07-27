import { join } from "path";
import { mkdirSync } from "fs";

import { getBrowserManager } from "./browser-manager";
import {
    measureRenderManifest,
    type RenderIdentity,
    type RenderManifest,
} from "../templates/manifest";

function resolvePdfOutputDir(): string {
    return process.env.PDF_OUTPUT_DIR
        ?? join(import.meta.dir, "..", "..", "..", "..", "storage", "pdfs");
}

/**
 * Generates a PDF from an HTML string using Puppeteer.
 *
 * @param html The HTML string to render
 * @param filename Optional filename to save locally
 * @param returnBuffer Whether to return the raw Buffer instead of the file path
 * @returns A Buffer if returnBuffer is true, or the file path as a string.
 */
export async function generatePDF(
    html: string,
    filename: string = "cv-render.pdf",
    returnBuffer: boolean = false
): Promise<Buffer | string> {
    return getBrowserManager().withPage(async (page) => {
        await page.setContent(html, { waitUntil: "networkidle0" });

        const rootDir = resolvePdfOutputDir();
        mkdirSync(rootDir, { recursive: true });

        const savePath = join(rootDir, filename);

        const pdfBuffer = await page.pdf({
            path: returnBuffer ? undefined : savePath,
            format: "A4",
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            preferCSSPageSize: true
        });

        if (returnBuffer) {
            return Buffer.from(pdfBuffer);
        }

        return savePath;
    });
}

export async function inspectRenderedHtml(
    html: string,
    identity: RenderIdentity,
): Promise<RenderManifest> {
    return getBrowserManager().withPage(async (page) => {
        await page.setContent(html, { waitUntil: "networkidle0" });
        return measureRenderManifest(page, identity);
    });
}

export async function generatePDFWithManifest(
    html: string,
    identity: RenderIdentity,
    filename: string = "cv-render.pdf",
    returnBuffer: boolean = false,
): Promise<{ result: Buffer | string; manifest: RenderManifest }> {
    return getBrowserManager().withPage(async (page) => {
        await page.setContent(html, { waitUntil: "networkidle0" });
        const manifest = await measureRenderManifest(page, identity);

        const rootDir = resolvePdfOutputDir();
        mkdirSync(rootDir, { recursive: true });
        const savePath = join(rootDir, filename);
        const pdfBuffer = await page.pdf({
            path: returnBuffer ? undefined : savePath,
            format: identity.format,
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            preferCSSPageSize: true,
        });

        return {
            result: returnBuffer ? Buffer.from(pdfBuffer) : savePath,
            manifest,
        };
    });
}
