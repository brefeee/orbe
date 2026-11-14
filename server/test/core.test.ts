import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startTestApp, TERMS } from './helpers.ts';

test('compte : création, connexion, déconnexion, sessions', async () => {
  const t = await startTestApp();
  try {
    assert.equal((await t.api('GET', '/api/me')).status, 401);
    const noTerms = await t.api('POST', '/api/auth/signup', null, { email: 'x@test.orbe', password: 'unmotdepasselong', displayName: 'X', handle: 'xxx' });
    assert.equal(noTerms.status, 400); // nom trop court
    const refused = await t.api('POST', '/api/auth/signup', null, { email: 'x@test.orbe', password: 'unmotdepasselong', displayName: 'Xavier', handle: 'xavier', acceptTerms: false });
    assert.equal(refused.status, 403);
    assert.equal(refused.body.error, 'terms_required');
    const short = await t.api('POST', '/api/auth/signup', null, { email: 'x@test.orbe', password: 'court', displayName: 'Xavier', handle: 'xavier', acceptTerms: true, termsVersion: TERMS });
    assert.equal(short.status, 400);

    const alice = await t.signup('Alice');
    const me = await t.api('GET', '/api/me', alice);
    assert.equal(me.body.email, alice.email);
    assert.equal(me.body.termsAccepted, true);
    assert.equal(JSON.stringify(me.body).includes('password_hash'), false);

    const dup = await t.api('POST', '/api/auth/signup', null, { email: alice.email.toUpperCase(), password: 'unmotdepasselong', displayName: 'Autre', handle: 'autre', acceptTerms: true, termsVersion: TERMS });
    assert.equal(dup.status, 409);

    assert.equal((await t.api('POST', '/api/auth/login', null, { email: alice.email, password: 'mauvais-mot-de-passe' })).status, 401);
    const login = await t.api('POST', '/api/auth/login', null, { email: alice.email, password: alice.password, device: 'Téléphone' });
    assert.equal(login.status, 200);
    const sessions = await t.api('GET', '/api/me/sessions', alice);
    assert.equal(sessions.body.length, 2);
    assert.equal(sessions.body.filter((s: any) => s.current).length, 1);

    // Fermer l'autre session la rend inutilisable immédiatement.
    assert.equal((await t.api('POST', '/api/me/sessions/revoke-others', alice)).body.revoked, 1);
    assert.equal((await t.api('GET', '/api/me', login.body.token)).status, 401);

    assert.equal((await t.api('POST', '/api/auth/logout', alice)).status, 200);
    assert.equal((await t.api('GET', '/api/me', alice)).status, 401);
  } finally { await t.stop(); }
});

test('session expirée refusée', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    t.ctx.db.run('UPDATE sessions SET expires_at=1 WHERE user_id=?', a.id);
    assert.equal((await t.api('GET', '/api/me', a)).status, 401);
  } finally { await t.stop(); }
});

