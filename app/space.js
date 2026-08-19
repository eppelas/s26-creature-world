/* Пространство проекта.
 *
 * Существо воксельное и объёмное. Пространство намеренно другое: плоские
 * заливки, тонкий контур, никакой изометрии — чтобы житель и место не
 * сливались, а читались как две разные вещи.
 *
 * Геометрия здесь одна на всех, а рисует её «перо» — тонкая прослойка над
 * растеризатором в Node и над canvas в браузере. Так бот и мини-апп не могут
 * разъехаться.
 *
 * Что откуда берётся:
 *   state  → свет и палитра
 *   result → что стоит на горизонте
 *   wish   → предмет рядом с существом
 *   rhythm → насколько обжитое место
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Space = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LIGHTS = [
    { /* спокойно и ровно */
      sky: ['#e4edee', '#d3e1e3', '#c0d4d6'],
      far: '#9db4b0', ground: '#aebeb2', ground2: '#94a795', ink: '#2f3d39', warm: '#e8d7bd'
    },
    { /* на азарте */
      sky: ['#ffe0bd', '#ffc79b', '#f5a07d'],
      far: '#e08a63', ground: '#cf9070', ground2: '#ac7156', ink: '#472a21', warm: '#ffe9cf'
    },
    { /* из любопытства */
      sky: ['#f5eedb', '#ece3c9', '#ded4b4'],
      far: '#c3c095', ground: '#c8c69d', ground2: '#b0af88', ink: '#3d3b2b', warm: '#f7f1dc'
    },
    { /* собранно, без лишнего */
      sky: ['#edf0f3', '#e0e5ea', '#d0d7de'],
      far: '#a9b1b9', ground: '#bcc3c9', ground2: '#a5adb4', ink: '#293036', warm: '#e6ebef'
    }
  ];

  var WISH_KINDS = [
    { id: 'window', re: /окн|свет из|вид на|форточ/i },
    { id: 'lamp',   re: /лампа|свет|тепл|огон|свеч|костёр|костер/i },
    { id: 'table',  re: /стол|верстак|мастерск|рабоч.{0,4}мест/i },
    { id: 'water',  re: /вода|море|река|озер|дожд|волн|ванн/i },
    { id: 'sound',  re: /музык|звук|плейлист|песн|тишин|наушник/i },
    { id: 'plant',  re: /растен|цвет|дерев|зелен|сад|лес|трав/i },
    { id: 'person', re: /человек|люди|друг|компан|кто-то|партн|собеседн|коллег/i },
    { id: 'book',   re: /книг|текст|записк|блокнот|дневник|чтен/i },
    { id: 'door',   re: /дверь|выход|порог|переход/i }
  ];

  function wishKind(text) {
    if (!text) return 'stone';
    for (var i = 0; i < WISH_KINDS.length; i++) if (WISH_KINDS[i].re.test(text)) return WISH_KINDS[i].id;
    return 'stone';
  }

  function spaceOf(project) {
    var p = project || {};
    return {
      light: LIGHTS[p.state === undefined ? 0 : p.state] || LIGHTS[0],
      result: p.result === undefined ? 0 : p.result,
      rhythm: p.rhythm === undefined ? 0 : p.rhythm,
      wish: wishKind(p.wishText || p.wish)
    };
  }

  /* ------------------------------ рисование ------------------------------ */

  function drawHorizon(pen, S, W, horizon) {
    var L = S.light;
    var cx = W * 0.74;
    if (S.result === 0) {                                  // готовая вещь — гора
      pen.poly([[cx - 90, horizon], [cx - 18, horizon - 96], [cx + 62, horizon]], L.far);
      pen.path([[cx - 18, horizon - 96], [cx + 4, horizon - 58], [cx - 12, horizon - 44]], L.ink, 2);
    } else if (S.result === 1) {                           // ясность — дорога за горизонт
      pen.poly([[cx - 8, horizon], [cx + 8, horizon], [cx + 120, horizon + 120], [cx - 130, horizon + 120]], L.far);
      pen.line(cx + 30, horizon, cx + 30, horizon - 46, L.ink, 3);
      pen.line(cx + 30, horizon - 46, cx + 62, horizon - 40, L.ink, 3);
    } else if (S.result === 2) {                           // груз спадёт — открытая дверь
      pen.rect(cx - 34, horizon - 92, 68, 92, L.far);
      pen.rect(cx - 22, horizon - 78, 44, 78, '#ffffff');
      pen.path([[cx - 34, horizon - 92], [cx + 34, horizon - 92], [cx + 34, horizon], [cx - 34, horizon], [cx - 34, horizon - 92]], L.ink, 2);
      pen.line(cx + 22, horizon - 46, cx + 30, horizon - 46, L.ink, 3);
    } else {                                               // захочется продолжать — дерево
      pen.line(cx, horizon, cx, horizon - 62, L.ink, 5);
      pen.ellipse(cx, horizon - 84, 46, 34, L.far);
      pen.ellipse(cx - 30, horizon - 66, 26, 20, L.far);
      pen.ellipse(cx + 28, horizon - 62, 22, 17, L.far);
    }
  }

  function drawWish(pen, S, x, baseY) {
    var L = S.light;
    var ink = L.ink, warm = L.warm, far = L.far;
    switch (S.wish) {
      case 'window':
        pen.rect(x - 26, baseY - 74, 52, 62, warm);
        pen.path([[x - 26, baseY - 74], [x + 26, baseY - 74], [x + 26, baseY - 12], [x - 26, baseY - 12], [x - 26, baseY - 74]], ink, 2);
        pen.line(x, baseY - 74, x, baseY - 12, ink, 2);
        pen.line(x - 26, baseY - 43, x + 26, baseY - 43, ink, 2);
        break;
      case 'lamp':
        pen.line(x, baseY, x, baseY - 52, ink, 3);
        pen.ellipse(x, baseY - 62, 17, 14, warm);
        pen.path([[x - 17, baseY - 62], [x, baseY - 78], [x + 17, baseY - 62]], ink, 2);
        break;
      case 'table':
        pen.rect(x - 34, baseY - 34, 68, 8, warm);
        pen.path([[x - 34, baseY - 34], [x + 34, baseY - 34], [x + 34, baseY - 26], [x - 34, baseY - 26], [x - 34, baseY - 34]], ink, 2);
        pen.line(x - 28, baseY - 26, x - 28, baseY, ink, 3);
        pen.line(x + 28, baseY - 26, x + 28, baseY, ink, 3);
        break;
      case 'water':
        pen.ellipse(x, baseY - 4, 46, 13, far);
        pen.path([[x - 34, baseY - 6], [x - 16, baseY - 11], [x + 4, baseY - 6], [x + 24, baseY - 11]], ink, 2);
        break;
      case 'sound':
        pen.rect(x - 16, baseY - 40, 32, 40, warm);
        pen.path([[x - 16, baseY - 40], [x + 16, baseY - 40], [x + 16, baseY], [x - 16, baseY], [x - 16, baseY - 40]], ink, 2);
        pen.ellipse(x, baseY - 22, 8, 8, far);
        for (var i = 1; i <= 3; i++) {
          pen.path([[x + 20 + i * 7, baseY - 34 - i * 3], [x + 24 + i * 7, baseY - 24 - i * 2], [x + 20 + i * 7, baseY - 14 - i]], ink, 2);
        }
        break;
      case 'plant':
        pen.line(x, baseY, x, baseY - 40, ink, 3);
        pen.ellipse(x - 14, baseY - 34, 15, 9, far);
        pen.ellipse(x + 14, baseY - 46, 15, 9, far);
        pen.ellipse(x, baseY - 56, 12, 12, far);
        break;
      case 'person':                                    /* плоский человечек — намеренно не воксельный */
        pen.ellipse(x, baseY - 62, 11, 12, warm);
        pen.path([[x, baseY - 50], [x, baseY - 22]], ink, 3);
        pen.path([[x - 15, baseY - 40], [x, baseY - 44], [x + 15, baseY - 38]], ink, 3);
        pen.path([[x - 12, baseY], [x, baseY - 22], [x + 12, baseY]], ink, 3);
        pen.path([[x - 11, baseY - 74], [x, baseY - 74], [x + 11, baseY - 74]], ink, 2);
        break;
      case 'book':
        pen.poly([[x - 32, baseY - 12], [x, baseY - 22], [x + 32, baseY - 12], [x, baseY - 2]], warm);
        pen.path([[x - 32, baseY - 12], [x, baseY - 22], [x + 32, baseY - 12], [x, baseY - 2], [x - 32, baseY - 12]], ink, 2);
        pen.line(x, baseY - 22, x, baseY - 2, ink, 2);
        break;
      case 'door':
        pen.rect(x - 22, baseY - 66, 44, 66, warm);
        pen.path([[x - 22, baseY - 66], [x + 22, baseY - 66], [x + 22, baseY], [x - 22, baseY], [x - 22, baseY - 66]], ink, 2);
        pen.ellipse(x + 12, baseY - 32, 3, 3, ink);
        break;
      default:                                          /* камень-метка */
        pen.ellipse(x, baseY - 12, 26, 16, far);
        pen.path([[x - 26, baseY - 12], [x - 10, baseY - 26], [x + 14, baseY - 22], [x + 26, baseY - 12]], ink, 2);
    }
  }

  /* rng приходит снаружи: в Node из creature.js, в браузере из window.Creature */
  function drawSpace(pen, project, seed, W, H, rngFrom) {
    var S = spaceOf(project);
    var L = S.light;
    var rnd = rngFrom((seed || 'space') + '|space');

    var horizon = Math.round(H * 0.62);
    pen.rect(0, 0, W, horizon * 0.42, L.sky[0]);
    pen.rect(0, horizon * 0.42, W, horizon * 0.3, L.sky[1]);
    pen.rect(0, horizon * 0.72, W, horizon * 0.28, L.sky[2]);

    drawHorizon(pen, S, W, horizon);

    pen.rect(0, horizon, W, H - horizon, L.ground);
    pen.line(0, horizon, W, horizon, L.ink, 2);
    pen.poly([[0, H * 0.86], [W, H * 0.8], [W, H], [0, H]], L.ground2);

    /* обжитость: чем чаще человек обещал приходить, тем больше следов вокруг */
    var tufts = [10, 7, 5, 6][S.rhythm];
    for (var i = 0; i < tufts; i++) {
      var tx = 20 + rnd() * (W - 40);
      var ty = horizon + 14 + rnd() * (H - horizon - 24);
      var s = 5 + rnd() * 7;
      pen.path([[tx - s, ty], [tx, ty - s], [tx + s, ty]], L.ink, 1.5);
    }

    drawWish(pen, S, Math.round(W * 0.14), Math.round(H * 0.84));

    return {
      standX: Math.round(W * 0.36),
      baseY: Math.round(H * 0.84),
      light: L,
      kind: S
    };
  }

  /* ------------------------------- перья ------------------------------- */

  function canvasPen(ctx) {
    function trace(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    }
    return {
      poly: function (pts, color) { trace(pts); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); },
      rect: function (x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); },
      ellipse: function (cx, cy, rx, ry, color) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      },
      line: function (x0, y0, x1, y1, color, w) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.stroke();
      },
      path: function (pts, color, w) {
        trace(pts);
        ctx.strokeStyle = color; ctx.lineWidth = w || 2;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();
      }
    };
  }

  return {
    LIGHTS: LIGHTS,
    spaceOf: spaceOf,
    wishKind: wishKind,
    drawSpace: drawSpace,
    canvasPen: canvasPen
  };
});
