/**
 * Backup crypto — WebCrypto AES-GCM with PBKDF2 key derivation.
 *
 * No custom algorithm is invented here. The passphrase is never stored; it is
 * used transiently to derive a key in memory. Losing the passphrase means the
 * backup cannot be recovered, which is stated to the user in the UI.
 */

const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedEnvelope {
  app: "ouscap";
  schemaVersion: number;
  encrypted: true;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  cipher: "AES-GCM";
  salt: string;
  iv: string;
  payload: string;
}

export async function encryptJson(
  plaintext: string,
  passphrase: string,
  schemaVersion: number,
): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(plaintext)),
  );
  return {
    app: "ouscap",
    schemaVersion,
    encrypted: true,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    cipher: "AES-GCM",
    salt: toB64(salt),
    iv: toB64(iv),
    payload: toB64(ciphertext),
  };
}

export async function decryptJson(envelope: EncryptedEnvelope, passphrase: string): Promise<string> {
  if (envelope.kdf !== "PBKDF2-SHA256" || envelope.cipher !== "AES-GCM") {
    throw new Error("Unsupported encryption format");
  }
  const salt = fromB64(envelope.salt);
  const iv = fromB64(envelope.iv);
  const key = await deriveKey(passphrase, salt);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      fromB64(envelope.payload) as BufferSource,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Wrong passphrase or corrupted backup");
  }
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as EncryptedEnvelope).encrypted === true &&
    (value as EncryptedEnvelope).app === "ouscap"
  );
}
