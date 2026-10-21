/**
 * A short, stable id for a position: a 53-bit hash (cyrb53) of its EPD, in base 36, so about ten characters instead
 * of a 60-character EPD. EPD stays the key everywhere positions are stored; this is for places that need something
 * compact: tree drawings, links, logs. Two different positions sharing an id is possible in theory but vanishingly
 * unlikely at our scale (a few thousand positions against 2^53).
 */
export function positionId(epd: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < epd.length; i++) {
    const ch = epd.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
