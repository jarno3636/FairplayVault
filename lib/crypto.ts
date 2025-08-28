export async function deriveKey(passphrase: string, salt: Uint8Array) {
  const enc = new TextEncoder().encode(passphrase);
  const keyMaterial = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}
export async function encryptText(passphrase: string, plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encText = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encText);
  const out = new Uint8Array(16+12+ct.byteLength);
  out.set(salt,0); out.set(iv,16); out.set(new Uint8Array(ct),28);
  return '0x' + Array.from(out).map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function decryptText(passphrase: string, payloadHex: `0x${string}`): Promise<string> {
  const buf = Uint8Array.from(payloadHex.slice(2).match(/.{1,2}/g)!.map(b=>parseInt(b,16)));
  const salt = buf.slice(0,16);
  const iv = buf.slice(16,28);
  const ct = buf.slice(28);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
