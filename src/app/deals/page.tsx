import { redirect } from 'next/navigation';

/**
 * The real deal listing lives in the dashboard ("Deals" section). This stub
 * used to render hard-coded mock deals — redirect any direct hit so users do
 * not stumble on placeholder data.
 */
export default function DealsRedirect() {
  redirect('/dashboard');
}
