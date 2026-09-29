/* ASM shared code: DOM helper, data loading and the public pages.
   No styling is applied anywhere; the browser's default appearance is used.
   Data comes from data/library.json (a relative path, so it works on a
   GitHub Pages project URL such as https://USERNAME.github.io/REPOSITORY/). */

const $ = (tag, attrs, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs || {}) { if (k in e) e[k] = attrs[k]; else e.setAttribute(k, attrs[k]); }
  for (const x of kids.flat(9)) if (x != null && x !== false) e.append(x.nodeType ? x : String(x));
  return e;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const param = k => new URLSearchParams(location.search).get(k);
const root = () => document.getElementById('app');
const enc = encodeURIComponent;
const subjectUrl = s => 'subject.html?s=' + enc(s.id);
const topicUrl = (s, t) => 'topic.html?s=' + enc(s.id) + '&t=' + enc(t.id);
const pageUrl = (p, s, t) => p + '.html?s=' + enc(s.id) + '&t=' + enc(t.id);

/* Fills in missing arrays/ids so older or hand-edited files still work. */
function norm(d) {
  if (!d || !Array.isArray(d.subjects)) throw new Error('library data must contain a "subjects" array');
  d.subjects.forEach(s => {
    s.id ||= uid(); s.name ??= ''; s.topics ||= [];
    s.topics.forEach(t => {
      t.id ||= uid(); t.name ??= ''; t.blocks ||= []; t.flashcards ||= []; t.quiz ||= [];
      t.quiz.forEach(q => { q.choices ||= []; q.correct = Number.isInteger(q.correct) ? q.correct : 0; });
    });
  });
  return d;
}

async function loadData() {
  let r;
  try { r = await fetch('data/library.json', { cache: 'no-store' }); }
  catch (e) { throw new Error('Could not load data/library.json. Pages must be served over http(s), for example GitHub Pages; opening the file directly from disk does not work.'); }
  if (!r.ok) throw new Error('Could not load data/library.json (HTTP ' + r.status + ')');
  return norm(await r.json());
}

const nav = () => $('p', {},
  $('a', { href: 'index.html' }, 'Home'), ' | ',
  $('a', { href: '#', onclick: e => { e.preventDefault(); history.length > 1 ? history.back() : location.href = 'index.html'; } }, 'Back'), ' | ',
  $('a', { href: 'editor.html' }, 'Editor'));

async function boot(page) {
  const a = root();
  try { const d = await loadData(); a.replaceChildren(nav(), $('hr')); page(d, a); }
  catch (e) { a.replaceChildren(nav(), $('hr'), $('p', {}, 'Error: ' + e.message)); }
}

function locate(d) {
  const s = d.subjects.find(x => x.id === param('s'));
  return { s, t: s && s.topics.find(x => x.id === param('t')) };
}

/* ---------- search ---------- */
function results(d, term) {
  const w = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (!w.length) return [$('p', {}, 'Type something to search.')];
  const hits = [];
  d.subjects.forEach(s => s.topics.forEach(t => {
    const parts = [['Topic', t.name], ['Subject', s.name],
      ...t.blocks.map(b => ['Notes', b.text]),
      ...t.flashcards.map(c => ['Flashcard', c.q + ' ' + c.a]),
      ...t.quiz.map(q => ['Quiz', q.q + ' ' + q.choices.join(' ') + ' ' + (q.explain || '')])];
    const all = parts.map(p => p[1] || '').join(' ').toLowerCase();
    if (w.every(x => all.includes(x))) {
      const m = parts.find(p => w.some(x => (p[1] || '').toLowerCase().includes(x))) || parts[0];
      hits.push($('li', {}, $('a', { href: topicUrl(s, t) }, s.name + ' > ' + t.name), ' - ' + m[0] + ': ' + (m[1] || '').slice(0, 80)));
    }
  }));
  return [$('h2', {}, 'Search results'), hits.length ? $('ul', {}, hits) : $('p', {}, 'No results found.')];
}

/* ---------- pages ---------- */
function home(d, a) {
  document.title = 'ASM';
  const out = $('div'), box = $('input', { type: 'search', size: 30 });
  a.append($('div', {},
    $('h1', {}, 'ASM'),
    $('form', { onsubmit: e => { e.preventDefault(); out.replaceChildren(...results(d, box.value)); } },
      $('label', {}, 'Search: ', box), ' ', $('button', { type: 'submit' }, 'Search')),
    out, $('hr'), $('h2', {}, 'Subjects'),
    d.subjects.length
      ? $('ul', {}, d.subjects.map(s => $('li', {}, $('a', { href: subjectUrl(s) }, s.name))))
      : $('p', {}, 'No content has been added yet. Use the editor to create subjects and topics.')));
}

function subjectPage(d, a) {
  const { s } = locate(d);
  if (!s) return a.append($('p', {}, 'Subject not found.'));
  document.title = s.name + ' - ASM';
  a.append($('div', {}, $('h1', {}, s.name),
    s.topics.length
      ? $('ul', {}, s.topics.map(t => $('li', {}, $('a', { href: topicUrl(s, t) }, t.name))))
      : $('p', {}, 'No topics have been added to this subject.')));
}

const lines = t => String(t || '').split('\n').flatMap((x, i) => i ? [$('br'), x] : [x]);

