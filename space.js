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

  var THEMES = [
    {
      id: 'photo',
      re: /фото|съём|съем|снима|камер|плёнк|пленк|объектив|кадр|портрет|видео|монтаж|ролик/i,
      draw: function (g, ink, warm, far) {
        g.line(0, 0, -14, -46, ink, 3); g.line(0, 0, 14, -46, ink, 3); g.line(4, 0, 0, -46, ink, 2);
        g.rect(-16, -64, 32, 20, warm);
        g.path([[-16, -64], [16, -64], [16, -44], [-16, -44], [-16, -64]], ink, 2);
        g.ellipse(2, -54, 7, 7, far); g.ellipse(2, -54, 3, 3, ink);
        g.rect(-13, -68, 8, 4, ink);
      }
    },
    {
      id: 'sound',
      re: /музык|звук|трек|песн|альбом|запис.{0,3}звук|микрофон|подкаст|саунд|бит|синтез/i,
      draw: function (g, ink, warm, far) {
        g.line(-2, 0, -2, -52, ink, 3);
        g.ellipse(-2, -58, 6, 8, ink);
        g.path([[-12, 0], [8, 0]], ink, 3);
        g.rect(22, -34, 22, 34, warm);
        g.path([[22, -34], [44, -34], [44, 0], [22, 0], [22, -34]], ink, 2);
        g.ellipse(33, -24, 6, 6, far); g.ellipse(33, -9, 3, 3, far);
      }
    },
    {
      id: 'text',
      re: /текст|пиш|стать|книг|роман|сценар|блог|рассылк|редактур|перевод|дневник|эссе/i,
      draw: function (g, ink, warm, far) {
        g.rect(-26, -10, 40, 10, warm);
        g.rect(-22, -19, 40, 9, warm);
        g.rect(-25, -27, 38, 8, warm);
        g.path([[-26, -10], [14, -10], [14, 0], [-26, 0], [-26, -10]], ink, 2);
        g.path([[-25, -27], [13, -27], [13, -19]], ink, 2);
        g.poly([[24, -14], [44, -20], [44, -2], [24, -2]], far);
        g.path([[24, -14], [44, -20], [44, -2], [24, -2], [24, -14]], ink, 2);
      }
    },
    {
      id: 'code',
      re: /код|разработ|програм|бот|сервис|приложен|скрипт|бэкенд|фронт|api|дата|модел|нейрон|агент/i,
      draw: function (g, ink, warm, far) {
        g.rect(-24, -46, 48, 32, warm);
        g.path([[-24, -46], [24, -46], [24, -14], [-24, -14], [-24, -46]], ink, 2);
        g.line(-16, -38, 6, -38, ink, 2); g.line(-16, -32, 14, -32, ink, 2); g.line(-16, -26, -2, -26, ink, 2);
        g.line(0, -14, 0, -4, ink, 3); g.line(-14, -4, 14, -4, ink, 3);
        g.path([[26, -8], [38, -16], [50, -6]], far, 3);
      }
    },
    {
      id: 'design',
      re: /дизайн|интерфейс|макет|бренд|логотип|иллюстрац|верстк|типограф|сетк|ui|ux/i,
      draw: function (g, ink, warm, far) {
        g.rect(-22, -40, 40, 40, warm);
        g.path([[-22, -40], [18, -40], [18, 0], [-22, 0], [-22, -40]], ink, 2);
        g.line(-22, -27, 18, -27, far, 2); g.line(-22, -14, 18, -14, far, 2); g.line(-9, -40, -9, 0, far, 2);
        g.line(26, -4, 34, -44, ink, 3);
        g.poly([[33, -44], [37, -44], [35, -52]], ink);
      }
    },
    {
      id: 'teach',
      re: /курс|лекц|обуч|учеб|студент|воркшоп|мастер.?класс|препода|программ.{0,4}обуч|лаборатор|школ/i,
      draw: function (g, ink, warm, far) {
        g.rect(-34, -52, 68, 40, far);
        g.path([[-34, -52], [34, -52], [34, -12], [-34, -12], [-34, -52]], ink, 2);
        g.line(-24, -40, 10, -40, warm, 3); g.line(-24, -30, 20, -30, warm, 3);
        g.line(-26, -12, -26, 0, ink, 3); g.line(26, -12, 26, 0, ink, 3);
        g.path([[44, 0], [44, -14], [56, -14]], ink, 3); g.line(44, -14, 44, -22, ink, 3);
      }
    },
    {
      id: 'research',
      re: /исслед|ресёрч|ресерч|анализ|интервью|гипотез|данн|опрос|разбор|аудит|стратег/i,
      draw: function (g, ink, warm, far) {
        g.rect(-30, -54, 60, 44, warm);
        g.path([[-30, -54], [30, -54], [30, -10], [-30, -10], [-30, -54]], ink, 2);
        for (var i = 0; i < 3; i++)
          for (var j = 0; j < 2; j++) g.rect(-24 + i * 18, -48 + j * 18, 12, 12, far);
        g.line(0, -10, 0, 0, ink, 3);
        g.ellipse(44, -22, 9, 9, far); g.path([[44, -22], [44, -22]], ink, 2);
        g.line(50, -16, 58, -4, ink, 3);
      }
    },
    {
      id: 'body',
      re: /тел[оа]|спорт|бег|йог|танц|練|здоров|практик|дыхан|медитац|сон|привычк/i,
      draw: function (g, ink, warm, far) {
        g.poly([[-38, 0], [-6, -8], [22, -8], [-10, 0]], warm);
        g.path([[-38, 0], [-6, -8], [22, -8], [-10, 0], [-38, 0]], ink, 2);
        g.line(26, -10, 52, -10, ink, 3);
        g.rect(24, -18, 8, 16, ink); g.rect(48, -18, 8, 16, ink);
      }
    },
    {
      id: 'home',
      re: /дом|ремонт|переезд|кварти|мастерск|стройк|обустро|мебел|дач/i,
      draw: function (g, ink, warm, far) {
        g.rect(-30, -22, 30, 22, warm);
        g.path([[-30, -22], [0, -22], [0, 0], [-30, 0], [-30, -22]], ink, 2);
        g.line(-30, -12, 0, -12, ink, 2);
        g.rect(-24, -40, 22, 18, far);
        g.path([[-24, -40], [-2, -40], [-2, -22], [-24, -22], [-24, -40]], ink, 2);
        g.line(16, 0, 24, -46, ink, 3); g.line(38, 0, 30, -46, ink, 3);
        for (var i = 1; i <= 3; i++) g.line(18 + i * 1.6, -i * 11, 36 - i * 1.6, -i * 11, ink, 2);
      }
    },
    {
      id: 'garden',
      re: /сад|растен|огород|цвет|лес|природ|земл|посад|урожай|ферм/i,
      draw: function (g, ink, warm, far) {
        for (var i = 0; i < 3; i++) {
          g.path([[-34 + i * 24, 0], [-28 + i * 24, -12], [-22 + i * 24, 0]], far, 3);
          g.line(-28 + i * 24, 0, -28 + i * 24, -14, ink, 2);
        }
        g.rect(30, -20, 22, 16, warm);
        g.path([[30, -20], [52, -20], [52, -4], [30, -4], [30, -20]], ink, 2);
        g.path([[52, -16], [62, -22], [62, -18]], ink, 3);
      }
    },
    {
      id: 'business',
      re: /бизнес|клиент|продаж|запуск|деньг|выручк|магазин|услуг|заказ|агентств|стартап/i,
      draw: function (g, ink, warm, far) {
        g.rect(-30, -50, 60, 26, warm);
        g.path([[-30, -50], [30, -50], [30, -24], [-30, -24], [-30, -50]], ink, 2);
        g.line(-20, -24, -20, 0, ink, 3); g.line(20, -24, 20, 0, ink, 3);
        g.line(-20, -40, 16, -40, far, 3); g.line(-20, -32, 6, -32, far, 3);
      }
    },
    {
      id: 'art',
      re: /искусств|выставк|картин|художн|скульптур|инсталляц|галере|арт|перформанс/i,
      draw: function (g, ink, warm, far) {
        g.line(-18, 0, -4, -50, ink, 3); g.line(18, 0, 4, -50, ink, 3); g.line(0, -20, 0, 0, ink, 3);
        g.rect(-22, -56, 44, 34, warm);
        g.path([[-22, -56], [22, -56], [22, -22], [-22, -22], [-22, -56]], ink, 2);
        g.poly([[-14, -28], [0, -48], [14, -28]], far);
      }
    }
  ];

  /* До трёх тем: пространство должно намекать, а не превращаться в склад. */
  function themesOf(text) {
    if (!text) return [];
    var found = [];
    for (var i = 0; i < THEMES.length && found.length < 3; i++) {
      if (THEMES[i].re.test(text)) found.push(THEMES[i]);
    }
    return found;
  }

  function spaceOf(project) {
    var p = project || {};
    return {
      light: LIGHTS[p.state === undefined ? 0 : p.state] || LIGHTS[0],
      result: p.result === undefined ? 0 : p.result,
      rhythm: p.rhythm === undefined ? 0 : p.rhythm,
      wish: wishKind(p.wishText || p.wish),
      themes: themesOf(p.aboutText || p.about || '')
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
      { x: W * 0.7,  y: H * 0.9,  k: H / 290 },
      { x: W * 0.92, y: H * 0.76, k: H / 520 },
      { x: W * 0.54, y: H * 0.7,  k: H / 820 }
    ];
    S.themes.forEach(function (th, i) {
      var s = spots[i];
      th.draw(local(pen, s.x, s.y, s.k), L.ink, L.warm, L.far);
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
    THEMES: THEMES,
    drawSpace: drawSpace,
    canvasPen: canvasPen
  };
});
