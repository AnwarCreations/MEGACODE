/* MegaLab — helpers, markdown, shell, dashboard, courses, lessons */
(function () {
  'use strict';
  window.ML = window.ML || {};
  var D = ML.data;
  var icon = D.icon;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initials(name) {
    return String(name || 'Learner').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0] || ''; }).join('').toUpperCase() || 'M';
  }
  function avatar(user, size) {
    if (!user) return '';
    var cls = 'avatar' + (size ? ' ' + size : '');
    var pic = user.picture ? String(user.picture) : '';
    var inner = pic && /^(https:\/\/|data:image\/)/i.test(pic)
      ? '<img src="' + esc(pic) + '" alt="" referrerpolicy="no-referrer">'
      : esc(initials(user.name));
    return '<span class="' + cls + '">' + inner + '</span>';
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) {
    if (!d) return '';
    var x = d instanceof Date ? d : new Date(d);
    if (isNaN(x.getTime())) return '';
    return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function fmtLong(d) {
    var x = d instanceof Date ? d : new Date(d);
    return x.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function fmtTime(iso) {
    var x = new Date(iso);
    if (isNaN(x.getTime())) return '';
    return x.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function ago(iso) {
    if (!iso) return 'just now';
    var diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }
  function hm(mins) {
    mins = Number(mins) || 0;
    if (mins < 60) return mins + 'm';
    var h = Math.floor(mins / 60);
    var m = Math.round(mins % 60);
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  function initialsOrName(user) { return user && user.name ? user.name.split(' ')[0] : 'Learner'; }
  function fieldMeta(name) { return D.fieldMeta(name); }
  function coursePct(c) { return ML.store.courseProgress(c).pct; }
  function nextIndex(c) {
    if (!c || !c.plan) return -1;
    for (var i = 0; i < c.plan.length; i++) if (!c.plan[i].done) return i;
    return -1;
  }
  function currentStreak() { return ML.store.streak(); }
  function weeklyMinutes() {
    var total = 0;
    for (var i = 0; i < 7; i++) total += ML.store.get().log[ML.store.dayKey(-i)] || 0;
    return total;
  }

  /* Markdown */
  function inline(src) {
    var stash = [];
    var s = String(src || '');
    s = s.replace(/`([^`]+)`/g, function (m, code) {
      stash.push('<code>' + esc(code) + '</code>');
      return '\u0000' + (stash.length - 1) + '\u0000';
    });
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return stash[Number(i)] || ''; });
    return s;
  }

  function md(src) {
    var text = String(src == null ? '' : src);
    var parts = text.split('```');
    var out = '';
    for (var p = 0; p < parts.length; p++) {
      if (p % 2 === 1) {
        var code = parts[p];
        var nl = code.indexOf('\n');
        var lang = '';
        if (nl !== -1) {
          var first = code.slice(0, nl).trim();
          if (/^[a-zA-Z0-9+#._-]{0,20}$/.test(first)) {
            lang = first;
            code = code.slice(nl + 1);
          } else {
            code = code.slice(nl + 1);
          }
        }
        out += '<pre><code' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '>' + esc(code.replace(/\n$/, '')) + '</code></pre>';
        continue;
      }
      out += blocks(parts[p]);
    }
    return out;
  }

  function blocks(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var html = [];
    var i = 0;
    var para = [];
    var list = null;

    function flushPara() {
      if (para.length) {
        html.push('<p>' + inline(para.join(' ')) + '</p>');
        para = [];
      }
    }
    function flushList() {
      if (list) {
        html.push('<' + list.type + '>' + list.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.type + '>');
        list = null;
      }
    }
    function flushAll() { flushPara(); flushList(); }

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) { flushAll(); i++; continue; }

      var h = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushAll();
        var lvl = h[1].length;
        html.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        flushAll(); html.push('<hr>'); i++; continue;
      }
      if (/^>\s?/.test(trimmed)) {
        flushAll();
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
          quote.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + blocks(quote.join('\n')) + '</blockquote>');
        continue;
      }
      if (trimmed.charAt(0) === '|' && lines[i + 1] && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') !== -1) {
        flushAll();
        var headers = splitRow(trimmed);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '|') {
          rows.push(splitRow(lines[i].trim()));
          i++;
        }
        html.push('<table><thead><tr>' + headers.map(function (x) { return '<th>' + inline(x) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (x) { return '<td>' + inline(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
        continue;
      }
      var ul = line.match(/^\s*[-*+]\s+(.*)$/);
      var ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        var type = ul ? 'ul' : 'ol';
        if (!list || list.type !== type) { flushList(); list = { type: type, items: [] }; }
        list.items.push((ul ? ul[1] : ol[1]));
        i++;
        continue;
      }
      flushList();
      para.push(trimmed);
      i++;
    }
    flushAll();
    return html.join('');
  }

  function splitRow(row) {
    var s = row.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
    return s.split('|').map(function (x) { return x.trim(); });
  }

  /* Common fragments */
  function coverGrad(c) { return fieldMeta(c.field).grad; }
  function levelChip(level) { return '<span class="chip">' + icon('award') + esc(level) + '</span>'; }
  function statusChip(c) {
    var nx = nextIndex(c);
    if (nx === -1) return '<span class="badge ok">' + 'Complete</span>';
    return '<span class="badge brand">Day ' + (nx + 1) + ' next</span>';
  }

  function localInsight(course, st, streak, due) {
    if (!course || !course.plan.length) return { title: 'Build the smallest useful course', text: 'Pick one outcome you could demonstrate in two weeks. Not a subject — an outcome. MegaLab will turn it into a daily path.', action: 'new-course', label: 'Build a course' };
    if (due > 5) return { title: 'Clear the memory queue first', text: due + ' cards are due. A 12-minute retrieval sprint protects everything you have already learned. Do that before new material.', action: 'cards', label: 'Review ' + due + ' cards' };
    if (coursePct(course) === 100) return { title: 'Turn knowledge into proof', text: 'You finished the lessons. Now build one small artifact without the tutorial open, then explain the hardest decision you made.', action: 'mentor', label: 'Debrief with mentor' };
    if (streak === 0) return { title: 'One small session restarts momentum', text: 'Today has no study logged yet. A single 15-minute lesson plus the hands-on task is enough to keep the habit alive.', action: 'dashboard', label: 'Start 15 minutes' };
    if (weeklyMinutes() < st.minutes / 2) return { title: 'Protect the next session', text: 'Your pace is uneven this week. Put one focus block on the calendar now instead of hoping the day makes room for it.', action: 'focus', label: 'Open focus studio' };
    return { title: 'Go one level deeper', text: 'Do today’s lesson, then explain the core idea to the mentor in three sentences. Explanation exposes gaps that rereading hides.', action: 'lesson', label: 'Continue lesson' };
  }

  function quickLink(iconName, title, sub, nav, tone) {
    return '<button class="quick-link ' + (tone || '') + '" data-nav="' + nav + '"><span class="qi">' + icon(iconName) + '</span><span><b>' + title + '</b><span>' + sub + '</span></span></button>';
  }

  function chart7() {
    var days = [];
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var max = 30;
    for (var i = 6; i >= 0; i--) {
      var key = ML.store.dayKey(-i);
      var mins = ML.store.get().log[key] || 0;
      if (mins > max) max = mins;
      days.push({ key: key, mins: mins, name: names[new Date(key + 'T12:00:00').getDay()], today: i === 0 });
    }
    return '<div class="activity-chart" role="img" aria-label="Minutes studied over the last seven days">' +
      days.map(function (d) {
        return '<div class="bar-wrap"><div class="bar' + (d.today ? ' today' : '') + '" style="height:' + Math.max(4, Math.round(d.mins / max * 100)) + '%" data-v="' + d.mins + ' min" title="' + d.mins + ' min"></div><small>' + (d.today ? 'Today' : d.name) + '</small></div>';
      }).join('') + '</div>';
  }

  function streakWeek() {
    var names = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    var today = new Date();
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var date = new Date(today);
      date.setDate(date.getDate() - i);
      var key = ML.store.dateKey(date);
      var done = (ML.store.get().log[key] || 0) > 0;
      var isToday = i === 0;
      out.push('<div class="streak-day' + (done ? ' done' : '') + (isToday ? ' today' : '') + (isToday && !done ? ' future' : '') + '"><span>' + names[date.getDay()] + '</span><i>' + (done ? icon('check') : '') + '</i></div>');
    }
    return out.join('');
  }

  function sidebar(route, ui) {
    var state = ML.store.get();
    var user = ML.auth.user();
    var due = ML.store.dueCards().length;
    var stats = ML.store.courseStats();
    var lvl = ML.store.levelInfo(stats.xp);
    var base = route[0] || 'dashboard';
    var classroom = state.classroom || {};
    var classroomCourses = classroom.courses ? classroom.courses.length : 0;
    function item(id, label, iconName, nav, badge) {
      var active = base === id || (id === 'courses' && base === 'course') || (id === 'courses' && base === 'lesson');
      return '<button class="nav-item' + (active ? ' active' : '') + '" data-nav="' + nav + '"' + (active ? ' aria-current="page"' : '') + '>' + icon(iconName) + '<span>' + label + '</span>' + (badge ? '<span class="nav-badge' + (badge.warm ? ' warm' : '') + '">' + badge.value + '</span>' : '') + '</button>';
    }
    var promo;
    if (!state.courses.length) {
      promo = '<div class="side-promo"><h4>Start with one outcome</h4><p>Build a 14-day course around a skill you can actually demonstrate.</p><button class="btn btn-accent btn-sm" data-act="new-course">Build my course</button></div>';
    } else if (due > 0) {
      promo = '<div class="side-promo"><h4>' + due + ' cards due</h4><p>Retrieval first. Clear the queue before new material — it protects what you already built.</p><button class="btn btn-accent btn-sm" data-nav="cards">Review now</button></div>';
    } else {
      promo = '<div class="side-promo"><h4>Code Lab</h4><p>Write it, run it, then get a review that teaches instead of rewriting for you.</p><button class="btn btn-accent btn-sm" data-nav="code">Open Code Lab</button></div>';
    }
    return '<div class="side-head"><a class="brand" href="#/dashboard" aria-label="MegaLab dashboard"><span class="brand-mark" aria-hidden="true">M</span><span class="brand-word">Mega<span>Lab</span></span></a><button class="icon-btn side-close" data-act="close-sidebar" aria-label="Close menu">' + icon('x') + '</button></div>' +
      '<div class="side-scroll">' +
      '<div class="nav-group"><div class="nav-label">Lab</div>' + item('dashboard', 'Dashboard', 'layout', 'dashboard') + item('courses', 'My courses', 'book', 'courses') + item('planner', 'Planner', 'calendar', 'planner') + '</div>' +
      '<div class="nav-group"><div class="nav-label">Practice</div>' + item('mentor', 'AI mentor', 'sparkles', 'mentor') + item('cards', 'Flashcards', 'cards', 'cards', due ? { value: due > 99 ? '99+' : due, warm: true } : null) + item('focus', 'Focus studio', 'timer', 'focus') + item('code', 'Code Lab', 'terminal', 'code') + '</div>' +
      '<div class="nav-group"><div class="nav-label">Grow</div>' + item('progress', 'Progress', 'chart', 'progress') + item('notes', 'Notes', 'notes', 'notes') + item('achievements', 'Achievements', 'trophy', 'achievements') + '</div>' +
      '<div class="nav-group"><div class="nav-label">Classroom</div>' + item('classroom', 'Google Classroom', 'users', 'classroom', classroomCourses ? { value: classroomCourses, warm: false } : null) + item('classroom-games', 'Learning Games', 'rocket', 'classroom-games') + item('classroom-questions', 'Questions', 'help', 'classroom-questions') + '</div>' +
      '</div>' + promo +
      '<div class="side-foot"><button class="mini-profile" data-act="avatar-menu" aria-haspopup="menu">' + avatar(user) + '<span class="who"><b>' + esc(user ? user.name : 'Learner') + '</b><span>Level ' + lvl.level + ' · ' + lvl.title + '</span></span>' + icon('chevron-down') + '</button></div>';
  }

  function topbar(route, ui) {
    var user = ML.auth.user();
    var stats = ML.store.courseStats();
    var lvl = ML.store.levelInfo(stats.xp);
    var titles = { dashboard: 'Dashboard', courses: 'My courses', course: 'Course', lesson: 'Lesson', mentor: 'AI mentor', cards: 'Flashcards', focus: 'Focus studio', progress: 'Progress', planner: 'Planner', notes: 'Notes', achievements: 'Achievements', code: 'Code Lab', profile: 'Profile', settings: 'Settings', classroom: 'Google Classroom', 'classroom-games': 'Learning Games', 'classroom-questions': 'Questions' };
    var base = route[0] || 'dashboard';
    var aiStatus = ML.ai.status();
    var sync = ML.store.driveStatus();
    var due = ML.store.dueCards().length;
    var syncLabel = sync === 'synced' ? 'Drive synced' : sync === 'connecting' ? 'Sync…' : 'On device';
    return '<button class="icon-btn menu-btn" data-act="toggle-sidebar" aria-label="Open menu" aria-controls="sidebar">' + icon('menu') + '</button>' +
      '<div class="tb-left"><h1>' + (titles[base] || 'MegaLab') + '</h1><span class="crumb">' + esc(ML.auth.user() ? ML.auth.user().name.split(' ')[0] : '') + ' · Level ' + lvl.level + '</span></div>' +
      '<div class="tb-right">' +
      '<button class="tb-search" data-act="open-palette" aria-label="Search MegaLab"><span data-icon="search"></span><span>Search or jump to…</span><span class="kbd">Ctrl K</span></button>' +
      '<button class="sync-chip' + (sync === 'synced' ? '' : ' offline') + '" data-nav="profile/data" title="' + (sync === 'synced' ? 'Synced with Google Drive' : 'Saved in this browser') + '"><i></i>' + syncLabel + '</button>' +
      '<span class="chip brand" title="' + (aiStatus.mode === 'live' ? 'AI bridge connected' : 'Offline tutor active — connect an AI bridge or endpoint for live AI') + '">' + icon('sparkles', 'ic-sm') + (aiStatus.mode === 'live' ? 'AI' : 'Offline tutor') + '</span>' +
      '<button class="icon-btn bordered" data-act="notifications" aria-label="Notifications">' + icon('bell') + (due ? '<span class="dot"></span>' : '') + '</button>' +
      '<button class="top-avatar" data-act="avatar-menu" aria-label="Account menu">' + avatar(user).replace(/^<span class="avatar[^"]*">/, '').replace(/<\/span>$/, '') + '</button>' +
      '</div>';
  }

  function bottomNav(route) {
    var base = route[0] || 'dashboard';
    var items = [['dashboard', 'Home', 'layout'], ['courses', 'Courses', 'book'], ['mentor', 'Mentor', 'sparkles'], ['focus', 'Focus', 'timer'], ['profile', 'Profile', 'user']];
    return items.map(function (x) {
      var active = base === x[0] || (x[0] === 'courses' && (base === 'course' || base === 'lesson'));
      return '<button data-nav="' + x[0] + '" class="' + (active ? 'active' : '') + '">' + icon(x[1]) + '<span>' + x[2] + '</span></button>';
    }).join('');
  }

  function shell(route, ui) {
    return '<div class="drawer-scrim" data-act="close-sidebar" hidden></div>' +
      '<aside class="sidebar" id="sidebar" aria-label="Workspace navigation">' + sidebar(route, ui) + '</aside>' +
      '<div class="app-main"><header class="topbar" id="topbar">' + topbar(route, ui) + '</header><main class="view" id="view" tabindex="-1"></main><nav class="bottom-nav" aria-label="Quick navigation">' + bottomNav(route) + '</nav></div>';
  }

  /* Views */
  function dashboard(ui) {
    var state = ML.store.get();
    var user = ML.auth.user();
    var stats = ML.store.courseStats();
    stats.due = ML.store.dueCards().length;
    var lvl = ML.store.levelInfo(stats.xp);
    var course = ML.store.activeCourse();
    var gamesCount = Object.keys((state.classroom && state.classroom.generatedGames) || {}).length;
    var streak = currentStreak();
    var weekly = weeklyMinutes();
    var goal = state.settings.dailyGoal || 30;
    var todayMin = state.log[ML.store.todayKey()] || 0;
    var goalPct = Math.min(100, Math.round(todayMin / Math.max(1, goal) * 100));
    var nx = course ? nextIndex(course) : -1;
    var pct = course ? coursePct(course) : 0;
    var insight = localInsight(course, stats, streak, stats.due);
    var html = '<div class="page">' +
      '<div class="page-head"><div><p class="eyebrow">' + esc(fmtLong(new Date())) + '</p><h1>' + greeting() + ', ' + esc(initialsOrName(user)) + '.</h1><p>' + (course ? 'You are ' + pct + '% through <b>' + esc(course.topic) + '</b>. ' + (todayMin ? hm(todayMin) + ' studied today.' : 'No study logged today yet.') : 'Your lab is ready. Build a course around something you want to be able to prove.') + '</p></div><div class="page-actions"><button class="btn btn-outline" data-nav="focus">' + icon('timer') + ' Focus</button><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' New course</button></div></div>';

    if (course && nx !== -1) {
      html += '<div class="dash-hero"><div><div class="row wrap" style="gap:8px"><span class="eyebrow">Day ' + (nx + 1) + ' of ' + course.plan.length + ' · ' + course.mins + ' min</span><span class="streak-pill">' + icon('flame') + streak + '-day streak</span></div><h1>' + esc(course.plan[nx].title) + '</h1><p>' + esc(course.plan[nx].goal) + '</p><div class="hero-actions"><button class="btn btn-primary" data-nav="lesson/' + esc(course.id) + '/' + nx + '">' + icon('play') + ' Continue lesson</button><button class="btn btn-outline" data-act="ask-lesson" data-index="' + nx + '">' + icon('sparkles') + ' Ask mentor</button></div></div>' +
        '<div class="hero-ring"><div class="ring" style="--p:' + pct + '"><span>' + pct + '<small>%</small></span></div><small>' + ML.store.courseProgress(course).done + ' / ' + course.plan.length + ' lessons</small></div></div>';
    } else if (course && nx === -1) {
      html += '<div class="dash-hero"><div><span class="eyebrow">Course complete</span><h1>You finished ' + esc(course.topic) + '.</h1><p>Turn it into proof: build the final project without the tutorial open, then explain one hard decision to the mentor.</p><div class="hero-actions"><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' Start a new course</button><button class="btn btn-outline" data-nav="mentor">Debrief with mentor</button></div></div><div class="hero-ring"><div class="ring" style="--p:100"><span>100<small>%</small></span></div><small>Well done</small></div></div>';
    } else {
      html += '<div class="dash-hero"><div><span class="eyebrow">Your first lab</span><h1>Turn a goal into a daily path.</h1><p>Tell MegaLab what you want to learn, how much time you have, and your level. It builds the lessons, quizzes, flashcards and a plan you can actually finish.</p><div class="hero-actions"><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' Build my first course</button></div></div><div class="hero-ring"><div class="ring" style="--p:0"><span>0<small>%</small></span></div><small>Ready when you are</small></div></div>';
    }

    html += '<div class="quick-grid">' +
      quickLink('play', nx !== -1 ? 'Continue lesson' : 'My courses', nx !== -1 ? 'Day ' + (nx + 1) + ' · ' + course.mins + ' min' : 'Build or open a course', course ? (nx !== -1 ? 'lesson/' + course.id + '/' + nx : 'course/' + course.id) : 'courses', 'accent') +
      quickLink('cards', 'Review ' + stats.due + ' cards', stats.due ? 'Spaced repetition queue' : 'Nothing due — nice', 'cards', 'warm') +
      quickLink('timer', 'Start focus', goalPct >= 100 ? 'Daily goal reached' : goalPct + '% of ' + goal + ' min goal', 'focus', 'ok') +
      quickLink('code', 'Code Lab', 'Run, review, refactor', 'code', '') +
      quickLink('users', 'Google Classroom', gamesCount ? gamesCount + ' games ready' : 'Sync class notes into games', 'classroom', gamesCount ? 'warm' : '') +
      '</div>';

    html += '<div class="stat-strip">' +
      '<div class="stat-card"><span class="si">' + icon('flame') + '</span><b>' + streak + '</b><span>day streak</span><small>Best: ' + stats.bestStreak + ' days</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('zap') + '</span><b>' + stats.xp.toLocaleString() + '</b><span>XP · Level ' + lvl.level + '</span><small>' + lvl.title + ' · ' + lvl.into + '/' + lvl.need + ' to next</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('clock') + '</span><b>' + hm(weekly) + '</b><span>this week</span><small>' + hm(todayMin) + ' today · goal ' + hm(goal) + '</small></div>' +
      '<div class="stat-card"><span class="si">' + icon('target') + '</span><b>' + stats.lessonsDone + '/' + stats.lessonsTotal + '</b><span>lessons done</span><small>' + stats.coursesFinished + ' course' + (stats.coursesFinished === 1 ? '' : 's') + ' finished</small></div>' +
      '</div>';

    html += '<div class="dash-grid"><div class="dash-col">';
    if (course) {
      var upcoming = [];
      for (var i = nx === -1 ? 0 : nx; i < course.plan.length && upcoming.length < 4; i++) {
        if (!course.plan[i].done) upcoming.push({ l: course.plan[i], i: i });
      }
      html += '<section class="panel"><div class="panel-head"><div><h2>Today’s path</h2><div class="sub">' + esc(course.topic) + '</div></div><button class="link-btn" data-nav="course/' + esc(course.id) + '">Full syllabus ' + icon('arrow-right') + '</button></div><div class="panel-body"><div class="course-progress-card"><span class="cover" style="background:' + coverGrad(course) + '">' + icon(fieldMeta(course.field).icon) + '</span><div class="grow"><b>' + esc(course.topic) + '</b><p>' + esc(course.field) + ' · ' + esc(course.level) + ' · ' + course.days + ' days</p><div class="progress"><i style="width:' + pct + '%"></i></div><div class="progress-row"><span>' + ML.store.courseProgress(course).done + ' of ' + course.plan.length + ' lessons</span><span>' + pct + '%</span></div></div></div>' +
        (upcoming.length ? upcoming.map(function (x) { return '<button class="lesson-mini" data-nav="lesson/' + esc(course.id) + '/' + x.i + '"><span class="n">' + (x.i + 1) + '</span><span class="grow"><b>' + esc(x.l.title) + '</b><span>' + esc(x.l.goal) + '</span></span><span class="go">' + icon('chevron-right') + '</span></button>'; }).join('') : '<div class="empty" style="padding:18px"><h3>All lessons complete</h3><p>Start the final project or begin a new course.</p></div>') +
        '</div></section>';
    } else {
      html += '<section class="panel"><div class="panel-head"><h2>Your lab, step by step</h2></div><div class="panel-body"><div class="welcome-steps"><div class="welcome-step"><span class="wsn">1</span><div><b>Set one outcome</b><p>Not “learn Python” — “clean and analyse a real dataset end to end”.</p></div></div><div class="welcome-step"><span class="wsn">2</span><div><b>Do the daily lab</b><p>One lesson, one worked example, one hands-on task, one self-check.</p></div></div><div class="welcome-step"><span class="wsn">3</span><div><b>Lock it in</b><p>Flashcards return on schedule; analytics show what to fix next.</p></div></div></div></div><div class="panel-foot"><button class="btn btn-primary btn-block" data-act="new-course">' + icon('plus') + ' Build my first course</button></div></section>';
    }
    html += '<section class="panel"><div class="panel-head"><div><h2>Activity</h2><div class="sub">Minutes studied · last 7 days</div></div><button class="link-btn" data-nav="progress">Full analytics ' + icon('arrow-right') + '</button></div><div class="panel-body">' + chart7() + '<div class="progress" style="margin-top:16px"><i class="accent" style="width:' + goalPct + '%"></i></div><div class="progress-row"><span>Daily goal · ' + hm(todayMin) + ' / ' + hm(goal) + '</span><span>' + goalPct + '%</span></div></div></section>';
    html += '</div><div class="dash-col">';

    html += '<section class="card insight-card"><div class="ic-box">' + icon('lightbulb') + '</div><h3>' + esc(insight.title) + '</h3><p>' + esc(insight.text) + '</p><div class="row"><button class="btn btn-sm btn-primary" data-nav="' + (insight.action === 'lesson' && course && nx !== -1 ? 'lesson/' + course.id + '/' + nx : insight.action) + '">' + esc(insight.label) + '</button><button class="btn btn-sm btn-ghost" data-nav="progress">See why</button></div></section>';

    html += '<section class="panel"><div class="panel-head"><h2>Consistency</h2><span class="chip warm">' + icon('flame') + streak + ' days</span></div><div class="panel-body"><div class="streak-week">' + streakWeek() + '</div><p class="muted" style="font-size:11.5px;margin-top:14px">' + (streak ? 'One session today keeps the chain alive.' : 'A single 15-minute session restarts the chain.') + '</p></div></section>';

    html += '<section class="panel"><div class="panel-head"><div><h2>Memory queue</h2><div class="sub">' + (stats.due ? stats.due + ' cards due now' : 'Clear for now') + '</div></div><button class="icon-btn" data-nav="cards" aria-label="Open flashcards">' + icon('arrow-up-right') + '</button></div><div class="panel-body"><div class="row between"><div><div class="due-big">' + stats.due + '</div><span class="muted" style="font-size:11px">cards waiting</span></div>' + (stats.due ? '<button class="btn btn-primary btn-sm" data-nav="cards">Review now</button>' : '<span class="badge ok">' + icon('check') + ' All clear</span>') + '</div><div class="divider" style="margin:15px 0"></div><div class="caps" style="margin-bottom:9px">Achievements</div><div class="ach-mini">' + D.ACHIEVEMENTS.slice(0, 4).map(function (a) {
      var unlocked = state.achievements.indexOf(a.id) !== -1;
      return '<span class="ach-badge' + (unlocked ? ' unlocked' : '') + '" title="' + esc(a.name + ' — ' + a.desc) + '">' + icon(a.icon) + '</span>';
    }).join('') + '<button class="ach-badge more" data-nav="achievements" title="All achievements">+' + Math.max(0, D.ACHIEVEMENTS.length - 4) + '</button></div></div></section>';

    html += '</div></div></div>';
    return html;
  }

  function courses(ui) {
    var state = ML.store.get();
    var list = state.courses;
    var html = '<div class="page"><div class="page-head"><div><p class="eyebrow">Your curriculum</p><h1>My courses</h1><p>' + (list.length ? list.length + ' active course' + (list.length === 1 ? '' : 's') + ' · ' + ML.store.courseStats().lessonsDone + ' lessons completed' : 'Every course here is built around one outcome, not a content library.') + '</p></div><div class="page-actions"><button class="btn btn-primary" data-act="new-course">' + icon('plus') + ' New course</button></div></div>';
    if (!list.length) {
      html += '<div class="empty card" style="padding:60px 20px"><span class="empty-ic">' + icon('book') + '</span><h3>No courses yet</h3><p>Tell MegaLab one skill you want to be able to demonstrate. It will build the plan, lessons, quizzes and flashcards around it.</p><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" data-act="new-course">Build my first course</button></div></div>';
    } else {
      html += '<div class="course-grid">' + list.map(function (c) {
        var p = ML.store.courseProgress(c);
        var nx = nextIndex(c);
        var meta = fieldMeta(c.field);
        return '<button class="course-card" data-nav="course/' + esc(c.id) + '">' +
          '<div class="course-cover" style="background:' + meta.grad + '">' + icon(meta.icon) + '<span class="badge">' + esc(c.level) + '</span></div>' +
          '<div class="course-body"><h3>' + esc(c.topic) + '</h3><div class="meta"><span>' + esc(c.field) + '</span><span class="dotsep"></span><span>' + c.days + ' days</span><span class="dotsep"></span><span>' + c.mins + ' min/day</span></div><div class="spacer"></div><div><div class="progress"><i style="width:' + p.pct + '%"></i></div><div class="progress-row"><span>' + p.done + '/' + p.total + ' lessons</span><span>' + p.pct + '%</span></div></div><div class="course-foot">' + statusChip(c) + '<span class="muted" style="font-size:10px">' + (nx === -1 ? 'Finished' : 'Next: Day ' + (nx + 1)) + '</span></div></div></button>';
      }).join('') +
        '<button class="new-course" data-act="new-course"><span class="plus">' + icon('plus') + '</span><span>Build another course</span><span style="font-size:10.5px;font-weight:500;color:var(--faint)">Any subject · 15–120 min/day</span></button></div>';
    }
    html += '</div>';
    return html;
  }

  function courseView(course, ui) {
    if (!course) return courses(ui);
    var p = ML.store.courseProgress(course);
    var nx = nextIndex(course);
    var meta = fieldMeta(course.field);
    var cards = ML.store.get().cards.filter(function (c) { return c.courseId === course.id; });
    var notes = ML.store.get().notes.filter(function (n) { return n.courseId === course.id; });
    var html = '<div class="page"><button class="link-btn" data-nav="courses">' + icon('arrow-left') + ' All courses</button>' +
      '<div class="course-hero" style="background:' + meta.grad + '">' +
      '<div class="row wrap" style="gap:7px"><span class="badge" style="background:rgba(255,255,255,.16);color:#fff">' + esc(course.field) + '</span><span class="chip">' + icon('award') + esc(course.level) + '</span><span class="chip">' + icon('clock') + course.mins + ' min/day</span><span class="chip">' + icon('calendar') + course.days + ' days</span></div>' +
      '<h1>' + esc(course.topic) + '</h1><p>' + esc(course.days) + '-day adaptive path · started ' + fmtDate(course.createdAt) + ' · ' + p.done + ' of ' + p.total + ' lessons complete</p>' +
      '<div class="hero-bottom"><div class="progress"><i style="width:' + p.pct + '%"></i></div><span class="pct">' + p.pct + '%</span>' +
      (nx !== -1 ? '<button class="btn btn-primary" data-nav="lesson/' + esc(course.id) + '/' + nx + '">' + icon('play') + (p.done ? 'Continue Day ' + (nx + 1) : 'Start Day 1') + '</button>' : '<span class="badge" style="background:rgba(255,255,255,.18);color:#fff">Course complete</span>') +
      '<button class="btn btn-outline" data-act="ask-course">' + icon('sparkles') + ' Ask mentor</button></div></div>' +
      '<div class="dash-grid"><div class="dash-col"><section class="panel"><div class="panel-head"><div><h2>Syllabus</h2><div class="sub">Each day fits your ' + course.mins + '-minute budget</div></div><span class="badge">' + p.done + ' / ' + p.total + '</span></div><div class="syllabus">' +
      course.plan.map(function (l, i) {
        var isDone = !!l.done;
        var isCurrent = i === nx;
        return '<button class="syllabus-row' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '') + '" data-nav="lesson/' + esc(course.id) + '/' + i + '"><span class="n">' + (isDone ? icon('check') : (i + 1)) + '</span><span class="grow"><b>' + esc(l.title) + '</b><span>' + esc(l.goal) + '</span></span><span class="right"><span class="minutes">' + course.mins + ' min</span>' + (isCurrent ? '<span class="badge brand">Next</span>' : isDone ? '<span class="badge ok">Done</span>' : icon('chevron-right', 'ic-sm')) + '</span></button>';
      }).join('') + '</div></section></div><div class="dash-col">' +
      '<section class="panel"><div class="panel-head"><h2>Course kit</h2></div><div class="panel-body"><div class="deck-stats"><div><b>' + (p.total - p.done) + '</b><span>lessons left</span></div><div><b>' + cards.length + '</b><span>flashcards</span></div><div><b>' + notes.length + '</b><span>notes</span></div><div><b>' + p.pct + '%</b><span>complete</span></div></div><div class="chip-row" style="margin-top:14px"><button class="chip" data-nav="mentor">' + icon('sparkles') + ' Mentor</button><button class="chip" data-nav="cards">' + icon('cards') + ' Cards</button><button class="chip" data-nav="notes">' + icon('notes') + ' Notes</button></div></div><div class="panel-foot"><div class="row" style="gap:7px"><button class="btn btn-sm btn-outline grow" data-act="rebuild-plan" data-id="' + esc(course.id) + '">' + icon('refresh') + ' Rebuild plan</button><button class="btn btn-sm btn-danger" data-act="delete-course" data-id="' + esc(course.id) + '" aria-label="Delete course">' + icon('trash') + '</button></div></div></section>' +
      '<section class="card"><h3 style="font-size:13px;margin-bottom:6px">How this course works</h3><p class="muted" style="font-size:11.5px;line-height:1.6">Every lesson is generated around the goal above. Marking a lesson done logs its minutes, adds XP, and feeds your streak. Use the mentor for explanations, then make flashcards so it stays.</p></section>' +
      '</div></div></div>';
    return html;
  }

  function lessonView(course, index, ui) {
    if (!course) return courses(ui);
    var lesson = course.plan[index];
    if (!lesson) return courseView(course, ui);
    var p = ML.store.courseProgress(course);
    var notes = ML.store.get().notes.filter(function (n) { return n.courseId === course.id && n.lessonIndex === index; });
    var html = '<div class="read-progress" id="read-progress" aria-hidden="true"></div><div class="page"><div class="lesson-top"><button class="link-btn" data-nav="course/' + esc(course.id) + '">' + icon('arrow-left') + ' ' + esc(course.topic) + '</button><div class="lesson-actions"><button class="btn btn-sm ' + (lesson.done ? 'btn-soft' : 'btn-outline') + '" data-act="lesson-complete" data-index="' + index + '">' + icon('check') + (lesson.done ? 'Done' : 'Mark done') + '</button><button class="btn btn-sm btn-outline" data-act="lesson-note" data-index="' + index + '">' + icon('notes') + ' Note</button><button class="btn btn-sm btn-outline" data-act="lesson-cards" data-index="' + index + '">' + icon('cards') + ' Cards</button><button class="btn btn-sm btn-primary" data-act="lesson-quiz" data-index="' + index + '">' + icon('target') + ' Quiz me</button></div></div>' +
      '<div class="lesson-title"><span class="kicker">Day ' + (index + 1) + ' of ' + course.plan.length + ' · ' + course.mins + ' minutes · ' + esc(course.level) + '</span><h1>' + esc(lesson.title) + '</h1><p>' + esc(lesson.goal) + '</p></div>' +
      '<div class="lesson-layout"><div class="lesson-main"><article class="lesson-body" id="lesson-body">' + (lesson.body ? '<div class="md" id="lesson-content">' + md(lesson.body) + '</div>' : '<div class="lesson-loading" id="lesson-skeleton"><div class="skel h"></div><div class="skel w90"></div><div class="skel w70"></div><div class="skel w90"></div><div class="skel w40"></div><div class="skel h"></div><div class="skel w90"></div><div class="skel w70"></div></div>') + '</article>' +
      '<div class="row wrap" style="justify-content:space-between;gap:10px"><div class="lesson-actions"><button class="btn btn-outline" data-act="lesson-regen" data-index="' + index + '">' + icon('refresh') + ' Rewrite</button><button class="btn btn-outline" data-act="lesson-ask" data-index="' + index + '">' + icon('sparkles') + ' Ask about this</button></div><div class="row" style="gap:7px"><button class="btn btn-outline" data-act="lesson-prev" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + '>' + icon('chevron-left') + '</button><button class="btn btn-outline" data-act="lesson-next" data-index="' + index + '"' + (index >= course.plan.length - 1 ? ' disabled' : '') + '>' + icon('chevron-right') + '</button></div></div>' +
      '<div class="panel"><div class="panel-head"><h2>After this lesson</h2></div><div class="panel-body"><div class="chip-row"><button class="chip brand" data-act="lesson-quiz" data-index="' + index + '">' + icon('target') + ' 5-question quiz</button><button class="chip" data-act="lesson-cards" data-index="' + index + '">' + icon('cards') + ' Make flashcards</button><button class="chip" data-act="lesson-note" data-index="' + index + '">' + icon('notes') + ' Write a note</button><button class="chip" data-act="lesson-ask" data-index="' + index + '">' + icon('sparkles') + ' Explain to mentor</button></div></div></div>' +
      '</div><aside class="lesson-side">' +
      '<div class="side-card"><div class="row between"><h3>In this course</h3><span class="badge">' + p.done + '/' + p.total + '</span></div><div class="side-nav" style="max-height:270px;overflow-y:auto">' + course.plan.map(function (l, i) {
        return '<button class="' + (i === index ? 'active' : '') + '" data-nav="lesson/' + esc(course.id) + '/' + i + '">' + (l.done ? icon('check') : '<span style="width:15px;text-align:center;font-size:9.5px;font-weight:800;color:var(--faint)">' + (i + 1) + '</span>') + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.title) + '</span></button>';
      }).join('') + '</div></div>' +
      '<div class="side-card"><div class="row between"><h3>Lesson notes</h3><button class="link-btn" data-act="lesson-note" data-index="' + index + '">' + icon('plus') + ' Add</button></div>' + (notes.length ? notes.map(function (n) { return '<button class="deck-item" style="width:100%;border:0;text-align:left" data-act="note-open" data-id="' + esc(n.id) + '"><span class="dot"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.title) + '</span></button>'; }).join('') : '<p class="muted" style="font-size:11.5px">Capture the idea in your own words. Notes can become flashcards later.</p>') + '</div>' +
      '<div class="side-card"><h3>Session pace</h3><div class="kv"><span>Lesson time</span><b>' + course.mins + ' min</b></div><div class="kv"><span>Course progress</span><b>' + p.pct + '%</b></div><div class="kv"><span>Your level</span><b>' + esc(course.level) + '</b></div><button class="btn btn-block btn-outline btn-sm" style="margin-top:12px" data-act="focus-start">' + icon('timer') + ' Start focus timer</button></div>' +
      '</aside></div></div>';
    return html;
  }

  ML.ui = {
    esc: esc, initials: initials, avatar: avatar, md: md, icon: icon,
    fmtDate: fmtDate, fmtLong: fmtLong, fmtTime: fmtTime, ago: ago, hm: hm, greeting: greeting,
    fieldMeta: fieldMeta, coursePct: coursePct, nextIndex: nextIndex,
    weeklyMinutes: weeklyMinutes, currentStreak: currentStreak, panel: '',
    sidebar: sidebar, topbar: topbar, bottomNav: bottomNav, shell: shell,
    dashboard: dashboard, courses: courses, courseView: courseView, lessonView: lessonView,
    localInsight: localInsight, chart7: chart7, streakWeek: streakWeek
  };
})();
