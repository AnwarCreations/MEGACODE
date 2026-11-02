/* Node smoke test for the static data, document, game and view pipeline. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const store = new Map();
const session = new Map();

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  TextDecoder,
  TextEncoder,
  URL,
  Blob,
  File: typeof File !== 'undefined' ? File : class File {},
  Intl,
  Date,
  Math,
  JSON,
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  sessionStorage: {
    getItem: (k) => (session.has(k) ? session.get(k) : null),
    setItem: (k, v) => session.set(k, String(v)),
    removeItem: (k) => session.delete(k)
  }
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

function load(file) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/* ---------- CRC32 + stored ZIP writer (for DOCX/PPTX extraction tests) ---------- */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  Object.keys(files).forEach((name) => {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(files[name]) ? files[name] : Buffer.from(files[name], 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  });
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat(chunks.concat([centralBuf, eocd]));
}

const sample = [
  'Photosynthesis is the process plants use to convert light energy into chemical energy stored in glucose.',
  'Chlorophyll absorbs mostly red and blue wavelengths and reflects green light, which is why leaves look green.',
  'The light-dependent reactions happen in the thylakoid membranes and produce ATP and NADPH for the next stage.',
  'The Calvin cycle uses carbon dioxide, ATP and NADPH to build sugar in the stroma of the chloroplast.',
  'Cellular respiration reverses the overall equation and releases energy from glucose inside the mitochondria.',
  'Enzymes lower activation energy by holding substrates in the right orientation for a reaction.',
  'Mitosis produces two genetically identical daughter cells for growth and tissue repair.',
  'Meiosis halves the chromosome number and creates genetic variation through crossing over.',
  'DNA replication is semi-conservative because each new double helix keeps one original strand.',
  'Natural selection favours heritable traits that improve survival and reproduction in a population.',
  'In 1965 Robert Hooke observed cork cells and coined the term cell for the tiny compartments.',
  'In 1988 Matthias Schleiden concluded that all plants are made of cells.',
  'In 2005 Rudolf Virchow proposed that every cell comes from an existing cell.',
  'Homeostasis keeps internal conditions stable through negative feedback loops and sensor systems.',
  'Diffusion moves particles from high concentration to low concentration without using extra energy.',
  'Osmosis is the diffusion of water across a selectively permeable membrane toward higher solute concentration.',
  'Active transport uses ATP to move ions against their concentration gradient through membrane proteins.',
  'A hypothesis is a testable prediction, while a theory is a well-supported explanation of evidence.',
  'Controlled experiments change one independent variable and keep the other conditions constant.',
  'A good conclusion distinguishes correlation from causation and names the remaining uncertainty.',
  'Example code:\n```js\nfunction rate(total, hits) {\n  return Math.round(hits / total * 100);\n}\nconsole.log(rate(10, 7));\n```',
  'Peer review checks methods, evidence and reasoning before a scientific claim becomes accepted.'
].join(' ');

