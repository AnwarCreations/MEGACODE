/* MegaLab — per-account state, XP, streaks, SM-2, achievements, Google Drive sync */
(function () {
  'use strict';
  window.ML = window.ML || {};
  var data = ML.data;
  var PREFIX = 'megalab:v2:';
  var LAST_USER = 'megalab:last-user';
  var state = null;
  var currentUser = null;
  var storageKey = PREFIX + 'guest';
  var driveSyncEnabled = false;
  var driveSyncTimer = null;
  var saveTimer = null;
  var lastError = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return dateKey(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d; }
  function dayKey(n) { return dateKey(addDays(n)); }
  function uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function defaults(user) {
    var tz = 'Local';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'; } catch (e) {}
    return {
      version: 3,
      courses: [],
      activeCourseId: null,
      cards: [],
      notes: [],
      chat: [],
      log: {},
      focusSessions: [],
      tasks: [],
      planner: {},
      achievements: [],
      stats: { xp: 0, reviews: 0, focusSessions: 0, quizPerfect: 0, quizzes: 0, codeRuns: 0, coursesFinished: 0, bestStreak: 0, gamesPlayed: 0, gamesWon: 0, bestGameScore: 0 },
      settings: { theme: 'auto', dailyGoal: 30, aiTone: 'Socratic', reminders: true, sound: false, weekStart: 'Mon', followSystem: true, driveSync: true },
      profile: { bio: '', goal: '', timezone: tz },
      onboarding: false,
      classroom: {
        courses: [],
        syncedContent: [],
        lastSync: null,
        selectedCourseId: null,
        generatedGames: {},
        generatedQuestions: [],
        questionSources: [],
        sources: [],
        gameResults: {}
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function normalize(parsed, user) {
    var base = defaults(user);
    if (!parsed || typeof parsed !== 'object') return base;
    var out = Object.assign(base, parsed);
    out.stats = Object.assign(defaults(user).stats, parsed.stats || {});
    out.settings = Object.assign(defaults(user).settings, parsed.settings || {});
    out.profile = Object.assign(defaults(user).profile, parsed.profile || {});
    out.courses = Array.isArray(parsed.courses) ? parsed.courses : [];
    out.cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    out.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    out.chat = Array.isArray(parsed.chat) ? parsed.chat : [];
    out.focusSessions = Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [];
    out.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    out.achievements = Array.isArray(parsed.achievements) ? parsed.achievements : [];
    out.log = parsed.log && typeof parsed.log === 'object' ? parsed.log : {};
    out.planner = parsed.planner && typeof parsed.planner === 'object' ? parsed.planner : {};
    out.classroom = Object.assign(defaults(user).classroom, parsed.classroom || {});
    if (!out.classroom.generatedGames || typeof out.classroom.generatedGames !== 'object') out.classroom.generatedGames = {};
    if (!Array.isArray(out.classroom.generatedQuestions)) out.classroom.generatedQuestions = [];
    if (!Array.isArray(out.classroom.questionSources)) out.classroom.questionSources = [];
    if (!Array.isArray(out.classroom.sources)) out.classroom.sources = [];
    if (!out.classroom.gameResults || typeof out.classroom.gameResults !== 'object') out.classroom.gameResults = {};
    if (!Array.isArray(out.classroom.syncedContent)) out.classroom.syncedContent = [];
    if (!out.activeCourseId && out.courses.length) out.activeCourseId = out.courses[0].id;
    out.chat.forEach(function (m) { if (!m.courseId && out.activeCourseId) m.courseId = out.activeCourseId; });
    out.courses.forEach(function (c) {
      c.plan = Array.isArray(c.plan) ? c.plan : [];
      c.plan.forEach(function (l) { if (typeof l.done === 'undefined') l.done = 0; });
    });
    return out;
  }

  function keyFor(user) {
    var raw = user && (user.id || user.email || user.name) ? String(user.id || user.email || user.name) : 'guest';
    return PREFIX + raw.replace(/[^a-z0-9@._-]/gi, '_').slice(0, 120);
  }

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      lastError = 'Could not read local data.';
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      lastError = null;
      return true;
    } catch (e) {
      lastError = e && e.name === 'QuotaExceededError'
        ? 'Local storage is full. Export your data and remove old courses.'
        : 'Could not save on this device.';
      return false;
    }
  }

  function bind(user) {
    currentUser = user || null;
    storageKey = keyFor(user);
    var loaded = read(storageKey);
    state = normalize(loaded, user);
    if (user) {
      try { localStorage.setItem(LAST_USER, user.email || user.id || ''); } catch (e) {}
    }
    return state;
  }

  function save() {
    if (!state) return false;
    state.updatedAt = new Date().toISOString();
    var ok = write(storageKey, state);
    clearTimeout(driveSyncTimer);
    if (driveSyncEnabled && state.settings.driveSync) {
      driveSyncTimer = setTimeout(function () { pushToDrive(); }, 900);
    }
    return ok;
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 180);
  }

  function get() { return state; }
  function user() { return currentUser; }
  function key() { return storageKey; }

  function hashLike(x) { return String(x || '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12); }

  function activeCourse() {
    if (!state) return null;
    for (var i = 0; i < state.courses.length; i++) if (state.courses[i].id === state.activeCourseId) return state.courses[i];
    return state.courses[0] || null;
  }

  function findCourse(id) {
    if (!state) return null;
    for (var i = 0; i < state.courses.length; i++) if (state.courses[i].id === id) return state.courses[i];
    return null;
  }

  function courseProgress(course) {
    if (!course || !course.plan || !course.plan.length) return { done: 0, total: 0, pct: 0 };
    var done = course.plan.filter(function (l) { return !!l.done; }).length;
    return { done: done, total: course.plan.length, pct: Math.round(done / course.plan.length * 100) };
  }

  function dueCards() {
    var t = todayKey();
    return state.cards.filter(function (c) { return !c.due || c.due <= t; });
  }

  function logMinutes(m) {
    var k = todayKey();
    state.log[k] = Math.max(0, (state.log[k] || 0) + m);
    if (!state.log[k]) delete state.log[k];
    state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, streak());
    saveSoon();
  }

  function streak() {
    if (!state) return 0;
    var k = 0;
    if ((state.log[todayKey()] || 0) > 0) k = 0;
    else if ((state.log[dayKey(-1)] || 0) > 0) k = -1;
    else return 0;
    var n = 0;
    while ((state.log[dayKey(k - n)] || 0) > 0) n++;
    return n;
  }

  function totalMinutes() {
    var sum = 0;
    Object.keys(state.log).forEach(function (k) { sum += Number(state.log[k]) || 0; });
    return sum;
  }

  function levelInfo(xp) {
    xp = Number(xp) || 0;
    var floor = 0;
    var level = 1;
    var need = 250;
    while (xp >= floor + need) {
      floor += need;
      level++;
      need = 250 + (level - 1) * 75;
    }
    var titles = ['Curious', 'Apprentice', 'Practitioner', 'Builder', 'Specialist', 'Scholar', 'Strategist', 'Master', 'Polymath', 'Mega'];
    return {
      level: level,
      title: titles[Math.min(level - 1, titles.length - 1)],
      into: xp - floor,
      need: need,
      pct: Math.round((xp - floor) / need * 100),
      total: xp
    };
  }

  function addXp(n) {
    n = Number(n) || 0;
    state.stats.xp = Math.max(0, (state.stats.xp || 0) + n);
    saveSoon();
    return state.stats.xp;
  }

  function courseStats() {
    return {
      lessonsDone: state.courses.reduce(function (a, c) { return a + courseProgress(c).done; }, 0),
      lessonsTotal: state.courses.reduce(function (a, c) { return a + (c.plan ? c.plan.length : 0); }, 0),
      minutes: totalMinutes(),
      cards: state.cards.length,
      reviews: state.stats.reviews || 0,
      xp: state.stats.xp || 0,
      bestStreak: state.stats.bestStreak || 0,
      focusSessions: state.stats.focusSessions || 0,
      quizPerfect: state.stats.quizPerfect || 0,
      quizzes: state.stats.quizzes || 0,
      coursesMade: state.courses.length,
      coursesFinished: state.courses.filter(function (c) { return courseProgress(c).total > 0 && courseProgress(c).pct === 100; }).length,
      notes: state.notes.length,
      codeRuns: state.stats.codeRuns || 0,
      gamesPlayed: state.stats.gamesPlayed || 0,
      gamesWon: state.stats.gamesWon || 0,
      bestGameScore: state.stats.bestGameScore || 0
    };
  }

  function evaluateAchievements() {
    var s = courseStats();
    var fresh = [];
    data.ACHIEVEMENTS.forEach(function (a) {
      var value = Number(a.get(s)) || 0;
      var unlocked = value >= a.goal;
      var already = state.achievements.indexOf(a.id) !== -1;
      if (unlocked && !already) {
        state.achievements.push(a.id);
        fresh.push(a);
      } else if (!unlocked && already) {
        state.achievements = state.achievements.filter(function (id) { return id !== a.id; });
      }
    });
    return fresh;
  }

  function addCourse(course) {
    state.courses.unshift(course);
    state.activeCourseId = course.id;
    evaluateAchievements();
    save();
    return course;
  }

  function markLesson(courseId, index, done) {
    var c = findCourse(courseId);
    if (!c || !c.plan[index]) return;
    var l = c.plan[index];
    var was = !!l.done;
    var now = done === undefined ? !was : !!done;
    if (now === was) return;
    l.done = now ? new Date().toISOString() : 0;
    l.completedAt = now ? l.done : null;
    if (now) {
      logMinutes(c.mins || 30);
      addXp(50);
    } else {
      logMinutes(-(c.mins || 30));
      addXp(-50);
    }
    evaluateAchievements();
    save();
  }

  function addCards(cards, courseId) {
    var added = 0;
    (cards || []).forEach(function (card) {
      var f = String(card && (card.f || card.front) || '').trim();
      var b = String(card && (card.b || card.back) || '').trim();
      if (!f || !b) return;
      state.cards.unshift({
        id: uid('card'),
        f: f.slice(0, 500),
        b: b.slice(0, 1000),
        ease: 2.5,
        int: 0,
        due: todayKey(),
        courseId: courseId || state.activeCourseId || null,
        deck: card.deck || null,
        createdAt: new Date().toISOString(),
        reviews: 0
      });
      added++;
    });
    if (added) { addXp(added * 3); evaluateAchievements(); save(); }
    return added;
  }

  function reviewCard(id, quality) {
    var c = null;
    for (var i = 0; i < state.cards.length; i++) if (state.cards[i].id === id) c = state.cards[i];
    if (!c) return null;
    var q = Number(quality) || 0;
    c.reviews = (c.reviews || 0) + 1;
    if (q === 0) {
      c.int = 0;
      c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2);
      c.due = todayKey();
    } else {
      c.ease = Math.max(1.3, (c.ease || 2.5) + (q === 1 ? -0.15 : q === 3 ? 0.15 : 0));
      c.int = c.int < 1 ? 1 : c.int === 1 ? 3 : Math.round(c.int * c.ease * (q === 1 ? 0.6 : q === 3 ? 1.4 : 1));
      c.due = dayKey(c.int);
    }
    c.lastReview = new Date().toISOString();
    state.stats.reviews = (state.stats.reviews || 0) + 1;
    addXp(q === 0 ? 3 : q === 3 ? 10 : 7);
    evaluateAchievements();
    save();
    return c;
  }

  function logFocus(mins, task) {
    mins = Math.max(1, Math.round(Number(mins) || 0));
    state.focusSessions.unshift({ id: uid('focus'), mins: mins, at: new Date().toISOString(), task: task || 'Deep work' });
    if (state.focusSessions.length > 80) state.focusSessions.length = 80;
    state.stats.focusSessions = (state.stats.focusSessions || 0) + 1;
    logMinutes(mins);
    addXp(mins);
    var fresh = evaluateAchievements();
    save();
    return fresh;
  }

  function addNote(note) {
    var n = {
      id: uid('note'),
      title: String(note.title || 'Untitled note').slice(0, 140),
      body: String(note.body || '').slice(0, 20000),
      courseId: note.courseId || state.activeCourseId || null,
      lessonIndex: typeof note.lessonIndex === 'number' ? note.lessonIndex : null,
      updated: new Date().toISOString()
    };
    state.notes.unshift(n);
    addXp(5);
    evaluateAchievements();
    save();
    return n;
  }

  function updateNote(id, patch) {
    state.notes.forEach(function (n) {
      if (n.id === id) {
        if (patch.title !== undefined) n.title = String(patch.title).slice(0, 140);
        if (patch.body !== undefined) n.body = String(patch.body).slice(0, 20000);
        n.updated = new Date().toISOString();
      }
    });
    save();
  }

  function deleteNote(id) {
    state.notes = state.notes.filter(function (n) { return n.id !== id; });
    save();
  }

  function pushChat(message) {
    state.chat.push(Object.assign({ at: new Date().toISOString() }, message));
    if (state.chat.length > 400) state.chat = state.chat.slice(-400);
    saveSoon();
  }

  function clearChat(courseId) {
    state.chat = state.chat.filter(function (m) { return m.courseId !== courseId; });
    save();
  }

  function addTask(text) {
    text = String(text || '').trim();
    if (!text) return null;
    var t = { id: uid('task'), text: text.slice(0, 200), done: false };
    state.tasks.unshift(t);
    save();
    return t;
  }

  function toggleTask(id) {
    state.tasks.forEach(function (t) { if (t.id === id) t.done = !t.done; });
    save();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    save();
  }

  function setSettings(patch) {
    state.settings = Object.assign(state.settings, patch || {});
    save();
    return state.settings;
  }

  function setProfile(patch) {
    state.profile = Object.assign(state.profile, patch || {});
    save();
    return state.profile;
  }

  function recordQuiz(score, total, perfect) {
    state.stats.quizzes = (state.stats.quizzes || 0) + 1;
    if (perfect) state.stats.quizPerfect = (state.stats.quizPerfect || 0) + 1;
    addXp(Math.round((score / Math.max(1, total)) * 60) + (perfect ? 40 : 0));
    evaluateAchievements();
    save();
  }

  function recordCodeRun() {
    state.stats.codeRuns = (state.stats.codeRuns || 0) + 1;
    evaluateAchievements();
    saveSoon();
  }

  /* ---------------- Classroom, games and questions ---------------- */

  function ensureClassroom() {
    if (!state.classroom) state.classroom = defaults(currentUser).classroom;
    if (!state.classroom.generatedGames) state.classroom.generatedGames = {};
    if (!Array.isArray(state.classroom.generatedQuestions)) state.classroom.generatedQuestions = [];
    if (!Array.isArray(state.classroom.questionSources)) state.classroom.questionSources = [];
    if (!state.classroom.gameResults) state.classroom.gameResults = {};
    return state.classroom;
  }

  function setClassroom(result) {
    var c = ensureClassroom();
    if (!result) return c;
    if (Array.isArray(result.courses)) c.courses = result.courses;
    if (Array.isArray(result.syncedContent)) c.syncedContent = result.syncedContent;
    if (result.lastSync) c.lastSync = result.lastSync;
    save();
    return c;
  }

  function addGames(games, source) {
    var c = ensureClassroom();
    var added = 0;
    (games || []).forEach(function (g) {
      if (!g || !g.id || !g.type) return;
      c.generatedGames[g.id] = g;
      added++;
    });
    if (added) save();
    return added;
  }

  function removeGame(id) {
    var c = ensureClassroom();
    if (c.generatedGames[id]) {
      delete c.generatedGames[id];
      delete c.gameResults[id];
      save();
      return true;
    }
    return false;
  }

  function listGames() {
    var c = ensureClassroom();
    return Object.keys(c.generatedGames).map(function (k) { return c.generatedGames[k]; }).filter(function (g) {
      return g && g.id && g.type;
    });
  }

  function addQuestions(questions, source) {
    var c = ensureClassroom();
    var seen = {};
    c.generatedQuestions.forEach(function (q) { if (q && q.id) seen[q.id] = true; });
    var added = 0;
    (questions || []).forEach(function (q) {
      if (!q || !q.q) return;
      if (!q.id) q.id = uid('q');
      if (seen[q.id]) return;
      seen[q.id] = true;
      c.generatedQuestions.push(q);
      added++;
    });
    if (source && source.id) {
      var exists = c.questionSources.some(function (s) { return s.id === source.id; });
      if (!exists) c.questionSources.push({ id: source.id, name: source.name || 'Class notes' });
    }
    if (added) save();
    return added;
  }

  function addSource(source) {
    var c = ensureClassroom();
    if (!source || !source.text) return null;
    var text = String(source.text);
    if (text.length > 90000) text = text.slice(0, 90000);
    var id = source.id || uid('src');
    var existing = null;
    c.sources.forEach(function (s) { if (s.id === id) existing = s; });
    var item = {
      id: id,
      name: String(source.name || 'Class notes').slice(0, 180),
      kind: source.kind || 'notes',
      mimeType: source.mimeType || '',
      courseId: source.courseId || null,
      courseName: source.courseName || '',
      text: text,
      chars: text.length,
      method: source.method || 'pasted',
      createdAt: (existing && existing.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existing) {
      c.sources = c.sources.map(function (s) { return s.id === id ? item : s; });
    } else {
      c.sources.unshift(item);
    }
    if (c.sources.length > 24) c.sources.length = 24;
    save();
    return item;
  }

  function getSource(id) {
    var c = ensureClassroom();
    for (var i = 0; i < c.sources.length; i++) if (c.sources[i].id === id) return c.sources[i];
    return null;
  }

  function removeSource(id) {
    var c = ensureClassroom();
    c.sources = c.sources.filter(function (s) { return s.id !== id; });
    save();
  }

  function recordGame(gameId, score, total, meta) {
    var c = ensureClassroom();
    total = Math.max(1, Number(total) || 1);
    score = Math.max(0, Math.min(total, Number(score) || 0));
    var pct = Math.round(score / total * 100);
    var xp = Math.round(pct / 100 * 40) + (pct === 100 ? 20 : 0);
    c.gameResults[gameId] = {
      gameId: gameId,
      score: score,
      total: total,
      pct: pct,
      xp: xp,
      at: new Date().toISOString(),
      meta: meta || null
    };
    state.stats.gamesPlayed = (state.stats.gamesPlayed || 0) + 1;
    if (pct === 100) state.stats.gamesWon = (state.stats.gamesWon || 0) + 1;
    state.stats.bestGameScore = Math.max(state.stats.bestGameScore || 0, pct);
    addXp(xp);
    var fresh = evaluateAchievements();
    save();
    return { score: score, total: total, pct: pct, xp: xp, achievements: fresh };
  }

  function gameResult(gameId) {
    var c = ensureClassroom();
    return c.gameResults[gameId] || null;
  }

  function clearGenerated() {
    var c = ensureClassroom();
    c.generatedGames = {};
    c.generatedQuestions = [];
    c.questionSources = [];
    c.gameResults = {};
    save();
  }

  function exportData() {
    return JSON.stringify({
      app: 'MegaLab',
      version: 2,
      exportedAt: new Date().toISOString(),
      user: currentUser ? { name: currentUser.name, email: currentUser.email } : null,
      data: state
    }, null, 2);
  }

  function importData(raw) {
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { throw new Error('That file is not valid JSON.'); }
    var payload = parsed && parsed.data ? parsed.data : parsed;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.courses)) {
      throw new Error('This does not look like a MegaLab backup.');
    }
    state = normalize(payload, currentUser);
    evaluateAchievements();
    save();
    return state;
  }

  function resetWorkspace() {
    var user = currentUser;
    state = defaults(user);
    if (user) {
      state.profile.bio = '';
      state.onboarding = false;
    }
    try { localStorage.removeItem(storageKey); } catch (e) {}
    save();
    if (driveSyncEnabled) pushToDrive();
    return state;
  }

  function deleteAccount() {
    var hadDrive = driveSyncEnabled;
    try { localStorage.removeItem(storageKey); localStorage.removeItem(LAST_USER); } catch (e) {}
    state = null;
    currentUser = null;
    driveSyncEnabled = false;
    return hadDrive;
  }

  function hasContent() {
    return !!(state && (state.courses.length || state.cards.length || state.notes.length));
  }

  /* ---------------- Google Drive sync ---------------- */

  async function driveInit() {
    if (!ML.classroom) return { status: 'unavailable' };
    try {
      var result = await ML.classroom.initDriveSync({ interactive: false });
      if (!result || result.status !== 'synced') {
        driveSyncEnabled = false;
        return { status: result ? result.status : 'unavailable', loaded: false };
      }
      driveSyncEnabled = true;
      if (state.settings.driveSync) {
        var cloud = await ML.classroom.loadWorkspaceFromDrive();
        if (cloud && cloud.data) {
          var localUpdated = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
          var remoteUpdated = cloud.meta && cloud.meta.updatedAt ? new Date(cloud.meta.updatedAt).getTime() : 0;
          if (!hasContent() || remoteUpdated > localUpdated + 1500) {
            state = normalize(cloud.data, currentUser);
            write(storageKey, state);
            evaluateAchievements();
            return { status: 'synced', loaded: true, meta: cloud.meta };
          }
        }
      }
      return { status: 'synced', loaded: false };
    } catch (e) {
      driveSyncEnabled = false;
      lastError = e && e.message ? e.message : 'Drive sync unavailable.';
      return { status: 'unavailable', error: lastError };
    }
  }

  async function connectDrive() {
    if (!ML.classroom) throw new Error('Google Drive is not available.');
    var result = await ML.classroom.initDriveSync({ interactive: true });
    if (!result || result.status !== 'synced') {
      driveSyncEnabled = false;
      throw new Error('Google Drive permission was not granted.');
    }
    driveSyncEnabled = true;
    if (state) {
      state.settings.driveSync = true;
      save();
    }
    return result;
  }

  async function pushToDrive(options) {
    if (!state) return false;
    if (!driveSyncEnabled) {
      var connected = await driveInit();
      if (!connected || connected.status !== 'synced') return false;
    }
    try {
      var copy = JSON.parse(JSON.stringify(state));
      if (copy.chat && copy.chat.length > 120) copy.chat = copy.chat.slice(-120);
      await ML.classroom.syncWorkspaceToDrive(copy, options || {});
      lastError = null;
      return true;
    } catch (e) {
      lastError = e && e.message ? e.message : 'Could not save to Google Drive.';
      if (e && e.code === 'needs_consent') driveSyncEnabled = false;
      return false;
    }
  }

  async function pullFromDrive() {
    if (!state) return { status: 'unavailable' };
    if (!driveSyncEnabled) {
      var connected = await driveInit();
      if (!connected || connected.status !== 'synced') return { status: 'needs_consent' };
    }
    var cloud = await ML.classroom.loadWorkspaceFromDrive();
    if (!cloud || !cloud.data) return { status: 'empty' };
    state = normalize(cloud.data, currentUser);
    write(storageKey, state);
    evaluateAchievements();
    return { status: 'synced', data: state, meta: cloud.meta };
  }

  async function syncNow(options) {
    var ok = await pushToDrive(options);
    return { ok: ok, error: lastError, status: driveStatus() };
  }

  function driveStatus() {
    if (!ML.classroom) return 'local';
    var status = ML.classroom.driveStatus();
    if (status && status.enabled) return 'synced';
    if (status && status.status === 'connecting' || status && status.status === 'syncing') return 'connecting';
    if (status && status.status === 'error') return 'error';
    return driveSyncEnabled ? 'synced' : 'local';
  }

  function driveMeta() {
    if (!ML.classroom) return null;
    return ML.classroom.driveStatus();
  }

  function cloudStatus() { return driveStatus(); }
  function cloudMode() { return 'google-drive'; }

  ML.store = {
    bind: bind, save: save, saveSoon: saveSoon, get: get, user: user, key: key,
    activeCourse: activeCourse, findCourse: findCourse, courseProgress: courseProgress,
    dueCards: dueCards, streak: streak, totalMinutes: totalMinutes, levelInfo: levelInfo,
    addXp: addXp, logMinutes: logMinutes, courseStats: courseStats,
    evaluateAchievements: evaluateAchievements, addCourse: addCourse, markLesson: markLesson,
    addCards: addCards, reviewCard: reviewCard, logFocus: logFocus,
    addNote: addNote, updateNote: updateNote, deleteNote: deleteNote,
    pushChat: pushChat, clearChat: clearChat, addTask: addTask, toggleTask: toggleTask,
    deleteTask: deleteTask, setSettings: setSettings, setProfile: setProfile,
    recordQuiz: recordQuiz, recordCodeRun: recordCodeRun,
    recordGame: recordGame, gameResult: gameResult,
    ensureClassroom: ensureClassroom, setClassroom: setClassroom,
    addGames: addGames, removeGame: removeGame, listGames: listGames,
    addQuestions: addQuestions, clearGenerated: clearGenerated,
    addSource: addSource, getSource: getSource, removeSource: removeSource,
    exportData: exportData, importData: importData, resetWorkspace: resetWorkspace,
    deleteAccount: deleteAccount, hasContent: hasContent,
    driveInit: driveInit, connectDrive: connectDrive, pushToDrive: pushToDrive,
    pullFromDrive: pullFromDrive, syncNow: syncNow, driveStatus: driveStatus,
    driveMeta: driveMeta, cloudStatus: cloudStatus, cloudMode: cloudMode,
    todayKey: todayKey, dayKey: dayKey, dateKey: dateKey, uid: uid,
    lastError: function () { return lastError; },
    hashLike: hashLike
  };
})();
