// ZAAHI Feasibility v6.1 — the autosave engine behind the Studies bar.
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §Autosave.
//
// No React, no fetch, no timers of its own: the API, the browser backup and
// the clock are injected. That is what lets scripts/feasibility-studies.test.ts
// drive it with a fake server and prove the promises it makes:
//
//   • nothing is created until the inputs actually change
//   • the study row is created once, on the first change, however fast the
//     user types (saves run one at a time, in order)
//   • a burst of changes becomes one save, ~1.5 s after the last
//   • a failed save loses nothing: the inputs go to the browser backup, the
//     next change (or Retry) tries again; a backup left by an earlier visit
//     is never cleared behind the user's back
//   • "tables not deployed" (503 studies_unavailable) stops the calls for the
//     session and keeps the backup current instead
//   • leaving the plot sends whatever is still waiting, to the RIGHT study
//
// One session = one plot on screen. The Studies bar makes a new one when the
// plot changes and disposes the old one, which finishes its own saves.

import type { StudyInputs } from './model';
import type { ParcelInput } from './parcelInput';
import { defaultStudyName, stableStringify, type StudySummaryDto } from './studyRules';

export const AUTOSAVE_DELAY_MS = 1500;

/** Structurally the same as studiesClient's ApiResult — kept local so this file stays free of browser imports. */
type Result<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

export interface AutosaveApi {
  create(body: {
    name: string;
    parcelId: string | null;
    vaultEntryId: string | null;
    plot: { plotNumber: string; district: string; emirate: string };
    draftInputs: StudyInputs;
  }): Promise<Result<{ study: StudySummaryDto }>>;
  patchDraft(studyId: string, draftInputs: StudyInputs): Promise<Result<{ study: { draftUpdatedAt: string | null; updatedAt: string } }>>;
}

/** The browser-side safety copy (localStorage in production, a Map in tests). */
export interface BackupStore {
  write(key: string, inputs: StudyInputs): void;
  clear(key: string): void;
}

export type AutosaveStatus =
  | { kind: 'idle' }
  /** Changes are waiting for the debounce. */
  | { kind: 'pending' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'error'; status: number; code: string }
  /** The study tables are not deployed; nothing will be sent this session. */
  | { kind: 'unavailable' };

export interface AutosaveEvents {
  onStatus(status: AutosaveStatus): void;
  /**
   * The study row was just created by the first save. `active` is false when
   * the user opened another study while the create was in flight — the row
   * exists and belongs in the list, but it is not the one being edited.
   */
  onCreated(study: StudySummaryDto, active: boolean): void;
  onDraftSaved(studyId: string, meta: { draftUpdatedAt: string | null; updatedAt: string }): void;
  /** The study being saved into no longer exists (404). The next save starts a new one. */
  onStudyLost(): void;
  onBackupCleared(): void;
}

export interface AutosaveOptions {
  parcel: ParcelInput;
  vaultEntryId: string | null;
  /** The inputs on screen when the session began. Never saved as "a change" while no study exists. */
  born: StudyInputs;
  api: AutosaveApi;
  backup: BackupStore;
  events: AutosaveEvents;
  delayMs?: number;
  now?: () => Date;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export const backupKeyFor = (p: Pick<ParcelInput, 'emirate' | 'plotNumber'>): string => `zaahi.feasibility.draft.${p.emirate}.${p.plotNumber}`;

interface Job {
  inputs: StudyInputs;
  json: string;
}

/**
 * Where saves go: one study (or "the study the first save will create") and
 * what is known to be saved in it. Opening another study swaps the target; a
 * save already queued keeps the target it was queued for, so it can never
 * land in the study that was opened after it.
 */
interface Target {
  studyId: string | null;
  baseline: string | null;
}

export class AutosaveSession {
  /** Kept current by the owner while the same plot stays on screen (price edits etc.). */
  parcel: ParcelInput;
  readonly vaultEntryId: string | null;
  unavailable = false;

  private target: Target = { studyId: null, baseline: null };
  private born: string;
  private pending: Job | null = null;
  /** The inputs most recently on screen — what the draft must end up equal to. */
  private lastSeen: Job | null = null;
  private timer: unknown = null;
  private chain: Promise<void> = Promise.resolve();
  private detached = false;
  /** True once THIS session has written the browser backup. */
  private wroteBackup = false;

