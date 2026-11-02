// Couche de la version publique : comptes, Public / Mon espace, tri de listes, analyse du PC et IA.
import { call, h, signIn } from '/compte.js';
const mode = await fetch('/api/mode').then(r => (r.ok ? r.json() : null)).catch(() => null);

if (mode?.mode === 'public') {
  const T = {
    fr: { public: 'Public', mine: 'Mon espace', login: 'Connexion', logout: 'Déconnexion', add: 'Ajouter', propose: 'Proposer une information', admin: 'À vérifier' },
    en: { public: 'Public', mine: 'My space', login: 'Sign in', logout: 'Sign out', add: 'Add', propose: 'Suggest information', admin: 'To review' },
    es: { public: 'Público', mine: 'Mi espacio', login: 'Entrar', logout: 'Salir', add: 'Añadir', propose: 'Proponer información', admin: 'Por revisar' },
  };
  let lang = 'fr';
  try { lang = localStorage.getItem('orbe-lang') || (navigator.language || 'fr').slice(0, 2); } catch {}
  if (!T[lang]) lang = 'fr';
  const t = key => T[lang][key];
  const $ = id => document.getElementById(id);
  const SENSITIVE = /(^|[\\/])\.env|password|mot.?de.?passe|secret|credential|token|id_rsa|\.pem$|\.key$|\.kdbx$|wallet|cookies?|login data/i;
  let space = 'public';
  const authDialog = () => signIn($('dialog'), () => location.reload());


  const close = () => $('dialog').close();
  const closeBtn = (label = 'Fermer') => h('button', { class: 'secondary', type: 'button', on: { click: close } }, label);
  const open = (...content) => { $('dialog').replaceChildren(...content.flat().filter(Boolean)); $('dialog').showModal(); };
  const error = () => h('p', { class: 'error', role: 'alert' });

  // --- Barre du haut ---------------------------------------------------------------------
  const switcher = h('div', { class: 'views', role: 'group', ariaLabel: 'Espace' });
  const account = h('button', { class: 'ghost', type: 'button' });
  const add = h('button', { class: 'ghost', type: 'button' });
  const review = h('button', { class: 'ghost', type: 'button', on: { click: reviewDialog } });
  const language = h('select', { class: 'ghost', ariaLabel: 'Langue', on: { change: e => {
    try { localStorage.setItem('orbe-lang', e.target.value); } catch {}
    location.reload();
  } } }, ['fr', 'en', 'es'].map(code => h('option', { value: code, selected: code === lang }, code.toUpperCase())));
  $('connect-ai').replaceWith(h('div', { style: 'margin-left:auto;display:flex;gap:8px;flex-wrap:wrap' }, add, mode.admin ? review : null, h('a', { class: 'ghost', href: '/ia', style: 'text-decoration:none' }, 'Connecter son IA'), language, account));
  $('bar').children[0].after(switcher);
  document.documentElement.lang = lang;

  function drawBar() {
    switcher.replaceChildren(
      h('button', { type: 'button', 'aria-pressed': space === 'public', on: { click: () => go('public') } }, t('public')),
      h('button', { type: 'button', 'aria-pressed': space === 'mine', on: { click: () => (mode.user ? go('mine') : authDialog()) } }, t('mine')));
    account.textContent = mode.user ? `${t('logout')} (${mode.user})` : t('login');
    account.onclick = mode.user ? async () => { await call('POST', '/api/auth/logout', {}); location.reload(); } : () => authDialog();
    add.textContent = space === 'public' ? t('propose') : t('add');
    add.onclick = () => (mode.user ? (space === 'public' ? proposeDialog() : addDialog()) : authDialog());
    review.textContent = t('admin');
  }

  async function go(next) {
    space = next;
    drawBar();
    await window.orbe.setSpace(next === 'public' ? '/api/public/' : '/api/me/', next === 'public');
  }

  // --- Compte -----------------------------------------------------------------------------

  // --- Ajouter dans mon espace ------------------------------------------------------------
  async function sendLines(lines, kind) {
    const total = { refused: 0, placed: 0 };
    for (let i = 0; i < lines.length; i += 1000) {
      const res = await call('POST', '/api/me/sort', { lines: lines.slice(i, i + 1000), kind });
      total.refused += res.refused;
      total.placed += Object.values(res.placed).reduce((a, b) => a + b, 0);
    }
    close();
    await window.orbe.refresh();
    window.orbe.toast(`${total.placed} élément(s) rangé(s).${total.refused ? ` ${total.refused} ligne(s) refusée(s) car elles ressemblent à un secret.` : ''}`);
  }

  function addDialog() {
    open(h('h2', {}, 'Ajouter à mon espace'),
      h('p', {}, 'Choisis ce que tu veux ajouter. Tu vois toujours la liste avant l’envoi.'),
      h('div', { class: 'chips' },
        h('button', { class: 'chip', type: 'button', on: { click: listDialog } }, 'Écrire une liste'),
        h('button', { class: 'chip', type: 'button', on: { click: folderDialog } }, 'Analyser un dossier de mon PC'),
        h('button', { class: 'chip', type: 'button', on: { click: aiExportDialog } }, 'Importer un export d’IA'),
        h('a', { class: 'chip', href: '/ia', style: 'text-decoration:none' }, 'Connecter une IA'),
        h('button', { class: 'chip', type: 'button', on: { click: manageDialog } }, 'Gérer mes données')),
      h('div', { class: 'buttons' }, closeBtn()));
  }

  function listDialog() {
    const area = h('textarea', { rows: 10, placeholder: 'Une information par ligne' });
    const err = error();
    open(h('h2', {}, 'Écrire une liste'), h('p', {}, 'Orbe range chaque ligne dans la bonne catégorie. Ce qu’il ne reconnaît pas va dans « À trier ». N’écris pas de mots de passe.'), area, err,
      h('div', { class: 'buttons' }, closeBtn('Annuler'), h('button', { class: 'primary', type: 'button', on: { click: () =>
        sendLines(area.value.split('\n').filter(l => l.trim()), 'text').catch(e => { err.textContent = e.message; }) } }, 'Trier et ranger')));
    area.focus();
  }

  async function walk(dir, prefix, out) {
    for await (const [name, handle] of dir.entries()) {
      if (out.length >= 5000) return;
      const rel = prefix + name;
      if (handle.kind === 'directory') {
        if (!/^(node_modules|\.git|AppData|\$RECYCLE\.BIN)$/i.test(name)) await walk(handle, rel + '/', out);
      } else out.push(rel);
    }
  }

  function preview(paths) {
    const kept = paths.filter(p => !SENSITIVE.test(p));
    const err = error();
    open(h('h2', {}, 'Vérifie avant d’ajouter'),
      h('p', {}, `${kept.length} nom(s) de fichier seront ajoutés à ton espace privé. ${paths.length - kept.length} fichier(s) sensibles sont écartés. Le contenu des fichiers n’est ni lu ni envoyé.`),
      h('pre', { class: 'content-view', style: 'max-height:40vh' }, kept.slice(0, 300).join('\n') + (kept.length > 300 ? `\n… et ${kept.length - 300} autres` : '')), err,
      h('div', { class: 'buttons' }, closeBtn('Annuler'), h('button', { class: 'primary', type: 'button', on: { click: () =>
        sendLines(kept, 'file').catch(e => { err.textContent = e.message; }) } }, `Ajouter ${kept.length} fichier(s)`)));
  }

  function folderDialog() {
    const fallback = h('input', { type: 'file', webkitdirectory: true, on: { change: e => preview([...e.target.files].map(f => f.webkitRelativePath).slice(0, 5000)) } });
    const pick = async () => {
      if (!window.showDirectoryPicker) { fallback.click(); return; }
      try {
        const out = [];
        const dir = await window.showDirectoryPicker();
        await walk(dir, dir.name + '/', out);
        preview(out);
      } catch (e) { if (e.name !== 'AbortError') window.orbe.toast(e.message, { bad: true }); }
    };
    open(h('h2', {}, 'Analyser un dossier de mon PC'),
      h('p', {}, 'Tu choisis toi-même un dossier. Ton navigateur lit uniquement les noms des fichiers, et rien ne part avant ta confirmation. Un site web ne peut pas fouiller ton PC sans cette action, et Orbe ne lit pas tes autres onglets ni tes applications.'),
      h('div', { class: 'buttons' }, closeBtn('Annuler'), h('button', { class: 'primary', type: 'button', on: { click: pick } }, 'Choisir un dossier')));
  }

  function aiExportDialog() {
    const err = error();
    const input = h('input', { type: 'file', accept: '.json', on: { change: async e => {
      try {
        const data = JSON.parse(await e.target.files[0].text());
        const list = Array.isArray(data) ? data : data.conversations || [];
        const titles = list.map(c => c.title || c.name).filter(Boolean);
        if (!titles.length) throw new Error('Aucune conversation reconnue dans ce fichier.');
        open(h('h2', {}, 'Vérifie avant d’ajouter'), h('p', {}, `${titles.length} titre(s) de conversation seront ajoutés. Le texte des conversations reste sur ton PC.`),
          h('pre', { class: 'content-view', style: 'max-height:40vh' }, titles.slice(0, 300).join('\n')), err,
          h('div', { class: 'buttons' }, closeBtn('Annuler'), h('button', { class: 'primary', type: 'button', on: { click: () =>
            sendLines(titles, 'ai').catch(x => { err.textContent = x.message; }) } }, 'Ajouter les titres')));
      } catch (x) { err.textContent = x.message; }
    } } });
    open(h('h2', {}, 'Importer un export d’IA'),
      h('p', {}, 'Demande l’export de tes données dans les réglages de ton IA (ChatGPT, Claude…), décompresse-le, puis choisis son fichier conversations.json. Importe uniquement tes propres conversations : elles peuvent parler d’autres personnes. Orbe ne va jamais chercher ton historique tout seul.'),
      input, err, h('div', { class: 'buttons' }, closeBtn()));
  }


  function manageDialog() {
    open(h('h2', {}, 'Gérer mes données'), h('p', {}, 'Tu peux télécharger toute ta carte, ou supprimer définitivement ton compte et ton espace.'),
      h('div', { class: 'buttons' }, closeBtn(),
        h('a', { class: 'secondary', href: '/api/me/export', download: 'orbe.json', style: 'color:inherit;text-decoration:none' }, 'Exporter'),
        h('button', { class: 'primary danger', type: 'button', on: { click: async () => {
          if (confirm('Supprimer définitivement ton compte et toutes tes données ?')) { await call('DELETE', '/api/me/account'); location.reload(); }
        } } }, 'Supprimer mon compte')));
  }

  // --- Carte publique ---------------------------------------------------------------------
  function proposeDialog() {
    const text = h('textarea', { rows: 4, placeholder: 'Une information publique et vérifiable' });
    const source = h('input', { class: 'text', placeholder: 'https://…' });
    const err = error();
    open(h('h2', {}, `Proposer dans ${window.orbe.selectedName}`),
      h('p', {}, 'Les IA disponibles reçoivent ton texte et ta source pour donner un avis, puis une personne décide de la publication. Ne propose jamais d’informations sur une personne privée.'), text,
      h('label', {}, 'Source publique'), source, err,
      h('div', { class: 'buttons' }, closeBtn('Annuler'), h('button', { class: 'primary', type: 'button', on: { click: async () => {
        try {
          await call('POST', '/api/public/propose', { text: text.value, source: source.value, category: window.orbe.selectedId });
          close();
          window.orbe.toast('Proposition envoyée pour vérification.');
        } catch (e) { err.textContent = e.message; }
      } } }, 'Envoyer')));
  }

  async function reviewDialog() {
    const items = await call('GET', '/api/admin/proposals');
    const act = async (id, verb) => { await call('POST', `/api/admin/proposals/${id}/${verb}`, {}); reviewDialog(); await window.orbe.refresh(); };
    open(h('h2', {}, 'Propositions à vérifier'),
      items.length ? h('ul', { class: 'entries' }, items.map(p => h('li', {}, h('p', {}, p.text),
        h('p', {}, p.checking ? 'Vérification par les IA en cours.' : p.checks.length ? p.checks.map(c => `${c.provider} : ${c.votes.map(v => v.verdict).join(', ')}`).join(' ; ') : 'Aucune IA disponible pour vérifier.'),
        h('div', { class: 'meta' }, h('span', {}, p.source),
          h('button', { class: 'link-btn', type: 'button', on: { click: () => act(p.id, 'approve') } }, 'Publier'),
          h('button', { class: 'link-btn danger', type: 'button', on: { click: () => act(p.id, 'reject') } }, 'Refuser'))))) : h('p', {}, 'Rien à vérifier.'),
      h('div', { class: 'buttons' }, closeBtn()));
  }

  drawBar();
  await window.orbe.setSpace('/api/public/', true);
}
