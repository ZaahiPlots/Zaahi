import { redirect } from 'next/navigation';

/**
 * The real settings UI lives inside the dashboard at /dashboard?section=settings.
 * This stub used to ship a disconnected form with no persistence — redirect
 * any direct hit so users can't reach an unauthenticated, mock-state page.
 */
export default function SettingsRedirect() {
  redirect('/dashboard');
}
