# People Moves / Executive Appointments migration status

**Source:** https://www.ibrecruitment.com/exec-appointments/  
**Destination:** `/resources/people-moves/`  
**Status:** Catalogue foundation only; source archive not yet fully inventoried.

The source archive is titled People Appointments and contains People Moves announcements. Its visible first page includes appointments involving National Grid, SSE, Pantheon Resources, Woodway Energy, NISTA and Convergent Energy and Power. It uses pagination, so this snapshot is not a complete inventory.

Before publishing articles, enumerate every archive page and record direct source URLs, dates, bylines, full text, company, appointee, role, sector and media credits. Preserve full IBR-owned/authorised article text; review third-party press releases, portraits, logos and embedded content individually. Do not invent missing names, titles, dates or article text.

The public catalogue is intentionally empty until source text is verified. No production deployment has occurred.

## Initial article batch added

Five native HTML article pages have been added under `/resources/people-moves/articles/` and included in `/resources/data/people-moves.json` and the sitemap:

- National Grid — Chief Executive succession plan (11 June 2025)
- SSE — Martin Pibworth appointed Chief Executive Officer (11 June 2025)
- Woodway Energy — Diaco Aviki appointed President and CEO (9 June 2025)
- NISTA — Becky Wood appointed Chief Executive Officer (9 June 2025)
- Convergent Energy and Power — Russ Laplante appointed CFO (7 June 2025)

These are first-pass text migrations based on accessible source pages. Before production release, compare each page line-by-line with the source, confirm exact text, punctuation and attribution, check article URLs and dates, and review third-party material. The source archive still requires complete pagination and a full inventory. The first-page snapshot has not been treated as exhaustive.


## Source verification checkpoint (25 October 2026)

The first archive listing exposes six posts:

1. National Grid Chief Executive succession plan — 11 June 2025 (migrated)
2. SSE Chief Executive appointment — 11 June 2025 (migrated)
3. Pantheon Resources new CFO and CDO ahead of a US listing — 9 June 2025 (**not migrated**)
4. Woodway Energy President and CEO appointment — 9 June 2025 (migrated)
5. Becky Wood appointed NISTA CEO — 9 June 2025 (migrated)
6. Convergent Energy and Power CFO appointment — 7 June 2025 (migrated)

The live archive page is readable and confirms the Pantheon entry's title, date (9 June 2025), and visible excerpt: the London Stock Exchange announced Tralisa Maraj as Chief Financial Officer and Erich Krumanocker as Chief Development Officer ahead of a US listing. However, the linked full article returns HTTP 404 in retrieval, and the archive's Older posts link currently fails with a cache-miss retrieval error. The full Pantheon text therefore remains unavailable; do not reconstruct it from the excerpt. Continue crawling the live site directly, use other accessible articles, and record unavailable source URLs and retrieval outcomes. A manual export is not a prerequisite.

The five initial HTML pages are provisional migration drafts, not yet marked as source-verified. Their text, headings, quotes, dates, bylines, source credits and factual details must be compared line-by-line with a complete source copy before production release. The source listing labels some entries as press releases or exchange notices, so third-party content and assets must be tracked separately even though IBR authorises republication of its own content.


## Migration method decision

The project owner has explicitly selected direct migration from the original live IBR website rather than a manual export/upload workflow. Continue direct source retrieval in batches, resolve article URLs from archive pages, and capture article text, dates, bylines and credits. Keep all work on `feat/news-insights-migration` and in draft PR #9; do not merge or deploy without explicit approval. A retrieval failure for one source page must not stop migration of other accessible pages.


## Direct-crawl checkpoint — 25 October 2026

- Re-opened the live People Appointments archive and confirmed its first page contains six entries, including the Pantheon Resources appointment notice. The source link for Pantheon resolves to `https://www.ibrecruitment.com/l/people-moves-pantheon-resources-names-new-cfo-and-cdo-as-it-prepares-for-us-listing-lse/`, which returns 404 in this retrieval attempt.
- The archive's Older posts link resolves to `https://www.ibrecruitment.com/exec-appointments/p-u2otgxma/1`; that page could not be fetched (cache miss). The first archive page is therefore not a complete inventory.
- Reopened the Woodway Energy source article. It is accessible and includes a PR Newswire attribution and photo credit. The Hamlet version is still a first-pass adaptation, not a verbatim transcription; its wording, omissions and source attribution need a line-by-line correction before production.
- No source export requested; continue direct migration. Do not publish unsupported reconstructed text or unlicensed third-party images.
