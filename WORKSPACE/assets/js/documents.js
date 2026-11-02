/* MegaLab — client-side document extraction (PDF, PPTX, DOCX, XLSX, text) */
(function () {
  'use strict';
  window.ML = window.ML || {};

  var MAX_CHARS = 120000;
  var pdfPromise = null;

  function cfg() { return window.MEGALAB_CONFIG || {}; }
  function makeError(code, message) { var e = new Error(message); e.code = code; return e; }

  function decodeEntities(s) {
    return String(s || '')
      .replace(/&#(\d+);/g, function (m, n) { try { return String.fromCodePoint(Number(n)); } catch (e) { return m; } })
      .replace(/&#x([0-9a-f]+);/gi, function (m, n) { try { return String.fromCodePoint(parseInt(n, 16)); } catch (e) { return m; } })
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
  }

  function cleanText(s, limit) {
    var text = String(s || '')
      .replace(/\u0000/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    limit = limit || MAX_CHARS;
    if (text.length > limit) text = text.slice(0, limit) + '\n\n[Content truncated after ' + limit + ' characters]';
    return text;
  }

  function htmlToText(html) {
    var s = String(html || '')
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ');
    return cleanText(decodeEntities(s));
  }

  function rtfToText(rtf) {
    var s = String(rtf || '');
    s = s.replace(/\\u(-?\d+)\??/g, function (m, n) {
      var code = Number(n);
      if (code < 0) code += 65536;
      try { return String.fromCharCode(code); } catch (e) { return ''; }
    });
    s = s.replace(/\\'([0-9a-f]{2})/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
    s = s.replace(/\\par[d]?/g, '\n').replace(/\\line/g, '\n').replace(/\\tab/g, '\t');
    s = s.replace(/\{\\\*[^{}]*\}/g, '');
    s = s.replace(/\\[a-z]+-?\d*\s?/gi, '');
    s = s.replace(/[{}]/g, '');
    return cleanText(decodeEntities(s));
  }

  function kindFor(name, mime) {
    name = String(name || '').toLowerCase();
    mime = String(mime || '').toLowerCase();
    if (mime === 'application/pdf' || /\.pdf$/.test(name)) return 'pdf';
    if (mime.indexOf('presentationml') !== -1 || /\.pptx$/.test(name)) return 'pptx';
    if (mime === 'application/vnd.ms-powerpoint' || /\.ppt$/.test(name)) return 'ppt';
    if (mime.indexOf('wordprocessingml') !== -1 || /\.docx$/.test(name)) return 'docx';
    if (mime === 'application/msword' || /\.doc$/.test(name)) return 'doc';
    if (mime.indexOf('spreadsheetml') !== -1 || /\.xlsx$/.test(name)) return 'xlsx';
    if (mime === 'application/vnd.ms-excel' || /\.xls$/.test(name)) return 'xls';
    if (mime === 'application/vnd.google-apps.document' || mime === 'application/vnd.google-apps.presentation') return 'google';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'gsheet';
    if (mime === 'text/html' || /\.html?$/.test(name)) return 'html';
    if (mime === 'application/rtf' || /\.rtf$/.test(name)) return 'rtf';
    if (mime.indexOf('text/') === 0 || /\.(txt|md|markdown|csv|tsv|json)$/.test(name)) return 'text';
    return 'other';
  }

  function isSupported(name, mime) {
    var k = kindFor(name, mime);
    return ['pdf', 'pptx', 'docx', 'xlsx', 'text', 'html', 'rtf', 'google', 'gsheet'].indexOf(k) !== -1;
  }

  function isLegacyOffice(kind) {
    return kind === 'ppt' || kind === 'doc' || kind === 'xls';
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfPromise) return pdfPromise;
    pdfPromise = new Promise(function (resolve, reject) {
      var url = cfg().pdfJsUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      var worker = cfg().pdfWorkerUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      var script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = function () {
        if (!window.pdfjsLib) return reject(makeError('pdfjs', 'PDF.js loaded but did not initialise.'));
        try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = worker; } catch (e) {}
        resolve(window.pdfjsLib);
      };
      script.onerror = function () { reject(makeError('pdfjs_network', 'Could not load the PDF reader.')); };
      document.head.appendChild(script);
      setTimeout(function () {
        if (!window.pdfjsLib) reject(makeError('pdfjs_timeout', 'The PDF reader took too long to load.'));
      }, 20000);
    });
    return pdfPromise;
  }

  async function extractPdfWithPdfJs(buffer) {
    var pdfjs = await loadPdfJs();
    var doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true }).promise;
    var pages = [];
    for (var i = 1; i <= doc.numPages; i++) {
      var page = await doc.getPage(i);
      var content = await page.getTextContent();
      var line = '';
      var lastY = null;
      var parts = [];
      content.items.forEach(function (item) {
        if (!item || typeof item.str !== 'string') return;
        var y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          if (line) parts.push(line);
          line = '';
        }
        line += (line && !/\s$/.test(line) ? ' ' : '') + item.str;
        lastY = y;
      });
      if (line) parts.push(line);
      pages.push(parts.join('\n'));
    }
    return { text: cleanText(pages.join('\n\n')), pages: doc.numPages, method: 'pdfjs' };
  }

  function pdfLiteralDecode(raw) {
    var s = String(raw || '');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c !== '\\') { out += c; continue; }
      var n = s[++i];
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 't') out += '\t';
      else if (n === 'b') out += '\b';
      else if (n === 'f') out += '\f';
      else if (n === '(' || n === ')' || n === '\\') out += n;
      else if (n === '\n') out += '';
      else if (n === '\r') { if (s[i + 1] === '\n') i++; }
      else if (/[0-7]/.test(n)) {
        var oct = n;
        while (oct.length < 3 && /[0-7]/.test(s[i + 1])) oct += s[++i];
        out += String.fromCharCode(parseInt(oct, 8));
      } else if (n !== undefined) out += n;
    }
    return out;
  }

  async function inflateBytes(bytes, raw) {
    if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream unavailable');
    var formats = raw ? ['deflate-raw'] : ['deflate', 'deflate-raw'];
    var last;
    for (var i = 0; i < formats.length; i++) {
      try {
        var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(formats[i]));
        var buf = await new Response(stream).arrayBuffer();
        return new Uint8Array(buf);
      } catch (e) { last = e; }
    }
    throw last || new Error('Could not decompress data');
  }

  function extractPdfStreamText(decompressed) {
    var s = '';
    try { s = new TextDecoder('latin1').decode(decompressed); } catch (e) { s = String.fromCharCode.apply(null, decompressed.subarray(0, 50000)); }
    var out = [];
    var re;
    re = /\((?:\\.|[^\\()])*\)\s*Tj/g;
    var m;
    while ((m = re.exec(s))) {
      var lit = m[0].slice(0, m[0].lastIndexOf(')') + 1);
      out.push(pdfLiteralDecode(lit.slice(1, -1)));
    }
    re = /\[((?:\((?:\\.|[^\\()])*\)|[^\]])*)\]\s*TJ/g;
    while ((m = re.exec(s))) {
      var arr = m[1];
      var inner = /\((?:\\.|[^\\()])*\)/g;
      var im;
      while ((im = inner.exec(arr))) out.push(pdfLiteralDecode(im[0].slice(1, -1)));
    }
    re = /<([0-9a-fA-F\s]+)>\s*Tj/g;
    while ((m = re.exec(s))) {
      var hex = m[1].replace(/\s+/g, '');
      var str = '';
      for (var i = 0; i + 1 < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      out.push(str);
    }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }

  async function extractPdfFallback(buffer) {
    var bytes = new Uint8Array(buffer);
    var latin = '';
    try { latin = new TextDecoder('latin1').decode(bytes); } catch (e) { for (var z = 0; z < bytes.length; z += 8192) latin += String.fromCharCode.apply(null, bytes.subarray(z, z + 8192)); }
    var chunks = [];
    var idx = 0;
    var found = 0;
    while (found < 400) {
      var start = latin.indexOf('stream', idx);
      if (start === -1) break;
      var end = latin.indexOf('endstream', start + 6);
      if (end === -1) break;
      var dictStart = Math.max(0, latin.lastIndexOf('<<', start));
      var dict = latin.slice(dictStart, start);
      var dataStart = start + 6;
      if (latin[dataStart] === '\r') dataStart++;
      if (latin[dataStart] === '\n') dataStart++;
      var raw = bytes.subarray(dataStart, end);
      if (/FlateDecode/.test(dict)) {
        try {
          var dec = await inflateBytes(raw, false);
          var txt = extractPdfStreamText(dec);
          if (txt) chunks.push(txt);
        } catch (e) {}
      } else if (!/\/Image|\/DCTDecode|\/JPXDecode/.test(dict)) {
        var plain = extractPdfStreamText(raw);
        if (plain) chunks.push(plain);
      }
      idx = end + 9;
      found++;
    }
    var text = cleanText(chunks.join('\n'));
    if (text.replace(/\s/g, '').length < 40) throw makeError('pdf_scan', 'This PDF appears to be scanned images or uses an unsupported font encoding. Export it as text, or paste the notes directly.');
    return { text: text, pages: 0, method: 'pdf-stream' };
  }

  async function extractPdf(buffer) {
    try {
      return await extractPdfWithPdfJs(buffer);
    } catch (e) {
      return await extractPdfFallback(buffer);
    }
  }

  /* ---------- ZIP / OOXML ---------- */
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  async function unzip(buffer) {
    var b = new Uint8Array(buffer);
    var eocd = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) {
      if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) throw makeError('zip', 'This Office file is not a valid ZIP package.');
    var count = u16(b, eocd + 10);
    var offset = u32(b, eocd + 16);
    var files = {};
    var decoder = new TextDecoder('utf-8');
    for (var n = 0; n < count && offset + 46 <= b.length; n++) {
      if (u32(b, offset) !== 0x02014b50) break;
      var method = u16(b, offset + 10);
      var compSize = u32(b, offset + 20);
      var nameLen = u16(b, offset + 28);
      var extraLen = u16(b, offset + 30);
      var commentLen = u16(b, offset + 32);
      var localOffset = u32(b, offset + 42);
      var name = decoder.decode(b.subarray(offset + 46, offset + 46 + nameLen)).replace(/\\/g, '/');
      var localNameLen = u16(b, localOffset + 26);
      var localExtra = u16(b, localOffset + 28);
      var dataStart = localOffset + 30 + localNameLen + localExtra;
      var comp = b.subarray(dataStart, dataStart + compSize);
      var out = null;
      if (method === 0) out = comp;
      else if (method === 8) out = await inflateBytes(comp, true);
      if (out) files[name] = { bytes: out, text: function () { return decoder.decode(this.bytes); } };
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  function xmlText(xml, tag) {
    var out = [];
    var re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
    var m;
    while ((m = re.exec(xml))) out.push(decodeEntities(m[1]));
    return out.join(' ');
  }

  function docxText(files) {
    var doc = files['word/document.xml'];
    if (!doc) throw makeError('docx', 'The Word file has no document.xml.');
    var xml = doc.text();
    var body = xml
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, '');
    return { text: cleanText(decodeEntities(body)), method: 'docx-xml' };
  }

  function pptxText(files) {
    var names = Object.keys(files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); });
    names.sort(function (a, b) { return Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]); });
    if (!names.length) throw makeError('pptx', 'The presentation has no slides.');
    var slides = names.map(function (n, i) {
      var xml = files[n].text();
      var title = xmlText(xml, 'a:t').replace(/\s+/g, ' ').trim();
      return 'Slide ' + (i + 1) + '\n' + title;
    });
    var notes = Object.keys(files).filter(function (n) { return /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n); });
    if (notes.length) {
      slides.push('\nSpeaker notes\n' + notes.map(function (n) { return xmlText(files[n].text(), 'a:t'); }).join('\n'));
    }
    return { text: cleanText(slides.join('\n\n')), pages: names.length, method: 'pptx-xml' };
  }

  function xlsxText(files) {
    var shared = [];
    if (files['xl/sharedStrings.xml']) {
      var xml = files['xl/sharedStrings.xml'].text();
      var re = /<si[^>]*>([\s\S]*?)<\/si>/g;
      var m;
      while ((m = re.exec(xml))) shared.push(xmlText(m[1], 't'));
    }
    var sheets = Object.keys(files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); });
    var lines = [];
    sheets.forEach(function (n, i) {
      var xml = files[n].text();
      var rows = xml.match(/<row[\s\S]*?<\/row>/g) || [];
      lines.push('Sheet ' + (i + 1));
      rows.slice(0, 500).forEach(function (row) {
        var cells = [];
        var cre = /<c[^>]*?(?:t="([^"]*)")?[^>]*>([\s\S]*?)<\/c>/g;
        var cm;
        while ((cm = cre.exec(row))) {
          var v = xmlText(cm[2], 'v')[0] || xmlText(cm[2], 't')[0] || '';
          if (cm[1] === 's' && shared[Number(v)] !== undefined) v = shared[Number(v)];
          cells.push(v);
        }
        if (cells.join('').trim()) lines.push(cells.join('\t'));
      });
    });
    return { text: cleanText(lines.join('\n')), method: 'xlsx-xml' };
  }

  async function extractOffice(buffer, kind) {
    var files = await unzip(buffer);
    if (kind === 'docx') return docxText(files);
    if (kind === 'pptx') return pptxText(files);
    if (kind === 'xlsx') return xlsxText(files);
    throw makeError('office', 'Unsupported Office format.');
  }

  async function extractBuffer(buffer, name, mime) {
    name = String(name || 'document');
    var kind = kindFor(name, mime);
    if (!buffer || !buffer.byteLength) throw makeError('empty', 'That file is empty.');
    if (kind === 'pdf') {
      var pdf = await extractPdf(buffer);
      return Object.assign({ name: name, mime: mime || 'application/pdf', kind: kind, bytes: buffer.byteLength }, pdf);
    }
    if (kind === 'docx' || kind === 'pptx' || kind === 'xlsx') {
      var office = await extractOffice(buffer, kind);
      return Object.assign({ name: name, mime: mime || '', kind: kind, bytes: buffer.byteLength }, office);
    }
    if (isLegacyOffice(kind)) {
      throw makeError('legacy_office', 'Legacy .' + kind + ' files are not supported. Save it as .' + (kind === 'ppt' ? 'pptx' : kind === 'doc' ? 'docx' : 'xlsx') + ' or PDF, then try again.');
    }
    var text = '';
    if (kind === 'html') text = htmlToText(new TextDecoder('utf-8').decode(new Uint8Array(buffer)));
    else if (kind === 'rtf') text = rtfToText(new TextDecoder('utf-8').decode(new Uint8Array(buffer)));
    else if (kind === 'gsheet') text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    else text = cleanText(new TextDecoder('utf-8').decode(new Uint8Array(buffer)));
    return { text: text, name: name, mime: mime || '', kind: kind, bytes: buffer.byteLength, pages: 0, method: 'text' };
  }

  function extractFile(file) {
    if (!file) return Promise.reject(makeError('empty', 'Choose a file first.'));
    var kind = kindFor(file.name, file.type);
    if (isLegacyOffice(kind)) {
      return Promise.reject(makeError('legacy_office', 'Legacy Office files are not supported. Save as PDF or the modern format first.'));
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        extractBuffer(reader.result, file.name, file.type).then(resolve, reject);
      };
      reader.onerror = function () { reject(makeError('read', 'Could not read that file on this device.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function extractPlain(text, name) {
    return { text: cleanText(text), name: name || 'Pasted notes', kind: 'text', mime: 'text/plain', pages: 0, bytes: String(text || '').length, method: 'pasted' };
  }

  ML.docs = {
    MAX_CHARS: MAX_CHARS,
    kindFor: kindFor,
    isSupported: isSupported,
    isLegacyOffice: isLegacyOffice,
    extractFile: extractFile,
    extractBuffer: extractBuffer,
    extractPlain: extractPlain,
    cleanText: cleanText,
    htmlToText: htmlToText,
    rtfToText: rtfToText,
    accept: '.pdf,.pptx,.docx,.xlsx,.txt,.md,.csv,.html,.htm,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
})();