function block(b) {
  const t = b.text || '', L = t.split('\n').map(x => x.trim()).filter(Boolean);
  switch (b.type) {
    case 'heading': return $('h2', {}, t);
    case 'paragraph': return $('p', {}, lines(t));
    case 'bullets': return $('ul', {}, L.map(x => $('li', {}, x)));
    case 'numbered': return $('ol', {}, L.map(x => $('li', {}, x)));
    case 'table': {
      if (!L.length) return $('p');
      const rows = L.map(r => r.split('|').map(c => c.trim()));
      return $('table', { border: 1 },
        $('thead', {}, $('tr', {}, rows[0].map(c => $('th', {}, c)))),
        $('tbody', {}, rows.slice(1).map(r => $('tr', {}, r.map(c => $('td', {}, c))))));
    }
    case 'note': return $('blockquote', {}, $('b', {}, 'Important: '), lines(t));
    case 'example': return $('blockquote', {}, $('b', {}, 'Example: '), lines(t));
    case 'image': return $('p', {}, $('img', { src: t, alt: b.alt || '' }));
    case 'formula': return $('pre', {}, t);
    default: return $('p', {}, lines(t));
  }
}

function topicPage(d, a) {
  const { s, t } = locate(d);
  if (!t) return a.append($('p', {}, 'Topic not found.'));
  document.title = t.name + ' - ASM';
  const i = s.topics.indexOf(t), pv = s.topics[i - 1], nx = s.topics[i + 1];
  const fc = t.flashcards.length, qz = t.quiz.length;
  a.append($('div', {},
    $('h1', {}, t.name),
    $('p', {}, 'Subject: ', $('a', { href: subjectUrl(s) }, s.name)),
    fc || qz ? $('p', {}, fc ? $('a', { href: pageUrl('flashcards', s, t) }, 'Flashcards (' + fc + ')') : null, fc && qz ? ' | ' : null, qz ? $('a', { href: pageUrl('quiz', s, t) }, 'Quiz (' + qz + ' questions)') : null) : null,
    $('hr'),
    t.blocks.length ? t.blocks.map(block) : $('p', {}, 'No content has been added to this topic.'),
    $('hr'),
    $('p', {}, pv ? $('a', { href: topicUrl(s, pv) }, 'Previous topic: ' + pv.name) : null, pv && nx ? ' | ' : null, nx ? $('a', { href: topicUrl(s, nx) }, 'Next topic: ' + nx.name) : null)));
}

function flashcardPage(d, a) {
  const { s, t } = locate(d);
  if (!t) return a.append($('p', {}, 'Topic not found.'));
  document.title = 'Flashcards - ' + t.name;
  const c = t.flashcards, box = $('div');
  let i = 0, show = false;
  const draw = () => box.replaceChildren(...(!c.length ? [$('p', {}, 'No flashcards have been added to this topic.')] : [
    $('p', {}, 'Card ' + (i + 1) + ' of ' + c.length),
    $('h3', {}, 'Question'), $('p', {}, lines(c[i].q)),
    show ? $('div', {}, $('h3', {}, 'Answer'), $('p', {}, lines(c[i].a))) : $('button', { type: 'button', onclick: () => { show = true; draw(); } }, 'Show answer'),
    $('hr'),
    $('button', { type: 'button', disabled: i === 0, onclick: () => { i--; show = false; draw(); } }, 'Previous card'), ' ',
    $('button', { type: 'button', disabled: i === c.length - 1, onclick: () => { i++; show = false; draw(); } }, 'Next card')]));
  a.append($('div', {}, $('h1', {}, 'Flashcards: ' + t.name), $('p', {}, $('a', { href: topicUrl(s, t) }, 'Back to topic')), box));
  draw();
}

function quizPage(d, a) {
  const { s, t } = locate(d);
  if (!t) return a.append($('p', {}, 'Topic not found.'));
  document.title = 'Quiz - ' + t.name;
  const Q = t.quiz, box = $('div');
  let i = 0, score = 0, pick = null, done = false;
  const draw = () => {
    if (!Q.length) return box.replaceChildren($('p', {}, 'No quiz questions have been added to this topic.'));
    if (done) return box.replaceChildren($('h2', {}, 'Finished'), $('p', {}, 'Score: ' + score + ' / ' + Q.length),
      $('button', { type: 'button', onclick: () => { i = 0; score = 0; pick = null; done = false; draw(); } }, 'Try again'));
    const q = Q[i], ok = pick === q.correct;
    box.replaceChildren(
      $('p', {}, 'Question ' + (i + 1) + ' of ' + Q.length + ' | Score: ' + score),
      $('h3', {}, lines(q.q)),
      $('ul', {}, q.choices.map((c, k) => $('li', {}, $('button', { type: 'button', disabled: pick !== null, onclick: () => { pick = k; if (k === q.correct) score++; draw(); } }, c), pick === k ? ' <- your answer' : null))),
      pick === null ? null : $('div', {},
        $('p', {}, $('b', {}, ok ? 'Correct.' : 'Incorrect. The correct answer is: ' + q.choices[q.correct])),
        q.explain ? $('p', {}, 'Explanation: ' + q.explain) : null,
        $('button', { type: 'button', onclick: () => { pick = null; i++; if (i >= Q.length) done = true; draw(); } }, i === Q.length - 1 ? 'Finish' : 'Next question')));
  };
  a.append($('div', {}, $('h1', {}, 'Quiz: ' + t.name), $('p', {}, $('a', { href: topicUrl(s, t) }, 'Back to topic')), box));
  draw();
}
