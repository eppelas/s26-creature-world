/* Отрисовка «житель в своём пространстве» на canvas.
 *
 * Геометрия существа берётся из общего creature.js, геометрия пространства —
 * из общего space.js. Здесь только холст, движение и реакция на тычок.
 */
(function (root) {
  'use strict';

  var K = root.Creature;
  var S = root.Space;
  var COSA = Math.cos(Math.PI / 6);
  var SINA = Math.sin(Math.PI / 6);

  function projX(x, z) { return (x - z) * COSA; }
  function projY(x, y, z) { return y - (x + z) * SINA; }

  function shade(hex, ratio) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgb(' + Math.min(255, Math.round(r * ratio)) + ',' +
                    Math.min(255, Math.round(g * ratio)) + ',' +
                    Math.min(255, Math.round(b * ratio)) + ')';
  }

  function cube(ctx, px, py, s, color, outline) {
    var w = COSA * s, h = s * 0.5;
    if (outline) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.6, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(px, py - s); ctx.lineTo(px + w, py - h); ctx.lineTo(px, py); ctx.lineTo(px - w, py - h);
      ctx.closePath();
      ctx.moveTo(px - w, py - h); ctx.lineTo(px - w, py + h); ctx.lineTo(px, py + s); ctx.lineTo(px, py);
      ctx.moveTo(px + w, py - h); ctx.lineTo(px + w, py + h); ctx.lineTo(px, py + s);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px, py - s); ctx.lineTo(px + w, py - h); ctx.lineTo(px, py); ctx.lineTo(px - w, py - h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color, 0.68);
    ctx.beginPath();
    ctx.moveTo(px - w, py - h); ctx.lineTo(px, py); ctx.lineTo(px, py + s); ctx.lineTo(px - w, py + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color, 0.86);
    ctx.beginPath();
    ctx.moveTo(px + w, py - h); ctx.lineTo(px, py); ctx.lineTo(px, py + s); ctx.lineTo(px + w, py + h);
    ctx.closePath(); ctx.fill();
  }

  /* Габарит считаем один раз на существо, иначе оно пульсирует между кадрами. */
  function measure(vox, yaw) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var i = 0; i < vox.length; i++) {
      var v = vox[i];
      var x = v[0] * cy - v[2] * sy, z = v[0] * sy + v[2] * cy;
      var px = projX(x, z), py = projY(x, v[1], z);
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function drawCreature(ctx, vox, opts) {
    var yaw = opts.yaw;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var vitality = opts.vitality === undefined ? 1 : opts.vitality;
    var ghost = vitality <= 0.06;
    var rnd = K.rngFrom(opts.seed + '|decay');

    var pts = [];
    for (var i = 0; i < vox.length; i++) {
      var v = vox[i];
      if (vitality < 1 && rnd() > 0.25 + vitality * 0.75) continue;
      pts.push([v[0] * cy - v[2] * sy, v[1], v[0] * sy + v[2] * cy, v[3]]);
    }
    if (!pts.length) return;

    pts.sort(function (a, b) {
      var da = a[0] + a[2], db = b[0] + b[2];
      if (db !== da) return db - da;
      return b[1] - a[1];
    });

    var m = opts.box;
    var unit = opts.unit;
    var ox = opts.centerX - (m.minX + m.maxX) / 2 * unit + (opts.shiftX || 0);
    var oy = opts.bottomY - m.maxY * unit - unit + (opts.bob || 0);

    for (var k = 0; k < pts.length; k++) {
      var p = pts[k];
      var color = p[3] < opts.palette.length ? opts.palette[p[3]] : opts.palette[0];
      if (vitality < 1) color = K.mixHex(color, opts.ground, (1 - vitality) * 0.72);
      cube(ctx, ox + projX(p[0], p[2]) * unit, oy + projY(p[0], p[1], p[2]) * unit,
        unit, ghost ? opts.ghost : color, ghost);
    }
  }

  /* Повадка из шестого вопроса — она же движение. Тычок добавляет прыжок. */
  function motion(tempo, t, seed, poke) {
    var m;
    if (tempo === 0) {
      var hop = Math.abs(Math.sin(t / 700));
      m = { bob: -hop * 22, yaw: Math.sin(t / 700) * 0.14, shiftX: 0, lift: hop };
    } else if (tempo === 1) {
      m = { bob: Math.sin(t / 320) * 4, yaw: Math.sin(t / 1600) * 0.22, shiftX: Math.sin(t / 1600) * 14, lift: 0.1 };
    } else if (tempo === 2) {
      var j = K.rngFrom(seed + '|glitch' + Math.floor(t / 260));
      m = { bob: (j() - 0.5) * 18, yaw: (j() - 0.5) * 0.5, shiftX: (j() - 0.5) * 20, lift: 0.15 };
    } else {
      m = { bob: Math.sin(t / 1300) * 12 - 8, yaw: Math.sin(t / 1300 + 1) * 0.34, shiftX: Math.cos(t / 1300) * 9, lift: 0.6 };
    }
    if (poke > 0) {
      var k = Math.min(1, poke);
      m.bob -= Math.sin(k * Math.PI) * 46;
      m.yaw += Math.sin(k * Math.PI * 3) * 0.5;
      m.lift += Math.sin(k * Math.PI) * 0.8;
    }
    return m;
  }

  /* state: {genome, traits, stage, vitality, project} */
  function makeScene(canvas, state, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var vox = K.buildCreature(state.genome, state.traits, state.stage);
    var palette = K.paletteFor(state.genome, state.traits);
    var box = measure(vox, state.traits.yaw);
    var cssW = 0, cssH = 0, anchors = null, unit = 1, bg = null;

    function layout() {
      var w = canvas.clientWidth || opts.width || 320;
      var h = Math.round(w * (opts.ratio || 0.62));
      if (w === cssW && h === cssH) return;
      cssW = w; cssH = h;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* фон рисуем в закадровый холст: он не меняется между кадрами */
      bg = document.createElement('canvas');
      bg.width = canvas.width; bg.height = canvas.height;
      var bctx = bg.getContext('2d');
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      anchors = S.drawSpace(S.canvasPen(bctx), state.project, state.traits.seed, w, h, K.rngFrom);

      var wantH = h * (0.34 + 0.055 * state.stage);
      unit = Math.min(wantH / (box.maxY - box.minY + 2.05), (w * 0.4) / (box.maxX - box.minX + 1.74));
    }

    function frame(t, poke) {
      layout();
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(bg, 0, 0, cssW, cssH);

      var m = motion(state.genome.tempo, t, state.traits.seed, poke);
      var shrink = 1 - Math.min(0.9, m.lift) * 0.35;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = anchors.light.ink;
      ctx.beginPath();
      ctx.ellipse(anchors.standX + m.shiftX, anchors.baseY + 3, unit * 2.6 * shrink, unit * 0.8 * shrink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      drawCreature(ctx, vox, {
        palette: palette,
        seed: state.traits.seed,
        yaw: state.traits.yaw + m.yaw,
        vitality: state.vitality,
        box: box,
        unit: unit,
        centerX: anchors.standX,
        bottomY: anchors.baseY,
        bob: m.bob,
        shiftX: m.shiftX,
        ground: anchors.light.sky[0],
        ghost: anchors.light.ink
      });
    }

    return { frame: frame, hitAt: function () { return anchors; } };
  }

  root.VoxelCanvas = { makeScene: makeScene, measure: measure };
})(window);
