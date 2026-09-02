import crypto from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  // Free fallback: if ENCRYPTION_KEY not set (e.g. Vercel without env), use AUTH_SECRET or dev key
  // This allows Vercel deploy to work out-of-the-box without manual env
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET || "dev-encryption-key-32-chars-free-mode";
  if (!secret) throw new Error("ENCRYPTION_KEY is not set");
  if (!process.env.ENCRYPTION_KEY) {
    // Warn once in dev
    console.warn("[crypto] ENCRYPTION_KEY not set — using fallback dev key (free mode). Set ENCRYPTION_KEY in .env for production.");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv:tag:ciphertext all base64
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || encB64 === undefined) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export function safeDecrypt(payload: string): string | null {
  try {
    return decrypt(payload);
  } catch {
    return null;
  }
}
