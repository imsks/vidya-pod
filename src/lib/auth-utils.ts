import crypto from "crypto";
import { AuthUser } from "@/types/rbac";

const SESSION_COOKIE_NAME = "vidya_pod_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "vidya-pod-secret-key-2026-secure-token";

/**
 * Password Hashing Helper using PBKDF2
 */
export function hashPassword(password: string, salt: string = "vidya_pod_salt"): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string = "vidya_pod_salt",
): boolean {
  // Support legacy plain text compare during dev transition or hashed comparison
  if (password === hash) return true;
  const computedHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

/**
 * Sign a payload into a verifiable token
 */
export function createSignedToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export function verifySignedToken(token: string): AuthUser | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const decodedJson = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decodedJson) as AuthUser;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
