import type { Page } from "puppeteer";

import { RENDER_MANIFEST_VERSION } from "./contracts";

declare const document: any;
declare function requestAnimationFrame(callback: () => void): number;
declare function getComputedStyle(element: any): { fontSize: string };

export type RenderWarning = {
    messageId: string;
    severity: "info" | "warning" | "error";
    sectionId?: string;
    params?: Record<string, string | number | boolean>;
};

export type RenderManifest = {
    version: string;
    resumeId: string | number | null;
    resumeRevision: number | null;
    contentHash: string;
    template: {
        id: string;
        version: string;
        selectorContractVersion: string;
    };
    document: {
        pageCount: number;
        format: "A4" | "Letter";
        overflow: boolean;
        width: number;
        height: number;
    };
    sections: Array<{
        id: string;
        type: string;
        page: number;
        column: "main" | "sidebar";
        index: number;
        bounds: { x: number; y: number; width: number; height: number };
        overflow: boolean;
        clipped: boolean;
        density: number;
        minFontSize: number | null;
    }>;
    warnings: RenderWarning[];
};

export type RenderIdentity = {
    resumeId?: string | number | null;
    resumeRevision?: number | null;
    contentHash: string;
    templateId: string;
    templateVersion: string;
    selectorContractVersion: string;
    format: "A4" | "Letter";
};

export async function waitForStableDocument(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await document.fonts?.ready;
        await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
    });
}

