// Calculs sur la carte, sans aucun rendu : index, voisins, flux et positions 3D.

export const FOCUS_LIMIT = 120;
export const LARGE_LIMIT = 250;
const COLLATOR = new Intl.Collator('fr');
const PALETTE = ['#F2C14E', '#FF8FA3', '#7FD1FF', '#B6E388', '#C9A7FF', '#FFB26B', '#6FE3C8'];

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function buildIndex(graph) {
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const children = new Map(graph.nodes.map(n => [n.id, []]));
  const out = new Map(graph.nodes.map(n => [n.id, []]));
  const inc = new Map(graph.nodes.map(n => [n.id, []]));
  let root = null;
  for (const n of graph.nodes) {
    if (n.parentId === null) root = n;
    else children.get(n.parentId)?.push(n);
  }
  const startsWithLetter = name => /^\p{L}/u.test(name);
  for (const list of children.values()) list.sort((a, b) => startsWithLetter(b.name) - startsWithLetter(a.name) || COLLATOR.compare(a.name, b.name));
  for (const l of graph.links) { out.get(l.from)?.push(l); inc.get(l.to)?.push(l); }

  const depth = new Map();
  const color = new Map();
  const stack = [[root, 0, root.color || '#F4F1DE']];
  while (stack.length) {
    const [node, d, inherited] = stack.pop();
    depth.set(node.id, d);
    const own = node.color || (d === 1 ? PALETTE[hash(node.id) % PALETTE.length] : inherited);
    color.set(node.id, own);
    for (const child of children.get(node.id)) stack.push([child, d + 1, own]);
  }
  const ancestors = id => {
    const chain = [];
    let cursor = byId.get(byId.get(id)?.parentId);
    while (cursor) { chain.unshift(cursor); cursor = byId.get(cursor.parentId); }
    return chain;
  };
  return { graph, byId, children, out, inc, root, depth, color, ancestors };
}

export function neighbours(idx, id) {
  const node = idx.byId.get(id);
  const parent = node.parentId ? [node.parentId] : [];
  const kids = idx.children.get(id).map(n => n.id);
  const linked = [...idx.out.get(id).map(l => l.to), ...idx.inc.get(id).map(l => l.from)];
  return { parent, kids, linked: [...new Set(linked)].filter(x => !parent.includes(x) && !kids.includes(x)) };
}

// Ce qui découle d'un dossier : ses sous-catégories et ses connexions sortantes, de proche en proche.
export function flowFrom(idx, id) {
  const level = new Map([[id, 0]]);
  const queue = [id];
  const treeEdges = new Set();
  const linkEdges = new Set();
  while (queue.length) {
    const current = queue.shift();
    const visit = target => {
      if (!level.has(target)) { level.set(target, level.get(current) + 1); queue.push(target); }
    };
    for (const child of idx.children.get(current)) { treeEdges.add(child.id); visit(child.id); }
    for (const link of idx.out.get(current)) { linkEdges.add(link.id); visit(link.to); }
  }
  const incoming = new Set(idx.inc.get(id).map(l => l.id));
  const sources = new Set(idx.inc.get(id).map(l => l.from));
  return { level, treeEdges, linkEdges, incoming, sources, ancestors: new Set(idx.ancestors(id).map(n => n.id)) };
}

function direction(id) {
  const h = hash(id);
  const y = ((h & 0xffff) / 0xffff) * 2 - 1;
  const a = ((h >>> 16) / 0xffff) * Math.PI * 2;
  const r = Math.sqrt(1 - y * y);
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

export function layoutLarge(idx, previous, active) {
  const ids = [...active];
  const pos = new Map();
  const place = id => {
    if (pos.has(id)) return;
    const node = idx.byId.get(id);
    if (previous?.has(id)) { pos.set(id, [...previous.get(id)]); return; }
    const d = direction(id);
    const depth = idx.depth.get(id) ?? 2;
    if (node.parentId && active.has(node.parentId)) {
      place(node.parentId);
      const from = pos.get(node.parentId);
      const len = depth === 1 ? 16 : 9;
      pos.set(id, [from[0] + d[0] * len, from[1] + d[1] * len, from[2] + d[2] * len]);
    } else {
      pos.set(id, [d[0] * depth * 12, d[1] * depth * 12, d[2] * depth * 12]);
    }
  };
  ids.forEach(place);
  if (active.has(idx.root.id)) pos.set(idx.root.id, [0, 0, 0]);

  const list = ids.map(id => pos.get(id));
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const n = list.length;
  const budget = Math.floor(6e6 / Math.max(n * n, 1));
  const steps = Math.min(previous && previous.size ? 70 : 280, Math.max(25, budget));
  for (let step = 0; step < steps; step++) {
    const heat = 1 - step / steps;
    const force = list.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = list[i][0] - list[j][0], dy = list[i][1] - list[j][1], dz = list[i][2] - list[j][2];
        const d2 = Math.max(dx * dx + dy * dy + dz * dz, 0.5);
        const f = 130 / d2 / Math.sqrt(d2);
        force[i][0] += dx * f; force[i][1] += dy * f; force[i][2] += dz * f;
        force[j][0] -= dx * f; force[j][1] -= dy * f; force[j][2] -= dz * f;
      }
    }
    const spring = (a, b, rest, k) => {
      const dx = list[b][0] - list[a][0], dy = list[b][1] - list[a][1], dz = list[b][2] - list[a][2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      const f = (d - rest) * k / d;
      force[a][0] += dx * f; force[a][1] += dy * f; force[a][2] += dz * f;
      force[b][0] -= dx * f; force[b][1] -= dy * f; force[b][2] -= dz * f;
    };
    for (const id of ids) {
      const parent = idx.byId.get(id).parentId;
      if (parent && active.has(parent)) spring(indexOf.get(parent), indexOf.get(id), idx.depth.get(id) === 1 ? 17 : 9, 0.09);
    }
    for (const link of idx.graph.links) {
      if (active.has(link.from) && active.has(link.to)) spring(indexOf.get(link.from), indexOf.get(link.to), 26, 0.006);
    }
    for (let i = 0; i < n; i++) {
      if (ids[i] === idx.root.id) continue;
      for (let c = 0; c < 3; c++) list[i][c] += Math.max(-3, Math.min(3, force[i][c])) * (0.25 + heat * 0.75);
    }
  }
  return pos;
}

export function layoutFocus(idx, id) {
  const { parent, kids, linked } = neighbours(idx, id);
  const around = [...linked, ...kids].slice(0, FOCUS_LIMIT);
  const radius = 9 + Math.sqrt(around.length + parent.length) * 1.7;
  const pos = new Map([[id, [0, 0, 0]]]);
  if (parent.length) pos.set(parent[0], [0, radius * 0.92, 0]);
  const golden = Math.PI * (3 - Math.sqrt(5));
  around.forEach((other, i) => {
    const t = around.length === 1 ? 0.5 : i / (around.length - 1);
    const y = parent.length ? 0.45 - t * 1.35 : 0.85 - t * 1.7;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * golden + 0.6;
    pos.set(other, [Math.cos(a) * r * radius * 1.15, y * radius, Math.sin(a) * r * radius * 1.15]);
  });
  return pos;
}
