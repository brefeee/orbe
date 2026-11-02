// Interface : panneau latéral, recherche, boîtes de dialogue et synchronisation avec les données.
import { sfx } from './sound.js';
import { buildIndex, flowFrom, LARGE_LIMIT } from './graph.js';
import { renderArticle } from './article.js';
import { createScene } from './scene.js';

const $ = id => document.getElementById(id);
const state = { graph: null, idx: null, selectedId: null, mode: 'focus', hideRest: false, filter: 'all', drafts: new Map(), rev: 0, entryLimit: 50, kidLimit: 100, base: '/api/', readonly: false, virtual: [], loaded: new Set() };
let events = null;
const ATLAS_SOURCES = {
  univers: 'Données astronomiques : NASA/JPL, catalogue HYG, OpenNGC et Wikidata.',
  stars: 'Étoiles : catalogue HYG.', galaxies: 'Galaxies : catalogue OpenNGC.', deep: 'Amas et nébuleuses : catalogue OpenNGC.',
  exo: 'Exoplanètes : NASA Exoplanet Archive.', petits: 'Astéroïdes et comètes : NASA/JPL Small-Body Database.',
  geo: 'Géographie : base country-state-city et mledoze/countries.', fr: 'France : geo.api.gouv.fr.',
  jeux: 'Liste des jeux : Wikidata.', logiciels: 'Liste des logiciels : Wikidata.', wiki: 'Titres : Wikipédia en français.', wikicat: 'Classement : catégories de Wikipédia en français.',
  'wc-root': 'Classement : catégories de Wikipédia en français.', dico: 'Mots : Wiktionnaire en français, licence CC BY-SA 4.0.', esp: 'Espèces : Wikispecies, licence CC BY-SA 4.0.',
};
const GEONAMES_SOURCE = 'Lieux : GeoNames (geonames.org), licence CC BY 4.0.';
let scene = null;

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'on') for (const [ev, fn] of Object.entries(value)) el.addEventListener(ev, fn);
    else if (key === 'class') el.className = value;
    else if (key in el && key !== 'list') el[key] = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter(c => c !== null && c !== undefined && c !== false));
  return el;
}

