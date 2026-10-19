import { describe, expect, it } from "vitest";
import { encryptJson, decryptJson, isEncryptedEnvelope } from "@/data/crypto";

const SCHEMA = 1;

describe("encrypted backups (WebCrypto AES-GCM)", () => {
  it("encrypts and decrypts with the correct passphrase", async () => {
    const secret = JSON.stringify({ hello: "world", amount: 1234 });
    const envelope = await encryptJson(secret, "correct horse battery", SCHEMA);
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(envelope.payload).not.toContain("world");

    const decrypted = await decryptJson(envelope, "correct horse battery");
    expect(decrypted).toBe(secret);
  });

  it("fails to decrypt with the wrong passphrase", async () => {
    const envelope = await encryptJson("sensitive", "right-passphrase", SCHEMA);
    await expect(decryptJson(envelope, "wrong-passphrase")).rejects.toThrow(/Wrong passphrase/);
  });

  it("never stores the passphrase in the envelope", async () => {
    const envelope = await encryptJson("data", "my-secret-passphrase", SCHEMA);
    expect(JSON.stringify(envelope)).not.toContain("my-secret-passphrase");
  });

  it("uses a fresh IV each time so identical plaintext differs", async () => {
    const a = await encryptJson("same", "passphrase-1", SCHEMA);
    const b = await encryptJson("same", "passphrase-1", SCHEMA);
    expect(a.payload).not.toBe(b.payload);
    expect(a.salt).not.toBe(b.salt);
  });
});
