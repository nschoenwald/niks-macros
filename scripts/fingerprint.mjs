/**
 * A short, stable fingerprint of a macro script, used to recognise versions this module shipped.
 * Shared by the module (scripts/main.js) and the build tool (tools/known-versions.mjs), so both compute it the same way.
 * Line endings and leading/trailing whitespace are ignored. cyrb53 hash, hex encoded.
 * @param {string} command
 * @returns {string}
 */
export function fingerprint(command) {
  const text = String(command ?? "").replace(/\r\n?/g, "\n").trim();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for ( let i = 0; i < text.length; i++ ) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
