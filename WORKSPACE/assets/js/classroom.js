/* MegaLab — Google Classroom, Drive and document pipeline (fetch-based, no gapi) */
(function () {
  'use strict';
  window.ML = window.ML || {};

  var API = {
    classroom: 'https://classroom.googleapis.com/v1',
    drive: 'https://www.googleapis.com/drive/v3',
    upload: 'https://www.googleapis.com/upload/drive/v3'
  };

  var FOLDER_NAME = 'MegaLab_Workspace';
  var WORKSPACE_FILE = 'megalab-workspace.json';
  var BACKUP_PREFIX = 'megalab-workspace-';
  var MAX_BACKUPS = 12;

  var folderId = null;
  var driveReady = false;
  var syncState = { status: 'local', lastError: null, lastSyncAt: null, folderId: null };

  var classroomState = {
    courses: [],
    courseWork: {},
    materials: {},
    announcements: {},
    syncedContent: [],
    selectedCourseId: null,
    syncStatus: 'idle',
    lastSync: null,
    error: null
  };

  function cfg() { return window.MEGALAB_CONFIG || {}; }
  function makeError(code, message) { var e = new Error(message); e.code = code; return e; }

  function scopes() {
    if (!ML.auth || !ML.auth.scopes) return '';
    return ML.auth.scopes.connect;
  }

  function driveScopes() {
    if (!ML.auth || !ML.auth.scopes) return '';
    return ML.auth.scopes.drive.join(' ');
  }

  async function token(options) {
    options = options || {};
    if (!ML.auth) throw makeError('auth', 'Google services are not loaded.');
    return ML.auth.getAccessToken(options.scopes || scopes(), { interactive: !!options.interactive });
  }

  function queryString(params) {
    return Object.keys(params || {}).filter(function (k) {
      return params[k] !== undefined && params[k] !== null && params[k] !== '';
    }).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
  }

  async function api(base, path, params, options) {
    options = options || {};
    var access = await token(options);
    var url = base + path + (params ? '?' + queryString(params) : '');
    var res = await fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + access }, options.headers || {}),
      body: options.body
    });
    if (res.status === 401) throw makeError('needs_consent', 'Google access expired. Reconnect Google Classroom.');
    if (res.status === 403) {
      var text = await res.text().catch(function () { return ''; });
      if (/insufficient|scope|permission/i.test(text)) throw makeError('needs_consent', 'Google Classroom permissions are missing. Reconnect and allow access.');
      throw makeError('forbidden', 'Google refused this request. Your school account may restrict Classroom access.');
    }
    if (!res.ok) {
      var body = await res.text().catch(function () { return ''; });
      throw makeError('google_api', 'Google request failed (' + res.status + '). ' + body.slice(0, 180));
    }
    if (options.raw) return res;
    if (res.status === 204) return {};
    return res.json();
  }

  async function paged(base, path, params, key) {
    var out = [];
    var pageToken = null;
    do {
      var p = Object.assign({}, params || {});
      if (pageToken) p.pageToken = pageToken;
      var data = await api(base, path, p);
      if (Array.isArray(data[key])) out = out.concat(data[key]);
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return out;
  }

  /* ---------------- Classroom ---------------- */

  function normalizeCourse(c) {
    return {
      id: c.id,
      name: c.name,
      section: c.section || '',
      description: c.descriptionHeading || c.description || '',
      room: c.room || '',
      ownerId: c.ownerId || '',
      courseState: c.courseState || 'ACTIVE',
      alternateLink: c.alternateLink || '',
      creationTime: c.creationTime || '',
      updateTime: c.updateTime || '',
      teacherGroupEmail: c.teacherGroupEmail || '',
      courseGroupEmail: c.courseGroupEmail || '',
      teacherFolder: c.teacherFolder || null
    };
  }

  function normalizeCourseWork(w) {
    return {
      id: w.id, title: w.title || 'Untitled assignment', description: w.description || '',
      materials: w.materials || [], workType: w.workType || 'ASSIGNMENT', state: w.state || '',
      alternateLink: w.alternateLink || '', creationTime: w.creationTime || '',
      updateTime: w.updateTime || '', dueDate: w.dueDate || null, dueTime: w.dueTime || null,
      maxPoints: w.maxPoints || null, topicId: w.topicId || ''
    };
  }

  function normalizeMaterial(m) {
    return {
      id: m.id, title: m.title || m.description || 'Class material', description: m.description || '',
      materials: m.materials || [], alternateLink: m.alternateLink || '',
      creationTime: m.creationTime || '', updateTime: m.updateTime || '', state: m.state || 'PUBLISHED',
      topicId: m.topicId || ''
    };
  }

  function normalizeAnnouncement(a) {
    return {
      id: a.id, text: a.text || '', materials: a.materials || [], alternateLink: a.alternateLink || '',
      creationTime: a.creationTime || '', updateTime: a.updateTime || '', state: a.state || ''
    };
  }

  async function listCourses() {
    var data = await paged(API.classroom, '/courses', { courseStates: 'ACTIVE', pageSize: 100, teacherId: 'me' }, 'courses');
    if (!data.length) data = await paged(API.classroom, '/courses', { courseStates: 'ACTIVE', pageSize: 100, studentId: 'me' }, 'courses');
    classroomState.courses = data.map(normalizeCourse);
    return classroomState.courses;
  }

  async function listCourseWork(courseId) {
    var work = await paged(API.classroom, '/courses/' + encodeURIComponent(courseId) + '/courseWork', { pageSize: 100 }, 'courseWork');
    classroomState.courseWork[courseId] = work.map(normalizeCourseWork);
    return classroomState.courseWork[courseId];
  }

  async function listCourseWorkMaterials(courseId) {
    var materials;
    try {
      materials = await paged(API.classroom, '/courses/' + encodeURIComponent(courseId) + '/courseWorkMaterials', { pageSize: 100 }, 'courseWorkMaterial');
    } catch (e) {
      materials = [];
    }
    classroomState.materials[courseId] = materials.map(normalizeMaterial);
    return classroomState.materials[courseId];
  }

  async function listAnnouncements(courseId) {
    var anns;
    try {
      anns = await paged(API.classroom, '/courses/' + encodeURIComponent(courseId) + '/announcements', { pageSize: 100 }, 'announcements');
    } catch (e) {
      anns = [];
    }
    classroomState.announcements[courseId] = anns.map(normalizeAnnouncement);
    return classroomState.announcements[courseId];
  }

  async function getCourse(courseId) {
    var c = await api(API.classroom, '/courses/' + encodeURIComponent(courseId));
    return normalizeCourse(c);
  }

  function isStudyMime(mime) {
    mime = String(mime || '').toLowerCase();
    return mime === 'application/pdf' ||
      mime.indexOf('wordprocessingml') !== -1 ||
      mime === 'application/msword' ||
      mime.indexOf('presentationml') !== -1 ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime.indexOf('spreadsheetml') !== -1 ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/rtf' ||
      mime.indexOf('text/') === 0 ||
      mime === 'application/vnd.google-apps.document' ||
      mime === 'application/vnd.google-apps.presentation' ||
      mime === 'application/vnd.google-apps.spreadsheet';
  }

  function isPDFOrDocument(mime) { return isStudyMime(mime); }

  function fileFromDriveFile(d, context) {
    var mime = d.mimeType || '';
    return {
      id: d.id,
      name: d.title || d.name || 'Untitled file',
      mimeType: mime,
      kind: ML.docs ? ML.docs.kindFor(d.title || d.name || '', mime) : 'other',
      sourceType: context.sourceType || 'drive',
      materialTitle: context.materialTitle || '',
      courseId: context.courseId || '',
      courseName: context.courseName || '',
      section: context.section || '',
      alternateLink: d.alternateLink || '',
      thumbnailLink: d.thumbnailUrl || d.thumbnailLink || '',
      modifiedTime: d.modifiedTime || '',
      createdTime: d.createdTime || '',
      study: isStudyMime(mime),
      downloadable: isStudyMime(mime)
    };
  }

  function extractDriveFilesFromMaterials(materials, courseWork) {
    var files = [];
    var seen = {};
    function add(f) {
      var key = String(f.id || f.alternateLink || f.name).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      files.push(f);
    }
    function scanMaterial(m, context) {
      if (!m || typeof m !== 'object') return;
      if (m.driveFile) {
        var d = m.driveFile.driveFile || m.driveFile;
        if (d && (d.id || d.title)) add(fileFromDriveFile(d, Object.assign({ sourceType: 'drive', materialTitle: context.title }, context)));
      }
      if (m.link) {
        add({
          id: 'link:' + (m.link.url || m.link.title || ''), name: m.link.title || m.link.url || 'Link',
          mimeType: 'text/uri', kind: 'link', sourceType: 'link', materialTitle: context.title,
          courseId: context.courseId, courseName: context.courseName, alternateLink: m.link.url || '',
          thumbnailLink: m.link.thumbnailUrl || '', study: false, downloadable: false
        });
      }
      if (m.youtubeVideo) {
        add({
          id: 'yt:' + (m.youtubeVideo.id || ''), name: m.youtubeVideo.title || 'YouTube video',
          mimeType: 'video/youtube', kind: 'video', sourceType: 'youtube', materialTitle: context.title,
          courseId: context.courseId, courseName: context.courseName,
          alternateLink: m.youtubeVideo.alternateLink || ('https://www.youtube.com/watch?v=' + m.youtubeVideo.id),
          thumbnailLink: m.youtubeVideo.thumbnailUrl || '', study: false, downloadable: false
        });
      }
      if (m.form) {
        add({
          id: 'form:' + (m.form.formUrl || ''), name: m.form.title || 'Google Form',
          mimeType: 'application/vnd.google-apps.form', kind: 'form', sourceType: 'form', materialTitle: context.title,
          courseId: context.courseId, courseName: context.courseName, alternateLink: m.form.formUrl || '',
          thumbnailLink: m.form.thumbnailUrl || '', study: false, downloadable: false
        });
      }
      if (Array.isArray(m.materials)) m.materials.forEach(function (x) { scanMaterial(x, context); });
    }
    function scanList(list, sourceType) {
      (list || []).forEach(function (item) {
        var title = item.title || item.text || '';
        scanMaterial(item, { courseId: item.courseId || '', courseName: item.courseName || '', title: title, sourceType: sourceType });
        (item.materials || []).forEach(function (m) { scanMaterial(m, { title: title, sourceType: sourceType, courseId: item.courseId || '', courseName: item.courseName || '' }); });
      });
    }
    scanList(materials, 'material');
    scanList(courseWork, 'coursework');
    return files;
  }

  async function syncCourse(course) {
    var work = [];
    var mats = [];
    var anns = [];
    try { work = await listCourseWork(course.id); } catch (e) { work = []; }
    try { mats = await listCourseWorkMaterials(course.id); } catch (e) { mats = []; }
    try { anns = await listAnnouncements(course.id); } catch (e) { anns = []; }
    var context = { courseId: course.id, courseName: course.name, section: course.section };
    var files = [];
    work.forEach(function (w) {
      files = files.concat(extractDriveFilesFromMaterials(w.materials, []).map(function (f) { return Object.assign({}, f, context, { materialTitle: w.title, assignmentId: w.id }); }));
    });
    mats.forEach(function (m) {
      files = files.concat(extractDriveFilesFromMaterials(m.materials, []).map(function (f) { return Object.assign({}, f, context, { materialTitle: m.title, materialId: m.id }); }));
    });
    anns.forEach(function (a) {
      files = files.concat(extractDriveFilesFromMaterials(a.materials, []).map(function (f) { return Object.assign({}, f, context, { materialTitle: 'Announcement', announcementId: a.id }); }));
    });
    var seen = {};
    files = files.filter(function (f) {
      var key = String(f.id || f.alternateLink).toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    return {
      courseId: course.id, courseName: course.name, courseSection: course.section,
      courseState: course.courseState, alternateLink: course.alternateLink,
      courseWork: work, courseMaterials: mats, announcements: anns,
      files: files, studyFiles: files.filter(function (f) { return f.study; }),
      syncedAt: new Date().toISOString()
    };
  }

  async function syncAllClassroomContent(onProgress) {
    classroomState.syncStatus = 'syncing';
    classroomState.error = null;
    var report = function (step, percent, message, current, total) {
      if (typeof onProgress === 'function') onProgress({ step: step, percent: Math.round(percent), progress: Math.round(percent), message: message, current: current || 0, total: total || 0 });
    };
    try {
      report('courses', 3, 'Finding your classes…');
      var courses = await listCourses();
      var synced = [];
      var errors = [];
      var allFiles = 0;
      report('courses', 8, 'Found ' + courses.length + ' active class' + (courses.length === 1 ? '' : 'es'), 0, courses.length);
      for (var i = 0; i < courses.length; i++) {
        var course = courses[i];
        report('course:' + course.id, 8 + (i / Math.max(1, courses.length)) * 87, 'Syncing “' + course.name + '”…', i, courses.length);
        try {
          var entry = await syncCourse(course);
          synced.push(entry);
          allFiles += entry.files.length;
        } catch (e) {
          errors.push({ courseId: course.id, courseName: course.name, message: e.message });
        }
      }
      classroomState.courses = courses;
      classroomState.syncedContent = synced;
      classroomState.syncStatus = errors.length && !synced.length ? 'error' : 'synced';
      classroomState.lastSync = new Date().toISOString();
      var result = {
        courses: courses,
        syncedContent: synced,
        lastSync: classroomState.lastSync,
        errors: errors,
        stats: {
          classes: courses.length,
          files: allFiles,
          studyFiles: synced.reduce(function (n, c) { return n + c.studyFiles.length; }, 0),
          assignments: synced.reduce(function (n, c) { return n + c.courseWork.length; }, 0)
        }
      };
      report('done', 100, allFiles + ' materials across ' + courses.length + ' classes', courses.length, courses.length);
      return result;
    } catch (e) {
      classroomState.syncStatus = 'error';
      classroomState.error = e.message;
      report('error', 0, e.message);
      throw e;
    }
  }

  async function syncOneCourse(courseId) {
    var course = classroomState.courses.filter(function (c) { return c.id === courseId; })[0];
    if (!course) course = await getCourse(courseId);
    return syncCourse(course);
  }

  /* ---------------- Drive files / extraction ---------------- */

  function escapeQuery(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  async function listDriveFiles(query, pageSize, options) {
    options = options || {};
    var files = [];
    var pageToken = null;
    do {
      var data = await api(API.drive, '/files', {
        q: query, pageSize: pageSize || 100, pageToken: pageToken,
        fields: 'nextPageToken, files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents,description,thumbnailLink)',
        supportsAllDrives: true, includeItemsFromAllDrives: true, spaces: options.spaces || 'drive'
      });
      files = files.concat(data.files || []);
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return files;
  }

  async function exportMimeFor(mime) {
    if (mime === 'application/vnd.google-apps.document') return { mime: 'text/plain', ext: '.txt' };
    if (mime === 'application/vnd.google-apps.presentation') return { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: '.pptx' };
    if (mime === 'application/vnd.google-apps.spreadsheet') return { mime: 'text/csv', ext: '.csv' };
    return null;
  }

  async function downloadFile(fileId, mimeType) {
    var access = await token();
    var exp = await exportMimeFor(mimeType);
    var url;
    if (exp) {
      url = API.drive + '/files/' + encodeURIComponent(fileId) + '/export?mimeType=' + encodeURIComponent(exp.mime);
    } else {
      url = API.drive + '/files/' + encodeURIComponent(fileId) + '?alt=media&supportsAllDrives=true';
    }
    var res = await fetch(url, { headers: { Authorization: 'Bearer ' + access } });
    if (res.status === 401) throw makeError('needs_consent', 'Google access expired. Reconnect Google Classroom.');
    if (!res.ok) {
      var body = await res.text().catch(function () { return ''; });
      throw makeError('download', 'Could not download that file (' + res.status + '). ' + body.slice(0, 150));
    }
    return { buffer: await res.arrayBuffer(), mimeType: exp ? exp.mime : (mimeType || res.headers.get('content-type') || '') };
  }

  async function processDocument(ref, name, mimeType) {
    if (ref && typeof File !== 'undefined' && ref instanceof File) {
      return ML.docs.extractFile(ref);
    }
    var id = typeof ref === 'string' ? ref : (ref && ref.id);
    name = name || (ref && (ref.name || ref.title)) || 'Document';
    mimeType = mimeType || (ref && ref.mimeType) || '';
    if (!id) throw makeError('file', 'Missing Google Drive file ID.');
    var downloaded = await downloadFile(id, mimeType);
    return ML.docs.extractBuffer(downloaded.buffer, name, downloaded.mimeType || mimeType);
  }

  async function processPDFFromDrive(fileId, fileName, mimeType) {
    try {
      return await processDocument({ id: fileId, name: fileName, mimeType: mimeType }, fileName, mimeType);
    } catch (e) {
      return { text: '', name: fileName || 'Document', error: e.message, code: e.code };
    }
  }

  async function uploadFileToDrive(file, name, parent, mimeType, onProgress) {
    var access = await token();
    var metadata = { name: name || (file && file.name) || 'file' };
    if (parent) metadata.parents = [parent];
    var form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file, name || file.name || 'file');
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API.upload + '/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink');
      xhr.setRequestHeader('Authorization', 'Bearer ' + access);
      if (xhr.upload && onProgress) xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(makeError('upload', 'Drive returned an invalid response.')); }
        } else reject(makeError('upload', 'Drive upload failed (' + xhr.status + ').'));
      };
      xhr.onerror = function () { reject(makeError('upload', 'Drive upload failed.')); };
      xhr.send(form);
    });
  }

  async function updateDriveFileContent(fileId, blob) {
    var access = await token();
    var res = await fetch(API.upload + '/files/' + encodeURIComponent(fileId) + '?uploadType=media&fields=id,name,size,modifiedTime', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + access, 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob
    });
    if (!res.ok) throw makeError('upload', 'Drive update failed (' + res.status + ').');
    return res.json();
  }

  async function createFolder(name, parentId) {
    var data = await api(API.drive, '/files', {
      supportsAllDrives: true, fields: 'id,name'
    }, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined })
    });
    return data;
  }

  async function deleteDriveFile(fileId) {
    await api(API.drive, '/files/' + encodeURIComponent(fileId), { supportsAllDrives: true }, { method: 'DELETE' });
    return true;
  }

  /* ---------------- Drive workspace sync ---------------- */

  async function findOrCreateAppFolder() {
    var query = "name='" + escapeQuery(FOLDER_NAME) + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    var files = await listDriveFiles(query, 5);
    if (files.length) return files[0].id;
    var folder = await createFolder(FOLDER_NAME, null);
    return folder.id;
  }

  async function findFile(name) {
    var query = "name='" + escapeQuery(name) + "' and '" + escapeQuery(folderId) + "' in parents and trashed=false";
    var files = await listDriveFiles(query, 5);
    return files[0] || null;
  }

  async function initDriveSync(options) {
    options = options || {};
    syncState.status = 'connecting';
    try {
      if (!ML.auth.hasLiveToken(driveScopes())) {
        if (!options.interactive) {
          syncState.status = 'local';
          return { status: 'needs_consent' };
        }
        await ML.auth.getAccessToken(driveScopes(), { interactive: true, prompt: 'consent' });
      }
      folderId = await findOrCreateAppFolder();
      driveReady = true;
      syncState = { status: 'synced', lastError: null, lastSyncAt: new Date().toISOString(), folderId: folderId };
      return { status: 'synced', folderId: folderId };
    } catch (e) {
      driveReady = false;
      syncState = { status: 'error', lastError: e.message, lastSyncAt: syncState.lastSyncAt, folderId: null };
      if (e.code === 'needs_consent') return { status: 'needs_consent' };
      throw e;
    }
  }

  async function syncWorkspaceToDrive(workspaceData, options) {
    options = options || {};
    if (!driveReady) {
      var init = await initDriveSync({ interactive: !!options.interactive });
      if (init.status !== 'synced') throw makeError('needs_consent', 'Google Drive is not connected.');
    }
    syncState.status = 'syncing';
    var envelope = {
      app: 'MegaLab', format: 'workspace', version: 3,
      savedAt: new Date().toISOString(),
      updatedAt: workspaceData.updatedAt || new Date().toISOString(),
      user: workspaceData.profile && workspaceData.profile.email ? undefined : undefined,
      data: workspaceData
    };
    var blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
    var existing = await findFile(WORKSPACE_FILE);
    var file;
    if (existing) file = await updateDriveFileContent(existing.id, blob);
    else file = await uploadFileToDrive(new File([blob], WORKSPACE_FILE, { type: 'application/json' }), WORKSPACE_FILE, folderId);
    if (options.backup !== false) {
      try { await createDailyBackup(blob, workspaceData.updatedAt); } catch (e) {}
    }
    syncState = { status: 'synced', lastError: null, lastSyncAt: new Date().toISOString(), folderId: folderId };
    return { ok: true, file: file, syncedAt: syncState.lastSyncAt };
  }

  async function createDailyBackup(blob, updatedAt) {
    var d = new Date(updatedAt || Date.now());
    var day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var name = BACKUP_PREFIX + day + '.json';
    var existing = await findFile(name);
    if (existing) {
      await updateDriveFileContent(existing.id, blob);
    } else {
      await uploadFileToDrive(new File([blob], name, { type: 'application/json' }), name, folderId);
      await pruneBackups();
    }
  }

  async function pruneBackups() {
    var files = await listDriveBackups();
    if (files.length <= MAX_BACKUPS) return;
    var extra = files.slice(MAX_BACKUPS);
    for (var i = 0; i < extra.length; i++) {
      try { await deleteDriveFile(extra[i].id); } catch (e) {}
    }
  }

  async function loadWorkspaceFromDrive() {
    if (!driveReady) {
      var init = await initDriveSync({ interactive: false });
      if (init.status !== 'synced') return null;
    }
    var file = await findFile(WORKSPACE_FILE);
    if (!file) return null;
    var downloaded = await downloadFile(file.id, 'application/json');
    var text = new TextDecoder('utf-8').decode(new Uint8Array(downloaded.buffer));
    var parsed = JSON.parse(text);
    var data = parsed && parsed.data ? parsed.data : parsed;
    return {
      data: data,
      meta: {
        fileId: file.id,
        savedAt: parsed.savedAt || file.modifiedTime,
        updatedAt: (parsed && parsed.updatedAt) || (data && data.updatedAt) || file.modifiedTime,
        modifiedTime: file.modifiedTime,
        size: file.size
      }
    };
  }

  async function getWorkspaceMeta() {
    if (!driveReady) {
      var init = await initDriveSync({ interactive: false });
      if (init.status !== 'synced') return null;
    }
    var file = await findFile(WORKSPACE_FILE);
    if (!file) return null;
    return {
      fileId: file.id, modifiedTime: file.modifiedTime, size: file.size, name: file.name
    };
  }

  async function listDriveBackups() {
    if (!driveReady) {
      var init = await initDriveSync({ interactive: false });
      if (init.status !== 'synced') return [];
    }
    var query = "name contains '" + BACKUP_PREFIX + "' and '" + escapeQuery(folderId) + "' in parents and trashed=false";
    var files = await listDriveFiles(query, 50);
    files.sort(function (a, b) { return new Date(b.modifiedTime) - new Date(a.modifiedTime); });
    return files.map(function (f) {
      return { id: f.id, name: f.name, size: f.size, modifiedTime: f.modifiedTime, webViewLink: f.webViewLink };
    });
  }

  async function deleteDriveBackup(fileId) {
    return deleteDriveFile(fileId);
  }

  async function deleteWorkspaceFromDrive() {
    if (!ML.auth.hasLiveToken(driveScopes())) return false;
    if (!driveReady) {
      var init = await initDriveSync({ interactive: false });
      if (init.status !== 'synced') return false;
    }
    var files = await listDriveBackups();
    var main = await findFile(WORKSPACE_FILE);
    if (main) files.push(main);
    for (var i = 0; i < files.length; i++) {
      try { await deleteDriveFile(files[i].id); } catch (e) {}
    }
    return true;
  }

  function driveStatus() {
    return Object.assign({}, syncState, { enabled: driveReady });
  }

  /* ---------------- Generation wrappers ---------------- */

  async function generateGamesFromPDF(text, topic, courseName, options) {
    options = options || {};
    return ML.games.generateGames(text, topic || courseName, {
      sourceId: options.sourceId || courseName || null,
      sourceName: options.sourceName || courseName || null,
      useAI: options.useAI
    });
  }

  async function generateQuestionsFromPDF(text, topic, options) {
    options = options || {};
    return ML.games.generateQuestions(text, topic, {
      sourceId: options.sourceId || null,
      sourceName: options.sourceName || null,
      count: options.count || 10,
      useAI: options.useAI
    });
  }

  async function generateCardsFromPDF(text, topic, options) {
    options = options || {};
    return ML.games.generateCards(text, topic, {
      sourceId: options.sourceId || null,
      sourceName: options.sourceName || null,
      count: options.count || 10,
      useAI: options.useAI
    });
  }

  ML.classroom = {
    FOLDER_NAME: FOLDER_NAME,
    WORKSPACE_FILE: WORKSPACE_FILE,
    scopes: scopes,
    driveScopes: driveScopes,
    initGapiClients: function () { return Promise.resolve(); },
    loadGapi: function () { return Promise.resolve(); },
    getAccessToken: token,
    setTokenForGapi: function () {},
    refreshAccessToken: function () { return token({ interactive: true }); },
    listCourses: listCourses,
    listCourseWork: listCourseWork,
    listCourseWorkMaterials: listCourseWorkMaterials,
    listAnnouncements: listAnnouncements,
    getCourse: getCourse,
    syncCourse: syncCourse,
    syncOneCourse: syncOneCourse,
    syncAllClassroomContent: syncAllClassroomContent,
    extractDriveFilesFromMaterials: extractDriveFilesFromMaterials,
    isPDFOrDocument: isPDFOrDocument,
    isStudyMime: isStudyMime,
    listDriveFiles: listDriveFiles,
    downloadFile: downloadFile,
    processDocument: processDocument,
    processPDFFromDrive: processPDFFromDrive,
    uploadFileToDrive: uploadFileToDrive,
    createFolder: createFolder,
    deleteDriveFile: deleteDriveFile,
    initDriveSync: initDriveSync,
    syncWorkspaceToDrive: syncWorkspaceToDrive,
    loadWorkspaceFromDrive: loadWorkspaceFromDrive,
    getWorkspaceMeta: getWorkspaceMeta,
    listDriveBackups: listDriveBackups,
    deleteDriveBackup: deleteDriveBackup,
    deleteWorkspaceFromDrive: deleteWorkspaceFromDrive,
    driveStatus: driveStatus,
    generateGamesFromPDF: generateGamesFromPDF,
    generateQuestionsFromPDF: generateQuestionsFromPDF,
    generateCardsFromPDF: generateCardsFromPDF,
    classroomState: classroomState,
    GAME_TYPES: ML.games ? ML.games.GAME_TYPES : []
  };
})();
