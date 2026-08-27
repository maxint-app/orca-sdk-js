import type { CustomerEntitlements } from "./types.js";

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function bytesFromBase64(value: string): Uint8Array {
  if (typeof atob === "function") {
    const decoded = atob(value);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  }

  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  throw new Error("No base64 decoder is available in this runtime");
}

function pemToDerBytes(publicKeyPem: string): Uint8Array {
  const normalized = publicKeyPem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  return bytesFromBase64(normalized);
}

function ensureSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API is not available in this runtime");
  }
  return subtle;
}

function toBytes(payload: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof payload === "string") {
    return new TextEncoder().encode(payload);
  }
  if (payload instanceof Uint8Array) {
    return payload;
  }
  return new Uint8Array(payload);
}

export async function constructWebhookEvent({
  webhookPublicKey,
  rawPayload,
  signatureHeader,
  timestampHeader,
}: {
  webhookPublicKey: string;
  rawPayload: string | Uint8Array | ArrayBuffer;
  signatureHeader: string;
  timestampHeader: string;
}): Promise<CustomerEntitlements> {
  const timestampDate = new Date(timestampHeader);
  if (Number.isNaN(timestampDate.getTime())) {
    throw new Error("Invalid timestamp header");
  }

  const ageMs = Math.abs(Date.now() - timestampDate.getTime());
  if (ageMs > FIVE_MINUTES_IN_MS) {
    throw new Error("Timestamp is outside the 5-minute window");
  }

  const payloadBytes = toBytes(rawPayload);
  const timestampBytes = new TextEncoder().encode(timestampHeader);
  const signedBytes = new Uint8Array(
    timestampBytes.length + 1 + payloadBytes.length
  );
  signedBytes.set(timestampBytes, 0);
  signedBytes[timestampBytes.length] = ".".charCodeAt(0);
  signedBytes.set(payloadBytes, timestampBytes.length + 1);

  const subtle = ensureSubtleCrypto();
  const keyData = pemToDerBytes(webhookPublicKey);
  const signature = bytesFromBase64(signatureHeader);

  const key = await subtle.importKey(
    "spki",
    toArrayBuffer(keyData),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const isValid = await subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    toArrayBuffer(signature),
    toArrayBuffer(signedBytes)
  );

  if (!isValid) {
    throw new Error("Signature verification failed");
  }

  const payloadText = new TextDecoder().decode(payloadBytes);
  return JSON.parse(payloadText) as CustomerEntitlements;
}
