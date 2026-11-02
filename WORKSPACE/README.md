# MegaLab

**Learn anything. Actually remember it.**

MegaLab is a static, local-first study lab. It turns one concrete goal into a day-by-day course, teaches each lesson, quizzes at the right moment, schedules spaced-repetition cards, tracks deep-work sessions, and gives you a real JavaScript bench for running and reviewing code.

The v3 release adds **Google Classroom + Google Drive ingestion** and a **Gen-Z-style game builder**: teacher PDFs, slides and docs become quiz battles, fill-in-the-blank rounds, matching games, timeline quests, teach-back challenges, code challenges, speed cards and concept maps.

No build step. No MegaLab backend. No ad tracking.

## Quick start

1. Upload the static files to any HTTPS host.
2. Add your OAuth client ID to `google-client-id.js`.
3. Open the deployment URL. Google Sign-In cannot run from `file://`; that restriction comes from Google.

You can also use the local note pipeline without connecting Google: open **Classroom**, drop a file, or paste notes. Text extraction happens in the browser.

## Google configuration

### OAuth client

1. Open the [Google Cloud console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID of type **Web application**.
3. Add your exact production origin under **Authorized JavaScript origins**, for example `https://megalab.example.com`. Add `http://localhost:5173` only for local development.
4. Do **not** add a redirect URI; the Google Identity Services token flow does not need one.
5. Paste the client ID into `google-client-id.js`:

```js
window.MEGALAB_CONFIG = {
  appName: "MegaLab",
  version: "3.0.0",
  googleClientId: "YOUR_ID.apps.googleusercontent.com",
  oneTap: false,
  sessionDays: 30,
  supportEmail: "",
  storagePrefix: "megalab",
  aiEndpoint: "",
  pdfJsUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfWorkerUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
};
```

The client ID is public by design because it is sent to Google from the browser. **Never put a Google OAuth client secret in a static site.**

### APIs and scopes

Enable these APIs in the same Google Cloud project:

- Google Classroom API
- Google Drive API
- Google Identity Services (for the token client)

MegaLab requests:

- `openid`, `email`, `profile`
- `classroom.courses.readonly`
- `classroom.coursework.students.readonly`
- `classroom.courseworkmaterials.readonly`
- `drive.readonly` (read teacher materials and export Google Docs/Slides/Sheets)
- `drive.file` (create and update only the app's own Drive workspace folder and files)

School Workspace accounts may block third-party OAuth apps. If the consent screen says the app is blocked, ask the Workspace administrator to allow the client ID.

## Google Classroom workflow

1. Sign in with Google, then open **Classroom -> Connect Classroom**.
2. MegaLab lists active classes, assignments and teacher materials, and stores a local index of the files it can read.
3. Press **Build pack** on a file or **Build from every file** in a class. The file is downloaded only at that moment, text is extracted in the browser, and games/questions/cards are generated.
4. Open **Learning Games** to play. Scores, XP and best results are stored per game.
5. **Drive sync** writes a workspace snapshot plus daily backups to a private `MegaLab_Workspace` folder in the user's own Drive. No MegaLab server sees the data.

### Supported source formats

- PDF (text-based; PDF.js first, then a stream parser fallback)
- PPTX, DOCX, XLSX (modern OOXML packages)
- Google Docs, Slides and Sheets (exported through Drive)
- TXT, Markdown, CSV/TSV, HTML, RTF
- Pasted notes

Scanned/image-only PDFs need OCR before import. Legacy `.ppt`, `.doc` and `.xls` are rejected with a clear message; save them as the modern format or PDF. Office extraction requires a browser with `DecompressionStream` (current Chromium, Firefox or Safari).

## Features

| Area | What it does |
| --- | --- |
| Onboarding | Google Identity Services sign-in, 30-day sliding local session, per-account data |
| Course builder | Goal, field, level, length and daily minutes -> adaptive syllabus |
| Lessons | Streaming lesson generation, markdown, examples, practice, notes, quiz, card generation, rewrite |
| Mentor | Course-aware Socratic chat, suggested prompts, copy, clear, lesson/course context |
| Flashcards | SM-2-style scheduling, reveal and rate, keyboard shortcuts, deck health, manual cards |
| Focus studio | 25/50/15/5-minute modes, persistent timer, pause/resume, early finish, task, distraction log, chime |
| Quiz | Five retrieval questions, immediate explanations, score, XP, achievement checks |
| Planner | Week view, manual tasks, one-click auto-plan from remaining lessons and due cards |
| Notes | Searchable notes, course and lesson links, markdown, edit/delete |
| Progress | Activity chart, streaks, course completion, review load, focus history, coach insight |
| Code Lab | Editable JavaScript sandbox in a Web Worker with timeout, console capture, review modes |
| Classroom | OAuth sync of classes, assignments and teacher materials; class pages and file index |
| Note library | Local upload/paste, browser-side extraction, 24 saved sources, one-click pack regeneration |
| Learning games | 8 game types generated from notes, with per-game scoring, XP, best result and replay |
| Practice questions | Multiple choice, true/false and short answer; source filters, search, reveal explanation |
| Drive sync | Workspace snapshot + daily backups in the user's Drive, conflict-aware pull/push |
| Achievements | XP levels, streaks, review/quiz/focus/code/game milestones, unlock toasts |
| Profile | Account, avatar upload and crop, preferences, theme, goals, sound, reminders, week start |
| Data control | Export JSON, import JSON, reset workspace, delete account data, pull/push Drive snapshot |
| PWA | Installable manifest, offline app shell, responsive sidebar and mobile bottom navigation |
| Accessibility | Keyboard command palette, focus states, skip link, ARIA labels, reduced-motion support |

### Keyboard shortcuts

- `Ctrl/Cmd + K` - command palette
- `Space` - reveal a flashcard or start/pause focus
- `1`-`4` - rate a revealed flashcard
- `Esc` - close a modal or the palette
- `Enter` - send mentor chat; `Shift + Enter` for a new line

## Architecture

```text
index.html                     landing page + app shell
google-client-id.js            public Google OAuth/config values only
assets/
  css/
    base.css                   tokens, resets, primitives
    landing.css                marketing page and boot screen
    app.css                    shell, dashboard, courses, lessons, mentor
    components.css             focus, cards, notes, code lab, classroom, games, profile
  js/
    data.js                    ML.data - icons, fields, phases, generators
    store.js                   ML.store - persistence, XP, SM-2, Drive sync, games/questions
    ai.js                      ML.ai - optional AI bridge + deterministic offline fallbacks
    auth.js                    ML.auth - Google token flow, scopes, session
    ui.js                      ML.ui - helpers, shell, dashboard, courses, lessons
    documents.js               ML.docs - PDF/PPTX/DOCX/XLSX/text extraction and ZIP parser
    games.js                   ML.games - 8 game types, questions, cards, offline generation
    classroom.js               ML.classroom - Classroom/Drive REST, workspace sync, wrappers
    views.js                   ML.views - mentor, cards, focus, progress, classroom, games,
                               questions, notes, achievements, code lab, profile
    app.js                     boot, router, actions, game runtime, timer, sandbox
sw.js                          offline app-shell cache
site.webmanifest               install metadata
MegaLab.html                   legacy reference only
```

Script order is intentional: config, data, store, AI, auth, UI, documents, games, classroom, views, app.

### Optional AI bridge

MegaLab works without any AI service. A deterministic offline tutor generates plans, lessons, quizzes, cards, games, questions and code reviews.

To use live AI, provide one of:

- `window.megalabAI` / `window.MEGALAB_AI` with a `.use(taskName)` method that returns a streaming function, or
- `MEGALAB_CONFIG.aiEndpoint`: a URL that accepts `POST { prompt, stream }` and returns `{ text }` or plain text.

The legacy `window.claude` bridge is still recognized for host compatibility. The UI labels the provider generically as **AI**. The status is shown in **Profile -> About** and in the top bar.

## Data and privacy

- Workspace data lives in `localStorage` under `megalab:v2:<user-id>`.
- The sign-in session lives under `megalab:session:v2`; it refreshes for 30 days on return.
- Google OAuth access tokens are held in `sessionStorage` for the current tab and expire automatically. They are never written to `localStorage`.
- Logging out keeps local learning data. Use **Delete account data** to remove it.
- **Export JSON** creates a backup you control.
- Drive sync creates `MegaLab_Workspace/megalab-workspace.json` plus up to 12 daily backups in the user's own Drive.
- No analytics, ads or MegaLab servers. External requests are limited to Google Identity Services, Google Classroom/Drive, the optional AI endpoint, Google Fonts, and PDF.js from the configured CDN.

This is client-side authentication for a personal learning workspace, not a security boundary for sensitive multi-user data. A production service that stores private data server-side should add a backend that verifies Google ID tokens and enforces authorization.

## Deploy

Any static host works: GitHub Pages, Cloudflare Pages, Netlify, Vercel, S3, or a plain web server.

1. Upload the repository contents.
2. Add your production origin to the OAuth client's authorized JavaScript origins.
3. Set `googleClientId` in `google-client-id.js`.
4. Enable the Classroom and Drive APIs.
5. Serve over HTTPS.
6. Bump the `CACHE` name in `sw.js` when shipping changes so installed clients refresh.

## Verification

```powershell
node --check assets/js/data.js
node --check assets/js/store.js
node --check assets/js/ai.js
node --check assets/js/auth.js
node --check assets/js/ui.js
node --check assets/js/documents.js
node --check assets/js/games.js
node --check assets/js/classroom.js
node --check assets/js/views.js
node --check assets/js/app.js
```

Manual smoke path: landing -> Google sign-in -> Classroom connect/sync -> build pack -> play a game -> practice questions -> course -> lesson -> quiz -> mentor -> cards -> focus -> planner -> notes -> code lab -> profile -> export -> Drive sync.

## Known limits

- Offline lessons and reviews are scaffolds; verify important facts against primary sources.
- The JavaScript sandbox runs in a Web Worker with a 3-second timeout. It is not a security boundary for hostile code.
- Google One Tap is disabled by default.
- Google API access is tab-scoped. Closing the tab or letting the token expire requires an explicit reconnect; a static app cannot silently refresh Google tokens forever.
- Google does not allow OAuth from `file://`, so Classroom and Drive features need an HTTPS or localhost origin.
- Scanned PDFs need OCR first. Legacy `.ppt/.doc/.xls` files are not parsed.
- PDF extraction tries PDF.js from a CDN first; if the CDN is blocked it falls back to a local stream parser, which handles many text PDFs but not every font encoding.
- There is no multi-device backend. Cross-device continuity comes from the user's own Google Drive snapshot.
