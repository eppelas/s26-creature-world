/* S26 Creature — геном, архетипы, геометрия.
 *
 * Модуль универсальный: в Node подключается через require, в браузере грузится
 * тегом script и кладёт себя в window.Creature. Один источник правды для бота
 * и для стенда форм, чтобы они не разъезжались.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Creature = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============================ seeded rng ============================ */

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function rngFrom(seedStr) {
    var h = hashStr(String(seedStr)) || 1;
    return function () {
      h ^= h << 13; h >>>= 0;
      h ^= h >> 17;
      h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    };
  }

  /* Сид уезжает в публичный world.json вместе с существом, поэтому он обязан
     быть непрозрачным: ни telegram id, ни формулировок человека в нём быть не
     должно. Два хеша с разной солью дают 64 бита — обратно не разворачивается. */
  function opaqueSeed(input) {
    return hashStr('s26a|' + input).toString(36) + hashStr('s26b|' + input).toString(36);
  }

  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }
  function between(rnd, a, b) { return a + rnd() * (b - a); }
  function chance(rnd, p) { return rnd() < p; }

  /* ============================== questions ============================== */

  var QUESTIONS = [
    {
      key: 'body', trait: 'тело',
      text: 'Как ты начинаешь проект?',
      options: ['Сразу руками', 'Долго обдумываю', 'Собираю референсы', 'Зову кого-то']
    },
    {
      key: 'legs', trait: 'опора',
      text: 'Сколько проектов ведёшь параллельно?',
      options: ['Один', 'Два-три', 'Пять и больше', 'Не считаю']
    },
    {
      key: 'ant', trait: 'антенны',
      text: 'Что уже отдал машине?',
      options: ['Ничего', 'Тексты', 'Рутину', 'Решения']
    },
    {
      key: 'eye', trait: 'сенсор',
      text: 'Как понимаешь, что получилось?',
      options: ['По метрике', 'По чутью', 'По чужому отклику', 'Никак']
    },
    {
      key: 'pal', trait: 'окрас',
      text: 'Что тебя вырубает?',
      options: ['Переключения', 'Рутина', 'Неясность', 'Одиночество']
    },
    {
      key: 'tempo', trait: 'повадка',
      text: 'Твой темп?',
      options: ['Спринты', 'Марафон', 'Рывками', 'Поток']
    }
  ];

  var GENOME_KEYS = QUESTIONS.map(function (q) { return q.key; });

  /* Второй блок: существо селится в проект. Проект — это пространство, в
     котором оно живёт, поэтому ответы задают не тело, а место.
     type 'text' — человек пишет свободно, 'choice' — кнопки, но текст тоже
     принимается. */
  var PROJECT_QUESTIONS = [
    {
      key: 'about', type: 'text', trait: 'место',
      text: 'Расскажи про проект своими словами. Чем ты правда занят эти три недели, что там за история. Можно длинно.'
    },
    {
      key: 'state', type: 'choice', trait: 'свет',
      text: 'Из какого состояния ты хочешь его делать?',
      options: ['Спокойно и ровно', 'На азарте', 'Из любопытства', 'Собранно, без лишнего'],
      hints: [
        [/споко|ровн|тих|размерен|без спешк|мягк/i, 0],
        [/азарт|драйв|жар|огон|весел|кайф|быстр/i, 1],
        [/любопыт|интерес|исслед|поигра|попроб|разобра/i, 2],
        [/собран|чётк|четк|дисциплин|без лишн|фокус|строг/i, 3]
      ]
    },
    {
      key: 'result', type: 'choice', trait: 'горизонт',
      text: 'Как ты поймёшь, что эти три недели прошли не зря?',
      options: ['Будет готовая вещь', 'Пойму, куда дальше', 'Перестанет висеть грузом', 'Захочется продолжать'],
      hints: [
        [/готов|сдела|запущ|выпущ|доделa|результат|вещь|продукт/i, 0],
        [/пойм|ясност|направлен|куда дальш|решу|определ/i, 1],
        [/груз|висит|отпуст|закро|перестан|тревог|долг/i, 2],
        [/продолж|захочет|втян|полюб|не брош|интерес/i, 3]
      ]
    },
    {
      key: 'rhythm', type: 'choice', trait: 'ритм',
      text: 'Сколько внимания ты честно готов ему давать? Отвечай как есть, я подстрою напоминания.',
      options: ['Каждый день понемногу', 'Пару раз в неделю', 'Рывками, когда пойдёт', 'Не знаю, посмотрим'],
      hints: [
        [/кажд.{0,4}день|ежеднев|понемног|по чуть|регуляр/i, 0],
        [/пару раз|два раза|раз в недел|несколько раз/i, 1],
        [/рывк|когда пойд|волн|наплыв|запо[её]м|как получ/i, 2],
        [/не знаю|посмотр|без поня|не могу сказать/i, 3]
      ]
    },
    {
      key: 'wish', type: 'text', trait: 'предмет',
      text: 'И последнее. Что должно появиться в этом пространстве, чтобы тебе было в нём хорошо? Что угодно: окно, музыка, живой человек рядом, тишина.'
    }
  ];

  /* Ритм — не украшение: он задаёт, как часто существо напоминает о себе и как
     быстро тускнеет. Тот, кто честно сказал «пару раз в неделю», не должен
     наказываться так же, как тот, кто обещал каждый день. */
  var RHYTHM = [
    { nudgeHours: 22,  patience: 1.0 },
    { nudgeHours: 72,  patience: 2.2 },
    { nudgeHours: 110, patience: 3.0 },
    { nudgeHours: 60,  patience: 1.8 }
  ];

  /* Кнопки — быстрый путь, но отвечать можно и просто текстом: человек пишет,
     и это сразу ответ на открытый вопрос. Свои слова должны читаться на
     существе, а не проваливаться в рандом, поэтому сначала ищем смысл по
     корням и только потом берём хеш. */
  var FREEFORM_HINTS = {
    body: [
      [/рук|сраз|делаю|пробу|прототип|наскок|копа/i, 0],
      [/дума|обдум|планир|обмозг|голов|вынашива|размышл/i, 1],
      [/референс|собира|исслед|чита|смотр|ищу|насмотр|копл/i, 2],
      [/зову|с кем|команд|обсужд|спрашива|вместе|людь|партн/i, 3]
    ],
    legs: [
      [/^\D*1\D*$|один|одна|только один/i, 0],
      [/^\D*[234]\D*$|два|две|три|четыре|пара/i, 1],
      [/^\D*([5-9]|\d{2,})\D*$|пять|шесть|семь|восемь|девять|десять|много/i, 2],
      [/не счита|не знаю|куча|бесконеч|хрен知|сбилась|сбился/i, 3]
    ],
    ant: [
      [/ничего|ничем|нет|никак|не отда/i, 0],
      [/текст|письм|посты|постинг|копирайт|стать[ьи]|сценар|перевод|редакт|описан/i, 1],
      [/рутин|таблиц|почт|отчёт|отчет|разбор|сортир|формат|поиск|ресёрч|ресерч/i, 2],
      [/решен|выбор|стратег|планир|приорит|думать|решать/i, 3]
    ],
    eye: [
      [/метрик|цифр|числ|данн|измер|статист|график/i, 0],
      [/чуть|чувств|интуиц|ощущ|нравит|нутр/i, 1],
      [/отклик|отзыв|люди|говор|обратн|реакц|показыва/i, 2],
      [/никак|не понима|не знаю|непонятн/i, 3]
    ],
    pal: [
      [/переключ|контекст|дёрга|дерга|скач|отвлек|уведомл|созвон|встреч/i, 0],
      [/рутин|однообраз|скучн|повтор|механич|бессмысл/i, 1],
      [/неясн|непонят|туман|неопредел|размыт|хаос|не знаю|непредсказ/i, 2],
      [/одиноч|один|сам|никто|без обратной|не с кем/i, 3]
    ],
    tempo: [
      [/спринт|быстр|наскок|коротк|рывок дн/i, 0],
      [/марафон|ровн|стабильн|каждый день|понемног|размерен/i, 1],
      [/рывк|неровн|то густо|запо[её]м|волн|скачк/i, 2],
      [/поток|плыв|течен|само ид|непрерывн/i, 3]
    ]
  };

  var UNUSED_HINTS = {
    _old: [
      [/ничего|ничем|нет|никак|не отда/i, 0],
      [/текст|письм|посты|постинг|копирайт|стать[ьи]|сценар|перевод|редакт|описан/i, 1],
      [/рутин|таблиц|почт|отчёт|отчет|разбор|сортир|формат|поиск|ресёрч|ресерч/i, 2],
      [/решен|выбор|стратег|планир|приорит|думать|решать/i, 3]
    ],
    pal: [
      [/переключ|контекст|дёрга|дерга|скач|отвлек|уведомл|созвон|встреч/i, 0],
      [/рутин|однообраз|скучн|повтор|механич|бессмысл/i, 1],
      [/неясн|непонят|туман|неопредел|размыт|хаос|не знаю|непредсказ/i, 2],
      [/одиноч|один|сам|никто|без обратной|не с кем/i, 3]
    ]
  };

  function matchHints(hints, key, text) {
    if (hints) {
      for (var i = 0; i < hints.length; i++) if (hints[i][0].test(text)) return hints[i][1];
    }
    return hashStr(key + '|' + text.toLowerCase()) % 4;
  }

  function mapFreeform(key, text) {
    return matchHints(FREEFORM_HINTS[key], key, text);
  }

  function mapProjectAnswer(q, text) {
    return matchHints(q.hints, q.key, text);
  }

  function genomeCode(g) {
    return 'B' + g.body + '·L' + g.legs + '·A' + g.ant + '·E' + g.eye + '·P' + g.pal + '·T' + g.tempo;
  }

  /* ============================== archetypes ============================== */
  /* Ответ на первый вопрос выбирает семью, сид внутри семьи выбирает вид.
     Поэтому одинаковые ответы всё равно дают разные тела. */

  var FAMILIES = [
    ['hand', 'worm', 'spool'],
    ['stack', 'box'],
    ['swarm', 'eye'],
    ['pair', 'jelly']
  ];

  var GENUS = {
    hand:  { name: 'Ладонь',  gender: 'f' },
    worm:  { name: 'Ползун',  gender: 'm' },
    spool: { name: 'Катушка', gender: 'f' },
    stack: { name: 'Стопка',  gender: 'f' },
    box:   { name: 'Коробка', gender: 'f' },
    swarm: { name: 'Роевик',  gender: 'm' },
    eye:   { name: 'Гляделка', gender: 'f' },
    pair:  { name: 'Сцепка',  gender: 'f' },
    jelly: { name: 'Медуза',  gender: 'f' }
  };

  var LEGWORD = {
    m: ['одноногий', 'двуногий', 'многоногий', 'катучий'],
    f: ['одноногая', 'двуногая', 'многоногая', 'катучая']
  };
  var ANTWORD = {
    m: ['', 'с антенной', 'трёхрогий', 'оснащённый'],
    f: ['', 'с антенной', 'трёхрогая', 'оснащённая']
  };
  var EYEWORD = {
    m: ['зрячий', 'фасеточный', 'глазастый', 'слепой'],
    f: ['зрячая', 'фасеточная', 'глазастая', 'слепая']
  };
  /* сид добавляет к имени личную кличку, чтобы двух одинаковых подписей не было */
  var NICK = [
    'ржавый', 'тихий', 'быстрый', 'косой', 'мятый', 'звонкий', 'тёплый', 'колючий',
    'сонный', 'резкий', 'мокрый', 'сухой', 'кривой', 'пыльный', 'гулкий', 'липкий',
    'рыхлый', 'тугой', 'мелкий', 'долгий', 'острый', 'мягкий', 'дальний', 'ближний'
  ];
  var NICK_F = {
    'ржавый': 'ржавая', 'тихий': 'тихая', 'быстрый': 'быстрая', 'косой': 'косая',
    'мятый': 'мятая', 'звонкий': 'звонкая', 'тёплый': 'тёплая', 'колючий': 'колючая',
    'сонный': 'сонная', 'резкий': 'резкая', 'мокрый': 'мокрая', 'сухой': 'сухая',
    'кривой': 'кривая', 'пыльный': 'пыльная', 'гулкий': 'гулкая', 'липкий': 'липкая',
    'рыхлый': 'рыхлая', 'тугой': 'тугая', 'мелкий': 'мелкая', 'долгий': 'долгая',
    'острый': 'острая', 'мягкий': 'мягкая', 'дальний': 'дальняя', 'ближний': 'ближняя'
  };

  /* Личное имя из слогов: пространство в сотни тысяч вариантов, чтобы подписи
     не совпадали так же, как не совпадают тела. */
  var CONS = ['б','в','г','д','ж','з','к','л','м','н','п','р','с','т','ф','х','ц','ч','ш','щ'];
  var VOW = ['а','о','у','э','ы','и','е','я'];
  var TAIL = ['', '', '', 'к', 'н', 'р', 'с', 'т', 'ль', 'нь', 'ш', 'п'];

  function personalName(tr) {
    var rnd = rngFrom(tr.seed + '|name');
    var syl = 2 + (rnd() < 0.3 ? 1 : 0);
    var out = '';
    for (var i = 0; i < syl; i++) out += pick(rnd, CONS) + pick(rnd, VOW);
    out += pick(rnd, TAIL);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  function speciesName(g, tr) {
    var meta = GENUS[tr.arch];
    var gd = meta.gender;
    var nick = gd === 'f' ? NICK_F[tr.nick] : tr.nick;
    var tail = g.ant ? ANTWORD[gd][g.ant] : EYEWORD[gd][g.eye];
    return meta.name + ' ' + nick + ', ' + LEGWORD[gd][g.legs] + (tail ? ' ' + tail : '');
  }

  function fullName(g, tr) {
    return personalName(tr) + ' — ' + speciesName(g, tr).toLowerCase();
  }

  /* ============================== palettes ============================== */
  /* [0] масса · [1] акцент · [2] светлое · [3] тёмное · [4] кончик */

  var PALETTES = [
    ['#b9bcba', '#dc2626', '#efece6', '#3a3a38', '#dc2626'],
    ['#6f7d7a', '#7fc6c0', '#dfeae7', '#22332f', '#7fc6c0'],
    ['#8d8778', '#c9922c', '#f0e8d7', '#3b352b', '#c9922c'],
    ['#6c7186', '#e7e2d7', '#c8cedd', '#2a2e3d', '#e7e2d7']
  ];

  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function rgbToHex(r, g, b) {
    function h(v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length < 2 ? '0' + s : s;
    }
    return '#' + h(r) + h(g) + h(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var l = (mx + mn) / 2, s = 0, h = 0;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    function f(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (s === 0) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  function shiftColor(hex, dh, ds, dl) {
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    var out = hslToRgb(
      (hsl[0] + dh + 1) % 1,
      Math.max(0, Math.min(1, hsl[1] + ds)),
      Math.max(0.04, Math.min(0.96, hsl[2] + dl))
    );
    return rgbToHex(out[0], out[1], out[2]);
  }
  function mixHex(hex, target, t) {
    var a = hexToRgb(hex), b = hexToRgb(target);
    return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }

  function paletteFor(g, tr) {
    var base = PALETTES[g.pal];
    return base.map(function (hex, i) {
      var s = tr.palShift[i];
      return shiftColor(hex, s[0], s[1], s[2]);
    });
  }

  /* ============================== traits ============================== */
  /* Всё, что сид решает поверх ответов. Никаких двух одинаковых существ:
     здесь около двадцати независимых величин, часть непрерывных. */

  function deriveTraits(genome, seed) {
    var rnd = rngFrom(seed);
    var family = FAMILIES[genome.body];
    var arch = family[Math.floor(rnd() * family.length) % family.length];

    var palShift = [];
    for (var i = 0; i < 5; i++) {
      palShift.push([
        between(rnd, -0.055, 0.055),                 // оттенок
        between(rnd, -0.14, 0.14),                   // насыщенность
        between(rnd, -0.07, 0.07)                    // светлота
      ]);
    }

    return {
      seed: String(seed),
      arch: arch,
      nick: pick(rnd, NICK),
      palShift: palShift,
      /* пропорции */
      girth: between(rnd, 0.78, 1.32),
      height: between(rnd, 0.82, 1.28),
      lean: between(rnd, -1.4, 1.4),
      asym: between(rnd, -1, 1),
      twist: between(rnd, -0.5, 0.5),
      /* счётные вещи */
      extraLimb: chance(rnd, 0.34) ? 1 : 0,
      segBonus: Math.floor(rnd() * 3),
      holeRate: between(rnd, 0.1, 0.4),
      /* причуды: чем больше, тем страннее */
      quirkHat: chance(rnd, 0.28),
      quirkTail: chance(rnd, 0.32),
      quirkSpeck: chance(rnd, 0.45),
      quirkLopsided: chance(rnd, 0.4),
      quirkStripe: chance(rnd, 0.3),
      /* угол на портрете */
      yaw: between(rnd, -0.62, 0.02)
    };
  }

  /* Отпечаток: если у двух людей совпал бы весь набор, сид пересевается. */
  function fingerprint(genome, tr) {
    var parts = GENOME_KEYS.map(function (k) { return genome[k]; }).join('') + '|' + tr.arch + '|' + tr.nick;
    var nums = [tr.girth, tr.height, tr.lean, tr.asym, tr.twist, tr.holeRate]
      .map(function (n) { return n.toFixed(3); }).join(',');
    var flags = [tr.extraLimb, tr.segBonus, tr.quirkHat, tr.quirkTail, tr.quirkSpeck,
                 tr.quirkLopsided, tr.quirkStripe].join('');
    var pal = tr.palShift.map(function (s) {
      return s.map(function (v) { return v.toFixed(3); }).join('/');
    }).join(';');
    return hashStr(parts + '|' + nums + '|' + flags + '|' + pal).toString(16);
  }

  /* ============================== egg ============================== */
  /* Половинная сетка: рисуется вдвое меньшим кубиком, поэтому силуэт гладкий. */

  var EGG_RES = 2;
  var EGG_PROFILE = [1.2, 2.2, 3.0, 3.6, 4.1, 4.5, 4.85, 5.1, 5.3, 5.4,
                     5.4, 5.3, 5.05, 4.7, 4.2, 3.5, 2.5, 1.2];

  function buildEgg(tr, crack) {
    var vox = [];
    var rnd = rngFrom(tr.seed + '|egg');
    var wobble = tr.girth * 0.5 + 0.5;
    for (var i = 0; i < EGG_PROFILE.length; i++) {
      var y = -12 + i;
      var r = EGG_PROFILE[i] * wobble;
      var ri = Math.ceil(r);
      for (var x = -ri; x <= ri; x++)
        for (var z = -ri; z <= ri; z++) {
          if (x * x + z * z > r * r) continue;
          var c = 2;
          if (i > EGG_PROFILE.length - 5 && rnd() < 0.22) c = 0;
          if (tr.quirkStripe && Math.abs(x + z) < 1.2 && i % 4 === 1) c = 0;
          if (crack > 0 && Math.abs(x - z) < 1.6 && i > 5 && i < 13 && rnd() < crack) c = 3;
          vox.push([x, y, z, c]);
        }
    }
    return vox;
  }

  /* ============================== bodies ============================== */
  /* Каждый архетип — своё тело со своими опорными точками. Общей «головы на
     туловище» нет намеренно: иначе всё сводится к гномам.
     Возвращает { footY, halfW, face:[x,y,z], antY, antX:[], legStyle? } */

  var BODIES = {

    /* «сразу руками» — ладонь с пальцами, глаз посажен в ладонь */
    hand: function (t, tr, rnd, add) {
      var pw = Math.max(2, Math.round((2 + t) * tr.girth));
      for (var x = -pw; x <= pw; x++)
        for (var y = 0; y <= 2; y++)
          for (var z = -1; z <= 1; z++) {
            var edge = Math.abs(x) + Math.abs(z) * 1.2;
            if (y === 0 && edge > pw + 0.7) continue;
            if (y === 2 && edge > pw + 1.2) continue;
            add(x, y, z, (x === -pw && y === 1) ? 1 : 0);
          }
      var lens = [3, 4, 2];
      var slots = [-pw + 1, 0, pw - 1];
      if (tr.extraLimb) { slots.push(pw); lens.push(2); }
      slots.forEach(function (sx, i) {
        var fl = Math.max(1, Math.round(lens[i] * (0.45 + t * 0.55) * tr.height));
        for (var fy = 1; fy <= fl; fy++)
          for (var fz = -1; fz <= 1; fz++) {
            if (Math.abs(fz) === 1 && fy === fl) continue;
            add(sx, -fy, fz, fy === fl ? 1 : 0);
          }
      });
      return { footY: 3, halfW: pw, face: [0, 1, -2], antY: -1, antX: [-pw, pw] };
    },

    /* «сразу руками» — ползун: сегменты цепочкой, голова впереди */
    worm: function (t, tr, rnd, add) {
      var segs = 3 + Math.round(t * 2) + tr.segBonus;
      var head = -Math.floor(segs / 2) * 2;
      for (var s = 0; s < segs; s++) {
        var cx = head + s * 2;
        var r = 1 + (s === 0 ? 1 : 0);
        var lift = Math.round(Math.sin(s * 0.9 + tr.twist * 3) * (tr.quirkLopsided ? 1.4 : 0.8));
        for (var x = -1; x <= 1; x++)
          for (var y = -r; y <= r; y++)
            for (var z = -1; z <= 1; z++) {
              if (Math.abs(x) + Math.abs(y) + Math.abs(z) > r + 1) continue;
              add(cx + x, y + lift, z, s % 2 && tr.quirkStripe ? 1 : 0);
            }
      }
      if (tr.quirkTail) { add(head + segs * 2, 0, 0, 1); add(head + segs * 2 + 1, -1, 0, 1); }
      return { footY: 2, halfW: Math.floor(segs), face: [head, -1, -2], antY: -2, antX: [head, head + 2] };
    },

    /* «сразу руками» — катушка: барабан с фланцами и разматывающаяся нить */
    spool: function (t, tr, rnd, add) {
      var R = Math.max(2, Math.round(3 * tr.girth));
      var W = 2;                                                  // полуширина барабана
      [-W, W].forEach(function (fx) {                             // фланцы по краям оси
        for (var y = -R; y <= R; y++)
          for (var z = -R; z <= R; z++) {
            if (y * y + z * z > R * R) continue;
            add(fx, y - R, z, (y * y + z * z > (R - 1) * (R - 1)) ? 1 : 0);
          }
      });
      for (var ax = -W + 1; ax <= W - 1; ax++)                    // намотка между ними
        for (var ay = -R + 1; ay <= R - 1; ay++)
          for (var az = -R + 1; az <= R - 1; az++) {
            if (ay * ay + az * az > (R - 1) * (R - 1)) continue;
            add(ax, ay - R, az, 0);
          }
      var thread = Math.round((2 + t * 6) * tr.height);           // нить = пройденный путь
      var tx = W, ty = -R, tz = R;
      for (var i = 0; i < thread; i++) {
        tx += 1;
        ty = -R + Math.round(Math.sin(i * 0.55 + tr.twist) * 2);
        tz = R - Math.round(i * 0.25);
        add(tx, ty, tz, 4);
      }
      return { footY: 1, halfW: R, face: [-W - 1, -R, 0], antY: -2 * R, antX: [0] };
    },

    /* «долго обдумываю» — стопка плит со сдвигом */
    stack: function (t, tr, rnd, add) {
      var slabs = 2 + Math.round(t * 2) + tr.segBonus;
      var topOff = 0, topY = 0;
      for (var s = 0; s < slabs; s++) {
        var hw = Math.max(1, Math.round((3 - s * 0.6) * tr.girth));
        var off = Math.round(Math.sin(s * 1.6 + tr.lean) * (1 + Math.abs(tr.lean)));
        for (var x = -hw; x <= hw; x++)
          for (var z = -1; z <= 1; z++)
            for (var dy = 0; dy <= 1; dy++) {
              if (Math.abs(x) === hw && Math.abs(z) === 1) continue;
              add(off + x, -2 * s - dy, z, (dy === 1 && Math.abs(x) === hw) ? 1 : 0);
            }
        if (s === slabs - 1) { topOff = off; topY = -2 * s - 1; }
      }
      return { footY: 1, halfW: 3, face: [topOff, topY, -2], antY: topY - 1, antX: [topOff] };
    },

    /* «долго обдумываю» — коробка: крышка приоткрывается по мере роста */
    box: function (t, tr, rnd, add) {
      var w = Math.max(2, Math.round(3 * tr.girth));
      var h = Math.max(2, Math.round(3 * tr.height));
      for (var x = -w; x <= w; x++)
        for (var y = -h; y <= 0; y++)
          for (var z = -2; z <= 2; z++) {
            var shell = Math.abs(x) === w || Math.abs(z) === 2 || y === 0;
            if (!shell) continue;
            add(x, y, z, (Math.abs(x) === w && Math.abs(z) === 2) ? 1 : 0);
          }
      var gap = Math.round(1 + t * 3);                             // насколько открыта
      for (var lx = -w; lx <= w; lx++)
        for (var lz = -2; lz <= 2; lz++)
          add(lx + Math.round(tr.lean), -h - gap, lz, (Math.abs(lx) === w) ? 1 : 0);
      return { footY: 1, halfW: w, face: [0, -h - 1, -3], antY: -h - gap - 1, antX: [0, w - 1] };
    },

    /* «собираю референсы» — рой: ядро и рассыпанная масса */
    swarm: function (t, tr, rnd, add) {
      for (var cx = -1; cx <= 1; cx++)
        for (var cy = -2; cy <= 0; cy++)
          for (var cz = -1; cz <= 1; cz++)
            add(cx, cy, cz, 0);
      var r = (2.0 + t * 1.7) * tr.girth;
      for (var x = -6; x <= 6; x++)
        for (var y = -6; y <= 4; y++)
          for (var z = -5; z <= 5; z++) {
            var dy = (y + 1) / tr.height;
            var d = x * x + dy * dy * 1.15 + z * z;
            if (d > r * r * 1.9) continue;
            var pr = 1 - d / (r * r * 1.9);
            if (rnd() > (0.18 + pr * 0.72) * (1 - tr.holeRate * 0.5)) continue;
            add(x, y, z, rnd() < 0.15 ? 1 : 0);
          }
      var specks = tr.quirkSpeck ? 5 : 2;
      for (var k = 0; k < specks; k++)
        add(Math.round((rnd() - 0.5) * 14), Math.round(-6 - rnd() * 4), Math.round((rnd() - 0.5) * 10), 1);
      var neck = Math.round(r) + 1;                    // шея выносит глаз из массы
      for (var nz = 1; nz <= neck; nz++) add(0, -1, -nz, 0);
      return { footY: 3, halfW: Math.round(r), face: [0, -1, -neck - 1], antY: -3, antX: [0] };
    },

    /* «собираю референсы» — гляделка: почти весь объём это глаз */
    eye: function (t, tr, rnd, add) {
      var R = Math.max(2, Math.round((2.4 + t * 1.4) * tr.girth));
      for (var x = -R; x <= R; x++)
        for (var y = -R; y <= R; y++)
          for (var z = -R; z <= R; z++) {
            var d = x * x + y * y / (tr.height * tr.height) + z * z;
            if (d > R * R) continue;
            var c = 2;                                  // белок
            if (y < -R * 0.5) c = 0;                    // затенённая макушка
            if (tr.quirkStripe && Math.abs(y % 3) === 0 && y > 0) c = 0;
            add(x, y - R - 1, z, c);
          }
      return { footY: 0, halfW: R, face: [0, -R - 1, -R - 1], antY: -2 * R - 2, antX: [0] };
    },

    /* «зову кого-то» — сцепка: два тела на мосту */
    pair: function (t, tr, rnd, add) {
      var lb = Math.max(1, Math.round((1 + t * 0.9) * tr.girth));
      var gap = 2 + lb + (tr.quirkLopsided ? 1 : 0);
      [[-gap, lb], [gap, Math.max(1, lb - (tr.quirkLopsided ? 1 : 0))]].forEach(function (p, i) {
        var cx = p[0], rr = p[1];
        for (var x = -rr; x <= rr; x++)
          for (var y = -rr; y <= rr; y++)
            for (var z = -1; z <= 1; z++) {
              if (Math.abs(x) + Math.abs(y) + Math.abs(z) > rr + 1) continue;
              add(cx + x, y, z, 0);
            }
        if (i === 1) { add(cx + rr, -1, -1, 3); add(cx + rr, 0, -1, 2); }
      });
      for (var bx = -gap; bx <= gap; bx++) add(bx, 0, 0, 1);
      return { footY: lb + 1, halfW: gap + lb, face: [-gap, -1, -2], antY: -lb - 1, antX: [-gap, gap] };
    },

    /* «зову кого-то» — медуза: купол и нити, единственная, кто не ходит */
    jelly: function (t, tr, rnd, add) {
      var R = Math.max(3, Math.round((3.2 + t * 1.6) * tr.girth));
      for (var x = -R; x <= R; x++)
        for (var y = -R; y <= 0; y++)
          for (var z = -R; z <= R; z++) {
            var d = x * x + y * y * 1.35 + z * z;
            if (d > R * R || d < (R - 2.2) * (R - 2.2)) continue;
            add(x, y - 2, z, (y === 0) ? 1 : 0);
          }
      var threads = 3 + Math.round(t * 2);
      for (var i = 0; i < threads; i++) {
        var a = (i / threads) * Math.PI * 2 + tr.twist;
        var tx = Math.round(Math.cos(a) * (R - 1));
        var tz = Math.round(Math.sin(a) * (R - 1));
        var len = Math.round((5 + rnd() * 6) * tr.height);
        for (var j = 0; j < len; j++)
          add(tx + Math.round(Math.sin(j * 0.6 + i) * 1.2), -1 + j, tz, j === len - 1 ? 4 : 3);
      }
      return { footY: 0, halfW: R, face: [0, -3, -R - 1], antY: -R - 3, antX: [0], legStyle: 'hang' };
    }
  };

  /* ============================== assembly ============================== */

  function buildCreature(g, tr, stage) {
    var vox = [];
    var rnd = rngFrom(tr.seed + '|' + genomeCode(g) + '|' + stage);
    var t = Math.max(0, Math.min(1, (stage - 1) / 4));
    function add(x, y, z, c) { vox.push([x, y, z, c]); }

    var A = BODIES[tr.arch](t, tr, rnd, add);
    var fx = A.face[0], fy = A.face[1], fz = A.face[2];

    /* сенсор — в собственной передней плоскости архетипа */
    if (tr.arch === 'eye') {
      /* гляделка сама почти целиком глаз, ей нужен только зрачок */
      var pr = Math.max(1, Math.round(A.halfW / 2.0));
      for (var px = -pr - 1; px <= pr + 1; px++)
        for (var py = -pr - 1; py <= pr + 1; py++) {
          var dd = px * px + py * py;
          if (dd > (pr + 1) * (pr + 1)) continue;
          var iris = dd > pr * pr;
          add(fx + px, fy + py, fz, g.eye === 3 ? 0 : (iris ? 1 : 3));
        }
      if (g.eye === 1) for (var qx = -pr; qx <= pr; qx += 2) add(fx + qx, fy, fz - 1, 2);
      if (g.eye === 0) { add(fx - 1, fy - 1, fz - 1, 2); }   // блик
    } else if (g.eye === 0) {
      add(fx - 1, fy - 1, fz, 2); add(fx, fy - 1, fz, 2);
      add(fx - 1, fy, fz, 2);     add(fx, fy, fz, 3);
    } else if (g.eye === 1) {
      for (var ex = -1; ex <= 1; ex++)
        for (var ey = -1; ey <= 0; ey++)
          add(fx + ex, fy + ey, fz, ((ex + ey) % 2 === 0) ? 2 : 3);
    } else if (g.eye === 2) {
      /* стебель растёт от самой морды вверх, иначе глаз улетает отдельно от тела */
      add(fx - 1, fy - 1, fz, 3);
      var top = Math.min(A.antY, fy) - 4;
      for (var yy = fy - 1; yy >= top; yy--) add(fx, yy, fz, 3);
      add(fx, top - 1, fz, 2); add(fx - 1, top - 1, fz, 2);
      add(fx - 1, top - 1, fz - 1, 3);
    } else {
      for (var bx = -1; bx <= 1; bx++) add(fx + bx, fy - 1, fz, 3);
      add(fx - 1, fy, fz, 1);
    }

    /* антенны — каналы к другим умам, открываются с третьей стадии */
    if (stage >= 3 && g.ant > 0) {
      var heights = g.ant === 1 ? [3] : (g.ant === 2 ? [3, 4, 2] : [4, 6, 3, 5]);
      if (tr.extraLimb) heights = heights.concat([2]);
      var base = A.antX;
      heights.forEach(function (hRaw, i) {
        var ax = base[i % base.length] + (i >= base.length ? (i % 2 ? 1 : -1) : 0);
        var hh = Math.max(1, Math.round(hRaw * (0.5 + t * 0.5) * tr.height));
        for (var ay = 1; ay <= hh; ay++) add(ax, A.antY - ay, 0, 3);
        add(ax, A.antY - hh - 1, 0, 4);
      });
      if (g.ant === 3) for (var cx3 = -1; cx3 <= 1; cx3++) add(base[0] + cx3, A.antY - 2, 0, 1);
    }

    /* шляпа — просто причуда, ни с каким ответом не связана */
    if (tr.quirkHat && stage >= 2) {
      for (var hx = -2; hx <= 2; hx++) add(A.antX[0] + hx, A.antY - 1, 0, 1);
      for (var hx2 = -1; hx2 <= 1; hx2++) add(A.antX[0] + hx2, A.antY - 2, 0, 1);
    }

    /* опора */
    var footY = A.footY;
    var span = Math.max(1, A.halfW - 1);
    if (A.legStyle === 'hang') {
      var hangCount = [1, 2, 6, 4][g.legs];
      for (var hi = 0; hi < hangCount; hi++) {
        var hxp = -span + Math.round(hi * (span * 2) / Math.max(1, hangCount - 1));
        for (var hy = 0; hy < 3 + (g.legs === 3 ? 2 : 0); hy++) add(hxp, footY + hy, 0, 3);
        add(hxp, footY + 3 + (g.legs === 3 ? 2 : 0), 0, 1);
      }
    } else if (stage <= 1) {
      add(-1, footY, 0, 3); add(1, footY, 0, 3);
    } else if (g.legs === 0) {
      for (var ly = 0; ly < 3; ly++) { add(0, footY + ly, 0, 3); add(-1, footY + ly, 0, 3); }
      add(1, footY + 3, 0, 1); add(0, footY + 3, 0, 1);
      add(-1, footY + 3, 0, 1); add(-2, footY + 3, 0, 1);
      add(0, footY + 3, 1, 1); add(-1, footY + 3, -1, 1);
    } else if (g.legs === 1) {
      [-1, 1].forEach(function (s2) {
        var lh = 3 + (tr.quirkLopsided && s2 < 0 ? 1 : 0);
        for (var ly2 = 0; ly2 < lh; ly2++) add(s2 * span, footY + ly2, 0, 3);
        add(s2 * span, footY + lh, 0, 1);
        add(s2 * span + s2, footY + lh, 0, 1);
      });
    } else if (g.legs === 2) {
      var n = 6 + (tr.extraLimb ? 2 : 0);
      for (var li = 0; li < n; li++) {
        var lx = -A.halfW + Math.round(li * (A.halfW * 2) / (n - 1));
        var lz = li % 2 ? 1 : -1;
        add(lx, footY, lz, 3);
        add(lx + (lx < 0 ? -1 : 1), footY + 1, lz, li % 2 ? 1 : 3);
      }
    } else {
      for (var wx = -A.halfW - 1; wx <= A.halfW + 1; wx++) add(wx, footY, 0, 3);
      [-A.halfW - 1, A.halfW + 1].forEach(function (wx2) {
        add(wx2, footY, -1, 3); add(wx2, footY, 1, 3);
        add(wx2, footY + 1, 0, 1); add(wx2, footY + 1, -1, 1); add(wx2, footY + 1, 1, 1);
      });
    }

    return vox;
  }

  /* ============================== stages ============================== */

  var STAGE_NAMES = ['яйцо', 'проклюнулся', 'птенец', 'подросток', 'форма', 'оснащённый'];
  var STAGE_AT = [0, 1, 4, 9, 16, 24];

  function stageFor(attention) {
    var s = 0;
    for (var i = 0; i < STAGE_AT.length; i++) if (attention >= STAGE_AT[i]) s = i;
    return s;
  }

  var FADE = [
    { hours: 24,  vitality: 1.00, label: 'полное' },
    { hours: 48,  vitality: 0.85, label: 'тише' },
    { hours: 96,  vitality: 0.62, label: 'осыпается' },
    { hours: 168, vitality: 0.38, label: 'контур намечается' },
    { hours: 336, vitality: 0.18, label: 'контур' },
    { hours: 1e9, vitality: 0.04, label: 'улетело' }
  ];

  function vitalityFor(hoursSinceFed) {
    for (var i = 0; i < FADE.length; i++) if (hoursSinceFed < FADE[i].hours) return FADE[i];
    return FADE[FADE.length - 1];
  }

  return {
    QUESTIONS: QUESTIONS,
    PROJECT_QUESTIONS: PROJECT_QUESTIONS,
    RHYTHM: RHYTHM,
    GENOME_KEYS: GENOME_KEYS,
    FAMILIES: FAMILIES,
    GENUS: GENUS,
    PALETTES: PALETTES,
    EGG_RES: EGG_RES,
    STAGE_NAMES: STAGE_NAMES,
    STAGE_AT: STAGE_AT,
    FADE: FADE,
    rngFrom: rngFrom,
    hashStr: hashStr,
    opaqueSeed: opaqueSeed,
    genomeCode: genomeCode,
    mapFreeform: mapFreeform,
    mapProjectAnswer: mapProjectAnswer,
    speciesName: speciesName,
    personalName: personalName,
    fullName: fullName,
    deriveTraits: deriveTraits,
    fingerprint: fingerprint,
    paletteFor: paletteFor,
    mixHex: mixHex,
    buildEgg: buildEgg,
    buildCreature: buildCreature,
    stageFor: stageFor,
    vitalityFor: vitalityFor
  };
});
