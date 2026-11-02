// Page d'accueil : ouvrir la carte, se connecter ou aller connecter une IA.
import { call, getMode, h, noAccount, signIn } from '/compte.js';

const mode = await getMode();
const dialog = document.getElementById('dialog');
const login = document.getElementById('login');

call('GET', '/api/stats').then(stats => {
  const fmt = n => n.toLocaleString('fr-FR');
  const count = document.getElementById('count');
  count.append(h('strong', {}, fmt(stats.total)), ' points de connaissance',
    h('small', {}, `${fmt(stats.atlas)} dans l'atlas, ${fmt(stats.wiki)} titres de Wikipédia (redirections comprises), ${fmt(stats.map)} ${mode ? 'sur la carte publique' : 'sur ta carte'}${stats.gaia ? `, ${fmt(stats.gaia)} objets de Gaia lus en direct` : ''}`));
  count.hidden = false;
}).catch(() => {});

if (mode?.user) {
  login.textContent = 'Se déconnecter';
  login.addEventListener('click', async () => { await call('POST', '/api/auth/logout', {}); location.reload(); });
  document.getElementById('who').append(h('span', {}, `Connecté : ${mode.user}`));
} else if (mode) {
  login.addEventListener('click', () => signIn(dialog, () => { location.href = '/carte'; }));
} else {
  login.addEventListener('click', () => noAccount(dialog));
  filesConsent();
}

// Version installée : les noms de fichiers ne sont analysés qu'avec l'accord de l'utilisateur.
async function filesConsent() {
  const { consent } = await call('GET', '/api/files/consent').catch(() => ({ consent: 'absent' }));
  if (consent === 'absent') return;
  const who = document.getElementById('who');
  const choose = async allow => {
    await call('POST', '/api/files/consent', { allow });
    dialog.close();
    draw(allow ? 'yes' : 'no');
  };
  const ask = () => {
    dialog.replaceChildren(
      h('h2', {}, 'Analyser tes fichiers ?'),
      h('p', {}, 'Orbe peut lister les noms, tailles et dates des fichiers de ton dossier personnel pour les retrouver sur ta carte. Il ne lit jamais leur contenu.'),
      h('p', {}, 'La liste reste sur ce PC, mais une IA que tu connectes à Orbe pourra y chercher. Tu pourras changer d’avis ici à tout moment : refuser efface la liste.'),
      h('button', { type: 'button', on: { click: () => choose(true) } }, 'Autoriser'), ' ',
      h('button', { class: 'secondary', type: 'button', on: { click: () => choose(false) } }, 'Refuser'));
    dialog.showModal();
  };
  const draw = state => {
    document.getElementById('files-consent')?.remove();
    who.append(h('button', { id: 'files-consent', type: 'button', style: 'background:none;color:inherit;border:1px solid currentColor;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit', on: { click: ask } },
      state === 'yes' ? 'Analyse des fichiers : activée' : 'Analyse des fichiers : désactivée'));
  };
  draw(consent);
  if (consent === null) ask();
}
