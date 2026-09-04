// Feedback throttle — docs/BACKLOG.md §8.
//
//   npx tsx scripts/feedback-throttle.test.ts
//
// The point of this work is one property: the rate limit, the text dedup and
// the per-message idempotency key must be visible to EVERY serverless
// instance, not just the one that created them.
//
// So every section below runs TWO independent FeedbackThrottle objects — `a`
// and `b`, standing in for two concurrent lambdas — over ONE shared store, and
// asserts that b sees what a did. Against the old module-scope Maps every one
// of these would fail: b would start with an empty Map and admit everything.
//
// WHAT THIS DOES NOT COVER, stated plainly: the Postgres binding itself.
// src/lib/feedback-throttle-prisma.ts needs a real database, and this box has
// no Postgres, no Docker and no Supabase CLI. It is deliberately thin for that
// reason — four operations, no query builder — and the specific behaviours a
// reviewer should confirm against a real database are listed at the bottom of
// this file.

import {
  FeedbackThrottle,
  InMemoryThrottleStore,
  RATE_LIMIT_PER_HOUR,
  HOUR_MS,
  DAY_MS,
  RETENTION_MS,
  hashText,
} from '../src/lib/feedback-throttle';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

/** A clock the fixtures can move without sleeping. */
function clock(start = 1_800_000_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

/** One store, two policy objects — the whole point. */
function twoInstances() {
  const c = clock();
  const store = new InMemoryThrottleStore(c.now);
  return {
    c,
    store,
    a: new FeedbackThrottle(store, c.now),
    b: new FeedbackThrottle(store, c.now),
  };
}

const USER = 'user-1';

async function main() {
  console.log('\nfeedback throttle — shared across instances (§8)');
  console.log('='.repeat(64));

  // ── 1. Idempotency key ───────────────────────────────────────────────────
  console.log('\n1. a duplicate turn is collapsed by the OTHER instance');
  {
    const { a, b } = twoInstances();
    const first = await a.admit({ userId: USER, text: 'the map is broken', submissionId: 'turn-1' });
    check('instance a accepts the first submission', first.kind === 'accepted', first.kind);

    // Same conversational turn, reworded — exactly what defeated the old
    // text-based dedup — arriving at a DIFFERENT lambda.
    const second = await b.admit({
      userId: USER, text: 'the map fails to load', submissionId: 'turn-1',
    });
    check('instance b collapses it on the shared key', second.kind === 'collapsed',
      JSON.stringify(second));
  }

  // ── 2. Text dedup ────────────────────────────────────────────────────────
  console.log('\n2. the 24h text dedup crosses instances');
  {
    const { a, b, c } = twoInstances();
    await a.admit({ userId: USER, text: 'lifts are slow', submissionId: 't1' });
    const dup = await b.admit({ userId: USER, text: '  LIFTS   ARE SLOW  ', submissionId: 't2' });
    check('b dedups a\'s text despite different key, case and spacing',
      dup.kind === 'deduped', JSON.stringify(dup));

    c.advance(DAY_MS + 1000);
    const later = await b.admit({ userId: USER, text: 'lifts are slow', submissionId: 't3' });
    check('the same text is allowed again after 24h', later.kind === 'accepted', later.kind);
  }

  // ── 3. Rate limit ────────────────────────────────────────────────────────
  console.log('\n3. the hourly rate limit is shared, not per-instance');
  {
    const { a, b, c } = twoInstances();
    // Fill the quota by alternating instances — under the old Maps each would
    // have kept its own count of 2 and never triggered.
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) {
      const inst = i % 2 === 0 ? a : b;
      const r = await inst.admit({ userId: USER, text: `report ${i}`, submissionId: `k${i}` });
      check(`submission ${i + 1} accepted`, r.kind === 'accepted', r.kind);
    }
    const over = await b.admit({ userId: USER, text: 'one too many', submissionId: 'k-over' });
    check(`the ${RATE_LIMIT_PER_HOUR + 1}th is rate-limited on either instance`,
      over.kind === 'rateLimited', JSON.stringify(over));

    const other = await a.admit({ userId: 'user-2', text: 'unrelated', submissionId: 'z1' });
    check('the limit is per user, not global', other.kind === 'accepted', other.kind);

    c.advance(HOUR_MS + 1000);
    const afterWindow = await a.admit({ userId: USER, text: 'later report', submissionId: 'k-late' });
    check('quota frees up once the hour passes', afterWindow.kind === 'accepted', afterWindow.kind);
  }

  // ── 4. A rejected submission must not hold a key ─────────────────────────
  console.log('\n4. a rejected submission releases what it took');
  {
    const { a, b, c, store } = twoInstances();
    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) {
      await a.admit({ userId: USER, text: `r${i}`, submissionId: `s${i}` });
    }
    const sizeBefore = store.size;
    const blocked = await b.admit({ userId: USER, text: 'blocked one', submissionId: 'blocked' });
    check('rate-limited', blocked.kind === 'rateLimited', blocked.kind);
    check('the blocked submission left no row behind', store.size === sizeBefore,
      `${store.size} vs ${sizeBefore}`);

    // ...so once quota frees the same key still works. Had the rejected
    // attempt kept its row, this would collapse as a duplicate instead — which
    // is the false "already sent" the refund path exists to prevent.
    c.advance(HOUR_MS + 1000);
    const retryAfterWindow = await b.admit({
      userId: USER, text: 'blocked one', submissionId: 'blocked',
    });
    check('the refused key is reusable once quota frees',
      retryAfterWindow.kind === 'accepted', JSON.stringify(retryAfterWindow));
  }

  // ── 5. Refund after a failed delivery ────────────────────────────────────
  console.log('\n5. refund — a note that reached nobody costs nothing');
  {
    const { a, b, store } = twoInstances();
    const accepted = await a.admit({ userId: USER, text: 'undelivered', submissionId: 'u1' });
    check('accepted', accepted.kind === 'accepted', accepted.kind);
    if (accepted.kind !== 'accepted') throw new Error('unreachable');

    // Telegram failed. Give it all back.
    await a.refund(accepted.rowId);
    check('the row is gone', store.size === 0, String(store.size));

    const retry = await b.admit({ userId: USER, text: 'undelivered', submissionId: 'u1' });
    check('the retry is NOT answered with "already sent" — even on another instance',
      retry.kind === 'accepted', JSON.stringify(retry));
  }

  // ── 6. TTL sweep ─────────────────────────────────────────────────────────
  console.log('\n6. TTL cleanup');
  {
    const { a, c, store } = twoInstances();
    await a.admit({ userId: USER, text: 'old one', submissionId: 'o1' });
    check('one row', store.size === 1, String(store.size));

    c.advance(RETENTION_MS - HOUR_MS);
    check('nothing swept before retention elapses', (await a.sweep()) === 0, String(store.size));

    c.advance(2 * HOUR_MS);
    const swept = await a.sweep();
    check('the expired row is swept', swept === 1 && store.size === 0, `swept ${swept}, ${store.size} left`);
  }

  // ── 7. Hashing ───────────────────────────────────────────────────────────
  console.log('\n7. text is hashed, not stored');
  {
    const h = hashText('  The Map   Is Broken  ');
    check('normalisation collapses case and whitespace',
      h === hashText('the map is broken'), h.slice(0, 12));
    check('different text hashes differently', h !== hashText('the map is fine'));
    check('the hash does not contain the text', !h.includes('map') && /^[0-9a-f]{64}$/.test(h), h.slice(0, 16));
  }

  console.log('\n' + '='.repeat(64));
  if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
  console.log(`
  all assertions passed

  NOT covered here — verify against a real database before trusting it:
    1. The unique constraint on (userId, submissionId) actually raises P2002,
       and prismaThrottleStore.insert returns null rather than throwing.
    2. Postgres permits MANY NULL submissionIds under that constraint, so a
       client that sends no key is never wrongly collapsed.
    3. deleteMany on an already-deleted row is a no-op (the refund path).
    4. The three indexes are used — check the plan for countSince and hasText on
       a table with real volume.
  `);
}

main().catch((e) => { console.error(e); process.exit(1); });
