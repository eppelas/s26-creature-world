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

  /* ------------------------------- темы -------------------------------
     Пространство должно быть про то, чем человек занят, а не абстрактным
     пейзажем. Читаем описание проекта по корням и ставим в мир предметы.
     Рисуются они в локальных координатах: начало — под предметом, единица —
     примерно человеческий рост, поэтому один и тот же предмет ставится и
     вблизи, и мелко у горизонта. */

  function local(pen, ox, oy, k) {
    var P = function (pt) { return [ox + pt[0] * k, oy + pt[1] * k]; };
    var w = function (v) { return Math.max(1, (v || 2) * k); };
    return {
      poly: function (pts, c) { pen.poly(pts.map(P), c); },
      rect: function (x, y, ww, hh, c) { pen.rect(ox + x * k, oy + y * k, ww * k, hh * k, c); },
      ellipse: function (cx, cy, rx, ry, c) { pen.ellipse(ox + cx * k, oy + cy * k, rx * k, ry * k, c); },
      line: function (x0, y0, x1, y1, c, lw) { pen.line(ox + x0 * k, oy + y0 * k, ox + x1 * k, oy + y1 * k, c, w(lw)); },
      path: function (pts, c, lw) { pen.path(pts.map(P), c, w(lw)); }
    };
  }

  /* Предметы — атомы пространства. Тема набирает из них два-четыре, поэтому
     «телеграм-бот» и «дашборд» перестают быть одним и тем же монитором.
     Координаты локальные: начало под предметом, высота примерно в рост. */
  var PROPS = {
    monitor: function (g, ink, warm, far) {
      g.rect(-24, -46, 48, 32, warm);
      g.path([[-24, -46], [24, -46], [24, -14], [-24, -14], [-24, -46]], ink, 2);
      g.line(-16, -38, 6, -38, ink, 2); g.line(-16, -32, 14, -32, ink, 2); g.line(-16, -26, -2, -26, ink, 2);
      g.line(0, -14, 0, -4, ink, 3); g.line(-14, -4, 14, -4, ink, 3);
    },
    laptop: function (g, ink, warm, far) {
      g.poly([[-26, -4], [26, -4], [32, 0], [-32, 0]], far);
      g.path([[-26, -4], [26, -4], [32, 0], [-32, 0], [-26, -4]], ink, 2);
      g.rect(-24, -34, 48, 30, warm);
      g.path([[-24, -34], [24, -34], [24, -4], [-24, -4], [-24, -34]], ink, 2);
      g.line(-16, -26, 8, -26, ink, 2); g.line(-16, -20, 14, -20, ink, 2);
    },
    phone: function (g, ink, warm, far) {
      g.rect(-11, -40, 22, 40, warm);
      g.path([[-11, -40], [11, -40], [11, 0], [-11, 0], [-11, -40]], ink, 2);
      g.line(-6, -33, 6, -33, ink, 2); g.line(-6, -27, 3, -27, ink, 2);
      g.ellipse(0, -6, 3, 3, ink);
    },
    server: function (g, ink, warm, far) {
      g.rect(-18, -70, 36, 70, far);
      g.path([[-18, -70], [18, -70], [18, 0], [-18, 0], [-18, -70]], ink, 2);
      for (var i = 0; i < 5; i++) {
        g.line(-13, -62 + i * 13, 13, -62 + i * 13, ink, 2);
        g.ellipse(10, -66 + i * 13, 2, 2, warm);
      }
    },
    terminal: function (g, ink, warm, far) {
      g.rect(-24, -40, 48, 30, ink);
      g.rect(-18, -34, 6, 6, warm);
      g.line(-8, -31, 12, -31, warm, 2);
      g.line(-18, -22, 4, -22, far, 2);
      g.line(0, -10, 0, -3, ink, 3); g.line(-12, -3, 12, -3, ink, 3);
    },
    dashboard: function (g, ink, warm, far) {
      g.rect(-28, -44, 56, 34, warm);
      g.path([[-28, -44], [28, -44], [28, -10], [-28, -10], [-28, -44]], ink, 2);
      var h = [8, 16, 11, 22, 14];
      for (var i = 0; i < 5; i++) g.rect(-22 + i * 9, -14 - h[i], 6, h[i], far);
      g.line(0, -10, 0, -3, ink, 3); g.line(-12, -3, 12, -3, ink, 3);
    },
    browser: function (g, ink, warm, far) {
      g.rect(-30, -48, 60, 40, warm);
      g.path([[-30, -48], [30, -48], [30, -8], [-30, -8], [-30, -48]], ink, 2);
      g.line(-30, -40, 30, -40, ink, 2);
      for (var i = 0; i < 3; i++) g.ellipse(-24 + i * 6, -44, 2, 2, ink);
      g.rect(-24, -34, 30, 6, far); g.rect(-24, -24, 44, 5, far);
      g.line(0, -8, 0, -2, ink, 3); g.line(-10, -2, 10, -2, ink, 3);
    },
    chatbubble: function (g, ink, warm, far) {
      g.line(0, 0, 0, -30, ink, 3);
      g.rect(-24, -62, 48, 30, warm);
      g.path([[-24, -62], [24, -62], [24, -32], [-24, -32], [-24, -62]], ink, 2);
      g.poly([[-8, -32], [2, -32], [-4, -24]], warm);
      g.path([[-8, -32], [-4, -24], [2, -32]], ink, 2);
      g.line(-16, -54, 10, -54, far, 3); g.line(-16, -46, 2, -46, far, 3);
    },
    robotarm: function (g, ink, warm, far) {
      g.rect(-14, -10, 28, 10, far);
      g.path([[-14, -10], [14, -10], [14, 0], [-14, 0], [-14, -10]], ink, 2);
      g.line(0, -10, -10, -38, ink, 4);
      g.line(-10, -38, 16, -52, ink, 4);
      g.path([[16, -52], [24, -48]], ink, 3); g.path([[16, -52], [23, -58]], ink, 3);
      g.ellipse(-10, -38, 4, 4, warm);
    },
    gears: function (g, ink, warm, far) {
      function gear(cx, cy, r) {
        g.ellipse(cx, cy, r, r, far);
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          g.line(cx + Math.cos(a) * r, cy + Math.sin(a) * r,
                 cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4), ink, 3);
        }
        g.ellipse(cx, cy, r * 0.35, r * 0.35, ink);
      }
      gear(-12, -30, 14); gear(14, -16, 9);
    },
    antenna: function (g, ink, warm, far) {
      g.line(0, 0, 0, -66, ink, 3);
      g.line(-12, -8, 12, -8, ink, 2);
      for (var i = 1; i <= 3; i++) g.line(-10 + i * 2, -18 * i, 10 - i * 2, -18 * i, ink, 2);
      g.ellipse(0, -70, 4, 4, warm);
    },
    dish: function (g, ink, warm, far) {
      g.line(0, 0, 0, -30, ink, 3);
      g.poly([[-18, -52], [18, -44], [10, -26], [-14, -32]], far);
      g.path([[-18, -52], [18, -44], [10, -26], [-14, -32], [-18, -52]], ink, 2);
      g.line(2, -38, 16, -56, ink, 2); g.ellipse(16, -56, 3, 3, ink);
    },
    cable: function (g, ink, warm, far) {
      g.path([[-24, -46], [-12, -26], [0, -44], [12, -22], [24, -40]], ink, 3);
      g.ellipse(-24, -46, 3, 3, far); g.ellipse(24, -40, 3, 3, far);
    },
    gamepad: function (g, ink, warm, far) {
      g.rect(-24, -22, 48, 18, warm);
      g.ellipse(-24, -13, 8, 9, warm); g.ellipse(24, -13, 8, 9, warm);
      g.path([[-24, -22], [24, -22], [24, -4], [-24, -4], [-24, -22]], ink, 2);
      g.ellipse(-12, -13, 4, 4, ink); g.ellipse(12, -13, 4, 4, ink);
      g.line(0, -4, 0, 0, ink, 2);
    },
    tablet: function (g, ink, warm, far) {
      g.poly([[-26, -6], [22, -14], [30, -6], [-18, 2]], warm);
      g.path([[-26, -6], [22, -14], [30, -6], [-18, 2], [-26, -6]], ink, 2);
      g.line(18, -18, 30, -40, ink, 3);
      g.poly([[28, -40], [33, -41], [31, -48]], ink);
    },
    palette: function (g, ink, warm, far) {
      g.ellipse(0, -14, 24, 14, warm);
      g.path([[-24, -14], [-24, -14]], ink, 2);
      g.ellipse(-12, -18, 4, 3, far); g.ellipse(0, -21, 4, 3, ink); g.ellipse(12, -17, 4, 3, far);
      g.ellipse(8, -9, 5, 4, warm);
    },
    filmreel: function (g, ink, warm, far) {
      g.ellipse(0, -22, 20, 20, far);
      g.ellipse(0, -22, 5, 5, ink);
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3;
        g.ellipse(Math.cos(a) * 12, -22 + Math.sin(a) * 12, 4, 4, ink);
      }
    },
    camera: function (g, ink, warm, far) {
      g.line(0, 0, -14, -46, ink, 3); g.line(0, 0, 14, -46, ink, 3); g.line(4, 0, 0, -46, ink, 2);
      g.rect(-16, -64, 32, 20, warm);
      g.path([[-16, -64], [16, -64], [16, -44], [-16, -44], [-16, -64]], ink, 2);
      g.ellipse(2, -54, 7, 7, far); g.ellipse(2, -54, 3, 3, ink);
      g.rect(-13, -68, 8, 4, ink);
    },
    mic: function (g, ink, warm, far) {
      g.line(-2, 0, -2, -52, ink, 3);
      g.ellipse(-2, -58, 6, 8, ink);
      g.path([[-12, 0], [8, 0]], ink, 3);
    },
    speaker: function (g, ink, warm, far) {
      g.rect(-11, -34, 22, 34, warm);
      g.path([[-11, -34], [11, -34], [11, 0], [-11, 0], [-11, -34]], ink, 2);
      g.ellipse(0, -24, 6, 6, far); g.ellipse(0, -9, 3, 3, far);
    },
    easel: function (g, ink, warm, far) {
      g.line(-18, 0, -4, -50, ink, 3); g.line(18, 0, 4, -50, ink, 3); g.line(0, -20, 0, 0, ink, 3);
      g.rect(-22, -56, 44, 34, warm);
      g.path([[-22, -56], [22, -56], [22, -22], [-22, -22], [-22, -56]], ink, 2);
      g.poly([[-14, -28], [0, -48], [14, -28]], far);
    },
    papers: function (g, ink, warm, far) {
      g.rect(-26, -10, 40, 10, warm); g.rect(-22, -19, 40, 9, warm); g.rect(-25, -27, 38, 8, warm);
      g.path([[-26, -10], [14, -10], [14, 0], [-26, 0], [-26, -10]], ink, 2);
      g.path([[-25, -27], [13, -27], [13, -19]], ink, 2);
    },
    books: function (g, ink, warm, far) {
      g.rect(-30, -4, 60, 4, ink);
      var h = [26, 32, 22, 30, 24, 28];
      for (var i = 0; i < 6; i++) g.rect(-28 + i * 9, -4 - h[i], 7, h[i], i % 2 ? far : warm);
      for (var j = 0; j < 6; j++) g.path([[-28 + j * 9, -4 - h[j]], [-21 + j * 9, -4 - h[j]]], ink, 1.5);
    },
    board: function (g, ink, warm, far) {
      g.rect(-34, -52, 68, 40, far);
      g.path([[-34, -52], [34, -52], [34, -12], [-34, -12], [-34, -52]], ink, 2);
      g.line(-24, -40, 10, -40, warm, 3); g.line(-24, -30, 20, -30, warm, 3);
      g.line(-26, -12, -26, 0, ink, 3); g.line(26, -12, 26, 0, ink, 3);
    },
    plantpot: function (g, ink, warm, far) {
      g.poly([[-12, -14], [12, -14], [9, 0], [-9, 0]], warm);
      g.path([[-12, -14], [12, -14], [9, 0], [-9, 0], [-12, -14]], ink, 2);
      g.line(0, -14, 0, -40, ink, 2);
      g.ellipse(-10, -34, 12, 7, far); g.ellipse(11, -44, 12, 7, far); g.ellipse(0, -52, 9, 9, far);
    },
    desk: function (g, ink, warm, far) {
      g.rect(-34, -34, 68, 8, warm);
      g.path([[-34, -34], [34, -34], [34, -26], [-34, -26], [-34, -34]], ink, 2);
      g.line(-28, -26, -28, 0, ink, 3); g.line(28, -26, 28, 0, ink, 3);
    },
    boxes: function (g, ink, warm, far) {
      g.rect(-30, -22, 30, 22, warm);
      g.path([[-30, -22], [0, -22], [0, 0], [-30, 0], [-30, -22]], ink, 2);
      g.line(-30, -12, 0, -12, ink, 2);
      g.rect(-24, -40, 22, 18, far);
      g.path([[-24, -40], [-2, -40], [-2, -22], [-24, -22], [-24, -40]], ink, 2);
    },
    ladder: function (g, ink, warm, far) {
      g.line(-10, 0, -2, -46, ink, 3); g.line(12, 0, 4, -46, ink, 3);
      for (var i = 1; i <= 3; i++) g.line(-8 + i * 1.6, -i * 11, 10 - i * 1.6, -i * 11, ink, 2);
    },
    mat: function (g, ink, warm, far) {
      g.poly([[-38, 0], [-6, -8], [22, -8], [-10, 0]], warm);
      g.path([[-38, 0], [-6, -8], [22, -8], [-10, 0], [-38, 0]], ink, 2);
    },
    dumbbell: function (g, ink, warm, far) {
      g.line(-14, -10, 14, -10, ink, 3);
      g.rect(-18, -18, 8, 16, ink); g.rect(10, -18, 8, 16, ink);
    },
    sign: function (g, ink, warm, far) {
      g.rect(-30, -50, 60, 26, warm);
      g.path([[-30, -50], [30, -50], [30, -24], [-30, -24], [-30, -50]], ink, 2);
      g.line(-20, -24, -20, 0, ink, 3); g.line(20, -24, 20, 0, ink, 3);
      g.line(-20, -40, 16, -40, far, 3); g.line(-20, -32, 6, -32, far, 3);
    },
    suitcase: function (g, ink, warm, far) {
      g.rect(-22, -26, 44, 26, warm);
      g.path([[-22, -26], [22, -26], [22, 0], [-22, 0], [-22, -26]], ink, 2);
      g.path([[-8, -26], [-8, -34], [8, -34], [8, -26]], ink, 3);
      g.line(-22, -14, 22, -14, ink, 2);
    },
    beds: function (g, ink, warm, far) {
      for (var i = 0; i < 3; i++) {
        g.path([[-34 + i * 24, 0], [-28 + i * 24, -12], [-22 + i * 24, 0]], far, 3);
        g.line(-28 + i * 24, 0, -28 + i * 24, -14, ink, 2);
      }
    },
    watering: function (g, ink, warm, far) {
      g.rect(-12, -20, 22, 16, warm);
      g.path([[-12, -20], [10, -20], [10, -4], [-12, -4], [-12, -20]], ink, 2);
      g.path([[10, -16], [20, -22], [20, -18]], ink, 3);
    },
    globe: function (g, ink, warm, far) {
      g.line(0, 0, 0, -14, ink, 3); g.line(-10, 0, 10, 0, ink, 3);
      g.ellipse(0, -36, 22, 22, far);
      g.ellipse(0, -36, 8, 22, ink === far ? warm : ink);
      g.ellipse(0, -36, 20, 20, far);
      g.line(-22, -36, 22, -36, ink, 2);
      g.path([[-13, -52], [-4, -36], [-13, -20]], ink, 2);
      g.path([[13, -52], [4, -36], [13, -20]], ink, 2);
    },
    calendar: function (g, ink, warm, far) {
      g.rect(-24, -46, 48, 42, warm);
      g.path([[-24, -46], [24, -46], [24, -4], [-24, -4], [-24, -46]], ink, 2);
      g.rect(-24, -46, 48, 9, ink);
      for (var r = 0; r < 3; r++)
        for (var c = 0; c < 4; c++) g.rect(-19 + c * 10, -33 + r * 9, 6, 6, far);
    },
    coins: function (g, ink, warm, far) {
      for (var i = 0; i < 3; i++) {
        g.ellipse(-2 + i * 2, -6 - i * 7, 15, 6, warm);
        g.path([[-17 + i * 2, -6 - i * 7], [-17 + i * 2, -6 - i * 7]], ink, 2);
      }
      g.ellipse(2, -27, 15, 6, far);
    },
    cart: function (g, ink, warm, far) {
      g.poly([[-20, -30], [22, -30], [16, -10], [-14, -10]], warm);
      g.path([[-20, -30], [22, -30], [16, -10], [-14, -10], [-20, -30]], ink, 2);
      g.path([[-20, -30], [-28, -38]], ink, 3);
      g.ellipse(-9, -4, 4, 4, ink); g.ellipse(11, -4, 4, 4, ink);
    },
    envelope: function (g, ink, warm, far) {
      g.rect(-24, -30, 48, 30, warm);
      g.path([[-24, -30], [24, -30], [24, 0], [-24, 0], [-24, -30]], ink, 2);
      g.path([[-24, -30], [0, -12], [24, -30]], ink, 2);
    },
    magnifier: function (g, ink, warm, far) {
      g.ellipse(-4, -40, 15, 15, far);
      g.ellipse(-4, -40, 11, 11, warm);
      g.line(6, -30, 20, -6, ink, 4);
    },
    headphones: function (g, ink, warm, far) {
      g.path([[-20, -20], [-18, -40], [0, -48], [18, -40], [20, -20]], ink, 4);
      g.rect(-26, -24, 12, 20, far); g.rect(14, -24, 12, 20, far);
      g.path([[-26, -24], [-14, -24], [-14, -4], [-26, -4], [-26, -24]], ink, 2);
      g.path([[14, -24], [26, -24], [26, -4], [14, -4], [14, -24]], ink, 2);
    },
    clapper: function (g, ink, warm, far) {
      g.rect(-24, -26, 48, 26, warm);
      g.path([[-24, -26], [24, -26], [24, 0], [-24, 0], [-24, -26]], ink, 2);
      g.poly([[-24, -38], [24, -32], [24, -26], [-24, -26]], ink);
      for (var i = 0; i < 4; i++) g.poly([[-20 + i * 12, -37], [-14 + i * 12, -36], [-18 + i * 12, -27], [-24 + i * 12, -28]], warm);
    },
    pot: function (g, ink, warm, far) {
      g.poly([[-18, -22], [18, -22], [14, 0], [-14, 0]], far);
      g.path([[-18, -22], [18, -22], [14, 0], [-14, 0], [-18, -22]], ink, 2);
      g.line(-22, -22, 22, -22, ink, 3);
      g.path([[-8, -30], [-4, -38], [-10, -46]], ink, 2);
      g.path([[8, -30], [12, -40], [6, -48]], ink, 2);
    },
    flag: function (g, ink, warm, far) {
      g.line(0, 0, 0, -60, ink, 3);
      g.poly([[0, -60], [30, -50], [0, -40]], warm);
      g.path([[0, -60], [30, -50], [0, -40]], ink, 2);
    },
    clock: function (g, ink, warm, far) {
      g.line(0, 0, 0, -18, ink, 3);
      g.ellipse(0, -40, 20, 20, warm);
      g.path([[-20, -40], [-20, -40]], ink, 2);
      g.ellipse(0, -40, 17, 17, far);
      g.line(0, -40, 0, -52, ink, 3); g.line(0, -40, 10, -36, ink, 3);
    },
    frame: function (g, ink, warm, far) {
      g.rect(-20, -54, 40, 44, warm);
      g.path([[-20, -54], [20, -54], [20, -10], [-20, -10], [-20, -54]], ink, 2);
      g.rect(-13, -47, 26, 30, far);
      g.line(0, -10, 0, 0, ink, 3);
    }
  };

  /* Тема — это набор предметов. Вейб-кодинг разложен подробно: у бота,
     дашборда и лендинга не должно быть одного и того же монитора. */
  var THEMES = [
    /* Порядок важен: сначала узкое, потом общее — побеждает первое совпадение. */

    /* ——— вейб-кодинг: что люди на самом деле собирают ——— */
    { id: 'bot',        re: /бот[а-я]*(?![а-яё])|телеграм|telegram|дискорд|discord|вотсап|whatsapp|чат.?бот|автоответ/i,          props: ['chatbubble', 'monitor', 'antenna'] },
    { id: 'agent',      re: /агент|llm|нейросет|gpt|claude|промпт|автономн|мультиагент|(?<![а-яёa-z])(ии|ai)(?![а-яёa-z])/i, props: ['robotarm', 'chatbubble', 'server'] },
    { id: 'rag',        re: /база знаний|поиск по|rag\b|эмбеддинг|векторн|семантическ.{0,6}поиск|индекс/i,                 props: ['books', 'magnifier', 'server'] },
    { id: 'imagegen',   re: /генерац.{0,8}картин|генерац.{0,8}изображ|midjourney|stable diffusion|нейрокартин|аватар/i,    props: ['frame', 'palette', 'monitor'] },
    { id: 'voice',      re: /голос|речь|транскриб|распознав.{0,6}речи|озвуч|tts|stt|диктофон/i,                            props: ['mic', 'headphones', 'laptop'] },
    { id: 'videotool',  re: /видеоредакт|нарезк.{0,6}видео|субтитр|рендер.{0,6}видео|шортс|reels|стрим/i,                  props: ['clapper', 'monitor', 'camera'] },
    { id: 'web',        re: /сайт|лендинг|веб|страничк|портал|витрин/i,                                                    props: ['browser', 'laptop', 'papers'] },
    { id: 'shop',       re: /магазин|интернет.?магазин|товар|корзин|оплат|подписк|маркетплейс|прайс/i,                     props: ['cart', 'coins', 'browser'] },
    { id: 'mobile',     re: /мобильн|прилож|ios|android|swift|flutter|react native|(?<![а-яёa-z])app(?![а-яёa-z])/i,       props: ['phone', 'laptop', 'papers'] },
    { id: 'extension',  re: /расширен.{0,14}браузер|плагин|букмарклет|chrome extension|аддон/i,                             props: ['browser', 'gears', 'terminal'] },
    { id: 'dashboard',  re: /дашборд|дэшборд|панел|метрик|отчётност|отчетност|табло|мониторинг/i,                          props: ['dashboard', 'monitor', 'papers'] },
    { id: 'automation', re: /автоматизац|скрипт|пайплайн|вебхук|n8n|zapier|make\.com|крон|бекап/i,                         props: ['gears', 'robotarm', 'cable'] },
    { id: 'integration',re: /интеграц|api\b|синхрониз|коннектор|обмен данн|импорт|экспорт/i,                               props: ['cable', 'server', 'gears'] },
    { id: 'data',       re: /данн|база|бд(?![а-яё])|парсер|скрап|аналитик|дата.?сет|sql|таблиц|выгрузк/i,                          props: ['server', 'dashboard', 'papers'] },
    { id: 'devtool',    re: /инструмент|тул(?![а-яё])|утилит|cli\b|терминал|библиотек|фреймворк|генератор кода|линтер/i,           props: ['terminal', 'laptop', 'cable'] },
    { id: 'game',       re: /игр[аыуе](?![а-яё])|игров|геймдев|платформер|квест|unity|godot|пиксель.?арт|левел/i,                  props: ['gamepad', 'monitor', 'terminal'] },
    { id: 'genart',     re: /генератив|шейдер|процедурн|креативн.{0,8}код|three\.?js|p5|воксел|фрактал|визуализатор/i,      props: ['monitor', 'palette', 'easel'] },
    { id: 'hardware',   re: /железк|ардуин|arduino|распберр|raspberry|датчик|устройств|led|iot|робот|3d.?принт/i,          props: ['antenna', 'cable', 'gears'] },
    { id: 'notes',      re: /заметк|таск|todo|трекер|планировщ|второй мозг|obsidian|notion|органайзер/i,                   props: ['papers', 'calendar', 'laptop'] },
    { id: 'calendar',   re: /календар|расписан|букинг|запись на|слот|напоминалк|таймер|помодор/i,                          props: ['calendar', 'clock', 'phone'] },
    { id: 'finance',    re: /финанс|бюджет|расход|доход|инвест|крипт|бухгалт|счёт|счет[аов]|налог/i,                       props: ['coins', 'dashboard', 'papers'] },
    { id: 'crm',        re: /crm|клиентск.{0,6}баз|воронк|лид|сделк|продаж.{0,6}учёт/i,                                    props: ['dashboard', 'envelope', 'desk'] },
    { id: 'mail',       re: /почт|рассыл|письм|инбокс|спам|ньюслеттер|newsletter|подписчик/i,                                       props: ['envelope', 'laptop', 'papers'] },
    { id: 'social',     re: /соцсет|инстаграм|instagram|тикток|контент.?план|сторис|посты|комьюнити.?платформ/i,           props: ['phone', 'camera', 'dashboard'] },
    { id: 'map',        re: /карт[аыуе](?![а-яё])|гео|маршрут.{0,6}на карт|локац|навигац|путеводител/i,                             props: ['globe', 'flag', 'phone'] },
    { id: 'portfolio',  re: /портфолио|резюме|визитк|персональн.{0,8}сайт|о себе/i,                                        props: ['browser', 'frame', 'camera'] },
    { id: 'edtech',     re: /тренажёр|тренажер|квиз|тест[ыа](?![а-яё])|карточк.{0,6}для запоминан|флешкарт|симулятор обучен/i,     props: ['board', 'phone', 'books'] },
    { id: 'health',     re: /трекер.{0,10}(сна|привыч|настроен)|дневник самочувств|пульс|шаги|калор/i,                     props: ['dashboard', 'mat', 'phone'] },

    /* ——— проекты не про экран ——— */
    { id: 'photo',      re: /фотограф|фотопроект|съём|съем|снима|камер|плёнк|пленк|объектив|кадр|портретн/i,               props: ['camera', 'filmreel', 'frame'] },
    { id: 'film',       re: /фильм|кино|документал|короткометраж|сценар.{0,6}съём|режисс/i,                                props: ['clapper', 'camera', 'easel'] },
    { id: 'music',      re: /музык|трек|песн|альбом|микрофон|подкаст|саунд|бит(?![а-яё])|синтез|аранжир|концерт/i,                 props: ['mic', 'speaker', 'headphones'] },
    { id: 'text',       re: /текст|пиш[уе]|стать|книг|роман|сценар|блог|редактур|перевод|дневник|эссе|мемуар/i,           props: ['papers', 'books', 'laptop'] },
    { id: 'design',     re: /дизайн|интерфейс|макет|бренд|логотип|иллюстрац|верстк|типограф|фигм|(?<![а-яёa-z])(ui|ux)(?![а-яёa-z])/i, props: ['tablet', 'palette', 'monitor'] },
    { id: 'teach',      re: /курс|лекц|обуч|учеб|студент|воркшоп|мастер.?класс|препода|лаборатор|школ|вебинар|методич/i,   props: ['board', 'papers', 'laptop'] },
    { id: 'research',   re: /исслед|ресёрч|ресерч|анализ|интервью|гипотез|опрос|разбор|аудит|стратег|конкурент/i,          props: ['board', 'magnifier', 'papers'] },
    { id: 'art',        re: /искусств|выставк|картин|художн|скульптур|инсталляц|перформанс|арт.?проект|галере/i,           props: ['easel', 'frame', 'palette'] },
    { id: 'body',       re: /тел[оа](?![а-яё])|спорт|бег(?![а-яё])|йог|танц|здоров|практик|дыхан|медитац|сон(?![а-яё])|привычк|зал(?![а-яё])/i,           props: ['mat', 'dumbbell', 'plantpot'] },
    { id: 'therapy',    re: /терапи|психолог|выгоран|тревог|самопознан|коуч|рефлекс|границ/i,                              props: ['plantpot', 'papers', 'clock'] },
    { id: 'lang',       re: /язык|английск|испанск|немецк|словарн|дуолинго|разговорн.{0,6}практик/i,                       props: ['books', 'headphones', 'papers'] },
    { id: 'home',       re: /ремонт|переезд|кварти|стройк|обустро|мебел|дач|дом(?![а-яё])/i,                                       props: ['boxes', 'ladder', 'frame'] },
    { id: 'garden',     re: /сад|растен|огород|цвет[ыокав]|лес(?![а-яё])|природ|земл|посад|урожай|ферм/i,                            props: ['beds', 'watering', 'plantpot'] },
    { id: 'food',       re: /еда|кулинар|рецепт|готов.{0,6}блюд|ресторан|кофе|пекарн|меню/i,                               props: ['pot', 'desk', 'books'] },
    { id: 'event',      re: /мероприят|фестивал|конференц|вечеринк|ретрит|организ.{0,6}событ|тусовк/i,                     props: ['flag', 'sign', 'board'] },
    { id: 'community',  re: /сообществ|комьюнити|клуб|кружок|встреч.{0,6}люд|нетворк|коллектив/i,                          props: ['sign', 'desk', 'flag'] },
    { id: 'travel',     re: /путешеств|поездк|виз[аыу]|маршрут|тур(?![а-яё])|релокац|эмиграц/i,                                    props: ['suitcase', 'globe', 'flag'] },
    { id: 'archive',    re: /архив|разобрать фот|семейн.{0,6}истор|память|наследи|оцифров|коллекц/i,                       props: ['boxes', 'filmreel', 'books'] },
    { id: 'business',   re: /бизнес|клиент|запуск|деньг|выручк|услуг|заказ|агентств|стартап|фриланс/i,                     props: ['sign', 'desk', 'coins'] }
  ];

  /* Тем может совпасть несколько — берём предметы по кругу, чтобы получилась
     смесь, а не три одинаковых экрана. */
  function propsFromThemes(themes) {
    var out = [];
    for (var round = 0; round < 3; round++) {
      for (var i = 0; i < themes.length; i++) {
        var id = themes[i].props[round];
        if (id && out.indexOf(id) < 0 && out.length < 4) out.push(id);
      }
    }
    return out;
  }

  function themesOf(text) {
    if (!text) return [];
    var found = [];
    for (var i = 0; i < THEMES.length && found.length < 3; i++) {
      if (THEMES[i].re.test(text)) found.push(THEMES[i]);
    }
    return found;
  }

  /* Готовый список предметов: сначала то, что уже разобрано снаружи (в том
     числе моделью), потом ключевые слова. */
  function propsFor(project) {
    var p = project || {};
    if (p.props && p.props.length) {
      return p.props.filter(function (id) { return PROPS[id]; }).slice(0, 4);
    }
    var byWords = propsFromThemes(themesOf(p.aboutText || p.about || ''));
    if (byWords.length) return byWords;
    /* ничего не опознали — пусть место всё равно будет обжитым, а не голым */
    return ['desk', 'papers', 'plantpot'];
  }

  function spaceOf(project) {
    var p = project || {};
    return {
      light: LIGHTS[p.state === undefined ? 0 : p.state] || LIGHTS[0],
      result: p.result === undefined ? 0 : p.result,
      rhythm: p.rhythm === undefined ? 0 : p.rhythm,
      wish: wishKind(p.wishText || p.wish),
      props: propsFor(p)
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

    /* предметы из описания проекта: ближний крупно, остальные дальше и мельче */
    var spots = [
      { x: W * 0.68, y: H * 0.92, k: H / 290 },
      { x: W * 0.92, y: H * 0.78, k: H / 480 },
      { x: W * 0.53, y: H * 0.71, k: H / 780 },
      { x: W * 0.8,  y: H * 0.68, k: H / 1000 }
    ];
    S.props.forEach(function (id, i) {
      var s = spots[i];
      if (!s || !PROPS[id]) return;
      PROPS[id](local(pen, s.x, s.y, s.k), L.ink, L.warm, L.far);
    });

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
    themesOf: themesOf,
    propsFromThemes: propsFromThemes,
    propsFor: propsFor,
    THEMES: THEMES,
    PROPS: PROPS,
    drawSpace: drawSpace,
    canvasPen: canvasPen
  };
});
