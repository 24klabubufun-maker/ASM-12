/* ASM editor. Requires app.js (loaded first).

   HOW SAVING WORKS (GitHub Pages is static, so a browser cannot write to your repository):
   1. Every change is kept as a draft in THIS browser (localStorage) so you don't lose work.
   2. Click "Export library.json" to download the complete updated data file.
   3. Replace data/library.json in your GitHub repository with that file and commit.
      The public site updates after GitHub Pages rebuilds (usually within a minute or two).
   No passwords or tokens are used anywhere. Anyone can open this page, but their edits
   only exist in their own browser; nothing changes on the site unless you commit a file. */

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

async function reset() {
  if (!confirm('Discard all unexported changes and reload data/library.json from the site?')) return;
  try { localStorage.removeItem(KEY); } catch (e) { }
  drafted = false; msg = '';
  try { D = await loadData(); } catch (e) { D = { subjects: [] }; msg = e.message; }
  sel = { s: null, t: null }; draw();
}

function toolbar() {
  const f = $('input', {
    type: 'file', accept: '.json,application/json', onchange: async () => {
      try { D = norm(JSON.parse(await f.files[0].text())); sel = { s: null, t: null }; msg = 'Imported.'; change(); }
      catch (e) { alert('Import failed: ' + e.message); }
    }
  });
  return $('p', {}, $('button', { type: 'button', onclick: exp }, 'Export library.json'), ' ',
    $('label', {}, 'Import a library.json: ', f), ' ',
    $('button', { type: 'button', onclick: reset }, 'Discard draft and reload from site'));
}

function draw() {
  const y = scrollY;
  const S = D.subjects.find(x => x.id === sel.s), T = S && S.topics.find(x => x.id === sel.t);
  root().replaceChildren(nav(), $('hr'), $('h1', {}, 'ASM Editor'),
    $('p', {}, drafted ? 'Working from a draft saved in this browser.' : 'Working from data/library.json.',
      ' The public site only changes after you export library.json and commit it to GitHub (see README.md).'),
    msg ? $('p', {}, $('b', {}, msg)) : null,
    toolbar(), $('hr'),
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
  try { const s = localStorage.getItem(KEY); if (s) { D = norm(JSON.parse(s)); drafted = true; } } catch (e) { }
  if (!drafted) { try { D = await loadData(); } catch (e) { msg = e.message + ' Starting empty; you can Import a library.json.'; } }
  draw();
})();
