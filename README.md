# Sketch2LaTeX

Sketch2LaTeX is a browser-based scientific diagram editor for STEM students. Draw with reusable physics, mechanics, optics, chemistry, and mathematics components, then export the drawing as standalone TikZ/LaTeX, SVG, or PDF.

## PDF background mode

The editor supports two independent workspaces:

- **Blank Canvas** keeps the existing drawing workflow.
- **Draw on PDF** opens an already-compiled PDF from the student's computer and places the existing SVG drawing editor directly above the selected page.

PDF files are parsed and rendered locally with PDF.js. They are never uploaded, stored in a database, sent to an API, or included in the generated TikZ/LaTeX. Only the active page is rendered. Every PDF page has its own normalized drawing snapshot so annotations remain aligned after responsive resizing and are restored when navigating between pages.

PDF controls include previous/next page navigation, page count, background opacity, hide/show, replacement, and confirmed removal. The PDF renderer uses device-pixel-ratio-aware canvases and ignores stale or cancelled renders during navigation and resizing.

## Local setup

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Production build

```bash
npm run build
```

Additional checks:

```bash
npm run lint
npm run test:latex
npm test
```

## Manual test: blank canvas

1. Select **Blank Canvas**.
2. Add, move, resize, rotate, undo, and redo several drawing objects.
3. Generate or copy the TikZ/LaTeX and verify it contains the drawing.
4. Switch to **Draw on PDF**, then return to **Blank Canvas**.
5. Confirm the original blank drawing is restored.

## Manual test: PDF mode

1. Select **Draw on PDF** and upload a valid `.pdf` file.
2. Confirm page 1 appears and the privacy note is visible.
3. Draw over page 1, navigate to page 2, and add a different drawing.
4. Return to page 1 and confirm its original drawing is restored in the same positions.
5. Resize the browser and confirm the drawing remains registered with the PDF page.
6. Change opacity, hide/show the background, and verify drawing tools still receive pointer input.
7. Copy or download the generated TikZ/LaTeX and confirm it contains only drawing commands, not PDF content.
8. Remove the PDF, accept the confirmation when drawings exist, and confirm the blank canvas returns.
9. Try a non-PDF, empty, corrupted, and password-protected PDF and confirm a useful error appears.

## Current limitations

- PDF files are session-only and are not restored after a browser refresh.
- PDF page drawings are kept in memory for the current document session; removing or replacing the PDF intentionally clears them after confirmation.
- Canvas pan and zoom are disabled in PDF mode so the drawing and PDF layers retain exact registration. Responsive fit-width scaling remains supported.
- Password-protected PDFs must be unlocked before import.
- The PDF is visual context only. Sketch2LaTeX does not modify the original document or insert generated code into its LaTeX source.

## Implementation notes

The app uses Vinext, React, TypeScript, and Vite. Drawing state uses the existing reducer and `CanvasObject` serialization, while TikZ generation remains in `app/lib/latex.ts`. PDF support adds only a browser-side PDF.js rendering layer and a small normalized-coordinate adapter.

Codex and GPT-5.6 helped inspect the existing editor architecture, integrate PDF.js without replacing working features, design the page-specific snapshot mapping, add reliability checks, and document the final test workflow. No OpenAI API is used by the application.
