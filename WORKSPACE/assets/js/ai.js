/* MegaLab — optional AI bridge + offline tutor fallbacks */
(function () {
  'use strict';
  window.ML = window.ML || {};
  var data = ML.data;
  var samplePromise = null;
  var mode = 'checking';
  var lastError = null;

  function cfg() { return window.MEGALAB_CONFIG || {}; }

  function bridge() {
    if (window.megalabAI && typeof window.megalabAI.use === 'function') return window.megalabAI;
    if (window.MEGALAB_AI && typeof window.MEGALAB_AI.use === 'function') return window.MEGALAB_AI;
    if (window.claude && typeof window.claude.use === 'function') return window.claude;
    return null;
  }

  function hasBridge() {
    return !!bridge();
  }

  function getSample() {
    if (samplePromise) return samplePromise;
    samplePromise = (async function () {
      try {
        var api = bridge();
        if (api) {
          var s = await api.use('sample');
          if (typeof s === 'function') {
            mode = 'live';
            return s;
          }
        }
        if (cfg().aiEndpoint) {
          mode = 'live';
          return async function (input, opts) {
            var res = await fetch(cfg().aiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: input, stream: !!(opts && opts.onText) })
            });
            if (!res.ok) throw new Error('AI endpoint returned ' + res.status + '.');
            var type = res.headers.get('content-type') || '';
            if (type.indexOf('application/json') !== -1) {
              var json = await res.json();
              return json.text || json.content || json.output || '';
            }
            return res.text();
          };
        }
        mode = 'local';
        return null;
      } catch (e) {
        lastError = e && e.message ? e.message : 'AI bridge unavailable.';
        mode = 'local';
        return null;
      }
    })();
    return samplePromise;
  }

  async function check() {
    var s = await getSample();
    if (!s) mode = 'local';
    return mode;
  }

  function status() {
    return { mode: mode, bridge: hasBridge(), error: lastError, endpoint: cfg().aiEndpoint || '' };
  }

  async function runBridge(input, onText) {
    var s = await getSample();
    if (!s) return null;
    try {
      var opts = { cache: false };
      if (typeof onText === 'function') {
        opts.onText = function (ev) {
          var text = ev && typeof ev === 'object' ? (ev.text !== undefined ? ev.text : ev.delta) : ev;
          if (typeof text === 'string') onText(text);
        };
      }
      var r = await s(input, opts);
      if (!r) return null;
      if (typeof r === 'string') return r;
      if (typeof r.text === 'string') return r.text;
      if (typeof r.content === 'string') return r.content;
      return null;
    } catch (e) {
      lastError = e && e.message ? e.message : 'AI request failed.';
      if (e && typeof e.text === 'string') return e.text;
      return null;
    }
  }

  async function complete(input, onText) {
    return runBridge(input, onText);
  }

  function extractJson(raw) {
    if (!raw) return null;
    var text = String(raw).trim();
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    var candidates = [];
    var arrStart = text.indexOf('[');
    var arrEnd = text.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) candidates.push(text.slice(arrStart, arrEnd + 1));
    var objStart = text.indexOf('{');
    var objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) candidates.push(text.slice(objStart, objEnd + 1));
    candidates.push(text);
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i].replace(/,\s*([}\]])/g, '$1');
      try {
        var parsed = JSON.parse(c);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return null;
  }

  function arrFrom(parsed) {
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed;
    for (var k in parsed) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
    return null;
  }

  function simulatedStream(full, onText, charsPerTick) {
    return new Promise(function (resolve) {
      if (typeof onText !== 'function') return resolve(full);
      var i = 0;
      var step = charsPerTick || 10;
      var timer = setInterval(function () {
        i = Math.min(full.length, i + step);
        try { onText(full.slice(0, i)); } catch (e) {}
        if (i >= full.length) {
          clearInterval(timer);
          resolve(full);
        }
      }, 18);
    });
  }

  function courseContext(course) {
    if (!course) return 'No course selected.';
    return 'Field: ' + course.field + '. Topic: ' + course.topic + '. Level: ' + course.level + '. Daily study time: ' + course.mins + ' minutes. Course length: ' + course.days + ' days.';
  }

  async function plan(course) {
    var days = Math.max(3, Math.min(60, Number(course.days) || 14));
    var prompt = 'You are MegaLab, a curriculum architect. Build a ' + days + '-day learning plan.\n\n' +
      'Learner context: ' + courseContext(course) + '\n' +
      'Field: ' + course.field + '\nTopic: ' + course.topic + '\nLevel: ' + course.level + '\nDaily study time: ' + course.mins + ' minutes.\n\n' +
      'Return ONLY a JSON array of exactly ' + days + ' objects: {"title":"short lesson title (max 7 words)","goal":"one sentence describing what the learner can do after this lesson"}.\n' +
      'Rules: start from fundamentals, sequence so each day depends on the previous, include deliberate practice and retrieval, finish with one small final project. Each lesson must realistically fit in ' + course.mins + ' minutes. No fluff, no repeated titles.';
    var raw = await runBridge(prompt);
    var parsed = extractJson(raw);
    var arr = arrFrom(parsed);
    var out = [];
    if (arr && arr.length) {
      for (var i = 0; i < Math.min(days, arr.length); i++) {
        var item = arr[i] || {};
        var title = String(item.title || item.name || '').trim();
        var goal = String(item.goal || item.description || item.objective || '').trim();
        if (!title) break;
        out.push({ id: 'l' + (i + 1) + '_' + Math.random().toString(36).slice(2, 6), title: title.slice(0, 120), goal: goal.slice(0, 300) || 'Understand and apply ' + title + '.', body: '', done: 0, completedAt: null });
      }
    }
    if (out.length < days) {
      var base = data.planTemplate(course);
      for (var j = out.length; j < days; j++) out.push(base[j] || base[base.length - 1]);
    }
    return { plan: out.slice(0, days), ai: out.length > 0 && !!raw };
  }

  async function lesson(course, index, onText) {
    var p = course.plan[index];
    if (!p) return { text: '', ai: false };
    var words = Math.min(1200, Math.max(420, (course.mins || 30) * 12));
    var prompt = 'You are MegaLab, a warm and precise tutor. Write Day ' + (index + 1) + ' of ' + course.plan.length + ' for this learner.\n\n' +
      courseContext(course) + '\nLesson title: "' + p.title + '"\nLesson goal: ' + p.goal + '\n\n' +
      'Use markdown with exactly these H2 sections: "## Big idea", "## Learn it", "## Worked example", "## Try it now", "## Check yourself".\n' +
      'Requirements: be concrete and specific to ' + course.topic + '; include one short code or concrete artifact where useful; the Try it now task must fit in ' + course.mins + ' minutes; Check yourself has 3 questions without answers; no filler, no generic study advice; under ' + words + ' words.';
    var chunks = '';
    var raw = await runBridge(prompt, function (t) {
      chunks = t;
      if (typeof onText === 'function') onText(t);
    });
    if (raw) {
      var text = String(raw).trim();
      if (typeof onText === 'function' && !chunks) onText(text);
      return { text: text, ai: true };
    }
    var fallback = data.lessonTemplate(course, index);
    if (typeof onText === 'function') await simulatedStream(fallback, onText, 26);
    return { text: fallback, ai: false };
  }

  async function quiz(course, index) {
    var p = course.plan[index];
    var prompt = 'Create a 5-question multiple-choice retrieval quiz for this lesson.\n\n' +
      courseContext(course) + '\nLesson: "' + (p ? p.title : course.topic) + '"\nGoal: ' + (p ? p.goal : '') + '\n\n' +
      'Return ONLY a JSON array of 5 objects: {"q":"question","options":["a","b","c","d"],"answer":0,"why":"one sentence explanation of the correct answer"}. ' +
      'Mix recall, application and one misconception question. Exactly 4 options each. answer is the zero-based index of the correct option. No markdown.';
    var raw = await runBridge(prompt);
    var parsed = extractJson(raw);
    var arr = arrFrom(parsed);
    if (arr && arr.length) {
      var out = [];
      arr.forEach(function (x) {
        if (!x || !x.q) return;
        var options = Array.isArray(x.options) ? x.options.map(String).slice(0, 4) : [];
        while (options.length < 4) options.push('None of the above');
        var answer = Number(x.answer);
        if (!(answer >= 0 && answer <= 3)) answer = 0;
        out.push({ q: String(x.q), options: options, answer: answer, why: String(x.why || 'Review the lesson section that covers this idea.') });
      });
      if (out.length) return out.slice(0, 6);
    }
    return data.quizFallback(course, index);
  }

  async function cards(course, index) {
    var p = course.plan[index];
    var lessonText = p && p.body ? p.body.slice(0, 5000) : '';
    var prompt = 'Create 6 high-quality spaced-repetition flashcards for this lesson.\n\n' +
      courseContext(course) + '\nLesson: "' + (p ? p.title : course.topic) + '"\nGoal: ' + (p ? p.goal : '') + '\n' +
      (lessonText ? 'Lesson content:\n' + lessonText + '\n' : '') +
      '\nReturn ONLY a JSON array of objects: {"f":"front: one clear question or prompt","b":"back: short, specific answer (max 35 words)"}. ' +
      'Test one idea per card. Prefer understanding and application over trivia. No duplicate fronts.';
    var raw = await runBridge(prompt);
    var parsed = extractJson(raw);
    var arr = arrFrom(parsed);
    if (arr && arr.length) {
      var out = [];
      arr.forEach(function (x) {
        var f = x && (x.f || x.front || x.q);
        var b = x && (x.b || x.back || x.a || x.answer);
        if (f && b) out.push({ f: String(f).slice(0, 400), b: String(b).slice(0, 700) });
      });
      if (out.length) return out.slice(0, 10);
    }
    return data.cardsFallback(course, index);
  }

  async function mentor(course, messages, lessonObj, onText) {
    var system = 'You are MegaLab\'s Socratic tutor. ' + courseContext(course) +
      ' Current lesson: ' + (lessonObj ? lessonObj.title + ' (' + lessonObj.goal + ')' : course ? course.topic : 'general study') + '. ' +
      'Be warm, concrete and brief. Prefer one clear explanation plus one check question. Use markdown. Never invent facts; say when something is uncertain. Do not reveal quiz answers unless the learner has attempted them.';
    var turns = messages.slice(-14).map(function (m) { return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }; });
    while (turns.length && turns[0].role !== 'user') turns.shift();
    if (turns.length) turns[0] = { role: 'user', content: system + '\n\n' + turns[0].content };
    var chunks = '';
    var raw = await runBridge(turns, function (t) {
      chunks = t;
      if (typeof onText === 'function') onText(t);
    });
    if (raw) {
      var text = String(raw).trim();
      if (typeof onText === 'function' && !chunks) onText(text);
      return { text: text, ai: true };
    }
    var lastUser = '';
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUser = messages[i].content; break; }
    }
    var fallback = data.chatFallback(course, lastUser, lessonObj);
    if (typeof onText === 'function') await simulatedStream(fallback, onText, 14);
    return { text: fallback, ai: false };
  }

  function codeFallback(code, lang, action) {
    var lines = String(code || '').split('\n');
    var notes = [];
    var hasConsole = /console\.(log|warn|error)/.test(code);
    var hasTodo = /TODO|FIXME/i.test(code);
    var hasVar = /\bvar\s+/.test(code);
    var hasEq = /[^=!<>]==[^=]/.test(code);
    var hasEval = /\beval\s*\(|new Function/.test(code);
    var hasCatch = /catch\s*\(/.test(code);
    var unbalanced = 0;
    for (var i = 0; i < code.length; i++) {
      if (code[i] === '(') unbalanced++;
      if (code[i] === ')') unbalanced--;
    }
    if (!code.trim()) return '## Nothing to review yet\n\nPaste or write a snippet in the editor, then run it. I will review the actual code and output — not a guess.';
    notes.push('**Length:** ' + lines.length + ' lines of ' + (lang || 'code') + '.');
    if (hasVar) notes.push('**Modernise:** prefer `const`/`let` over `var` to make scope explicit.');
    if (hasEq) notes.push('**Equality:** one `==` found. Prefer `===` unless you deliberately need coercion.');
    if (!hasCatch && /\b(try)\b/.test(code)) notes.push('**Error handling:** a `try` block without a `catch`/`finally` will swallow context.');
    if (hasEval) notes.push('**Security:** `eval`/`new Function` executes arbitrary strings. Avoid for untrusted input.');
    if (hasTodo) notes.push('**Open work:** TODO/FIXME markers are still in the snippet.');
    if (unbalanced !== 0) notes.push('**Syntax:** parentheses appear unbalanced (' + unbalanced + '). Run again after fixing.');
    if (!hasConsole) notes.push('**Observability:** no `console.log` — add one to verify the output you expect.');
    if (!notes.length) notes.push('**Structure:** no obvious red flags. Check edge cases: empty input, one item, very large input, and invalid types.');
    var modeText = {
      review: '## Code review',
      explain: '## What this code does',
      bugs: '## Bug hunt',
      optimize: '## Refactor plan'
    }[action] || '## Code review';
    var parts = [modeText + '\n'];
    parts.push('> Offline review — no live AI bridge is available in this environment. Connect an AI runtime for a line-by-line review. Here is a deterministic static check instead.\n');
    parts.push('### Signal check');
    notes.forEach(function (n) { parts.push('- ' + n); });
    parts.push('\n### Suggested next moves');
    if (action === 'optimize') {
      parts.push('1. Name the input size the code must handle.');
      parts.push('2. Find the nested loop or repeated work; remove one layer if possible.');
      parts.push('3. Measure before and after — do not optimise by feel.');
      parts.push('4. Extract pure functions so each piece can be tested.');
    } else if (action === 'bugs') {
      parts.push('1. Write the smallest failing input.');
      parts.push('2. Predict the output before running.');
      parts.push('3. Check boundary values: zero, one, negative, very large, null.');
      parts.push('4. Add an assertion for the behaviour you actually need.');
    } else if (action === 'explain') {
      parts.push('Read the code top to bottom and write one sentence per block: **input → transformation → output**. If a block needs two sentences, it probably does two jobs.');
    } else {
      parts.push('1. Add a test for the happy path and one edge case.');
      parts.push('2. Replace magic numbers with named constants.');
      parts.push('3. Keep functions small enough to read without scrolling.');
      parts.push('4. Ask the mentor to quiz you on why, not just what.');
    }
    parts.push('\n### Verify it yourself');
    parts.push('Run the snippet, paste the real output back, and ask for a second pass focused on the failure you see.');
    return parts.join('\n');
  }

  async function reviewCode(code, lang, action, onText) {
    var actionLabel = { review: 'a thorough code review', explain: 'an explanation of what the code does', bugs: 'a focused bug hunt', optimize: 'a refactor and optimisation plan' }[action] || 'a code review';
    var prompt = 'You are MegaLab Code Lab, embedded in a learning workspace. Give ' + actionLabel + ' for this ' + (lang || '') + ' snippet.\n\n' +
      'Teach, do not just rewrite. Structure the response with markdown H3 sections: "What works", "Risks / bugs", "One better version" (only if useful, max 25 lines), "Practice next". Be specific to the code. If you are unsure, say so. Keep it under 650 words.\n\n```' + (lang || '') + '\n' + String(code).slice(0, 12000) + '\n```';
    var chunks = '';
    var raw = await runBridge(prompt, function (t) {
      chunks = t;
      if (typeof onText === 'function') onText(t);
    });
    if (raw) {
      var text = String(raw).trim();
      if (typeof onText === 'function' && !chunks) onText(text);
      return { text: text, ai: true };
    }
    var fallback = codeFallback(code, lang, action);
    if (typeof onText === 'function') await simulatedStream(fallback, onText, 22);
    return { text: fallback, ai: false };
  }

  async function insight(course, stats) {
    var prompt = 'You are MegaLab\'s learning coach. In 2 short sentences (max 45 words total), give this learner one concrete next action based on their data. Be specific, warm, no clichés.\n\n' + courseContext(course) + '\nLessons done: ' + stats.lessonsDone + '/' + stats.lessonsTotal + '. Streak: ' + stats.bestStreak + ' days. XP: ' + stats.xp + '. Cards due: ' + stats.due + '. Minutes logged: ' + stats.minutes + '.';
    var raw = await runBridge(prompt);
    if (raw) return String(raw).trim();
    var due = stats.due || 0;
    if (!stats.lessonsTotal) return 'You have a blank lab. Pick one concrete skill you want to be able to demonstrate in two weeks, then build a course around that outcome.';
    if (due > 5) return 'You have ' + due + ' cards due. Clear them in one 12-minute sprint before starting a new lesson — retrieval first protects everything you have already built.';
    if (stats.streak === 0) return 'Start with one 15-minute lesson today. A short session that happens beats a perfect plan that does not.';
    if (stats.lessonsDone / Math.max(1, stats.lessonsTotal) > 0.7) return 'You are past 70% of this course. Block one session for the final project this week so the knowledge turns into proof.';
    return 'Your next best move is one focused lesson plus the hands-on task — skip rereading. Then explain the idea back to the mentor in three sentences.';
  }

  ML.ai = {
    check: check, status: status, hasBridge: hasBridge,
    plan: plan, lesson: lesson, quiz: quiz, cards: cards, mentor: mentor,
    reviewCode: reviewCode, insight: insight,
    complete: complete, runBridge: runBridge, arrFrom: arrFrom,
    extractJson: extractJson
  };
})();
