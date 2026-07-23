import { apiHeaders, apiUrl, jsonHeaders } from "@/lib/api";

export type OnboardingStepId =
  | "runtime_ready"
  | "first_resume"
  | "provider_selected"
  | "provider_tested"
  | "first_job"
  | "first_export";

export interface OnboardingChecklist {
  version: number;
  recommended_mode: "local";
  completed: number;
  total: number;
  done: boolean;
  steps: {
    id: OnboardingStepId;
    status: "pending" | "completed" | "skipped";
    href: string;
    skippable: boolean;
  }[];
}

export async function fetchOnboarding(): Promise<OnboardingChecklist> {
  const response = await fetch(apiUrl("/api/v1/onboarding"), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error("Onboarding unavailable");
  return ((await response.json()) as { item: OnboardingChecklist }).item;
}

export async function updateOnboardingStep(
  id: OnboardingStepId,
  status: "pending" | "completed" | "skipped",
): Promise<OnboardingChecklist> {
  const response = await fetch(apiUrl(`/api/v1/onboarding/steps/${id}`), {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Onboarding update failed");
  return ((await response.json()) as { item: OnboardingChecklist }).item;
}

