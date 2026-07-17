export type AdvancedCssConfig = {
    enabled?: boolean;
    mode?: "off" | "tokens" | "css_patch";
    css_text?: string;
};

export type SanitizedCssResult = {
    css: string;
    warnings: string[];
};

export function sanitizeAdvancedCss(settings?: any): SanitizedCssResult {
    const config = settings?.advanced_css as AdvancedCssConfig | undefined;
    if (!config || config.enabled !== true || !config.css_text?.trim()) {
        return { css: "", warnings: [] };
    }

    if (config.mode === "tokens") {
        return sanitizeTokenCss(config.css_text);
    }
    if (config.mode !== "css_patch") {
        return { css: "", warnings: [] };
    }

    const warnings: string[] = [];
    const safeRules: string[] = [];
    const rules = config.css_text
        .split("}")
        .map((chunk) => chunk.trim())
        .filter(Boolean);

    for (const rule of rules) {
        const [selectorPart, declarationPart] = rule.split("{");
        if (!selectorPart || !declarationPart) {
            warnings.push("Dropped malformed CSS rule.");
            continue;
        }
        const selectors = selectorPart
            .split(",")
            .map((selector) => selector.trim())
            .filter(Boolean);
        const safeSelectors = selectors.filter(isSafeShadowSelector);
        if (!safeSelectors.length) {
            warnings.push("Dropped unsupported selector outside the resume scope.");
            continue;
        }
        const safeDeclarations = sanitizeDeclarations(declarationPart);
        if (!safeDeclarations.length) {
            warnings.push("Dropped unsafe declaration from advanced CSS.");
            continue;
        }
        safeRules.push(`${safeSelectors.join(", ")} {\n${safeDeclarations.join("\n")}\n}`);
        if (safeSelectors.length !== selectors.length) {
            warnings.push("Dropped unsupported selector outside the resume scope.");
        }
    }

    return { css: safeRules.join("\n\n"), warnings: dedupeWarnings(warnings) };
}

function sanitizeTokenCss(cssText: string): SanitizedCssResult {
    const warnings: string[] = [];
    const rules = cssText
        .split("}")
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    const hostRules: string[] = [];

    for (const rule of rules) {
        const [selectorPart, declarationPart] = rule.split("{");
        if (!selectorPart || !declarationPart) {
            warnings.push("Dropped malformed CSS rule.");
            continue;
        }
        if (selectorPart.trim() !== ":host") {
            warnings.push("Token mode only accepts :host rules.");
            continue;
        }
        const safeDeclarations = sanitizeDeclarations(declarationPart);
        if (!safeDeclarations.length) {
            warnings.push("Dropped unsafe declaration from advanced CSS.");
            continue;
        }
        hostRules.push(`:host {\n${safeDeclarations.join("\n")}\n}`);
    }

    return { css: hostRules.join("\n\n"), warnings: dedupeWarnings(warnings) };
}

function sanitizeDeclarations(rawDeclarations: string): string[] {
    return rawDeclarations
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .filter((declaration) => {
            const lowered = declaration.toLowerCase();
            return !(
                lowered.includes("url(") ||
                lowered.includes("expression(") ||
                lowered.includes("javascript:") ||
                lowered.includes("@import")
            );
        })
        .map((declaration) => `  ${declaration};`);
}

function isSafeShadowSelector(selector: string): boolean {
    const normalized = selector.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === ":host") return true;
    if (
        normalized.includes("html") ||
        normalized.includes("body") ||
        normalized.includes(":root") ||
        normalized.includes("script") ||
        normalized.includes("iframe")
    ) {
        return false;
    }
    return (
        normalized.startsWith(".") ||
        normalized.startsWith("[data-") ||
        normalized.startsWith(":host")
    );
}

function dedupeWarnings(warnings: string[]): string[] {
    return Array.from(new Set(warnings));
}
