import { generateKeyPairSync, sign } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

export const authenticationPublicKey = publicKey;

export function createSessionToken({
  authorizedParty = 'http://localhost:3000',
  expiresAt = Math.floor(Date.now() / 1000) + 60,
  userId = 'user_verified',
}: {
  authorizedParty?: string;
  expiresAt?: number;
  userId?: string;
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      azp: authorizedParty,
      exp: expiresAt,
      iat: now,
      iss: 'https://test.clerk.accounts.dev',
      nbf: now - 1,
      sid: 'sess_test',
      sub: userId,
    }),
  ).toString('base64url');
  const unsignedToken = `${header}.${payload}`;
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(unsignedToken),
    privateKey,
  ).toString('base64url');

  return `${unsignedToken}.${signature}`;
}
