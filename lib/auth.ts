import { SignJWT, jwtVerify } from "jose";

const RAW_SECRET = process.env.JWT_SECRET ?? "splitbase-dev-secret-change-in-production";
const secret = new TextEncoder().encode(RAW_SECRET);

export const JWT_EXPIRY = "24h";

/** Issue a signed JWT for a verified wallet address */
export async function signJWT(address: string): Promise<string> {
  return new SignJWT({ address: address.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

/** Verify a JWT and return the wallet address, or null if invalid */
export async function verifyJWT(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.address as string) ?? null;
  } catch {
    return null;
  }
}


export function generateNonce(address: string): string {
  const bucket = Math.floor(Date.now() / 120_000);
  return `${address.toLowerCase()}-${bucket}`;
}


export function buildSignMessage(address: string): string {
  const nonce = generateNonce(address);
  return `Sign in to SplitBase\n\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}`;
}

/**
 * Verify that the provided nonce matches the current or previous time window
 * (gives up to ~3 min validity to handle clock skew and UX delay).
 */
export function isNonceValid(address: string, nonce: string): boolean {
  const bucket = Math.floor(Date.now() / 120_000);
  const valid = [
    `${address.toLowerCase()}-${bucket}`,
    `${address.toLowerCase()}-${bucket - 1}`,
  ];
  return valid.includes(nonce);
}
