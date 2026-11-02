// Page explicative d'un point de la carte publique : l'article Wikipédia est lu en direct, nettoyé et sourcé.
const API = 'https://fr.wikipedia.org/api/rest_v1/page/';
const WIKI = 'https://fr.wikipedia.org/wiki/';
const ALLOWED = new Set(['SECTION', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD', 'B', 'STRONG', 'I', 'EM', 'SUB', 'SUP', 'SMALL', 'A', 'SPAN', 'DIV',
  'BR', 'HR', 'BLOCKQUOTE', 'FIGURE', 'FIGCAPTION', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'CAPTION', 'ABBR', 'CITE', 'CODE', 'PRE', 'Q']);
const DROP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'BASE', 'NOSCRIPT', 'SVG', 'MATH', 'AUDIO', 'VIDEO', 'SOURCE']);
const NOISE = '.navbox, .mw-editsection, .metadata, .noprint, .bandeau-portail, .autres-projets, .mw-empty-elt, .reference, .mw-references-wrap, .references';
const cache = new Map();

function cleanUrl(value) {
  if (!value) return null;
  if (value.startsWith('./')) return WIKI + value.slice(2);
  if (value.startsWith('//')) value = 'https:' + value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

// Le contenu reste une donnée extérieure : seules les balises et adresses sûres passent.
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(NOISE).forEach(el => el.remove());
  const walk = parent => {
    for (const el of [...parent.children]) {
      if (DROP.has(el.tagName)) { el.remove(); continue; }
      walk(el);
      if (!ALLOWED.has(el.tagName)) { el.replaceWith(...el.childNodes); continue; }
      const attrs = {};
      if (el.tagName === 'A') {
        const href = cleanUrl(el.getAttribute('href'));
        if (href) { attrs.href = href; attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
      }
      if (el.tagName === 'IMG') {
        const src = cleanUrl(el.getAttribute('src'));
        if (!src || new URL(src).hostname !== 'upload.wikimedia.org') { el.remove(); continue; }
        attrs.src = src;
        attrs.alt = el.getAttribute('alt') || '';
        attrs.loading = 'lazy';
        attrs.referrerpolicy = 'no-referrer';
      }
      for (const name of ['colspan', 'rowspan']) if (/^\d+$/.test(el.getAttribute(name) || '')) attrs[name] = el.getAttribute(name);
      for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
      for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    }
  };
  walk(doc.body);
  return doc.body;
}

function titleFromUrl(url) {
  const marker = '/wiki/';
  const at = url.indexOf(marker);
  return at < 0 ? null : decodeURIComponent(url.slice(at + marker.length)).replaceAll('_', ' ');
}

async function fetchPage(title) {
  const encoded = encodeURIComponent(title.replaceAll(' ', '_'));
  const summary = await fetch(API + 'summary/' + encoded);
  if (summary.status === 404) return { kind: 'missing', title };
  if (!summary.ok) throw new Error('Wikipédia ne répond pas.');
  const info = await summary.json();
  const url = info.content_urls?.desktop?.page || WIKI + encoded;
  if (info.type === 'disambiguation') return { kind: 'ambiguous', title: info.title, url };
  const page = await fetch(API + 'html/' + encoded);
  if (!page.ok) throw new Error('Wikipédia ne répond pas.');
  return { kind: 'article', title: info.title, url, html: await page.text() };
}

// Cherche le titre exact donné par la fiche, sinon le nom du point.
export function articleTitle(node) {
  for (const entry of node.entries || []) {
    const match = /^(?:Wikipédia|Article) : (https:\/\/fr\.wikipedia\.org\/wiki\/\S+)/.exec(entry.text);
    if (match) return titleFromUrl(match[1]);
  }
  // Catalogue de la NASA : « 1 Ceres (A801 AA) » devient « Ceres ».
  const body = /^\d+ (\p{L}[^(]*?) \(/u.exec(node.name);
  return body ? body[1] : node.name;
}

function element(tag, props = {}, ...children) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children.filter(Boolean));
  return el;
}

function sourcesBlock(result, dataSources) {
  const items = [];
  if (result?.url) {
    items.push(element('li', {}, 'Texte et images : ', element('a', { href: result.url, target: '_blank', rel: 'noopener noreferrer', textContent: `Wikipédia, « ${result.title} »` }),
      ', licence ', element('a', { href: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr', target: '_blank', rel: 'noopener noreferrer', textContent: 'CC BY-SA 4.0' }), '. ',
      element('a', { href: result.url + '?action=history', target: '_blank', rel: 'noopener noreferrer', textContent: 'Auteurs et historique' }), '.'));
  }
  for (const source of dataSources) items.push(element('li', { textContent: source }));
  if (!items.length) return '';
  return element('footer', { className: 'article-sources' }, element('h3', { textContent: 'Sources' }), element('ul', {}, ...items));
}

export async function renderArticle(host, node, dataSources) {
  // Un lieu ou un mot de catalogue peut porter le nom d'un autre sujet : on n'ouvre pas une page au hasard.
  if ((node.entries || []).some(e => /^(GeoNames|Wiktionnaire|Wikispecies) : /.test(e.text))) {
    host.replaceChildren(element('p', { className: 'empty', textContent: 'Ce point vient d’un catalogue, sans article Wikipédia associé avec certitude. Ses informations sont juste en dessous.' }), sourcesBlock(null, dataSources));
    return;
  }
  const title = articleTitle(node);
  host.replaceChildren(element('p', { className: 'tip', textContent: 'Chargement de la page…' }));
  let result;
  try {
    result = cache.get(title) || await fetchPage(title);
    cache.set(title, result);
  } catch {
    host.replaceChildren(element('p', { className: 'empty', textContent: 'Impossible de charger la page : vérifie ta connexion internet.' }), sourcesBlock(null, dataSources));
    return;
  }
  if (!host.isConnected) return;
  if (result.kind === 'missing') {
    host.replaceChildren(element('p', { className: 'empty', textContent: `Aucune page Wikipédia en français ne porte le nom « ${title} ». Cette fiche contient seulement les données du catalogue.` }), sourcesBlock(null, dataSources));
  } else if (result.kind === 'ambiguous') {
    host.replaceChildren(element('p', { className: 'empty' }, `« ${result.title} » désigne plusieurs sujets, et Orbe ne choisit pas au hasard. `,
      element('a', { href: result.url, target: '_blank', rel: 'noopener noreferrer', textContent: 'Voir la liste sur Wikipédia' }), '.'), sourcesBlock(null, dataSources));
  } else {
    const article = element('div', { className: 'article-body' });
    article.append(...sanitize(result.html).childNodes);
    host.replaceChildren(article, sourcesBlock(result, dataSources));
  }
}