test('séparation des comptes : réglages, profil, sessions, médias', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    const b = await t.signup('Bob');
    await t.api('PATCH', '/api/me/settings', a, { theme: 'light' });
    assert.equal((await t.api('GET', '/api/me', b)).body.settings.theme, 'dark');
    assert.equal((await t.api('PATCH', '/api/me/settings', a, { inconnu: 1 })).status, 400);

    // B ne peut pas fermer une session de A.
    const sa = (await t.api('GET', '/api/me/sessions', a)).body[0].id;
    assert.equal((await t.api('DELETE', `/api/me/sessions/${sa}`, b)).body.ok, false);
    assert.equal((await t.api('GET', '/api/me', a)).status, 200);

    // Le profil public ne révèle ni e-mail ni réglages, et respecte la confidentialité.
    await t.api('PATCH', '/api/me', a, { bio: 'Ma bio' });
    let seen = await t.api('GET', `/api/users/${a.handle}`, b);
    assert.equal(seen.body.bio, 'Ma bio');
    assert.equal('email' in seen.body, false);
    assert.equal('settings' in seen.body, false);
    await t.api('PATCH', '/api/me/privacy', a, { profileVisibility: 'private' });
    seen = await t.api('GET', `/api/users/${a.handle}`, b);
    assert.equal('bio' in seen.body, false);
    assert.equal(seen.body.limited, true);

    // Média non rattaché : lisible par son propriétaire seulement.
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('secret de A')], { type: 'text/plain' }), 'note.txt');
    const req = new Request('http://x/api/media', { method: 'POST', body: form });
    const up = await t.app.inject({ method: 'POST', url: '/api/media', headers: { authorization: `Bearer ${a.token}`, 'content-type': req.headers.get('content-type')! }, payload: Buffer.from(await req.arrayBuffer()) });
    assert.equal(up.statusCode, 200);
    const mediaId = JSON.parse(up.body).id;
    assert.equal((await t.api('GET', `/api/media/${mediaId}`, a)).status, 200);
    assert.equal((await t.api('GET', `/api/media/${mediaId}`, b)).status, 404);
    assert.equal((await t.api('GET', `/api/media/${mediaId}`)).status, 401);
    assert.equal((await t.api('GET', `/api/media/${mediaId}/url`, b)).status, 404);
    const signed = (await t.api('GET', `/api/media/${mediaId}/url`, a)).body.url as string;
    assert.equal((await t.api('GET', signed)).status, 200);
    assert.equal((await t.api('GET', signed.replace(/sig=.{4}/, 'sig=AAAA'))).status, 401);
    assert.equal((await t.api('DELETE', `/api/media/${mediaId}`, b)).status, 404);
  } finally { await t.stop(); }
});

test('conditions : un compte qui ne les a pas acceptées est limité', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    t.ctx.db.run('UPDATE users SET terms_version=NULL WHERE id=?', a.id);
    assert.equal((await t.api('GET', '/api/me', a)).status, 200);            // consulter son compte reste possible
    assert.equal((await t.api('GET', '/api/legal/terms?lang=fr')).status, 200); // lire les documents aussi
    assert.equal((await t.api('GET', '/api/me/export', a)).status, 200);
    const blocked = await t.api('GET', '/api/notifications', a);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error, 'terms_required');
    assert.equal((await t.api('POST', '/api/me/terms', a, { accept: true, version: TERMS })).status, 200);
    assert.equal((await t.api('GET', '/api/notifications', a)).status, 200);
  } finally { await t.stop(); }
});

test('suppression du compte : mot de passe exigé, données effacées', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    let hooked = '';
    t.ctx.registry.accountDeleteHooks.push(id => { hooked = id; });
    assert.equal((await t.api('DELETE', '/api/me', a, { password: 'faux-mot-de-passe' })).status, 401);
    assert.equal((await t.api('DELETE', '/api/me', a, { password: a.password })).status, 200);
    assert.equal(hooked, a.id);
    assert.equal((await t.api('GET', '/api/me', a)).status, 401);
    assert.equal(t.ctx.db.get('SELECT 1 FROM sessions WHERE user_id=?', a.id), undefined);
  } finally { await t.stop(); }
});

