import { fr } from "@/i18n/messages";

/** French-first static copy for server/configuration code.
 * Client components should use `useI18n()` so backend-selected locales apply.
 */
export const PRODUCT_COPY = {
  app: fr.app,
  tools: fr.tools,
  sidebar: fr.sidebar,
} as const;
