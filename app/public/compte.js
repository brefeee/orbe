// Outils communs aux pages : création d'éléments, appels au serveur et connexion par e-mail et code.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'on') for (const [ev, fn] of Object.entries(value)) el.addEventListener(ev, fn);
    else if (key === 'class') el.className = value;
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter(c => c !== null && c !== undefined && c !== false));
  return el;
}

export async function call(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Le serveur ne répond pas.');
  return data;
}

// La version installée sur le PC n'a pas de compte : /api/mode n'y existe pas.
export const getMode = () => fetch('/api/mode').then(r => (r.ok ? r.json() : null)).catch(() => null);

export function signIn(dialog, onDone) {
  const show = (...content) => { dialog.replaceChildren(...content); dialog.showModal(); };
  const cancel = () => h('button', { class: 'secondary', type: 'button', on: { click: () => dialog.close() } }, 'Annuler');
  const failed = (err, x) => { err.textContent = x.message; err.scrollIntoView({ block: 'center' }); };

  function askCode(address, test) {
    const code = h('input', { class: 'text', id: 'a-code', inputMode: 'numeric', autocomplete: 'one-time-code', maxLength: 6, required: true });
    const err = h('p', { class: 'error', role: 'alert' });
    const check = async e => {
      e.preventDefault();
      err.textContent = '';
      try {
        await call('POST', '/api/auth/verify', { email: address, code: code.value });
        dialog.close();
        onDone();
      } catch (x) { failed(err, x); }
    };
    show(h('form', { on: { submit: check } }, h('h2', {}, 'Entre ton code'),
      h('p', {}, test ? 'Mode test : aucun e-mail n’est envoyé. Le code est affiché dans la fenêtre noire du programme.' : `Un code à 6 chiffres a été envoyé à ${address}. Il expire dans 10 minutes.`),
      h('label', { htmlFor: 'a-code' }, 'Code'), code, err,
      h('div', { class: 'buttons' }, h('button', { class: 'secondary', type: 'button', on: { click: askEmail } }, 'Changer d’adresse'), h('button', { class: 'primary' }, 'Valider'))));
    code.focus();
  }

  function askEmail() {
    const email = h('input', { class: 'text', id: 'a-email', type: 'email', autocomplete: 'email', required: true });
    const err = h('p', { class: 'error', role: 'alert' });
    const send = async e => {
      e.preventDefault();
      err.textContent = '';
      try {
        const res = await call('POST', '/api/auth/code', { email: email.value });
        askCode(email.value, res.test);
      } catch (x) { failed(err, x); }
    };
    show(h('form', { on: { submit: send } }, h('h2', {}, 'Se connecter'),
      h('p', {}, 'Entre ton adresse e-mail : tu reçois un code, sans mot de passe. Le compte se crée à la première connexion. Ton espace reste privé, et tu peux tout exporter ou supprimer.'),
      h('label', { htmlFor: 'a-email' }, 'Adresse e-mail'), email, err,
      h('div', { class: 'buttons' }, cancel(), h('button', { class: 'primary' }, 'Recevoir un code'))));
    email.focus();
  }

  askEmail();
}

// Dans la version installée, dire la vérité plutôt que d'afficher un faux formulaire.
export function noAccount(dialog) {
  dialog.replaceChildren(h('h2', {}, 'Pas de compte ici'),
    h('p', {}, 'Cette version tourne uniquement sur ton PC : elle n’a pas besoin de compte, et tes données restent chez toi.'),
    h('p', {}, 'La connexion par e-mail et code existe sur la version publique, qui n’est pas encore en ligne. On peut l’essayer sur ce PC avec « Lancer Orbe public ».'),
    h('div', { class: 'buttons' }, h('button', { class: 'secondary', type: 'button', on: { click: () => dialog.close() } }, 'Fermer'), h('a', { class: 'primary', href: '/carte' }, 'Ouvrir Orbe')));
  dialog.showModal();
}
