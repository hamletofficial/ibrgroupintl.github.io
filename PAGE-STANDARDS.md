# Hamlet HTML Page Standards

## Mandatory fixed wordmark

Every new HTML page in this repository must include the lowercase **hamlet** wordmark, fixed in the same top-left position on desktop and mobile. The wordmark must remain visible while the page scrolls and link to `/index.html`.

- Pages that load `/hamlet-workspace.js` receive the wordmark from the shared workspace bundle. Keep the matching cache-busting query string current.
- Standalone pages that do not load the workspace bundle must include `<script src="/hamlet-brand.js?v=20261013-1"></script>` immediately before `</body>`.
- Do not add a second wordmark manually; the scripts guard against duplicate insertion.
- Do not position the title over or inside page content in a way that makes it scroll away. Preserve the shared fixed placement and accessible label.
- Before committing a new page, verify the wordmark is visible at desktop and mobile viewport widths and remains fixed during scrolling.

This requirement is part of the page-creation acceptance checklist and applies to all new HTML pages in the root and application subdirectories.
