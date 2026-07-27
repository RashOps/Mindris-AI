const baseCv = {
    global_settings: {
        template_id: "modern",
        page: { format: "A4" },
        layout: { columns: 1, sidebar_position: "none" },
        locale: { label_language: "fr", date_format: "MM/YYYY" },
        sections: [
            {
                id: "experience",
                type: "experience",
                label: "Expériences",
                placement: "main",
            },
            {
                id: "skills",
                type: "skills",
                label: "Compétences",
                placement: "sidebar",
            },
        ],
    },
    profile: {
        full_name: "Ada Lovelace",
        title: "Ingénieure logiciel",
        email: "ada@example.com",
        phone: "",
        location: { city: "Paris", country: "France" },
        socials: [],
        text_markdown: "Conçoit des systèmes fiables et observables.",
    },
    experience: [
        {
            id: "experience-1",
            role: "Ingénieure",
            company: "Mindris Labs",
            period: "2024-01 - 2026-07",
            location: { city: "Paris", country: "France" },
            description_markdown: "Construit des produits déterministes.",
            keywords: ["Architecture", "Qualité"],
        },
    ],
    education: [],
    skills: [{ id: "skills-1", category: "Core", skills: ["Python", "TypeScript"] }],
    projects: [],
    certifications: [],
    volunteering: [],
    publications: [],
    references: [],
    custom_sections: [],
    languages: [],
    hobbies: [],
};

function clone<T>(value: T): T {
    return structuredClone(value);
}

export const shortCvFixture = clone(baseCv);

export const longCvFixture = {
    ...clone(baseCv),
    experience: Array.from({ length: 10 }, (_, index) => ({
        ...baseCv.experience[0],
        id: `experience-${index + 1}`,
        role: `Ingénieure ${index + 1}`,
        description_markdown:
            "Conçoit, livre et mesure des systèmes fiables. ".repeat(12),
    })),
};

export const twoColumnCvFixture = {
    ...clone(baseCv),
    global_settings: {
        ...clone(baseCv.global_settings),
        layout: { columns: 2, sidebar_position: "right", sidebar_width: "35%" },
    },
};

export const photoCvFixture = {
    ...clone(twoColumnCvFixture),
    profile: {
        ...clone(baseCv.profile),
        photo_url: "data:image/png;base64,iVBORw0KGgo=",
    },
    global_settings: {
        ...clone(twoColumnCvFixture.global_settings),
        layout: {
            ...clone(twoColumnCvFixture.global_settings.layout),
            photo: {
                enabled: true,
                position: "left",
                size: "m",
                shape: "round",
                grayscale: false,
            },
        },
    },
};

export const multilingualCvFixture = {
    ...clone(baseCv),
    global_settings: {
        ...clone(baseCv.global_settings),
        locale: { label_language: "de", date_format: "MMMM YYYY" },
    },
};

export const customCssCvFixture = {
    ...clone(baseCv),
    global_settings: {
        ...clone(baseCv.global_settings),
        advanced_css: {
            enabled: true,
            mode: "css_patch",
            css_text:
                ":host { --primary-color: #0f766e; }\n[data-cv-role='section-heading'] { letter-spacing: .08em; }",
        },
    },
};

export const overflowCvFixture = {
    ...clone(longCvFixture),
    global_settings: {
        ...clone(longCvFixture.global_settings),
        page: { format: "A4", one_page_challenge: true },
    },
};

export const VERSIONED_RENDER_FIXTURES = {
    short: shortCvFixture,
    long: longCvFixture,
    twoColumn: twoColumnCvFixture,
    photo: photoCvFixture,
    multilingual: multilingualCvFixture,
    customCss: customCssCvFixture,
    overflow: overflowCvFixture,
} as const;
