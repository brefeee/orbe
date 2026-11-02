// Page « Connecter son IA » : une carte par IA, puis ce qui est réellement possible avec elle.
import { call, getMode, h, noAccount, signIn } from '/compte.js';

const REMOTE = 'Ces applications passent par une adresse https en ligne et demandent souvent une connexion OAuth. Orbe propose pour l’instant une simple clé : ce branchement n’a pas été essayé et peut être refusé.';
const AIS = [
  { id: 'claude', name: 'Claude', by: 'Anthropic', provider: 'anthropic', local: 'claude', keys: 'https://console.anthropic.com/settings/keys', models: 'https://docs.claude.com/fr/docs/about-claude/models/overview' },
  { id: 'chatgpt', name: 'ChatGPT', by: 'OpenAI', provider: 'openai', remote: 'Dans ChatGPT : réglages, connecteurs, mode développeur, puis créer un connecteur. Un abonnement payant peut être demandé.', keys: 'https://platform.openai.com/api-keys', models: 'https://platform.openai.com/docs/models' },
  { id: 'gemini', name: 'Gemini', by: 'Google', provider: 'gemini', local: 'gemini', keys: 'https://aistudio.google.com/apikey', models: 'https://ai.google.dev/gemini-api/docs/models' },
  { id: 'deepseek', name: 'DeepSeek', by: 'DeepSeek', provider: 'deepseek', keys: 'https://platform.deepseek.com/api_keys', models: 'https://api-docs.deepseek.com/' },
  { id: 'grok', name: 'Grok', by: 'xAI', provider: 'xai', remote: 'Sur grok.com/connectors, ajoute un connecteur. Un abonnement payant peut être demandé.', keys: 'https://console.x.ai/', models: 'https://docs.x.ai/docs/models' },
  { id: 'mistral', name: 'Le Chat', by: 'Mistral', provider: 'mistral', remote: 'Dans Le Chat : connecteurs, ajouter un connecteur, onglet MCP personnalisé.', keys: 'https://console.mistral.ai/api-keys', models: 'https://docs.mistral.ai/getting-started/models/' },
  { id: 'perplexity', name: 'Perplexity', by: 'Perplexity', provider: 'perplexity', keys: 'https://www.perplexity.ai/settings/api', models: 'https://docs.perplexity.ai/' },
  { id: 'copilot', name: 'Copilot', by: 'Microsoft' },
  { id: 'meta', name: 'Meta AI', by: 'Meta' },
];

const page = document.getElementById('ai-page');
const dialog = document.getElementById('dialog');
const mode = await getMode();
const links = (url, label) => h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, label);
const copyBlock = text => [h('pre', {}, text), h('button', { class: 'link-btn', type: 'button', on: { click: async e => { await navigator.clipboard.writeText(text); e.target.textContent = 'Copié'; } } }, 'Copier')];
const login = () => (mode ? signIn(dialog, draw) : noAccount(dialog));

async function loadKeys() {
  if (!mode?.user) return { keys: [] };
  // Recharge l'état du compte : on vient peut-être de se connecter.
  return call('GET', '/api/me/ai').catch(() => ({ keys: [] }));
}

function statusOf(ai, keys) {
  if (!mode) return ai.provider || ai.local ? 'À configurer' : 'Non disponible';
  if (!ai.provider) return 'Non disponible';
  const key = keys.find(k => k.provider === ai.provider);
  if (!key) return 'Pas connectée';
  if (!key.lastTest) return 'Clé enregistrée, pas testée';
  return key.lastTest.ok ? 'A bien répondu au test' : 'Le test a échoué';
}

