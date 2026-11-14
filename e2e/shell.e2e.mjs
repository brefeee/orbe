// Parcours réel : première ouverture → conditions → création de compte → navigation → déconnexion → reconnexion.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { launch, SHOTS } from './harness.mjs';

const t = await launch();
try {
  const context = await t.browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(t.base);
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.screenshot({ path: join(SHOTS, 'shell-1-conditions.png') });
  // Refus : pas d'accès, documents toujours lisibles.
  await page.getByRole('button', { name: 'Je refuse' }).click();
  await page.getByText('Tu as refusé les conditions').waitFor();
  assert.equal(await page.locator('.bottom-nav').count(), 0);
  await page.getByRole('tab', { name: 'Confidentialité' }).click();
  await page.getByText('Les trois niveaux de visibilité').waitFor();
  await page.getByRole('button', { name: 'Relire et accepter' }).click();
  await page.getByRole('button', { name: 'J’accepte et je continue' }).click();
  // Bouton Google absent tant que le serveur n'est pas configuré (pas de faux bouton).
  assert.equal(await page.getByRole('button', { name: 'Continuer avec Google' }).count(), 0);
  await page.getByLabel('Nom affiché').fill('Camille');
  await page.getByLabel('Identifiant').fill('camille');
  await page.getByLabel('Adresse e-mail').fill('camille@test.orbe');
  await page.getByLabel('Mot de passe').fill('un-mot-de-passe-solide');
  await page.screenshot({ path: join(SHOTS, 'shell-2-inscription.png') });
  await page.getByRole('button', { name: 'Créer un compte' }).click();
  await page.locator('.bottom-nav').waitFor();
  for (const name of ['Carte', 'Réseau', 'Recherche', 'Profil', 'IA']) {
    await page.locator('.bottom-nav').getByRole('link', { name }).click();
    await page.locator('.nav-item.active', { hasText: name }).waitFor();
  }
  await page.screenshot({ path: join(SHOTS, 'shell-3-coque.png') });
  // La session survit au rechargement.
  await page.reload();
  await page.locator('.bottom-nav').waitFor();
  await page.getByRole('button', { name: 'Compte' }).click();
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
  await page.getByRole('button', { name: 'Commencer' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('orbe.token')), null);
  // Reconnexion.
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.getByRole('button', { name: 'J’accepte et je continue' }).click();
  await page.getByRole('button', { name: 'J’ai déjà un compte' }).click();
  await page.getByLabel('Adresse e-mail').fill('camille@test.orbe');
  await page.getByLabel('Mot de passe').fill('mauvais');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByText('Adresse ou mot de passe incorrect.').waitFor();
  await page.getByLabel('Mot de passe').fill('un-mot-de-passe-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.locator('.bottom-nav').waitFor();
  // Téléphone.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.screenshot({ path: join(SHOTS, 'shell-4-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('OK shell');
} finally { await t.stop(); }
