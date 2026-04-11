import { redirect } from 'next/navigation';

/**
 * Legacy /register route. The unified auth page lives at '/' and runs the
 * approval-aware sign-up flow (see src/app/page.tsx). The old multi-step
 * register page bypassed the pending-approval gate, so it is permanently
 * redirected to '/'.
 */
export default function LegacyRegister() {
  redirect('/');
}