test('Google : flux complet contre un faux fournisseur local, jeton remis une seule fois', async () => {
  // Faux Google local : vérifie que le serveur envoie bien code, secret et PKCE.
  let seenVerifier = '';
  const fake = createServer((req, res) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/token') {
        const p = new URLSearchParams(data);
        seenVerifier = p.get('code_verifier') ?? '';
        if (p.get('code') !== 'bon-code' || p.get('client_secret') !== 'secret-test') { res.statusCode = 400; res.end('{}'); return; }
        res.end(JSON.stringify({ access_token: 'acces' }));
      } else if (req.url === '/userinfo' && req.headers.authorization === 'Bearer acces') {
        res.end(JSON.stringify({ sub: 'g-123', email: 'Carla@Example.com', email_verified: true, name: 'Carla' }));
      } else { res.statusCode = 404; res.end('{}'); }
    });
  });
  await new Promise<void>(ok => fake.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  const t = await startTestApp({ google: { clientId: 'client-test', clientSecret: 'secret-test', base: `${base}/auth`, tokenUrl: `${base}/token`, userinfoUrl: `${base}/userinfo` } });
  try {
    assert.equal((await t.api('GET', '/api/auth/providers')).body.google.configured, true);
    const start = await t.api('POST', '/api/auth/google/start', null, { device: 'PC' });
    const url = new URL(start.body.url);
    assert.equal(url.searchParams.get('client_id'), 'client-test');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(start.body.url.includes('secret-test'), false);
    const poll = { attemptId: start.body.attemptId, pollSecret: start.body.pollSecret };
    assert.equal((await t.api('POST', '/api/auth/attempt', null, poll)).body.status, 'pending');
    assert.equal((await t.api('POST', '/api/auth/attempt', null, { ...poll, pollSecret: 'x'.repeat(30) })).status, 401);
    assert.equal((await t.api('GET', '/api/auth/google/callback?state=inconnu&code=bon-code')).status, 400);
    const cb = await t.api('GET', `/api/auth/google/callback?state=${url.searchParams.get('state')}&code=bon-code`);
    assert.equal(cb.status, 200);
    assert.ok(seenVerifier.length > 40);
    const done = await t.api('POST', '/api/auth/attempt', null, poll);
    assert.equal(done.body.status, 'done');
    assert.equal(done.body.user.email, 'carla@example.com');
    assert.equal(done.body.user.termsAccepted, false); // un nouveau compte Google doit encore accepter les conditions
    assert.equal((await t.api('GET', '/api/me', done.body.token)).status, 200);
    assert.equal((await t.api('POST', '/api/auth/attempt', null, poll)).status, 401); // remis une seule fois
  } finally { await t.stop(); fake.close(); }
});

test('Google non configuré : état honnête', async () => {
  const t = await startTestApp({ google: null });
  try {
    assert.equal((await t.api('GET', '/api/auth/providers')).body.google.configured, false);
    assert.equal((await t.api('POST', '/api/auth/google/start', null, {})).status, 503);
  } finally { await t.stop(); }
});

test('temps réel : authentification par jeton, notification poussée au bon utilisateur seulement', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    const b = await t.signup('Bob');
    const base = (await t.listen()).replace('http', 'ws');
    const open = (token: string) => new Promise<{ ws: WebSocket; events: any[] }>((ok, ko) => {
      const ws = new WebSocket(`${base}/api/ws`);
      const events: any[] = [];
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
      ws.onmessage = e => { const m = JSON.parse(String(e.data)); events.push(m); if (m.type === 'ready') ok({ ws, events }); };
      ws.onclose = e => ko(new Error(`fermé ${e.code}`));
    });
    await assert.rejects(open('jeton-invalide-jeton-invalide'));
    const ca = await open(a.token);
    const cb = await open(b.token);
    t.ctx.notify(a.id, 'test', { hello: 1 });
    await new Promise(r => setTimeout(r, 100));
    assert.equal(ca.events.filter(e => e.type === 'notification').length, 1);
    assert.equal(cb.events.filter(e => e.type === 'notification').length, 0);
    assert.equal((await t.api('GET', '/api/notifications', a)).body.unread, 1);
    assert.equal((await t.api('GET', '/api/notifications', b)).body.unread, 0);
    // La déconnexion coupe aussi le temps réel.
    const closed = new Promise(r => { ca.ws.onclose = r; });
    await t.api('POST', '/api/auth/logout', a);
    await closed;
    cb.ws.close();
  } finally { await t.stop(); }
});

test('aucun secret ni mot de passe en clair dans la base', async () => {
  const t = await startTestApp();
  try {
    const a = await t.signup('Alice');
    const dump = readdirSync(t.dataDir).filter(f => f.startsWith('orbe.db')).map(f => readFileSync(join(t.dataDir, f))).reduce((x, y) => Buffer.concat([x, y]));
    assert.equal(dump.includes(a.password), false);
    assert.equal(dump.includes(a.token), false);
  } finally { await t.stop(); }
});