async function api(method, url, body) {
  const res = await fetch(state.base + url.slice('/api/'.length), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Orbe ne répond pas. Vérifie que la fenêtre du programme est ouverte.');
  return data;
}

function toast(text, { bad = false, action = null } = {}) {
  if (bad) sfx.error();
  const box = h('div', { class: 'toast' + (bad ? ' bad' : '') }, h('span', {}, text),
    action && h('button', { class: 'link-btn', type: 'button', on: { click: () => { action.run(); box.remove(); } } }, action.label));
  $('toast').append(box);
  setTimeout(() => box.remove(), 6000);
}

async function run(action) {
  try {
    const result = await action();
    await refresh();
    return result;
  } catch (err) {
    toast(err.message, { bad: true });
    return null;
  }
}

function pathOf(id) {
  const { idx } = state;
  return [...idx.ancestors(id), idx.byId.get(id)].map(n => n.name).join(' / ');
}

function normal(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// --- Données -----------------------------------------------------------------------------

async function refresh() {
  const graph = await api('GET', '/api/graph');
  if (graph.rev === state.rev) return;
  const first = state.rev === 0;
  const signature = g => g.nodes.map(n => n.id + n.parentId).join() + g.links.map(l => l.id).join();
  const structureChanged = first || signature(graph) !== signature(state.graph);
  const change = graph.lastChange;
  state.rev = graph.rev;
  state.graph = graph;
  rebuild();
  if (!state.selectedId || !state.idx.byId.has(state.selectedId)) {
    state.selectedId = (change && state.idx.byId.has(change.nodeId) && !first) ? change.nodeId : state.idx.root.id;
  }
  scene?.setData(state.idx, structureChanged);
  scene?.setView({ selectedId: state.selectedId, mode: state.mode, hideRest: state.hideRest });
  renderPanel();
  if (!first && change?.by === 'claude') {
    scene?.pulse(change.nodeId);
    toast(`Claude ${change.summary}.`, state.idx.byId.has(change.nodeId)
      ? { action: { label: 'Voir', run: () => select(change.nodeId, 'focus') } } : {});
  }
}

function rebuild() {
  state.idx = buildIndex({ ...state.graph, nodes: [...state.graph.nodes, ...state.virtual] });
}

function pageLink(atlas, name) {
  const page = encodeURIComponent(name.replaceAll(' ', '_'));
  if (/^wc?-/.test(atlas)) return ['Article : https://fr.wikipedia.org/wiki/' + page];
  if (atlas.startsWith('dico-')) return ['Wiktionnaire : https://fr.wiktionary.org/wiki/' + page];
  if (atlas.startsWith('esp-')) return ['Wikispecies : https://species.wikimedia.org/wiki/' + page];
  return [];
}

// Prépare en arrière-plan ce qui suit dans la hiérarchie : le serveur le garde, rien n'est affiché ni rechargé deux fois.
const PREPARE_LIMIT = 300;
let prepareRun = 0;
const prepared = new Set();
async function prepareBelow(keys, deep) {
  const run = ++prepareRun;
  const queue = keys.filter(Boolean);
  let budget = PREPARE_LIMIT;
  const worker = async () => {
    while (run === prepareRun && queue.length && budget > 0) {
      const key = queue.shift();
      if (prepared.has(key)) continue;
      prepared.add(key);
      budget--;
      const res = await fetch('/api/atlas/' + key + '?v=3').catch(() => null);
      if (!res?.ok) { prepared.delete(key); continue; }
      const { nodes = [] } = await res.json().catch(() => ({}));
      if (deep) queue.push(...nodes.map(n => n.a).filter(Boolean));
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

const sizeText = bytes => bytes >= 1024 ** 3 ? (bytes / 1024 ** 3).toFixed(1).replace('.', ',') + ' Go' : Math.ceil(bytes / 1024 ** 2) + ' Mo';

// « Tout voir » a besoin de tout l'atlas : l'installation demande d'abord une confirmation, avec sa taille.
async function seeEverything() {
  const full = await fetch('/api/atlas-full').then(r => r.json()).catch(() => null);
  if (!full) return toast('Impossible de vérifier l’atlas.', { bad: true });
  if (full.complete) return select(state.selectedId, 'large');
  if (full.running) return followInstall();
  if (!full.available) return toast('L’atlas complet n’est pas disponible pour le moment. Vérifie ta connexion.', { bad: true });
  if (full.free < full.size) return toast(`Il faut ${sizeText(full.size)} libres, il en reste ${sizeText(full.free)}.`, { bad: true });
  confirmDialog('Installer tout l’atlas ?', `« Tout voir » a besoin de tout l’atlas : ${sizeText(full.size)} seront téléchargés et installés sur ce PC. Tu peux continuer à naviguer pendant ce temps.`, `Installer ${sizeText(full.size)}`, async () => {
    await api('POST', '/api/atlas-full', {});
    followInstall();
  });
}

let installTimer = null;
function followInstall() {
  clearInterval(installTimer);
  installTimer = setInterval(async () => {
    const full = await fetch('/api/atlas-full').then(r => r.json()).catch(() => null);
    if (!full) return;
    if (!full.running) {
      clearInterval(installTimer);
      if (full.error) toast(full.error, { bad: true });
      else if (full.complete) { toast('Tout l’atlas est installé.'); select(state.selectedId, 'large'); }
      return;
    }
    toast(`Installation de l’atlas : ${Math.floor(full.done * 100 / (full.size || 1))} %`);
  }, 15000);
  toast('Installation de l’atlas lancée, en arrière-plan.');
}

// Charge le contenu d'un dossier de l'atlas : il rejoint la carte en mémoire, sans jamais être enregistré.
async function loadAtlas(id, quiet = false) {
  const node = state.idx.byId.get(id);
  if (!node?.atlas || state.loaded.has(id)) return;
  state.loaded.add(id);
  const prefix = node.prefix || id;
  const res = await fetch('/api/atlas/' + node.atlas + '?v=3');
  if (!res.ok) { state.loaded.delete(id); throw new Error('Ce dossier de l’atlas est introuvable.'); }
  const { nodes } = await res.json();
  for (const n of nodes) {
    state.virtual.push({
      id: prefix + '>' + n.i, name: n.n, parentId: n.p ? prefix + '>' + n.p : id, atlas: n.a || null, prefix, virtual: true, color: null, author: 'atlas', createdAt: '',
      entries: (n.t || (n.a ? [] : pageLink(node.atlas, n.n))).map((text, i) => ({ id: n.i + '-' + i, text, author: 'atlas', createdAt: '' })),
    });
  }
  rebuild();
  if (!quiet) scene?.setData(state.idx, true);
}

// La base importée n'a pas de dossiers : chaque résultat devient une fiche, rangée près de son sujet.
function openImportedResult(result) {
  const place = result.path.startsWith('Lieux');
  const anchor = state.graph.nodes.find(n => place ? n.atlas === 'geo' : n.name === 'Littérature') || state.graph.nodes.find(n => !n.parentId);
  const id = anchor.id + '>' + result.id;
  if (!state.idx.byId.has(id)) {
    const query = encodeURIComponent(result.name);
    const texts = [
      'Classement : ' + result.path + '.',
      place ? 'Source : GeoNames, licence CC BY 4.0. https://www.geonames.org/search.html?q=' + query : 'Source : Open Library. https://openlibrary.org/search?q=' + query,
    ];
    state.virtual.push({ id, name: result.name, parentId: anchor.id, atlas: null, prefix: anchor.id, virtual: true, color: null, author: 'atlas', createdAt: '',
      entries: texts.map((text, i) => ({ id: result.id + '-' + i, text, author: 'atlas', createdAt: '' })) });
    rebuild();
    scene?.setData(state.idx, true);
  }
  return select(id);
}

async function openAtlasResult(result) {
  try {
    if (result.chain[0] === 'import') { await openImportedResult(result); return; }
    const anchor = state.graph.nodes.find(n => n.atlas === result.chain[0]);
    if (!anchor) throw new Error('Ce dossier n’est pas accessible dans cet espace.');
    let current = anchor;
    await loadAtlas(current.id);
    const prefix = anchor.id;
    for (const key of result.chain.slice(1)) {
      current = state.virtual.find(n => n.atlas === key && n.prefix === prefix);
      if (!current && key.startsWith('wa-')) {
        await loadAtlas(state.virtual.find(n => n.atlas === 'wiki-autres' && n.prefix === prefix)?.id);
        current = state.virtual.find(n => n.atlas === key && n.prefix === prefix);
      }
      if (!current) throw new Error('Ce dossier de l’atlas est introuvable.');
      await loadAtlas(current.id);
    }
    let target = result.id ? prefix + '>' + result.id : state.virtual.find(n => n.name === result.name && n.prefix === prefix && n.parentId === current.id)?.id;
    // Une zone du ciel n'affiche que ses 500 objets les plus brillants : les autres sont lus un par un.
    if (result.star && !state.idx.byId.has(target)) {
      const res = await fetch('/api/atlas/gaia-star-' + result.star);
      const { nodes = [] } = res.ok ? await res.json() : {};
      if (!nodes.length) throw new Error('Ce num\u00e9ro n\u2019existe pas dans le catalogue Gaia, ou la connexion a \u00e9chou\u00e9.');
      for (const n of nodes) state.virtual.push({ id: target, name: n.n, parentId: current.id, atlas: null, prefix, virtual: true, color: null, author: 'atlas', createdAt: '', entries: n.t.map((text, i) => ({ id: n.i + '-' + i, text, author: 'atlas', createdAt: '' })) });
      rebuild();
      scene?.setData(state.idx, true);
    }
    if (!state.idx.byId.has(target)) throw new Error('Cet article est introuvable dans l\u2019atlas.');
    await select(target);
    // La recherche prépare tous les descendants du point trouvé, pas ses voisins.
    prepareBelow([state.idx.byId.get(target)?.atlas, ...state.idx.children.get(target).map(n => n.atlas)], true);
  } catch (err) { toast(err.message, { bad: true }); }
}

// Chaque déplacement entre dans l'historique, avec les dossiers de l'atlas à rouvrir après un rechargement.
function historyEntry(id, mode, depth) {
  const node = state.idx.byId.get(id);
  const path = [...state.idx.ancestors(id), node].filter(n => n.atlas).map(n => n.id);
  return { orbe: true, id, mode, path, depth };
}

function updateBack() {
  $('back').hidden = !(history.state?.depth > 0);
}

function recordHistory(id, mode) {
  const current = history.state;
  const url = `#${mode}/${id}`;
  if (current?.orbe && current.id === id && current.mode === mode) history.replaceState(historyEntry(id, mode, current.depth), '', url);
  else history.pushState(historyEntry(id, mode, (current?.depth ?? 0) + 1), '', url);
  updateBack();
}

async function restoreHistory(entry) {
  for (const id of entry.path || []) {
    if (state.idx.byId.has(id)) await loadAtlas(id).catch(() => {});
  }
  const target = state.idx.byId.has(entry.id) ? entry.id : state.idx.root.id;
  await select(target, entry.mode || 'focus', true);
  updateBack();
}

async function startHistory() {
  if (state.historyReady) {
    history.replaceState(historyEntry(state.selectedId, state.mode, history.state?.depth ?? 0), '', location.href);
    updateBack();
    return;
  }
  state.historyReady = true;
  addEventListener('popstate', async e => {
    if (e.state?.guard) {
      // Le retour ne doit jamais faire sortir d'Orbe vers une page vide.
      history.pushState(historyEntry(state.idx.root.id, state.mode, 0), '', `#${state.mode}/${state.idx.root.id}`);
      await select(state.idx.root.id, state.mode, true);
      updateBack();
    } else if (e.state?.orbe) {
      await restoreHistory(e.state);
    }
  });
  if (history.state?.orbe) {
    await restoreHistory(history.state);
    return;
  }
  history.replaceState({ guard: true }, '', location.href);
  history.pushState(historyEntry(state.selectedId, state.mode, 0), '', location.href);
  updateBack();
}

let arriveTimer = null;
async function select(id, mode = state.mode, fromHistory = false) {
  if (!state.idx.byId.has(id)) return;
  await loadAtlas(id).catch(err => toast(err.message, { bad: true }));
  prepareBelow(state.idx.children.get(id).map(n => n.atlas), false);
  // La vue large montre aussi le niveau suivant : les régions d'un pays, par exemple.
  if (mode === 'large') {
    await Promise.all(state.idx.children.get(id).filter(n => n.atlas).slice(0, 40).map(kid => loadAtlas(kid.id, true).catch(() => {})));
    scene?.setData(state.idx, true);
  }
  if (id !== state.selectedId) state.kidLimit = 100;
  saveDraft();
  if (id !== state.selectedId) state.entryLimit = 50;
  if (id !== state.selectedId) {
    sfx.select(state.idx.depth.get(id) ?? 0);
    // Le panneau n'entre en scène qu'en changeant de point : pas à chaque mise à jour de son contenu.
    $('panel').classList.remove('arrive');
    void $('panel').offsetWidth;
    $('panel').classList.add('arrive');
    clearTimeout(arriveTimer);
    arriveTimer = setTimeout(() => $('panel').classList.remove('arrive'), 600);
  } else if (mode !== state.mode) sfx.whoosh();
  state.selectedId = id;
  state.mode = mode;
  scene?.setView({ selectedId: id, mode, hideRest: state.hideRest });
  if (!fromHistory) recordHistory(id, mode);
  renderPanel();
}

function saveDraft() {
  const area = $('entry-text');
  if (area) state.drafts.set(area.dataset.node, area.value);
}

// --- Panneau -----------------------------------------------------------------------------

function formatDate(iso) {
  if (!iso) return 'atlas public';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderPanel() {
  const { idx, selectedId: id } = state;
  if (!idx) return;
  const active = document.activeElement?.id;
  const caret = active === 'entry-text' ? $('entry-text').selectionStart : null;
  const subDraft = $('new-category')?.value || '';
  saveDraft();
  const node = idx.byId.get(id);
  const panel = $('panel');
  const scroll = panel.scrollTop;
  const isRoot = node.parentId === null;

  $('view-focus').setAttribute('aria-pressed', state.mode === 'focus');
  $('view-large').setAttribute('aria-pressed', state.mode === 'large');
  renderLegend();

  panel.replaceChildren(
    h('nav', { class: 'crumbs', ariaLabel: 'Emplacement' }, idx.ancestors(id).map(a =>
      h('span', {}, h('button', { type: 'button', on: { click: () => select(a.id) } }, a.name)))),
    h('h1', {}, h('i', { class: 'swatch', style: `background:${idx.color.get(id)}` }), node.name),
    h('div', { class: 'actions' },
      h('button', { class: 'link-btn', type: 'button', on: { click: () => renameDialog(node) } }, 'Renommer'),
      !isRoot && h('button', { class: 'link-btn', type: 'button', on: { click: () => moveDialog(node) } }, 'Déplacer'),
      !isRoot && h('button', { class: 'link-btn danger', type: 'button', on: { click: () => deleteDialog(node) } }, 'Supprimer')),
    ...(state.mode === 'large' ? [flowSection(id)] : []),
    // Zones du ciel et objets de Gaia : leur fiche et leur source sont dans leurs informations.
    ...(isPublicNode(node) && !node.id.includes('gaia-') ? [articleSection(node)] : []),
    entriesSection(node),
    categoriesSection(node, subDraft),
    linksSection(node),
  );
  if (state.readonly || node.virtual) {
    panel.querySelectorAll('textarea, .form-row, .inline, .actions, .filter, .remove, .primary, .meta button:not([data-keep])').forEach(el => el.remove());
  }
  panel.scrollTop = scroll;
  if (active === 'entry-text' && $('entry-text')) { $('entry-text').focus(); $('entry-text').setSelectionRange(caret, caret); }
  if (active === 'new-category' && $('new-category')) $('new-category').focus();
}

// Seuls les points publics interrogent Wikipédia : aucun nom du Privé ne quitte le PC.
function isPublicNode(node) {
  if (node.parentId === null) return false;
  if (state.readonly || node.virtual) return node.name !== 'Public';
  const top = [...state.idx.ancestors(node.id), node][1];
  return top?.name === 'Public' && node.name !== 'Public';
}

function articleSection(node) {
  const host = h('div', { class: 'article-host' });
  const sources = [...new Set(state.idx.ancestors(node.id).concat(node).map(n => (n.atlas?.startsWith('gn-') ? GEONAMES_SOURCE : ATLAS_SOURCES[n.atlas])).filter(Boolean))];
  queueMicrotask(() => renderArticle(host, node, sources));
  return h('section', { class: 'article' }, h('h2', {}, 'Page explicative'), host);
}

function flowSection(id) {
  const flow = flowFrom(state.idx, id);
  const count = flow.level.size - 1;
  const text = count === 0 ? 'Rien ne découle encore de ce dossier.'
    : `${count} ${count > 1 ? 'catégories découlent' : 'catégorie découle'} de ce dossier, dont ${flow.linkEdges.size} ${flow.linkEdges.size > 1 ? 'connexions' : 'connexion'} vers d'autres dossiers ou entre eux.`;
  return h('section', { class: 'flow' }, h('p', {}, text),
    count >= LARGE_LIMIT ? h('label', {}, `La 3D en montre les ${LARGE_LIMIT} plus proches. Clique sur un dossier pour descendre.`) : null,
    state.idx.byId.get(id).atlas || state.virtual.length ? h('label', {}, 'Le décompte porte sur les dossiers de l’atlas déjà ouverts.') : null,
    h('label', {}, h('input', {
      type: 'checkbox', checked: state.hideRest,
      on: { change: e => { state.hideRest = e.target.checked; scene?.setView({ hideRest: state.hideRest }); } },
    }), 'Masquer le reste de la carte'));
}

function entriesSection(node) {
  const shown = node.entries.filter(e => state.filter === 'all' || e.author === state.filter).slice().reverse();
  const filterBtn = (key, label) => h('button', {
    type: 'button', 'aria-pressed': state.filter === key,
    on: { click: () => { state.filter = key; renderPanel(); } },
  }, label);
  const area = h('textarea', {
    id: 'entry-text', placeholder: `Écris ce que tu veux ranger dans ${node.name}`, rows: 3,
    value: state.drafts.get(node.id) || '', ariaLabel: 'Nouvelle information',
    on: { keydown: e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addEntry(node.id); } } },
  });
  area.dataset.node = node.id;
  return h('section', {},
    h('h2', {}, 'Informations', h('span', { class: 'filter', role: 'group', ariaLabel: 'Filtrer par auteur' },
      filterBtn('all', 'Toutes'), filterBtn('user', 'Les miennes'), filterBtn('claude', 'Claude'))),
    area,
    h('div', { class: 'form-row' }, h('span', { class: 'tip' }, 'Ctrl + Entrée pour ranger'),
      h('button', { class: 'primary', type: 'button', on: { click: () => addEntry(node.id) } }, 'Ranger')),
    shown.length ? h('ul', { class: 'entries' }, shown.slice(0, state.entryLimit).map(entryItem)) : null,
    shown.length > state.entryLimit ? h('button', {
      class: 'link-btn', type: 'button', style: 'margin-top:8px',
      on: { click: () => { state.entryLimit += 50; renderPanel(); } },
    }, `Afficher plus (${shown.length - state.entryLimit} restantes)`) : null,
    shown.length ? null : h('p', { class: 'empty' }, node.entries.length ? 'Aucune information de cet auteur ici.' : 'Rien de rangé ici pour le moment.'));
}

function entryItem(entry) {
  return h('li', { class: entry.author },
    h('p', {}, entry.text),
    h('div', { class: 'meta' },
      h('span', {}, `${state.readonly || entry.author === 'atlas' ? 'Public' : entry.author === 'claude' ? 'Claude' : 'Moi'}, ${formatDate(entry.createdAt)}`),
      entry.content && h('button', { class: 'link-btn', type: 'button', 'data-keep': '1', on: { click: () => contentDialog(entry) } },
        `Voir le contenu (${Math.max(1, Math.round((entry.contentSize || 0) / 1024))} Ko)`),
      entry.reliability && h('span', {}, `${entry.reliability}, version ${entry.version}`),
      entry.reliability && h('button', { class: 'link-btn', type: 'button', on: { click: () => detailsDialog(entry) } }, 'Détails'),
      h('button', { class: 'link-btn', type: 'button', on: { click: () => editEntryDialog(entry) } }, 'Modifier'),
      h('button', { class: 'link-btn danger', type: 'button', on: { click: () => deleteEntryDialog(entry) } }, 'Supprimer')));
}

async function detailsDialog(entry) {
  const history = await api('GET', `/api/entries/${entry.id}/history`).catch(() => []);
  const title = h('input', { class: 'text', id: 'd-title', value: entry.title || '', maxLength: 200 });
  const description = h('textarea', { id: 'd-description', rows: 3, value: entry.description || '' });
  const reliability = h('select', { class: 'text', id: 'd-reliability' }, ['non vérifié', 'probable', 'vérifié', 'contesté', 'faux'].map(v => h('option', { value: v, selected: v === entry.reliability }, v)));
  const sources = h('textarea', { id: 'd-sources', rows: 3, value: (entry.sources || []).join('\n'), placeholder: 'Une source par ligne' });
  const error = h('p', { class: 'error', role: 'alert' });
  openDialog(h('form', { on: { submit: async e => {
    e.preventDefault();
    try {
      await api('POST', `/api/entries/${entry.id}/details`, { title: title.value, description: description.value, reliability: reliability.value, sources: sources.value.split('\n') });
      $('dialog').close();
      await refresh();
    } catch (err) { error.textContent = err.message; }
  } } },
  h('h2', {}, 'Détails de l\u2019information'),
  h('label', { htmlFor: 'd-title' }, 'Titre'), title,
  h('label', { htmlFor: 'd-description' }, 'Description'), description,
  h('label', { htmlFor: 'd-reliability' }, 'Fiabilité'), reliability,
  h('label', { htmlFor: 'd-sources' }, 'Sources'), sources,
  h('p', { class: 'tip', style: 'margin-top:10px' }, `Origine : ${entry.origin}. Découverte : ${formatDate(entry.discoveredAt)}. Vérification : ${entry.verifiedAt ? formatDate(entry.verifiedAt) : 'aucune'}.`),
  error,
  h('label', {}, 'Historique'),
  h('ul', { class: 'links' }, history.map(item => h('li', {}, `${item.action}${item.version ? ', version ' + item.version : ''}, ${formatDate(item.at)}, ${item.actor === 'claude' ? 'Claude' : item.actor === 'user' ? 'moi' : 'Orbe'}`))),
  h('div', { class: 'buttons' }, closeButton(), h('button', { class: 'primary' }, 'Enregistrer'))));
}

async function contentDialog(entry) {
  const data = await api('GET', `/api/content/${entry.content}`).catch(err => { toast(err.message, { bad: true }); return null; });
  if (!data) return;
  openDialog(h('h2', {}, entry.text.split('\n')[0]), h('pre', { class: 'content-view' }, data.text),
    h('div', { class: 'buttons' }, closeButton('Fermer')));
  $('dialog').classList.add('wide');
  $('dialog').addEventListener('close', () => $('dialog').classList.remove('wide'), { once: true });
}

async function addEntry(nodeId) {
  const area = $('entry-text');
  const text = area.value.trim();
  if (!text) { area.focus(); return; }
  state.drafts.delete(nodeId);
  area.value = '';
  const done = await run(() => api('POST', `/api/categories/${nodeId}/entries`, { text }));
  if (done) sfx.add();
  if (done) { $('entry-text')?.focus(); toast('Information rangée.'); }
  else state.drafts.set(nodeId, text);
}

function categoriesSection(node, draft) {
  const kids = state.idx.children.get(node.id);
  const input = h('input', {
    id: 'new-category', class: 'text', placeholder: 'Nouvelle catégorie', ariaLabel: 'Nom de la nouvelle catégorie', value: draft, maxLength: 80,
    on: { keydown: e => { if (e.key === 'Enter') { e.preventDefault(); create(); } } },
  });
  const create = async () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const made = await run(() => api('POST', '/api/categories', { name, parent: node.id }));
    if (made) sfx.add();
    if (made) {
      if ($('new-category')) { $('new-category').value = ''; $('new-category').focus(); }
      scene?.pulse(made.id);
      toast(`Catégorie ${name} créée dans ${node.name}.`);
    }
  };
  return h('section', {},
    h('h2', {}, 'Catégories à l’intérieur'),
    kids.length ? h('div', { class: 'chips' }, kids.slice(0, state.kidLimit).map(kid => h('button', {
      class: 'chip', type: 'button', on: { click: () => select(kid.id) },
    }, kid.name, kid.atlas ? h('small', {}, '+') : kid.entries.length ? h('small', {}, String(kid.entries.length)) : null))) : null,
    kids.length > state.kidLimit ? h('button', { class: 'link-btn', 'data-keep': '1', type: 'button', style: 'margin-top:8px', on: { click: () => { state.kidLimit += 200; renderPanel(); } } }, `Afficher plus (${kids.length - state.kidLimit} restants)`) : null,
    h('div', { class: 'inline' }, input, h('button', { class: 'primary', type: 'button', on: { click: create } }, 'Créer')));
}

function linksSection(node) {
  const { idx } = state;
  const removeBtn = link => h('button', {
    class: 'remove', type: 'button', ariaLabel: 'Retirer cette connexion',
    on: { click: () => run(() => api('DELETE', `/api/links/${link.id}`)) },
  }, 'Retirer');
  const go = id => h('button', { class: 'goto', type: 'button', title: pathOf(id), on: { click: () => select(id) } }, idx.byId.get(id).name);
  const note = link => link.note ? h('span', { class: 'note' }, link.note) : null;
  const items = [
    ...idx.out.get(node.id).map(link => h('li', {}, h('span', { class: 'sentence' }, node.name, ' ', h('em', {}, link.fn), ' ', go(link.to), note(link)), removeBtn(link))),
    ...idx.inc.get(node.id).map(link => h('li', {}, h('span', { class: 'sentence' }, go(link.from), ' ', h('em', {}, link.fn), ' ', node.name, note(link)), removeBtn(link))),
  ];
  return h('section', {},
    h('h2', {}, 'Connexions'),
    items.length ? h('ul', { class: 'links' }, items) : h('p', { class: 'empty' }, 'Ce dossier n’est relié à aucun autre pour le moment.'),
    h('button', { class: 'primary', type: 'button', style: 'margin-top:8px', on: { click: () => connectDialog(node) } }, 'Relier à un autre dossier'));
}

function renderLegend() {
  const hint = state.mode === 'focus'
    ? 'Clique sur un dossier pour y entrer. Glisse pour tourner, molette pour zoomer.'
    : 'Clique pour suivre ce qui découle d’un dossier, double-clique pour l’ouvrir.';
  $('legend').replaceChildren(h('i'), 'contient', h('i', { class: 'link' }), 'connexion', h('p', {}, hint));
}

// --- Boîtes de dialogue ---------------------------------------------------------------------

function openDialog(...content) {
  const dialog = $('dialog');
  dialog.replaceChildren(...content.flat().filter(Boolean));
  dialog.showModal();
  return dialog;
}

const closeButton = (label = 'Annuler') => h('button', { class: 'secondary', type: 'button', on: { click: () => $('dialog').close() } }, label);

function renameDialog(node) {
  const input = h('input', { class: 'text', id: 'dlg-name', value: node.name, maxLength: 80 });
  const error = h('p', { class: 'error', role: 'alert' });
  const form = h('form', { on: { submit: async e => {
    e.preventDefault();
    try {
      await api('PATCH', `/api/categories/${node.id}`, { name: input.value });
      $('dialog').close();
      await refresh();
    } catch (err) { error.textContent = err.message; }
  } } },
  h('h2', {}, 'Renommer'), h('label', { htmlFor: 'dlg-name' }, 'Nom'), input, error,
  h('div', { class: 'buttons' }, closeButton(), h('button', { class: 'primary' }, 'Renommer')));
  openDialog(form);
  input.select();
}

function editEntryDialog(entry) {
  const area = h('textarea', { id: 'dlg-text', value: entry.text, rows: 7 });
  const error = h('p', { class: 'error', role: 'alert' });
  openDialog(h('form', { on: { submit: async e => {
    e.preventDefault();
    try {
      await api('PATCH', `/api/entries/${entry.id}`, { text: area.value });
      $('dialog').close();
      await refresh();
    } catch (err) { error.textContent = err.message; }
  } } },
  h('h2', {}, 'Modifier l’information'), area, error,
  h('div', { class: 'buttons' }, closeButton(), h('button', { class: 'primary' }, 'Enregistrer'))));
  area.focus();
}

function confirmDialog(title, text, label, action) {
  openDialog(h('h2', {}, title), h('p', {}, text),
    h('div', { class: 'buttons' }, closeButton(), h('button', {
      class: 'primary danger', type: 'button',
      on: { click: async () => { $('dialog').close(); await run(action); } },
    }, label)));
}

function deleteEntryDialog(entry) {
  confirmDialog('Supprimer cette information ?', entry.text.slice(0, 200), 'Supprimer', () => api('DELETE', `/api/entries/${entry.id}`));
}

function deleteDialog(node) {
  const { idx, graph } = state;
  const removed = new Set([node.id]);
  const walk = id => idx.children.get(id).forEach(c => { removed.add(c.id); walk(c.id); });
  walk(node.id);
  const entries = graph.nodes.filter(n => removed.has(n.id)).reduce((sum, n) => sum + n.entries.length, 0);
  const links = graph.links.filter(l => removed.has(l.from) || removed.has(l.to)).length;
  const parent = node.parentId;
  confirmDialog(`Supprimer ${node.name} ?`,
    `Cela supprime ${removed.size} catégorie${removed.size > 1 ? 's' : ''}, ${entries} information${entries > 1 ? 's' : ''} et ${links} connexion${links > 1 ? 's' : ''}.`,
    'Supprimer', async () => {
      await api('DELETE', `/api/categories/${node.id}`);
      state.selectedId = parent;
    });
}

// Liste filtrable de tous les dossiers, utilisée pour relier et pour déplacer.
function destinationPicker(excluded, onChoose) {
  let chosen = null;
  const list = h('div', { class: 'picks' });
  const input = h('input', { class: 'text', id: 'dlg-search', placeholder: 'Taper un nom de dossier', autocomplete: 'off' });
  const draw = () => {
    const query = normal(input.value.trim());
    const items = state.graph.nodes
      .filter(n => !excluded.has(n.id) && (!query || normal(pathOf(n.id)).includes(query)))
      .sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'fr'))
      .slice(0, 60);
    list.replaceChildren(...items.map(n => h('button', {
      class: 'result', type: 'button', 'aria-pressed': chosen === n.id,
      on: { click: () => { chosen = n.id; draw(); onChoose(n.id); } },
    }, h('b', {}, n.name), h('span', {}, pathOf(n.id)))));
    if (!items.length) list.append(h('p', { class: 'empty', style: 'padding:8px 12px;margin:0' }, 'Aucun dossier ne correspond.'));
  };
  input.addEventListener('input', draw);
  draw();
  return [input, list];
}

function connectDialog(node) {
  let target = null;
  const fnInput = h('input', { class: 'text', id: 'dlg-fn', placeholder: 'finance, inspire, dépend de…', maxLength: 60, list: 'known-fns' });
  const known = [...new Set(state.graph.links.map(l => l.fn))];
  const fns = h('datalist', { id: 'known-fns' }, known.map(fn => h('option', { value: fn })));
  const noteInput = h('input', { class: 'text', id: 'dlg-note', placeholder: 'Facultatif' });
  const error = h('p', { class: 'error', role: 'alert' });
  const submit = h('button', { class: 'primary', disabled: true }, 'Relier');
  const sync = () => { submit.disabled = !target || !fnInput.value.trim(); };
  fnInput.addEventListener('input', sync);
  const [search, list] = destinationPicker(new Set([node.id]), id => { target = id; sync(); });
  openDialog(h('form', { on: { submit: async e => {
    e.preventDefault();
    try {
      await api('POST', '/api/links', { from: node.id, to: target, fn: fnInput.value, note: noteInput.value });
      $('dialog').close();
      await refresh();
      scene?.pulse(target);
      toast(`${node.name} est relié à ${state.idx.byId.get(target).name}.`);
    } catch (err) { error.textContent = err.message; }
  } } },
  h('h2', {}, `Relier ${node.name}`),
  h('label', { htmlFor: 'dlg-search' }, 'Vers quel dossier ?'), search, list,
  h('label', { htmlFor: 'dlg-fn' }, 'Quelle est la fonction de ce lien ?'), fnInput, fns,
  h('label', { htmlFor: 'dlg-note' }, 'Précision'), noteInput, error,
  h('div', { class: 'buttons' }, closeButton(), submit)));
  search.focus();
}

function moveDialog(node) {
  const excluded = new Set([node.id]);
  const walk = id => state.idx.children.get(id).forEach(c => { excluded.add(c.id); walk(c.id); });
  walk(node.id);
  let target = null;
  const error = h('p', { class: 'error', role: 'alert' });
  const submit = h('button', { class: 'primary', disabled: true }, 'Déplacer');
  const [search, list] = destinationPicker(excluded, id => { target = id; submit.disabled = false; });
  openDialog(h('form', { on: { submit: async e => {
    e.preventDefault();
    try {
      await api('PATCH', `/api/categories/${node.id}`, { parent: target });
      $('dialog').close();
      await refresh();
    } catch (err) { error.textContent = err.message; }
  } } },
  h('h2', {}, `Déplacer ${node.name}`), h('label', { htmlFor: 'dlg-search' }, 'Dans quel dossier ?'), search, list, error,
  h('div', { class: 'buttons' }, closeButton(), submit)));
  search.focus();
}

// --- Recherche --------------------------------------------------------------------------------

let searchTimer = null;
function renderSearch() {
  const box = $('search-results');
  const query = normal($('search').value.trim());
  if (!query || !state.graph) { box.hidden = true; return; }
  const results = [];
  for (const node of state.graph.nodes) {
    if (normal(node.name).includes(query)) results.push({ id: node.id, title: node.name, sub: pathOf(node.id) });
    for (const entry of node.entries) {
      if (normal(entry.text).includes(query)) results.push({ id: node.id, title: node.name, sub: entry.text });
    }
  }
  box.replaceChildren(...results.slice(0, 30).map(r => h('button', {
    class: 'result', type: 'button',
    on: { click: () => { select(r.id); $('search').value = ''; box.hidden = true; } },
  }, h('b', {}, r.title), h('span', {}, r.sub))));
  if (!results.length) box.append(h('p', { class: 'empty', style: 'padding:8px 12px;margin:0' }, 'Aucun résultat.'));
  box.hidden = false;
  clearTimeout(searchTimer);
  const typed = $('search').value;
  searchTimer = setTimeout(async () => {
    // Chaque source s'affiche dès qu'elle répond : une source lente ne retarde jamais les autres.
    let mine = [], atlas = [], heard = false;
    const draw = () => {
    const found = atlas.filter(r => normal(r.name) !== query);
    const exact = atlas.filter(r => normal(r.name) === query);
    if ($('search').value !== typed || !(atlas.length || mine.length)) return;
    if (!heard) sfx.found();
    heard = true;
    // Les points déjà ouverts restent en tête : ils ne sont connus que de cette page.
    const onMap = new Set(mine.map(r => r.nodeId || r.id));
    const loaded = results.filter(r => state.idx.byId.get(r.id)?.virtual && !onMap.has(r.id)).slice(0, 15).map(r => h('button', {
      class: 'result', type: 'button',
      on: { click: () => { select(r.id); $('search').value = ''; box.hidden = true; } },
    }, h('b', {}, r.title), h('span', {}, r.sub)));
    const atlasButton = r => h('button', {
      class: 'result', type: 'button',
      on: { click: () => { $('search').value = ''; box.hidden = true; openAtlasResult(r); } },
    }, h('b', {}, r.name), h('span', {}, r.path));
    box.replaceChildren(...exact.map(atlasButton), ...loaded, ...mine.map(r => (r.type === 'fichier' ? h('button', {
      class: 'result', type: 'button', title: 'Montrer ce fichier dans l\u2019Explorateur',
      on: { click: () => api('POST', '/api/files/reveal', { path: r.path }).catch(err => toast(err.message, { bad: true })) },
    }, h('b', {}, r.name), h('span', {}, r.path)) : h('button', {
      class: 'result', type: 'button',
      on: { click: () => { select(r.nodeId || r.id); $('search').value = ''; box.hidden = true; } },
    }, h('b', {}, r.title || r.path.split('/').pop()), h('span', {}, r.text || r.path)))));
    box.append(...found.map(atlasButton));
    };
    fetch(state.base + 'search?q=' + encodeURIComponent(typed)).then(r => (r.ok ? r.json() : [])).catch(() => []).then(list => { mine = list; draw(); });
    fetch('/api/atlas-search?q=' + encodeURIComponent(typed)).then(r => r.json()).catch(() => []).then(list => { atlas = list; draw(); });
  }, 250);
}

// --- Démarrage ----------------------------------------------------------------------------------

function applyInset() {
  const small = innerWidth <= 860;
  scene?.setInset(small
    ? { right: 0, bottom: innerHeight * 0.45, top: $('bar').offsetHeight }
    : { right: $('panel').offsetWidth, bottom: 0, top: 50 });
}

function typing(target) {
  return ['INPUT', 'TEXTAREA'].includes(target.tagName) || $('dialog').open;
}

async function start() {
  const [mode, id] = location.hash.slice(1).split('/');
  if (mode === 'large' || mode === 'focus') state.mode = mode;
  if (id) state.selectedId = id;

  try {
    scene = createScene($('stage'), $('labels'), {
      onPick: picked => select(picked),
      onOpen: picked => select(picked, 'focus'),
      onHover: () => sfx.hover(),
    });
  } catch {
    $('no-webgl').hidden = false;
  }
  applyInset();
  addEventListener('resize', applyInset);

  const soundBtn = $('sound');
  const showSound = () => { soundBtn.textContent = sfx.isOn() ? 'Son : activé' : 'Son : coupé'; soundBtn.setAttribute('aria-pressed', sfx.isOn()); };
  showSound();
  soundBtn.addEventListener('click', () => { sfx.toggle(); showSound(); });
  $('view-focus').addEventListener('click', () => select(state.selectedId, 'focus'));
  $('view-large').addEventListener('click', seeEverything);
  $('back').addEventListener('click', () => history.back());
  $('search').addEventListener('input', renderSearch);
  $('search').addEventListener('keydown', e => {
    if (e.key === 'Escape') { $('search').value = ''; renderSearch(); }
    if (e.key === 'Enter') $('search-results').querySelector('.result')?.click();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search')) $('search-results').hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (typing(e.target)) return;
    if (e.key === '1') select(state.selectedId, 'focus');
    if (e.key === '2') seeEverything();
    if (e.key === '/') { e.preventDefault(); $('search').focus(); }
    if (e.key === 'Escape') {
      const parent = state.idx?.byId.get(state.selectedId)?.parentId;
      if (parent) select(parent);
    }
  });

  // En version publique, site.js choisit l'espace à ouvrir.
  if (await fetch('/api/mode').then(r => r.ok).catch(() => false)) return;
  try {
    await refresh();
  } catch (err) {
    toast(err.message, { bad: true });
  }
  await startHistory();
  listen();
}

function listen() {
  events?.close();
  events = new EventSource(state.base + 'events');
  events.onmessage = () => refresh().catch(() => {});
}

// La version publique bascule ainsi entre la carte commune et l'espace privé de l'utilisateur.
window.orbe = {
  async setSpace(base, readonly) {
    saveDraft();
    Object.assign(state, { base, readonly, rev: 0, selectedId: null, graph: null, idx: null, entryLimit: 50, virtual: [], loaded: new Set() });
    state.drafts.clear();
    await refresh();
    await startHistory();
    listen();
  },
  refresh,
  toast,
  get selectedName() { return state.idx?.byId.get(state.selectedId)?.name; },
  get selectedId() { return state.selectedId; },
};

start();
