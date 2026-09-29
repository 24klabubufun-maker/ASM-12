# ASM

ASM is a GCSE study library that runs entirely as static files on GitHub Pages. It has subjects, topics, ordered content blocks, flashcards, multiple-choice quizzes, search and a browser-based editor. It deliberately uses no CSS, so it shows the browser's default appearance.

## Files

    index.html       home page: search and list of subjects
    subject.html     list of topics in a subject
    topic.html       topic study page (content blocks in stored order)
    flashcards.html  flashcards for a topic
    quiz.html        multiple-choice quiz for a topic
    editor.html      editor for the whole library
    app.js           shared code and public pages
    editor.js        editor code
    data/library.json  ALL study data (starts empty)
    images/          (optional) create this folder for images you use in Image blocks

## Put it on GitHub and enable GitHub Pages

1. Create a new repository on github.com (public repositories can use Pages for free).
2. Upload every file and folder from this project, keeping the structure (index.html must be at the top level).
3. Go to the repository's Settings > Pages. Under "Build and deployment" choose "Deploy from a branch", pick the `main` branch and the `/ (root)` folder, then Save.
4. After a minute or two the site is live at `https://USERNAME.github.io/REPOSITORY/`. All paths are relative, so the project URL works.

## How the data works

Everything lives in `data/library.json`:

    { "subjects": [ { "id": "...", "name": "...", "topics": [
        { "id": "...", "name": "...",
          "blocks":     [ { "type": "paragraph", "text": "..." } ],
          "flashcards": [ { "q": "...", "a": "..." } ],
          "quiz":       [ { "q": "...", "choices": ["..","..",".."], "correct": 0, "explain": "..." } ]
        } ] } ] }

Block types: `heading`, `paragraph`, `bullets`, `numbered`, `table`, `note`, `example`, `image`, `formula`.
Lists use one item per line. Tables use one row per line with cells separated by `|` (first row is the header). For `image`, `text` is the image path or URL and `alt` is the alt text. `correct` is the zero-based index of the right choice. Blocks, subjects, topics and cards are shown in the order they appear in the file. Ids must be unique and are used in page links.

You can edit the JSON by hand, but the editor is easier. If the file has no subjects the home page says no content has been added.

## Using the editor

Open `editor.html` (there is an Editor link on every page).

- Subjects: type in the name box to rename; use Open to select; Move up / Move down / Delete to reorder or remove; Add subject to create.
- Topics: appear after you open a subject and work the same way.
- Content: after opening a topic, add blocks by choosing a type and clicking Add block. Edit the text in place, change a block's type, and move or delete blocks.
- Flashcards and quiz questions: add, edit, reorder and delete below the content blocks. For quiz questions add choices and tick the radio button beside the correct one; the explanation is optional.

Changes are stored automatically as a draft in your browser only.

## Export and update the repository

GitHub Pages is static, so a web page cannot save to your repository. There is no login or token, on purpose. The workflow is:

1. In the editor click **Export library.json** (a file downloads).
2. In your repository open `data/library.json`, choose the pencil/upload option (or use Add file > Upload files, or `git commit` locally) and replace it with the downloaded file.
3. Commit. GitHub Pages rebuilds and the public site shows the new material shortly after.

Notes: the editor is publicly reachable but visitors can only change their own browser's draft, never the site. "Discard draft and reload from site" resets the editor to the committed file. Use **Import** to load a `library.json` from disk. If you work from several devices, export and commit before switching, because drafts don't sync.

## Testing on your own computer (optional)

Browsers block loading JSON from files opened directly from disk. To test locally, run a static file server in the project folder (for example `python -m http.server`) and open http://localhost:8000. Hosting on GitHub Pages needs none of this.
