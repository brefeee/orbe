import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ctx } from '../../context.ts';
import { notFound } from '../../errors.ts';
import { LOCALES, TERMS_VERSION } from './users.ts';

const LEGAL = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'legal');
const DOCS = ['terms', 'privacy', 'license'] as const;

export function registerLegal(ctx: Ctx): void {
  // Consultable sans compte : c'est ce qu'un visiteur peut lire avant d'accepter.
  ctx.app.get('/api/legal/:doc', async req => {
    const { doc } = req.params as { doc: string };
    const lang = (req.query as { lang?: string }).lang ?? 'fr';
    if (!DOCS.includes(doc as (typeof DOCS)[number])) throw notFound();
    const locale = (LOCALES as readonly string[]).includes(lang) ? lang : 'fr';
    let file = join(LEGAL, `${doc}.${locale}.md`);
    let served = locale;
    if (!existsSync(file)) { file = join(LEGAL, `${doc}.fr.md`); served = 'fr'; }
    return { doc, lang: served, version: TERMS_VERSION, markdown: readFileSync(file, 'utf8') };
  });
}
