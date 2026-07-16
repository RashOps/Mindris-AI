import type { AtsReport, AtsRubric } from "./types";

const DEFAULT_ATS_RUBRIC: AtsRubric = {
  version: "ats-v1",
  mode: "standard",
  dimensions: [
    {
      key: "keyword_match",
      label: "Keyword Match Rate",
      weight: 30,
      description:
        "Coverage of required hard and soft skills from the target job.",
    },
    {
      key: "experience_relevance",
      label: "Experience Relevance",
      weight: 25,
      description:
        "How directly the candidate experience maps to the target role.",
    },
    {
      key: "formatting_structure",
      label: "Formatting & Structure",
      weight: 15,
      description:
        "Clarity, semantic structure, and ATS readability of the resume.",
    },
    {
      key: "quantification",
      label: "Quantification",
      weight: 10,
      description: "Presence of metrics and measurable impact in bullets.",
    },
    {
      key: "title_alignment",
      label: "Title & Role Alignment",
      weight: 10,
      description: "Alignment between resume framing and target role.",
    },
    {
      key: "overall_coherence",
      label: "Overall Coherence",
      weight: 10,
      description: "Consistency and clarity for the application context.",
    },
  ],
};

export function normalizeAtsReport(
  value: AtsReport | null | undefined,
): AtsReport {
  const candidate = (value ?? {}) as Partial<AtsReport>;
  const mode = candidate.mode === "strict" ? "strict" : "standard";
  const rubricCandidate = candidate.rubric ?? DEFAULT_ATS_RUBRIC;

  return {
    id: typeof candidate.id === "number" ? candidate.id : null,
    job_id: typeof candidate.job_id === "number" ? candidate.job_id : null,
    score: typeof candidate.score === "number" ? candidate.score : 0,
    mode,
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    rubric: {
      version:
        typeof rubricCandidate.version === "string"
          ? rubricCandidate.version
          : DEFAULT_ATS_RUBRIC.version,
      mode,
      dimensions: Array.isArray(rubricCandidate.dimensions)
        ? rubricCandidate.dimensions.map((dimension) => ({
            key: typeof dimension?.key === "string" ? dimension.key : "",
            label: typeof dimension?.label === "string" ? dimension.label : "",
            weight:
              typeof dimension?.weight === "number" ? dimension.weight : 0,
            description:
              typeof dimension?.description === "string"
                ? dimension.description
                : "",
          }))
        : DEFAULT_ATS_RUBRIC.dimensions,
    },
    scoring_breakdown: Array.isArray(candidate.scoring_breakdown)
      ? candidate.scoring_breakdown
      : [],
    deductions: Array.isArray(candidate.deductions)
      ? candidate.deductions.map((deduction) => ({
          code: typeof deduction?.code === "string" ? deduction.code : "",
          title: typeof deduction?.title === "string" ? deduction.title : "",
          severity:
            deduction?.severity === "high" || deduction?.severity === "low"
              ? deduction.severity
              : "medium",
          points_lost:
            typeof deduction?.points_lost === "number"
              ? deduction.points_lost
              : 0,
          evidence:
            typeof deduction?.evidence === "string" ? deduction.evidence : "",
          recommendation:
            typeof deduction?.recommendation === "string"
              ? deduction.recommendation
              : "",
        }))
      : [],
    keyword_analysis: Array.isArray(candidate.keyword_analysis)
      ? candidate.keyword_analysis
      : [],
    recommendations: Array.isArray(candidate.recommendations)
      ? candidate.recommendations
      : [],
    context: {
      job_title:
        typeof candidate.context?.job_title === "string"
          ? candidate.context.job_title
          : "",
      job_company:
        typeof candidate.context?.job_company === "string"
          ? candidate.context.job_company
          : "",
      job_id:
        typeof candidate.context?.job_id === "number"
          ? candidate.context.job_id
          : null,
      resume_id:
        typeof candidate.context?.resume_id === "number"
          ? candidate.context.resume_id
          : null,
      resume_locale:
        typeof candidate.context?.resume_locale === "string"
          ? candidate.context.resume_locale
          : null,
      provider:
        typeof candidate.context?.provider === "string"
          ? candidate.context.provider
          : "",
      model_name:
        typeof candidate.context?.model_name === "string"
          ? candidate.context.model_name
          : "",
    },
  };
}