function drawList(keys) {
  page.replaceChildren(h('h1', {}, 'Connecter son IA'),
    h('p', { class: 'lead' }, 'Choisis ton IA. Orbe t’indique ce qu’elle peut faire ici, et ce qui n’est pas possible.'),
    h('div', { class: 'ai-grid' }, AIS.map(ai => h('a', { class: 'ai-card', href: `#${ai.id}` },
      h('span', { class: 'ai-mark', ariaHidden: 'true' }, ai.name[0]),
      h('strong', {}, ai.name), h('small', {}, ai.by),
      h('span', { class: 'ai-state' }, statusOf(ai, keys))))),
    h('h2', {}, 'Ton IA n’est pas dans la liste ?'),
    h('p', {}, 'Toute application compatible avec le protocole MCP peut utiliser le serveur d’Orbe. Suis les étapes de ',
      h('a', { href: '#claude' }, 'la page Claude'), ' et adapte-les aux réglages de ton application.'),
    h('div', { id: 'relay' }));
  if (!mode) drawRelay();
}

// Répartition des tâches (version installée) : l'utilisateur choisit quelle IA fait quoi.
async function drawRelay() {
  const box = document.getElementById('relay');
  if (!box) return;
  const data = await call('GET', '/api/relay').catch(() => null);
  if (!data) return;
  const save = async body => { try { await call('POST', '/api/relay/config', body); drawRelay(); } catch (x) { error.textContent = x.message; } };
  const error = h('p', { class: 'error', role: 'alert' });
  const usable = data.providers.filter(p => p.hasKey && p.model);
  const accounts = data.providers.map(p => {
    const key = h('input', { class: 'text', type: 'password', autocomplete: 'off', ariaLabel: `Clé d’API de ${p.name}`, placeholder: p.hasKey ? 'Clé enregistrée' : 'Clé d’API' });
    const model = h('input', { class: 'text', value: p.model, ariaLabel: `Modèle de ${p.name}`, placeholder: 'Nom exact du modèle' });
    const image = p.canImage ? h('input', { class: 'text', value: p.imageModel, ariaLabel: `Modèle d’image de ${p.name}`, placeholder: 'Modèle d’image' }) : null;
    return h('div', { class: 'ai-key' }, h('strong', {}, p.name), ' ', key, ' ', model, ' ', image, ' ',
      h('button', { class: 'link-btn', type: 'button', on: { click: () => save({ accounts: { [p.id]: { key: key.value, model: model.value, ...(image ? { imageModel: image.value } : {}) } } }) } }, 'Enregistrer'), ' ',
      p.hasKey ? h('button', { class: 'link-btn danger', type: 'button', on: { click: () => save({ accounts: { [p.id]: { remove: true } } }) } }, 'Retirer la clé') : null);
  });
  const roles = Object.entries(data.labels).map(([role, label]) => {
    const choices = usable.filter(p => role !== 'image' || p.canImage);
    return h('p', {}, h('label', {}, `${label} : `, h('select', { value: data.roles[role] || '', on: { change: e => save({ roles: { [role]: e.target.value } }) } },
      h('option', { value: '', selected: !data.roles[role] }, role === 'executer' ? 'À choisir' : 'Personne'),
      choices.map(p => h('option', { value: p.id, selected: data.roles[role] === p.id }, p.name)))));
  });
  const task = h('textarea', { class: 'text', rows: 4, ariaLabel: 'Ta demande', placeholder: 'Ta demande' });
  const result = h('div', { role: 'status' });
  const start = async () => {
    error.textContent = '';
    result.textContent = 'Les IA travaillent. Ces demandes sont facturées sur tes clés.';
    try {
      const { steps } = await call('POST', '/api/relay/run', { task: task.value });
      result.replaceChildren(...steps.map(s => h('section', {}, h('h3', {}, `${data.labels[s.role]} : ${s.ai}`), h('p', { style: 'white-space:pre-wrap' }, s.text), s.image ? h('img', { src: s.image, alt: s.text, style: 'max-width:100%' }) : null)));
    } catch (x) { result.textContent = ''; error.textContent = x.message; }
  };
  box.replaceChildren(h('h2', {}, 'Faire travailler tes IA ensemble'),
    h('p', {}, 'Une IA peut reformuler ta demande en vrai prompt, une autre faire le travail, une autre créer les images. Orbe utilise les clés d’API que tu ajoutes ici : elles restent dans ta base chiffrée, et chaque service peut te facturer ses demandes.'),
    h('p', {}, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: data.enabled, on: { change: e => save({ enabled: e.target.checked }) } }), ' Activer la répartition des tâches')),
    h('h3', {}, 'Tes clés'), ...accounts,
    h('h3', {}, 'Quelle IA fait quoi'), ...roles,
    h('button', { type: 'button', on: { click: async () => { await call('POST', '/api/relay/suggest', {}); drawRelay(); } } }, 'Répartition suggérée'),
    error,
    data.enabled ? h('div', {}, h('h3', {}, 'Lancer une demande'), task, h('p', {}, h('button', { class: 'primary', type: 'button', on: { click: start } }, 'Lancer')), result) : null);
}