async function main() {
  load('assets/js/data.js');
  load('assets/js/store.js');
  load('assets/js/documents.js');
  load('assets/js/games.js');
  load('assets/js/ui.js');
  load('assets/js/views.js');
  sandbox.ML.auth = {
    user: () => ({ name: 'Smoke Tester', email: 'smoke@example.com' }),
    isSignedIn: () => true,
    isConnected: () => false,
    isConfigured: () => true,
    config: () => ({ sessionDays: 30 }),
    updateUser: () => null,
    markConnected: () => null,
    signOut: () => null
  };

  const ML = sandbox.ML;

  /* Document extraction: text, HTML, RTF and OOXML. */
  const plain = await ML.docs.extractBuffer(new TextEncoder().encode(sample).buffer, 'notes.txt', 'text/plain');
  assert(plain.kind === 'text' && plain.text.indexOf('Photosynthesis') !== -1, 'plain text extraction failed');

  const html = await ML.docs.extractBuffer(new TextEncoder().encode('<h1>Cell</h1><p>Mitochondria &amp; ATP</p>').buffer, 'notes.html', 'text/html');
  assert(html.text.indexOf('Mitochondria & ATP') !== -1, 'HTML extraction failed');

  const rtf = await ML.docs.extractBuffer(new TextEncoder().encode('{\\rtf1\\ansi Cell \\b biology\\b0 \\par ATP is energy}').buffer, 'notes.rtf', 'application/rtf');
  assert(rtf.text.indexOf('ATP is energy') !== -1, 'RTF extraction failed');

  const docx = zipStore({
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Photosynthesis converts light into glucose.</w:t></w:r></w:p><w:p><w:r><w:t>Chlorophyll reflects green light.</w:t></w:r></w:p></w:body></w:document>'
  });
  const docxResult = await ML.docs.extractBuffer(docx, 'lesson.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert(docxResult.kind === 'docx' && docxResult.text.indexOf('Photosynthesis') !== -1, 'DOCX extraction failed');

  const pptx = zipStore({
    'ppt/slides/slide1.xml': '<p:sld><a:t>Cell Biology</a:t><a:t>Enzymes lower activation energy.</a:t></p:sld>',
    'ppt/slides/slide2.xml': '<p:sld><a:t>Osmosis moves water.</a:t></p:sld>'
  });
  const pptxResult = await ML.docs.extractBuffer(pptx, 'lecture.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert(pptxResult.kind === 'pptx' && pptxResult.text.indexOf('Cell Biology') !== -1, 'PPTX extraction failed');

  let legacyRejected = false;
  try {
    await ML.docs.extractBuffer(Buffer.from('old'), 'old.ppt', 'application/vnd.ms-powerpoint');
  } catch (e) {
    legacyRejected = e.code === 'legacy_office';
  }
  assert(legacyRejected, 'legacy Office rejection failed');

  /* Store, source library, game generation and persistence. */
  ML.store.bind({ id: 'smoke@example.com', name: 'Smoke Tester' });
  const source = ML.store.addSource({
    name: 'Biology lecture 4.pdf',
    kind: 'pdf',
    text: sample,
    method: 'pasted',
    courseId: 'c1',
    courseName: 'Biology 101'
  });
  assert(source && source.chars > 500, 'source was not saved');

  const games = await ML.games.generateGames(sample, 'Biology', { sourceId: source.id, sourceName: source.name, useAI: false });
  assert(games.length >= 5, 'expected at least 5 offline games, got ' + games.length);
  games.forEach((g) => {
    assert(g.id && g.type && g.data, 'game missing id/type/data: ' + g.type);
    assert(ML.games.typeInfo(g.type).id === g.type, 'unknown game type: ' + g.type);
  });

  const questions = await ML.games.generateQuestions(sample, 'Biology', { sourceId: source.id, sourceName: source.name, count: 12, useAI: false });
  assert(questions.length >= 6, 'expected questions, got ' + questions.length);
  questions.forEach((q) => assert(q.id && q.q && Array.isArray(q.options), 'bad question shape'));

  const cards = await ML.games.generateCards(sample, 'Biology', { sourceId: source.id, sourceName: source.name, count: 12, useAI: false });
  assert(cards.length >= 4, 'expected cards, got ' + cards.length);

  const addedGames = ML.store.addGames(games);
  const addedQuestions = ML.store.addQuestions(questions, { id: source.id, name: source.name });
  const addedCards = ML.store.addCards(cards, 'c1');
  assert(addedGames === games.length, 'games were not persisted');
  assert(addedQuestions === questions.length, 'questions were not persisted');
  assert(addedCards === cards.length, 'cards were not persisted');
  assert(ML.store.listGames().length === games.length, 'game list mismatch');
  assert(ML.store.getSource(source.id), 'source lookup failed');
  assert(ML.store.ensureClassroom().questionSources.length === 1, 'question source was not recorded');

  const result = ML.store.recordGame(games[0].id, 3, 4, { game: games[0].type });
  assert(result.pct === 75 && result.xp > 0, 'game scoring failed');
  assert(ML.store.gameResult(games[0].id).pct === 75, 'game result was not stored');

  /* Views render against the real persisted state. */
  ML.store.ensureClassroom().courses = [{ id: 'c1', name: 'Biology 101', section: 'Period 2', courseState: 'ACTIVE' }];
  ML.store.ensureClassroom().syncedContent = [{
    courseId: 'c1', courseName: 'Biology 101', courseSection: 'Period 2', courseState: 'ACTIVE',
    courseWork: [{ title: 'Lab report', state: 'PUBLISHED', workType: 'ASSIGNMENT' }],
    files: [{ id: 'drive1', name: 'lecture.pdf', mimeType: 'application/pdf', kind: 'pdf', study: true, materialTitle: 'Lecture' }]
  }];
  const classroomHtml = ML.views.classroom();
  assert(classroomHtml.indexOf('Biology 101') !== -1, 'classroom view did not render the class');
  assert(classroomHtml.indexOf('Build pack') !== -1, 'classroom view did not render pack actions');
  const courseHtml = ML.views.classroomCourse(null, 'c1');
  assert(courseHtml.indexOf('Lab report') !== -1, 'classroom course view did not render assignments');
  const gameHtml = ML.views.classroomGame(null, games[0].id);
  assert(gameHtml.indexOf('data-game-id="' + games[0].id + '"') !== -1, 'game view did not render the runtime');
  const questionsHtml = ML.views.classroomQuestions();
  assert(questionsHtml.indexOf('question-card') !== -1, 'questions view did not render cards');

  /* A fresh read from localStorage keeps generated content. */
  const reloaded = ML.store.bind({ id: 'smoke@example.com', name: 'Smoke Tester' });
  assert(Object.keys(reloaded.classroom.generatedGames).length === games.length, 'games did not survive reload');
  assert(reloaded.classroom.generatedQuestions.length === questions.length, 'questions did not survive reload');

  console.log('SMOKE OK');
  console.log('  docs: txt/html/rtf/docx/pptx + legacy rejection');
  console.log('  games: ' + games.length + ' (' + games.map((g) => g.type).join(', ') + ')');
  console.log('  questions: ' + questions.length + ', cards: ' + cards.length);
  console.log('  views: classroom, course, game, questions');
  console.log('  persistence: reload verified');
}

main().catch((err) => {
  console.error('SMOKE FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
