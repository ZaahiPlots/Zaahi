'use client';

// ZAAHI Feasibility v6.1 — saved studies bar, mounted inside the calculator.
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md.
//
// What it does
//   • lists this plot's studies (own + read-only ones shared through the
//     vault entry)
//   • while `dirty`, autosaves `inputs` as the study's draft, ~1.5 s after
//     the last change. The study row is created on the FIRST dirty change —
//     opening the calculator never creates anything
//   • "Save version" freezes the current inputs as an immutable version
//   • opens a draft or any version back into the calculator through `onLoad`
//   • flags a version opened against changed defaults / plot facts / model
//
// What it must never do
//   • lose the user's inputs. They live in the calculator's state, not here;
//     a failed save only changes the status line, and the inputs are also
//     kept in localStorage until a save succeeds
//   • break the calculator. Every API call resolves to a value (see
//     studiesClient.ts); if the study tables are not deployed yet the bar
//     shows one notice and stops calling.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudyInputs } from '@/lib/feasibility-v6/model';
import type { ParcelInput } from '@/lib/feasibility-v6/parcelInput';
import { applyNewDefaults, parseStudyInputs, plotSnapshot } from '@/lib/feasibility-v6/study';
import { AutosaveSession, backupKeyFor, type AutosaveStatus, type BackupStore } from '@/lib/feasibility-v6/studyAutosave';
import {
  COMPARE_MAX,
  COMPARE_MIN,
  STUDY_NAME_MAX,
  VERSION_NOTES_MAX,
  compareHref,
  defaultVersionName,
  stalenessLines,
  stalenessOf,
  toggleCompareSelection,
} from '@/lib/feasibility-v6/studyRules';
import {
  createStudy,
  describeStudiesError,
  getStudy,
  isStudiesUnavailable,
  listStudies,
  patchStudy,
  saveVersion,
  type StudySummaryDto,
  type StudyVersionDto,
  type StudyVersionSummaryDto,
} from '@/lib/feasibility-v6/studiesClient';
import { DIM, GOLD, LINE, LINE_HARD, SUBTLE, TXT } from './ui';
import {
  Btn,
  Check,
  Field,
  HeadlineText,
  Notice,
  RED,
  SERIF,
  StudiesKeyframes,
  fmtDate,
  fmtTime,
  labelStyle,
} from './studiesUi';

export interface StudiesBarProps {
  parcel: ParcelInput;
  vaultEntryId?: string | null;
  /** The calculator's current inputs. */
  inputs: StudyInputs;
  /** True once the user has changed anything. */
  dirty: boolean;
  /** True in the ~350px side panel. */
  compact?: boolean;
  /** Replace the calculator inputs. */
  onLoad: (inputs: StudyInputs) => void;
}

const STALE_LINES_SHOWN = 6;

/** The bar's status line: the autosave engine's, plus "saved version N". */
type BarStatus = Exclude<AutosaveStatus, { kind: 'saved' }> | { kind: 'saved'; at: Date; note?: string };

type ListState = 'loading' | 'ready' | 'error' | 'unavailable';

// ── Browser-side safety copy ─────────────────────────────────────────────
// Written by the autosave engine whenever a save could not reach the server.

interface Backup {
  at: number;
  inputs: StudyInputs;
}

