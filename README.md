# Impact in Business Recruitment

End-to-end **jobs aggregator, hiring-request board, and members dashboard** for Impact in Business Recruitment (IB) — a remote recruitment process outsourcing (RPO) practice.

- Production: [https://ats.ibrecruitment.com](https://ats.ibrecruitment.com)
- Source: [ibrgroupintl/ibrgroupintl.github.io](https://github.com/ibrgroupintl/ibrgroupintl.github.io)
- Legal entity on the site footer: Impact in Business Recruitment Group Limited (© 2026)

This is not a single landing page. The repo is a small full-stack product: public marketing HTML, signed-in member tools, Firestore data, scheduled RSS ingestion, and callable Cloud Functions that email recruiters and members via Postmark.

## What the product is

IB helps employers source and shortlist candidates so hiring managers can stay on operations. The product on this domain is the **ATS-facing surface** of that work:

| Audience | What they do here |
|----------|-------------------|
| Visitors | Learn the service, accept cookies, read legal pages |
| Hiring managers | Sign in, submit a structured job requisition, pay invoices |
| Members / recruiters | Directory, profiles, resume uploads, insights feed, LinkedIn live jobs, job adverts |
| System | Pull Substack RSS every 15 minutes, store insights, broadcast email to opted-in members |

The hiring manager keeps the final hire decision. IB’s role is brief-taking, sourcing, and shortlist.

## How a hiring request travels through the app

1. Visitor lands on `index.html` (jobs board pitch) or `about.html` (RPO explanation).
2. They authenticate on `login.html` (Firebase Auth).
3. Signed-in users open `requests.html` and complete role, team, location, plan, budget, and skills fields.
4. The browser calls the Cloud Function `submitJobRequisition` (`functions/index.js`). The function validates the payload (auth required, allowed fields only, openings 1–500, enums for workplace / employment / urgency / budget, date and URL checks) and emails the recruitment team through Postmark (`admin-messages@ibrecruitment.com`).
5. Recruiters review the brief (typically one call) and return a shortlist. Resumes can be stored per user in `resumeUploads`.
6. Optional billing uses `invoice.html` → `success.html`.

Cookie consent (`ibr_cookie_consent_v1`) is shared across public pages.

## Pages (repository root)

Public and legal

| Page | Purpose |
|------|---------|
| `index.html` | Home: jobs aggregator & hiring-request pitch, metrics, how-it-works, CTAs |
| `about.html` | What IB provides (agile remote RPO) and the three-step process |
| `privacy.html`, `cookies.html`, `terms.html` | Policies |
| `404.html` | Not-found |
| `loggedout.html` | Signed-out confirmation |

Account and workflow

| Page | Purpose |
|------|---------|
| `login.html` | Secure login (Firebase Auth) |
| `requests.html` | Job requisition form (authenticated) |
| `members.html` | Members hub |
| `directory.html` | Public-facing member directory |
| `editprofile.html` | Name, bio, photo, visibility |
| `settings.html` | Account settings |
| `uploads.html` | Resume uploads owned by the signed-in user |
| `insights.html` | Insights archive (Substack-backed feed) |
| `livefeed.html` | LinkedIn live jobs board |
| `invoice.html` / `success.html` | Invoice payment and thank-you |

Shared assets at the root include `index.css`, `mobile-compat.css` / `.js`, `page-transition.css` / `.js`, `header-profile.js`, `firebase-config.js`, `CNAME` (`ats.ibrecruitment.com`), `robots.txt`, and brand images (`160.jpg`, `100.png`).

## Data model (Firestore)

Rules live in `firestore.rules` (also referenced from `firebase.json` for databases `(default)` and `ibusername`). Fallback is deny-all.

| Collection | Who can read | Who can write | Purpose |
|------------|--------------|---------------|---------|
| `publicProfiles/{uid}` | Anyone | Owner only; fields limited (`firstName`, `lastName`, `bio`, `email`, `imageDataUrl`, `isPublic`, …) | Member directory / profile cards |
| `messages/{messageId}` | Recipient (`recipientUid`) | Create/update by recipient | In-app messages |
| `resumeUploads/{docId}` | Owner | Owner create only | CV store |
| `insightsFeed/{docId}` | Signed-in users | No client writes | RSS-ingested articles |
| `jobAdverts/{docId}` | Signed-in users | Owner create/update/delete; posting state `draft` or `ready`; LinkedIn metadata on update | Member-posted jobs / LinkedIn relay |

## Backend (`functions/`)

Node 22 Cloud Functions (2nd gen config in root `firebase.json`). Dependencies: `firebase-admin`, `firebase-functions`, `postmark`, `rss-parser`. Secret: `POSTMARK_BROADCAST_TOKEN`.

| Export | Trigger | Behaviour |
|--------|---------|-----------|
| `fetchAndStoreRssToInsightsFeed` | Pub/Sub every 15 minutes | Parses `https://substack.ibrecruitment.com/feed` and upserts `insightsFeed` |
| `adminFetchAndRelayRss` | Firestore `insightsFeed/{postId}` create | Emails members in `publicProfiles` who are not unsubscribed; marks the post notified; unsubscribe links to `ibrecruitment.com` |
| `submitJobRequisition` | HTTPS callable | Auth-gated requisition validation + recruiter notification email |

There is a nested `app/` tree with a second Firebase project layout (`app/firebase.json`, App Hosting emulator yaml, Data Connect, extra functions). Treat that as an adjacent or evolving app host, not a replacement for the root HTML product that GitHub Pages serves.

Firebase Hosting at the repo root points `"public": "public"` (only a stub `public/index.html` and `public/404.html`). The live custom domain is wired through `CNAME` + GitHub Pages serving the **root** HTML files. Keep those two publish paths in mind when you change files.

## Architecture (high level)

```
Browser (root *.html + CSS/JS)
        │  Firebase Auth
        ├─ Firestore: profiles, messages, uploads, adverts, insights
        └─ Callable FN: submitJobRequisition ──► Postmark ──► recruiters

Pub/Sub every 15 min
        └─ fetchAndStoreRssToInsightsFeed ──► insightsFeed
                    └─ adminFetchAndRelayRss ──► Postmark broadcast ──► members
```

## Local preview

```bash
git clone https://github.com/ibrgroupintl/ibrgroupintl.github.io.git
cd ibrgroupintl.github.io
python3 -m http.server 8080
```

Open `http://localhost:8080/index.html`. Login, requisitions, uploads, insights, and invoices need the live Firebase project and functions.

Functions:

```bash
cd functions
npm install
# firebase emulators:start   # if you use the emulator suite
```

## Deploy

- **GitHub Pages** serves root HTML on `ats.ibrecruitment.com`.
- **Firebase**: `firebase deploy` for functions, rules, and (if used) hosting from `public/`.
- After changing `firestore.rules` or functions, deploy those explicitly so the client pages stay in sync with the backend.
