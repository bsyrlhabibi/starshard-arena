// gfx.js — the shared canvas vocabulary: constants and the small
// drawing primitives every painter builds on (glow, rounded rects,
// polygons, ground shadows, teeth rings, and the one text style).

export const TAU = Math.PI * 2;

export function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

export function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

export function polygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function groundShadow(ctx, r, squash = 1) {
  ctx.fillStyle = 'rgba(2, 3, 10, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * squash, r * 0.28 * squash, 0, 0, TAU);
  ctx.fill();
}

export function teethRing(ctx, radius, count, length, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * TAU;
    const bx = Math.cos(a) * radius;
    const by = Math.sin(a) * radius;
    const px = Math.cos(a + Math.PI / 2) * (length * 0.32);
    const py = Math.sin(a + Math.PI / 2) * (length * 0.32);
    ctx.beginPath();
    ctx.moveTo(bx + px, by + py);
    ctx.lineTo(bx - Math.cos(a) * length, by - Math.sin(a) * length);
    ctx.lineTo(bx - px, by - py);
    ctx.closePath();
    ctx.fill();
  }
}

export function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight ?? 600} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}
