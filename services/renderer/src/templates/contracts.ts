export const RENDERER_ENGINE_VERSION = "2";
export const TEMPLATE_CONTRACT_VERSION = "2";
export const SELECTOR_CONTRACT_VERSION = "1";
export const RENDER_MANIFEST_VERSION = "1";

export type TemplateCapabilities = {
    columns: Array<1 | 2>;
    photo: boolean;
    sidebar: boolean;
    pageBreaks: boolean;
    customCss: boolean;
};

export type TemplateContract = {
    id: string;
    engineVersion: string;
    templateContractVersion: string;
    selectorContractVersion: string;
    capabilities: TemplateCapabilities;
};

const TWO_COLUMN_CAPABILITIES: TemplateCapabilities = {
    columns: [1, 2],
    photo: true,
    sidebar: true,
    pageBreaks: true,
    customCss: true,
};

const SINGLE_COLUMN_CAPABILITIES: TemplateCapabilities = {
    columns: [1],
    photo: true,
    sidebar: false,
    pageBreaks: true,
    customCss: true,
};

const TEMPLATE_IDS = [
    "modern",
    "atlas-sidebar",
    "compact",
    "ats",
    "student",
    "creative",
    "ledger",
    "executive",
    "signal",
    "scholar",
] as const;

export const TEMPLATE_CONTRACTS: Record<string, TemplateContract> =
    Object.fromEntries(
        TEMPLATE_IDS.map((id) => [
            id,
            {
                id,
                engineVersion: RENDERER_ENGINE_VERSION,
                templateContractVersion: TEMPLATE_CONTRACT_VERSION,
                selectorContractVersion: SELECTOR_CONTRACT_VERSION,
                capabilities: ["ats", "student", "ledger", "scholar"].includes(id)
                    ? {
                          ...SINGLE_COLUMN_CAPABILITIES,
                          photo: id !== "ats",
                      }
                    : { ...TWO_COLUMN_CAPABILITIES },
            },
        ]),
    );

export class TemplateContractError extends Error {
    readonly code = "renderer.template_contract_incompatible";

    constructor(message: string) {
        super(message);
        this.name = "TemplateContractError";
    }
}

export function resolveTemplateContract(templateId: string): TemplateContract {
    const contract = TEMPLATE_CONTRACTS[templateId];
    if (!contract) {
        throw new TemplateContractError(
            `Template "${templateId}" is not registered for renderer engine ${RENDERER_ENGINE_VERSION}.`,
        );
    }
    if (
        contract.engineVersion !== RENDERER_ENGINE_VERSION ||
        contract.templateContractVersion !== TEMPLATE_CONTRACT_VERSION ||
        contract.selectorContractVersion !== SELECTOR_CONTRACT_VERSION
    ) {
        throw new TemplateContractError(
            `Template "${templateId}" uses an incompatible renderer contract.`,
        );
    }
    return contract;
}

export const PUBLIC_CV_SELECTORS = [
    '[data-cv-role="document"]',
    '[data-cv-role="header"]',
    '[data-cv-role="profile-name"]',
    '[data-cv-role="profile-photo"]',
    '[data-cv-role="contact-list"]',
    '[data-cv-role="contact-item"]',
    '[data-cv-role="content"]',
    '[data-cv-role="column"]',
    '[data-cv-role="section"]',
    '[data-cv-role="section-heading"]',
    '[data-cv-role="entry"]',
    '[data-cv-role="entry-title"]',
    '[data-cv-role="entry-subtitle"]',
    '[data-cv-role="entry-link"]',
    '[data-cv-role="entry-date"]',
    '[data-cv-role="entry-description"]',
    '[data-cv-role="tag-list"]',
    '[data-cv-role="tag"]',
] as const;
