import { redirect } from 'next/navigation';

/**
 * Legacy /login route. The unified auth page lives at '/' and runs the
 * approval-aware sign-in flow (see src/app/page.tsx). Any direct hit to /login
 * is permanently redirected so the older form cannot be used to bypass the
 * approval gate.
 */
export default function LegacyLogin() {
  redirect('/');
}
