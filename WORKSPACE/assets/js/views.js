/* MegaLab — practice studios, analytics, planner, notes, code lab, profile, classroom */
(function () {
  'use strict';
  window.ML = window.ML || {};
  ML.session = ML.session || {};
  var D = ML.data;
  var icon = D.icon;
  var esc = ML.ui.esc;
  var md = ML.ui.md;

  function courseOptions(selected) {
    return ML.store.get().courses.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.topic) + '</option>';
    }).join('');
  }

  function nextLesson(course) {
    var i = ML.ui.nextIndex(course);
    if (i < 0) return null;
    return { lesson: course.plan[i], index: i };
  }

  function fmtClock(totalSeconds) {
    var s = Math.max(0, Math.round(totalSeconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  /* Mentor */
  function chatMessage(m, i) {
    var isUser = m.role === 'user';
    return '<div class="chat-msg ' + (isUser ? 'user' : 'ai') + '">' +
      '<span class="av">' + (isUser ? esc(ML.ui.initials(ML.auth.user() ? ML.auth.user().name : 'You')) : icon('sparkles')) + '</span>' +
      '<div><div class="bubble">' + (isUser ? '<div class="md">' + esc(m.content).replace(/\n/g, '<br>') + '</div>' : '<div class="md">' + md(m.content) + '</div>') + '</div>' +
      '<div class="meta"><span>' + esc(ML.ui.fmtTime(m.at)) + '</span><button class="copy" data-act="copy-chat" data-i="' + i + '" aria-label="Copy message">' + icon('copy') + '</button></div></div></div>';
  }

  function mentor(ui) {
    var state = ML.store.get();
    var course = ML.store.activeCourse();
    var messages = state.chat.filter(function (m) { return !course || !m.courseId || m.courseId === course.id; }).slice(-80);
    var nl = course ? nextLesson(course) : null;
    var status = ML.ai.status();
    var chat = messages.length
      ? messages.map(chatMessage).join('')
      : '<div class="chat-welcome"><span class="spark">' + icon('sparkles') + '</span><h3>Ask one precise question.</h3><p>' + (course ? 'I know your course, your level and today’s lesson. I’ll give you one clear step at a time — not a wall of text.' : 'Build a course first and I will teach inside it. You can still ask a general study question now.') + '</p><div class="chat-suggest">' +
        '<button data-act="chat-suggest" data-text="Explain the core idea in the simplest possible way.">Explain the core idea simply</button>' +
        '<button data-act="chat-suggest" data-text="Quiz me on today’s lesson with three questions.">Quiz me on today’s lesson</button>' +
        '<button data-act="chat-suggest" data-text="Give me one concrete worked example, step by step.">Give a worked example</button>' +
        '<button data-act="chat-suggest" data-text="What should I do next to make this stick?">What should I do next?</button>' +
        '</div></div>';
    var html = '<div class="page"><div class="page-head"><div><p class="eyebrow">Socratic tutor</p><h1>AI mentor</h1><p>' + (course ? 'Teaching inside <b>' + esc(course.topic) + '</b> · ' + esc(course.level) + ' level.' : 'No active course. Build one to give the mentor full context.') + '</p></div><div class="page-actions">' +
      (state.courses.length ? '<select class="select" style="max-width:230px;min-height:38px;font-size:12.5px" data-act="mentor-course" aria-label="Choose course">' + courseOptions(course ? course.id : '') + '</select>' : '') +
      '<button class="btn btn-outline" data-act="clear-chat">' + icon('trash') + ' Clear chat</button></div></div>' +
      '<div class="mentor-layout"><section class="chat-panel">' +
      '<div class="chat-head"><span class="ai-avatar">' + icon('sparkles') + '</span><div><b>MegaLab mentor</b><span><i></i>' + (status.mode === 'live' ? 'AI connected' : 'Offline tutor active') + '</span></div><div class="actions"><span class="chip brand">' + icon('target') + (nl ? 'Day ' + (nl.index + 1) : 'Course complete') + '</span></div></div>' +
      '<div class="chat-log" id="chat-log">' + chat + '<div id="chat-stream"></div></div>' +
      '<div class="composer"><form class="composer-box" data-form="chat"><textarea id="chat-input" rows="1" placeholder="Ask about a concept, paste an error, request a quiz…" aria-label="Message the mentor"></textarea><button class="send" type="submit" aria-label="Send message">' + icon('send') + '</button></form><p class="composer-hint">Enter to send · Shift + Enter for a new line · verify important facts</p></div>' +
      '</section><aside class="stack">' +
      '<div class="panel"><div class="panel-head"><h2>Context</h2><span class="badge ' + (status.mode === 'live' ? 'ok' : 'warm') + '">' + (status.mode === 'live' ? 'Live' : 'Offline') + '</span></div><div class="panel-body"><div class="ai-context">' +
      '<div class="ctx-item">' + icon('book') + '<div><b>' + esc(course ? course.topic : 'No course') + '</b><br>' + (course ? esc(course.field) + ' · ' + esc(course.level) + ' · ' + course.mins + ' min/day' : 'Your mentor still answers general questions.') + '</div></div>' +
      (nl ? '<div class="ctx-item">' + icon('target') + '<div><b>Day ' + (nl.index + 1) + ': ' + esc(nl.lesson.title) + '</b><br>' + esc(nl.lesson.goal) + '</div></div>' : '') +
      '<div class="ctx-item">' + icon('cards') + '<div><b>' + ML.store.dueCards().length + ' cards due</b><br>Reviewing keeps the mentor’s context accurate.</div></div>' +
      '</div></div>' + (nl ? '<div class="panel-foot"><button class="btn btn-sm btn-primary btn-block" data-nav="lesson/' + esc(course.id) + '/' + nl.index + '">' + icon('play') + ' Open today’s lesson</button></div>' : '') + '</div>' +
      '<div class="card"><h3 style="font-size:13px;margin-bottom:6px">How to get better answers</h3><p class="muted" style="font-size:11.5px;line-height:1.65">Name the exact step that breaks. Paste the smallest failing example. Say what you expected. A precise question is already half the learning.</p></div>' +
      '<div class="card"><h3 style="font-size:13px;margin-bottom:6px">Privacy</h3><p class="muted" style="font-size:11.5px;line-height:1.65">Chats stay in this browser, and sync to your own Google Drive when Drive sync is on. Nothing is sent to a MegaLab server — there isn’t one.</p></div>' +
      '</aside></div></div>';
    return html;
  }

  /* Flashcards */
  function ensureCards() {
    if (!ML.session.cards) {
      ML.session.cards = { ids: ML.store.dueCards().map(function (c) { return c.id; }), idx: 0, revealed: false };
    }
    return ML.session.cards;
  }

  function cards(ui) {
    var state = ML.store.get();
    var sess = ensureCards();
    var all = state.cards;
    var byId = {};
    all.forEach(function (c) { byId[c.id] = c; });
    var current = null;
    while (sess.idx < sess.ids.length && !byId[sess.ids[sess.idx]]) sess.idx++;
    if (sess.idx < sess.ids.length) current = byId[sess.ids[sess.idx]];
    var due = ML.store.dueCards();
    var course = ML.store.activeCourse();
    var stage;
    if (!all.length) {
      stage = '<div class="flash-empty"><span class="big">' + icon('cards') + '</span><h3 style="font-size:18px">No cards yet</h3><p class="muted" style="font-size:13px;max-width:38ch">Make a lesson, or write a card by hand. The scheduler will bring it back right before you forget it.</p><div class="row" style="margin-top:4px"><button class="btn btn-primary" data-act="add-card">' + icon('plus') + ' Add a card</button>' + (course ? '<button class="btn btn-outline" data-act="lesson-cards" data-index="0">Make from lesson</button>' : '') + '</div></div>';
    } else if (!current) {
      stage = '<div class="flash-empty"><span class="big">' + icon('check') + '</span><h3 style="font-size:18px">Queue cleared.</h3><p class="muted" style="font-size:13px;max-width:38ch">Nothing due right now. Come back tomorrow, or add cards while the material is fresh.</p><div class="row" style="margin-top:4px"><button class="btn btn-primary" data-act="add-card">' + icon('plus') + ' Add a card</button><button class="btn btn-outline" data-act="cards-rebuild">' + icon('rotate') + ' Review all again</button></div></div>';
    } else {
      stage = '<div class="flash-meta"><span>Card ' + (sess.idx + 1) + ' of ' + sess.ids.length + '</span><span>' + (current.courseId ? esc((ML.store.findCourse(current.courseId) || {}).topic || 'Course card') : 'General') + ' · ' + (current.reviews || 0) + ' reviews</span></div>' +
        '<div class="flash-front"><div class="q-label">Prompt</div><h2>' + esc(current.f) + '</h2>' + (sess.revealed ? '' : '<div class="flash-controls"><button class="btn btn-primary" data-act="card-reveal">Reveal answer <span style="opacity:.6;font-size:11px">Space</span></button></div>') + '</div>' +
        (sess.revealed ? '<div class="flash-back"><p>' + esc(current.b) + '</p><div class="rate-row">' +
          '<button class="rate-btn again" data-act="card-rate" data-q="0"><b>Again</b><small>1 day</small></button>' +
          '<button class="rate-btn" data-act="card-rate" data-q="1"><b>Hard</b><small>Shorter</small></button>' +
          '<button class="rate-btn" data-act="card-rate" data-q="2"><b>Good</b><small>On track</small></button>' +
          '<button class="rate-btn easy" data-act="card-rate" data-q="3"><b>Easy</b><small>Longer</small></button>' +
          '</div></div>' : '');
    }
    var recent = all.slice(0, 8);
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Spaced repetition</p><h1>Flashcards</h1><p>A tuned SM-2 scheduler brings each idea back right before you would forget it.</p></div><div class="page-actions"><button class="btn btn-outline" data-act="cards-rebuild">' + icon('rotate') + ' Rebuild queue</button><button class="btn btn-primary" data-act="add-card">' + icon('plus') + ' Add card</button></div></div>' +
      '<div class="review-layout"><section class="flash-stage">' + stage + '</section><aside class="stack">' +
      '<div class="panel"><div class="panel-head"><h2>Deck health</h2><span class="badge ' + (due.length ? 'warm' : 'ok') + '">' + due.length + ' due</span></div><div class="panel-body"><div class="deck-stats"><div><b>' + all.length + '</b><span>total cards</span></div><div><b>' + due.length + '</b><span>due today</span></div><div><b>' + all.filter(function (c) { return (c.reviews || 0) > 0; }).length + '</b><span>reviewed once</span></div><div><b>' + all.filter(function (c) { return (c.int || 0) >= 21; }).length + '</b><span>mature cards</span></div></div><div class="divider" style="margin:14px 0"></div><div class="caps" style="margin-bottom:8px">Recent cards</div><div class="deck-list">' + (recent.length ? recent.map(function (c) {
        return '<div class="deck-item"><span class="dot"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.f) + '</span><b>' + esc(c.due || 'now') + '</b></div>';
      }).join('') : '<p class="muted" style="font-size:11.5px">No cards in the deck.</p>') + '</div></div>' + (course ? '<div class="panel-foot"><button class="btn btn-sm btn-outline btn-block" data-nav="course/' + esc(course.id) + '">' + icon('book') + ' Open ' + esc(course.topic) + '</button></div>' : '') + '</div>' +
      '<div class="card"><h3 style="font-size:13px;margin-bottom:6px">Reviewing well</h3><p class="muted" style="font-size:11.5px;line-height:1.65">Answer out loud before revealing. Rate the difficulty honestly: “Again” is information, not failure. Cards are shared across courses only when you add them without context.</p></div>' +
      '</aside></div></div>';
  }

  /* Focus */
  function focusState() {
    if (!ML.session.focus) ML.session.focus = { duration: 1500, remaining: 1500, running: false, mode: 'Pomodoro', task: '', distractions: 0, endsAt: 0 };
    return ML.session.focus;
  }

  function focus(ui) {
    var state = ML.store.get();
    var f = focusState();
    var today = state.log[ML.store.todayKey()] || 0;
    var goal = state.settings.dailyGoal || 30;
    var pct = Math.min(100, Math.round(today / Math.max(1, goal) * 100));
    var C = 2 * Math.PI * 118;
    var offset = C * (1 - Math.max(0, Math.min(1, f.remaining / Math.max(1, f.duration))));
    var sessions = state.focusSessions.slice(0, 6);
    var modeMin = Math.round(f.duration / 60);
    var modes = [
      ['Pomodoro', 25], ['Deep work', 50], ['Short sprint', 15], ['Break', 5]
    ];
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Deep work</p><h1>Focus studio</h1><p>One timer, one task, one distraction log. Every focused minute feeds your streak and analytics.</p></div><div class="page-actions"><span class="chip warm">' + icon('flame') + ML.store.streak() + '-day streak</span><span class="chip">' + icon('clock') + today + ' / ' + goal + ' min today</span></div></div>' +
      '<div class="focus-layout"><section class="focus-stage">' +
      '<div class="focus-modes">' + modes.map(function (m) {
        var on = modeMin === m[1];
        return '<button class="' + (on ? 'on' : '') + '" data-act="focus-mode" data-min="' + m[1] + '">' + m[0] + ' · ' + m[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="timer-wrap"><svg class="timer-svg" viewBox="0 0 260 260" aria-hidden="true"><circle class="track" cx="130" cy="130" r="118"></circle><circle class="fill" id="timer-fill" cx="130" cy="130" r="118" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle></svg><div class="timer-inner"><div class="t" id="timer-text">' + fmtClock(f.remaining) + '</div><div class="m" id="timer-mode">' + esc(f.mode) + '</div><div class="mode">' + (f.running ? icon('play') + ' Running' : icon('pause') + ' Ready when you are') + '</div></div></div>' +
      '<div class="focus-actions"><button class="btn btn-primary" data-act="focus-toggle">' + icon(f.running ? 'pause' : 'play') + (f.running ? 'Pause' : 'Start focus') + '</button><button class="btn btn-outline" data-act="focus-reset">' + icon('rotate') + ' Reset</button><button class="btn btn-outline" data-act="focus-complete">' + icon('check') + ' Log early</button></div>' +
      '<form class="row" data-form="focus-task" style="width:100%;max-width:440px;gap:7px"><input class="input" id="focus-task" placeholder="What is the one outcome of this session?" value="' + esc(f.task || '') + '" aria-label="Focus task"><button class="btn btn-outline" type="submit">' + icon('save') + ' Set task</button></form>' +
      '<div class="distraction"><span class="caps" style="align-self:center;margin-right:2px">Distracted?</span><button data-act="distraction" data-label="Phone">Phone</button><button data-act="distraction" data-label="Tab drift">Tab drift</button><button data-act="distraction" data-label="People">People</button><button data-act="distraction" data-label="Other">Other</button>' + (f.distractions ? '<span class="badge warm">' + f.distractions + ' logged</span>' : '') + '</div>' +
      '<p class="focus-note">The timer survives refreshes. If you leave the tab, it keeps counting from the real clock — no fake productivity.</p>' +
      '</section><aside class="stack">' +
      '<div class="panel"><div class="panel-head"><div><h2>Today</h2><div class="sub">' + hm(today) + ' of ' + hm(goal) + '</div></div><span class="badge">' + pct + '%</span></div><div class="panel-body"><div class="progress"><i style="width:' + pct + '%"></i></div><div class="progress-row"><span>Daily goal</span><span>' + pct + '%</span></div><div class="divider" style="margin:14px 0"></div><div class="row between"><div><div class="due-big">' + sessions.length + '</div><span class="muted" style="font-size:10.5px">recent sessions</span></div><button class="btn btn-sm btn-outline" data-nav="progress">Analytics</button></div></div></div>' +
      '<div class="panel"><div class="panel-head"><h2>Session checklist</h2><button class="link-btn" data-nav="planner">Planner ' + icon('arrow-right') + '</button></div><div class="panel-body">' +
      '<div class="task-list">' + (state.tasks.length ? state.tasks.slice(0, 6).map(function (t) {
        return '<div class="task-item' + (t.done ? ' done' : '') + '"><input type="checkbox" data-act="task-toggle" data-id="' + esc(t.id) + '"' + (t.done ? ' checked' : '') + ' aria-label="' + esc(t.text) + '"><label>' + esc(t.text) + '</label><button data-act="task-delete" data-id="' + esc(t.id) + '" aria-label="Delete task">' + icon('x') + '</button></div>';
      }).join('') : '<p class="muted" style="font-size:11.5px">No tasks yet. Pick one concrete outcome for this block.</p>') + '</div>' +
      '<form class="task-form" data-form="task-add"><input class="input" name="text" placeholder="Add a session task" aria-label="New task"><button class="btn btn-sm btn-outline" type="submit">' + icon('plus') + '</button></form></div></div>' +
      '<div class="panel"><div class="panel-head"><h2>Recent focus</h2><span class="chip">' + hm(state.stats.focusSessions ? state.focusSessions.reduce(function (a, x) { return a + x.mins; }, 0) : 0) + '</span></div><div class="panel-body"><div class="session-list">' + (sessions.length ? sessions.map(function (s) {
        return '<div class="session-item">' + icon('check-circle') + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.task || 'Deep work') + '</span><b>' + s.mins + 'm</b></div>';
      }).join('') : '<p class="muted" style="font-size:11.5px">Your first completed focus block will appear here.</p>') + '</div></div></div>' +
      '</aside></div></div>';
  }

  function hm(mins) { return ML.ui.hm(mins); }

  /* Progress */
  function progress(ui) {
    var state = ML.store.get();
    var stats = ML.store.courseStats();
    var due = ML.store.dueCards().length;
    var total = stats.minutes;
    var days = 84;
    var cells = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = ML.store.dateKey(d);
      var m = state.log[key] || 0;
      var level = m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4;
      cells.push('<div class="heat-cell" data-l="' + level + '" title="' + esc(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + m + ' min') + '"></div>');
    }
    var activeDays = Object.keys(state.log).filter(function (k) { return state.log[k] > 0; }).length;
    var avg = activeDays ? Math.round(total / activeDays) : 0;
    var reviewed = state.cards.filter(function (c) { return (c.reviews || 0) > 0; });
    var mature = state.cards.filter(function (c) { return (c.int || 0) >= 21; });
    var avgEase = state.cards.length ? state.cards.reduce(function (a, c) { return a + (c.ease || 2.5); }, 0) / state.cards.length : 2.5;
    var insight = ML.ui.localInsight(ML.store.activeCourse(), stats, ML.store.streak(), due);
    var courseBars = state.courses.length ? state.courses.map(function (c) {
      var p = ML.store.courseProgress(c);
      return '<div class="subject-bar"><div class="row"><b>' + esc(c.topic) + '</b><span>' + p.pct + '%</span></div><div class="progress"><i style="width:' + p.pct + '%"></i></div></div>';
    }).join('') : '<p class="muted" style="font-size:11.5px">Build a course to see subject mastery here.</p>';
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Learning intelligence</p><h1>Progress</h1><p>No vanity metrics. Just the shortest path to what you said you wanted.</p></div><div class="page-actions"><button class="btn btn-outline" data-act="ai-insight">' + icon('sparkles') + ' Coach insight</button><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' New course</button></div></div>' +
      '<div class="stat-strip">' +
      '<div class="stat-card"><span class="si">' + icon('clock') + '</span><b>' + ML.ui.hm(total) + '</b><span>total study time</span><small>' + activeDays + ' active days logged</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('flame') + '</span><b>' + ML.store.streak() + '</b><span>current streak</span><small>Best: ' + stats.bestStreak + ' days</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('target') + '</span><b>' + stats.lessonsDone + '/' + stats.lessonsTotal + '</b><span>lessons complete</span><small>' + stats.coursesFinished + ' course' + (stats.coursesFinished === 1 ? '' : 's') + ' finished</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('cards') + '</span><b>' + state.cards.length + '</b><span>flashcards made</span><small>' + due + ' due now · ' + stats.reviews + ' reviews</small></div>' +
      '</div>' +
      '<div class="analytics-grid"><div class="stack">' +
      '<section class="panel"><div class="panel-head"><div><h2>Consistency map</h2><div class="sub">Last 12 weeks · every square is one day</div></div><span class="chip warm">' + icon('flame') + stats.bestStreak + ' best</span></div><div class="panel-body"><div class="heatmap-wrap"><div class="heatmap">' + cells.join('') + '</div></div><div class="heat-legend"><span>Less</span><i data-l="0"></i><i data-l="1"></i><i data-l="2"></i><i data-l="3"></i><i data-l="4"></i><span>More</span></div></div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2>This week</h2><div class="sub">Minutes studied per day</div></div><span class="badge brand">' + ML.ui.hm(ML.ui.weeklyMinutes()) + '</span></div><div class="panel-body">' + ML.ui.chart7() + '</div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2>Course mastery</h2><div class="sub">Completion by course</div></div><button class="link-btn" data-nav="courses">All courses ' + icon('arrow-right') + '</button></div><div class="panel-body"><div class="subject-bars">' + courseBars + '</div></div></section>' +
      '</div><div class="stack">' +
      '<section class="panel"><div class="panel-head"><h2>Retention</h2><span class="badge ' + (mature.length ? 'ok' : '') + '">' + mature.length + ' mature</span></div><div class="panel-body"><div class="retention-list">' +
      '<div class="retention-item"><span style="width:92px">Reviewed</span><div class="bar"><i style="width:' + (state.cards.length ? Math.round(reviewed.length / state.cards.length * 100) : 0) + '%;background:var(--brand)"></i></div><span class="val">' + reviewed.length + '</span></div>' +
      '<div class="retention-item"><span style="width:92px">Mature (21d+)</span><div class="bar"><i style="width:' + (state.cards.length ? Math.round(mature.length / state.cards.length * 100) : 0) + '%;background:var(--ok)"></i></div><span class="val">' + mature.length + '</span></div>' +
      '<div class="retention-item"><span style="width:92px">Avg. ease</span><div class="bar"><i style="width:' + Math.round(Math.max(0, Math.min(100, (avgEase - 1.3) / 1.7 * 100))) + '%;background:var(--warm)"></i></div><span class="val">' + avgEase.toFixed(1) + '</span></div>' +
      '<div class="retention-item"><span style="width:92px">Due now</span><div class="bar"><i style="width:' + (state.cards.length ? Math.round(due / state.cards.length * 100) : 0) + '%;background:var(--info)"></i></div><span class="val">' + due + '</span></div>' +
      '</div><div class="divider" style="margin:14px 0"></div><div class="row between"><span class="muted" style="font-size:11px">Avg. minutes per active day</span><b>' + avg + 'm</b></div></div></section>' +
      '<section class="card insight-card"><div class="ic-box">' + icon('lightbulb') + '</div><h3>' + esc(insight.title) + '</h3><p>' + esc(insight.text) + '</p><div class="row"><button class="btn btn-sm btn-primary" data-nav="' + insight.action + '">' + esc(insight.label) + '</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Next actions</h2><span class="chip brand">AI coach</span></div><div class="panel-body"><div class="insight-list" id="ai-insight">' +
      '<div class="insight-item">' + icon('rotate') + '<div><b>' + (due ? 'Clear ' + due + ' due cards.' : 'Keep the queue clear.') + '</b> ' + (due ? 'Retrieval first protects what you already built.' : 'Add cards from today’s lesson while it is fresh.') + '</div></div>' +
      '<div class="insight-item">' + icon('target') + '<div><b>' + (stats.lessonsDone >= stats.lessonsTotal && stats.lessonsTotal ? 'Turn the course into proof.' : 'Do one focused lesson.') + '</b> ' + (stats.lessonsDone >= stats.lessonsTotal && stats.lessonsTotal ? 'Build a small artifact without the tutorial open.' : 'Then explain the core idea in three sentences.') + '</div></div>' +
      '<div class="insight-item">' + icon('terminal') + '<div><b>Ship something tiny.</b> The Code Lab turns understanding into evidence you can show.</div></div>' +
      '</div></div></section>' +
      '</div></div></div>';
  }

  /* Planner */
  function planner(ui) {
    var state = ML.store.get();
    var weekStart = state.settings.weekStart || 'Mon';
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var dow = start.getDay();
    var diff = weekStart === 'Sun' ? dow : (dow === 0 ? 6 : dow - 1);
    start.setDate(start.getDate() - diff);
    var today = ML.store.todayKey();
    var days = [];
    var dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(d.getDate() + i);
      var key = ML.store.dateKey(d);
      var items = Array.isArray(state.planner[key]) ? state.planner[key] : [];
      days.push({ date: d, key: key, items: items, today: key === today });
    }
    var course = ML.store.activeCourse();
    var remaining = course ? course.plan.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) { return !x.l.done; }) : [];
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Weekly rhythm</p><h1>Planner</h1><p>Put the important work on a day. A plan you can see beats a plan you remember.</p></div><div class="page-actions"><button class="btn btn-outline" data-act="plan-week">' + icon('wand') + ' Auto-plan week</button><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' New course</button></div></div>' +
      '<div class="planner-grid">' + days.map(function (day) {
        return '<div class="planner-day' + (day.today ? ' today' : '') + '"><span class="dow">' + dowNames[day.date.getDay()] + '</span><span class="date">' + day.date.getDate() + '</span>' +
          (day.items.length ? day.items.map(function (it) {
            return '<div class="planner-item' + (it.done ? ' done' : '') + '" data-act="planner-toggle" data-date="' + esc(day.key) + '" data-id="' + esc(it.id) + '">' + esc(it.text) + '<span class="mins">' + (it.mins ? it.mins + ' min' : 'task') + '</span></div>';
          }).join('') : '<span class="rest">' + (day.today ? 'Open — choose one block.' : 'Rest / review') + '</span>') +
          '</div>';
      }).join('') + '</div>' +
      '<div class="grid cols-2">' +
      '<section class="panel"><div class="panel-head"><div><h2>Course runway</h2><div class="sub">' + (course ? esc(course.topic) + ' · ' + remaining.length + ' lessons left' : 'No active course') + '</div></div><button class="link-btn" data-nav="' + (course ? 'course/' + course.id : 'courses') + '">Open ' + icon('arrow-right') + '</button></div><div class="panel-body">' +
      (remaining.length ? '<div class="syllabus" style="margin:-20px">' + remaining.slice(0, 6).map(function (x) {
        return '<button class="syllabus-row" data-nav="lesson/' + esc(course.id) + '/' + x.i + '"><span class="n">' + (x.i + 1) + '</span><span class="grow"><b>' + esc(x.l.title) + '</b><span>' + esc(x.l.goal) + '</span></span><span class="right">' + icon('chevron-right', 'ic-sm') + '</span></button>';
      }).join('') + '</div>' : '<div class="empty"><h3>Nothing queued</h3><p>Build a course or add tasks to plan the week.</p><button class="btn btn-sm btn-primary" data-act="new-course">Build a course</button></div>') +
      '</div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Task list</h2><span class="badge">' + state.tasks.filter(function (t) { return !t.done; }).length + ' open</span></div><div class="panel-body"><div class="task-list">' + (state.tasks.length ? state.tasks.map(function (t) {
        return '<div class="task-item' + (t.done ? ' done' : '') + '"><input type="checkbox" data-act="task-toggle" data-id="' + esc(t.id) + '"' + (t.done ? ' checked' : '') + ' aria-label="' + esc(t.text) + '"><label>' + esc(t.text) + '</label><button data-act="task-delete" data-id="' + esc(t.id) + '" aria-label="Delete task">' + icon('x') + '</button></div>';
      }).join('') : '<p class="muted" style="font-size:11.5px">No tasks yet.</p>') + '</div><form class="task-form" data-form="task-add"><input class="input" name="text" placeholder="Add a concrete task" aria-label="New task"><button class="btn btn-sm btn-outline" type="submit">' + icon('plus') + '</button></form></div></section>' +
      '</div></div>';
  }

  /* Notes */
  function notes(ui) {
    var state = ML.store.get();
    var ns = ML.session.notes || (ML.session.notes = { query: '', courseId: 'all' });
    var q = ns.query.toLowerCase();
    var filtered = state.notes.filter(function (n) {
      if (ns.courseId !== 'all' && n.courseId !== ns.courseId) return false;
      if (!q) return true;
      return (n.title + ' ' + n.body).toLowerCase().indexOf(q) !== -1;
    });
    var course = function (id) { return ML.store.findCourse(id); };
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Second brain</p><h1>Notes</h1><p>Write in your own words. Notes are where you find your real questions.</p></div><div class="page-actions"><button class="btn btn-primary" data-act="note-new">' + icon('plus') + ' New note</button></div></div>' +
      '<div class="row wrap" style="gap:8px"><input class="input" id="notes-search" data-live="notes" placeholder="Search notes…" value="' + esc(ns.query) + '" aria-label="Search notes" style="max-width:320px"><div class="chip-scroll"><button class="chip ' + (ns.courseId === 'all' ? 'on' : '') + '" data-act="notes-filter" data-id="all">All notes</button>' + state.courses.map(function (c) {
        return '<button class="chip ' + (ns.courseId === c.id ? 'on' : '') + '" data-act="notes-filter" data-id="' + esc(c.id) + '">' + esc(c.topic) + '</button>';
      }).join('') + '</div></div>' +
      (filtered.length ? '<div class="notes-grid">' + filtered.map(function (n) {
        var c = n.courseId ? course(n.courseId) : null;
        return '<article class="note-card" data-act="note-open" data-id="' + esc(n.id) + '" tabindex="0"><div class="note-head">' + (c ? '<span class="badge brand">' + esc(c.topic) + '</span>' : '<span class="badge">General</span>') + (typeof n.lessonIndex === 'number' && c ? '<span class="badge">Day ' + (n.lessonIndex + 1) + '</span>' : '') + '<div class="note-tools"><button class="card-tool" data-act="note-cards" data-id="' + esc(n.id) + '" aria-label="Make a flashcard">' + icon('cards') + '</button><button data-act="note-delete" data-id="' + esc(n.id) + '" aria-label="Delete note">' + icon('trash') + '</button></div></div><h3>' + esc(n.title) + '</h3><p>' + esc(n.body) + '</p><div class="note-foot"><span>' + esc(ML.ui.ago(n.updated)) + '</span><span>' + esc(c ? c.topic : 'General') + '</span></div></article>';
      }).join('') + '</div>' : '<div class="empty card" style="padding:54px 20px"><span class="empty-ic">' + icon('notes') + '</span><h3>' + (state.notes.length ? 'No notes match that filter' : 'Your second brain is empty') + '</h3><p>' + (state.notes.length ? 'Try another search or course filter.' : 'Capture the idea in your own words. Notes can become flashcards in one tap.') + '</p><button class="btn btn-primary" data-act="note-new">' + icon('plus') + ' Write a note</button></div>') +
      '</div>';
  }

  /* Achievements */
  function achievements(ui) {
    var state = ML.store.get();
    var stats = ML.store.courseStats();
    var unlocked = state.achievements;
    var got = D.ACHIEVEMENTS.filter(function (a) { return unlocked.indexOf(a.id) !== -1; }).length;
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Proof of work</p><h1>Achievements</h1><p>Not badges for opening the app. Badges for doing the work.</p></div><div class="page-actions"><span class="chip warm">' + icon('trophy') + got + ' / ' + D.ACHIEVEMENTS.length + ' unlocked</span><span class="chip">' + icon('zap') + stats.xp.toLocaleString() + ' XP</span></div></div>' +
      '<div class="progress"><i style="width:' + Math.round(got / D.ACHIEVEMENTS.length * 100) + '%"></i></div>' +
      '<div class="ach-grid">' + D.ACHIEVEMENTS.map(function (a) {
        var isUnlocked = unlocked.indexOf(a.id) !== -1;
        var value = Number(a.get(stats)) || 0;
        var pct = Math.min(100, Math.round(value / a.goal * 100));
        return '<article class="ach-card ' + (isUnlocked ? 'unlocked' : 'locked') + '"><span class="medal">' + icon(isUnlocked ? a.icon : 'lock') + '</span><div style="min-width:0;flex:1"><h3>' + esc(a.name) + '</h3><p>' + esc(a.desc) + '</p><div class="ach-progress"><div class="progress"><i style="width:' + pct + '%"></i></div><span>' + Math.min(value, a.goal) + ' / ' + a.goal + ' ' + esc(a.unit) + '</span></div></div>' + (isUnlocked ? '<span class="unlocked-tag">Unlocked</span>' : '') + '</article>';
      }).join('') + '</div></div>';
  }

  /* Code Lab */
  function codeState() {
    if (!ML.session.code) ML.session.code = { code: D.CODE_SNIPPETS[0].code, lang: 'javascript', mode: 'review', output: '', review: '', running: false, reviewing: false };
    return ML.session.code;
  }

  function terminalHtml(output) {
    if (!output) return '<div class="term-head">' + icon('terminal', 'ic-sm') + ' Console output</div><span style="color:#5d6694">Run the snippet to see output. console.log, warn and error are captured.</span>';
    return '<div class="term-head">' + icon('terminal', 'ic-sm') + ' Console output</div>' + output;
  }

  function codeLab(ui) {
    var cs = codeState();
    var lines = String(cs.code || '').split('\n').length;
    var nums = [];
    for (var i = 1; i <= Math.max(lines, 12); i++) nums.push(i);
    var status = ML.ai.status();
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Learn by shipping</p><h1>Code Lab</h1><p>Write it, run it, then get a review that teaches instead of rewriting for you.</p></div><div class="page-actions"><button class="btn btn-outline" data-act="code-copy">' + icon('copy') + ' Copy code</button><button class="btn btn-primary" data-act="code-run">' + icon('play') + ' Run</button></div></div>' +
      '<div class="lab-layout"><section class="lab-panel">' +
      '<div class="lab-bar"><div class="dots"><i></i><i></i><i></i></div><span class="file">playground.js</span><span class="grow"></span><span class="badge">JavaScript</span><span class="badge ' + (status.mode === 'live' ? 'ok' : 'warm') + '">' + (status.mode === 'live' ? 'Live AI review' : 'Offline review') + '</span></div>' +
      '<div class="code-editor"><div class="line-nums" id="line-nums" aria-hidden="true">' + nums.join('<br>') + '</div><textarea class="code-input" id="code-input" spellcheck="false" aria-label="JavaScript editor" style="min-height:380px">' + esc(cs.code) + '</textarea></div>' +
      '<div class="terminal" id="term-output">' + terminalHtml(cs.output) + '</div>' +
      '<div class="lab-actions"><button class="btn btn-sm btn-primary" data-act="code-run">' + icon('play') + ' Run</button><button class="btn btn-sm btn-outline" data-act="code-review" data-mode="review">' + icon('sparkles') + ' Review</button><button class="btn btn-sm btn-outline" data-act="code-review" data-mode="bugs">' + icon('alert') + ' Bug hunt</button><button class="btn btn-sm btn-outline" data-act="code-review" data-mode="optimize">' + icon('zap') + ' Optimise</button><button class="btn btn-sm btn-outline" data-act="code-review" data-mode="explain">' + icon('help') + ' Explain</button><span class="grow"></span><button class="btn btn-sm btn-ghost" data-act="code-clear">' + icon('trash') + ' Clear output</button></div>' +
      '</section><aside class="stack">' +
      '<section class="panel review-panel"><div class="panel-head"><div><h2>Code review</h2><div class="sub">AI teaches; you decide</div></div><span class="badge ' + (status.mode === 'live' ? 'ok' : '') + '">' + (status.mode === 'live' ? 'Live' : 'Static') + '</span></div>' +
      (cs.review ? '<div class="review-body"><div class="md" id="review-body">' + md(cs.review) + '</div></div>' : '<div class="review-placeholder" id="review-placeholder"><span class="big">' + icon('sparkles') + '</span><h3>Ready to review</h3><p>Run the snippet, then ask for a review. You will get what works, what is risky, and one better version.</p></div>') + '</section>' +
      '<div class="bridge-status ' + (status.mode === 'live' ? 'live' : '') + '"><i></i><b>' + (status.mode === 'live' ? 'AI runtime connected' : 'Deterministic offline review') + '</b><span>' + (status.mode === 'live' ? 'streaming' : 'no API key needed') + '</span></div>' +
      '<section class="panel"><div class="panel-head"><h2>Snippets</h2><span class="badge">' + D.CODE_SNIPPETS.length + '</span></div><div class="panel-body"><div class="snippet-list">' + D.CODE_SNIPPETS.map(function (s, i) {
        return '<button data-act="code-snippet" data-i="' + i + '">' + icon('code', 'ic-sm') + esc(s.name) + '</button>';
      }).join('') + '</div></div></section>' +
      '<div class="card"><h3 style="font-size:13px;margin-bottom:6px">Sandbox rules</h3><p class="muted" style="font-size:11.5px;line-height:1.65">Code runs in a Web Worker with a 3-second limit. No DOM, no network, no storage. console output is captured. Break it on purpose — that is the lesson.</p></div>' +
      '</aside></div></div>';
  }

  /* Profile */
  function profile(ui, tab) {
    tab = tab || 'account';
    var state = ML.store.get();
    var user = ML.auth.user() || { name: 'Learner', email: '', provider: 'google' };
    var stats = ML.store.courseStats();
    var lvl = ML.store.levelInfo(stats.xp);
    var s = ML.auth.session();
    var tabs = [['account', 'Account'], ['preferences', 'Preferences'], ['data', 'Data & privacy'], ['about', 'About']];
    var body = '';
    if (tab === 'preferences') {
      var theme = state.settings.theme || 'auto';
      body = '<div class="panel"><div class="panel-head"><div><h2>Appearance</h2><div class="sub">Light, dark or follow your system</div></div></div><div class="panel-body">' +
        '<div class="settings-row"><div class="s-label"><b>Theme</b><span>Changes instantly across the lab.</span></div><div class="s-control"><div class="theme-opts"><button class="theme-opt ' + (theme === 'light' ? 'on' : '') + '" data-act="theme-set" data-theme="light">' + icon('sun') + ' Light</button><button class="theme-opt ' + (theme === 'dark' ? 'on' : '') + '" data-act="theme-set" data-theme="dark">' + icon('moon') + ' Dark</button><button class="theme-opt ' + (theme === 'auto' ? 'on' : '') + '" data-act="theme-set" data-theme="auto">' + icon('monitor') + ' Auto</button></div></div></div>' +
        '<div class="settings-row"><div class="s-label"><b>Daily goal</b><span>Used for streaks, focus targets and nudges.</span></div><div class="s-control"><select class="select" data-pref="dailyGoal" style="min-width:130px;min-height:38px;font-size:12.5px">' + D.MINUTES.map(function (m) { return '<option value="' + m + '"' + (Number(state.settings.dailyGoal) === m ? ' selected' : '') + '>' + m + ' minutes</option>'; }).join('') + '</select></div></div>' +
        '<div class="settings-row"><div class="s-label"><b>Week starts on</b><span>Planner layout.</span></div><div class="s-control"><select class="select" data-pref="weekStart" style="min-width:110px;min-height:38px;font-size:12.5px"><option value="Mon"' + (state.settings.weekStart === 'Mon' ? ' selected' : '') + '>Monday</option><option value="Sun"' + (state.settings.weekStart === 'Sun' ? ' selected' : '') + '>Sunday</option></select></div></div>' +
        '<div class="settings-row"><div class="s-label"><b>Mentor style</b><span>How direct the tutor should be.</span></div><div class="s-control"><select class="select" data-pref="aiTone" style="min-width:140px;min-height:38px;font-size:12.5px">' + ['Socratic', 'Direct', 'Encouraging'].map(function (x) { return '<option' + (state.settings.aiTone === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
        '<div class="settings-row"><div class="s-label"><b>Study reminders</b><span>In-app nudges when cards are due or a streak is at risk.</span></div><div class="s-control"><label class="switch"><input type="checkbox" data-pref="reminders"' + (state.settings.reminders ? ' checked' : '') + ' aria-label="Study reminders"><i></i></label></div></div>' +
        '<div class="settings-row"><div class="s-label"><b>Completion sound</b><span>A quiet chime when a focus block ends.</span></div><div class="s-control"><label class="switch"><input type="checkbox" data-pref="sound"' + (state.settings.sound ? ' checked' : '') + ' aria-label="Completion sound"><i></i></label></div></div>' +
        '</div></div>';
    } else if (tab === 'data') {
      var bytes = 0;
      try { bytes = new Blob([JSON.stringify(state)]).size; } catch (e) { bytes = JSON.stringify(state).length; }
      var kb = (bytes / 1024).toFixed(1);
      var sync = ML.store.driveStatus();
      body = '<div class="grid cols-2">' +
        '<div class="panel"><div class="panel-head"><div><h2>Your data</h2><div class="sub">Portable by default</div></div><span class="badge">' + kb + ' KB</span></div><div class="panel-body"><p class="muted" style="font-size:12.5px;line-height:1.65">Courses, lessons, cards, notes, focus sessions, settings and achievements live in this browser. Export a full JSON snapshot whenever you want.</p><div class="divider" style="margin:14px 0"></div><div class="kv"><span>Storage</span><b>Device local' + (sync === 'synced' ? ' + Google Drive' : '') + '</b></div><div class="kv"><span>Workspace size</span><b>' + kb + ' KB</b></div><div class="kv"><span>Courses</span><b>' + state.courses.length + '</b></div><div class="kv"><span>Cards</span><b>' + state.cards.length + '</b></div><div class="kv"><span>Notes</span><b>' + state.notes.length + '</b></div><div class="chip-row" style="margin-top:14px"><button class="btn btn-primary btn-sm" data-act="export-data">' + icon('download') + ' Export JSON</button><label class="btn btn-outline btn-sm" style="cursor:pointer">' + icon('upload') + ' Import<input type="file" id="import-file" accept="application/json,.json" hidden></label></div></div></div>' +
        '<div class="panel"><div class="panel-head"><div><h2>Google Drive sync</h2><div class="sub">Your Drive, not our server</div></div><span class="badge ' + (sync === 'synced' ? 'ok' : 'warm') + '">' + (sync === 'synced' ? 'Synced' : 'On device') + '</span></div><div class="panel-body"><p class="muted" style="font-size:12.5px;line-height:1.65">When Drive access is granted, MegaLab saves a workspace snapshot to a private <code>MegaLab_Workspace</code> folder in your own Google Drive, plus daily backups. Tokens are kept in this tab only. Signing out or closing the tab ends API access.</p><div class="divider" style="margin:14px 0"></div><div class="kv"><span>Google session</span><b>' + (ML.auth.isSignedIn() ? 'Active' : 'Signed out') + '</b></div><div class="kv"><span>Drive access</span><b>' + (ML.auth.isConnected() ? 'Granted' : 'Not granted') + '</b></div><div class="kv"><span>Session expires</span><b>' + (s && s.expires ? esc(new Date(s.expires).toLocaleDateString()) : '—') + '</b></div><div class="chip-row" style="margin-top:14px"><button class="btn btn-outline btn-sm" data-act="connect-drive">' + icon('cloud') + ' Connect Drive</button><button class="btn btn-outline btn-sm" data-act="sync-now">' + icon('refresh') + ' Sync now</button><button class="btn btn-outline btn-sm" data-act="pull-drive">' + icon('download') + ' Pull</button></div></div></div>' +
        '</div>' +
        '<div class="panel danger-zone"><div class="panel-head"><div><h2>Danger zone</h2><div class="sub">These actions affect this device</div></div></div><div class="panel-body"><div class="settings-row"><div class="s-label"><b>Reset workspace</b><span>Delete courses, cards, notes and history. Keep your account.</span></div><div class="s-control"><button class="btn btn-sm btn-outline" data-act="reset-workspace">Reset</button></div></div><div class="settings-row"><div class="s-label"><b>Delete account data</b><span>Remove this workspace, sign out and forget the session.</span></div><div class="s-control"><button class="btn btn-sm btn-danger" data-act="delete-account">Delete</button></div></div></div></div>';
    } else if (tab === 'about') {
      var cfg = ML.auth.config() || {};
      body = '<div class="grid cols-2">' +
        '<div class="panel"><div class="panel-head"><h2>MegaLab</h2><span class="badge brand">v' + esc(cfg.version || '2.0.0') + '</span></div><div class="panel-body md"><p><strong>One lab. Every study tool.</strong> MegaLab builds a course around a goal, teaches each lesson, quizzes at the right moment, schedules recall, tracks focus and gives you a real coding bench.</p><p>It is a static site: no build step, no server, no tracking. Your learning data belongs to you.</p><div class="chip-row" style="margin-top:12px"><span class="chip">' + icon('shield') + ' No ad tracking</span><span class="chip">' + icon('wifi-off') + ' Offline shell</span><span class="chip">' + icon('download') + ' Export anytime</span></div></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>AI runtime</h2><span class="badge ' + (ML.ai.status().mode === 'live' ? 'ok' : 'warm') + '">' + (ML.ai.status().mode === 'live' ? 'Live AI' : 'Offline tutor') + '</span></div><div class="panel-body md"><p>When an AI bridge is present (<code>window.megalabAI</code>) or an <code>aiEndpoint</code> is configured, plans, lessons, quizzes, cards, mentor chat, games and code review are AI-generated. Otherwise a deterministic offline tutor keeps every workflow usable.</p><p class="muted" style="font-size:12px">Offline content is a scaffold, not a substitute for verified sources.</p></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Google Sign-In</h2><span class="badge ' + (ML.auth.isConfigured() ? 'ok' : 'warm') + '">' + (ML.auth.isConfigured() ? 'Configured' : 'Not configured') + '</span></div><div class="panel-body md"><p>Add your OAuth client ID to <code>google-client-id.js</code> and deploy the static site to HTTPS. The browser receives a short-lived token; MegaLab reads only your basic profile.</p><p class="muted" style="font-size:12px">Never place a client secret in a static site. This app does not use one.</p></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Keyboard</h2><span class="badge">Shortcuts</span></div><div class="panel-body"><div class="kv"><span>Command palette</span><b>Ctrl / ⌘ + K</b></div><div class="kv"><span>Send message</span><b>Enter</b></div><div class="kv"><span>Reveal card</span><b>Space</b></div><div class="kv"><span>Rate card</span><b>1 · 2 · 3 · 4</b></div><div class="kv"><span>Close overlay</span><b>Esc</b></div></div></div>' +
        '</div>';
    } else {
      body = '<div class="grid cols-2">' +
        '<div class="panel"><div class="panel-head"><h2>Profile details</h2><span class="badge">Visible only to you</span></div><div class="panel-body"><form class="form-stack" data-form="profile-account">' +
        '<label class="field"><span class="label">Display name</span><input class="input" name="name" value="' + esc(user.name) + '" maxlength="80" required></label>' +
        '<label class="field"><span class="label">What are you learning?</span><textarea class="textarea" name="bio" rows="3" maxlength="400" placeholder="One or two sentences about the skill you are building.">' + esc(state.profile.bio || '') + '</textarea></label>' +
        '<label class="field"><span class="label">Your outcome</span><input class="input" name="goal" value="' + esc(state.profile.goal || '') + '" maxlength="200" placeholder="e.g. Ship a portfolio project by December"></label>' +
        '<div class="row"><button class="btn btn-primary" type="submit">' + icon('save') + ' Save changes</button></div></form></div></div>' +
        '<div class="panel"><div class="panel-head"><h2>Account</h2><span class="badge ok">Google</span></div><div class="panel-body"><div class="kv"><span>Email</span><b>' + esc(user.email || '—') + '</b></div><div class="kv"><span>Sign-in</span><b>Google Identity Services</b></div><div class="kv"><span>Session</span><b>' + (s && s.expires ? 'until ' + esc(new Date(s.expires).toLocaleDateString()) : 'this tab') + '</b></div><div class="kv"><span>Level</span><b>' + lvl.level + ' · ' + lvl.title + '</b></div><div class="divider" style="margin:14px 0"></div><div class="row" style="gap:7px"><button class="btn btn-outline btn-sm grow" data-nav="profile/data">' + icon('download') + ' Export data</button><button class="btn btn-outline btn-sm grow" data-act="sign-out">' + icon('logout') + ' Sign out</button></div><button class="btn btn-danger btn-sm btn-block" style="margin-top:8px" data-act="delete-account">' + icon('trash') + ' Delete account data</button></div></div>' +
        '</div>';
    }
    return '<div class="page"><div class="profile-hero"><div class="avatar-wrap">' + ML.ui.avatar(user, 'xl') + '<button class="avatar-edit" data-act="avatar-upload" aria-label="Change avatar">' + icon('edit') + '</button><input type="file" id="avatar-file" accept="image/*" hidden></div><div class="p-info"><h1>' + esc(user.name) + '</h1><div class="email">' + esc(user.email || 'Google account') + '</div><div class="meta"><span class="chip brand">' + icon('zap') + ' Level ' + lvl.level + ' · ' + esc(lvl.title) + '</span><span class="chip">' + icon('flame') + ML.store.streak() + '-day streak</span><span class="chip">' + icon('clock') + ML.ui.hm(stats.minutes) + ' studied</span><span class="chip">' + icon('cards') + state.cards.length + ' cards</span></div></div><div class="page-actions"><button class="btn btn-outline" data-act="sign-out">' + icon('logout') + ' Sign out</button></div></div>' +
      '<div class="profile-tabs">' + tabs.map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-nav="profile/' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      body + '</div>';
  }

  /* ============ CLASSROOM, NOTES AND GAMES ============ */

  function classroomStateSafe() {
    return ML.store.ensureClassroom ? ML.store.ensureClassroom() : (ML.store.get().classroom || {});
  }

  function classroomCourseName(id, fallback) {
    var course = (classroomStateSafe().courses || []).filter(function (c) { return c.id === id; })[0];
    return course ? course.name : (fallback || 'Class notes');
  }

  function courseSelect(name, selected) {
    var courses = classroomStateSafe().courses || [];
    return '<select class="select" name="' + name + '"><option value="">General notes</option>' + courses.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('') + '</select>';
  }

  function kindIcon(kind) {
    if (kind === 'pdf') return 'file-text';
    if (kind === 'pptx' || kind === 'ppt') return 'presentation';
    if (kind === 'docx' || kind === 'doc') return 'file';
    if (kind === 'xlsx' || kind === 'xls') return 'chart';
    if (kind === 'link') return 'link';
    if (kind === 'video') return 'play';
    return 'file';
  }

  function classroom(ui) {
    var state = ML.store.get();
    var c = classroomStateSafe();
    var connected = ML.auth.isConnected();
    var synced = c.syncedContent || [];
    var files = [];
    synced.forEach(function (course) {
      (course.files || []).forEach(function (f) { files.push({ file: f, courseName: course.courseName, courseId: course.courseId }); });
    });
    var studyFiles = files.filter(function (f) { return f.file.study; });
    var sources = c.sources || [];
    var games = Object.keys(c.generatedGames || {}).map(function (k) { return c.generatedGames[k]; }).filter(function (g) { return g && g.id && g.type; });
    var questions = c.generatedQuestions || [];
    var lastSync = c.lastSync ? ML.ui.ago(c.lastSync) : 'never';

    var html = '<div class="page"><div class="page-head"><div><p class="eyebrow">Google Classroom</p><h1>Class notes, turned into games</h1><p>Sync teacher materials from Classroom and Drive, or drop your own PPT, PDF and notes. MegaLab turns them into playable retrieval games, questions and flashcards.</p></div><div class="page-actions">' +
      '<button class="btn btn-primary" data-act="connect-classroom">' + icon('users') + ' ' + (connected ? 'Reconnect Google' : 'Connect Classroom') + '</button>' +
      '<button class="btn btn-outline" data-act="sync-classroom"' + (connected ? '' : ' disabled') + '>' + icon('refresh') + ' Sync now</button></div></div>';

    html += '<div class="stat-strip">' +
      '<div class="stat-card"><span class="si">' + icon('book') + '</span><b>' + (c.courses ? c.courses.length : 0) + '</b><span>classes</span><small>' + studyFiles.length + ' study files found</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('notes') + '</span><b>' + sources.length + '</b><span>note sources</span><small>Local, Drive and pasted</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('rocket') + '</span><b>' + games.length + '</b><span>games ready</span><small>' + questions.length + ' practice questions</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('cloud') + '</span><b>' + (connected ? 'On' : 'Off') + '</b><span>Google access</span><small>Last sync: ' + esc(lastSync) + '</small></div>' +
      '</div>';

    if (connected) {
      html += '<div class="card classroom-status ok" style="margin-bottom:16px"><div class="row between wrap"><div><span class="badge ok">' + icon('check-circle') + ' Connected</span><span class="classroom-status-text">Classroom and Drive access are active for this tab.</span></div><button class="btn btn-sm btn-ghost" data-act="disconnect-classroom">' + icon('x') + ' Disconnect</button></div></div>';
    } else {
      html += '<div class="card classroom-status warm" style="margin-bottom:16px"><div class="row between wrap"><div><span class="badge warm">' + icon('alert') + ' Google not connected</span><span class="classroom-status-text">You can still paste notes or upload files below. Google sync needs an http(s) deployment and a configured OAuth client.</span></div><button class="btn btn-sm btn-primary" data-act="connect-classroom">' + icon('users') + ' Connect</button></div></div>';
    }

    /* Upload + paste */
    html += '<div class="grid cols-2 classroom-ingest">' +
      '<section class="panel"><div class="panel-head"><div><h2>Drop a file</h2><div class="sub">PDF, PPTX, DOCX, XLSX, TXT, MD, CSV, HTML or RTF</div></div><span class="badge">On device</span></div><div class="panel-body">' +
      '<label class="dropzone" for="classroom-file">' + icon('upload') + '<b>Choose files or drop them here</b><span>Text is extracted in your browser. Nothing is uploaded to a MegaLab server.</span></label>' +
      '<input type="file" id="classroom-file" multiple accept=".pdf,.pptx,.docx,.xlsx,.txt,.md,.csv,.html,.htm,.rtf" hidden>' +
      '<p class="muted classroom-hint">Scanned PDFs need OCR first. Legacy .ppt/.doc/.xls are not supported — save as the modern format or PDF.</p>' +
      '</div></section>' +
      '<section class="panel"><div class="panel-head"><div><h2>Paste notes</h2><div class="sub">Fastest path when you already have the text</div></div><span class="badge">Any length</span></div><div class="panel-body">' +
      '<form class="form-stack" data-form="classroom-paste">' +
      '<label class="field"><span class="label">Title</span><input class="input" name="name" placeholder="e.g. Cell biology — lecture 4" maxlength="140" required></label>' +
      '<label class="field"><span class="label">Class</span>' + courseSelect('courseId', '') + '</label>' +
      '<label class="field"><span class="label">Notes</span><textarea class="textarea" name="text" rows="5" placeholder="Paste lecture notes, a transcript, or a summary. At least a paragraph works best." required></textarea></label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">' + icon('wand') + ' Save and build a pack</button></div></form>' +
      '<p class="muted classroom-hint">Notes need about 80 characters minimum to generate useful games.</p>' +
      '</div></section></div>';

    /* Sources */
    html += '<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Note library</h2><div class="sub">Every processed source can regenerate games, questions and cards</div></div><span class="badge brand">' + sources.length + ' sources</span></div><div class="panel-body">';
    if (sources.length) {
      html += '<div class="source-list">' + sources.map(function (s) {
        return '<div class="source-item">' +
          '<span class="source-ic">' + icon(kindIcon(s.kind)) + '</span>' +
          '<div class="source-main"><b>' + esc(s.name) + '</b><span>' + (s.chars || (s.text ? s.text.length : 0)).toLocaleString() + ' chars · ' + esc(s.method || s.kind || 'notes') + (s.courseName ? ' · ' + esc(s.courseName) : '') + '</span></div>' +
          '<div class="source-actions"><button class="btn btn-sm btn-primary" data-act="generate-pack" data-source-id="' + esc(s.id) + '">' + icon('rocket') + ' Build pack</button>' +
          '<button class="btn btn-sm btn-outline" data-act="source-cards" data-source-id="' + esc(s.id) + '">' + icon('cards') + ' Cards</button>' +
          '<button class="btn btn-sm btn-ghost" data-act="delete-source" data-source-id="' + esc(s.id) + '" aria-label="Remove source">' + icon('trash') + '</button></div></div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="empty compact"><span class="empty-ic">' + icon('notes') + '</span><h3>No sources yet</h3><p>Upload a file, paste notes, or import a Drive file from a synced class.</p></div>';
    }
    html += '</div></section>';

    /* Classes */
    if (c.courses && c.courses.length) {
      html += '<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Your classes</h2><div class="sub">Synced from Google Classroom</div></div><span class="badge">' + c.courses.length + '</span></div><div class="panel-body"><div class="course-grid classroom-grid">' +
        c.courses.map(function (course) {
          var entry = synced.filter(function (x) { return x.courseId === course.id; })[0];
          var count = entry ? entry.files.length : 0;
          return '<button class="course-card" data-nav="classroom/course/' + esc(course.id) + '">' +
            '<div class="course-cover" style="background:linear-gradient(135deg,#4f46e5,#7c3aed)">' + icon('book') + '<span class="badge">' + esc(course.courseState || 'ACTIVE') + '</span></div>' +
            '<div class="course-body"><h3>' + esc(course.name) + '</h3><div class="meta">' + (course.section ? esc(course.section) : 'No section') + '<span class="dotsep"></span>' + count + ' files' + (entry ? '<span class="dotsep"></span>' + entry.courseWork.length + ' assignments' : '') + '</div><div class="spacer"></div><div class="course-foot">' + (entry ? '<span class="badge ok">' + icon('check') + ' Synced</span>' : '<span class="badge warm">' + icon('cloud') + ' Sync needed</span>') + '</div></div></button>';
        }).join('') + '</div></div></section>';
    } else if (connected) {
      html += '<div class="empty card" style="padding:36px;margin-top:18px"><span class="empty-ic">' + icon('book') + '</span><h3>No active classes found</h3><p>Your Google account has no active Classroom classes, or the account is a student without visible courses. You can still use local notes above.</p><button class="btn btn-primary" data-act="sync-classroom">' + icon('refresh') + ' Sync classes</button></div>';
    }

    /* Drive study files */
    if (studyFiles.length) {
      html += '<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Class materials</h2><div class="sub">PDFs, slides and documents attached by teachers</div></div><span class="badge">' + studyFiles.length + '</span></div><div class="panel-body"><div class="file-list">' +
        studyFiles.slice(0, 24).map(function (item) {
          var f = item.file;
          return '<div class="file-item"><span class="file-ic">' + icon(kindIcon(f.kind)) + '</span><div class="file-main"><b>' + esc(f.name) + '</b><span>' + esc(item.courseName || f.courseName || 'Class') + (f.materialTitle ? ' · ' + esc(f.materialTitle) : '') + '</span></div>' +
            '<div class="file-actions"><button class="btn btn-sm btn-primary" data-act="convert-to-game" data-file-id="' + esc(f.id) + '" data-file-name="' + esc(f.name) + '" data-course-name="' + esc(item.courseName || '') + '" data-course-id="' + esc(item.courseId || '') + '">' + icon('rocket') + ' Build pack</button>' +
            '<button class="btn btn-sm btn-outline" data-act="generate-questions" data-file-id="' + esc(f.id) + '" data-file-name="' + esc(f.name) + '" data-course-name="' + esc(item.courseName || '') + '">' + icon('help') + ' Questions</button>' +
            (f.alternateLink ? '<a class="btn btn-sm btn-ghost" href="' + esc(f.alternateLink) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + '</a>' : '') + '</div></div>';
        }).join('') + '</div>' + (studyFiles.length > 24 ? '<p class="muted classroom-hint">+' + (studyFiles.length - 24) + ' more files in class pages.</p>' : '') + '</div></section>';
    }

    /* Games */
    if (games.length) {
      html += '<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Ready to play</h2><div class="sub">Built from your class sources</div></div><button class="link-btn" data-nav="classroom-games">All games ' + icon('arrow-right') + '</button></div><div class="panel-body"><div class="game-grid">' +
        games.slice(0, 6).map(function (game) { return gameCard(game); }).join('') + '</div></div></section>';
    }

    if (questions.length) {
      html += '<section class="panel" style="margin-top:18px"><div class="panel-head"><div><h2>Practice questions</h2><div class="sub">Retrieval practice from the same notes</div></div><button class="link-btn" data-nav="classroom-questions">Open ' + icon('arrow-right') + '</button></div><div class="panel-body"><div class="row between"><span class="muted">' + questions.length + ' questions across ' + (c.questionSources || []).length + ' sources</span><button class="btn btn-sm btn-primary" data-nav="classroom-questions">Practice now</button></div></div></section>';
    }

    return html + '</div>';
  }

  function gameCard(game) {
    var meta = ML.games.typeInfo(game.type);
    var result = ML.store.gameResult ? ML.store.gameResult(game.id) : null;
    return '<button class="game-card" data-nav="classroom-game/' + esc(game.id) + '" style="--game-color:' + meta.color + '">' +
      '<span class="game-emoji">' + meta.emoji + '</span>' +
      '<span class="game-card-main"><b>' + esc(game.title) + '</b><span>' + esc(game.description) + '</span><small>' + esc(meta.name) + (result ? ' · best ' + result.pct + '%' : '') + '</small></span>' +
      '<span class="game-play">' + icon('play') + '</span></button>';
  }

  function classroomCourse(ui, courseId) {
    var c = classroomStateSafe();
    var entry = (c.syncedContent || []).filter(function (x) { return x.courseId === courseId; })[0];
    var course = (c.courses || []).filter(function (x) { return x.id === courseId; })[0];
    if (!entry) {
      return '<div class="page"><button class="link-btn" data-nav="classroom">' + icon('arrow-left') + ' Back to Classroom</button><div class="empty card" style="padding:56px 20px"><span class="empty-ic">' + icon('alert') + '</span><h3>This class is not synced yet</h3><p>' + esc(course ? course.name : 'The class') + ' has no local copy. Run a sync, then open it again.</p><button class="btn btn-primary" data-act="sync-classroom">' + icon('refresh') + ' Sync now</button></div></div>';
    }
    var files = entry.files || [];
    var study = files.filter(function (f) { return f.study; });
    var other = files.filter(function (f) { return !f.study; });
    var sources = (c.sources || []).filter(function (s) { return s.courseId === courseId; });
    var sourceIds = {};
    sources.forEach(function (s) { sourceIds[s.id] = true; });
    var courseGames = Object.keys(c.generatedGames || {}).map(function (k) { return c.generatedGames[k]; }).filter(function (g) {
      return g && g.id && g.type && (g.sourceId === courseId || sourceIds[g.sourceId]);
    });

    var html = '<div class="page"><button class="link-btn" data-nav="classroom">' + icon('arrow-left') + ' Back to Classroom</button>' +
      '<div class="course-hero classroom-hero" style="background:linear-gradient(135deg,#4f46e5,#7c3aed)"><h1>' + esc(entry.courseName) + '</h1><p>' + esc(entry.courseSection || 'Class') + ' · ' + (entry.courseWork || []).length + ' assignments · ' + files.length + ' materials</p>' +
      '<div class="chip-row" style="margin-top:12px"><button class="chip brand" data-act="sync-one-course" data-course-id="' + esc(courseId) + '">' + icon('refresh') + ' Re-sync this class</button><button class="chip" data-act="generate-games-from-course" data-course-id="' + esc(courseId) + '">' + icon('wand') + ' Build from every file</button></div></div>' +
      '<div class="dash-grid"><div class="dash-col">' +
      '<section class="panel"><div class="panel-head"><div><h2>Study materials</h2><div class="sub">PDF, slides and documents</div></div><span class="badge">' + study.length + '</span></div><div class="panel-body">' +
      (study.length ? '<div class="file-list">' + study.map(function (f) {
        return '<div class="file-item"><span class="file-ic">' + icon(kindIcon(f.kind)) + '</span><div class="file-main"><b>' + esc(f.name) + '</b><span>' + esc(f.materialTitle || 'Class material') + '</span></div><div class="file-actions"><button class="btn btn-sm btn-primary" data-act="convert-to-game" data-file-id="' + esc(f.id) + '" data-file-name="' + esc(f.name) + '" data-course-name="' + esc(entry.courseName) + '" data-course-id="' + esc(courseId) + '">' + icon('rocket') + ' Build pack</button><button class="btn btn-sm btn-outline" data-act="generate-questions" data-file-id="' + esc(f.id) + '" data-file-name="' + esc(f.name) + '" data-course-name="' + esc(entry.courseName) + '">' + icon('help') + '</button>' + (f.alternateLink ? '<a class="btn btn-sm btn-ghost" href="' + esc(f.alternateLink) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + '</a>' : '') + '</div></div>';
      }).join('') + '</div>' : '<p class="muted">No study documents attached to this class yet.</p>') +
      '</div></section>' +
      (courseGames.length ? '<section class="panel"><div class="panel-head"><h2>Games from this class</h2><span class="badge">' + courseGames.length + '</span></div><div class="panel-body"><div class="game-grid">' + courseGames.map(gameCard).join('') + '</div></div></section>' : '') +
      '</div><div class="dash-col">' +
      '<section class="panel"><div class="panel-head"><h2>Assignments</h2><span class="badge">' + (entry.courseWork || []).length + '</span></div><div class="panel-body">' + ((entry.courseWork || []).length ? '<div class="simple-list">' + entry.courseWork.slice(0, 14).map(function (w) {
        return '<div class="simple-row"><span class="dot"></span><span class="grow">' + esc(w.title) + '</span><span class="badge ' + (w.state === 'PUBLISHED' ? 'ok' : 'warm') + '">' + esc(w.workType) + '</span></div>';
      }).join('') + '</div>' : '<p class="muted">No assignments in this class.</p>') + '</div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Local sources</h2><span class="badge">' + sources.length + '</span></div><div class="panel-body">' + (sources.length ? '<div class="simple-list">' + sources.map(function (s) {
        return '<div class="simple-row"><span class="dot"></span><span class="grow">' + esc(s.name) + '</span><button class="btn btn-sm btn-outline" data-act="generate-pack" data-source-id="' + esc(s.id) + '">' + icon('rocket') + '</button></div>';
      }).join('') + '</div>' : '<p class="muted">Import one of the files above to keep its text here.</p>') + '</div></section>' +
      (other.length ? '<section class="panel"><div class="panel-head"><h2>Links and media</h2><span class="badge">' + other.length + '</span></div><div class="panel-body"><div class="simple-list">' + other.slice(0, 12).map(function (f) {
        return '<div class="simple-row"><span class="dot"></span><span class="grow">' + esc(f.name) + '</span>' + (f.alternateLink ? '<a class="link-btn" href="' + esc(f.alternateLink) + '" target="_blank" rel="noopener noreferrer">Open ' + icon('arrow-up-right') + '</a>' : '') + '</div>';
      }).join('') + '</div></div></section>' : '') +
      '</div></div></div>';
    return html;
  }

  function classroomGames(ui) {
    var c = classroomStateSafe();
    var games = Object.keys(c.generatedGames || {}).map(function (k) { return c.generatedGames[k]; }).filter(function (g) { return g && g.id && g.type; });
    var byType = {};
    games.forEach(function (g) { byType[g.type] = (byType[g.type] || 0) + 1; });
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Learning games</p><h1>Your game library</h1><p>Every game is generated from real class notes. Play, score, and keep the XP.</p></div><div class="page-actions"><button class="btn btn-outline" data-nav="classroom">' + icon('arrow-left') + ' Classroom</button><button class="btn btn-primary" data-nav="classroom">' + icon('plus') + ' Add notes</button></div></div>' +
      (games.length ? '<div class="chip-row" style="margin-bottom:16px">' + ML.games.GAME_TYPES.filter(function (t) { return byType[t.id]; }).map(function (t) { return '<span class="chip">' + t.emoji + ' ' + esc(t.name) + ' · ' + byType[t.id] + '</span>'; }).join('') + '<button class="chip" data-act="clear-games">' + icon('trash') + ' Clear all</button></div>' +
        '<div class="game-grid">' + games.map(gameCard).join('') + '</div>'
        : '<div class="empty card" style="padding:60px 20px"><span class="empty-ic" style="font-size:44px">🎮</span><h3>No games yet</h3><p>Upload notes or sync Classroom, then press “Build pack”. A good pack gives you several game types plus questions and cards.</p><button class="btn btn-primary" data-nav="classroom">' + icon('upload') + ' Add class notes</button></div>') +
      '</div>';
  }

  function classroomGame(ui, gameId) {
    var c = classroomStateSafe();
    var game = (c.generatedGames || {})[gameId];
    if (!game) return classroomGames(ui);
    var meta = ML.games.typeInfo(game.type);
    var result = ML.store.gameResult(game.id);
    return '<div class="page"><button class="link-btn" data-nav="classroom-games">' + icon('arrow-left') + ' Back to games</button>' +
      '<div class="game-header" style="border-left:4px solid ' + meta.color + '"><span class="game-emoji">' + meta.emoji + '</span><div class="grow"><h1>' + esc(game.title) + '</h1><p>' + esc(game.description) + '</p><div class="row wrap" style="gap:6px;margin-top:8px"><span class="badge brand">' + esc(meta.name) + '</span>' + (game.sourceName ? '<span class="badge">' + esc(game.sourceName) + '</span>' : '') + (game.ai ? '<span class="badge ok">AI generated</span>' : '<span class="badge">Offline generated</span>') + (result ? '<span class="badge warm">Best: ' + result.pct + '% · ' + result.xp + ' XP</span>' : '') + '</div></div><span class="game-tagline">' + esc(meta.tagline) + '</span></div>' +
      '<div class="game-content">' + renderGameContent(game, meta) + '</div></div>';
  }

  function renderGameContent(game, meta) {
    var data = game.data || {};
    switch (game.type) {
      case 'quiz_battle': return renderQuizBattle(game, data);
      case 'fill_blanks': return renderFillBlanks(game, data);
      case 'match_pairs': return renderMatchPairs(game, data);
      case 'timeline_builder': return renderTimelineBuilder(game, data);
      case 'explain_it': return renderExplainIt(game, data);
      case 'code_challenge': return renderCodeChallenge(game, data);
      case 'flashcard_race': return renderFlashcardRace(game, data);
      case 'concept_map': return renderConceptMap(game, data);
      default: return '<div class="empty compact"><h3>Unsupported game</h3><p>This game type (' + esc(game.type) + ') is not playable in this version.</p></div>';
    }
  }

  function gameResultPanel() {
    return '<div class="game-result" id="game-result" hidden></div>';
  }

  function renderQuizBattle(game, data) {
    var qs = data.questions || [];
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="quiz_battle" data-total="' + qs.length + '">' +
      '<div class="game-hud"><span class="hud-item">' + icon('target') + '<b id="game-score">0</b><small>correct</small></span><span class="hud-item">' + icon('flame') + '<b id="game-combo">0</b><small>combo</small></span><span class="hud-item">' + icon('help') + '<b id="game-index">1</b><small>of ' + qs.length + '</small></span></div>' +
      '<div class="progress game-progress"><i id="game-progress" style="width:0%"></i></div>' +
      qs.map(function (q, qi) {
        return '<div class="qb-question" data-qi="' + qi + '"' + (qi ? ' hidden' : '') + '><p class="qb-q">' + esc(q.q) + '</p><div class="qb-options">' + (q.options || []).map(function (opt, oi) {
          return '<button class="qb-opt" data-act="qb-answer" data-qi="' + qi + '" data-oi="' + oi + '" data-answer="' + esc(q.answer) + '"><span class="qb-key">' + String.fromCharCode(65 + oi) + '</span><span>' + esc(opt) + '</span></button>';
        }).join('') + '</div><div class="qb-explanation" hidden><p>' + esc(q.explanation || '') + '</p><button class="btn btn-sm btn-primary" data-act="qb-next" data-qi="' + qi + '">' + (qi + 1 >= qs.length ? 'See result' : 'Next question') + '</button></div></div>';
      }).join('') + gameResultPanel() + '</div>';
  }

  function renderFillBlanks(game, data) {
    var sentences = data.sentences || [];
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="fill_blanks" data-total="' + sentences.length + '"><p class="game-instruction">' + icon('edit') + ' Type the missing term. Spelling is checked loosely.</p><div class="fb-list">' + sentences.map(function (s, i) {
      var parts = String(s.text).split(/\[____\]/);
      var input = '<input class="input fb-input" data-answer="' + esc(s.answer) + '" data-index="' + i + '" aria-label="Missing word ' + (i + 1) + '" autocomplete="off">';
      return '<div class="fb-item" data-index="' + i + '"><p>' + parts.map(function (p) { return esc(p); }).join(input) + '</p><div class="fb-feedback" hidden></div></div>';
    }).join('') + '</div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-primary" data-act="check-fill-blanks" data-game-id="' + esc(game.id) + '">' + icon('check') + ' Check answers</button></div>' + gameResultPanel() + '</div>';
  }

  function renderMatchPairs(game, data) {
    var pairs = data.pairs || [];
    var right = pairs.map(function (p, i) { return { text: p.right, key: i }; });
    for (var i = right.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = right[i]; right[i] = right[j]; right[j] = t;
    }
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="match_pairs" data-total="' + pairs.length + '"><p class="game-instruction">' + icon('cards') + ' Pick a concept, then its matching line. Correct pairs lock in.</p><div class="mp-grid"><div class="mp-column"><h4>Concepts</h4>' + pairs.map(function (p, i) {
      return '<button class="mp-item left" data-act="mp-pick" data-side="left" data-key="' + i + '">' + esc(p.left) + '</button>';
    }).join('') + '</div><div class="mp-column"><h4>Meaning</h4>' + right.map(function (r) {
      return '<button class="mp-item right" data-act="mp-pick" data-side="right" data-key="' + r.key + '">' + esc(r.text) + '</button>';
    }).join('') + '</div></div><div class="mp-status"><span id="mp-count">0</span> / ' + pairs.length + ' matched</div>' + gameResultPanel() + '</div>';
  }

  function renderTimelineBuilder(game, data) {
    var events = data.events || [];
    var items = events.slice();
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="timeline_builder" data-total="' + items.length + '"><p class="game-instruction">' + icon('calendar') + ' Put the events and steps in chronological order. Use the arrows to move.</p><div class="tb-list" id="tb-list">' + items.map(function (e) {
      return '<div class="tb-item" data-key="' + esc(e.date + '|' + e.event) + '" data-sort="' + Number(e.sort) + '"><span class="tb-date">' + esc(e.date || 'Step') + '</span><span class="tb-event">' + esc(e.event) + '</span><span class="tb-move"><button data-act="tb-up" aria-label="Move up">' + icon('arrow-up') + '</button><button data-act="tb-down" aria-label="Move down">' + icon('arrow-down') + '</button></span></div>';
    }).join('') + '</div><div class="row" style="justify-content:center;margin-top:16px"><button class="btn btn-primary" data-act="check-timeline" data-game-id="' + esc(game.id) + '">' + icon('check') + ' Check order</button></div>' + gameResultPanel() + '</div>';
  }

  function renderExplainIt(game, data) {
    var levels = data.levels || [];
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="explain_it" data-total="' + levels.length + '"><p class="game-instruction">' + icon('message') + ' Teach it back. Aim for at least 25 words per level — short answers get short feedback.</p>' + levels.map(function (l, i) {
      return '<div class="ei-level" data-level="' + i + '"><div class="ei-level-head"><span class="ei-badge">' + esc(l.level) + '</span><p>' + esc(l.prompt) + '</p></div><textarea class="textarea ei-input" rows="4" data-level="' + i + '" placeholder="Explain it in your own words…"></textarea><div class="row" style="margin-top:8px"><button class="btn btn-sm btn-primary" data-act="submit-explanation" data-level="' + i + '">' + icon('send') + ' Check explanation</button><span class="ei-feedback" hidden></span></div></div>';
    }).join('') + gameResultPanel() + '</div>';
  }

  function renderCodeChallenge(game, data) {
    var starter = String(data.starterCode || '// Your code here\nfunction demo(input) {\n  return input;\n}\n\nconsole.log(demo("test"));');
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="code_challenge" data-total="1"><div class="cc-prompt">' + icon('terminal') + '<div><h4>Challenge</h4><p>' + esc(data.challenge) + '</p></div></div>' +
      '<div class="cc-hints" hidden><h4>Hints</h4><ul>' + (data.hints || []).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></div>' +
      '<textarea class="code-input cc-code" id="challenge-code" rows="12" spellcheck="false" aria-label="Challenge code">' + esc(starter) + '</textarea>' +
      '<div class="row wrap" style="gap:7px;margin-top:12px"><button class="btn btn-primary" data-act="run-cc-code">' + icon('play') + ' Run</button><button class="btn btn-outline" data-act="show-cc-hints">' + icon('lightbulb') + ' Hints</button><button class="btn btn-outline" data-act="review-cc-code">' + icon('sparkles') + ' Review</button></div>' +
      '<div class="terminal cc-output" id="cc-output" hidden></div><div class="cc-review md" id="cc-review" hidden></div>' + gameResultPanel() + '</div>';
  }

  function renderFlashcardRace(game, data) {
    var cards = data.questions || [];
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="flashcard_race" data-total="' + cards.length + '">' +
      '<div class="fr-data" data-cards="' + esc(JSON.stringify(cards)) + '"></div>' +
      '<p class="game-instruction">' + icon('zap') + ' Flip, answer out loud, then rate honestly. “Again” is information, not failure.</p>' +
      '<div class="fr-card"><div class="fr-counter"><span id="fr-current">1</span> / ' + cards.length + '</div><div class="fr-front"><p id="fr-question"></p><button class="btn btn-primary" data-act="fr-flip">' + icon('rotate') + ' Flip card</button></div><div class="fr-back" hidden><p id="fr-answer"></p><div class="rate-row"><button class="rate-btn again" data-act="fr-rate" data-q="0"><b>Again</b><small>Not yet</small></button><button class="rate-btn" data-act="fr-rate" data-q="1"><b>Hard</b><small>Shaky</small></button><button class="rate-btn" data-act="fr-rate" data-q="2"><b>Good</b><small>Got it</small></button><button class="rate-btn easy" data-act="fr-rate" data-q="3"><b>Easy</b><small>Instant</small></button></div></div></div>' + gameResultPanel() + '</div>';
  }

  function renderConceptMap(game, data) {
    var concepts = data.concepts || [];
    return '<div class="game-run" data-game-id="' + esc(game.id) + '" data-game-type="concept_map" data-total="' + concepts.length + '">' +
      '<p class="game-instruction">' + icon('brain') + ' Tap every star. Read the idea, then connect it to something you already know.</p>' +
      '<div class="cm-layout"><div class="cm-canvas">' + concepts.map(function (c, i) {
        return '<button class="cm-node" data-act="cm-pick" data-term="' + esc(c.term) + '" data-definition="' + esc(c.definition) + '" data-index="' + i + '">' + icon('sparkles') + '<b>' + esc(c.term) + '</b></button>';
      }).join('') + '</div><aside class="cm-detail" id="cm-detail"><span class="muted">Select a concept to see how the notes define it.</span></aside></div>' +
      '<div class="row between" style="margin-top:14px"><span class="badge">Explored <b id="cm-count">0</b> / ' + concepts.length + '</span><button class="btn btn-sm btn-primary" data-act="cm-finish" data-game-id="' + esc(game.id) + '">' + icon('check') + ' Finish map</button></div>' +
      gameResultPanel() + '</div>';
  }

  function classroomQuestions(ui) {
    var c = classroomStateSafe();
    var questions = c.generatedQuestions || [];
    var sources = c.questionSources || [];
    var filter = ML.session.qFilter || 'all';
    var query = String(ML.session.qQuery || '').toLowerCase();
    var filtered = questions.filter(function (q) {
      if (filter !== 'all' && q.sourceId !== filter) return false;
      if (!query) return true;
      return (q.q + ' ' + (q.explanation || '') + ' ' + (q.tags || []).join(' ')).toLowerCase().indexOf(query) !== -1;
    });
    return '<div class="page"><div class="page-head"><div><p class="eyebrow">Practice questions</p><h1>Retrieval practice</h1><p>Questions generated from your class notes. Guess first, then check the explanation.</p></div><div class="page-actions"><button class="btn btn-outline" data-nav="classroom">' + icon('arrow-left') + ' Classroom</button><button class="btn btn-primary" data-nav="classroom-games">' + icon('rocket') + ' Play a game</button></div></div>' +
      '<div class="question-toolbar"><input class="input" id="questions-search" placeholder="Search questions…" value="' + esc(ML.session.qQuery || '') + '" aria-label="Search questions"><div class="chip-scroll"><button class="chip ' + (filter === 'all' ? 'on' : '') + '" data-act="q-filter" data-src="all">All sources</button>' + sources.map(function (s) {
        return '<button class="chip ' + (filter === s.id ? 'on' : '') + '" data-act="q-filter" data-src="' + esc(s.id) + '">' + esc(s.name) + '</button>';
      }).join('') + '</div></div>' +
      (filtered.length ? '<div class="question-grid">' + filtered.map(function (q) { return questionCard(q); }).join('') + '</div>' : '<div class="empty card" style="padding:56px 20px"><span class="empty-ic">' + icon('help') + '</span><h3>' + (questions.length ? 'No questions match that filter' : 'No questions yet') + '</h3><p>' + (questions.length ? 'Try another source or clear the search.' : 'Build a pack from Classroom or from a pasted note to generate questions.') + '</p><button class="btn btn-primary" data-nav="classroom">' + icon('plus') + ' Add notes</button></div>') + '</div>';
  }

  function questionCard(q) {
    var opts = q.options || [];
    return '<article class="question-card" data-qid="' + esc(q.id) + '"><div class="q-head"><span class="badge brand">' + esc(String(q.type || 'multiple_choice').replace(/_/g, ' ')) + '</span><span class="badge">' + esc(q.difficulty || 'medium') + '</span>' + (q.sourceFile ? '<span class="badge">' + esc(q.sourceFile) + '</span>' : '') + '</div><h3>' + esc(q.q) + '</h3>' +
      (opts.length ? '<div class="q-options">' + opts.map(function (opt, oi) {
        return '<button class="q-opt" data-act="question-answer" data-qid="' + esc(q.id) + '" data-oi="' + oi + '" data-answer="' + esc(q.answer) + '"><span class="q-key">' + String.fromCharCode(65 + oi) + '</span><span>' + esc(opt) + '</span></button>';
      }).join('') + '</div>' : '<textarea class="textarea q-answer-input" rows="3" placeholder="Write your answer, then reveal the model answer…"></textarea><button class="btn btn-sm btn-outline" style="margin-top:8px" data-act="question-reveal" data-qid="' + esc(q.id) + '">' + icon('eye') + ' Reveal model answer</button>') +
      '<div class="q-explanation" hidden><b>Why:</b> ' + esc(q.explanation || 'No explanation was generated.') + '</div></article>';
  }

  ML.views = {
    mentor: mentor,
    cards: cards,
    focus: focus,
    progress: progress,
    planner: planner,
    notes: notes,
    achievements: achievements,
    codeLab: codeLab,
    profile: profile,
    classroom: classroom,
    classroomCourse: classroomCourse,
    classroomGames: classroomGames,
    classroomGame: classroomGame,
    classroomQuestions: classroomQuestions,
    fmtClock: fmtClock,
    focusState: focusState,
    codeState: codeState,
    ensureCards: ensureCards
  };
})();
