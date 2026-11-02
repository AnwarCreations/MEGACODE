/* MegaLab — Classroom notes to Gen-Z learning games, questions and cards */
(function () {
  'use strict';
  window.ML = window.ML || {};

  var GAME_TYPES = [
    { id: 'quiz_battle', name: 'Quiz Battle', description: 'Rapid-fire questions with combo streaks', icon: 'target', color: '#8b5cf6', emoji: '⚔️', tagline: 'Beat the clock. Keep the combo.' },
    { id: 'concept_map', name: 'Concept Constellation', description: 'Tap the ideas that light up together', icon: 'brain', color: '#ec4899', emoji: '🌌', tagline: 'See how the notes connect.' },
    { id: 'flashcard_race', name: 'Speed Cards', description: 'Flip and self-rate at lightning speed', icon: 'zap', color: '#f59e0b', emoji: '🏁', tagline: 'Fast recall, zero cramming.' },
    { id: 'fill_blanks', name: 'Fill the Void', description: 'Type the missing key terms', icon: 'edit', color: '#06b6d4', emoji: '🧩', tagline: 'The notes have holes. You fix them.' },
    { id: 'match_pairs', name: 'Memory Match', description: 'Pair each concept with its meaning', icon: 'cards', color: '#84cc16', emoji: '🎯', tagline: 'Match the concept to the receipt.' },
    { id: 'timeline_builder', name: 'Timeline Quest', description: 'Put events and steps in the right order', icon: 'calendar', color: '#ef4444', emoji: '📜', tagline: 'Order the chaos.' },
    { id: 'code_challenge', name: 'Code Lab', description: 'Prove the idea with a tiny script', icon: 'terminal', color: '#6366f1', emoji: '💻', tagline: 'Ship a snippet, not a vibe.' },
    { id: 'explain_it', name: 'Teach Back', description: 'Explain it at three levels of difficulty', icon: 'message', color: '#14b8a6', emoji: '🎤', tagline: 'If you can teach it, you own it.' }
  ];

  var STOP = ('a about above after again against all am an and any are aren as at be because been before being below between both but by can cannot could couldn did didn do does doesn doing don down during each few for from further had hadn has hasn have haven having he her here hers herself him himself his how i if in into is isn it its itself just let me more most mustn my myself no nor not now of off on once only or other ought our ours ourselves out over own same shan she should shouldn so some such than that the their theirs them themselves then there these they this those through to too under until up very was wasn we were weren what when where which while who whom why with won would wouldn you your yours yourself yourselves also using used use one two may might must shall within without however therefore thus etc via per among across upon').split(/\s+/);

  var STOP_MAP = {};
  STOP.forEach(function (w) { STOP_MAP[w] = true; });

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function hash(s) {
    var h = 2166136261;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function escReg(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cap(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) {
      var k = String(x || '').toLowerCase().trim();
      if (!k || seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function normalizeSpace(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function sentences(text) {
    text = normalizeSpace(text);
    var blocks = text.split(/\n+/);
    var out = [];
    blocks.forEach(function (block) {
      var b = block.replace(/([.!?])\s+/g, '$1\n');
      b.split('\n').forEach(function (s) {
        s = s.replace(/^[\s•▪◦*\-–—\d.)]+/, '').replace(/\s+/g, ' ').trim();
        if (s.length >= 28 && s.length <= 420 && !/^(slide|page)\s+\d+/i.test(s)) out.push(s);
      });
    });
    return uniq(out).slice(0, 240);
  }

  function termCandidates(text) {
    var scores = {};
    var display = {};
    function add(raw, score) {
      var term = String(raw || '').replace(/^[^\w]+|[^\w'-]+$/g, '').trim();
      if (term.length < 4 || term.length > 48) return;
      if (/^\d+$/.test(term)) return;
      var low = term.toLowerCase();
      if (STOP_MAP[low]) return;
      if (!/[a-z]/i.test(term)) return;
      scores[low] = (scores[low] || 0) + score;
      if (!display[low] || term[0] === term[0].toUpperCase()) display[low] = term;
    }
    var phraseRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
    var m;
    while ((m = phraseRe.exec(text))) add(m[1], 3);
    var acronymRe = /\b([A-Z]{2,6})\b/g;
    while ((m = acronymRe.exec(text))) add(m[1], 3);
    var wordRe = /\b([A-Za-z][A-Za-z-]{4,})\b/g;
    while ((m = wordRe.exec(text))) {
      var w = m[1];
      if (!STOP_MAP[w.toLowerCase()] && !/^(which|their|there|these|those|where|while|would|could|should|about|after|before|between|because|through|during|without|within|other|another)$/i.test(w)) add(w, 1);
    }
    return Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; }).map(function (k) { return display[k] || cap(k); }).slice(0, 45);
  }

  function definitionFor(text, term) {
    var list = sentences(text);
    var re = new RegExp('\\b' + escReg(term) + '\\b', 'i');
    var exact = list.filter(function (s) { return re.test(s); });
    if (!exact.length) return '';
    var best = exact.sort(function (a, b) {
      var ai = a.toLowerCase().indexOf(term.toLowerCase());
      var bi = b.toLowerCase().indexOf(term.toLowerCase());
      return ai - bi;
    })[0];
    return best.length > 220 ? best.slice(0, 217).replace(/\s+\S*$/, '') + '…' : best;
  }

  function chooseTerm(sentence, terms) {
    var lower = sentence.toLowerCase();
    for (var i = 0; i < terms.length; i++) {
      if (new RegExp('\\b' + escReg(terms[i]) + '\\b', 'i').test(sentence)) return terms[i];
    }
    var words = sentence.split(/\s+/).map(function (w) { return w.replace(/^[^\w]+|[^\w]+$/g, ''); })
      .filter(function (w) { return w.length > 4 && !STOP_MAP[w.toLowerCase()] && /^[a-zA-Z]/.test(w); });
    return words.sort(function (a, b) { return b.length - a.length; })[0] || '';
  }

  function distractors(correct, terms, sentencesList, count) {
    count = count || 3;
    var out = [];
    var used = {};
    used[String(correct).toLowerCase()] = true;
    terms.forEach(function (t) {
      if (out.length >= count) return;
      if (used[String(t).toLowerCase()]) return;
      if (String(t).toLowerCase() === String(correct).toLowerCase()) return;
      used[String(t).toLowerCase()] = true;
      out.push(t);
    });
    if (out.length < count) {
      sentencesList.forEach(function (s) {
        if (out.length >= count) return;
        var w = chooseTerm(s, terms);
        if (w && !used[w.toLowerCase()]) {
          used[w.toLowerCase()] = true;
          out.push(w);
        }
      });
    }
    while (out.length < count) out.push('Not covered in these notes ' + (out.length + 1));
    return out;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function extractDates(text) {
    var out = [];
    var patterns = [
      { re: /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g, kind: 'numeric' },
      { re: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, kind: 'month' },
      { re: /\b(19|20)\d{2}\b/g, kind: 'year' }
    ];
    patterns.forEach(function (p) {
      var m;
      while ((m = p.re.exec(text))) {
        var raw = m[0];
        var idx = m.index;
        var context = text.slice(Math.max(0, idx - 120), Math.min(text.length, idx + 220)).replace(/\s+/g, ' ').trim();
        var time = Date.parse(raw.replace(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/, function (x, a, b, c) {
          if (c.length === 2) c = '20' + c;
          return c + '-' + a + '-' + b;
        }));
        out.push({ date: raw, event: context, sort: isNaN(time) ? Number(raw) || 0 : time });
      }
    });
    out.sort(function (a, b) { return a.sort - b.sort; });
    var seen = {};
    return out.filter(function (d) {
      var k = d.date.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return d.event.length > 30;
    }).slice(0, 8);
  }

  function topicFrom(text, fallback) {
    if (fallback) return String(fallback).replace(/\.(pdf|pptx|docx|xlsx|txt|md)$/i, '').trim();
    var s = sentences(text)[0] || 'these notes';
    return s.split(/\s+/).slice(0, 7).join(' ').replace(/[,:;]$/, '');
  }

  function makeOfflineGames(text, topic, ctx) {
    var sents = sentences(text);
    var terms = termCandidates(text);
    if (terms.length < 4) terms = uniq(terms.concat(sents.map(function (s) { return chooseTerm(s, terms); })));
    var games = [];
    var createdAt = new Date().toISOString();
    function base(type, title, description, data) {
      return normalizeGame({
        id: 'game_' + hash((ctx.sourceId || topic) + ':' + type),
        type: type, title: title, description: description, data: data,
        sourceId: ctx.sourceId || null, sourceName: ctx.sourceName || null,
        topic: topic, createdAt: createdAt, ai: false
      }, ctx);
    }

    if (sents.length >= 4) {
      var qs = [];
      sents.slice(0, 8).forEach(function (s, i) {
        var term = chooseTerm(s, terms);
        if (!term) return;
        var options = shuffle([term].concat(distractors(term, terms, sents, 3)));
        var answer = options.indexOf(term);
        if (answer < 0) return;
        qs.push({
          q: 'Fill the gap: ' + s.replace(new RegExp('\\b' + escReg(term) + '\\b', 'i'), '______'),
          options: options, answer: answer,
          explanation: 'From the notes: ' + s
        });
      });
      if (qs.length >= 3) games.push(base('quiz_battle', 'Quiz Battle: ' + topic, 'Speed-run the key facts. Keep the combo alive.', { questions: qs.slice(0, 8) }));
    }

    if (sents.length >= 3) {
      var blanks = [];
      sents.slice(0, 6).forEach(function (s) {
        var term = chooseTerm(s, terms);
        if (!term) return;
        blanks.push({ text: s.replace(new RegExp('\\b' + escReg(term) + '\\b', 'i'), '[____]'), answer: term });
      });
      if (blanks.length >= 2) games.push(base('fill_blanks', 'Fill the Void: ' + topic, 'Type the missing terms before the notes rat you out.', { sentences: blanks.slice(0, 6) }));
    }

    var pairs = [];
    var pairSeen = {};
    terms.forEach(function (term) {
      if (pairs.length >= 7) return;
      var def = definitionFor(text, term);
      if (!def || def.length < 24) return;
      var key = term.toLowerCase();
      if (pairSeen[key]) return;
      pairSeen[key] = true;
      pairs.push({ left: term, right: def });
    });
    if (pairs.length >= 4) games.push(base('match_pairs', 'Memory Match: ' + topic, 'Match each concept to the line that explains it.', { pairs: pairs.slice(0, 7) }));

    var dates = extractDates(text);
    if (dates.length >= 3) {
      games.push(base('timeline_builder', 'Timeline Quest: ' + topic, 'Drag the events into chronological order.', { events: dates.slice(0, 6) }));
    }

    var concepts = terms.slice(0, 10).map(function (term) {
      return { term: term, definition: definitionFor(text, term) || 'A key idea in ' + topic + '.' };
    });
    if (concepts.length >= 4) {
      games.push(base('concept_map', 'Concept Constellation: ' + topic, 'Tap a star to reveal the idea and how it fits.', { concepts: concepts }));
    }

    if (sents.length >= 3) {
      var cards = [];
      var cardSeen = {};
      terms.forEach(function (term) {
        if (cards.length >= 10) return;
        if (cardSeen[term.toLowerCase()]) return;
        var def = definitionFor(text, term);
        if (!def) return;
        cardSeen[term.toLowerCase()] = true;
        cards.push({ q: 'What does “' + term + '” mean in these notes?', a: def });
      });
      if (cards.length < 4) {
        sents.slice(0, 8).forEach(function (s) {
          var t = chooseTerm(s, terms);
          if (t && cards.length < 8) cards.push({ q: 'Explain: ' + t, a: s });
        });
      }
      if (cards.length >= 3) games.push(base('flashcard_race', 'Speed Cards: ' + topic, 'Flip, recall, rate. No rereading allowed.', { questions: cards.slice(0, 10) }));
    }

    games.push(base('explain_it', 'Teach Back: ' + topic, 'Explain the core idea at three levels. The mentor checks it.', {
      levels: [
        { level: 'ELI5', prompt: 'Explain “' + topic + '” like I am five. Use one everyday analogy.' },
        { level: 'Classmate', prompt: 'Teach “' + topic + '” to a classmate who missed the lesson. Include one example.' },
        { level: 'Exam mode', prompt: 'Explain “' + topic + '” with the edge cases and one common misconception.' }
      ]
    }));

    var codeMatch = text.match(/```([a-z]*)\n([\s\S]*?)```/i) || text.match(/(?:function|const|let|class|def|public static)\s+[\s\S]{40,800}/);
    if (codeMatch || /code|program|algorithm|function|variable|loop|array|object|api|database|sql|html|css|javascript|python|java|rust|react/i.test(topic)) {
      var starter = codeMatch ? (codeMatch[2] || codeMatch[0]).trim().split('\n').slice(0, 28).join('\n') : '// Show the core idea in code\nfunction demo(input) {\n  // TODO: implement the idea from your notes\n  return input;\n}\n\nconsole.log(demo("test"));';
      games.push(base('code_challenge', 'Code Lab: ' + topic, 'Write the smallest runnable proof that you understood the notes.', {
        challenge: 'Use the notes to implement the central idea of “' + topic + '” in JavaScript. Keep it under 25 lines and log one example.',
        starterCode: starter,
        hints: ['Start with the smallest input and expected output.', 'Name one edge case the notes mention.', 'Run it before asking for a review.']
      }));
    }

    return games;
  }

  function normalizeGame(raw, ctx) {
    if (!raw || typeof raw !== 'object') return null;
    ctx = ctx || {};
    var map = {
      quiz: 'quiz_battle', quizbattle: 'quiz_battle', 'quiz-battle': 'quiz_battle', battle: 'quiz_battle',
      fill: 'fill_blanks', 'fill-blanks': 'fill_blanks', blanks: 'fill_blanks', fillintheblank: 'fill_blanks',
      match: 'match_pairs', 'match-pairs': 'match_pairs', memory: 'match_pairs', pairs: 'match_pairs',
      timeline: 'timeline_builder', 'timeline-builder': 'timeline_builder', order: 'timeline_builder',
      explain: 'explain_it', 'explain-it': 'explain_it', teach: 'explain_it', teachback: 'explain_it',
      code: 'code_challenge', 'code-challenge': 'code_challenge', coding: 'code_challenge',
      flashcard: 'flashcard_race', cards: 'flashcard_race', 'flashcard-race': 'flashcard_race',
      concept: 'concept_map', 'concept-map': 'concept_map', constellation: 'concept_map'
    };
    var type = String(raw.type || raw.gameType || '').toLowerCase().replace(/\s+/g, '_');
    type = map[type] || map[type.replace(/_/g, '')] || type;
    if (!GAME_TYPES.some(function (g) { return g.id === type; })) return null;
    var data = raw.data || raw;
    var clean = { questions: [], sentences: [], pairs: [], events: [], levels: [], concepts: [] };
    if (type === 'quiz_battle') {
      (data.questions || data.quiz || []).forEach(function (q) {
        if (!q || (!q.q && !q.question)) return;
        var options = (q.options || q.choices || []).map(String).filter(Boolean);
        var answer = Number(q.answer !== undefined ? q.answer : q.correct);
        if (!isFinite(answer) || answer < 0 || answer >= options.length) answer = 0;
        if (options.length >= 2) clean.questions.push({ q: String(q.q || q.question), options: options.slice(0, 6), answer: answer, explanation: String(q.explanation || q.why || '') });
      });
      if (!clean.questions.length) return null;
    } else if (type === 'fill_blanks') {
      (data.sentences || data.blanks || []).forEach(function (s) {
        if (!s) return;
        var text = String(s.text || s.sentence || '');
        var answer = String(s.answer || s.word || '');
        if (!answer) {
          var m = text.match(/\[([^\]]+)\]/);
          if (m) { answer = m[1].replace(/_+/g, '').trim(); }
        }
        text = text.replace(/\[[^\]]*\]/g, '[____]').replace(/_{3,}/g, '[____]');
        if (text.indexOf('[____]') === -1 && answer) text = text.replace(new RegExp('\\b' + escReg(answer) + '\\b', 'i'), '[____]');
        if (answer && text.indexOf('[____]') !== -1) clean.sentences.push({ text: text, answer: answer });
      });
      if (!clean.sentences.length) return null;
    } else if (type === 'match_pairs') {
      (data.pairs || data.matches || []).forEach(function (p) {
        if (!p) return;
        var left = String(p.left || p.term || p.concept || '');
        var right = String(p.right || p.definition || p.match || '');
        if (left && right) clean.pairs.push({ left: left, right: right });
      });
      if (clean.pairs.length < 3) return null;
    } else if (type === 'timeline_builder') {
      (data.events || data.timeline || []).forEach(function (e) {
        if (!e) return;
        var date = String(e.date || e.when || '');
        var event = String(e.event || e.description || e.text || '');
        if (event) clean.events.push({ date: date, event: event, sort: Number(e.sort) || (isNaN(Date.parse(date)) ? 0 : Date.parse(date)) });
      });
      if (clean.events.length < 3) return null;
    } else if (type === 'explain_it') {
      var levels = data.levels || [];
      if (!levels.length) {
        levels = [
          { level: 'ELI5', prompt: 'Explain the idea like I am five.' },
          { level: 'Classmate', prompt: 'Teach it to a classmate with one example.' },
          { level: 'Exam mode', prompt: 'Explain it with edge cases and a misconception.' }
        ];
      }
      clean.levels = levels.map(function (l) { return { level: String(l.level || l.name || 'Level'), prompt: String(l.prompt || l.question || '') }; }).filter(function (l) { return l.prompt; });
      if (!clean.levels.length) return null;
    } else if (type === 'code_challenge') {
      clean.challenge = String(data.challenge || data.prompt || 'Apply the core idea from the notes.');
      clean.starterCode = String(data.starterCode || data.starter || '// Your code here\nfunction demo(input) {\n  return input;\n}\n\nconsole.log(demo("test"));');
      clean.hints = (data.hints || []).map(String);
      if (!clean.challenge) return null;
    } else if (type === 'flashcard_race') {
      (data.questions || data.cards || []).forEach(function (c) {
        if (!c) return;
        var q = String(c.q || c.front || c.question || '');
        var a = String(c.a || c.back || c.answer || '');
        if (q && a) clean.questions.push({ q: q, a: a });
      });
      if (!clean.questions.length) return null;
    } else if (type === 'concept_map') {
      (data.concepts || data.nodes || []).forEach(function (c) {
        if (!c) return;
        if (typeof c === 'string') clean.concepts.push({ term: c, definition: '' });
        else clean.concepts.push({ term: String(c.term || c.name || c.concept || ''), definition: String(c.definition || c.description || '') });
      });
      clean.concepts = clean.concepts.filter(function (c) { return c.term; });
      if (clean.concepts.length < 3) return null;
    }

    var globalData = Object.assign({}, data, clean);
    return {
      id: raw.id || ('game_' + hash((ctx.sourceId || raw.sourceId || '') + ':' + type + ':' + (raw.title || ''))),
      type: type,
      title: String(raw.title || raw.name || (GAME_TYPES.find(function (g) { return g.id === type; }) || {}).name || 'Learning game').slice(0, 160),
      description: String(raw.description || raw.tagline || 'A quick game built from your class notes.').slice(0, 300),
      data: globalData,
      sourceId: raw.sourceId || ctx.sourceId || null,
      sourceName: raw.sourceName || ctx.sourceName || null,
      topic: raw.topic || ctx.topic || '',
      createdAt: raw.createdAt || new Date().toISOString(),
      ai: !!raw.ai
    };
  }

  function gameIdFor(sourceId, type) {
    return 'game_' + hash(String(sourceId || 'notes') + ':' + type);
  }

  async function generateGamesWithAI(text, topic, ctx) {
    if (!ML.ai || typeof ML.ai.complete !== 'function' || !ML.ai.hasBridge()) return null;
    var prompt = 'You are MegaLab\'s game designer. Turn the class notes into 5-7 fast, funny, genuinely educational Gen-Z mini-games. Do not add facts that are not in the notes.\n\n' +
      'Topic: ' + topic + '\nSource: ' + (ctx.sourceName || 'class notes') + '\n\nNotes (truncated):\n' + String(text).slice(0, 10000) + '\n\n' +
      'Return ONLY valid JSON: {"games":[{"type":"quiz_battle|fill_blanks|match_pairs|timeline_builder|explain_it|code_challenge|flashcard_race|concept_map","title":"...","description":"...","data":{...}}]}\n' +
      'Schemas: quiz_battle.data.questions=[{"q":"...","options":["a","b","c","d"],"answer":0,"explanation":"..."}]; fill_blanks.data.sentences=[{"text":"... [____] ...","answer":"word"}]; match_pairs.data.pairs=[{"left":"term","right":"definition"}]; timeline_builder.data.events=[{"date":"...","event":"..."}]; explain_it.data.levels=[{"level":"ELI5","prompt":"..."}]; code_challenge.data={challenge,starterCode,hints:[]}; flashcard_race.data.questions=[{"q":"...","a":"..."}]; concept_map.data.concepts=[{"term":"...","definition":"..."}]. Keep each game to 2-5 minutes. Tone: clever, current, not cringe. No markdown fences.';
    try {
      var raw = await ML.ai.complete(prompt);
      var parsed = ML.ai.extractJson(raw);
      var arr = parsed && Array.isArray(parsed.games) ? parsed.games : (ML.ai.arrFrom ? ML.ai.arrFrom(parsed) : null);
      if (!arr || !arr.length) return null;
      var out = [];
      arr.forEach(function (g) {
        var n = normalizeGame(Object.assign({}, g, {
          id: gameIdFor(ctx.sourceId, mapType(g.type)),
          sourceId: ctx.sourceId, sourceName: ctx.sourceName, topic: topic, ai: true
        }), ctx);
        if (n) out.push(n);
      });
      return out.length >= 3 ? out : null;
    } catch (e) {
      return null;
    }
  }

  function mapType(t) {
    var s = String(t || '').toLowerCase().replace(/\s+/g, '_');
    var aliases = { quiz: 'quiz_battle', battle: 'quiz_battle', fill: 'fill_blanks', blanks: 'fill_blanks', match: 'match_pairs', memory: 'match_pairs', timeline: 'timeline_builder', explain: 'explain_it', teach: 'explain_it', code: 'code_challenge', cards: 'flashcard_race', concept: 'concept_map' };
    return aliases[s] || s;
  }

  async function generateGames(text, topic, options) {
    options = options || {};
    var ctx = {
      sourceId: options.sourceId || null,
      sourceName: options.sourceName || null,
      topic: topic || topicFrom(text)
    };
    if (!text || String(text).replace(/\s/g, '').length < 80) {
      throw new Error('These notes are too short to build a game. Add at least a paragraph.');
    }
    var ai = null;
    if (options.useAI !== false && ML.ai && ML.ai.hasBridge && ML.ai.hasBridge()) {
      ai = await generateGamesWithAI(text, ctx.topic, ctx);
    }
    var games = ai || makeOfflineGames(text, ctx.topic, ctx);
    return games.filter(Boolean).slice(0, 8);
  }

  function makeOfflineQuestions(text, topic, ctx, count) {
    var sents = sentences(text);
    var terms = termCandidates(text);
    var out = [];
    count = count || 10;
    for (var i = 0; i < sents.length && out.length < count; i++) {
      var s = sents[i];
      var type = ['multiple_choice', 'true_false', 'short_answer'][i % 3];
      var term = chooseTerm(s, terms);
      if (type === 'multiple_choice' && term) {
        var options = shuffle([term].concat(distractors(term, terms, sents, 3)));
        out.push({
          id: 'q_' + hash((ctx.sourceId || topic) + ':mc:' + i),
          q: s.replace(new RegExp('\\b' + escReg(term) + '\\b', 'i'), '______'),
          type: 'multiple_choice', options: options, answer: options.indexOf(term),
          explanation: 'From the notes: ' + s, difficulty: 'medium',
          tags: [topic], sourceId: ctx.sourceId, sourceName: ctx.sourceName, sourceFile: ctx.sourceName
        });
      } else if (type === 'true_false') {
        var truth = i % 2 === 0;
        var statement = s;
        var why = 'This matches the source notes.';
        if (!truth && term) {
          var replacement = distractors(term, terms, sents, 1)[0] || 'something else';
          statement = s.replace(new RegExp('\\b' + escReg(term) + '\\b', 'i'), replacement);
          why = 'The notes actually say: ' + s;
        }
        out.push({
          id: 'q_' + hash((ctx.sourceId || topic) + ':tf:' + i),
          q: statement,
          type: 'true_false', options: ['True', 'False'], answer: truth ? 0 : 1,
          explanation: why, difficulty: 'easy', tags: [topic],
          sourceId: ctx.sourceId, sourceName: ctx.sourceName, sourceFile: ctx.sourceName
        });
      } else {
        out.push({
          id: 'q_' + hash((ctx.sourceId || topic) + ':sa:' + i),
          q: 'Explain in your own words: ' + s.slice(0, 140) + (s.length > 140 ? '…' : ''),
          type: 'short_answer', options: [], answer: '',
          explanation: 'A strong answer covers: ' + s, difficulty: 'hard',
          tags: [topic], sourceId: ctx.sourceId, sourceName: ctx.sourceName, sourceFile: ctx.sourceName
        });
      }
    }
    return out;
  }

  async function generateQuestionsWithAI(text, topic, ctx, count) {
    if (!ML.ai || typeof ML.ai.complete !== 'function' || !ML.ai.hasBridge()) return null;
    var prompt = 'Create ' + count + ' retrieval-practice questions from these class notes. Test understanding and application, not trivia. Mix multiple_choice, true_false and short_answer.\n\nTopic: ' + topic + '\nNotes:\n' + String(text).slice(0, 10000) + '\n\nReturn ONLY a JSON array: [{"q":"...","type":"multiple_choice|true_false|short_answer","options":["..."],"answer":0,"explanation":"...","difficulty":"easy|medium|hard","tags":["..."]}]. For short_answer, options=[] and answer="".';
    try {
      var raw = await ML.ai.complete(prompt);
      var parsed = ML.ai.extractJson(raw);
      var arr = ML.ai.arrFrom ? ML.ai.arrFrom(parsed) : (Array.isArray(parsed) ? parsed : null);
      if (!arr || !arr.length) return null;
      var out = [];
      arr.slice(0, count).forEach(function (q, i) {
        if (!q || !q.q) return;
        var type = ['multiple_choice', 'true_false', 'short_answer'].indexOf(q.type) !== -1 ? q.type : 'multiple_choice';
        var options = Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : [];
        var answer = Number(q.answer);
        if (type === 'true_false') { options = ['True', 'False']; answer = answer === 1 ? 1 : 0; }
        if (type === 'multiple_choice' && options.length < 2) return;
        if (!isFinite(answer) || answer < 0 || answer >= options.length) answer = 0;
        out.push({
          id: 'q_' + hash((ctx.sourceId || topic) + ':ai:' + i),
          q: String(q.q), type: type, options: options, answer: answer,
          explanation: String(q.explanation || q.why || ''), difficulty: String(q.difficulty || 'medium'),
          tags: Array.isArray(q.tags) ? q.tags.map(String) : [topic],
          sourceId: ctx.sourceId, sourceName: ctx.sourceName, sourceFile: ctx.sourceName
        });
      });
      return out.length ? out : null;
    } catch (e) {
      return null;
    }
  }

  async function generateQuestions(text, topic, options) {
    options = options || {};
    var count = Number(options.count) || 10;
    var ctx = { sourceId: options.sourceId || null, sourceName: options.sourceName || null };
    topic = topic || topicFrom(text);
    if (!text || String(text).replace(/\s/g, '').length < 80) throw new Error('These notes are too short to make questions.');
    var ai = options.useAI !== false ? await generateQuestionsWithAI(text, topic, ctx, count) : null;
    return (ai || makeOfflineQuestions(text, topic, ctx, count)).slice(0, count);
  }

  function makeOfflineCards(text, topic, ctx, count) {
    var sents = sentences(text);
    var terms = termCandidates(text);
    var out = [];
    var seen = {};
    terms.forEach(function (term) {
      if (out.length >= count) return;
      var def = definitionFor(text, term);
      if (!def || seen[term.toLowerCase()]) return;
      seen[term.toLowerCase()] = true;
      out.push({ f: 'What does “' + term + '” mean in ' + topic + '?', b: def, deck: topic, sourceId: ctx.sourceId, sourceName: ctx.sourceName });
    });
    if (out.length < count) {
      sents.forEach(function (s) {
        if (out.length >= count) return;
        var term = chooseTerm(s, terms);
        if (!term || seen[term.toLowerCase()]) return;
        seen[term.toLowerCase()] = true;
        out.push({ f: 'Explain: ' + term, b: s, deck: topic, sourceId: ctx.sourceId, sourceName: ctx.sourceName });
      });
    }
    return out.slice(0, count);
  }

  async function generateCardsWithAI(text, topic, ctx, count) {
    if (!ML.ai || typeof ML.ai.complete !== 'function' || !ML.ai.hasBridge()) return null;
    var prompt = 'Make ' + count + ' high-quality spaced-repetition flashcards from these class notes. One idea per card. Front is a clear question or prompt; back is a short specific answer (max 35 words). Do not invent facts.\n\nTopic: ' + topic + '\nNotes:\n' + String(text).slice(0, 10000) + '\n\nReturn ONLY JSON: [{"f":"front","b":"back"}]';
    try {
      var raw = await ML.ai.complete(prompt);
      var parsed = ML.ai.extractJson(raw);
      var arr = ML.ai.arrFrom ? ML.ai.arrFrom(parsed) : (Array.isArray(parsed) ? parsed : null);
      if (!arr || !arr.length) return null;
      return arr.map(function (c) {
        return { f: String(c.f || c.front || c.q || ''), b: String(c.b || c.back || c.a || ''), deck: topic, sourceId: ctx.sourceId, sourceName: ctx.sourceName };
      }).filter(function (c) { return c.f && c.b; }).slice(0, count);
    } catch (e) {
      return null;
    }
  }

  async function generateCards(text, topic, options) {
    options = options || {};
    var count = Number(options.count) || 10;
    var ctx = { sourceId: options.sourceId || null, sourceName: options.sourceName || null };
    topic = topic || topicFrom(text);
    if (!text || String(text).replace(/\s/g, '').length < 80) throw new Error('These notes are too short to make flashcards.');
    var ai = options.useAI !== false ? await generateCardsWithAI(text, topic, ctx, count) : null;
    return (ai || makeOfflineCards(text, topic, ctx, count)).slice(0, count);
  }

  function summarize(text, topic) {
    var sents = sentences(text);
    var terms = termCandidates(text);
    var bullets = [];
    sents.forEach(function (s) {
      if (bullets.length >= 6) return;
      var hit = terms.some(function (t) { return new RegExp('\\b' + escReg(t) + '\\b', 'i').test(s); });
      if (hit && s.length > 50) bullets.push(s);
    });
    if (!bullets.length) bullets = sents.slice(0, 4);
    return {
      topic: topic || topicFrom(text),
      bullets: bullets.slice(0, 6).map(function (s) { return s.length > 240 ? s.slice(0, 237) + '…' : s; }),
      terms: terms.slice(0, 10)
    };
  }

  function typeInfo(type) {
    for (var i = 0; i < GAME_TYPES.length; i++) if (GAME_TYPES[i].id === type) return GAME_TYPES[i];
    return { id: type, name: type, description: '', icon: 'rocket', color: '#4f46e5', emoji: '🎮', tagline: '' };
  }

  ML.games = {
    GAME_TYPES: GAME_TYPES,
    typeInfo: typeInfo,
    generateGames: generateGames,
    generateQuestions: generateQuestions,
    generateCards: generateCards,
    summarize: summarize,
    normalizeGame: normalizeGame,
    topicFrom: topicFrom,
    sentences: sentences,
    keywords: termCandidates,
    uid: uid,
    hash: hash,
    gameIdFor: gameIdFor
  };
})();
