/* MegaLab — icons, constants, offline content generators */
(function () {
  'use strict';
  window.ML = window.ML || {};

  var ICONS = {
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    'arrow-up-right': '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
    'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    'check-circle': '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14.01 9 11.01"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.4-4.3 2-6 .5 2.5 2 3.9 3.5 5.5A6.5 6.5 0 1 1 8.5 14.5z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    sparkles: '<path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/><path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.2A3.3 3.3 0 0 0 4.5 8a3.5 3.5 0 0 0-1 6 3 3 0 0 0 2.5 4.7A3 3 0 0 0 9 21.5a3 3 0 0 0 3-3V5a3 3 0 0 0-2.5-3z"/><path d="M14.5 2A2.5 2.5 0 0 1 17 4.5v.2A3.3 3.3 0 0 1 19.5 8a3.5 3.5 0 0 1 1 6 3 3 0 0 1-2.5 4.7A3 3 0 0 1 15 21.5a3 3 0 0 1-3-3V5a3 3 0 0 1 2.5-3z"/>',
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    cards: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M7 2h13a2 2 0 0 1 2 2v13"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    rotate: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    notes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="1" y1="1" x2="23" y2="23"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    star: '<polygon points="12 2 15.1 8.6 22 9.3 16.8 13.9 18.2 21 12 17.3 5.8 21 7.2 13.9 2 9.3 8.9 8.6 12 2"/>',
    coffee: '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.1 4.9a10 10 0 0 1 0 14.2M15.5 8.5a5 5 0 0 1 0 7"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2a2.4 2.4 0 0 0-3-3z"/><path d="M12 15 9 12a11 11 0 0 1 8-9 11 11 0 0 1-5 12z"/><path d="M9 12H4s.5-2.8 2-4c1.7-1.3 5 0 5 0M12 15v5s2.8-.5 4-2c1.3-1.7 0-5 0-5"/>',
    lightbulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
    cloud: '<path d="M18 10h-1.3A7 7 0 1 0 6 18h12a4 4 0 0 0 0-8z"/>',
    'wifi-off': '<line x1="1" y1="1" x2="23" y2="23"/><path d="M16.7 11.7A11 11 0 0 1 19 13M5 13a11 11 0 0 1 4-2.7M2 8.8a16 16 0 0 1 4.2-2.5M22 8.8a16 16 0 0 0-8.2-3.6M8.5 16.4a6 6 0 0 1 7 0M12 20h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    key: '<path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    wand: '<path d="m15 4 5 5L7 22l-5-5zM14 5l5 5"/><path d="M9 2v3M7.5 3.5h3M20 16v3M18.5 17.5h3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    gripper: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><polyline points="7 21 12 16 17 21"/>',
    'file-plus': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
    spinner: '<path d="M21 12a9 9 0 1 1-6.2-8.6" fill="none"/>',
    'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    command: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
  };

  function icon(name, cls) {
    var p = ICONS[name] || ICONS.sparkles;
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  var FIELDS = [
    { name: 'Computer Science', icon: 'code', grad: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
    { name: 'Programming', icon: 'terminal', grad: 'linear-gradient(135deg,#0f766e,#059669)' },
    { name: 'Artificial Intelligence', icon: 'brain', grad: 'linear-gradient(135deg,#7c3aed,#db2777)' },
    { name: 'Web Development', icon: 'layout', grad: 'linear-gradient(135deg,#2563eb,#06b6d4)' },
    { name: 'Data & Databases', icon: 'database', grad: 'linear-gradient(135deg,#c2410c,#f59e0b)' },
    { name: 'Cybersecurity', icon: 'shield', grad: 'linear-gradient(135deg,#0f172a,#475569)' },
    { name: 'Mathematics', icon: 'chart', grad: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' },
    { name: 'Science', icon: 'compass', grad: 'linear-gradient(135deg,#0d9488,#84cc16)' },
    { name: 'Business & Finance', icon: 'chart', grad: 'linear-gradient(135deg,#b45309,#dc2626)' },
    { name: 'Languages', icon: 'message', grad: 'linear-gradient(135deg,#9333ea,#ec4899)' },
    { name: 'Design & Art', icon: 'wand', grad: 'linear-gradient(135deg,#db2777,#f97316)' },
    { name: 'Music', icon: 'volume', grad: 'linear-gradient(135deg,#7c3aed,#2563eb)' },
    { name: 'Health & Fitness', icon: 'target', grad: 'linear-gradient(135deg,#15803d,#65a30d)' },
    { name: 'Other', icon: 'sparkles', grad: 'linear-gradient(135deg,#475569,#334155)' }
  ];

  var PHASES = [
    { title: 'Map the territory', goal: 'Name the key ideas of {topic} and how they connect so you have a mental map before the details.' },
    { title: 'Core mental model', goal: 'Understand the single most important idea in {topic} and why it matters.' },
    { title: 'Worked example', goal: 'Follow one complete example of {topic} from start to finish without skipping steps.' },
    { title: 'Deliberate practice', goal: 'Solve small {topic} problems and fix the most common beginner mistakes.' },
    { title: 'Teach it back', goal: 'Explain {topic} in your own words and identify the gaps in your explanation.' },
    { title: 'Go deeper', goal: 'Meet the next level of detail in {topic} and see where the edge cases live.' },
    { title: 'Retrieval review', goal: 'Recall the core of {topic} from memory, then repair what you missed.' },
    { title: 'Connect and apply', goal: 'Use {topic} inside a slightly bigger, more realistic scenario.' },
    { title: 'Common traps', goal: 'Spot the mistakes that make {topic} feel harder than it is — and avoid them.' },
    { title: 'Build something small', goal: 'Produce one small output that proves you can use {topic} without a tutorial.' }
  ];

  var ACHIEVEMENTS = [
    { id: 'first_step', name: 'First step', desc: 'Complete your first lesson', icon: 'rocket', goal: 1, get: function (s) { return s.lessonsDone; }, unit: 'lessons' },
    { id: 'streak_3', name: 'Warm engine', desc: 'Study 3 days in a row', icon: 'flame', goal: 3, get: function (s) { return s.bestStreak; }, unit: 'day streak' },
    { id: 'streak_7', name: 'Week of deep work', desc: 'Study 7 days in a row', icon: 'flame', goal: 7, get: function (s) { return s.bestStreak; }, unit: 'day streak' },
    { id: 'streak_30', name: 'Unbreakable', desc: 'Study 30 days in a row', icon: 'flame', goal: 30, get: function (s) { return s.bestStreak; }, unit: 'day streak' },
    { id: 'xp_500', name: 'Momentum', desc: 'Earn 500 XP', icon: 'zap', goal: 500, get: function (s) { return s.xp; }, unit: 'XP' },
    { id: 'xp_2500', name: 'Compounding', desc: 'Earn 2,500 XP', icon: 'zap', goal: 2500, get: function (s) { return s.xp; }, unit: 'XP' },
    { id: 'cards_25', name: 'Memory starter', desc: 'Create 25 flashcards', icon: 'cards', goal: 25, get: function (s) { return s.cards; }, unit: 'cards' },
    { id: 'cards_100', name: 'Recall machine', desc: 'Create 100 flashcards', icon: 'cards', goal: 100, get: function (s) { return s.cards; }, unit: 'cards' },
    { id: 'reviews_50', name: 'Spaced out', desc: 'Review 50 cards', icon: 'rotate', goal: 50, get: function (s) { return s.reviews; }, unit: 'reviews' },
    { id: 'focus_5', name: 'Deep focus', desc: 'Finish 5 focus sessions', icon: 'timer', goal: 5, get: function (s) { return s.focusSessions; }, unit: 'sessions' },
    { id: 'focus_hours', name: 'Hour builder', desc: 'Log 5 hours of focus', icon: 'clock', goal: 300, get: function (s) { return s.minutes; }, unit: 'minutes' },
    { id: 'quiz_perfect', name: 'Flawless recall', desc: 'Score 100% on a quiz', icon: 'target', goal: 1, get: function (s) { return s.quizPerfect; }, unit: 'perfect quiz' },
    { id: 'two_courses', name: 'Explorer', desc: 'Build 2 courses', icon: 'layers', goal: 2, get: function (s) { return s.coursesMade; }, unit: 'courses' },
    { id: 'notes_5', name: 'Second brain', desc: 'Write 5 notes', icon: 'notes', goal: 5, get: function (s) { return s.notes; }, unit: 'notes' },
    { id: 'code_10', name: 'Builder', desc: 'Run code in the Code Lab 10 times', icon: 'terminal', goal: 10, get: function (s) { return s.codeRuns; }, unit: 'runs' },
    { id: 'graduate', name: 'Graduate', desc: 'Finish every lesson in a course', icon: 'trophy', goal: 1, get: function (s) { return s.coursesFinished; }, unit: 'courses' }
  ];

  var QUOTES = [
    'The person doing the thinking is the person doing the learning.',
    'Memory is not a warehouse. It is a muscle you use or lose.',
    'Small, deliberate sessions beat heroic all-nighters.',
    'If you cannot explain it simply, you have found the next thing to study.',
    'Difficulty is the feeling of your brain building new roads.',
    'The goal is not to finish the course. It is to own the skill.'
  ];

  var CODE_SNIPPETS = [
    { name: 'Two-sum interviewer', lang: 'javascript', code: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n\nconsole.log(twoSum([2, 7, 11, 15], 9));' },
    { name: 'Group array by key', lang: 'javascript', code: 'function groupBy(items, key) {\n  return items.reduce((groups, item) => {\n    const value = item[key];\n    (groups[value] ||= []).push(item);\n    return groups;\n  }, {});\n}\n\nconsole.log(groupBy([{role:"dev"},{role:"design"},{role:"dev"}], "role"));' },
    { name: 'Debounce utility', lang: 'javascript', code: 'function debounce(fn, wait = 300) {\n  let timer;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\n\nconst log = debounce((v) => console.log("ran", v), 500);\nlog("a"); log("b");' },
    { name: 'Fibonacci, memoised', lang: 'javascript', code: 'const memo = new Map();\nfunction fib(n) {\n  if (n <= 1) return n;\n  if (memo.has(n)) return memo.get(n);\n  const value = fib(n - 1) + fib(n - 2);\n  memo.set(n, value);\n  return value;\n}\n\nconsole.log(fib(40));' }
  ];

  function fill(str, course) {
    return String(str).replace(/\{topic\}/g, course.topic || 'this topic');
  }

  function planTemplate(course) {
    var days = Number(course.days) || 14;
    var out = [];
    for (var i = 0; i < days; i++) {
      var last = i === days - 1;
      var phase = last ? { title: 'Final project', goal: 'Build one small finished thing that shows you can use {topic}, then explain your process.' } : PHASES[i % PHASES.length];
      var cycle = Math.floor(i / PHASES.length);
      out.push({
        id: 'l' + (i + 1) + '_' + Math.random().toString(36).slice(2, 6),
        title: (cycle > 0 && !last ? 'Deeper: ' : '') + fill(phase.title, course),
        goal: fill(phase.goal, course),
        body: '',
        done: 0,
        completedAt: null
      });
    }
    return out;
  }

  function codeSample(course) {
    if (/python/i.test(course.topic)) return '```python\n# A tiny example to adapt\nrows = [{"name": "Ada", "score": 92}, {"name": "Linus", "score": 81}]\n\nfor row in rows:\n    if row["score"] >= 90:\n        print(f\'{row["name"]} is crushing it\')\n```';
    if (/sql|database|data/i.test(course.field)) return '```sql\n-- Follow the shape of the idea, then change it\nSELECT level, COUNT(*) AS learners\nFROM students\nWHERE active = TRUE\nGROUP BY level\nORDER BY learners DESC;\n```';
    if (/html|css|web|design/i.test(course.field)) return '```html\n<section class="card">\n  <h2>Your idea</h2>\n  <p>One clear sentence beats ten clever ones.</p>\n</section>\n```';
    return '```js\n// A small model of the idea\nconst example = {\n  input: "something you already understand",\n  process: "the new idea you are learning",\n  output: "the result you can now predict"\n};\n\nconsole.log(example);\n```';
  }

  function lessonTemplate(course, index) {
    var p = course.plan[index] || course.plan[0] || { title: 'This lesson', goal: 'Learn the core idea.' };
    var topic = course.topic;
    var level = course.level || 'Beginner';
    var extra = index === course.plan.length - 1
      ? 'Because this is the final lesson, treat the task as a tiny portfolio piece: finish it, polish it once, and write a two-sentence explanation of what you built.'
      : 'Keep the output small enough to finish in one session. Unfinished experiments are where motivation goes to die.';
    return [
      '## Big idea',
      '**' + p.goal + '**',
      '',
      'The point of this session is not to consume more information. It is to make one useful model of **' + topic + '** that you can retrieve later without notes. You are working at **' + level + '** level, so aim for ' + (level === 'Beginner' ? 'clarity over coverage' : level === 'Advanced' ? 'precision and edge cases' : 'fluency and transfer') + '.',
      '',
      '## Learn it',
      '1. **Start with the outcome.** Write one sentence: what should you be able to do by the end of this session?',
      '2. **Find a concrete anchor.** Take the smallest real example of *' + p.title.toLowerCase() + '* you can find. A tiny example you can trace beats a big one you can only admire.',
      '3. **Say it out loud.** Explain the idea to an imaginary classmate in under 60 seconds. Where you stumble is the part to reread.',
      '',
      codeSample(course),
      '',
      '> Rule of thumb: if your notes could be read aloud by someone else and still make sense, you understood them. If not, they are a transcript, not a note.',
      '',
      '## Worked example',
      'Imagine you must teach this to someone who knows nothing about ' + topic + '. You would probably:',
      '',
      '- show the simplest possible case first,',
      '- change one thing at a time,',
      '- name the rule only after the pattern is visible,',
      '- and finish with a question they can answer themselves.',
      '',
      'Do exactly that in reverse for yourself. Work through one example slowly, narrating each step. Then close the example and reproduce it from memory. The gap between those two attempts is your real syllabus.',
      '',
      '## Try it now',
      '**Hands-on task (' + course.mins + ' minutes):** Create a one-page mini-explainer for *' + p.title + '* with three parts: (1) the idea in one sentence, (2) one worked example, (3) one question you still cannot answer. ' + extra,
      '',
      'When you are finished, add the question to a note and bring it to the Mentor tab. A precise question is a learning tool.',
      '',
      '## Check yourself',
      '1. What can you now do that you could not do before this lesson?',
      '2. Which part of the idea would break first if you changed one assumption?',
      '3. Where would you use this in a real project this month?',
      '4. What is still fuzzy — and what is the smallest experiment that would clear it up?'
    ].join('\n');
  }

  function quizFallback(course, index) {
    var p = course.plan[index] || course.plan[0];
    var topic = course.topic;
    return [
      { q: 'What is the main goal of “' + p.title + '”?', options: [p.goal, 'Memorise every definition in the topic without using it', 'Watch at least two hours of video before practising', 'Skip the fundamentals and start with the hardest problem'], answer: 0, why: 'The lesson goal states the outcome you should be able to demonstrate, not the amount of content to consume.' },
      { q: 'Which activity makes the idea stick best?', options: ['Rereading the lesson until it feels familiar', 'Highlighting every sentence', 'Working one small example and then reproducing it from memory', 'Copying a full solution without changing anything'], answer: 2, why: 'Retrieval and reproduction create stronger memories than passive familiarity.' },
      { q: 'You cannot explain the big idea in your own words. What should you do?', options: ['Move on — it will make sense later', 'Ask for a simpler example, then explain it again', 'Memorise the exact wording of the lesson', 'Start a completely different course'], answer: 1, why: 'A simpler concrete example exposes the gap; memorised wording hides it.' },
      { q: 'What is the best next step after finishing this lesson?', options: ['Delete your notes to start fresh', 'Immediately start five new courses', 'Add the key ideas to flashcards and review them on schedule', 'Only read the lesson again tomorrow'], answer: 2, why: 'Spaced retrieval is what moves an idea from today’s session into long-term memory.' },
      { q: 'What makes practice “deliberate”?', options: ['Doing it for a long time without a break', 'Working on a specific weakness with feedback', 'Doing only what already feels easy', 'Watching an expert do it'], answer: 1, why: 'Deliberate practice targets a specific gap and uses feedback to adjust the next attempt.' }
    ];
  }

  function cardsFallback(course, index) {
    var p = course.plan[index] || course.plan[0];
    return [
      { f: 'What should you be able to do after “' + p.title + '”?', b: p.goal },
      { f: 'What is the first step when learning ' + course.topic + '?', b: 'Define a concrete outcome and find the smallest real example you can trace.' },
      { f: 'Why is reproducing an example from memory better than rereading it?', b: 'It forces retrieval, which strengthens memory far more than passive familiarity.' },
      { f: 'What should you do when part of “' + p.title + '” still feels fuzzy?', b: 'Write a precise question and ask the mentor for a simpler example, then explain it back.' },
      { f: 'What is the best way to end a study session?', b: 'Do a short retrieval check and add gaps to your flashcard queue.' },
      { f: 'How does this lesson connect to real work in ' + course.field + '?', b: 'Use the idea in one small real scenario this week, then note what broke.' }
    ];
  }

  function chatFallback(course, text, lesson) {
    var t = String(text || '').toLowerCase();
    var topic = course ? course.topic : 'this topic';
    var lessonTitle = lesson ? lesson.title : topic;
    if (/quiz|test me|questions/.test(t)) {
      return 'Let’s do a quick retrieval drill on **' + lessonTitle + '**.\n\n**Q1.** Explain the core idea in one sentence — no jargon.\n\n**Q2.** Give one example where it works and one where it fails.\n\n**Q3.** What is the first sign that you have misunderstood it?\n\nAnswer in your own words and I’ll score you, then point to the one thing worth revisiting.';
    }
    if (/example|show me|concrete/.test(t)) {
      return 'Here is a concrete way to see **' + lessonTitle + '**:\n\n1. Start with the simplest case: remove every feature except the one that makes the idea visible.\n2. Change exactly one input and predict what happens before you check.\n3. If your prediction was wrong, write down the assumption that failed.\n\n> A worked example is not a story you watch. It is a prediction you make.\n\nTry the smallest version now. What is your prediction for the first change?';
    }
    if (/next|what should i do|stuck/.test(t)) {
      return 'The shortest path from stuck to moving:\n\n1. **Name the exact gap.** “I don’t get ' + lessonTitle + '” is too big. “I can’t explain why step 2 follows step 1” is workable.\n2. **Shrink the example** until the gap is isolated.\n3. **Predict, then check.** Write your prediction before looking.\n4. **Explain it back** in three sentences.\n\nWhich step are you on right now — naming the gap, shrinking the example, or explaining it back?';
    }
    if (/simpl|eli5|explain/.test(t)) {
      return 'Simplify **' + lessonTitle + '** to its skeleton:\n\n- **What it is:** one sentence with no technical adjectives.\n- **Why it exists:** the problem it removes.\n- **When to use it:** the situation where it saves you.\n- **When not to:** the case where it makes things worse.\n\nHere is the pattern: *' + (course && course.plan && course.plan[0] ? course.plan[0].goal : 'Understand the core idea') + '*\n\nNow close this and say it back to me in your own words. I will only correct what is actually wrong.';
    }
    if (/code|bug|error/.test(t)) {
      return 'For a code problem, paste the smallest version that still reproduces it. Then we will work in this order:\n\n1. What did you **expect** to happen?\n2. What **actually** happened?\n3. What is the **smallest input** that shows the difference?\n4. What assumption are you making that you have not tested?\n\nYou can also open **Code Lab** — write or paste the snippet, run it, and ask for a review. I will read the actual output instead of guessing.';
    }
    if (/note|summary|summar/.test(t)) {
      return 'A summary you can actually use for **' + lessonTitle + '**:\n\n- **One-line idea:** the goal of the lesson in your own words.\n- **Mental model:** what changes, what stays fixed, and why.\n- **Worked example:** the smallest case you can reproduce.\n- **Open question:** the part you would struggle to teach today.\n- **Next action:** one 10-minute experiment.\n\nWrite those five lines in Notes, then tap “Make flashcards” so they come back on schedule.';
    }
    return 'Good question. Let’s keep it Socratic and concrete.\n\nFor **' + lessonTitle + '** inside *' + topic + '*:\n\n1. What do you already know that this reminds you of?\n2. What would change if the central assumption were false?\n3. Can you build the smallest possible example and trace it step by step?\n\nMy guess is the useful next move is to **do one tiny example and predict the result before checking**. Tell me what you predict, and I’ll help you find the exact place where your model diverges.\n\nWhat is your current best answer?';
  }

  ML.data = {
    ICONS: ICONS,
    icon: icon,
    FIELDS: FIELDS,
    LEVELS: ['Beginner', 'Intermediate', 'Advanced'],
    DAYS: [7, 14, 21, 30],
    MINUTES: [15, 30, 45, 60, 90, 120],
    PHASES: PHASES,
    ACHIEVEMENTS: ACHIEVEMENTS,
    QUOTES: QUOTES,
    CODE_SNIPPETS: CODE_SNIPPETS,
    planTemplate: planTemplate,
    lessonTemplate: lessonTemplate,
    quizFallback: quizFallback,
    cardsFallback: cardsFallback,
    chatFallback: chatFallback,
    fieldMeta: function (name) {
      for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].name === name) return FIELDS[i];
      return FIELDS[FIELDS.length - 1];
    }
  };
})();
