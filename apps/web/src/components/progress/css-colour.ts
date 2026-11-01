/**
 * A colour token (`--mode-review`) as an `rgba()` string, for drawing libraries that cannot read CSS variables or parse
 * oklch. The token is resolved on an element (so `.dark` applies) and painted on a 1x1 canvas to read back sRGB.
 */
export function cssColour(variable: string, alpha = 1, from: Element = document.documentElement): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${variable})`;
  probe.style.display = 'none';
  from.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return resolved;
  context.fillStyle = resolved;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Math.round(((a ?? 255) / 255) * alpha * 1000) / 1000})`;
}
