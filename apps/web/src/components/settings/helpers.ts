import type { Catalogue, ProviderStatus } from "./types";
import type { LLMProvider } from "@/store/useCVStore";

export function taskLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveProviderList(catalogue: Catalogue): LLMProvider[] {
  const keys = Object.keys(catalogue);
  return keys.length
    ? (keys as LLMProvider[])
    : ["groq", "gemini", "openai", "mistral", "ollama"];
}

export function providerConfigured(
  providerStatus: ProviderStatus,
  provider: string,
): boolean {
  return providerStatus[provider]?.configured !== false;
}