export async function measureRenderManifest(
    page: Page,
    identity: RenderIdentity,
): Promise<RenderManifest> {
    await waitForStableDocument(page);
    const measured = await page.evaluate((format) => {
        const host = document.querySelector("#shadow-host");
        const root = host?.shadowRoot;
        const documentNode = root?.querySelector(
            '[data-cv-role="document"]',
        );
        if (!root || !documentNode) {
            throw new Error("Renderer semantic document root is missing.");
        }

        const mmToPx = 96 / 25.4;
        const pageHeight = (format === "Letter" ? 279 : 297) * mmToPx;
        const pageWidth = (format === "Letter" ? 216 : 210) * mmToPx;
        const documentRect = documentNode.getBoundingClientRect();
        const sectionNodes = Array.from(
            root.querySelectorAll('[data-cv-role="section"]'),
        ) as any[];
        const warnings: RenderWarning[] = [];
        const bounds = sectionNodes.map((node) => {
            const rect = node.getBoundingClientRect();
            const x = rect.left - documentRect.left;
            const y = rect.top - documentRect.top;
            return {
                node,
                x,
                y,
                width: rect.width,
                height: rect.height,
                bottom: y + rect.height,
                right: x + rect.width,
            };
        });

        const sections = bounds.map((item, index) => {
            const styles = Array.from(
                item.node.querySelectorAll("*"),
            )
                .map((element) =>
                    Number.parseFloat(getComputedStyle(element).fontSize),
                )
                .filter((size) => Number.isFinite(size) && size > 0);
            const minFontSize = styles.length ? Math.min(...styles) : null;
            const page = Math.max(1, Math.floor(item.y / pageHeight) + 1);
            const pageEnd = page * pageHeight;
            const clipped =
                item.node.scrollHeight > item.node.clientHeight + 1 ||
                item.node.scrollWidth > item.node.clientWidth + 1;
            const overflow =
                item.right > documentRect.width + 1 ||
                item.x < -1 ||
                item.bottom > documentNode.scrollHeight + 1;
            const crossesPage = item.y < pageEnd && item.bottom > pageEnd + 1;
            const textLength = item.node.textContent?.trim().length ?? 0;
            const density =
                item.width * item.height > 0
                    ? Math.min(
                          1,
                          Number(
                              (
                                  textLength /
                                  ((item.width * item.height) / 180)
                              ).toFixed(3),
                          ),
                      )
                    : 0;
            const sectionId =
                item.node.dataset.sectionId ??
                item.node.dataset.sectionType ??
                `section-${index}`;

            if (clipped || overflow) {
                warnings.push({
                    messageId: "renderer.section_overflow",
                    severity: "error",
                    sectionId,
                });
            }
            if (crossesPage) {
                warnings.push({
                    messageId: "renderer.section_crosses_page",
                    severity: "warning",
                    sectionId,
                    params: { page },
                });
            }
            if (minFontSize !== null && minFontSize < 10) {
                warnings.push({
                    messageId: "renderer.font_too_small",
                    severity: "warning",
                    sectionId,
                    params: { minFontSize },
                });
            }
            if (!item.node.textContent?.trim()) {
                warnings.push({
                    messageId: "renderer.section_empty",
                    severity: "warning",
                    sectionId,
                });
            }
            if (
                (Array.from(item.node.querySelectorAll("a")) as any[]).some(
                    (link) => (link.textContent?.length ?? 0) > 72,
                )
            ) {
                warnings.push({
                    messageId: "renderer.link_too_long",
                    severity: "warning",
                    sectionId,
                });
            }

            return {
                id: sectionId,
                type: item.node.dataset.sectionType ?? "custom",
                page,
                column:
                    item.node.dataset.placement === "sidebar"
                        ? ("sidebar" as const)
                        : ("main" as const),
                index: Number.parseInt(item.node.dataset.order ?? `${index}`, 10),
                bounds: {
                    x: Number(item.x.toFixed(2)),
                    y: Number(item.y.toFixed(2)),
                    width: Number(item.width.toFixed(2)),
                    height: Number(item.height.toFixed(2)),
                },
                overflow,
                clipped,
                density,
                minFontSize,
            };
        });

        for (let left = 0; left < bounds.length; left += 1) {
            for (let right = left + 1; right < bounds.length; right += 1) {
                const a = bounds[left]!;
                const b = bounds[right]!;
                const overlap =
                    a.x < b.right - 1 &&
                    a.right > b.x + 1 &&
                    a.y < b.bottom - 1 &&
                    a.bottom > b.y + 1;
                if (overlap) {
                    warnings.push({
                        messageId: "renderer.sections_overlap",
                        severity: "error",
                        sectionId:
                            a.node.dataset.sectionId ??
                            a.node.dataset.sectionType,
                        params: {
                            otherSection:
                                b.node.dataset.sectionId ??
                                b.node.dataset.sectionType ??
                                "unknown",
                        },
                    });
                }
            }
        }

        const contentHeight = Math.max(
            documentNode.scrollHeight,
            documentRect.height,
        );
        const pageCount = Math.max(1, Math.ceil(contentHeight / pageHeight));
        const lastPageFill =
            (contentHeight - (pageCount - 1) * pageHeight) / pageHeight;
        if (pageCount > 1 && lastPageFill < 0.2) {
            warnings.push({
                messageId: "renderer.page_almost_empty",
                severity: "info",
                params: { page: pageCount, fill: Number(lastPageFill.toFixed(2)) },
            });
        }

        const columnHeights = {
            main:
                root.querySelector(".section-column-main")
                    ?.scrollHeight ?? 0,
            sidebar:
                root.querySelector(".section-column-sidebar")
                    ?.scrollHeight ?? 0,
        };
        const tallest = Math.max(columnHeights.main, columnHeights.sidebar);
        if (
            columnHeights.main > 0 &&
            columnHeights.sidebar > 0 &&
            Math.abs(columnHeights.main - columnHeights.sidebar) / tallest > 0.45
        ) {
            warnings.push({
                messageId: "renderer.columns_unbalanced",
                severity: "info",
                params: columnHeights,
            });
        }

        return {
            document: {
                pageCount,
                overflow:
                    documentNode.scrollWidth > pageWidth + 1 ||
                    sections.some((section) => section.overflow),
                width: Number(documentRect.width.toFixed(2)),
                height: Number(contentHeight.toFixed(2)),
            },
            sections,
            warnings,
        };
    }, identity.format);

    return {
        version: RENDER_MANIFEST_VERSION,
        resumeId: identity.resumeId ?? null,
        resumeRevision: identity.resumeRevision ?? null,
        contentHash: identity.contentHash,
        template: {
            id: identity.templateId,
            version: identity.templateVersion,
            selectorContractVersion: identity.selectorContractVersion,
        },
        document: {
            ...measured.document,
            format: identity.format,
        },
        sections: measured.sections,
        warnings: measured.warnings,
    };
}
