import crypto from 'crypto';
import http from 'http';

const JWT_SECRET = 'dev_secret_jwt_key_must_change_in_prod';
const API_URL = 'http://127.0.0.1:8080/v1/messages/compose';
const MAILPIT_HTTP = 'http://127.0.0.1:8025';

function createTokenForUser(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      sessionId: `sess_${Date.now()}`,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

async function fetchMailpitMessages(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    http.get(`${MAILPIT_HTTP}/api/v1/messages`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.messages || []);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function clearMailpit(): Promise<void> {
  return new Promise((resolve) => {
    const req = http.request(`${MAILPIT_HTTP}/api/v1/messages`, { method: 'DELETE' }, () => resolve());
    req.on('error', () => resolve());
    req.end();
  });
}

async function runMultiUserTests() {
  console.log(`\n===============================================================`);
  console.log(`👥 Eazzio Mail — Multi-User Sender Identity & Anti-Spoofing Test`);
  console.log(`===============================================================\n`);

  await clearMailpit();

  const userA = { id: crypto.randomUUID(), email: 'rahul@eazzio.com' };
  const userB = { id: crypto.randomUUID(), email: 'priya@eazzio.com' };
  const userC = { id: crypto.randomUUID(), email: 'ceo@eazzio.com' };

  // 1. User A Sends Email
  console.log(`[1/5] ✉️  Testing User A (rahul@eazzio.com)...`);
  const tokenA = createTokenForUser(userA.id, userA.email);
  const resA = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      to: ['test-recipient@example.local'],
      subject: 'Message from Rahul',
      bodyText: 'Hello from Rahul',
    }),
  });
  const dataA: any = await resA.json();
  console.log(`  - Compose Result: ${dataA.success ? '🟢 ACCEPTED' : '🔴 FAILED'} (Queue ID: ${dataA.queueIds?.[0]})`);

  // 2. User B Sends Email
  console.log(`\n[2/5] ✉️  Testing User B (priya@eazzio.com)...`);
  const tokenB = createTokenForUser(userB.id, userB.email);
  const resB = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({
      to: ['test-recipient@example.local'],
      subject: 'Message from Priya',
      bodyText: 'Hello from Priya',
    }),
  });
  const dataB: any = await resB.json();
  console.log(`  - Compose Result: ${dataB.success ? '🟢 ACCEPTED' : '🔴 FAILED'} (Queue ID: ${dataB.queueIds?.[0]})`);

  // 3. User C Sends Email
  console.log(`\n[3/5] ✉️  Testing User C (ceo@eazzio.com)...`);
  const tokenC = createTokenForUser(userC.id, userC.email);
  const resC = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
    body: JSON.stringify({
      to: ['test-recipient@example.local'],
      subject: 'Message from CEO',
      bodyText: 'Hello from CEO',
    }),
  });
  const dataC: any = await resC.json();
  console.log(`  - Compose Result: ${dataC.success ? '🟢 ACCEPTED' : '🔴 FAILED'} (Queue ID: ${dataC.queueIds?.[0]})`);

  // Wait 1.5s for queue worker to deliver to Mailpit
  await new Promise((r) => setTimeout(r, 1500));
  const messages = await fetchMailpitMessages();

  const msgA = messages.find((m) => m.Subject === 'Message from Rahul');
  const msgB = messages.find((m) => m.Subject === 'Message from Priya');
  const msgC = messages.find((m) => m.Subject === 'Message from CEO');

  console.log(`\n🔍 Verifying Mailpit Captured Sender Identities:`);
  console.log(`  - User A Message From:   ${msgA?.From?.Address === 'rahul@eazzio.com' ? '🟢' : '🔴'} "${msgA?.From?.Address}"`);
  console.log(`  - User B Message From:   ${msgB?.From?.Address === 'priya@eazzio.com' ? '🟢' : '🔴'} "${msgB?.From?.Address}"`);
  console.log(`  - User C Message From:   ${msgC?.From?.Address === 'ceo@eazzio.com' ? '🟢' : '🔴'} "${msgC?.From?.Address}"`);

  if (msgA?.From?.Address !== 'rahul@eazzio.com' || msgB?.From?.Address !== 'priya@eazzio.com' || msgC?.From?.Address !== 'ceo@eazzio.com') {
    throw new Error('Multi-user sender identities did not match expected addresses');
  }

  // 4. Anti-Spoofing Test: User A tries to spoof User C's email in request body
  console.log(`\n[4/5] 🛡️ Testing Sender Spoofing Protection (User A attempts From: ceo@eazzio.com)...`);
  const resSpoof = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      from: 'ceo@eazzio.com',
      to: ['test-recipient@example.local'],
      subject: 'Spoofing Attempt by User A',
      bodyText: 'I am pretending to be CEO',
    }),
  });
  console.log(`  - HTTP Status:           ${resSpoof.status} (${resSpoof.status === 403 ? '🟢 403 FORBIDDEN - REJECTED' : '🔴 FAILED'})`);
  const dataSpoof = await resSpoof.json();
  console.log(`  - Anti-Spoofing Message: "${dataSpoof.error?.message || dataSpoof.message || 'Blocked'}"`);

  if (resSpoof.status !== 403) {
    throw new Error(`Expected 403 Forbidden on spoofing attempt, got ${resSpoof.status}`);
  }

  // 5. Anti-Spoofing Test: Forged Header x-user-email ignored
  console.log(`\n[5/5] 🛡️ Testing Forged Frontend Header Protection (x-user-email)...`);
  const resHeaderSpoof = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-user-email': 'ceo@eazzio.com',
    },
    body: JSON.stringify({
      to: ['test-recipient@example.local'],
      subject: 'Header Spoofing Test',
      bodyText: 'Testing forged header',
    }),
  });
  const dataHeaderSpoof: any = await resHeaderSpoof.json();
  await new Promise((r) => setTimeout(r, 1000));
  const messagesAfter = await fetchMailpitMessages();
  const msgHeaderSpoof = messagesAfter.find((m) => m.Subject === 'Header Spoofing Test');
  console.log(`  - Actual Sender in MIME: 🟢 "${msgHeaderSpoof?.From?.Address}" (Correctly preserved as rahul@eazzio.com)`);

  if (msgHeaderSpoof?.From?.Address !== 'rahul@eazzio.com') {
    throw new Error(`Forged header was not ignored! Got: ${msgHeaderSpoof?.From?.Address}`);
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 ALL Multi-User Sender & Anti-Spoofing Tests PASSED!`);
  console.log(`===============================================================\n`);
}

if (process.argv[1]?.endsWith('test-multi-user-mail.ts')) {
  runMultiUserTests().catch((err) => {
    console.error(`\n❌ Multi-User Test Failed:`, err);
    process.exit(1);
  });
}
