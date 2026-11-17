// hollow.js — the enemy bestiary, painted: every Hollow kind as an
// upright, anatomical monster on its ground shadow, animated the way
// it fights — chewing mouths, charging stingers, closing shields.

import { COLORS } from './palette.js';
import { TAU, glow, noGlow, groundShadow, teethRing, text, polygon, rr } from './gfx.js';

const PAINTERS = {
  // The Maw: a waddling ball of teeth. Its whole body is the mouth;
  // two furious eyes ride on top because the mouth took the rest.
  chaser(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 1.1);
    const waddle = Math.sin(elapsed * 7 + enemy.wobblePhase) * r * 0.08;
    ctx.fillStyle = flash ? '#ffffff' : '#1d0b31';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 0.45, r * 0.82 + (side > 0 ? waddle : -waddle) * 0.4, r * 0.16, r * 0.12, 0, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(0, -r * 0.52);
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    const R = r * 1.1;
    const body = ctx.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.15, 0, 0, R);
    body.addColorStop(0, flash ? '#ffffff' : '#5b2a86');
    body.addColorStop(1, flash ? '#ffffff' : '#241040');
    glow(ctx, color, 13);
    ctx.fillStyle = body;
    // Rim spikes over the back and crown.
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI * (1.02 + (i / 8) * 0.96);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.15) * R * 0.94, Math.sin(a - 0.15) * R * 0.94);
      ctx.lineTo(Math.cos(a) * R * 1.24, Math.sin(a) * R * 1.24);
      ctx.lineTo(Math.cos(a + 0.15) * R * 0.94, Math.sin(a + 0.15) * R * 0.94);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    // The mouth, chewing.
    const chomp = 0.5 + 0.5 * Math.sin(elapsed * 5.2 + enemy.wobblePhase);
    const mR = r * (0.52 + 0.13 * chomp);
    ctx.save();
    ctx.translate(r * 0.22, r * 0.08);
    ctx.scale(1, 0.72 + 0.3 * chomp);
    ctx.fillStyle = '#4d0f26';
    ctx.beginPath();
    ctx.arc(0, 0, mR, 0, TAU);
    ctx.fill();
    teethRing(ctx, mR, 11, r * 0.26, '#ffe9ec');
    ctx.fillStyle = '#ff7d9c';
    ctx.beginPath();
    ctx.ellipse(0, mR * 0.45, mR * 0.44, mR * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // The eyes, on top, locked forward.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(side * r * 0.34 - r * 0.05, -R * 0.92, r * 0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath();
      ctx.arc(side * r * 0.34 + r * 0.03, -R * 0.92, r * 0.065, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  // The Lance: a hovering needle-fish duelist. It tilts toward its
  // target, tail fin waving; before it lunges it leans back and its
  // nose lights up — the tell is the whole fight.
  dart(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 0.8);
    const bob = Math.sin(elapsed * 3.2 + enemy.wobblePhase) * 3;
    const winding = enemy.lungeTime < 0.32;
    ctx.save();
    ctx.translate(0, -r * 1.05 + bob);
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    ctx.rotate(Math.sin(enemy.angle) * 0.42);
    if (winding) ctx.translate(-4, 0);
    const sway = Math.sin(elapsed * 6 + enemy.wobblePhase) * 0.18;
    ctx.fillStyle = flash ? '#ffffff' : color;
    glow(ctx, color, 10);
    ctx.save();
    ctx.translate(-r * 1.15, 0);
    ctx.rotate(sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.62, -r * 0.5);
    ctx.lineTo(-r * 0.34, 0);
    ctx.lineTo(-r * 0.62, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const bodyG = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    bodyG.addColorStop(0, flash ? '#ffffff' : '#ffc46b');
    bodyG.addColorStop(0.55, flash ? '#ffffff' : color);
    bodyG.addColorStop(1, flash ? '#ffffff' : '#c25e12');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.5);
    ctx.lineTo(r * 0.25, -r * 0.95);
    ctx.lineTo(r * 0.5, -r * 0.45);
    ctx.closePath();
    ctx.fill();
    // The needle.
    ctx.fillStyle = winding ? '#ffffff' : flash ? '#ffffff' : '#ffd9a0';
    glow(ctx, winding ? '#ffd94d' : color, winding ? 20 : 8);
    ctx.beginPath();
    ctx.moveTo(r * 0.95, -r * 0.15);
    ctx.lineTo(r * 2.1, 0);
    ctx.lineTo(r * 0.95, r * 0.15);
    ctx.closePath();
    ctx.fill();
    noGlow(ctx);
    ctx.fillStyle = COLORS.eye;
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.08, r * 0.27, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.46, -r * 0.08, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // The Brood: a translucent sac on stubby feet, its children drifting
  // inside against the membrane. It pulses like a heartbeat.
  splitter(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 1.15);
    ctx.fillStyle = flash ? '#ffffff' : '#2c5212';
    for (const fx of [-0.55, -0.2, 0.2, 0.55]) {
      ctx.beginPath();
      ctx.ellipse(fx * r, r * 0.84, r * 0.13, r * 0.09, 0, 0, TAU);
      ctx.fill();
    }
    const pulse = 1 + 0.05 * Math.sin(elapsed * 3.1 + enemy.wobblePhase);
    ctx.save();
    ctx.translate(0, -r * 0.78);
    ctx.scale(pulse, pulse);
    const sac = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.05);
    sac.addColorStop(0, flash ? '#ffffff' : '#c9ff9e');
    sac.addColorStop(0.6, flash ? '#ffffff' : color);
    sac.addColorStop(1, flash ? '#ffffff' : '#4d8f1f');
    glow(ctx, color, 12);
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = sac;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    noGlow(ctx);
    ctx.fillStyle = 'rgba(240, 255, 230, 0.20)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const a = elapsed * 0.7 + (i / 3) * TAU + enemy.wobblePhase;
      const bx = Math.cos(a) * r * 0.34;
      const by = Math.sin(a) * r * 0.3;
      ctx.fillStyle = COLORS.mini;
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.17, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath();
      ctx.arc(bx - r * 0.05, by - r * 0.03, r * 0.045, 0, TAU);
      ctx.arc(bx + r * 0.06, by - r * 0.03, r * 0.045, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(7, 10, 28, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 2.4, 4.3);
    ctx.stroke();
    ctx.setLineDash([]);
    // One watchful eye riding the top of the sac.
    ctx.fillStyle = COLORS.eye;
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.72, r * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.29, -r * 0.72, r * 0.065, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // The Mite: one huge eye, two frantic wings, dangling legs, all appetite.
  mini(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 0.7);
    const bob = Math.sin(elapsed * 5 + enemy.wobblePhase) * 2.5;
    ctx.save();
    ctx.translate(0, -r * 1.35 + bob);
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    const flap = Math.sin(elapsed * 42 + enemy.wobblePhase) * 0.6;
    ctx.fillStyle = 'rgba(230, 245, 255, 0.55)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-r * 0.25, -r * 0.55);
      ctx.rotate(side * (0.85 + flap * side));
      ctx.beginPath();
      ctx.ellipse(-r * 0.5, 0, r * 0.66, r * 0.27, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = flash ? '#ffffff' : '#86b84d';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      const kick = Math.sin(elapsed * 9 + enemy.wobblePhase + side) * 2;
      ctx.beginPath();
      ctx.moveTo(side * r * 0.4, r * 0.8);
      ctx.lineTo(side * r * 0.5 + kick, r * 1.35);
      ctx.stroke();
    }
    glow(ctx, color, 10);
    const bodyG = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.05);
    bodyG.addColorStop(0, flash ? '#ffffff' : '#efffb8');
    bodyG.addColorStop(1, flash ? '#ffffff' : '#8fce3f');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.02, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.28, 0, r * 0.54, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.eye;
    ctx.beginPath();
    ctx.arc(r * 0.45, 0, r * 0.29, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.53, -r * 0.09, r * 0.1, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // The Wraith: a floating cloak with a face in the dark of the hood.
  // Its mouth opens a breath before it spits — watch the mouth.
  weaver(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 0.9);
    const bob = Math.sin(elapsed * 2.2 + enemy.wobblePhase) * 3;
    ctx.save();
    ctx.translate(0, bob);
    ctx.rotate(Math.sin(elapsed * 1.7 + enemy.wobblePhase) * 0.05);
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    glow(ctx, color, 11);
    ctx.fillStyle = color;
    for (const side of [-1, 1]) {
      const wb = Math.sin(elapsed * 2.6 + enemy.wobblePhase + (side > 0 ? Math.PI : 0)) * 3;
      ctx.beginPath();
      ctx.arc(side * r * 1.0, -r * 1.05 + wb, 3.6, 0, TAU);
      ctx.fill();
    }
    noGlow(ctx);
    const wave = Math.sin(elapsed * 4.2 + enemy.wobblePhase) * r * 0.14;
    const cloak = ctx.createLinearGradient(0, -r * 2.2, 0, r * 0.8);
    cloak.addColorStop(0, flash ? '#ffffff' : '#4a2a8f');
    cloak.addColorStop(1, flash ? '#ffffff' : '#1c0f3d');
    glow(ctx, color, 12);
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.25);
    ctx.quadraticCurveTo(r * 0.95, -r * 2.0, r * 0.88, -r * 0.9);
    ctx.lineTo(r * 0.95, r * 0.55);
    ctx.lineTo(r * 0.55, r * 0.28 + wave);
    ctx.lineTo(r * 0.3, r * 0.62);
    ctx.lineTo(0, r * 0.3 + wave);
    ctx.lineTo(-r * 0.3, r * 0.62);
    ctx.lineTo(-r * 0.55, r * 0.28 - wave);
    ctx.lineTo(-r * 0.95, r * 0.55);
    ctx.lineTo(-r * 0.88, -r * 0.9);
    ctx.quadraticCurveTo(-r * 0.95, -r * 2.0, 0, -r * 2.25);
    ctx.fill();
    noGlow(ctx);
    // The face in the hood.
    ctx.fillStyle = '#07040f';
    ctx.beginPath();
    ctx.ellipse(r * 0.12, -r * 1.78, r * 0.42, r * 0.4, 0, 0, TAU);
    ctx.fill();
    glow(ctx, '#e9d8ff', 9);
    ctx.fillStyle = '#e9d8ff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(r * 0.12 + side * r * 0.17, -r * 1.84, r * 0.065, r * 0.11, 0, 0, TAU);
      ctx.fill();
    }
    noGlow(ctx);
    const mouthOpen = enemy.shootTime < 0.35 ? r * 0.15 : r * 0.03;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(r * 0.12, -r * 1.6, r * 0.085, mouthOpen, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // The Bulwark: a little knight — boots, a domed helm with a glowing
  // visor, and a great bone shield carried before it. Hurt past a
  // third, it turtles: the shield comes to the center and grows.
  bulwark(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 1.15);
    const turtling = enemy.hp < enemy.maxHp * 0.35;
    ctx.fillStyle = flash ? '#ffffff' : '#2c3350';
    for (const side of [-1, 1]) {
      rr(ctx, side * r * 0.34 - r * 0.16, r * 0.62, r * 0.32, r * 0.24, 3);
      ctx.fill();
    }
    ctx.save();
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    // Two spare plates drifting behind the shoulders.
    for (let i = 0; i < 2; i += 1) {
      const a = elapsed * 0.7 + i * Math.PI + enemy.wobblePhase;
      const px = -r * 0.62 + Math.cos(a) * r * 0.15;
      const py = -r * (i === 0 ? 1.15 : 0.45) + Math.sin(a) * r * 0.12;
      glow(ctx, color, 7);
      ctx.fillStyle = flash ? '#ffffff' : '#c9bc9c';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.23, 0, TAU);
      ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = 'rgba(7, 10, 28, 0.45)';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.11, 0, TAU);
      ctx.fill();
    }
    // The armored dome of a body.
    const dome = ctx.createLinearGradient(0, -r * 1.8, 0, r * 0.6);
    dome.addColorStop(0, flash ? '#ffffff' : '#8b9bd6');
    dome.addColorStop(0.55, flash ? '#ffffff' : '#55639c');
    dome.addColorStop(1, flash ? '#ffffff' : '#2c3350');
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.arc(0, -r * 0.55, r * 0.8, Math.PI, 0);
    ctx.lineTo(r * 0.8, r * 0.62);
    ctx.lineTo(-r * 0.8, r * 0.62);
    ctx.closePath();
    ctx.fill();
    // Helm crest and horn.
    ctx.fillStyle = flash ? '#ffffff' : color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, -r * 1.32);
    ctx.lineTo(r * 0.3, -r * 1.62);
    ctx.lineTo(r * 0.48, -r * 1.24);
    ctx.closePath();
    ctx.fill();
    // The visor, glowing through the helm.
    ctx.fillStyle = COLORS.stinger;
    glow(ctx, COLORS.stinger, 12);
    rr(ctx, r * 0.08, -r * 1.06, r * 0.44, r * 0.24, r * 0.1);
    ctx.fill();
    noGlow(ctx);
    // The great shield.
    const sx = turtling ? r * 0.22 : r * 0.72;
    const sR = r * (turtling ? 0.68 : 0.5);
    glow(ctx, color, 10);
    const shieldG = ctx.createRadialGradient(sx - sR * 0.3, -r * 0.85 - sR * 0.3, sR * 0.2, sx, -r * 0.85, sR);
    shieldG.addColorStop(0, flash ? '#ffffff' : '#fdf6e0');
    shieldG.addColorStop(1, flash ? '#ffffff' : '#b3a888');
    ctx.fillStyle = shieldG;
    ctx.beginPath();
    ctx.arc(sx, -r * 0.85, sR, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    ctx.fillStyle = 'rgba(7, 10, 28, 0.5)';
    ctx.beginPath();
    ctx.arc(sx, -r * 0.85, sR * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.stinger;
    ctx.beginPath();
    ctx.arc(sx, -r * 0.85, sR * 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  // The Stinger: a wasp the size of a dog, hovering on blurred wings.
  // Its tail charges light before it fires — the brighter the sting,
  // the closer the shot.
  stinger(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 0.85);
    const bob = Math.sin(elapsed * 3.8 + enemy.wobblePhase) * 3;
    ctx.save();
    ctx.translate(0, -r * 0.55 + bob);
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    // Wings, a blur above.
    const flap = Math.sin(elapsed * 46 + enemy.wobblePhase) * 0.4;
    ctx.fillStyle = 'rgba(200, 240, 255, 0.42)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-r * 0.1, -r * 0.95);
      ctx.rotate(side * (0.75 + flap) - 0.35);
      ctx.beginPath();
      ctx.ellipse(-r * 0.55, 0, r * 0.95, r * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Dangling legs.
    ctx.strokeStyle = flash ? '#ffffff' : '#8a6d1f';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      const wig = Math.sin(elapsed * 8 + i * 1.7 + enemy.wobblePhase) * 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2 + i * r * 0.28, r * 0.28);
      ctx.lineTo(-r * 0.26 + i * r * 0.28 + wig, r * 0.78);
      ctx.stroke();
    }
    // The striped abdomen, behind and low.
    ctx.save();
    ctx.translate(-r * 1.0, r * 0.05);
    ctx.fillStyle = flash ? '#ffffff' : '#e8b93b';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.68, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.68, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#23233a';
    for (const off of [-1.3, -0.72, -0.14]) ctx.fillRect(off * r - r * 0.13, -r, r * 0.26, r * 2);
    ctx.restore();
    // The sting, charging.
    const charge = Math.max(0, Math.min(1, 1 - enemy.shootTime / 2.6));
    ctx.fillStyle = flash ? '#ffffff' : '#39406e';
    ctx.beginPath();
    ctx.moveTo(-r * 1.82, -r * 0.08);
    ctx.lineTo(-r * 2.3, r * 0.05);
    ctx.lineTo(-r * 1.82, r * 0.2);
    ctx.closePath();
    ctx.fill();
    if (charge > 0.25) {
      glow(ctx, '#c9a7ff', 16 * charge);
      ctx.fillStyle = '#c9a7ff';
      ctx.beginPath();
      ctx.arc(-r * 2.3, r * 0.05, 2 + 4.5 * charge, 0, TAU);
      ctx.fill();
      noGlow(ctx);
    }
    // Thorax and head.
    const thorax = ctx.createRadialGradient(-r * 0.2, -r * 0.35, r * 0.15, 0, 0, r * 0.62);
    thorax.addColorStop(0, flash ? '#ffffff' : '#9aeaff');
    thorax.addColorStop(1, flash ? '#ffffff' : '#1f7ea6');
    glow(ctx, color, 11);
    ctx.fillStyle = thorax;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    ctx.strokeStyle = flash ? '#ffffff' : color;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.28);
      ctx.quadraticCurveTo(r * 1.0, -r * 0.62, r * 1.2, -r * 0.38);
      ctx.stroke();
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#7dff9a';
      glow(ctx, '#7dff9a', 8);
      ctx.beginPath();
      ctx.arc(r * 0.52, side * r * 0.3 - r * 0.12, r * 0.29, 0, TAU);
      ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(r * 0.6, side * r * 0.3 - r * 0.2, r * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  // The Dreadnought: a leviathan head on curling tentacles, wearing
  // two flat siege rings like a planet. Calm, five eyes watch;
  // enraged, all eight burn.
  boss(ctx, enemy, elapsed, color, flash) {
    const r = enemy.radius;
    groundShadow(ctx, r, 1.25);
    const bob = Math.sin(elapsed * 0.8 + enemy.wobblePhase) * 3.5;
    // Tentacles: thick curls spilling from the head to the ground.
    ctx.strokeStyle = flash ? '#ffffff' : '#4a2070';
    ctx.lineWidth = r * 0.15;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (const [ox, rad] of [[0.62, 0.36], [0.2, 0.26]]) {
        ctx.beginPath();
        ctx.arc(side * r * ox, r * 0.42, r * rad, side > 0 ? 3.3 : -0.2, side > 0 ? 5.8 : 2.0);
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(0, -r * 0.85 + bob);
    const R = r * 1.04;
    // Siege rings, drawn as flat ellipses so the head sits inside a
    // planetary ring system; the segments travel as it turns.
    for (const [ringRx, dir, segs] of [[R + 15, 1, 8], [R + 30, -1, 10]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5;
      glow(ctx, color, 12);
      for (let i = 0; i < segs; i += 1) {
        const a0 = elapsed * 0.5 * dir + (i / segs) * TAU + 0.12;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRx, ringRx * 0.34, 0, a0, a0 + (TAU / segs) * 0.55);
        ctx.stroke();
      }
      noGlow(ctx);
    }
    // The head.
    const head = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R);
    head.addColorStop(0, flash ? '#ffffff' : '#5b2a86');
    head.addColorStop(1, flash ? '#ffffff' : '#2a1247');
    glow(ctx, color, 17);
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    // The jaw: a dark crescent of teeth along the front-bottom.
    ctx.save();
    ctx.scale(Math.cos(enemy.angle) >= 0 ? 1 : -1, 1);
    ctx.fillStyle = '#1d0b31';
    ctx.beginPath();
    ctx.arc(0, R * 0.12, R * 0.72, 0.15, Math.PI - 0.15);
    ctx.lineTo(0, R * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.translate(0, R * 0.12);
    teethRing(ctx, R * 0.68, 13, R * 0.15, '#ffe9ec');
    ctx.restore();
    // The mouth-core: its heart, glowing through the teeth.
    const corePulse = 1 + Math.sin(elapsed * (enemy.enraged ? 7 : 3.5)) * 0.18;
    glow(ctx, color, 22);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(R * 0.1, R * 0.18, R * 0.16 * corePulse, 0, TAU);
    ctx.fill();
    noGlow(ctx);
    ctx.restore();
    // The crown of eyes.
    const eyeSpots = [[0.5, -0.52], [0.24, -0.8], [-0.12, -0.88], [-0.48, -0.7], [0.72, -0.2], [-0.72, -0.2], [0.62, 0.28], [-0.62, 0.28]];
    eyeSpots.forEach(([ex, ey], i) => {
      const open = enemy.enraged || i % 2 === 0 || i === 1;
      const px = ex * R;
      const py = ey * R;
      if (!open) {
        ctx.strokeStyle = '#8b6fb8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px - 5, py);
        ctx.lineTo(px + 5, py);
        ctx.stroke();
        return;
      }
      glow(ctx, '#ffd94d', 10);
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(px, py, R * 0.075, 0, TAU);
      ctx.fill();
      noGlow(ctx);
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath();
      ctx.arc(px + R * 0.03, py, R * 0.035, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  },
};

// How tall each creature stands, in radii — the HP bar floats above
// the crown, not through the face.
const HEIGHTS = { chaser: 1.85, dart: 1.85, splitter: 2.0, mini: 2.6, weaver: 2.4, bulwark: 2.0, stinger: 1.75, boss: 2.05 };

export function drawEnemy(ctx, enemy, elapsed) {
  const color = COLORS[enemy.kind];
  const r = enemy.radius;
  // Warp-in: a collapsing ground ring while the Hollow is a ghost.
  if ((enemy.spawnIn ?? 0) > 0) {
    const t = enemy.spawnIn / 0.35;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = t * 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.85, (r + 26 * t) * 1.1, (r + 26 * t) * 0.32, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.save();
  if ((enemy.spawnIn ?? 0) > 0) ctx.globalAlpha = 1 - (enemy.spawnIn / 0.35) * 0.55;
  ctx.translate(enemy.x, enemy.y);
  PAINTERS[enemy.kind](ctx, enemy, elapsed, color, enemy.flashTime > 0);
  ctx.restore();

  // An elite carries its name over its crown — the arena's named
  // terrors, announced in gold long before the banner marks them down.
  if (enemy.elite && enemy.eliteName) {
    const top = enemy.y - r * (HEIGHTS[enemy.kind] ?? 2) - 24;
    text(ctx, `☠ ${enemy.eliteName}`, enemy.x, top, 11.5, COLORS.elite, 'center', 800);
  }

  // An elite wears a broken gold ring on the ground beneath it; a
  // Hollow that has been eating shards wears them — gold pips studded
  // along that same ground line, one per meal.
  if (enemy.elite) {
    ctx.save();
    ctx.strokeStyle = COLORS.elite;
    ctx.lineWidth = 2.5;
    glow(ctx, COLORS.elite, 12);
    ctx.setLineDash([20, 12]);
    ctx.lineDashOffset = -elapsed * 34;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.85, r + 13, (r + 13) * 0.3, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    noGlow(ctx);
  }
  if (enemy.growth > 0) {
    ctx.fillStyle = COLORS.shard;
    const n = Math.min(6, enemy.growth);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU + elapsed * 0.8;
      ctx.beginPath();
      ctx.arc(enemy.x + Math.cos(a) * (r + 6), enemy.y + r * 0.85 + Math.sin(a) * (r + 6) * 0.3, 2.4, 0, TAU);
      ctx.fill();
    }
  }

  if (enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    const h = enemy.kind === 'boss' ? 6 : 3;
    const top = enemy.y - r * (HEIGHTS[enemy.kind] ?? 2) - 8;
    ctx.fillStyle = 'rgba(230, 235, 255, 0.25)';
    ctx.fillRect(enemy.x - enemy.radius, top, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - enemy.radius, top, w * (enemy.hp / enemy.maxHp), h);
  }
}