  private readonly api: AutosaveApi;
  private readonly backup: BackupStore;
  private readonly events: AutosaveEvents;
  private readonly delayMs: number;
  private readonly now: () => Date;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(o: AutosaveOptions) {
    this.parcel = o.parcel;
    this.vaultEntryId = o.vaultEntryId;
    this.born = stableStringify(o.born);
    this.api = o.api;
    this.backup = o.backup;
    this.events = o.events;
    this.delayMs = o.delayMs ?? AUTOSAVE_DELAY_MS;
    this.now = o.now ?? (() => new Date());
    this.setTimer = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** The caller's own study receiving the autosave; null until created. */
  get studyId(): string | null {
    return this.target.studyId;
  }

  /** True when these inputs are exactly what the current study is known to hold. */
  isSaved(inputs: StudyInputs): boolean {
    return stableStringify(inputs) === this.target.baseline;
  }

  private emit(fn: (e: AutosaveEvents) => void): void {
    if (!this.detached) fn(this.events);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
  }

  /**
   * The calculator is showing these inputs and the user has not touched them
   * (a fresh seed, or a re-seed after the plot's facts changed). While no
   * study exists they become the reference that is never saved as a change.
   */
  pristine(inputs: StudyInputs): void {
    if (!this.target.studyId) this.born = stableStringify(inputs);
  }

  /**
   * The calculator's inputs changed while it is dirty. Schedules a save
   * `delayMs` after the LAST call. Returns false when there is nothing to do.
   */
  change(inputs: StudyInputs): boolean {
    const job: Job = { inputs, json: stableStringify(inputs) };
    this.lastSeen = job;
    // Until a study exists, the inputs the session opened with are not a
    // change. This is what stops a study being created by merely opening the
    // calculator — or by the previous plot's inputs arriving a beat late.
    const nothingToSave = job.json === this.target.baseline || (!this.target.studyId && job.json === this.born);
    if (nothingToSave) {
      // The user typed something and put it back before it was sent: the
      // queued save would now write inputs that are no longer on screen.
      if (this.pending) {
        this.cancelTimer();
        this.pending = null;
        if (!this.unavailable) this.emit((e) => e.onStatus({ kind: 'idle' }));
      }
      return false;
    }
    this.pending = job;
    if (!this.unavailable) this.emit((e) => e.onStatus({ kind: 'pending' }));
    this.cancelTimer();
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
    return true;
  }

  /**
   * Save these inputs now, whether or not the calculator calls them dirty
   * (Retry, Recompute, Restore, and "make sure the study exists" before a
   * version is saved). Resolves when the queue has drained.
   */
  push(inputs: StudyInputs): Promise<void> {
    this.pending = { inputs, json: stableStringify(inputs) };
    this.lastSeen = this.pending;
    return this.flush();
  }

  /** Send whatever is waiting. Resolves when every save queued so far has finished. */
  flush(): Promise<void> {
    this.cancelTimer();
    const job = this.pending;
    if (!job) return this.chain;
    this.pending = null;
    const target = this.target;
    // Saves are chained, never parallel: the second save of a burst must see
    // the study id the first one created, or two rows would be made.
    this.chain = this.chain.then(() => this.run(job, target)).catch(() => undefined);
    return this.chain;
  }

  /**
   * A draft or a version was loaded into the calculator. `studyId` is the
   * study that should now receive edits — null for a study that is not the
   * caller's (a shared one), so their edits start a study of their own.
   * Anything still waiting for the previous study is dropped from the timer
   * (call flush() first to send it); a save already in flight completes
   * against the study it was queued for.
   */
  adopt(studyId: string | null, inputs: StudyInputs): void {
    this.cancelTimer();
    this.pending = null;
    this.lastSeen = { inputs, json: stableStringify(inputs) };
    this.target = { studyId, baseline: this.lastSeen.json };
  }

  /** A version was saved with these inputs; the server set the draft to them. */
  markSaved(inputs: StudyInputs): void {
    this.lastSeen = { inputs, json: stableStringify(inputs) };
    this.target.baseline = this.lastSeen.json;
  }

  /** Stop reporting to the UI, then finish any save still owed. */
  dispose(): Promise<void> {
    const done = this.flush();
    this.detached = true;
    return done;
  }

  private async run(job: Job, target: Target): Promise<void> {
    const key = backupKeyFor(this.parcel);
    const current = (): boolean => target === this.target;
    if (this.unavailable) {
      this.backup.write(key, job.inputs);
      this.wroteBackup = true;
      return;
    }
    if (target.studyId && job.json === target.baseline) return;
    if (current()) this.emit((e) => e.onStatus({ kind: 'saving' }));

    const fail = (r: { status: number; code: string }): void => {
      // Whatever went wrong, the inputs are not lost.
      this.backup.write(key, job.inputs);
      this.wroteBackup = true;
      if (r.code === 'studies_unavailable') {
        this.unavailable = true;
        this.emit((e) => e.onStatus({ kind: 'unavailable' }));
        return;
      }
      if (r.status === 404 && target.studyId) {
        target.studyId = null;
        target.baseline = null;
        if (current()) this.emit((e) => e.onStudyLost());
      }
      if (current()) this.emit((e) => e.onStatus({ kind: 'error', status: r.status, code: r.code }));
    };

    if (target.studyId) {
      const id = target.studyId;
      const r = await this.api.patchDraft(id, job.inputs);
      if (!r.ok) return fail(r);
      this.emit((e) => e.onDraftSaved(id, r.data.study));
    } else {
      const r = await this.api.create({
        name: defaultStudyName(this.now()),
        parcelId: this.parcel.id || null,
        vaultEntryId: this.vaultEntryId,
        plot: { plotNumber: this.parcel.plotNumber, district: this.parcel.district, emirate: this.parcel.emirate },
        draftInputs: job.inputs,
      });
      if (!r.ok) return fail(r);
      target.studyId = r.data.study.id;
      this.emit((e) => e.onCreated(r.data.study, current()));
    }
    target.baseline = job.json;
    if (!current()) return;
    // Clear only a backup this session wrote. One left by an EARLIER session
    // is a calculation the user has not seen restored yet — it stays until
    // they choose Restore or Discard.
    if (this.wroteBackup) {
      this.backup.clear(key);
      this.wroteBackup = false;
      this.emit((e) => e.onBackupCleared());
    }
    this.emit((e) => e.onStatus({ kind: 'saved', at: this.now() }));
    // While this save was in flight the user may have gone back to inputs
    // that looked "already saved" at the time (so change() queued nothing).
    // The draft must end up equal to what is on screen — send those now.
    if (!this.pending && this.lastSeen && this.lastSeen.json !== target.baseline) {
      this.pending = this.lastSeen;
      void this.flush();
    }
  }
}
