/* ASM editor. Requires app.js (loaded first).

   HOW SAVING WORKS: the editor commits data/library.json straight into your GitHub repository
   using GitHub's own API (github.com), directly from the browser. There is no server of ours.
   1. Enter your owner/repository and a fine-grained personal access token (Contents: read & write
      on this one repository). The token is typed in at runtime and kept only in this browser;
      it is NEVER part of the website's files.
   2. Click "Save to GitHub". GitHub stores the commit, GitHub Pages republishes the site
      (usually 1-2 minutes) and every device then sees the new data.
   Without the token nobody can change the site: visitors who open this page can only edit
   their own browser's draft. Unsaved changes are kept as a draft in this browser (localStorage).
   "Download library.json" / "Import" remain as a manual backup route. */

const KEY = 'asm-draft-v1';
const TYPES = { heading: 'Heading', paragraph: 'Paragraph', bullets: 'Bullet list', numbered: 'Numbered list', table: 'Table', note: 'Important note', example: 'Example', image: 'Image', formula: 'Formula / equation' };
const HINT = {
  bullets: 'One item per line.', numbered: 'One item per line.',
  table: 'One row per line, cells separated by |. The first row is the header.',
  image: 'Path to an image file in the repository (e.g. images/graph.png) or a full https:// URL.',
  formula: 'Plain text, shown in a fixed-width font.'
};
let D = { subjects: [] }, sel = { s: null, t: null }, drafted = false, msg = '';

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); drafted = true; } catch (e) { } };
const change = () => { save(); draw(); };
const mv = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; change(); };
const rm = (arr, i, w) => { if (confirm('Delete ' + (typeof w === 'function' ? w() : w) + '?')) { arr.splice(i, 1); change(); } };
const ctl = (arr, i, w) => [
  $('button', { type: 'button', onclick: () => mv(arr, i, -1) }, 'Move up'), ' ',
  $('button', { type: 'button', onclick: () => mv(arr, i, 1) }, 'Move down'), ' ',
  $('button', { type: 'button', onclick: () => rm(arr, i, w) }, 'Delete')];
const fld = (o, k, label, multi) => $('p', {}, $('label', {}, label + ': ',
  $(multi ? 'textarea' : 'input', multi ? { rows: 4, cols: 60, value: o[k] || '', oninput: e => { o[k] = e.target.value; save(); } }
    : { size: 50, value: o[k] || '', oninput: e => { o[k] = e.target.value; save(); } })));

function nameList(arr, what, cur, pick) {
  return arr.length ? $('ol', {}, arr.map((o, i) => $('li', {},
    $('input', { size: 30, value: o.name, oninput: e => { o.name = e.target.value; save(); } }), ' ',
    $('button', { type: 'button', onclick: () => pick(o) }, o.id === cur ? 'Selected' : 'Open'), ' ',
    ctl(arr, i, () => what + ' "' + o.name + '"')))) : $('p', {}, 'No ' + what + 's yet.');
}
const addNamed = (arr, what, mk) => $('p', {}, $('button', {
  type: 'button', onclick: () => {
    const n = prompt('Name of the new ' + what + ':');
    if (n && n.trim()) { const o = mk(n.trim()); arr.push(o); if (what === 'subject') sel = { s: o.id, t: null }; else sel.t = o.id; change(); }
  }
}, 'Add ' + what));

function flashUI(T) {
  return $('div', {}, $('hr'), $('h2', {}, 'Flashcards'),
    T.flashcards.length ? null : $('p', {}, 'No flashcards yet.'),
    T.flashcards.map((c, i) => $('fieldset', {}, $('legend', {}, 'Card ' + (i + 1)),
      fld(c, 'q', 'Question', 1), fld(c, 'a', 'Answer', 1), ctl(T.flashcards, i, 'this flashcard'))),
    $('button', { type: 'button', onclick: () => { T.flashcards.push({ q: '', a: '' }); change(); } }, 'Add flashcard'));
}

