// Re-export shim — the tooltip map moved to src/lib/feasibility-v6/tooltips.ts
// during Sprint 0 of the v6 implementation. This file stays as a re-export so
// the preview page imports continue to work. Will be deleted in Sprint 12 when
// the localhost preview is retired (after v6 cutover).

export { TOOLTIPS, getTooltip } from '@/lib/feasibility-v6/tooltips';
