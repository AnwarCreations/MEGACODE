/* MegaLab — boot, router, actions, overlays, focus timer, code sandbox */
(function () {
  'use strict';
  window.ML = window.ML || {};
  ML.session = ML.session || {};
  var D = ML.data;
  var icon = D.icon;
  var esc = ML.ui.esc;
  var md = ML.ui.md;
  var LS_THEME = 'megalab:theme';
  var menuEl = null;
  var pendingConfirm = null;
  var quiz = null;
  var paletteItems = [];
  var paletteSel = 0;
  var focusInterval = null;
  var codeWorker = null;
  var notesTimer = null;
  var questionTimer = null;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(id) { return document.getElementById(id); }
  function firstWord(name) { return String(name || 'Learner').trim().split(/\s+/)[0]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function routeInfo() {
    var raw = location.hash || '';
    if (raw.indexOf('#/') !== 0) return ['dashboard'];
    var body = raw.slice(2);
    if (!body) return ['dashboard'];
    return body.split('/').filter(Boolean).map(function (s) {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
  }

  function navigate(path) {
    closeMenu();
    var hash = '#/' + String(path || 'dashboard').replace(/^#?\/?/, '');
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function applyTheme(mode) {
    mode = ['light', 'dark', 'auto'].indexOf(mode) === -1 ? 'auto' : mode;
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem(LS_THEME, mode); } catch (e) {}
  }

  function toast(message, type, title) {
    var root = el('toast-root');
    if (!root) return;
    type = type || 'ok';
    var ic = type === 'bad' ? 'alert' : type === 'warm' ? 'info' : 'check-circle';
    var box = document.createElement('div');
    box.className = 'toast ' + type;
    box.innerHTML = icon(ic) + '<div>' + (title ? '<b>' + esc(title) + '</b>' : '') + '<span>' + esc(message) + '</span></div>';
    root.appendChild(box);
    setTimeout(function () {
      box.classList.add('out');
      setTimeout(function () { try { box.remove(); } catch (e) {} }, 220);
    }, 4200);
  }

  function openModal(html) {
    closeMenu();
    el('modal-root').innerHTML = html;
    document.body.classList.add('no-scroll');
    setTimeout(function () {
      var f = $('#modal-root input:not([type="hidden"]), #modal-root textarea, #modal-root select');
      if (f) { try { f.focus(); } catch (e) {} }
    }, 40);
  }

  function closeModal() {
    el('modal-root').innerHTML = '';
    document.body.classList.remove('no-scroll');
    pendingConfirm = null;
    quiz = null;
  }

  function modalShell(opts) {
    opts = opts || {};
    return '<div class="modal-backdrop"><div class="modal ' + (opts.wide ? 'wide ' : '') + (opts.narrow ? 'narrow' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || 'Dialog') + '">' +
      '<div class="modal-head"><div><h2>' + esc(opts.title || '') + '</h2>' + (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div><button class="modal-close" data-act="modal-close" aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.foot ? '<div class="modal-foot">' + opts.foot + '</div>' : '') +
      '</div></div>';
  }

  function confirmDialog(opts) {
    pendingConfirm = opts.onConfirm;
    openModal(modalShell({
      title: opts.title || 'Are you sure?',
      sub: opts.sub || '',
      narrow: true,
      body: '<p class="muted" style="font-size:13px;line-height:1.65">' + esc(opts.message || '') + '</p>',
      foot: '<button class="btn btn-ghost" data-act="modal-close">Cancel</button><button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="confirm-yes">' + esc(opts.confirmLabel || 'Confirm') + '</button>'
    }));
  }

  function closeMenu() {
    if (menuEl) { try { menuEl.remove(); } catch (e) {} menuEl = null; }
  }

  function openAvatarMenu(anchor) {
    closeMenu();
    var user = ML.auth.user() || { name: 'Learner', email: '' };
    var menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = '<div class="menu-head"><b>' + esc(user.name) + '</b><span>' + esc(user.email || 'Local learner') + '</span></div>' +
      '<button class="menu-item" data-nav="profile/account" role="menuitem">' + icon('user') + ' Profile</button>' +
      '<button class="menu-item" data-nav="profile/preferences" role="menuitem">' + icon('settings') + ' Preferences</button>' +
      '<button class="menu-item" data-act="toggle-theme" role="menuitem">' + icon('moon') + ' Change theme</button>' +
      '<button class="menu-item" data-act="export-data" role="menuitem">' + icon('download') + ' Export data</button>' +
      '<div class="menu-sep"></div>' +
      '<button class="menu-item danger" data-act="sign-out" role="menuitem">' + icon('logout') + ' Sign out</button>';
    document.body.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    if (r.bottom + menu.offsetHeight + 16 > window.innerHeight) menu.style.top = Math.max(12, r.top - menu.offsetHeight - 8) + 'px';
    menuEl = menu;
  }

  function renderLandingHeat() {
    var target = el('landing-heat');
    if (!target || target.dataset.ready === '1') return;
    var out = '';
    for (var i = 0; i < 84; i++) {
      var l = (i * 7 + 3) % 13 === 0 ? 0 : ((i * 5 + 2) % 9 === 0 ? 1 : ((i * 3 + 1) % 7 === 0 ? 2 : ((i * 11 + 4) % 13 === 0 ? 4 : 3)));
      out += '<i data-l="' + l + '"></i>';
    }
    target.innerHTML = out;
    target.dataset.ready = '1';
  }

  function showLanding() {
    el('boot').hidden = true;
    el('landing').hidden = false;
    el('app').hidden = true;
    setSkipTarget('lp-main');
    document.body.classList.remove('no-scroll');
    closeMenu();
    closeModal();
    var stored = 'auto';
    try { stored = localStorage.getItem(LS_THEME) || 'auto'; } catch (e) {}
    applyTheme(stored);
    var year = el('year');
    if (year) year.textContent = String(new Date().getFullYear());
    renderLandingHeat();
    document.title = 'MegaLab — Learn anything. Actually remember it.';
  }

  function showApp() {
    el('boot').hidden = true;
    el('landing').hidden = true;
    el('app').hidden = false;
    setSkipTarget('view');
  }

  function setSkipTarget(id) {
    var link = $('.skip-link');
    if (link) link.setAttribute('href', '#' + id);
  }

  function enterApp(user) {
    ML.store.bind(user);
    ML.session = {};
    applyTheme(ML.store.get().settings.theme || 'auto');
    hydrateFocus();
    hydrateCode();
    showApp();
    render();
    startFocusTicker();
    ML.store.driveInit().then(function (r) {
      if (r && r.loaded) {
        render();
        toast('Your Drive workspace was restored.', 'ok');
      } else if (r && r.status === 'synced') {
        render();
      }
    });
  }

  function renderSidebar(route) {
    var side = el('sidebar');
    if (side) side.innerHTML = ML.ui.sidebar(route);
    var top = el('topbar');
    if (top) top.innerHTML = ML.ui.topbar(route);
    var bottom = el('bottom-nav');
    if (bottom) bottom.innerHTML = ML.ui.bottomNav(route);
  }

  function render() {
    if (!ML.auth.isSignedIn()) { showLanding(); return; }
    if (!ML.store.get()) ML.store.bind(ML.auth.user());
    showApp();
    var route = routeInfo();
    var base = route[0] || 'dashboard';
    var state = ML.store.get();
    if ((base === 'course' || base === 'lesson') && route[1]) {
      var opened = ML.store.findCourse(route[1]);
      if (opened && state.activeCourseId !== opened.id) {
        state.activeCourseId = opened.id;
        opened.lastOpened = new Date().toISOString();
        ML.store.save();
      }
    }
    applyTheme(state.settings.theme || 'auto');
    var html = '';
    var title = 'Dashboard';
    if (base === 'courses') {
      html = ML.ui.courses();
      title = 'My courses';
    } else if (base === 'course') {
      var course = ML.store.findCourse(route[1]);
      html = course ? ML.ui.courseView(course) : ML.ui.courses();
      title = course ? course.topic : 'Courses';
    } else if (base === 'lesson') {
      var lc = ML.store.findCourse(route[1]);
      var idx = Number(route[2]) || 0;
      html = lc && lc.plan[idx] ? ML.ui.lessonView(lc, idx) : (lc ? ML.ui.courseView(lc) : ML.ui.courses());
      title = lc && lc.plan[idx] ? lc.plan[idx].title : 'Lesson';
    } else if (base === 'mentor') {
      html = ML.views.mentor();
      title = 'AI mentor';
    } else if (base === 'cards') {
      if (!ML.session.cards) startCardsQueue();
      html = ML.views.cards();
      title = 'Flashcards';
    } else if (base === 'focus') {
      html = ML.views.focus();
      title = 'Focus studio';
    } else if (base === 'progress') {
      html = ML.views.progress();
      title = 'Progress';
    } else if (base === 'planner') {
      html = ML.views.planner();
      title = 'Planner';
    } else if (base === 'notes') {
      html = ML.views.notes();
      title = 'Notes';
    } else if (base === 'achievements') {
      html = ML.views.achievements();
      title = 'Achievements';
    } else if (base === 'code') {
      html = ML.views.codeLab();
      title = 'Code Lab';
    } else if (base === 'profile') {
      html = ML.views.profile(null, route[1] || 'account');
      title = 'Profile';
    } else if (base === 'classroom') {
      if (route[1] === 'course' && route[2]) {
        html = ML.views.classroomCourse(null, route[2]);
        title = 'Class course';
      } else if (route[1] === 'games') {
        html = ML.views.classroomGames();
        title = 'Learning Games';
      } else if (route[1] === 'game' && route[2]) {
        html = ML.views.classroomGame(null, route[2]);
        title = 'Play Game';
      } else if (route[1] === 'questions') {
        html = ML.views.classroomQuestions();
        title = 'Practice Questions';
      } else {
        html = ML.views.classroom();
        title = 'Google Classroom';
      }
    } else if (base === 'classroom-games') {
      html = ML.views.classroomGames();
      title = 'Learning Games';
    } else if (base === 'classroom-game') {
      html = ML.views.classroomGame(null, route[1]);
      title = 'Play Game';
    } else if (base === 'classroom-questions') {
      html = ML.views.classroomQuestions();
      title = 'Practice Questions';
    } else {
      route = ['dashboard'];
      html = ML.ui.dashboard();
      title = 'Dashboard';
    }
    renderSidebar(route);
    el('view').innerHTML = html;
    document.title = title + ' · MegaLab';
    afterRender(route);
  }

  function afterRender(route) {
    var base = route[0] || 'dashboard';
    closeSidebar();
    if (base === 'lesson') {
      updateReadProgress();
      var lc = ML.store.findCourse(route[1]);
      var idx = Number(route[2]) || 0;
      if (lc && lc.plan[idx] && !lc.plan[idx].body) generateLesson(lc, idx);
      var input = el('focus-task');
      if (input && input.value) input.value = input.value;
    }
    if (base === 'mentor') {
      var log = el('chat-log');
      if (log) log.scrollTop = log.scrollHeight;
      setTimeout(function () { var ta = el('chat-input'); if (ta) { ta.focus(); autoGrow(ta); } }, 60);
    }
    if (base === 'focus') updateFocusDom();
    if (base === 'code') {
      syncCodeEditor();
      var ci = el('code-input');
      if (ci) setTimeout(function () { try { ci.focus(); } catch (e) {} }, 50);
    }
    if (base === 'cards') {
      var due = ML.store.dueCards().length;
      if (due && (!ML.session.cards || !ML.session.cards.ids.length)) startCardsQueue();
    }
    if (base === 'classroom-game') initFlashcardRace();
  }

  function closeSidebar() {
    var app = el('app');
    if (app) app.classList.remove('drawer-open');
    var scrim = $('.drawer-scrim');
    if (scrim) scrim.hidden = true;
  }

  function openSidebar() {
    var app = el('app');
    if (app) app.classList.add('drawer-open');
    var scrim = $('.drawer-scrim');
    if (scrim) scrim.hidden = false;
  }

  function updateReadProgress() {
    var bar = el('read-progress');
    var body = el('lesson-body');
    if (!bar || !body) return;
    var rect = body.getBoundingClientRect();
    var total = rect.height - window.innerHeight * 0.45;
    var done = -rect.top + window.innerHeight * 0.25;
    var pct = total <= 0 ? 100 : clamp(done / total * 100, 0, 100);
    bar.style.width = pct + '%';
  }

  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(150, ta.scrollHeight) + 'px';
  }

  function syncCodeEditor() {
    var ta = el('code-input');
    var nums = el('line-nums');
    if (!ta || !nums) return;
    var count = String(ta.value || '').split('\n').length;
    var out = [];
    for (var i = 1; i <= Math.max(count, 12); i++) out.push(i);
    nums.innerHTML = out.join('<br>');
  }

  function updateTerminal() {
    var term = el('term-output');
    if (!term) return;
    var cs = ML.session.code || { output: '' };
    if (!cs.output) {
      term.innerHTML = '<div class="term-head">' + icon('terminal', 'ic-sm') + ' Console output</div><span style="color:#5d6694">Run the snippet to see output. console.log, warn and error are captured.</span>';
      return;
    }
    term.innerHTML = '<div class="term-head">' + icon('terminal', 'ic-sm') + ' Console output</div>' + cs.output;
  }

  function setTheme(mode) {
    if (ML.auth.isSignedIn()) {
      ML.store.setSettings({ theme: mode });
      ML.store.save();
    }
    applyTheme(mode);
    toast('Theme set to ' + mode + '.', 'ok');
    if (ML.auth.isSignedIn()) render();
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'auto';
    var next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
    setTheme(next);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var year = el('year');
    if (year) year.textContent = String(new Date().getFullYear());
    renderLandingHeat();
    bindEvents();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    }
    var stored = 'auto';
    try { stored = localStorage.getItem(LS_THEME) || 'auto'; } catch (e) {}
    applyTheme(stored);
    var user = ML.auth.restore();
    if (user) enterApp(user);
    else showLanding();
    setTimeout(function () { el('boot').hidden = true; }, 260);
  });

  function bindEvents() {
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('dragover', function (e) {
      var zone = e.target.closest ? e.target.closest('.dropzone') : null;
      if (!zone) return;
      e.preventDefault();
      zone.classList.add('dragging');
    });
    document.addEventListener('dragleave', function (e) {
      var zone = e.target.closest ? e.target.closest('.dropzone') : null;
      if (zone) zone.classList.remove('dragging');
    });
    document.addEventListener('drop', function (e) {
      var zone = e.target.closest ? e.target.closest('.dropzone') : null;
      if (!zone) return;
      e.preventDefault();
      zone.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) ingestFiles(e.dataTransfer.files);
    });
    window.addEventListener('hashchange', function () {
      closeMenu();
      if (!ML.auth.isSignedIn()) { showLanding(); return; }
      render();
    });
    window.addEventListener('scroll', function () {
      updateReadProgress();
      var nav = el('lp-nav');
      if (nav && !el('landing').hidden) nav.classList.toggle('scrolled', window.scrollY > 10);
      closeMenu();
    }, { passive: true });
    window.addEventListener('resize', closeMenu);
  }

  function onClick(e) {
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) { closeModal(); return; }
    if (e.target.classList && e.target.classList.contains('palette')) { closePalette(); return; }
    if (menuEl && !e.target.closest('.menu')) closeMenu();
    var actEl = e.target.closest('[data-act]');
    if (actEl) {
      e.preventDefault();
      runAction(actEl.getAttribute('data-act'), actEl, e);
      return;
    }
    var navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.preventDefault();
      closeMobileNav();
      navigate(navEl.getAttribute('data-nav'));
      return;
    }
    var landing = e.target.closest('[data-action]');
    if (landing) {
      e.preventDefault();
      runLandingAction(landing.getAttribute('data-action'), landing, e);
      return;
    }
    if (e.target.closest('.mobile-nav a')) closeMobileNav();
  }

  function onSubmit(e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var type = form.getAttribute('data-form');
    var fd = new FormData(form);
    if (type === 'chat') {
      var ta = el('chat-input');
      var text = ta ? ta.value.trim() : '';
      if (!text) return;
      if (ta) { ta.value = ''; autoGrow(ta); }
      sendChat(text);
    } else if (type === 'focus-task') {
      var f = focusState();
      var inp = el('focus-task');
      f.task = inp ? inp.value.trim() : '';
      saveFocus();
      toast(f.task ? 'Session task set.' : 'Session task cleared.', 'ok');
      render();
    } else if (type === 'task-add') {
      var textAdd = String(fd.get('text') || '').trim();
      if (!textAdd) return;
      ML.store.addTask(textAdd);
      toast('Task added.', 'ok');
      render();
    } else if (type === 'note-save') {
      var id = String(fd.get('id') || '');
      var title = String(fd.get('title') || '').trim() || 'Untitled note';
      var bodyText = String(fd.get('body') || '').trim();
      var courseId = String(fd.get('courseId') || '') || null;
      var lessonIndex = fd.get('lessonIndex');
      if (id) {
        ML.store.updateNote(id, { title: title, body: bodyText });
        toast('Note updated.', 'ok');
      } else {
        ML.store.addNote({ title: title, body: bodyText, courseId: courseId, lessonIndex: lessonIndex === '' ? null : Number(lessonIndex) });
        toast('Note saved · +5 XP', 'ok');
      }
      closeModal();
      checkAchievements();
      render();
    } else if (type === 'add-card') {
      var fFront = String(fd.get('front') || '').trim();
      var fBack = String(fd.get('back') || '').trim();
      if (!fFront || !fBack) { toast('A card needs both a prompt and an answer.', 'bad'); return; }
      var added = ML.store.addCards([{ f: fFront, b: fBack }], String(fd.get('courseId') || '') || null);
      closeModal();
      startCardsQueue();
      toast(added + ' card added.', 'ok');
      checkAchievements();
      render();
    } else if (type === 'create-course') {
      var topic = String(fd.get('topic') || '').trim();
      if (!topic) { toast('Give the course a concrete topic.', 'bad'); return; }
      var course = {
        id: ML.store.uid('course'),
        topic: topic,
        field: String(fd.get('field') || 'Computer Science'),
        level: String(fd.get('level') || 'Beginner'),
        mins: Number(fd.get('mins')) || 30,
        days: Number(fd.get('days')) || 14,
        createdAt: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        plan: D.planTemplate({ topic: topic, days: Number(fd.get('days')) || 14 })
      };
      ML.store.addCourse(course);
      closeModal();
      navigate('course/' + course.id);
      toast('Course outline created. Building the plan…', 'ok');
      upgradeCoursePlan(course, false);
    } else if (type === 'profile-account') {
      var name = String(fd.get('name') || '').trim();
      if (!name) { toast('Name cannot be empty.', 'bad'); return; }
      ML.auth.updateUser({ name: name });
      ML.store.setProfile({ bio: String(fd.get('bio') || ''), goal: String(fd.get('goal') || '') });
      toast('Profile saved.', 'ok');
      render();
    } else if (type === 'classroom-paste') {
      var noteName = String(fd.get('name') || '').trim() || 'Pasted class notes';
      var noteText = String(fd.get('text') || '').trim();
      var noteCourseId = String(fd.get('courseId') || '') || null;
      if (noteText.replace(/\s/g, '').length < 80) {
        toast('Add a little more text — about 80 characters minimum.', 'warm');
        return;
      }
      var noteCourse = noteCourseId ? (ML.store.ensureClassroom().courses || []).filter(function (c) { return c.id === noteCourseId; })[0] : null;
      var pastedSource = ML.store.addSource({
        name: noteName,
        kind: 'notes',
        mimeType: 'text/plain',
        text: noteText,
        method: 'pasted',
        courseId: noteCourseId,
        courseName: noteCourse ? noteCourse.name : ''
      });
      if (!pastedSource) { toast('Could not save those notes.', 'bad'); return; }
      toast('Notes saved. Building a pack…', 'warm');
      form.reset();
      buildPackFromSource(pastedSource, { navigate: false });
    }
  }

  function onInput(e) {
    var t = e.target;
    if (t.id === 'code-input') {
      if (!ML.session.code) ML.views.codeState();
      ML.session.code.code = t.value;
      syncCodeEditor();
      saveCodeSoon();
      return;
    }
    if (t.id === 'chat-input') { autoGrow(t); return; }
    if (t.id === 'notes-search') {
      var value = t.value;
      if (!ML.session.notes) ML.session.notes = { query: '', courseId: 'all' };
      ML.session.notes.query = value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(function () {
        render();
        var again = el('notes-search');
        if (again) {
          again.focus();
          try { again.setSelectionRange(value.length, value.length); } catch (err) {}
        }
      }, 220);
    }
    if (t.id === 'questions-search') {
      var qValue = t.value;
      ML.session.qQuery = qValue;
      clearTimeout(questionTimer);
      questionTimer = setTimeout(function () {
        render();
        var qAgain = el('questions-search');
        if (qAgain) {
          qAgain.focus();
          try { qAgain.setSelectionRange(qValue.length, qValue.length); } catch (err) {}
        }
      }, 220);
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'import-file' && t.files && t.files[0]) {
      var file = t.files[0];
      var reader = new FileReader();
      reader.onload = function () {
        try {
          ML.store.importData(String(reader.result || ''));
          toast('Workspace imported.', 'ok');
          render();
        } catch (err) {
          toast(err.message || 'Could not import that file.', 'bad');
        }
      };
      reader.readAsText(file);
      t.value = '';
      return;
    }
    if (t.id === 'avatar-file' && t.files && t.files[0]) {
      resizeAvatar(t.files[0]);
      t.value = '';
      return;
    }
    if (t.id === 'classroom-file' && t.files && t.files.length) {
      var uploadFiles = Array.prototype.slice.call(t.files);
      t.value = '';
      ingestFiles(uploadFiles);
      return;
    }
    if (t.hasAttribute('data-pref')) {
      var key = t.getAttribute('data-pref');
      var value;
      if (t.type === 'checkbox') value = t.checked;
      else if (key === 'dailyGoal') value = Number(t.value) || 30;
      else value = t.value;
      var patch = {};
      patch[key] = value;
      ML.store.setSettings(patch);
      toast('Preference saved.', 'ok');
      if (key === 'dailyGoal' || key === 'weekStart') render();
    }
  }

  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === 'Escape') {
      if ($('#palette-root .palette')) { closePalette(); return; }
      if (menuEl) { closeMenu(); return; }
      if ($('#modal-root .modal-backdrop')) { closeModal(); return; }
      closeMobileNav();
      return;
    }
    if (!ML.auth.isSignedIn()) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (document.activeElement && document.activeElement.isContentEditable);
    if (typing) return;
    var route = routeInfo();
    if (route[0] === 'cards') {
      var cs = ML.session.cards;
      if (!cs || cs.idx >= cs.ids.length) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!cs.revealed) { cs.revealed = true; render(); }
        return;
      }
      if (cs.revealed && ['1', '2', '3', '4'].indexOf(e.key) !== -1) {
        e.preventDefault();
        rateCard(Number(e.key) - 1);
      }
    }
    if (route[0] === 'focus' && e.code === 'Space') {
      e.preventDefault();
      toggleFocus();
    }
    if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('note-card')) {
      e.preventDefault();
      var id = document.activeElement.getAttribute('data-id');
      var note = ML.store.get().notes.filter(function (n) { return n.id === id; })[0];
      if (note) openNoteModal(note);
    }
  }

  function runLandingAction(action) {
    if (action === 'google-signin') startGoogleSignIn();
    else if (action === 'open-signin') openSignInModal('');
    else if (action === 'toggle-mobile-nav') {
      var nav = el('mobile-nav');
      var btn = $('.lp-menu');
      var open = nav && nav.hidden;
      if (nav) nav.hidden = !open;
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function closeMobileNav() {
    var nav = el('mobile-nav');
    var btn = $('.lp-menu');
    if (nav) nav.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openSignInModal(message) {
    var configured = ML.auth.isConfigured();
    var cfg = ML.auth.config() || {};
    var body = '<div class="signin-art"><span class="logo-big">M</span><h2>Welcome to MegaLab</h2><p>One login, remembered for ' + (cfg.sessionDays || 30) + ' days. Your data stays in this browser.</p></div>' +
      '<div id="signin-error" class="err-text"' + (message ? '' : ' hidden') + '>' + esc(message || '') + '</div>' +
      (configured
        ? '<button class="btn btn-primary btn-block btn-lg" data-act="google-signin-modal"><span class="g-icon" aria-hidden="true"></span> Continue with Google</button>'
        : '<div class="google-box"><div class="row">' + icon('key') + '<b>Google sign-in needs a client ID</b></div><p class="hint">Add your OAuth client ID to <code>google-client-id.js</code> and deploy the site to its HTTPS address. The file is separate on purpose — the client ID is public, but never put a client secret in a static site.</p><div class="row" style="gap:6px"><span class="badge">Client ID</span><code>' + esc(cfg.googleClientId || 'not set') + '</code></div></div>') +
      '<p class="oauth-note">MegaLab has no demo workspace. Sign in with Google to create your private local workspace.</p>' +
      '<div class="trust-row"><span>' + icon('shield') + ' No ad tracking</span><span>' + icon('download') + ' Export anytime</span><span>' + icon('wifi-off') + ' Works offline</span></div>';
    openModal(modalShell({ title: 'Sign in', sub: 'Continue with your Google account.', body: body }));
  }

  function startGoogleSignIn() {
    if (!ML.auth.isConfigured()) {
      openSignInModal('Google Sign-In needs a valid OAuth client ID in google-client-id.js.');
      return;
    }
    if (location.protocol === 'file:') {
      openSignInModal('Google Sign-In needs the hosted http(s) address. Open MegaLab from its deployment URL, not from a local file.');
      return;
    }
    toast('Opening Google Sign-In…', 'warm');
    ML.auth.signInGoogle().then(function (user) {
      closeModal();
      enterApp(user);
      toast('Welcome, ' + firstWord(user.name) + '.', 'ok');
    }).catch(function (err) {
      var msg = err && err.message ? err.message : 'Sign-in failed.';
      if (err && (err.code === 'not_configured' || err.code === 'insecure')) openSignInModal(msg);
      else {
        var box = el('signin-error');
        if (box) { box.textContent = msg; box.hidden = false; }
        toast(msg, 'bad');
      }
    });
  }

  function openCourseModal() {
    var body = '<form class="form-stack" data-form="create-course">' +
      '<label class="field"><span class="label">What do you want to be able to do? <span class="hint">be concrete</span></span><input class="input" name="topic" placeholder="e.g. Analyse a messy dataset with pandas" maxlength="140" required><span class="help">An outcome beats a subject. “Build a REST API” is better than “learn backend”.</span></label>' +
      '<div class="chip-row"><button class="chip" type="button" data-act="course-topic" data-topic="Python for data analysis">Python for data analysis</button><button class="chip" type="button" data-act="course-topic" data-topic="Build a REST API with Node.js">REST API with Node</button><button class="chip" type="button" data-act="course-topic" data-topic="Spanish conversation for travel">Spanish for travel</button><button class="chip" type="button" data-act="course-topic" data-topic="Linear algebra for machine learning">Linear algebra for ML</button></div>' +
      '<div class="form-row"><label class="field"><span class="label">Field</span><select class="select" name="field">' + D.FIELDS.map(function (f) { return '<option>' + esc(f.name) + '</option>'; }).join('') + '</select></label><label class="field"><span class="label">Level</span><select class="select" name="level">' + D.LEVELS.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="form-row"><label class="field"><span class="label">Course length</span><select class="select" name="days">' + D.DAYS.map(function (d) { return '<option value="' + d + '"' + (d === 14 ? ' selected' : '') + '>' + d + ' days</option>'; }).join('') + '</select></label><label class="field"><span class="label">Daily time</span><select class="select" name="mins">' + D.MINUTES.map(function (m) { return '<option value="' + m + '"' + (m === 30 ? ' selected' : '') + '>' + m + ' min/day</option>'; }).join('') + '</select></label></div>' +
      '<p class="oauth-note">MegaLab will sequence the days from fundamentals to a small final project. You can rebuild the plan later.</p>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" data-act="modal-close">Cancel</button><button class="btn btn-primary" type="submit">' + icon('wand') + ' Build my course</button></div></form>';
    openModal(modalShell({ title: 'Build a course', sub: 'One outcome. A daily path that fits real life.', wide: true, body: body }));
  }

  function upgradeCoursePlan(course, preserve) {
    ML.ai.plan(course).then(function (result) {
      var current = ML.store.findCourse(course.id);
      if (!current || !result || !result.plan || !result.plan.length) return;
      if (preserve) {
        result.plan.forEach(function (l, i) {
          var old = current.plan[i];
          l.done = old && old.done ? old.done : 0;
          l.completedAt = old && old.done ? old.completedAt : null;
          if (old && old.body) l.body = old.body;
        });
      }
      current.plan = result.plan;
      ML.store.save();
      checkAchievements();
      var r = routeInfo();
      if ((r[0] === 'course' && r[1] === course.id) || r[0] === 'dashboard') render();
      toast(result.ai ? 'AI finished your plan.' : 'Your starter plan is ready.', 'ok');
    }).catch(function () {
      toast('Plan could not be generated. The outline is still usable.', 'warm');
    });
  }

  function openNoteModal(note, context) {
    var state = ML.store.get();
    context = context || {};
    var editing = note && note.id;
    var courseId = editing ? note.courseId : (context.courseId || (ML.store.activeCourse() ? ML.store.activeCourse().id : ''));
    var lessonIndex = editing ? note.lessonIndex : (typeof context.lessonIndex === 'number' ? context.lessonIndex : '');
    var body = '<form class="form-stack" data-form="note-save">' +
      '<input type="hidden" name="id" value="' + esc(editing ? note.id : '') + '">' +
      '<input type="hidden" name="courseId" value="' + esc(courseId || '') + '">' +
      '<input type="hidden" name="lessonIndex" value="' + esc(lessonIndex === null || lessonIndex === undefined ? '' : lessonIndex) + '">' +
      '<label class="field"><span class="label">Title</span><input class="input" name="title" value="' + esc(editing ? note.title : '') + '" placeholder="Name the idea, not the lesson" maxlength="140" required></label>' +
      '<label class="field"><span class="label">Note <span class="hint">markdown supported</span></span><textarea class="textarea" name="body" rows="10" placeholder="Write it in your own words. What clicked? What is still fuzzy?" maxlength="20000">' + esc(editing ? note.body : '') + '</textarea></label>' +
      '<div class="row" style="justify-content:space-between"><span class="oauth-note">' + (courseId ? 'Linked to ' + esc((ML.store.findCourse(courseId) || {}).topic || 'course') : 'General note') + '</span><div class="row"><button class="btn btn-ghost" type="button" data-act="modal-close">Cancel</button><button class="btn btn-primary" type="submit">' + icon('save') + (editing ? ' Save note' : ' Add note') + '</button></div></div></form>';
    openModal(modalShell({ title: editing ? 'Edit note' : 'New note', sub: 'Compress the idea. If you cannot compress it, you do not own it yet.', wide: true, body: body }));
  }

  function openCardModal() {
    var course = ML.store.activeCourse();
    var body = '<form class="form-stack" data-form="add-card">' +
      '<label class="field"><span class="label">Prompt / question</span><input class="input" name="front" placeholder="What does the central idea actually change?" maxlength="500" required></label>' +
      '<label class="field"><span class="label">Answer</span><textarea class="textarea" name="back" rows="4" placeholder="Short, specific, in your own words." maxlength="1000" required></textarea></label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" type="button" data-act="modal-close">Cancel</button><button class="btn btn-primary" type="submit">' + icon('plus') + ' Add card</button></div></form>';
    openModal(modalShell({ title: 'Add a flashcard', sub: course ? 'Will join ' + course.topic : 'A general card', body: body }));
  }

  function findNote(id) {
    return ML.store.get().notes.filter(function (n) { return n.id === id; })[0] || null;
  }

  function cardFromNote(note) {
    var front = String(note.title || '').trim();
    var back = String(note.body || '').trim();
    if (!front || !back) { toast('Add a title and some note text first.', 'warm'); return; }
    var compact = back.replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 900);
    var added = ML.store.addCards([{ f: front, b: compact }], note.courseId || null);
    if (!added) { toast('Could not make a card from this note.', 'bad'); return; }
    checkAchievements();
    startCardsQueue();
    toast('Flashcard created from the note.', 'ok');
    render();
  }

  /* ---------------- Classroom ingest + game runtime helpers ---------------- */

  function topicFromSource(source) {
    return String(source && source.name || 'Class notes').replace(/\.(pdf|pptx|docx|xlsx|txt|md|csv|html?|rtf)$/i, '').trim();
  }

  async function readDriveSource(fileId, fileName, mimeType, courseId, courseName) {
    var result = await ML.classroom.processPDFFromDrive(fileId, fileName, mimeType);
    if (!result || !result.text || result.text.replace(/\s/g, '').length < 40) {
      throw new Error((result && result.error) || 'No readable text found. The file may be scanned or image-only.');
    }
    return ML.store.addSource({
      id: 'drive:' + fileId,
      name: fileName || result.name || 'Class file',
      kind: result.kind || ML.docs.kindFor(fileName || '', mimeType || ''),
      mimeType: mimeType || result.mime || '',
      text: result.text,
      method: result.method || 'drive',
      courseId: courseId || null,
      courseName: courseName || ''
    });
  }

  async function buildPackFromSource(source, options) {
    options = options || {};
    if (!source || !source.text) { toast('That source has no readable text.', 'bad'); return null; }
    var topic = topicFromSource(source);
    try {
      var useAI = options.useAI !== false;
      var games = await ML.games.generateGames(source.text, topic, { sourceId: source.id, sourceName: source.name, useAI: useAI });
      var questions = await ML.games.generateQuestions(source.text, topic, { sourceId: source.id, sourceName: source.name, count: 12, useAI: useAI });
      var cards = await ML.games.generateCards(source.text, topic, { sourceId: source.id, sourceName: source.name, count: 12, useAI: useAI });
      var addedGames = ML.store.addGames(games);
      var addedQuestions = ML.store.addQuestions(questions, { id: source.id, name: source.name });
      var addedCards = ML.store.addCards(cards, source.courseId || null);
      if (!options.quiet) {
        toast(addedGames + ' games · ' + addedQuestions + ' questions · ' + addedCards + ' cards', 'ok', 'Pack ready');
      }
      if (options.navigate) navigate('classroom-games');
      else if (options.render !== false) render();
      return { games: games, questions: questions, cards: cards, addedGames: addedGames, addedQuestions: addedQuestions, addedCards: addedCards };
    } catch (e) {
      toast(e && e.message ? e.message : 'Could not build a pack from these notes.', 'bad');
      return null;
    }
  }

  async function buildQuestionsFromSource(source) {
    if (!source || !source.text) { toast('That source has no readable text.', 'bad'); return 0; }
    try {
      var questions = await ML.games.generateQuestions(source.text, topicFromSource(source), { sourceId: source.id, sourceName: source.name, count: 12, useAI: true });
      var added = ML.store.addQuestions(questions, { id: source.id, name: source.name });
      toast(added + ' practice questions ready.', 'ok');
      navigate('classroom-questions');
      return added;
    } catch (e) {
      toast(e && e.message ? e.message : 'Could not generate questions.', 'bad');
      return 0;
    }
  }

  async function makeCardsFromSource(source) {
    if (!source || !source.text) { toast('That source has no readable text.', 'bad'); return 0; }
    try {
      var cards = await ML.games.generateCards(source.text, topicFromSource(source), { sourceId: source.id, sourceName: source.name, count: 14, useAI: true });
      var added = ML.store.addCards(cards, source.courseId || null);
      checkAchievements();
      startCardsQueue();
      toast(added + ' flashcards added to the queue.', 'ok');
      render();
      return added;
    } catch (e) {
      toast(e && e.message ? e.message : 'Could not generate cards.', 'bad');
      return 0;
    }
  }

  async function ingestFiles(fileList, courseId, courseName) {
    var list = Array.prototype.slice.call(fileList || []);
    if (!list.length) return;
    toast('Reading ' + list.length + ' file' + (list.length === 1 ? '' : 's') + ' in your browser…', 'warm');
    var added = 0;
    var failed = 0;
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      try {
        var result = await ML.docs.extractFile(file);
        if (!result.text || result.text.replace(/\s/g, '').length < 40) throw new Error('No readable text. Scanned PDFs need OCR first.');
        var source = ML.store.addSource({
          name: file.name,
          kind: result.kind,
          mimeType: file.type,
          text: result.text,
          method: result.method || 'upload',
          courseId: courseId || null,
          courseName: courseName || ''
        });
        added++;
        if (list.length <= 2) await buildPackFromSource(source, { quiet: true });
      } catch (e) {
        failed++;
        toast(file.name + ': ' + (e && e.message ? e.message : 'could not be read.'), 'bad');
      }
    }
    if (added) {
      toast(added + ' source' + (added === 1 ? '' : 's') + ' added' + (failed ? ' · ' + failed + ' failed' : '') + '.', failed ? 'warm' : 'ok');
      render();
    } else if (failed) {
      toast('No files could be read. Try a text-based PDF, Office file, or paste the notes.', 'bad');
    }
  }

  function finishGame(run, score, total, meta) {
    if (!run) return null;
    if (run.getAttribute('data-finished') === '1') {
      toast('This run is already scored. Use Play again to reset it.', 'warm');
      return null;
    }
    run.setAttribute('data-finished', '1');
    total = Math.max(1, Number(total) || 1);
    score = Math.max(0, Math.min(total, Number(score) || 0));
    var id = run.getAttribute('data-game-id');
    var result = ML.store.recordGame(id, score, total, meta || null);
    if (result.achievements && result.achievements.length) generateAchievementToasts(result.achievements);
    var box = run.querySelector('#game-result');
    if (box) {
      box.hidden = false;
      box.innerHTML = '<div class="game-score"><div class="score">' + score + '<small>/' + total + '</small></div><h3>' + (result.pct === 100 ? 'Perfect run' : result.pct >= 60 ? 'Solid recall' : 'Useful gaps found') + '</h3><p class="muted">' + (result.pct === 100 ? 'That is what real retrieval looks like.' : result.pct >= 60 ? 'The misses are your next study targets.' : 'Revisit the notes, then run it again.') + '</p><div class="chip-row"><span class="chip">' + icon('zap') + ' +' + result.xp + ' XP</span><span class="chip">' + icon('target') + ' ' + result.pct + '%</span><span class="chip">' + icon('trophy') + ' ' + result.score + '/' + result.total + '</span></div><div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn-outline" data-nav="classroom-games">' + icon('arrow-left') + ' Game library</button><button class="btn btn-primary" data-act="replay-game">' + icon('rotate') + ' Play again</button></div></div>';
      try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    toast(result.xp + ' XP earned · ' + result.pct + '%', result.pct >= 60 ? 'ok' : 'warm', 'Game complete');
    return result;
  }

  function executeInSandbox(code) {
    return new Promise(function (resolve) {
      var source = [
        'self.onmessage = function (event) {',
        '  var out = [];',
        '  function fmt(v) { if (typeof v === "string") return v; try { return JSON.stringify(v); } catch (e) { return String(v); } }',
        '  function add(level, args) { out.push({ level: level, text: Array.prototype.map.call(args, fmt).join(" ") }); }',
        '  console.log = function () { add("log", arguments); };',
        '  console.warn = function () { add("warn", arguments); };',
        '  console.error = function () { add("err", arguments); };',
        '  try {',
        '    var fn = new Function(event.data);',
        '    var result = fn();',
        '    if (result !== undefined) out.push({ level: "log", text: "=> " + fmt(result) });',
        '    self.postMessage({ ok: true, lines: out });',
        '  } catch (e) {',
        '    out.push({ level: "err", text: (e && e.stack) ? e.stack : String(e) });',
        '    self.postMessage({ ok: false, lines: out });',
        '  }',
        '};'
      ].join('\n');
      var url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
      var worker = new Worker(url);
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        try { worker.terminate(); } catch (e) {}
        URL.revokeObjectURL(url);
        resolve({ ok: false, lines: [{ level: 'err', text: 'Execution timed out after 3 seconds. Check for an infinite loop.' }] });
      }, 3000);
      worker.onmessage = function (ev) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { worker.terminate(); } catch (e) {}
        URL.revokeObjectURL(url);
        resolve(ev.data || { ok: false, lines: [] });
      };
      worker.onerror = function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { worker.terminate(); } catch (e) {}
        URL.revokeObjectURL(url);
        resolve({ ok: false, lines: [{ level: 'err', text: err.message || 'Worker error.' }] });
      };
      worker.postMessage(String(code || ''));
    });
  }

  function flashcardState(run) {
    var id = run.getAttribute('data-game-id');
    var data = run.querySelector('.fr-data');
    var cards = [];
    try { cards = JSON.parse(data ? data.getAttribute('data-cards') : '[]'); } catch (e) { cards = []; }
    if (!ML.session.flashRace || ML.session.flashRace.gameId !== id) {
      ML.session.flashRace = { gameId: id, i: 0, good: 0, total: cards.length, cards: cards };
    }
    return ML.session.flashRace;
  }

  function paintFlashcard(run) {
    var fr = flashcardState(run);
    var card = fr.cards[fr.i] || { q: 'No card', a: '' };
    var qel = run.querySelector('#fr-question');
    var ael = run.querySelector('#fr-answer');
    var cur = run.querySelector('#fr-current');
    var back = run.querySelector('.fr-back');
    var front = run.querySelector('.fr-front');
    if (qel) qel.textContent = card.q;
    if (ael) ael.textContent = card.a;
    if (cur) cur.textContent = String(Math.min(fr.i + 1, fr.total));
    if (back) back.hidden = true;
    if (front) front.hidden = false;
  }

  function initFlashcardRace() {
    var run = $('.game-run[data-game-type="flashcard_race"]');
    if (!run) return;
    paintFlashcard(run);
  }

  function mlMatchState(run) {
    var id = run.getAttribute('data-game-id');
    if (!ML.session.matchPairs || ML.session.matchPairs.gameId !== id) {
      ML.session.matchPairs = { gameId: id, left: null, right: null, matched: {} };
    }
    return ML.session.matchPairs;
  }

  function gameQuestionById(id) {
    var c = ML.store.ensureClassroom();
    for (var i = 0; i < c.generatedQuestions.length; i++) if (c.generatedQuestions[i].id === id) return c.generatedQuestions[i];
    return null;
  }

  function normalizeAnswer(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  function answersMatch(given, expected) {
    var a = normalizeAnswer(given);
    var b = normalizeAnswer(expected);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.replace(/\s/g, '') === b.replace(/\s/g, '')) return true;
    if (Math.abs(a.length - b.length) > 2) return false;
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var cur = [i];
      for (var k = 1; k <= b.length; k++) {
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1));
      }
      prev = cur;
    }
    var distance = prev[b.length];
    return b.length >= 6 ? distance <= 1 : distance === 0;
  }

  function syncedFileInfo(fileId) {
    var c = ML.store.ensureClassroom();
    var list = c.syncedContent || [];
    for (var i = 0; i < list.length; i++) {
      var files = list[i].files || [];
      for (var j = 0; j < files.length; j++) {
        if (files[j].id === fileId) return { file: files[j], courseId: list[i].courseId, courseName: list[i].courseName };
      }
    }
    return null;
  }

  function runAction(act, node) {
    var state = ML.store.get();
    var course = ML.store.activeCourse();
    /* ---- Classroom + Drive actions ---- */
    if (act === 'connect-classroom') {
      if (!ML.auth.isConfigured()) { toast('Add an OAuth client ID in google-client-id.js first.', 'bad'); return; }
      var ccOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Connecting…';
      ML.auth.connect().then(function () {
        ML.store.setSettings({ driveSync: true });
        ML.store.save();
        toast('Google connected. Syncing your classes…', 'warm');
        return ML.classroom.syncAllClassroomContent(function (p) {
          node.innerHTML = icon('spinner') + ' ' + p.percent + '% · ' + p.message;
        });
      }).then(function (result) {
        ML.store.setClassroom(result);
        render();
        var stats = result.stats || {};
        toast((stats.classes || 0) + ' classes · ' + (stats.studyFiles || 0) + ' study files synced.', 'ok', 'Classroom ready');
      }).catch(function (err) {
        var msg = err && err.message ? err.message : 'Could not connect Google Classroom.';
        toast(msg, err && err.code === 'needs_consent' ? 'warm' : 'bad');
        node.disabled = false;
        node.innerHTML = ccOriginal;
      });
      return;
    }
    if (act === 'sync-classroom') {
      var scOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Syncing…';
      ML.classroom.syncAllClassroomContent(function (p) {
        node.innerHTML = icon('spinner') + ' ' + p.percent + '% · ' + p.message;
      }).then(function (result) {
        ML.store.setClassroom(result);
        render();
        var s = result.stats || {};
        toast((s.classes || 0) + ' classes · ' + (s.studyFiles || 0) + ' study files.', 'ok', 'Sync complete');
        if (result.errors && result.errors.length) toast(result.errors.length + ' class(es) could not be synced.', 'warm');
      }).catch(function (err) {
        var msg = err && err.message ? err.message : 'Classroom sync failed.';
        toast(msg, 'bad');
        node.disabled = false;
        node.innerHTML = scOriginal;
      });
      return;
    }
    if (act === 'disconnect-classroom') {
      confirmDialog({ title: 'Disconnect Google?', message: 'MegaLab will forget the Google session for this tab. Sources, games and questions already saved on this device stay.', confirmLabel: 'Disconnect', danger: true, onConfirm: function () {
        if (ML.auth.disconnectGoogle) ML.auth.disconnectGoogle();
        ML.auth.updateUser({ classroomConnected: false, driveConnected: false, connectedScopes: '' });
        ML.store.setSettings({ driveSync: false });
        var c = ML.store.ensureClassroom();
        c.courses = [];
        c.syncedContent = [];
        c.lastSync = null;
        ML.store.save();
        render();
        toast('Google disconnected. Local notes are still available.', 'ok');
      } });
      return;
    }
    if (act === 'sync-one-course') {
      var oneId = node.getAttribute('data-course-id');
      var oneOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Re-syncing…';
      ML.classroom.syncOneCourse(oneId).then(function (entry) {
        var cc = ML.store.ensureClassroom();
        cc.syncedContent = (cc.syncedContent || []).filter(function (x) { return x.courseId !== oneId; });
        cc.syncedContent.push(entry);
        if (entry.courseName && !(cc.courses || []).some(function (x) { return x.id === oneId; })) {
          cc.courses = (cc.courses || []).concat([{ id: oneId, name: entry.courseName, section: entry.courseSection, courseState: entry.courseState, alternateLink: entry.alternateLink }]);
        }
        cc.lastSync = entry.syncedAt || new Date().toISOString();
        ML.store.save();
        render();
        toast((entry.files || []).length + ' materials · ' + (entry.studyFiles || []).length + ' study files.', 'ok', 'Class re-synced');
      }).catch(function (err) {
        toast(err && err.message ? err.message : 'Could not re-sync this class.', 'bad');
        node.disabled = false;
        node.innerHTML = oneOriginal;
      });
      return;
    }
    if (act === 'generate-games-from-course') {
      var packCourseId = node.getAttribute('data-course-id');
      var packEntry = (ML.store.ensureClassroom().syncedContent || []).filter(function (x) { return x.courseId === packCourseId; })[0];
      if (!packEntry) { toast('Sync this class before building packs.', 'warm'); return; }
      var packFiles = (packEntry.files || []).filter(function (f) { return f.study; }).slice(0, 8);
      if (!packFiles.length) { toast('No readable study documents in this class yet.', 'warm'); return; }
      var packOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Building 0/' + packFiles.length + '…';
      (async function () {
        var built = 0;
        var failed = 0;
        for (var i = 0; i < packFiles.length; i++) {
          var f = packFiles[i];
          node.innerHTML = icon('spinner') + ' Building ' + (i + 1) + '/' + packFiles.length + '…';
          try {
            var source = await readDriveSource(f.id, f.name, f.mimeType, packCourseId, packEntry.courseName);
            var pack = await buildPackFromSource(source, { quiet: true, useAI: false, render: false });
            if (pack && pack.addedGames) built++;
            else failed++;
          } catch (e) {
            failed++;
          }
        }
        render();
        if (built) {
          toast(built + ' pack' + (built === 1 ? '' : 's') + ' built' + (failed ? ' · ' + failed + ' skipped' : '') + '.', 'ok');
          navigate('classroom-games');
        } else {
          toast('No packs could be built. The files may be scans or image-only.', 'bad');
        }
      })();
      return;
    }
    if (act === 'convert-to-game') {
      var gFileId = node.getAttribute('data-file-id');
      var gFileName = node.getAttribute('data-file-name') || 'Class file';
      var gInfo = syncedFileInfo(gFileId);
      var gCourseId = node.getAttribute('data-course-id') || (gInfo && gInfo.courseId) || null;
      var gCourseName = node.getAttribute('data-course-name') || (gInfo && gInfo.courseName) || '';
      if (!gFileId) { toast('Missing Drive file ID.', 'bad'); return; }
      var gOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Reading…';
      readDriveSource(gFileId, gFileName, gInfo && gInfo.file ? gInfo.file.mimeType : '', gCourseId, gCourseName)
        .then(function (source) { return buildPackFromSource(source, { navigate: true }); })
        .catch(function (err) {
          toast(err && err.message ? err.message : 'Could not read that file.', 'bad');
          node.disabled = false;
          node.innerHTML = gOriginal;
        });
      return;
    }
    if (act === 'generate-questions') {
      var qFileId = node.getAttribute('data-file-id');
      var qFileName = node.getAttribute('data-file-name') || 'Class file';
      var qInfo = syncedFileInfo(qFileId);
      var qCourseId = node.getAttribute('data-course-id') || (qInfo && qInfo.courseId) || null;
      var qCourseName = node.getAttribute('data-course-name') || (qInfo && qInfo.courseName) || '';
      if (!qFileId) { toast('Missing Drive file ID.', 'bad'); return; }
      var qOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Reading…';
      readDriveSource(qFileId, qFileName, qInfo && qInfo.file ? qInfo.file.mimeType : '', qCourseId, qCourseName)
        .then(buildQuestionsFromSource)
        .catch(function (err) {
          toast(err && err.message ? err.message : 'Could not generate questions.', 'bad');
          node.disabled = false;
          node.innerHTML = qOriginal;
        });
      return;
    }
    if (act === 'import-drive-source') {
      var iFileId = node.getAttribute('data-file-id');
      var iName = node.getAttribute('data-file-name') || 'Class file';
      var iInfo = syncedFileInfo(iFileId);
      if (!iFileId) { toast('Missing Drive file ID.', 'bad'); return; }
      var iOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Importing…';
      readDriveSource(iFileId, iName, iInfo && iInfo.file ? iInfo.file.mimeType : '', node.getAttribute('data-course-id') || (iInfo && iInfo.courseId) || null, node.getAttribute('data-course-name') || (iInfo && iInfo.courseName) || '')
        .then(function (source) {
          toast(source.chars.toLocaleString() + ' characters saved to your note library.', 'ok');
          render();
        })
        .catch(function (err) {
          toast(err && err.message ? err.message : 'Could not import that file.', 'bad');
          node.disabled = false;
          node.innerHTML = iOriginal;
        });
      return;
    }
    if (act === 'generate-pack') {
      var packSource = ML.store.getSource(node.getAttribute('data-source-id'));
      if (!packSource) { toast('That source is no longer in the library.', 'warm'); return; }
      var spOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Building…';
      buildPackFromSource(packSource).then(function (pack) {
        if (!pack) { node.disabled = false; node.innerHTML = spOriginal; }
      });
      return;
    }
    if (act === 'source-cards') {
      var cardSource = ML.store.getSource(node.getAttribute('data-source-id'));
      if (!cardSource) { toast('That source is no longer in the library.', 'warm'); return; }
      var scOriginal2 = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Cards…';
      makeCardsFromSource(cardSource).then(function () {
        if (!node.isConnected) return;
        node.disabled = false;
        node.innerHTML = scOriginal2;
      });
      return;
    }
    if (act === 'delete-source') {
      var delSourceId = node.getAttribute('data-source-id');
      var delSource = ML.store.getSource(delSourceId);
      confirmDialog({ title: 'Remove this note source?', message: (delSource ? '“' + delSource.name + '”' : 'This source') + ' will be removed. Games and questions already generated from it stay until you clear them.', confirmLabel: 'Remove source', danger: true, onConfirm: function () {
        ML.store.removeSource(delSourceId);
        render();
        toast('Source removed.', 'ok');
      } });
      return;
    }
    if (act === 'clear-games') {
      confirmDialog({ title: 'Clear all generated content?', message: 'This removes every generated game, practice question and game result. Your note sources, cards and courses stay.', confirmLabel: 'Clear all', danger: true, onConfirm: function () {
        ML.store.clearGenerated();
        render();
        toast('Generated games and questions cleared.', 'ok');
      } });
      return;
    }
    if (act === 'connect-drive') {
      var cdOriginal = node.innerHTML;
      node.disabled = true;
      node.innerHTML = icon('spinner') + ' Connecting…';
      ML.store.connectDrive().then(function () {
        ML.auth.updateUser({ driveConnected: true });
        toast('Google Drive connected. Workspace sync is on.', 'ok');
        render();
      }).catch(function (err) {
        toast(err && err.message ? err.message : 'Could not connect Google Drive.', 'bad');
        node.disabled = false;
        node.innerHTML = cdOriginal;
      });
      return;
    }
    if (act === 'pull-drive') {
      confirmDialog({ title: 'Pull the Drive snapshot?', message: 'This replaces the local workspace with the newest copy in your Google Drive. Export a local backup first if you are unsure.', confirmLabel: 'Pull from Drive', danger: true, onConfirm: function () {
        toast('Pulling your Drive workspace…', 'warm');
        ML.store.pullFromDrive().then(function (result) {
          if (result.status === 'synced') {
            ML.session = {};
            render();
            toast('Workspace restored from Google Drive.', 'ok');
          } else if (result.status === 'empty') {
            toast('No Drive snapshot exists yet. Use Sync now to create one.', 'warm');
          } else {
            toast('Drive access needs reconnecting first.', 'warm');
          }
        }).catch(function (err) {
          toast(err && err.message ? err.message : 'Could not pull from Google Drive.', 'bad');
        });
      } });
      return;
    }

    if (act === 'modal-close') { closeModal(); return; }
    if (act === 'confirm-yes') {
      var cb = pendingConfirm;
      closeModal();
      if (cb) cb();
      return;
    }
    if (act === 'google-signin-modal') { startGoogleSignIn(); return; }
    if (act === 'open-signin') { openSignInModal(''); return; }
    if (act === 'sign-out') {
      ML.auth.signOut();
      ML.session = {};
      closeModal();
      closeMenu();
      location.hash = '#/';
      showLanding();
      toast('Signed out. Your local learning data is still here.', 'ok');
      return;
    }
    if (act === 'toggle-sidebar') { openSidebar(); return; }
    if (act === 'close-sidebar') { closeSidebar(); return; }
    if (act === 'avatar-menu') { openAvatarMenu(node); return; }
    if (act === 'toggle-theme') { toggleTheme(); return; }
    if (act === 'theme-set') { setTheme(node.getAttribute('data-theme')); return; }
    if (act === 'open-palette') { openPalette(); return; }
    if (act === 'notifications') { openNotifications(); return; }
    if (act === 'new-course') { openCourseModal(); return; }
    if (act === 'course-topic') {
      var topicInput = $('input[name="topic"]');
      if (topicInput) topicInput.value = node.getAttribute('data-topic') || '';
      return;
    }
    if (act === 'export-data') { exportWorkspace(); return; }
    if (act === 'sync-now') {
      ML.store.pushToDrive().then(function (ok) { toast(ok ? 'Workspace synced to Google Drive.' : 'Drive sync not available.', ok ? 'ok' : 'warm'); });
      return;
    }
    if (act === 'reset-workspace') {
      confirmDialog({ title: 'Reset this workspace?', message: 'Courses, lessons, cards, notes, focus history and achievements on this device will be removed. Your sign-in stays.', confirmLabel: 'Reset workspace', danger: true, onConfirm: function () {
        ML.store.resetWorkspace();
        ML.session = {};
        navigate('dashboard');
        toast('Workspace reset.', 'ok');
      } });
      return;
    }
    if (act === 'delete-account') {
      confirmDialog({ title: 'Delete account data?', message: 'This removes the entire workspace from this device, deletes the Drive snapshot if Drive was connected, then signs you out. It cannot be undone.', confirmLabel: 'Delete everything', danger: true, onConfirm: function () {
        ML.store.deleteAccount();
        ML.auth.signOut();
        ML.session = {};
        closeMenu();
        location.hash = '#/';
        showLanding();
        toast('Workspace deleted.', 'ok');
      } });
      return;
    }
    if (act === 'avatar-upload') { var af = el('avatar-file'); if (af) af.click(); return; }
    if (act === 'copy-chat') {
      var i = Number(node.getAttribute('data-i'));
      var list = ML.store.get().chat.filter(function (m) { return !course || !m.courseId || m.courseId === course.id; }).slice(-80);
      if (list[i]) copyText(list[i].content);
      return;
    }
    if (act === 'clear-chat') {
      confirmDialog({ title: 'Clear this chat?', message: 'The mentor conversation for the active course will be removed. Your notes and cards stay.', confirmLabel: 'Clear chat', onConfirm: function () {
        ML.store.clearChat(course ? course.id : null);
        render();
        toast('Chat cleared.', 'ok');
      } });
      return;
    }
    if (act === 'chat-suggest') {
      var text = node.getAttribute('data-text') || '';
      sendChat(text);
      return;
    }
    if (act === 'ask-lesson' || act === 'ask-course') {
      var r = routeInfo();
      var c2 = ML.store.activeCourse();
      var i2 = Number(node.getAttribute('data-index'));
      var lesson = c2 && !isNaN(i2) && c2.plan[i2] ? c2.plan[i2] : null;
      ML.session.chatDraft = lesson
        ? 'I am on Day ' + (i2 + 1) + ' (“' + lesson.title + '”). The part I cannot explain yet is: '
        : 'Help me connect the course material to a real project. My current gap is: ';
      if (r[0] === 'lesson' || act === 'ask-lesson') navigate('mentor');
      else navigate('mentor');
      setTimeout(function () { var ta = el('chat-input'); if (ta) { ta.value = ML.session.chatDraft || ''; autoGrow(ta); ta.focus(); } }, 80);
      return;
    }
    if (act === 'lesson-complete') {
      var idxC = Number(node.getAttribute('data-index'));
      if (!course || !course.plan[idxC]) return;
      var wasDone = !!course.plan[idxC].done;
      ML.store.markLesson(course.id, idxC);
      checkAchievements();
      toast(wasDone ? 'Lesson marked not done.' : 'Lesson complete · +50 XP', wasDone ? 'warm' : 'ok');
      render();
      return;
    }
    if (act === 'lesson-note') {
      openNoteModal(null, { courseId: course ? course.id : null, lessonIndex: Number(node.getAttribute('data-index')) });
      return;
    }
    if (act === 'lesson-cards') {
      makeCardsForLesson(Number(node.getAttribute('data-index')));
      return;
    }
    if (act === 'lesson-quiz') { openQuiz(Number(node.getAttribute('data-index'))); return; }
    if (act === 'lesson-regen') {
      var ir = Number(node.getAttribute('data-index'));
      if (!course || !course.plan[ir]) return;
      course.plan[ir].body = '';
      ML.store.save();
      render();
      toast('Rewriting the lesson. Streaming now.', 'ok');
      return;
    }
    if (act === 'lesson-ask') {
      var ia = Number(node.getAttribute('data-index'));
      var la = course && course.plan[ia];
      ML.session.chatDraft = la ? 'I am on Day ' + (ia + 1) + ' (“' + la.title + '”). Please check my understanding: ' : '';
      navigate('mentor');
      setTimeout(function () { var ta = el('chat-input'); if (ta) { ta.value = ML.session.chatDraft || ''; autoGrow(ta); ta.focus(); } }, 80);
      return;
    }
    if (act === 'lesson-prev') { var lp = Number(node.getAttribute('data-index')) - 1; if (lp >= 0) navigate('lesson/' + course.id + '/' + lp); return; }
    if (act === 'lesson-next') { var ln = Number(node.getAttribute('data-index')) + 1; if (course && ln < course.plan.length) navigate('lesson/' + course.id + '/' + ln); return; }
    if (act === 'delete-course') {
      var did = node.getAttribute('data-id');
      var dc = ML.store.findCourse(did);
      if (!dc) return;
      confirmDialog({ title: 'Delete this course?', message: '“' + dc.topic + '” and its syllabus will be removed. Cards linked to it stay in your deck.', confirmLabel: 'Delete course', danger: true, onConfirm: function () {
        state.courses = state.courses.filter(function (c) { return c.id !== did; });
        if (state.activeCourseId === did) state.activeCourseId = state.courses[0] ? state.courses[0].id : null;
        ML.store.save();
        navigate('courses');
        toast('Course deleted.', 'ok');
      } });
      return;
    }
    if (act === 'rebuild-plan') {
      var idr = node.getAttribute('data-id');
      var rc = ML.store.findCourse(idr);
      if (!rc) return;
      confirmDialog({ title: 'Rebuild this plan?', message: 'MegaLab will ask the AI for a fresh sequence for “' + rc.topic + '”. Completed days are preserved where possible.', confirmLabel: 'Rebuild plan', onConfirm: function () {
        toast('Rebuilding the plan…', 'warm');
        upgradeCoursePlan(rc, true);
      } });
      return;
    }
    if (act === 'card-reveal') { if (ML.session.cards) { ML.session.cards.revealed = true; render(); } return; }
    if (act === 'card-rate') { rateCard(Number(node.getAttribute('data-q'))); return; }
    if (act === 'cards-rebuild') { startCardsQueue(true); toast('Review queue rebuilt.', 'ok'); render(); return; }
    if (act === 'add-card') { openCardModal(); return; }
    if (act === 'focus-mode') {
      var f = focusState();
      if (f.running) { toast('Pause the timer before changing the block.', 'warm'); return; }
      var mins = Number(node.getAttribute('data-min')) || 25;
      f.duration = mins * 60;
      f.remaining = f.duration;
      f.mode = mins === 5 ? 'Break' : mins === 50 ? 'Deep work' : mins === 15 ? 'Short sprint' : 'Pomodoro';
      saveFocus();
      render();
      return;
    }
    if (act === 'focus-toggle') { toggleFocus(); return; }
    if (act === 'focus-reset') { resetFocus(); return; }
    if (act === 'focus-complete') { completeFocusEarly(); return; }
    if (act === 'distraction') {
      var df = focusState();
      df.distractions = (df.distractions || 0) + 1;
      saveFocus();
      toast('Distraction logged: ' + node.getAttribute('data-label') + '. Notice it, return to the task.', 'warm');
      render();
      return;
    }
    if (act === 'task-toggle') {
      ML.store.toggleTask(node.getAttribute('data-id'));
      render();
      return;
    }
    if (act === 'task-delete') {
      ML.store.deleteTask(node.getAttribute('data-id'));
      render();
      return;
    }
    if (act === 'plan-week') { autoPlanWeek(); return; }
    if (act === 'planner-toggle') {
      var dateKey = node.getAttribute('data-date');
      var itemId = node.getAttribute('data-id');
      var items = state.planner[dateKey];
      if (Array.isArray(items)) {
        items.forEach(function (it) { if (it.id === itemId) it.done = !it.done; });
        ML.store.save();
        render();
      }
      return;
    }
    if (act === 'note-new') { openNoteModal(null); return; }
    if (act === 'note-open') {
      var nid = node.getAttribute('data-id');
      var note = findNote(nid);
      if (note) openNoteModal(note);
      return;
    }
    if (act === 'note-cards') {
      var cardNote = findNote(node.getAttribute('data-id'));
      if (cardNote) cardFromNote(cardNote);
      return;
    }
    if (act === 'note-delete') {
      var delId = node.getAttribute('data-id');
      var dn = findNote(delId);
      confirmDialog({ title: 'Delete this note?', message: dn ? '“' + dn.title + '” will be removed.' : 'This note will be removed.', confirmLabel: 'Delete note', danger: true, onConfirm: function () {
        ML.store.deleteNote(delId);
        render();
        toast('Note deleted.', 'ok');
      } });
      return;
    }
    if (act === 'notes-filter') {
      if (!ML.session.notes) ML.session.notes = { query: '', courseId: 'all' };
      ML.session.notes.courseId = node.getAttribute('data-id');
      render();
      return;
    }
    if (act === 'ai-insight') { generateCoachInsight(); return; }
    if (act === 'code-run') { runWorkspaceCode(); return; }
    if (act === 'code-review') { reviewWorkspaceCode(node.getAttribute('data-mode') || 'review'); return; }
    if (act === 'code-clear') {
      if (ML.session.code) { ML.session.code.output = ''; saveCode(); }
      updateTerminal();
      return;
    }
    if (act === 'code-copy') {
      var ta = el('code-input');
      copyText(ta ? ta.value : (ML.session.code ? ML.session.code.code : ''));
      return;
    }
    if (act === 'code-snippet') {
      var si = Number(node.getAttribute('data-i'));
      var snip = D.CODE_SNIPPETS[si];
      if (snip) {
        ML.session.code = ML.session.code || {};
        ML.session.code.code = snip.code;
        ML.session.code.lang = snip.lang || 'javascript';
        ML.session.code.output = '';
        ML.session.code.review = '';
        saveCode();
        render();
        toast('Loaded “' + snip.name + '”.', 'ok');
      }
      return;
    }
    if (act === 'quiz-answer') { answerQuiz(Number(node.getAttribute('data-i'))); return; }
    if (act === 'quiz-next') { nextQuiz(); return; }

    /* ---- Generated game runtime ---- */
    if (act === 'qb-answer') {
      var qbRun = node.closest('.game-run');
      var qbQ = node.closest('.qb-question');
      if (!qbRun || !qbQ || qbQ.getAttribute('data-done') === '1') return;
      var qbChoice = Number(node.getAttribute('data-oi'));
      var qbCorrectChoice = Number(node.getAttribute('data-answer'));
      var qbRight = qbChoice === qbCorrectChoice;
      qbQ.setAttribute('data-done', '1');
      $$('.qb-opt', qbQ).forEach(function (btn) {
        btn.disabled = true;
        var oi = Number(btn.getAttribute('data-oi'));
        if (oi === qbCorrectChoice) btn.classList.add('correct');
        else if (btn === node) btn.classList.add('wrong');
      });
      var qbScore = Number(qbRun.getAttribute('data-score') || 0) + (qbRight ? 1 : 0);
      var qbCombo = qbRight ? Number(qbRun.getAttribute('data-combo') || 0) + 1 : 0;
      qbRun.setAttribute('data-score', qbScore);
      qbRun.setAttribute('data-combo', qbCombo);
      var qbScoreEl = $('.hud-item #game-score', qbRun) || $('#game-score', qbRun);
      var qbComboEl = $('.hud-item #game-combo', qbRun) || $('#game-combo', qbRun);
      if (qbScoreEl) qbScoreEl.textContent = String(qbScore);
      if (qbComboEl) qbComboEl.textContent = String(qbCombo);
      var qbExp = $('.qb-explanation', qbQ);
      if (qbExp) qbExp.hidden = false;
      toast(qbRight ? 'Correct · combo ' + qbCombo : 'Not quite. Read the explanation before moving on.', qbRight ? 'ok' : 'warm');
      return;
    }
    if (act === 'qb-next') {
      var qnRun = node.closest('.game-run');
      if (!qnRun) return;
      var qnQ = node.closest('.qb-question');
      var qnIndex = Number(node.getAttribute('data-qi'));
      var qnAll = $$('.qb-question', qnRun);
      if (qnQ) qnQ.hidden = true;
      if (qnAll[qnIndex + 1]) {
        qnAll[qnIndex + 1].hidden = false;
        var qnIdxEl = $('#game-index', qnRun);
        if (qnIdxEl) qnIdxEl.textContent = String(qnIndex + 2);
        var qnProgress = $('#game-progress', qnRun);
        if (qnProgress) qnProgress.style.width = Math.round((qnIndex + 1) / qnAll.length * 100) + '%';
        try { qnAll[qnIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      } else {
        var qnProgressDone = $('#game-progress', qnRun);
        if (qnProgressDone) qnProgressDone.style.width = '100%';
        finishGame(qnRun, Number(qnRun.getAttribute('data-score') || 0), Number(qnRun.getAttribute('data-total') || qnAll.length), { game: 'quiz_battle' });
      }
      return;
    }
    if (act === 'check-fill-blanks') {
      var fbRun = node.closest('.game-run');
      if (!fbRun) return;
      var fbScore = 0;
      $$('.fb-input', fbRun).forEach(function (input) {
        var fbItem = input.closest('.fb-item');
        var fbFeedback = fbItem ? $('.fb-feedback', fbItem) : null;
        var fbRight = answersMatch(input.value, input.getAttribute('data-answer'));
        if (fbRight) fbScore++;
        input.disabled = true;
        input.classList.toggle('ok', fbRight);
        input.classList.toggle('bad', !fbRight);
        if (fbFeedback) {
          fbFeedback.hidden = false;
          fbFeedback.className = 'fb-feedback ' + (fbRight ? 'ok' : 'bad');
          fbFeedback.textContent = fbRight ? 'Correct' : 'Answer: ' + input.getAttribute('data-answer');
        }
      });
      finishGame(fbRun, fbScore, $$('.fb-input', fbRun).length, { game: 'fill_blanks' });
      return;
    }
    if (act === 'mp-pick') {
      var mpRun = node.closest('.game-run');
      if (!mpRun || node.disabled || node.classList.contains('matched')) return;
      var mpSide = node.getAttribute('data-side');
      var mpKey = node.getAttribute('data-key');
      var mpSel = mlMatchState(mpRun);
      $$('.mp-item.wrong', mpRun).forEach(function (b) { b.classList.remove('wrong'); });
      $$('.mp-item.selected', mpRun).forEach(function (b) { if (b.getAttribute('data-side') === mpSide) b.classList.remove('selected'); });
      node.classList.add('selected');
      mpSel[mpSide] = mpKey;
      if (mpSel.left !== null && mpSel.right !== null) {
        var mpGood = mpSel.left === mpSel.right;
        if (mpGood) {
          $$('.mp-item.selected', mpRun).forEach(function (b) {
            b.classList.remove('selected');
            b.classList.add('matched');
            b.disabled = true;
          });
          mpSel.matched[mpSel.left] = true;
          var mpCount = Object.keys(mpSel.matched).length;
          var mpCountEl = $('#mp-count', mpRun);
          if (mpCountEl) mpCountEl.textContent = String(mpCount);
          var mpTotal = Number(mpRun.getAttribute('data-total') || 0);
          if (mpCount >= mpTotal) {
            finishGame(mpRun, mpCount, mpTotal, { game: 'match_pairs' });
            return;
          }
          toast('Pair matched.', 'ok');
        } else {
          var mpWrong = $$('.mp-item.selected', mpRun);
          mpWrong.forEach(function (b) { b.classList.add('wrong'); });
          setTimeout(function () {
            mpWrong.forEach(function (b) { b.classList.remove('wrong', 'selected'); });
          }, 700);
          toast('Not a pair. Try the meaning again.', 'warm');
        }
        mpSel.left = null;
        mpSel.right = null;
      }
      return;
    }
    if (act === 'tb-up' || act === 'tb-down') {
      var tbItem = node.closest('.tb-item');
      if (!tbItem || !tbItem.parentNode) return;
      if (act === 'tb-up' && tbItem.previousElementSibling) tbItem.parentNode.insertBefore(tbItem, tbItem.previousElementSibling);
      if (act === 'tb-down' && tbItem.nextElementSibling) tbItem.parentNode.insertBefore(tbItem.nextElementSibling, tbItem);
      return;
    }
    if (act === 'check-timeline') {
      var tlRun = node.closest('.game-run');
      if (!tlRun) return;
      var tlItems = $$('.tb-item', tlRun);
      var tlOrder = tlItems.slice().sort(function (a, b) { return Number(a.getAttribute('data-sort')) - Number(b.getAttribute('data-sort')); });
      var tlScore = 0;
      tlItems.forEach(function (item, i) {
        var right = tlOrder[i] && tlOrder[i].getAttribute('data-key') === item.getAttribute('data-key');
        item.classList.toggle('ok', !!right);
        item.classList.toggle('bad', !right);
        if (right) tlScore++;
      });
      finishGame(tlRun, tlScore, tlItems.length, { game: 'timeline_builder' });
      return;
    }
    if (act === 'submit-explanation') {
      var eiRun = node.closest('.game-run');
      var eiLevel = node.closest('.ei-level');
      if (!eiRun || !eiLevel) return;
      var eiInput = $('.ei-input', eiLevel);
      var eiFeedback = $('.ei-feedback', eiLevel);
      var eiText = eiInput ? eiInput.value.trim() : '';
      var eiWords = eiText ? eiText.split(/\s+/).length : 0;
      if (eiWords < 10) {
        if (eiFeedback) {
          eiFeedback.hidden = false;
          eiFeedback.className = 'ei-feedback bad';
          eiFeedback.textContent = eiWords ? 'Too thin. Aim for at least 25 words and one example.' : 'Write an explanation first.';
        }
        if (eiInput) eiInput.focus();
        return;
      }
      var eiPoints = eiWords >= 25 ? 2 : 1;
      eiLevel.setAttribute('data-checked', '1');
      eiLevel.setAttribute('data-points', String(eiPoints));
      if (eiFeedback) {
        eiFeedback.hidden = false;
        eiFeedback.className = 'ei-feedback ' + (eiPoints === 2 ? 'ok' : 'warm');
        eiFeedback.textContent = eiPoints === 2 ? 'Strong explanation. Add an edge case out loud to finish.' : 'Captured the idea. Push to 25+ words with a concrete example.';
      }
      var eiAll = $$('.ei-level', eiRun);
      var eiDone = eiAll.filter(function (l) { return l.getAttribute('data-checked') === '1'; }).length;
      if (eiDone >= eiAll.length) {
        var eiScore = eiAll.reduce(function (n, l) { return n + Number(l.getAttribute('data-points') || 0); }, 0);
        finishGame(eiRun, eiScore, eiAll.length * 2, { game: 'explain_it' });
      } else {
        toast('Level checked · ' + eiDone + '/' + eiAll.length, 'ok');
      }
      return;
    }
    if (act === 'run-cc-code') {
      var ccRun = node.closest('.game-run');
      var ccEditor = $('#challenge-code', ccRun || document);
      var ccOutput = $('#cc-output', ccRun || document);
      if (!ccEditor || !ccOutput) return;
      ccOutput.hidden = false;
      ccOutput.innerHTML = '<div class="term-head">' + icon('terminal', 'ic-sm') + ' Running in a sandbox…</div>';
      node.disabled = true;
      executeInSandbox(ccEditor.value).then(function (result) {
        node.disabled = false;
        var html = '<div class="term-head">' + icon('terminal', 'ic-sm') + ' ' + (result.ok ? 'Exited cleanly' : 'Threw an error') + '</div>';
        (result.lines || []).forEach(function (line) {
          html += '<div class="term-line ' + (line.level || 'log') + '">' + esc(line.text) + '</div>';
        });
        ccOutput.innerHTML = html || '<span class="muted">No output. Log one example so you can prove it ran.</span>';
        if (result.ok && ccRun) finishGame(ccRun, 1, 1, { game: 'code_challenge' });
      });
      return;
    }
    if (act === 'show-cc-hints') {
      var hints = $('.cc-hints', node.closest('.game-run') || document);
      if (hints) hints.hidden = !hints.hidden;
      return;
    }
    if (act === 'review-cc-code') {
      var crRun = node.closest('.game-run');
      var crEditor = $('#challenge-code', crRun || document);
      var crBox = $('#cc-review', crRun || document);
      if (!crEditor || !crBox) return;
      crBox.hidden = false;
      crBox.innerHTML = '<p class="muted">Reading your code…</p>';
      var crCode = crEditor.value;
      node.disabled = true;
      ML.ai.reviewCode(crCode, 'javascript', 'review', function (chunk) {
        crBox.innerHTML = md(chunk);
      }).then(function (result) {
        node.disabled = false;
        crBox.innerHTML = md(result.text || 'No review returned.');
        toast(result.ai ? 'AI review ready.' : 'Local review ready. Connect an AI bridge for deeper feedback.', result.ai ? 'ok' : 'warm');
      }).catch(function () {
        node.disabled = false;
        toast('Could not review that code right now.', 'bad');
      });
      return;
    }
    if (act === 'fr-flip') {
      var frRun = node.closest('.game-run');
      if (!frRun) return;
      var frFront = $('.fr-front', frRun);
      var frBack = $('.fr-back', frRun);
      if (frFront) frFront.hidden = true;
      if (frBack) frBack.hidden = false;
      return;
    }
    if (act === 'fr-rate') {
      var frRun2 = node.closest('.game-run');
      if (!frRun2) return;
      var frBack2 = $('.fr-back', frRun2);
      if (frBack2 && frBack2.hidden) { toast('Flip the card before rating it.', 'warm'); return; }
      var frState = flashcardState(frRun2);
      var quality = Number(node.getAttribute('data-q')) || 0;
      if (quality >= 2) frState.good++;
      frState.i++;
      if (frState.i >= frState.total) {
        finishGame(frRun2, frState.good, frState.total, { game: 'flashcard_race' });
      } else {
        paintFlashcard(frRun2);
      }
      return;
    }
    if (act === 'cm-pick') {
      var cmRun = node.closest('.game-run');
      if (!cmRun) return;
      node.classList.add('seen');
      var cmDetail = $('#cm-detail', cmRun);
      if (cmDetail) {
        cmDetail.innerHTML = '<p class="eyebrow">Concept</p><h3>' + esc(node.getAttribute('data-term')) + '</h3><p>' + esc(node.getAttribute('data-definition') || 'No definition was extracted. Connect it to something you already know.') + '</p><p class="muted">Say the connection out loud, then pick another star.</p>';
      }
      var cmSeen = $$('.cm-node.seen', cmRun).length;
      var cmCountEl = $('#cm-count', cmRun);
      if (cmCountEl) cmCountEl.textContent = String(cmSeen);
      return;
    }
    if (act === 'cm-finish') {
      var cmRun2 = node.closest('.game-run');
      if (!cmRun2) return;
      var cmScore = $$('.cm-node.seen', cmRun2).length;
      finishGame(cmRun2, cmScore, Number(cmRun2.getAttribute('data-total') || cmScore || 1), { game: 'concept_map' });
      return;
    }
    if (act === 'replay-game') {
      ML.session.flashRace = null;
      ML.session.matchPairs = null;
      render();
      return;
    }

    /* ---- Practice questions ---- */
    if (act === 'q-filter') {
      ML.session.qFilter = node.getAttribute('data-src') || 'all';
      render();
      return;
    }
    if (act === 'question-answer') {
      var qCard = node.closest('.question-card');
      if (!qCard || qCard.getAttribute('data-answered') === '1') return;
      var qId = node.getAttribute('data-qid');
      var qChoice = Number(node.getAttribute('data-oi'));
      var qAnswer = Number(node.getAttribute('data-answer'));
      var qRight = qChoice === qAnswer;
      qCard.setAttribute('data-answered', '1');
      $$('.q-opt', qCard).forEach(function (btn) {
        btn.disabled = true;
        var oi = Number(btn.getAttribute('data-oi'));
        if (oi === qAnswer) btn.classList.add('correct');
        else if (btn === node) btn.classList.add('wrong');
      });
      var qExp = $('.q-explanation', qCard);
      if (qExp) qExp.hidden = false;
      toast(qRight ? 'Correct.' : 'Not quite. The explanation is open below.', qRight ? 'ok' : 'warm');
      return;
    }
    if (act === 'question-reveal') {
      var qCard2 = node.closest('.question-card');
      if (!qCard2) return;
      var qExp2 = $('.q-explanation', qCard2);
      if (qExp2) qExp2.hidden = false;
      var qInput = $('.q-answer-input', qCard2);
      if (qInput) qInput.classList.add('revealed');
      toast('Model answer revealed. Compare it to what you wrote.', 'warm');
      return;
    }
    if (act === 'open-question') {
      var oqId = node.getAttribute('data-qid');
      if (oqId) {
        ML.session.qQuery = '';
        ML.session.qFilter = 'all';
        navigate('classroom-questions');
      }
      return;
    }

    if (act === 'palette-go') {
      var pi = Number(node.getAttribute('data-index'));
      runPaletteItem(pi);
      return;
    }
  }

  function rateCard(q) {
    var cs = ML.session.cards;
    if (!cs || cs.revealed === false) return;
    var id = cs.ids[cs.idx];
    if (!id) return;
    ML.store.reviewCard(id, q);
    cs.idx++;
    cs.revealed = false;
    checkAchievements();
    if (cs.idx >= cs.ids.length) toast('Queue complete. Retrieval protects what you built.', 'ok');
    render();
  }

  function openNotifications() {
    var state = ML.store.get();
    var due = ML.store.dueCards().length;
    var open = state.tasks.filter(function (t) { return !t.done; });
    var course = ML.store.activeCourse();
    var nl = course ? ML.ui.nextIndex(course) : -1;
    var body = '<div class="stack">' +
      '<div class="insight-item">' + icon('cards') + '<div><b>' + due + ' cards due</b><br>' + (due ? 'Reviewing first protects what you already learned.' : 'Nothing due. The queue is clear.') + '</div></div>' +
      '<div class="insight-item">' + icon('flame') + '<div><b>' + ML.store.streak() + '-day streak</b><br>' + (state.log[ML.store.todayKey()] ? 'Today already counts.' : 'No study logged today yet.') + '</div></div>' +
      (course && nl !== -1 ? '<div class="insight-item">' + icon('play') + '<div><b>Next: Day ' + (nl + 1) + '</b><br>' + esc(course.plan[nl].title) + '</div></div>' : '') +
      (open.length ? '<div class="insight-item">' + icon('notes') + '<div><b>' + open.length + ' open tasks</b><br>' + esc(open[0].text) + '</div></div>' : '') +
      '</div>';
    openModal(modalShell({ title: 'Notifications', sub: 'The next right thing, not a feed.', body: body, foot: '<button class="btn btn-outline" data-nav="progress">See analytics</button><button class="btn btn-primary" data-nav="' + (due ? 'cards' : course && nl !== -1 ? 'lesson/' + course.id + '/' + nl : 'dashboard') + '">' + (due ? 'Review cards' : 'Continue') + '</button>' }));
  }

  function exportWorkspace() {
    var raw = ML.store.exportData();
    var blob = new Blob([raw], { type: 'application/json' });
    var a = document.createElement('a');
    var name = (ML.auth.user() ? ML.auth.user().name : 'megalab').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.href = URL.createObjectURL(blob);
    a.download = 'megalab-' + name + '-' + ML.store.todayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Backup downloaded.', 'ok');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied.', 'ok'); }, function () { toast('Could not copy.', 'bad'); });
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('Copied.', 'ok');
      } catch (e) { toast('Could not copy.', 'bad'); }
    }
  }

  function resizeAvatar(file) {
    if (!file.type || file.type.indexOf('image/') !== 0) { toast('Choose an image file.', 'bad'); return; }
    if (file.size > 6 * 1024 * 1024) { toast('Image is too large. Use one under 6 MB.', 'bad'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var size = 180;
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        var min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        try {
          var data = canvas.toDataURL('image/jpeg', 0.82);
          ML.auth.updateUser({ picture: data });
          toast('Avatar updated.', 'ok');
          render();
        } catch (e) { toast('Could not process that image.', 'bad'); }
      };
      img.onerror = function () { toast('That image could not be read.', 'bad'); };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  async function generateCoachInsight() {
    var box = el('ai-insight');
    if (!box) return;
    box.innerHTML = '<div class="spinner-wrap"><span class="spinner"></span> Asking the coach…</div>';
    var stats = ML.store.courseStats();
    stats.due = ML.store.dueCards().length;
    stats.streak = ML.store.streak();
    var text = await ML.ai.insight(ML.store.activeCourse(), stats);
    box.innerHTML = '<div class="insight-item">' + icon('sparkles') + '<div><b>Coach insight</b><br>' + esc(text) + '</div></div>';
  }

  function generateAchievementToasts(fresh) {
    if (!fresh || !fresh.length) return;
    fresh.slice(0, 3).forEach(function (a, i) {
      setTimeout(function () {
        toast(a.desc, 'warm', a.name + ' unlocked');
      }, i * 260);
    });
  }

  function checkAchievements() {
    generateAchievementToasts(ML.store.evaluateAchievements());
  }

  /* Flashcards queue */
  function startCardsQueue(all) {
    var cards = all ? ML.store.get().cards : ML.store.dueCards();
    ML.session.cards = { ids: cards.map(function (c) { return c.id; }), idx: 0, revealed: false };
  }

  /* Focus timer */
  function focusClock(totalSeconds) { return ML.views.fmtClock(totalSeconds); }
  function focusState() { return ML.views.focusState(); }
  function focusStorageKey() { return ML.store.key() + ':focus'; }

  function hydrateFocus() {
    var loaded = null;
    try { loaded = JSON.parse(localStorage.getItem(focusStorageKey()) || 'null'); } catch (e) {}
    var f = { duration: 1500, remaining: 1500, running: false, mode: 'Pomodoro', task: '', distractions: 0, endsAt: 0 };
    if (loaded && typeof loaded === 'object') {
      f.duration = clamp(Number(loaded.duration) || 1500, 60, 7200);
      f.mode = String(loaded.mode || 'Pomodoro').slice(0, 40);
      f.task = String(loaded.task || '').slice(0, 200);
      f.distractions = Number(loaded.distractions) || 0;
      f.running = !!loaded.running;
      f.endsAt = Number(loaded.endsAt) || 0;
      if (f.running && f.endsAt) f.remaining = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
      else f.remaining = clamp(Number(loaded.remaining) || f.duration, 0, f.duration);
    }
    ML.session.focus = f;
  }

  function saveFocus() {
    if (!ML.auth.isSignedIn()) return;
    try { localStorage.setItem(focusStorageKey(), JSON.stringify(ML.session.focus || focusState())); } catch (e) {}
  }

  function startFocusTicker() {
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = setInterval(tickFocus, 1000);
  }

  function tickFocus() {
    if (!ML.auth.isSignedIn()) return;
    var f = focusState();
    if (!f.running) return;
    var rem = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
    if (rem !== f.remaining) {
      f.remaining = rem;
      updateFocusDom();
    }
    if (rem <= 0) finishFocus(Math.max(1, Math.round(f.duration / 60)));
  }

  function updateFocusDom() {
    if (!ML.auth.isSignedIn()) return;
    var f = focusState();
    var t = el('timer-text');
    var m = el('timer-mode');
    var fill = el('timer-fill');
    if (t) t.textContent = focusClock(f.remaining);
    if (m) m.textContent = f.mode;
    if (fill) {
      var C = 2 * Math.PI * 118;
      fill.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(1, f.remaining / Math.max(1, f.duration))))).toFixed(2));
    }
  }

  function toggleFocus() {
    var f = focusState();
    if (f.running) {
      f.remaining = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
      f.running = false;
      f.endsAt = 0;
      saveFocus();
      toast('Paused at ' + focusClock(f.remaining) + '.', 'warm');
      render();
      return;
    }
    if (f.remaining <= 0) f.remaining = f.duration;
    f.running = true;
    f.endsAt = Date.now() + f.remaining * 1000;
    saveFocus();
    toast(f.mode + ' started · ' + focusClock(f.remaining), 'ok');
    render();
  }

  function resetFocus() {
    var f = focusState();
    f.running = false;
    f.remaining = f.duration;
    f.endsAt = 0;
    saveFocus();
    render();
    toast('Timer reset.', 'warm');
  }

  function completeFocusEarly() {
    var f = focusState();
    var elapsed = Math.max(0, f.duration - f.remaining);
    if (elapsed < 30) { toast('Start the timer first, or reset it.', 'warm'); return; }
    finishFocus(Math.max(1, Math.round(elapsed / 60)));
  }

  function finishFocus(mins) {
    var f = focusState();
    var isBreak = f.mode === 'Break';
    f.running = false;
    f.remaining = f.duration;
    f.endsAt = 0;
    saveFocus();
    if (!isBreak) {
      var fresh = ML.store.logFocus(mins, f.task || f.mode);
      toast(mins + ' focused minutes logged.', 'ok', 'Focus complete');
      generateAchievementToasts(fresh);
      playChime();
    } else {
      toast('Break over. Pick the next single outcome.', 'ok');
    }
    var route = routeInfo();
    if (route[0] === 'focus' || route[0] === 'dashboard' || route[0] === 'progress') render();
  }

  function playChime() {
    var state = ML.store.get();
    if (!state || !state.settings.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      setTimeout(function () { try { ctx.close(); } catch (e) {} }, 900);
    } catch (e) {}
  }

  /* Chat */
  function sendChat(text) {
    text = String(text || '').trim();
    if (!text) return;
    if (ML.session.chatSending) { toast('The mentor is still answering. Give it a second.', 'warm'); return; }
    var course = ML.store.activeCourse();
    var idx = course ? ML.ui.nextIndex(course) : -1;
    var lessonObj = course && idx !== -1 ? course.plan[idx] : null;
    var cid = course ? course.id : null;
    ML.store.pushChat({ role: 'user', content: text, courseId: cid });
    ML.session.chatSending = true;
    if (routeInfo()[0] === 'mentor') render();
    var stream = el('chat-stream');
    if (stream) {
      stream.innerHTML = '<div class="chat-msg ai" id="chat-live"><span class="av">' + icon('sparkles') + '</span><div><div class="bubble"><div class="md" id="chat-live-md"><span class="chat-typing"><i></i><i></i><i></i></span></div></div><div class="meta"><span>Thinking…</span></div></div></div>';
      var log = el('chat-log');
      if (log) log.scrollTop = log.scrollHeight;
    }
    var messages = ML.store.get().chat.filter(function (m) { return !cid || !m.courseId || m.courseId === cid; });
    ML.ai.mentor(course, messages, lessonObj, function (chunk) {
      var target = el('chat-live-md');
      if (target) {
        target.innerHTML = md(chunk);
        var lg = el('chat-log');
        if (lg) lg.scrollTop = lg.scrollHeight;
      }
    }).then(function (res) {
      ML.session.chatSending = false;
      ML.store.pushChat({ role: 'assistant', content: res.text, courseId: cid });
      ML.store.save();
      if (routeInfo()[0] === 'mentor') render();
      else toast('The mentor replied.', 'ok');
    }).catch(function (err) {
      ML.session.chatSending = false;
      var msg = err && err.message ? err.message : 'The mentor could not answer.';
      ML.store.pushChat({ role: 'assistant', content: msg, courseId: cid });
      if (routeInfo()[0] === 'mentor') render();
      toast(msg, 'bad');
    });
  }

  function makeCardsForLesson(index) {
    var course = ML.store.activeCourse();
    if (!course || !course.plan[index]) return;
    toast('Making cards from this lesson…', 'warm');
    ML.ai.cards(course, index).then(function (cards) {
      var added = ML.store.addCards(cards, course.id);
      checkAchievements();
      startCardsQueue();
      toast(added + ' cards added to the queue.', 'ok');
      render();
    }).catch(function () {
      toast('Could not generate cards. Add one by hand instead.', 'bad');
    });
  }

  /* Lessons */
  function generateLesson(course, index) {
    var key = course.id + ':' + index;
    ML.session.gen = key;
    ML.ai.lesson(course, index, function (text) {
      if (ML.session.gen !== key) return;
      var target = el('lesson-content');
      if (!target) {
        var skel = el('lesson-skeleton');
        if (skel) {
          skel.outerHTML = '<div class="md" id="lesson-content"></div>';
          target = el('lesson-content');
        }
      }
      if (target) target.innerHTML = md(text);
    }).then(function (res) {
      if (ML.session.gen === key) ML.session.gen = null;
      var still = ML.store.findCourse(course.id);
      if (still && still.plan[index] && res && res.text) {
        still.plan[index].body = res.text;
        ML.store.save();
      }
    }).catch(function () {
      var target = el('lesson-content');
      if (target) target.innerHTML = md('## Could not generate this lesson\n\nThe offline tutor could not build the content. Try **Rewrite**, or ask the mentor for a simpler explanation.');
    });
  }

  /* Quiz */
  function openQuiz(index) {
    var course = ML.store.activeCourse();
    if (!course) { toast('Build a course before taking a quiz.', 'warm'); return; }
    var token = Date.now();
    ML.session.quizToken = token;
    openModal(modalShell({ title: 'Quiz me · Day ' + (index + 1), sub: course.topic, wide: true, body: '<div class="spinner-wrap" style="padding:20px 0"><span class="spinner"></span> Building a retrieval quiz…</div>' }));
    ML.ai.quiz(course, index).then(function (questions) {
      if (ML.session.quizToken !== token || !$('#modal-root .modal')) return;
      quiz = { courseId: course.id, index: index, questions: questions, qi: 0, score: 0, answered: false, selected: null, finished: false, recorded: false };
      renderQuiz();
    }).catch(function () {
      if (ML.session.quizToken !== token) return;
      openModal(modalShell({ title: 'Quiz unavailable', body: '<p class="muted">The quiz could not be generated. Try again, or ask the mentor to quiz you in chat.</p>', foot: '<button class="btn btn-primary" data-act="modal-close">Close</button>' }));
    });
  }

  function renderQuiz() {
    if (!quiz) return;
    var total = quiz.questions.length;
    if (!total) { closeModal(); return; }
    if (quiz.finished) {
      if (!quiz.recorded) {
        quiz.recorded = true;
        ML.store.recordQuiz(quiz.score, total, quiz.score === total);
        checkAchievements();
      }
      var pct = Math.round(quiz.score / total * 100);
      var msg = pct === 100 ? 'Flawless recall. That is what real understanding feels like.' : pct >= 60 ? 'Solid. The misses are your next study targets.' : 'Useful data. Revisit the lesson, then try the mentor.';
      openModal(modalShell({ title: 'Quiz result', sub: pct + '% · ' + (quiz.score === total ? 'perfect' : 'keep going'), narrow: true, body: '<div class="quiz-score"><div class="score">' + quiz.score + '<small>/' + total + '</small></div><h3>' + (pct === 100 ? 'Flawless recall' : pct >= 60 ? 'Good retrieval' : 'Gaps found') + '</h3><p class="muted" style="font-size:12.5px;line-height:1.6">' + esc(msg) + '</p><div class="chip-row" style="justify-content:center"><span class="chip">' + icon('zap') + ' XP earned</span><span class="chip">' + icon('target') + pct + '%</span></div></div>', foot: '<button class="btn btn-outline" data-act="modal-close">Done</button><button class="btn btn-primary" data-act="modal-close">Back to lesson</button>' }));
      return;
    }
    var q = quiz.questions[quiz.qi];
    var options = q.options.map(function (opt, i) {
      var cls = 'quiz-opt';
      if (quiz.answered) {
        if (i === q.answer) cls += ' correct';
        else if (i === quiz.selected) cls += ' wrong';
      }
      return '<button class="' + cls + '" data-act="quiz-answer" data-i="' + i + '"' + (quiz.answered ? ' disabled' : '') + '><span class="key">' + String.fromCharCode(65 + i) + '</span><span>' + esc(opt) + '</span></button>';
    }).join('');
    var body = '<div class="quiz-progress"><i style="width:' + Math.round((quiz.qi + (quiz.answered ? 1 : 0)) / total * 100) + '%"></i></div>' +
      '<div class="row between"><span class="badge">Question ' + (quiz.qi + 1) + ' of ' + total + '</span><span class="chip brand">' + icon('target') + quiz.score + ' correct</span></div>' +
      '<p class="quiz-q">' + esc(q.q) + '</p><div class="quiz-options">' + options + '</div>' +
      (quiz.answered ? '<div class="quiz-why"><b>' + (quiz.selected === q.answer ? 'Correct. ' : 'Not quite. ') + '</b>' + esc(q.why || 'Review the lesson section that covers this idea.') + '</div>' : '');
    openModal(modalShell({
      title: 'Quiz me · Day ' + (quiz.index + 1),
      sub: ML.store.findCourse(quiz.courseId) ? ML.store.findCourse(quiz.courseId).topic : 'Retrieval practice',
      wide: true,
      body: body,
      foot: quiz.answered
        ? '<button class="btn btn-primary" data-act="quiz-next">' + (quiz.qi + 1 >= total ? 'See score' : 'Next question') + '</button>'
        : '<button class="btn btn-ghost" data-act="modal-close">Exit quiz</button>'
    }));
  }

  function answerQuiz(i) {
    if (!quiz || quiz.answered) return;
    var q = quiz.questions[quiz.qi];
    quiz.selected = i;
    quiz.answered = true;
    if (i === q.answer) quiz.score++;
    renderQuiz();
  }

  function nextQuiz() {
    if (!quiz || !quiz.answered) return;
    if (quiz.qi + 1 >= quiz.questions.length) {
      quiz.finished = true;
      renderQuiz();
      return;
    }
    quiz.qi++;
    quiz.answered = false;
    quiz.selected = null;
    renderQuiz();
  }

  /* Planner */
  function autoPlanWeek() {
    var state = ML.store.get();
    var course = ML.store.activeCourse();
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var dow = start.getDay();
    var sundayStart = state.settings.weekStart === 'Sun';
    var diff = sundayStart ? dow : (dow === 0 ? 6 : dow - 1);
    start.setDate(start.getDate() - diff);
    var keys = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(d.getDate() + i);
      keys.push(ML.store.dateKey(d));
    }
    var plan = {};
    keys.forEach(function (k) { plan[k] = []; });
    var remaining = course ? course.plan.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) { return !x.l.done; }) : [];
    remaining.forEach(function (x, n) {
      var dayIndex = Math.min(6, Math.floor(n * 7 / Math.max(1, remaining.length)));
      plan[keys[dayIndex]].push({ id: ML.store.uid('plan'), text: 'Day ' + (x.i + 1) + ': ' + x.l.title, mins: course.mins, done: false, type: 'lesson' });
    });
    var due = ML.store.dueCards().length;
    if (due) plan[keys[0]].push({ id: ML.store.uid('plan'), text: 'Clear ' + due + ' due cards', mins: Math.max(10, Math.min(25, Math.ceil(due / 2))), done: false, type: 'review' });
    if (!remaining.length && !due) {
      plan[keys[0]].push({ id: ML.store.uid('plan'), text: 'Deep work: choose one outcome', mins: state.settings.dailyGoal || 30, done: false, type: 'focus' });
    }
    state.planner = plan;
    ML.store.save();
    render();
    toast('Week planned around the next ' + Math.min(remaining.length || 0, 7) + ' lessons.', 'ok');
  }

  /* Code Lab */
  function codeStorageKey() { return ML.store.key() + ':code'; }
  function codeState() { return ML.views.codeState(); }
  var codeSaveTimer = null;

  function hydrateCode() {
    var loaded = null;
    try { loaded = JSON.parse(localStorage.getItem(codeStorageKey()) || 'null'); } catch (e) {}
    if (loaded && typeof loaded === 'object' && typeof loaded.code === 'string') {
      ML.session.code = {
        code: loaded.code.slice(0, 20000),
        lang: loaded.lang || 'javascript',
        mode: loaded.mode || 'review',
        output: String(loaded.output || ''),
        review: String(loaded.review || ''),
        running: false,
        reviewing: false
      };
    } else {
      ML.session.code = { code: D.CODE_SNIPPETS[0].code, lang: 'javascript', mode: 'review', output: '', review: '', running: false, reviewing: false };
    }
  }

  function saveCode() {
    if (!ML.auth.isSignedIn() || !ML.session.code) return;
    try { localStorage.setItem(codeStorageKey(), JSON.stringify(ML.session.code)); } catch (e) {}
  }

  function saveCodeSoon() {
    clearTimeout(codeSaveTimer);
    codeSaveTimer = setTimeout(saveCode, 400);
  }

  function formatRunOutput(lines) {
    return (lines || []).map(function (l) {
      var cls = l.level === 'err' ? 'err' : l.level === 'warn' ? 'warn' : 'log';
      return '<span class="' + cls + '">' + esc(l.text) + '</span>';
    }).join('\n');
  }

  function runWorkspaceCode() {
    var cs = codeState();
    var ta = el('code-input');
    if (ta) cs.code = ta.value;
    saveCode();
    if (!String(cs.code).trim()) { toast('Write a snippet first.', 'warm'); return; }
    if (codeWorker) { try { codeWorker.terminate(); } catch (e) {} codeWorker = null; }
    cs.output = '<span class="log">Running…</span>';
    updateTerminal();
    ML.store.recordCodeRun();
    checkAchievements();
    var source = [
      'self.onmessage = function (event) {',
      '  var out = [];',
      '  function fmt(v) { if (typeof v === "string") return v; try { return JSON.stringify(v); } catch (e) { return String(v); } }',
      '  function add(level, args) { out.push({ level: level, text: Array.prototype.map.call(args, fmt).join(" ") }); }',
      '  var log = console.log, warn = console.warn, err = console.error;',
      '  console.log = function () { add("log", arguments); };',
      '  console.warn = function () { add("warn", arguments); };',
      '  console.error = function () { add("err", arguments); };',
      '  try {',
      '    var fn = new Function(event.data);',
      '    var result = fn();',
      '    if (result !== undefined) out.push({ level: "log", text: "=> " + fmt(result) });',
      '    self.postMessage({ ok: true, lines: out });',
      '  } catch (e) {',
      '    out.push({ level: "err", text: (e && e.stack) ? e.stack : String(e) });',
      '    self.postMessage({ ok: false, lines: out });',
      '  }',
      '};'
    ].join('\n');
    var url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    var worker = null;
    var finished = false;
    var finish = function (lines, ok, note) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cs.output = formatRunOutput(lines);
      saveCode();
      updateTerminal();
      if (ok) toast(note || 'Ran cleanly. Review it now.', 'ok');
      else toast(note || 'The snippet threw an error. That is data.', 'bad');
      try { worker.terminate(); } catch (e) {}
      if (codeWorker === worker) codeWorker = null;
      URL.revokeObjectURL(url);
    };
    var timer = setTimeout(function () {
      finish([{ level: 'err', text: 'Execution timed out after 3 seconds. Check for an infinite loop.' }], false, 'Stopped after 3 seconds.');
    }, 3000);
    try {
      worker = new Worker(url);
      codeWorker = worker;
      worker.onmessage = function (ev) {
        var d = ev.data || {};
        finish(d.lines || [], d.ok !== false, d.ok === false ? 'Error captured. Read the stack.' : 'Ran cleanly. Review it now.');
      };
      worker.onerror = function (err) {
        finish([{ level: 'err', text: err.message || 'Worker error.' }], false, 'Worker error.');
      };
      worker.postMessage(cs.code);
    } catch (e) {
      finish([{ level: 'err', text: e && e.message ? e.message : 'Could not start the sandbox.' }], false, 'Sandbox unavailable.');
    }
  }

  function updateReview(text) {
    var body = el('review-body');
    if (!body) {
      var ph = el('review-placeholder');
      if (ph) {
        ph.outerHTML = '<div class="review-body"><div class="md" id="review-body"></div></div>';
        body = el('review-body');
      }
    }
    if (body) body.innerHTML = md(text || '');
  }

  function reviewWorkspaceCode(mode) {
    var cs = codeState();
    var ta = el('code-input');
    if (ta) cs.code = ta.value;
    if (!String(cs.code).trim()) { toast('Write a snippet first.', 'warm'); return; }
    if (cs.reviewing) { toast('A review is already running.', 'warm'); return; }
    cs.reviewing = true;
    cs.mode = mode || 'review';
    cs.review = '';
    saveCode();
    updateReview('Reviewing your code…');
    toast('Reviewing the actual snippet…', 'warm');
    ML.ai.reviewCode(cs.code, cs.lang || 'javascript', cs.mode, function (chunk) {
      updateReview(chunk);
    }).then(function (res) {
      cs.reviewing = false;
      cs.review = res.text;
      saveCode();
      updateReview(res.text);
      toast(res.ai ? 'AI review ready.' : 'Offline static review ready.', res.ai ? 'ok' : 'warm');
    }).catch(function () {
      cs.reviewing = false;
      updateReview('## Review failed\n\nThe review could not be generated. Try again, or run the code and inspect the output yourself.');
      toast('Review failed.', 'bad');
    });
  }

  /* Command palette */
  function openPalette() {
    var root = el('palette-root');
    if (!root) return;
    if ($('#palette-root .palette')) { closePalette(); return; }
    root.innerHTML = '<div class="palette"><div class="palette-box"><div class="palette-input">' + icon('search') + '<input id="palette-input" placeholder="Jump to a page, course, lesson or action…" aria-label="Command palette"><span class="kbd">Esc</span></div><div class="palette-list" id="palette-list"></div><div class="palette-foot"><span>↑↓ navigate</span><span>↵ open</span><span>Ctrl K</span></div></div></div>';
    paletteSel = 0;
    updatePalette('');
    var input = el('palette-input');
    if (input) {
      input.focus();
      input.addEventListener('input', function () { updatePalette(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); paletteSel = Math.min(paletteItems.length - 1, paletteSel + 1); paintPaletteSelection(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); paletteSel = Math.max(0, paletteSel - 1); paintPaletteSelection(); }
        else if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(paletteSel); }
        else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
        e.stopPropagation();
      });
    }
  }

  function paletteSource() {
    var items = [
      { label: 'Dashboard', sub: 'Overview', ic: 'layout', run: function () { navigate('dashboard'); } },
      { label: 'My courses', sub: 'Curriculum', ic: 'book', run: function () { navigate('courses'); } },
      { label: 'AI mentor', sub: 'Socratic tutor', ic: 'sparkles', run: function () { navigate('mentor'); } },
      { label: 'Flashcards', sub: 'Spaced repetition', ic: 'cards', run: function () { navigate('cards'); } },
      { label: 'Focus studio', sub: 'Deep work timer', ic: 'timer', run: function () { navigate('focus'); } },
      { label: 'Progress', sub: 'Analytics', ic: 'chart', run: function () { navigate('progress'); } },
      { label: 'Planner', sub: 'Week rhythm', ic: 'calendar', run: function () { navigate('planner'); } },
      { label: 'Notes', sub: 'Second brain', ic: 'notes', run: function () { navigate('notes'); } },
      { label: 'Achievements', sub: 'Proof of work', ic: 'trophy', run: function () { navigate('achievements'); } },
      { label: 'Code Lab', sub: 'Run and review JS', ic: 'terminal', run: function () { navigate('code'); } },
      { label: 'Profile', sub: 'Account', ic: 'user', run: function () { navigate('profile/account'); } },
      { label: 'Preferences', sub: 'Theme, goals, reminders', ic: 'settings', run: function () { navigate('profile/preferences'); } },
      { label: 'New course', sub: 'Build a learning path', ic: 'plus', run: function () { openCourseModal(); } },
      { label: 'New note', sub: 'Capture an idea', ic: 'edit', run: function () { openNoteModal(null); } },
      { label: 'Add flashcard', sub: 'One idea per card', ic: 'cards', run: function () { openCardModal(); } },
      { label: 'Toggle theme', sub: 'Light, dark, auto', ic: 'moon', run: toggleTheme }
    ];
    var state = ML.store.get();
    state.courses.forEach(function (c) {
      items.push({ label: c.topic, sub: 'Course · ' + c.field, ic: 'book', run: function () { navigate('course/' + c.id); } });
      var nx = ML.ui.nextIndex(c);
      if (nx !== -1) items.push({ label: 'Next: ' + c.plan[nx].title, sub: c.topic + ' · Day ' + (nx + 1), ic: 'play', run: function () { navigate('lesson/' + c.id + '/' + nx); } });
    });
    return items;
  }

  function updatePalette(query) {
    var q = String(query || '').trim().toLowerCase();
    var source = paletteSource();
    paletteItems = q ? source.filter(function (it) { return (it.label + ' ' + it.sub).toLowerCase().indexOf(q) !== -1; }) : source;
    if (paletteSel >= paletteItems.length) paletteSel = Math.max(0, paletteItems.length - 1);
    var list = el('palette-list');
    if (!list) return;
    list.innerHTML = paletteItems.length ? paletteItems.map(function (it, i) {
      return '<button class="palette-item' + (i === paletteSel ? ' sel' : '') + '" data-act="palette-go" data-index="' + i + '">' + icon(it.ic) + '<span>' + esc(it.label) + '</span><span class="sub">' + esc(it.sub) + '</span></button>';
    }).join('') : '<div class="palette-empty">No matches. Try “cards”, “focus” or a course name.</div>';
  }

  function paintPaletteSelection() {
    var list = el('palette-list');
    if (!list) return;
    $$('.palette-item', list).forEach(function (b, i) { b.classList.toggle('sel', i === paletteSel); });
    var sel = $('.palette-item.sel', list);
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function runPaletteItem(i) {
    var item = paletteItems[i];
    closePalette();
    if (item && typeof item.run === 'function') item.run();
  }

  function closePalette() { el('palette-root').innerHTML = ''; }

})();
