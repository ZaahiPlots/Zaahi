// Founder backlog PART 5 — "'sent to founders' confirmations can be false".
//
//   npx tsx scripts/telegram-delivery.test.ts
//
// The feedback route used to fire the Telegram fan-out with `void` and then
// unconditionally answer "I've sent your note to the ZAAHI team". Every
// failure mode produced that same sentence. These fixtures pin the decision
// that now governs whether we say it.
//
// The distinction that matters: `anyDelivered` is about the USER — has a human
// been reached, yes or no. `partial` and `reason` are for the operator. A user
// should never be told a delivery failed when one founder did get it, and must
// never be told it succeeded when nobody did.

import { summariseDelivery, type AdminFanoutLike } from '../src/lib/telegram-delivery';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const ok = (chatId: string): AdminFanoutLike => ({ chatId, ok: true });
const skipped = (chatId: string): AdminFanoutLike => ({ chatId, ok: false, skipped: true, error: 'token missing' });
const failed = (chatId: string, error = 'Bad Request'): AdminFanoutLike => ({ chatId, ok: false, error });

console.log('\ntelegram delivery truthfulness (PART 5)\n' + '='.repeat(60));

// ── 1. Nothing configured — the quietest failure ─────────────────────────
// sendTelegramToAdmins returns [] before touching the network when
// TELEGRAM_ADMIN_CHAT_IDS is unset. No error is raised anywhere. This was
// indistinguishable from success.
console.log('\n1. no admin chat configured');
{
  const s = summariseDelivery([]);
  check('anyDelivered is false', s.anyDelivered === false);
  check('delivered is 0', s.delivered === 0);
  check('total is 0', s.total === 0);
  check('not reported as partial', s.partial === false);
  check('reason names the configuration gap', s.reason === 'no admin chat configured', s.reason);
}

// ── 2. Token missing ─────────────────────────────────────────────────────
console.log('\n2. bot token missing — every chat skipped');
{
  const s = summariseDelivery([skipped('111'), skipped('222')]);
  check('anyDelivered is false', s.anyDelivered === false);
  check('reason distinguishes this from a send error', s.reason === 'bot token missing', s.reason);
  check('not partial — nobody got it', s.partial === false);
}

// ── 3. Upstream errors ───────────────────────────────────────────────────
console.log('\n3. telegram refused every chat');
{
  const s = summariseDelivery([failed('111', 'chat not found'), failed('222', '429 Too Many Requests')]);
  check('anyDelivered is false', s.anyDelivered === false);
  check('reason carries both chat ids and errors',
    s.reason.includes('111:chat not found') && s.reason.includes('222:429 Too Many Requests'), s.reason);
}

// ── 4. Full success ──────────────────────────────────────────────────────
console.log('\n4. every chat delivered');
{
  const s = summariseDelivery([ok('111'), ok('222')]);
  check('anyDelivered is true', s.anyDelivered === true);
  check('delivered counts them all', s.delivered === 2 && s.total === 2);
  check('not partial', s.partial === false);
  check('reason is ok', s.reason === 'ok', s.reason);
}

// ── 5. Partial — a success for the user, a problem for us ────────────────
// This is the case worth getting right. One founder has the message, so the
// user must NOT be told it failed; but the other chat is broken and that
// cannot be silent on our side.
console.log('\n5. partial delivery');
{
  const s = summariseDelivery([ok('111'), failed('222', 'bot was blocked by the user')]);
  check('anyDelivered is true — a human has it', s.anyDelivered === true);
  check('flagged partial for the operator', s.partial === true);
  check('delivered/total is exact', s.delivered === 1 && s.total === 2);
  check('reason names only the failing chat',
    s.reason.includes('222') && !s.reason.includes('111:'), s.reason);
}

// ── 6. Mixed skip + error, one success ───────────────────────────────────
console.log('\n6. mixed causes with one success');
{
  const s = summariseDelivery([skipped('111'), ok('222'), failed('333', 'timeout')]);
  check('anyDelivered is true', s.anyDelivered === true);
  check('partial is true', s.partial === true);
  check('reason does not claim "bot token missing" when only one chat skipped',
    s.reason !== 'bot token missing', s.reason);
  check('reason records both failures',
    s.reason.includes('111:skipped') && s.reason.includes('333:timeout'), s.reason);
}

// ── 7. Single-chat setups, both directions ───────────────────────────────
console.log('\n7. single admin chat');
{
  const good = summariseDelivery([ok('111')]);
  check('one success is not partial', good.anyDelivered === true && good.partial === false);
  const bad = summariseDelivery([failed('111')]);
  check('one failure means nobody was reached', bad.anyDelivered === false && bad.partial === false);
}

console.log('\n' + '='.repeat(60));
if (failures) { console.log(`\n${failures} failure(s)\n`); process.exit(1); }
console.log('\nall assertions passed\n');
