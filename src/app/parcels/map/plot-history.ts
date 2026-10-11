// Transaction history + registered project attached to a plot (ParcelDetail.history).
// Shape of the /api/sold-plots/[id] card, minus fields the panel does not render.
// Prices are integer fils (code rule 3); `psf` is derived (price ÷ plot sqft).

export interface PlotSale {
  d: string | null;
  p: number;
  psf: number | null;
  w: string | null;
  g: number | null;
  src: "dxb" | "kit";
  proc: string | null;
}

export type RegisteredProject =
  | { state: "unknown" }
  | { state: "none" }
  | {
      state: "project";
      title: string | null;
      status: string;
      pct: number | null;
      cancel: string | null;
      dev: string | null;
      escrow: string | null;
      start: string | null;
      end: string | null;
      asof: string;
    };

export interface PlotHistory {
  sales: PlotSale[];
  mortgages: number;
  gifts: number;
  far: number | null;
  gfaSqft: number | null;
  gfaSrc: string | null;
  project: RegisteredProject;
  /** Freshness line, e.g. "DXB Interact to 2026-08 · DLD registry xlsx to 2024-08". */
  source: string;
}
