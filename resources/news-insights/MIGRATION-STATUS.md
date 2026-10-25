# News & Insights migration status

**Branch:** `feat/news-insights-migration`  
**Target:** `/resources/news-insights/`  
**Status:** Foundation in progress; source article migration not complete.

## Completed in this branch

- Added a public News & Insights landing page with static JSON-driven search and category filtering.
- Added an initially empty catalogue file at `/resources/data/news-insights.json`.
- Linked the archive from the existing public `/resources/index.html` hub.
- Removed the blanket `Disallow: /*.html$` rule from `robots.txt`, as explicitly authorised.
- Updated crawler exclusions for known member, workspace, and administrative paths.
- Updated the sitemap to the Hamlet production hostname and added the public resource pages and archive.

## Important limitations before launch

- The catalogue intentionally contains no articles yet. The working source inventory has 143 candidate records across listing pages 1–23, but it is not exhaustive and some records do not yet have a verified direct article URL.
- Do not generate article pages from archive-listing titles alone. Each candidate needs its direct source URL, complete source text, publication date, byline (where available), and media references checked.
- Preserve IBR-owned original text in full under the owner's authorisation. Review third-party press releases, quotations, charts, photos, embeds and other externally authored material separately; ownership of an article page does not necessarily establish rights to every included component.
- Review the exact protected paths in `robots.txt` against the live site before production release. Robots directives guide crawlers; they do not enforce access control. Firebase authentication and server-side/database rules must remain the actual protection boundary.
- Verify that the production site serves the `www.hamlet-ai.co.uk` hostname and that the canonical URLs match deployment configuration before publishing the sitemap.

## Next steps

1. Complete archive enumeration beyond page 23 and resolve direct article links.
2. Capture and compare the full text of each selected article before the source is removed.
3. Deduplicate repeated and updated stories, then classify candidates by editorial relevance.
4. Review media rights and preserve attribution/credits.
5. Add verified article HTML pages and catalogue entries.
6. Test public search, keyboard accessibility, mobile layout, canonical metadata, internal links, robots policy, and sitemap.
7. Review this branch and its pull request before merge or deployment.


## Additional direct-source migration — Acuity / One Big Circle / Loram (25 October 2026)

Added `articles/acuity-one-big-circle-loram-partnership.html` from the accessible original IBR article dated 16 April 2026. The entry covers the rail technology partnership and retains the source link and press-release context. The third-party image is not copied pending asset verification. Added a searchable catalogue record and sitemap URL. This first-pass migration requires line-by-line QA against the source before production release.


## Additional direct-source migration — RioCan (25 October 2026)

Added `articles/riocan-third-quarter-2026-earnings-call.html` from the accessible live IBR article dated 5 October 2026. Added its searchable catalogue record and sitemap URL. This is a first-pass migration and still requires line-by-line QA against the source before production.


## Additional direct-source batch — CBRE and JLL (25 October 2026)

Added native HTML summary pages for the accessible CBRE and JLL third-quarter 2026 earnings announcements dated 28 September 2026. Each entry is linked to the original IBR page, listed in the JSON catalogue and sitemap, and preserves source attribution. As the original entries are third-party press releases, these pages summarise key factual details rather than reproducing the full external release. QA and archive enumeration remain in progress.


## Additional direct-source batch — Skanska and Aberdeen (25 October 2026)

Added native HTML summary pages for the Skanska H2Offices divestment and Aberdeen Intermediate Income Fund reverse split, both dated 28 September 2026. Updated the catalogue and sitemap. Both source entries reproduce or summarise third-party press releases, so Hamlet retains factual summaries, original IBR links and attribution rather than republishing the full external release or image. Full archive crawl and article QA remain ongoing.
