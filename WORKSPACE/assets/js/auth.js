/* MegaLab — Google Identity Services, scoped tokens and persisted session */
(function () {
  'use strict';
  window.ML = window.ML || {};

  var currentUser = null;
  var gsiPromise = null;
  var pendingToken = null;
  var TOKEN_KEY = 'megalab:oauth-token:v1';

  var SCOPE = {
    base: 'openid email profile',
    classroom: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
      'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
      'https://www.googleapis.com/auth/classroom.announcements.readonly'
    ],
    drive: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ]
  };
  SCOPE.connect = SCOPE.base + ' ' + SCOPE.classroom.concat(SCOPE.drive).join(' ');
  SCOPE.driveOnly = SCOPE.base + ' ' + SCOPE.drive.join(' ');

  function cfg() { return window.MEGALAB_CONFIG || {}; }
  function sessionKey() { return (cfg().storagePrefix || 'megalab') + ':session:v2'; }
  function sessionDays() { return Math.max(1, Number(cfg().sessionDays) || 30); }

  function isConfigured() {
    var id = String(cfg().googleClientId || '').trim();
    if (!id || /x{4,}|YOUR_|example/i.test(id)) return false;
    return /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(id);
  }

  function makeError(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  function scopeList(scope) {
    return String(scope || '').split(/\s+/).filter(Boolean);
  }
  function scopeString(scope) {
    var seen = {};
    return scopeList(scope).filter(function (s) {
      if (seen[s]) return false;
      seen[s] = true;
      return true;
    }).sort().join(' ');
  }
  function hasScopes(required, granted) {
    var have = {};
    scopeList(granted).forEach(function (s) { have[s] = true; });
    return scopeList(required).every(function (s) { return have[s]; });
  }

  function persist(user) {
    currentUser = user;
    try {
      localStorage.setItem(sessionKey(), JSON.stringify({
        user: user,
        expires: Date.now() + sessionDays() * 86400000,
        signedInAt: new Date().toISOString(),
        version: 3
      }));
    } catch (e) {}
    return user;
  }

  function restore() {
    try {
      var raw = localStorage.getItem(sessionKey());
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.user || !s.user.id) return null;
      if (!s.expires || Date.now() > s.expires) {
        localStorage.removeItem(sessionKey());
        return null;
      }
      currentUser = s.user;
      s.expires = Date.now() + sessionDays() * 86400000;
      localStorage.setItem(sessionKey(), JSON.stringify(s));
      readToken(); // drop stale token if expired
      return currentUser;
    } catch (e) {
      return null;
    }
  }

  function ensureGis() {
    if (gsiPromise) return gsiPromise;
    gsiPromise = new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
      if (location.protocol === 'file:') {
        return reject(makeError('insecure', 'Google Sign-In needs an http(s) origin. Deploy the site or use a localhost server.'));
      }
      var existing = document.getElementById('gsi-client-script');
      var done = false;
      function finish(err) {
        if (done) return;
        done = true;
        if (err) reject(err);
        else resolve();
      }
      if (existing && existing.dataset.loaded === '1') return finish();
      var script = existing;
      if (!script) {
        script = document.createElement('script');
        script.id = 'gsi-client-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', function () {
        script.dataset.loaded = '1';
        finish();
      });
      script.addEventListener('error', function () {
        finish(makeError('network', 'Could not load Google Sign-In. Check your connection or an ad blocker.'));
      });
      setTimeout(function () {
        if (!(window.google && window.google.accounts)) finish(makeError('network', 'Google Sign-In timed out. Try again.'));
      }, 15000);
    });
    return gsiPromise;
  }

  function fetchProfile(accessToken) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken }
    }).then(function (res) {
      if (!res.ok) throw makeError('network', 'Google did not return your profile. Try signing in again.');
      return res.json();
    }).then(function (info) {
      if (!info || !info.sub) throw makeError('network', 'Google profile was incomplete.');
      return {
        id: 'google_' + info.sub,
        googleId: info.sub,
        name: info.name || (info.email ? info.email.split('@')[0] : 'Learner'),
        email: info.email || '',
        picture: info.picture || '',
        provider: 'google',
        emailVerified: !!info.email_verified,
        signedInAt: (currentUser && currentUser.signedInAt) || new Date().toISOString(),
        classroomConnected: !!(currentUser && currentUser.classroomConnected),
        driveConnected: !!(currentUser && currentUser.driveConnected),
        connectedScopes: (currentUser && currentUser.connectedScopes) || ''
      };
    });
  }

  function readToken() {
    try {
      var raw = sessionStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      var t = JSON.parse(raw);
      if (!t || !t.access_token || !t.expires || Date.now() > t.expires - 30000) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return t;
    } catch (e) {
      return null;
    }
  }

  function saveToken(resp, scope) {
    var t = {
      access_token: resp.access_token,
      expires: Date.now() + (Number(resp.expires_in) || 3600) * 1000,
      scopes: scopeString(resp.scope || scope),
      at: new Date().toISOString()
    };
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {}
    return t;
  }

  function hasLiveToken(required) {
    var t = readToken();
    return !!(t && (!required || hasScopes(required, t.scopes)));
  }

  function tokenScopes() {
    var t = readToken();
    return t ? t.scopes : '';
  }

  function markConnected(user, scopes) {
    var all = scopeString(((user && user.connectedScopes) || '') + ' ' + scopes);
    var next = Object.assign({}, user || currentUser || {}, { connectedScopes: all });
    next.classroomConnected = hasScopes(SCOPE.classroom.join(' '), all);
    next.driveConnected = hasScopes(SCOPE.drive.join(' '), all);
    if (currentUser) currentUser = persist(next);
    return next;
  }

  function requestToken(scope, options) {
    options = options || {};
    scope = scopeString(scope);
    if (!isConfigured()) {
      return Promise.reject(makeError('not_configured', 'Add your Google OAuth client ID to google-client-id.js to enable Google Sign-In.'));
    }
    if (location.protocol === 'file:') {
      return Promise.reject(makeError('insecure', 'Google Sign-In needs an http(s) origin. Deploy the site or use a localhost server.'));
    }
    var cached = readToken();
    if (cached && hasScopes(scope, cached.scopes) && options.force !== true) {
      return Promise.resolve({ token: cached.access_token, user: currentUser, scopes: cached.scopes });
    }
    if (pendingToken) return pendingToken;

    pendingToken = ensureGis().then(function () {
      return new Promise(function (resolve, reject) {
        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          pendingToken = null;
          reject(makeError('timeout', 'Google authorization took too long. Check the popup and try again.'));
        }, 120000);

        function settle(fn, value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          pendingToken = null;
          fn(value);
        }

        try {
          var client = google.accounts.oauth2.initTokenClient({
            client_id: cfg().googleClientId,
            scope: scope,
            include_granted_scopes: true,
            callback: function (resp) {
              if (!resp || resp.error || !resp.access_token) {
                return settle(reject, makeError('cancelled', 'Google authorization was cancelled or blocked.'));
              }
              var t = saveToken(resp, scope);
              if (!currentUser) {
                fetchProfile(resp.access_token).then(function (user) {
                  settle(resolve, { token: t.access_token, user: persist(markConnected(user, t.scopes)), scopes: t.scopes });
                }).catch(function (err) { settle(reject, err); });
              } else {
                settle(resolve, { token: t.access_token, user: markConnected(currentUser, t.scopes), scopes: t.scopes });
              }
            },
            error_callback: function (err) {
              var code = err && err.type === 'popup_closed' ? 'cancelled' : 'network';
              settle(reject, makeError(code, code === 'cancelled' ? 'Google authorization window closed.' : 'Google authorization could not complete.'));
            }
          });
          client.requestAccessToken({
            prompt: options.prompt === undefined ? 'consent' : options.prompt,
            login_hint: currentUser && currentUser.email ? currentUser.email : undefined
          });
        } catch (e) {
          settle(reject, makeError('network', e && e.message ? e.message : 'Could not start Google authorization.'));
        }
      });
    });

    return pendingToken;
  }

  async function getAccessToken(required, options) {
    options = options || {};
    required = required || SCOPE.connect;
    var cached = readToken();
    if (cached && hasScopes(required, cached.scopes)) return cached.access_token;
    if (options.interactive === false || options.silent) {
      throw makeError('needs_consent', 'Google access needs to be reconnected for this action.');
    }
    var result = await requestToken(required, { prompt: options.prompt || 'consent', force: options.force });
    return result.token || result;
  }

  async function signInGoogle(options) {
    options = options || {};
    var scope = options.scope || SCOPE.base;
    var result = await requestToken(scope, { prompt: options.prompt || 'select_account' });
    if (result.user) currentUser = result.user;
    else if (!currentUser) {
      var profile = await fetchProfile(result.token || result);
      currentUser = persist(profile);
    }
    if (scope.indexOf('classroom') !== -1 || scope.indexOf('drive') !== -1) {
      currentUser = markConnected(currentUser, result.scopes || scope);
    }
    return currentUser;
  }

  async function connect() {
    if (!currentUser) return signInGoogle({ scope: SCOPE.connect });
    var result = await requestToken(SCOPE.connect, { prompt: 'consent' });
    currentUser = markConnected(currentUser, result.scopes || SCOPE.connect);
    return currentUser;
  }

  function updateUser(patch) {
    if (!currentUser) return null;
    currentUser = Object.assign({}, currentUser, patch || {});
    persist(currentUser);
    return currentUser;
  }

  function signOut() {
    var token = readToken();
    try {
      if (token && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) {
        google.accounts.oauth2.revoke(token.access_token, function () {});
      }
    } catch (e) {}
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    currentUser = null;
    try { localStorage.removeItem(sessionKey()); } catch (e) {}
    try {
      if (window.google && google.accounts && google.accounts.id && google.accounts.id.disableAutoSelect) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (e) {}
  }

  function disconnectGoogle() {
    var token = readToken();
    try {
      if (token && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) {
        google.accounts.oauth2.revoke(token.access_token, function () {});
      }
    } catch (e) {}
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    if (currentUser) {
      currentUser = Object.assign({}, currentUser, { classroomConnected: false, driveConnected: false, connectedScopes: '' });
      persist(currentUser);
    }
  }

  function user() { return currentUser; }
  function isSignedIn() { return !!currentUser; }
  function isConnected() {
    return hasLiveToken(SCOPE.classroom.join(' ')) && hasLiveToken(SCOPE.drive.join(' '));
  }
  function session() {
    try {
      var raw = localStorage.getItem(sessionKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  ML.auth = {
    restore: restore,
    signInGoogle: signInGoogle,
    connect: connect,
    disconnectGoogle: disconnectGoogle,
    getAccessToken: getAccessToken,
    hasLiveToken: hasLiveToken,
    tokenScopes: tokenScopes,
    signOut: signOut,
    updateUser: updateUser,
    user: user,
    isSignedIn: isSignedIn,
    isConnected: isConnected,
    isConfigured: isConfigured,
    session: session,
    sessionKey: sessionKey,
    ensureGis: ensureGis,
    scopes: SCOPE,
    hasScopes: hasScopes,
    config: cfg
  };
})();
