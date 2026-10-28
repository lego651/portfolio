# portfolio

Personal portfolio of AI projects. Plain static site: no build step, no dependencies.

- `index.html`: home page (featured project + project rows)
- `project.html?p=<id>`: project page (screenshots, highlights, git-graph timeline, newest first)
- `assets/projects.js`: **all content lives here**: bio, numbers, projects, timeline events
- `assets/img/`: screenshots (JPEG, ~1000px wide)

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Add a timeline event

Add an entry to the top of a project's `ev` array in `assets/projects.js`:

```js
{ d: "2026-11-01", ty: "ship", t: "Short title", b: "One or two sentences." }
```

Types: `ship`, `fix`, `dec` (decision), `start`.
