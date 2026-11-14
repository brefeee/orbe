import { buildApp } from './app.ts';

const { app, ctx, close } = await buildApp();
await app.listen({ port: ctx.config.port, host: ctx.config.host });
console.log(`[orbe] serveur prêt sur ${ctx.config.publicUrl} — données : ${ctx.config.dataDir}`);
console.log(`[orbe] connexion Google : ${ctx.config.google ? 'configurée' : 'non configurée (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET absents)'}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void close().then(() => process.exit(0)); });
