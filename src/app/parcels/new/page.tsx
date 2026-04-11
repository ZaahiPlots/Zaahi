import { redirect } from 'next/navigation';

/**
 * The "Add Plot" flow lives inside the map page (AddPlotModal). This stub
 * was a disconnected form that did nothing on submit. Redirect any direct hit
 * to the real map so users can use the proper listing wizard.
 */
export default function NewParcelRedirect() {
  redirect('/parcels/map');
}