async function mapSection(ai) {
  const out = [h('h2', {}, 'Lui donner accès à ta carte'), h('p', {}, 'Elle pourra lire ta carte privée et y ranger des informations. Ne le fais qu’avec une IA en qui tu as confiance.')];
  if (ai.local && !mode) {
    const info = await call('GET', '/api/connection').catch(() => null);
    if (!info) return [...out, h('p', { class: 'error' }, 'Le serveur d’Orbe ne répond pas.')];
    if (ai.local === 'claude') {
      out.push(h('h3', {}, 'Claude Code : lance cette commande dans un terminal'), ...copyBlock(info.code),
        h('h3', {}, 'Claude Desktop : ajoute ceci à claude_desktop_config.json'),
        h('p', { class: 'tip' }, 'Réglages, Développeur, Modifier la configuration, puis redémarre Claude. Fusionne avec tes autres serveurs si le fichier en contient déjà.'), ...copyBlock(info.desktop));
    } else {
      out.push(h('p', {}, 'Cela marche avec Gemini CLI, le programme pour terminal, et non avec le site gemini.google.com. Ce branchement suit la documentation de Gemini CLI, mais il n’a pas été essayé.'),
        h('h3', {}, 'Ajoute ceci à ~/.gemini/settings.json'), ...copyBlock(info.desktop));
    }
    out.push(h('p', { class: 'tip' }, 'Pour vérifier : demande à ton IA de lister les dossiers d’Orbe. Si elle y arrive, c’est branché. Orbe ne peut pas le voir tout seul depuis cette page.'));
    return out;
  }
  if (!ai.local && !ai.remote) return [...out.slice(0, 1), h('p', {}, ai.provider
    ? `Je n’ai pas trouvé de moyen officiel de brancher ${ai.name} à une carte externe. Seule la vérification ci-dessous est possible.`
    : `Je n’ai pas trouvé de moyen fiable de brancher ${ai.name} à Orbe.`)];
  if (!mode) return [...out, h('p', {}, ai.remote), h('p', {}, `${REMOTE} Il faut d’abord qu’Orbe public soit en ligne : ce n’est pas encore le cas, donc ce n’est pas possible aujourd’hui.`)];
  if (!mode.user) return [...out, h('button', { class: 'primary', type: 'button', on: { click: login } }, 'Se connecter pour continuer')];
  const token = h('div');
  out.push(h('p', {}, ai.remote || 'Utilise l’adresse et la clé ci-dessous dans les réglages MCP de ton application.'), h('p', { class: 'tip' }, REMOTE),
    h('h3', {}, 'Adresse du serveur'), ...copyBlock(`${location.origin}/mcp`), token,
    h('button', { class: 'primary', type: 'button', on: { click: async () => {
      const res = await call('POST', '/api/me/api-token', {});
      token.replaceChildren(h('h3', {}, 'Ta clé, affichée une seule fois (en-tête Authorization: Bearer)'), ...copyBlock(res.token));
    } } }, 'Créer une clé d’accès'), h('p', { class: 'tip' }, 'Créer une nouvelle clé désactive l’ancienne.'));
  return out;
}

