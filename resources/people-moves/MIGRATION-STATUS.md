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


## Additional direct-source migration — Serica Energy (25 October 2026)

Added `articles/serica-energy-two-senior-appointments.html` from the accessible original IBR page, including the visible article text, author/date, appointee details and source attribution. Added the record to `resources/data/people-moves.json` and the public URL to the sitemap. The source article credits a Serica Energy / KeyFacts Energy press release; the two source photographs are not copied pending asset verification. This entry has not yet undergone a complete independent line-by-line QA pass.


## Additional direct-source migration — Equilis France (25 October 2026)

Added `articles/equilis-france-constance-poublet-ceo.html` from the accessible live IBR article dated 10 April 2026. The page covers Constance Poublet's appointment as CEO of Equilis France and preserves the article's statements and source link. The third-party image is not reproduced pending asset verification. Added the record to the JSON catalogue and sitemap. Independent line-by-line QA remains outstanding.


## Additional direct-source batch — M&G, Barings and Newmark (25 October 2026)

Added three native HTML summary pages from accessible IBR pages dated 7 October 2026 (M&G / Duncan Batty), 6 October 2026 (Barings / Sloan Sutta) and 28 September 2026 (Newmark / Mike Whitaker). Updated the JSON catalogue and sitemap. As these entries are presented as third-party company media releases, Hamlet preserves key appointment facts, IBR source links and attribution rather than reproducing the full external releases or source photographs. Line-by-line QA and full archive enumeration remain outstanding.


## Additional direct-source migration — OMERS Infrastructure (25 October 2026)

Added a native HTML article summarising the accessible IBR announcement of Luca Lupo's appointment as Senior Managing Director and Head of Europe, dated 23 March 2026. Updated the JSON catalogue and sitemap. Source attribution is retained and the third-party photograph is omitted pending verification. Line-by-line QA and full archive enumeration remain in progress.


## Additional direct-source batch — Denham Capital, West Sussex and CBRE Investment Management (25 October 2026)

Added three press-release-labelled People Moves summary pages from accessible IBR source pages: Arturo Prieto / Denham Capital (1 October 2026), Henry Powell / West Sussex Economic Growth Board (25 September 2026), and Paul White / CBRE Investment Management (16 April 2026). Each entry has a source backlink and catalogue/sitemap record. Source images are not reproduced pending asset verification. Full archive enumeration and line-by-line QA remain outstanding.


## Additional direct-source migration — Herbert Smith Freehills Kramer (25 October 2026)

Added a press-release-labelled summary of the 24 April 2026 announcement promoting 25 partners. The page links to the original IBR article, and the catalogue and sitemap have been updated. The summary directs readers to IBR for the complete list rather than reproducing the full third-party release. Source-by-source QA and exhaustive archive enumeration remain outstanding.