const browserBackup: BackupStore = {
  write(key, inputs) {
    try {
      window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), inputs }));
    } catch {
      /* storage full or blocked — the inputs are still in the calculator */
    }
  },
  clear(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

function readBackup(p: ParcelInput): Backup | null {
  try {
    const raw = window.localStorage.getItem(backupKeyFor(p));
    if (!raw) return null;
    const j = JSON.parse(raw) as { at?: unknown; inputs?: unknown };
    const inputs = parseStudyInputs(j.inputs);
    return inputs && typeof j.at === 'number' ? { at: j.at, inputs } : null;
  } catch {
    return null;
  }
}

export default function StudiesBar({ parcel, vaultEntryId = null, inputs, dirty, compact = false, onLoad }: StudiesBarProps) {
  const [own, setOwn] = useState<StudySummaryDto[]>([]);
  const [shared, setShared] = useState<StudySummaryDto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [listState, setListState] = useState<ListState>('loading');
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<BarStatus>({ kind: 'idle' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ version: StudyVersionDto; studyName: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [vName, setVName] = useState('');
  const [vNotes, setVNotes] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  /** True when `vaultEntryId` is the user's own entry — attach / detach is offered only then. */
  const [entryOwned, setEntryOwned] = useState(false);

  const mounted = useRef(true);
  const sessionRef = useRef<AutosaveSession | null>(null);
  // Latest props, for callbacks that must not be re-created on every keystroke.
  const inputsRef = useRef(inputs);
  const onLoadRef = useRef(onLoad);
  const parcelRef = useRef(parcel);
  useEffect(() => {
    inputsRef.current = inputs;
    onLoadRef.current = onLoad;
    parcelRef.current = parcel;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Run `fn` only if `sess` is still the plot on screen. */
  const live = useCallback((sess: AutosaveSession, fn: () => void) => {
    if (mounted.current && sessionRef.current === sess) fn();
  }, []);

  // ── The list of this plot's studies ────────────────────────────────────

  const loadList = useCallback(
    async (sess: AutosaveSession) => {
      live(sess, () => {
        setListState('loading');
        setListError(null);
      });
      const r = await listStudies({
        plotNumber: sess.parcel.plotNumber,
        parcelId: sess.parcel.id,
        vaultEntryId: sess.vaultEntryId,
      });
      if (r.ok) {
        live(sess, () => {
          // A study created while the list was in flight is already in state.
          setOwn((cur) => [...cur.filter((s) => !r.data.items.some((x) => x.id === s.id)), ...r.data.items]);
          setShared(r.data.shared);
          setEntryOwned(r.data.vaultEntryOwned === true);
          setHasMore(r.data.nextCursor !== null);
          setListState('ready');
        });
      } else if (isStudiesUnavailable(r)) {
        sess.unavailable = true;
        live(sess, () => {
          setListState('unavailable');
          setStatus({ kind: 'unavailable' });
        });
      } else {
        live(sess, () => {
          setListState('error');
          setListError(describeStudiesError(r));
        });
      }
    },
    [live],
  );

  // ── Session lifecycle: one autosave session per plot ───────────────────

  const sessionKey = `${parcel.id}|${parcel.emirate}|${parcel.plotNumber}|${vaultEntryId ?? ''}`;

  // Declared BEFORE the autosave effect on purpose: effects run in order, so
  // the session for a new plot exists before the autosave effect looks at it.
  useEffect(() => {
    const sess: AutosaveSession = new AutosaveSession({
      parcel: parcelRef.current,
      vaultEntryId,
      born: inputsRef.current,
      api: {
        create: createStudy,
        patchDraft: (id, draftInputs) => patchStudy(id, { draftInputs }),
      },
      backup: browserBackup,
      events: {
        onStatus: (st) => live(sess, () => setStatus(st)),
        onCreated: (study, active) =>
          live(sess, () => {
            setOwn((list) => [study, ...list.filter((s) => s.id !== study.id)]);
            if (active) setActiveId(study.id);
          }),
        onDraftSaved: (id, meta) =>
          live(sess, () =>
            setOwn((list) =>
              list.map((s) => (s.id === id ? { ...s, hasDraft: true, draftUpdatedAt: meta.draftUpdatedAt, updatedAt: meta.updatedAt } : s)),
            ),
          ),
        onStudyLost: () => live(sess, () => setActiveId(null)),
        onBackupCleared: () => live(sess, () => setBackup(null)),
      },
    });
    sessionRef.current = sess;
    setOwn([]);
    setShared([]);
    setEntryOwned(false);
    setHasMore(false);
    setStatus({ kind: 'idle' });
    setActiveId(null);
    setOpened(null);
    setFormOpen(false);
    setSelected([]);
    setMessage(null);
    setBackup(readBackup(sess.parcel));
    void loadList(sess);
    // Leaving the plot (or unmounting): whatever is still waiting is sent
    // now, to this plot's study, and the session stops talking to the UI.
    return () => {
      void sess.dispose();
    };
    // Keyed on plot identity (sessionKey already contains vaultEntryId). The
    // `parcel` object is read through a ref: its identity changes on every
    // parent render and must not restart the session.
  }, [sessionKey, vaultEntryId, loadList, live]);

  // Same plot, fresher facts (e.g. the price was edited while the panel was
  // open): the snapshot taken at "Save version" must be of the plot as it is.
  useEffect(() => {
    const sess = sessionRef.current;
    if (sess && backupKeyFor(sess.parcel) === backupKeyFor(parcel) && sess.parcel.id === parcel.id) sess.parcel = parcel;
  }, [parcel]);

  // ── Autosave ───────────────────────────────────────────────────────────

  useEffect(() => {
    const sess = sessionRef.current;
    if (!sess) return;
    if (dirty) sess.change(inputs);
    else sess.pristine(inputs);
  }, [dirty, inputs]);

  const retrySave = useCallback(() => {
    void sessionRef.current?.push(inputsRef.current);
  }, []);

  // ── Opening a draft or a version ───────────────────────────────────────

  const openStudy = useCallback(async (study: StudySummaryDto, versionId: string | null) => {
    const sess = sessionRef.current;
    if (!sess) return;
    setBusyId(versionId ?? `draft:${study.id}`);
    setMessage(null);
    // Finish saving what is on screen before replacing it.
    await sess.flush();
    const r = await getStudy(study.id);
    if (!mounted.current || sessionRef.current !== sess) return;
    setBusyId(null);
    if (!r.ok) {
      setMessage({ tone: 'error', text: describeStudiesError(r) });
      return;
    }
    const d = r.data.study;
    const version = versionId ? d.versions.find((v) => v.id === versionId) ?? null : null;
    if (versionId && !version) {
      setMessage({ tone: 'error', text: 'That version is not among the most recent ones — open it from All studies.' });
      return;
    }
    const loaded = parseStudyInputs(version ? version.inputs : d.draftInputs);
    if (!loaded) {
      setMessage({ tone: 'error', text: 'This was saved by an older calculator and cannot be opened here.' });
      return;
    }
    // Edits to a shared study are the reader's own: they start a new study.
    const target = d.access === 'owner' ? d.id : null;
    sess.adopt(target, loaded);
    setActiveId(target);
    setOpened(version ? { version, studyName: d.name } : null);
    setStatus({ kind: 'idle' });
    setFormOpen(false);
    onLoadRef.current(loaded);
  }, []);

  // ── Staleness of the opened version ────────────────────────────────────

  const stale = useMemo(() => (opened ? stalenessOf(opened.version, parcel) : null), [opened, parcel]);

  const recompute = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess || !opened) return;
    // Rebase what is on screen if the user has edited since opening, else the
    // version as saved. Only fields still equal to their old default move.
    const basis = dirty ? inputsRef.current : opened.version.inputs;
    const { inputs: rebased, moved } = applyNewDefaults(basis, opened.version.defaultsSnapshot);
    onLoadRef.current(rebased);
    // onLoad resets the calculator's dirty flag, so the autosave effect will
    // not see this as a change — save it explicitly.
    void sess.push(rebased);
    setOpened(null);
    setMessage({
      tone: 'info',
      text:
        moved > 0
          ? `${moved} assumption${moved === 1 ? '' : 's'} moved to today's defaults. Figures you entered yourself were kept. The saved version is unchanged.`
          : 'Nothing to move — every changed default had already been overridden by your own figure.',
    });
  }, [dirty, opened]);

  // ── Save version ───────────────────────────────────────────────────────

  const active = useMemo(() => own.find((s) => s.id === activeId) ?? null, [own, activeId]);

  const openForm = useCallback(() => {
    setVName(defaultVersionName((active?.latestVersion ?? 0) + 1));
    setVNotes('');
    setFormOpen(true);
    setMessage(null);
  }, [active]);

  const submitVersion = useCallback(async () => {
    const sess = sessionRef.current;
    const name = vName.trim();
    if (!sess || !name || savingVersion) return;
    setSavingVersion(true);
    setMessage(null);
    const frozen = inputsRef.current;
    // Make sure the study exists and its draft holds exactly these inputs.
    await sess.push(frozen);
    const studyId = sess.studyId;
    if (!studyId) {
      live(sess, () => {
        setSavingVersion(false);
        setMessage({ tone: 'error', text: 'The version was not saved — the study could not be created. Your inputs are unchanged.' });
      });
      return;
    }
    // Keeps going even if the user has moved to another plot meanwhile: the
    // save was asked for, and it goes to the plot it was asked on.
    const body = { name, notes: vNotes.trim() || null, inputs: frozen, plotSnapshot: plotSnapshot(sess.parcel) };
    let r = await saveVersion(studyId, body);
    // Two saves raced for the same number; the loser simply asks again.
    if (!r.ok && r.code === 'version_conflict') r = await saveVersion(studyId, body);
    if (!r.ok) {
      const failed = r;
      live(sess, () => {
        setSavingVersion(false);
        setMessage({ tone: 'error', text: `The version was not saved. ${describeStudiesError(failed)} Your inputs are unchanged.` });
      });
      return;
    }
    const v = r.data.version;
    sess.markSaved(frozen);
    live(sess, () => {
      const summary: StudyVersionSummaryDto = {
        id: v.id,
        studyId: v.studyId,
        version: v.version,
        name: v.name,
        mode: v.mode,
        engines: v.engines,
        modelVersion: v.modelVersion,
        defaultsVersion: v.defaultsVersion,
        createdAt: v.createdAt,
        headline: v.headline,
      };
      setOwn((list) =>
        list.map((s) =>
          s.id === studyId
            ? { ...s, latestVersion: v.version, latest: summary, recentVersions: [summary, ...s.recentVersions], updatedAt: v.createdAt }
            : s,
        ),
      );
      setSavingVersion(false);
      setFormOpen(false);
      setOpened(null);
      setExpanded(true);
      setStatus({ kind: 'saved', at: new Date(), note: `version ${v.version}` });
    });
  }, [live, savingVersion, vName, vNotes]);

  // ── Attach / detach a study to the vault entry on screen ───────────────

  const setAttached = useCallback(async (study: StudySummaryDto, attach: boolean) => {
    const sess = sessionRef.current;
    if (!sess || !sess.vaultEntryId) return;
    setBusyId(`attach:${study.id}`);
    setMessage(null);
    const r = await patchStudy(study.id, { vaultEntryId: attach ? sess.vaultEntryId : null });
    if (!mounted.current || sessionRef.current !== sess) return;
    setBusyId(null);
    if (!r.ok) {
      setMessage({ tone: 'error', text: describeStudiesError(r) });
      return;
    }
    setOwn((list) => list.map((s) => (s.id === study.id ? { ...s, vaultEntryId: r.data.study.vaultEntryId } : s)));
  }, []);

  // ── Restore the browser copy ───────────────────────────────────────────

  const restoreBackup = useCallback(() => {
    const sess = sessionRef.current;
    if (!sess || !backup) return;
    onLoadRef.current(backup.inputs);
    // Saved straight away, so the restored calculation reaches the server.
    void sess.push(backup.inputs).then(() => {
      // The engine clears only backups it wrote; this one came from an
      // earlier visit, so it is removed here once it is safely saved.
      if (sess.isSaved(backup.inputs) && sess.studyId) browserBackup.clear(backupKeyFor(sess.parcel));
    });
    setBackup(null);
    setOpened(null);
  }, [backup]);

  const discardBackup = useCallback(() => {
    const sess = sessionRef.current;
    if (sess) browserBackup.clear(backupKeyFor(sess.parcel));
    setBackup(null);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  const retryList = useCallback(() => {
    if (sessionRef.current) void loadList(sessionRef.current);
  }, [loadList]);

  const unavailable = status.kind === 'unavailable' || listState === 'unavailable';
  const total = own.length + shared.length;
  const canCompare = selected.length >= COMPARE_MIN && selected.length <= COMPARE_MAX;
  const staleLines = stale?.stale ? stalenessLines(stale) : [];

  const statusNode = (() => {
    switch (status.kind) {
      case 'pending':
        return <span style={{ color: SUBTLE }}>Unsaved changes…</span>;
      case 'saving':
        return <span style={{ color: GOLD }}>Saving…</span>;
      case 'saved':
        return (
          <span style={{ color: DIM }}>
            Saved {status.note ? `${status.note} · ` : ''}
            {fmtTime(status.at)}
          </span>
        );
      case 'error':
        return <span style={{ color: RED }}>Not saved</span>;
      case 'unavailable':
        return <span style={{ color: SUBTLE }}>Not saving</span>;
      default:
        return <span style={{ color: SUBTLE }}>{active ? 'Up to date' : 'Saves automatically'}</span>;
    }
  })();

  const versionRow = (study: StudySummaryDto, v: StudyVersionSummaryDto) => {
    const isSel = selected.includes(v.id);
    return (
      <div
        key={v.id}
        style={{
          display: 'flex',
          alignItems: compact ? 'flex-start' : 'center',
          gap: 8,
          padding: '5px 0',
          borderTop: `1px solid ${LINE}`,
          fontSize: 11,
        }}
      >
        <Check
          checked={isSel}
          disabled={!isSel && selected.length >= COMPARE_MAX}
          onChange={() => setSelected((s) => toggleCompareSelection(s, v.id))}
          label={`Compare version ${v.version} of ${study.name}`}
        />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: compact ? 'column' : 'row', gap: compact ? 2 : 10, alignItems: compact ? 'flex-start' : 'center' }}>
          <span style={{ color: TXT, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            <span style={{ color: GOLD }}>v{v.version}</span> {v.name}
          </span>
          <span style={{ flex: compact ? undefined : 1 }}>
            <HeadlineText h={v.headline} />
          </span>
          <span style={{ color: SUBTLE, whiteSpace: 'nowrap' }}>{fmtDate(v.createdAt)}</span>
        </div>
        <Btn small tone="quiet" disabled={busyId !== null} onClick={() => void openStudy(study, v.id)} ariaLabel={`Open version ${v.version} of ${study.name}`}>
          {busyId === v.id ? 'Opening…' : 'Open'}
        </Btn>
      </div>
    );
  };

  const studyBlock = (study: StudySummaryDto) => {
    const isActive = study.id === activeId;
    return (
      <div
        key={study.id}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: `1px solid ${isActive ? LINE_HARD : LINE}`,
          borderLeft: `3px solid ${isActive ? GOLD : 'rgba(255, 255, 255, 0.1)'}`,
          background: 'rgba(255, 255, 255, 0.02)',
          marginTop: 8,
          transition: 'border-color 150ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: TXT, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.name}</div>
            <div style={{ color: SUBTLE, fontSize: 10 }}>
              {study.access === 'shared'
                ? 'Shared with you · read-only'
                : study.draftUpdatedAt
                  ? `Draft saved ${fmtDate(study.draftUpdatedAt)}, ${fmtTime(study.draftUpdatedAt)}`
                  : 'No draft'}
              {study.access === 'owner' && vaultEntryId && study.vaultEntryId === vaultEntryId ? ' · in vault' : ''}
              {isActive ? ' · open now' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 }}>
            {study.access === 'owner' && entryOwned && vaultEntryId && (
              <Btn
                small
                tone="quiet"
                disabled={busyId !== null}
                onClick={() => void setAttached(study, study.vaultEntryId !== vaultEntryId)}
                title={
                  study.vaultEntryId === vaultEntryId
                    ? 'Attached to this vault entry: it shows in the vault, and people you share the entry with for feasibility can read its saved versions. Click to detach.'
                    : 'Attach to this vault entry so it shows in the vault and can be shared with it.'
                }
              >
                {busyId === `attach:${study.id}` ? '…' : study.vaultEntryId === vaultEntryId ? 'Detach' : 'Attach to vault'}
              </Btn>
            )}
            {study.access === 'owner' && study.hasDraft && (
              <Btn small tone="quiet" disabled={busyId !== null} onClick={() => void openStudy(study, null)} ariaLabel={`Open the draft of ${study.name}`}>
                {busyId === `draft:${study.id}` ? 'Opening…' : 'Open draft'}
              </Btn>
            )}
          </div>
        </div>
        {study.recentVersions.length === 0 ? (
          <div style={{ color: SUBTLE, fontSize: 11, paddingTop: 4, borderTop: `1px solid ${LINE}` }}>No saved version yet.</div>
        ) : (
          study.recentVersions.map((v) => versionRow(study, v))
        )}
        {study.latestVersion > study.recentVersions.length && (
          <div style={{ color: SUBTLE, fontSize: 10, paddingTop: 4 }}>
            {study.latestVersion - study.recentVersions.length} older version{study.latestVersion - study.recentVersions.length === 1 ? '' : 's'} in All studies.
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="studies-bar"
      style={{
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
        padding: compact ? '10px 12px' : '12px 14px',
        marginBottom: 12,
        color: TXT,
        fontSize: 12,
      }}
    >
      <StudiesKeyframes />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ color: GOLD, fontFamily: SERIF, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Studies
        </span>
        <span aria-live="polite" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
          {statusNode}
        </span>
      </div>

      <div style={{ color: DIM, fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {active ? active.name : opened ? `${opened.studyName} (shared)` : 'Nothing saved for this session yet'}
        {opened ? ` · v${opened.version.version} ${opened.version.name}` : ''}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <Btn onClick={openForm} disabled={unavailable || formOpen} title={unavailable ? 'Saved studies are not switched on yet' : 'Freeze these inputs as a version'}>
          Save version
        </Btn>
        <Btn tone="quiet" onClick={() => setExpanded((v) => !v)} ariaLabel={expanded ? 'Hide studies for this plot' : 'Show studies for this plot'}>
          {listState === 'loading' ? 'Studies…' : `Studies (${total})`}
          <span aria-hidden style={{ display: 'inline-block', transition: 'transform 150ms ease', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
        </Btn>
        <Btn tone="quiet" href={canCompare ? compareHref(selected) : undefined} newTab disabled={!canCompare} title={`Tick ${COMPARE_MIN}–${COMPARE_MAX} versions to compare`}>
          Compare{selected.length > 0 ? ` (${selected.length})` : ''}
        </Btn>
        <Btn tone="quiet" href="/feasibility/studies" newTab>
          All studies
        </Btn>
      </div>

      {status.kind === 'error' && (
        <div style={{ marginTop: 8 }}>
          <Notice tone="error">
            <div>
              <strong>Not saved.</strong> {describeStudiesError(status)} Your inputs are still here and are kept in this browser.
            </div>
            <div style={{ marginTop: 6 }}>
              <Btn small onClick={retrySave}>
                Retry
              </Btn>
            </div>
          </Notice>
        </div>
      )}

      {unavailable && (
        <div style={{ marginTop: 8 }}>
          <Notice tone="info">
            Saved studies are not switched on yet. The calculator works as usual; what you enter is kept in this browser only.
          </Notice>
        </div>
      )}

      {backup && (
        <div style={{ marginTop: 8 }}>
          <Notice tone="info">
            <div>
              An unsaved calculation for this plot from {fmtDate(new Date(backup.at))}, {fmtTime(new Date(backup.at))} is kept in this browser.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Btn small onClick={restoreBackup}>
                Restore
              </Btn>
              <Btn small tone="quiet" onClick={discardBackup}>
                Discard
              </Btn>
            </div>
          </Notice>
        </div>
      )}

      {message && (
        <div style={{ marginTop: 8 }}>
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {opened && stale?.stale && (
        <div style={{ marginTop: 8 }}>
          <Notice tone="warn">
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Things have changed since v{opened.version.version} was saved on {fmtDate(opened.version.createdAt)}
            </div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {staleLines.slice(0, STALE_LINES_SHOWN).map((l) => (
                <li key={l}>{l}</li>
              ))}
              {staleLines.length > STALE_LINES_SHOWN && <li>and {staleLines.length - STALE_LINES_SHOWN} more</li>}
            </ul>
            <div style={{ color: DIM, marginTop: 4 }}>
              The inputs are exactly as saved{stale.model ? '; the result on screen is calculated with the current model' : ''}. The saved version itself never changes.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {stale.defaults.length > 0 && (
                <Btn small onClick={recompute}>
                  Recompute on today&apos;s defaults
                </Btn>
              )}
              <Btn small tone="quiet" onClick={() => setOpened(null)}>
                Dismiss
              </Btn>
            </div>
          </Notice>
        </div>
      )}

      {formOpen && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LINE}`, animation: 'zaahiStudiesFade 200ms ease-in-out' }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>Version name</div>
          <Field value={vName} onChange={setVName} maxLength={STUDY_NAME_MAX} ariaLabel="Version name" placeholder="e.g. Base case" autoFocus onEnter={() => void submitVersion()} />
          <div style={{ ...labelStyle, margin: '8px 0 4px' }}>Notes (optional)</div>
          <Field value={vNotes} onChange={setVNotes} maxLength={VERSION_NOTES_MAX} ariaLabel="Version notes" placeholder="What this version assumes" multiline />
          <div style={{ color: SUBTLE, fontSize: 10, marginTop: 6 }}>
            A version is permanent: it cannot be edited or deleted afterwards. The result is recalculated on the server when it is saved.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Btn onClick={() => void submitVersion()} disabled={savingVersion || vName.trim().length === 0}>
              {savingVersion ? 'Saving…' : 'Save version'}
            </Btn>
            <Btn tone="quiet" onClick={() => setFormOpen(false)} disabled={savingVersion}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 2, borderTop: `1px solid ${LINE}`, animation: 'zaahiStudiesFade 200ms ease-in-out' }}>
          {listState === 'loading' && <div style={{ color: SUBTLE, fontSize: 11, paddingTop: 8 }}>Loading studies…</div>}
          {listState === 'error' && (
            <div style={{ marginTop: 8 }}>
              <Notice tone="error">
                <div>The list of studies could not be loaded. {listError} The calculator is unaffected.</div>
                <div style={{ marginTop: 6 }}>
                  <Btn small onClick={retryList}>
                    Retry
                  </Btn>
                </div>
              </Notice>
            </div>
          )}
          {listState === 'ready' && total === 0 && (
            <div style={{ color: SUBTLE, fontSize: 11, paddingTop: 8 }}>
              No studies for this plot yet. Change any input and it is saved as a draft automatically.
            </div>
          )}
          {own.map(studyBlock)}
          {shared.length > 0 && <div style={{ ...labelStyle, marginTop: 12 }}>Shared with you</div>}
          {shared.map(studyBlock)}
          {hasMore && <div style={{ color: SUBTLE, fontSize: 10, paddingTop: 8 }}>More studies for this plot are listed in All studies.</div>}
        </div>
      )}
    </div>
  );
}