function verifySection(ai, info) {
  if (!ai.provider) return [];
  const out = [h('h2', {}, 'Lui faire vérifier les informations'),
    h('p', {}, `Quand une information est proposée pour la carte publique, ${ai.name} reçoit 3 demandes pour donner son avis. Une personne décide toujours de la publication, car une IA peut se tromper.`),
    h('p', { class: 'tip' }, 'Il faut une clé d’API, différente d’un abonnement : chaque demande est facturée sur ton compte chez ce service. Utilise une clé dédiée, avec une limite de dépense. Le texte proposé est envoyé à ce service.')];
  if (!mode) return [...out, h('p', {}, 'Cette partie demande un compte, donc la version publique. Elle n’existe pas dans la version installée sur ton PC.')];
  if (!mode.user) return [...out, h('button', { class: 'primary', type: 'button', on: { click: login } }, 'Se connecter pour ajouter une clé')];
  const current = info.keys.find(k => k.provider === ai.provider);
  if (current) {
    const result = h('p', { role: 'status' }, current.lastTest ? `Dernier test : ${current.lastTest.detail}` : 'Clé enregistrée, mais jamais testée.');
    out.push(h('div', { class: 'ai-key' }, h('p', {}, `Modèle ${current.model}. ${current.shared ? 'Partagée avec les autres utilisateurs' : 'Pour tes propositions seulement'}. ${current.used} demandes sur ${current.daily} aujourd’hui.`), result,
      h('button', { class: 'primary', type: 'button', on: { click: async e => {
        e.target.disabled = true;
        result.textContent = 'Test en cours : une vraie demande, facturée sur ta clé.';
        try { await call('POST', `/api/me/ai/${current.id}/test`, {}); draw(); } catch (x) { result.textContent = x.message; e.target.disabled = false; }
      } } }, 'Tester avec une vraie demande'), ' ',
      h('button', { class: 'link-btn danger', type: 'button', on: { click: async () => { await call('DELETE', `/api/me/ai/${current.id}`); draw(); } } }, 'Retirer la clé')));
    return out;
  }
  const key = h('input', { class: 'text', id: 'k-key', type: 'password', autocomplete: 'off', required: true });
  const model = h('input', { class: 'text', id: 'k-model', required: ai.provider !== 'anthropic', placeholder: ai.provider === 'anthropic' ? 'Facultatif' : 'Nom exact du modèle' });
  const daily = h('input', { class: 'text', id: 'k-daily', type: 'number', min: 3, max: 300, value: 30 });
  const shared = h('input', { type: 'checkbox', id: 'k-shared' });
  const err = h('p', { class: 'error', role: 'alert' });
  out.push(h('form', { class: 'ai-form', on: { submit: async e => {
    e.preventDefault();
    err.textContent = '';
    try {
      await call('POST', '/api/me/ai', { provider: ai.provider, key: key.value, model: model.value, daily: daily.value, shared: shared.checked });
      draw();
    } catch (x) { err.textContent = x.message; }
  } } },
  h('p', {}, links(ai.keys, 'Créer une clé chez ce service'), ' · ', links(ai.models, 'Voir les noms de modèles')),
  h('label', { htmlFor: 'k-key' }, 'Clé d’API'), key, h('label', { htmlFor: 'k-model' }, 'Modèle'), model,
  h('label', { htmlFor: 'k-daily' }, 'Demandes maximum par jour'), daily,
  h('label', { class: 'check' }, shared, h('span', {}, 'Utiliser aussi ma clé pour les propositions des autres, à mes frais')), err,
  h('button', { class: 'primary' }, 'Enregistrer la clé')));
  return out;
}

async function draw() {
  const fresh = await getMode();
  if (mode && fresh) Object.assign(mode, fresh);
  const info = await loadKeys();
  const ai = AIS.find(a => a.id === location.hash.slice(1));
  if (!ai) { drawList(info.keys); return; }
  const map = await mapSection(ai);
  page.replaceChildren(h('a', { class: 'top-link', href: '#' }, '← Toutes les IA'),
    h('h1', {}, ai.name), h('p', { class: 'ai-now' }, statusOf(ai, info.keys)), ...map, ...verifySection(ai, info));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', draw);
await draw();
