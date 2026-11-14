import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const newId = (): string => randomBytes(12).toString('base64url');
export const newToken = (): string => randomBytes(32).toString('base64url');
export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
export const now = (): number => Date.now();

const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((ok, ko) => scrypt(password.normalize('NFKC'), salt, 32, SCRYPT, (err, key) => (err ? ko(err) : ok(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await derive(password, salt)).toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [kind, salt, hash] = (stored ?? '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) {
    await derive(password, Buffer.alloc(16)); // même durée que le compte existe ou non
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  const got = await derive(password, Buffer.from(salt, 'base64'));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Chiffre un secret (AES-256-GCM). Le résultat peut être stocké en base ; la clé maîtresse reste hors base. */
export function seal(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function unseal(key: Buffer, sealed: string): string {
  const [version, iv, tag, body] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || body === undefined) throw new Error('Secret illisible.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}
