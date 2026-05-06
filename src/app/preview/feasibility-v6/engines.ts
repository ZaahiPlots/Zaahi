// Re-export shim — the engine catalogue moved to src/lib/feasibility-v6/engines.ts
// during Sprint 0 of the v6 implementation. This file stays as a re-export so
// the preview page imports continue to work. Will be deleted in Sprint 12 when
// the localhost preview is retired (after v6 cutover).

export {
  ENGINES,
  ENGINE_ORDER,
  diffTone,
  type EngineId,
  type ModifierId,
  type EngineDefaults,
  type DiffTone,
  type DiffResult,
} from '@/lib/feasibility-v6/engines';
