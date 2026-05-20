import { redirect } from 'next/navigation';

/**
 * Legacy route — `/app` now lives at `/tools/cv-creator`.
 * This redirect ensures existing links and bookmarks keep working.
 */
export default function AppRedirect() {
  redirect('/tools/cv-creator');
}
