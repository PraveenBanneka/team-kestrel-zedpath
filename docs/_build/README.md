# Documentation build

Turns each `docs/NN-*/ZP-DOC-NN_*.md` into a `.docx` and a `.pdf` that follow the layout rules in
ZP-DOC-00 (Documentation Standard). Markdown is the only file you edit; `.docx` and `.pdf` are generated.

## One-time setup (Windows)

| Need | How |
|---|---|
| Node 23.6+ | Runs `build.ts` directly (TypeScript type stripping) |
| npm packages | `cd docs/_build && npm install` |
| Java 11+ | For PlantUML diagrams |
| PlantUML | `curl -sL -o docs/_build/plantuml.jar https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar` |
| Microsoft Word | Refreshes contents, lists and fields, and exports the PDF (`to-pdf.ps1`) |

## Use

```
node docs/_build/build.ts        # all documents
node docs/_build/build.ts 02     # only docs/02-*
cd docs/_build && npm run typecheck
```