function quizUI(T) {
  return $('div', {}, $('hr'), $('h2', {}, 'Quiz questions'),
    T.quiz.length ? null : $('p', {}, 'No quiz questions yet.'),
    T.quiz.map((q, i) => $('fieldset', {}, $('legend', {}, 'Question ' + (i + 1)),
      fld(q, 'q', 'Question', 1),
      $('p', {}, 'Answer choices (select the correct one):'),
      $('ol', {}, q.choices.map((c, k) => $('li', {},
        $('input', { type: 'radio', name: 'correct' + i, checked: q.correct === k, onchange: () => { q.correct = k; save(); } }), ' ',
        $('input', { size: 40, value: c, oninput: e => { q.choices[k] = e.target.value; save(); } }), ' ',
        $('button', { type: 'button', onclick: () => { q.choices.splice(k, 1); if (k < q.correct) q.correct--; else if (k === q.correct) q.correct = 0; change(); } }, 'Delete choice')))),
      $('p', {}, $('button', { type: 'button', onclick: () => { q.choices.push(''); change(); } }, 'Add choice')),
      fld(q, 'explain', 'Explanation (optional)', 1),
      ctl(T.quiz, i, 'this question'))),
    $('button', { type: 'button', onclick: () => { T.quiz.push({ q: '', choices: ['', ''], correct: 0, explain: '' }); change(); } }, 'Add quiz question'));
}

function contentUI(T) {
  const ty = $('select', {}, Object.entries(TYPES).map(([k, v]) => $('option', { value: k }, v)));
  return $('div', {}, $('hr'), $('h2', {}, 'Content of "' + T.name + '"'),
    T.blocks.length ? T.blocks.map((b, i) => $('fieldset', {}, $('legend', {}, 'Block ' + (i + 1)),
      $('p', {}, 'Type: ', $('select', { onchange: e => { b.type = e.target.value; change(); } },
        Object.entries(TYPES).map(([k, v]) => $('option', { value: k, selected: k === b.type }, v)))),
      HINT[b.type] ? $('p', {}, $('i', {}, HINT[b.type])) : null,
      fld(b, 'text', b.type === 'image' ? 'Image path' : 'Text', b.type !== 'image' && b.type !== 'heading'),
      b.type === 'image' ? fld(b, 'alt', 'Alt text') : null,
      ctl(T.blocks, i, 'this block'))) : $('p', {}, 'No content blocks yet.'),
    $('p', {}, 'Add: ', ty, ' ', $('button', { type: 'button', onclick: () => { T.blocks.push({ type: ty.value, text: '', alt: '' }); change(); } }, 'Add block')),
    flashUI(T), quizUI(T));
}

function check() {
  const r = [];
  D.subjects.forEach(s => {
    if (!s.name.trim()) r.push('A subject has no name.');
    s.topics.forEach(t => {
      if (!t.name.trim()) r.push('A topic in "' + s.name + '" has no name.');
      t.quiz.forEach((q, i) => {
        if (q.choices.length < 2) r.push(s.name + ' / ' + t.name + ': quiz question ' + (i + 1) + ' needs at least 2 choices.');
        else if (q.correct < 0 || q.correct >= q.choices.length) r.push(s.name + ' / ' + t.name + ': quiz question ' + (i + 1) + ' has no correct answer selected.');
      });
    });
  });
  return r;
}

function exp() {
  const bad = check();
  if (bad.length && !confirm('Problems found:\n' + bad.join('\n') + '\n\nExport anyway?')) return;
  const u = URL.createObjectURL(new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' }));
  const a = $('a', { href: u, download: 'library.json' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

/* ---------- GitHub connection ---------- */
const CFG = 'asm-gh', TK = 'asm-gh-token';
const seg = location.pathname.split('/')[1] || '';
const onPages = location.hostname.endsWith('.github.io');
const cfg = { owner: onPages ? location.hostname.split('.')[0] : '', repo: onPages ? (seg && !seg.includes('.') ? seg : location.hostname) : '', branch: '', path: 'data/library.json', remember: false };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG) || '{}')); } catch (e) { }
const getToken = () => { try { return sessionStorage.getItem(TK) || localStorage.getItem(TK) || ''; } catch (e) { return ''; } };
let tokenVal = getToken(), loadedSha = null;

