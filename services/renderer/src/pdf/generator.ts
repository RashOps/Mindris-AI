import puppeteer from "puppeteer";
import { join } from "path";
import { mkdirSync } from "fs";

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
    // Launch headless browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Inject the HTML
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Ensure storage directory exists
        // Going up from services/renderer/src/pdf -> services/renderer -> services -> root -> storage/pdfs
        const rootDir = join(import.meta.dir, "..", "..", "..", "..", "storage", "pdfs");
        mkdirSync(rootDir, { recursive: true });
        
        const savePath = join(rootDir, filename);

        // Generate the PDF
        const pdfBuffer = await page.pdf({
            path: returnBuffer ? undefined : savePath, // If path is undefined, it only returns the buffer
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: true
        });

        if (returnBuffer) {
            // Puppeteer typings for page.pdf() return Buffer | Uint8Array
            return Buffer.from(pdfBuffer);
        }

        return savePath;

    } finally {
        await browser.close();
    }
}
