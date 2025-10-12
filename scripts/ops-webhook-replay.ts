/**
 * Ops — Stripe Webhook Replay
 * - Sends a signed (or unsigned if no secret) test webhook to local server.
 * Usage:
 *   BASE_URL=http://localhost:3000 STRIPE_WEBHOOK_SECRET=whsec_xxx \
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/ops-webhook-replay.ts u_xxx 30
 *   # args: <di_uid> <plus_days>
 */

import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function sign(body: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000).toString();
  const mac = crypto.createHmac('sha256', secret).update(`${t}.${body}`, 'utf8').digest('hex');
  return `t=${t},v1=${mac}`;
}

async function main() {
  const [uid, daysArg] = process.argv.slice(2);
  if (!uid) { console.error('Usage: ts-node scripts/ops-webhook-replay.ts <di_uid> <plus_days>'); process.exit(2); }
  const days = Math.max(1, parseInt(daysArg || '30', 10));

  const event = {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: 'checkout.session.completed',
    data: { object: { metadata: { di_uid: uid, plus_days: String(days) }, client_reference_id: uid } },
  };
  const body = JSON.stringify(event);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SECRET) headers['stripe-signature'] = sign(body, SECRET);

  const r = await fetch(`${BASE_URL}/api/stripe/webhook`, { method: 'POST', headers, body });
  const j = await r.json().catch(()=>({}));
  console.log('[ops] webhook', r.status, r.ok ? 'ok' : 'fail', j);
  process.exit(r.ok ? 0 : 1);
}

main().catch((e)=>{ console.error('[ops] error', e?.message || e); process.exit(1); });