function remember() {
  try {
    localStorage.setItem(CFG, JSON.stringify(cfg));
    sessionStorage.removeItem(TK); localStorage.removeItem(TK);
    if (tokenVal) (cfg.remember ? localStorage : sessionStorage).setItem(TK, tokenVal);
  } catch (e) { }
}
const b64 = s => { const u = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < u.length; i += 8192) x += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(x); };

async function gh(method, accept, body) {
  if (!cfg.owner || !cfg.repo || !cfg.path) throw new Error('Fill in owner, repository and data file path.');
  const url = 'https://api.github.com/repos/' + enc(cfg.owner) + '/' + enc(cfg.repo) + '/contents/' + cfg.path.split('/').map(enc).join('/') + (method === 'GET' && cfg.branch ? '?ref=' + enc(cfg.branch) : '');
  const h = { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' };
  if (tokenVal) h.Authorization = 'Bearer ' + tokenVal;
  if (body) h['Content-Type'] = 'application/json';
  return fetch(url, { method, headers: h, body: body && JSON.stringify(body), cache: 'no-store' });
}
async function fail(r) {
  let m = ''; try { m = (await r.json()).message; } catch (e) { }
  const why = {
    401: 'the token was rejected (wrong or expired)',
    403: 'not allowed: the token needs Contents read and write permission on this repository (or a rate limit was hit)',
    404: 'not found: check owner, repository, branch and file path, and that the token can access the repository',
    409: 'the file changed on GitHub while saving; use Load from GitHub and try again',
    422: 'GitHub refused the update (check the branch name)'
  }[r.status] || 'unexpected response';
  return new Error('GitHub says HTTP ' + r.status + ': ' + why + (m ? ' (' + m + ')' : ''));
}
async function pull() {
  const j = await gh('GET', 'application/vnd.github+json'); if (!j.ok) throw await fail(j);
  const sha = (await j.json()).sha;
  const r = await gh('GET', 'application/vnd.github.raw+json'); if (!r.ok) throw await fail(r);
  D = norm(JSON.parse(await r.text())); loadedSha = sha; sel = { s: null, t: null };
}
async function loadGH() {
  if (drafted && !confirm('Replace your unsaved changes with the version on GitHub?')) return;
  remember(); msg = 'Loading from GitHub...'; draw();
  try { await pull(); try { localStorage.removeItem(KEY); } catch (e) { } drafted = false; msg = 'Loaded the current file from GitHub.'; }
  catch (e) { msg = 'Load failed: ' + e.message; }
  draw();
}
async function saveGH() {
  const bad = check();
  if (bad.length && !confirm('Problems found:\n' + bad.join('\n') + '\n\nSave anyway?')) return;
  remember();
  if (!tokenVal) { msg = 'Enter your GitHub token first (see README.md).'; return draw(); }
  msg = 'Saving to GitHub...'; draw();
  try {
    const g = await gh('GET', 'application/vnd.github+json');
    let sha;
    if (g.ok) sha = (await g.json()).sha; else if (g.status !== 404) throw await fail(g);
    if (sha && loadedSha && sha !== loadedSha && !confirm('The file on GitHub has changed since you loaded it (maybe saved from another device). Overwrite it with your version?')) { msg = 'Save cancelled.'; return draw(); }
    const body = { message: 'Update study library via ASM editor', content: b64(JSON.stringify(D, null, 2) + '\n'), sha };
    if (cfg.branch) body.branch = cfg.branch;
    const p = await gh('PUT', 'application/vnd.github+json', body);
    if (!p.ok) throw await fail(p);
    loadedSha = (await p.json()).content.sha;
    try { localStorage.removeItem(KEY); } catch (e) { }
    drafted = false;
    msg = 'Saved to GitHub at ' + new Date().toLocaleTimeString() + '. GitHub Pages usually needs 1-2 minutes to publish it to the site.';
  } catch (e) { msg = 'Save failed: ' + e.message; }
  draw();
}
async function reset() {
  if (!confirm('Discard all unsaved changes and reload the saved version?')) return;
  try { localStorage.removeItem(KEY); } catch (e) { }
  drafted = false; msg = '';
  try { await pull(); } catch (e) { try { D = await loadData(); } catch (e2) { D = { subjects: [] }; msg = e2.message; } }
  sel = { s: null, t: null }; draw();
}

const cf = (k, label, size) => $('p', {}, $('label', {}, label + ': ', $('input', { size, value: cfg[k], oninput: e => { cfg[k] = e.target.value.trim(); } })));
const connUI = () => $('fieldset', {}, $('legend', {}, 'GitHub connection (needed to save to the website)'),
  cf('owner', 'Owner (your GitHub username)', 30), cf('repo', 'Repository name', 30),
  cf('branch', 'Branch (blank = default branch)', 20), cf('path', 'Data file path', 30),
  $('p', {}, $('label', {}, 'Access token: ', $('input', { type: 'password', size: 40, value: tokenVal, autocomplete: 'off', oninput: e => { tokenVal = e.target.value.trim(); } }))),
  $('p', {}, $('label', {}, $('input', { type: 'checkbox', checked: cfg.remember, onchange: e => { cfg.remember = e.target.checked; } }), ' Remember the token on this device (leave unticked on shared computers)')),
  $('p', {}, 'Use a fine-grained token limited to this one repository with "Contents: Read and write" (see README.md). It is kept only in this browser, never in the site files.'));

function toolbar() {
  const f = $('input', {
    type: 'file', accept: '.json,application/json', onchange: async () => {
      try { D = norm(JSON.parse(await f.files[0].text())); sel = { s: null, t: null }; msg = 'Imported (not saved yet).'; change(); }
      catch (e) { alert('Import failed: ' + e.message); }
    }
  });
  return $('div', {},
    $('p', {}, $('button', { type: 'button', onclick: saveGH }, 'Save to GitHub'), ' ',
      $('button', { type: 'button', onclick: loadGH }, 'Load from GitHub'), ' ',
      $('button', { type: 'button', onclick: reset }, 'Discard unsaved changes')),
    $('p', {}, 'Backup: ', $('button', { type: 'button', onclick: exp }, 'Download library.json'), ' ',
      $('label', {}, 'Import a library.json: ', f)));
}

function draw() {
  const y = scrollY;
  const S = D.subjects.find(x => x.id === sel.s), T = S && S.topics.find(x => x.id === sel.t);
  root().replaceChildren(nav(), $('hr'), $('h1', {}, 'ASM Editor'),
    $('p', {}, drafted ? 'You have unsaved changes (kept in this browser until you click Save to GitHub).' : 'No unsaved changes.'),
    msg ? $('p', {}, $('b', {}, msg)) : null,
    toolbar(), connUI(), $('hr'),
    $('h2', {}, 'Subjects'),
    nameList(D.subjects, 'subject', sel.s, o => { sel = { s: o.id, t: null }; draw(); }),
    addNamed(D.subjects, 'subject', n => ({ id: uid(), name: n, topics: [] })),
    S ? $('div', {}, $('hr'), $('h2', {}, 'Topics in "' + S.name + '"'),
      nameList(S.topics, 'topic', sel.t, o => { sel.t = o.id; draw(); }),
      addNamed(S.topics, 'topic', n => ({ id: uid(), name: n, blocks: [], flashcards: [], quiz: [] }))) : null,
    T ? contentUI(T) : null);
  scrollTo(0, y);
}

(async () => {
  try { const s = localStorage.getItem(KEY); if (s) { D = norm(JSON.parse(s)); drafted = true; msg = 'Restored your unsaved changes.'; } } catch (e) { }
  if (!drafted) {
    try { await pull(); }
    catch (e) { try { D = await loadData(); } catch (e2) { msg = e2.message + ' Starting empty; fill in the GitHub connection and Load, or Import a library.json.'; } }
  }
  draw();
})();
