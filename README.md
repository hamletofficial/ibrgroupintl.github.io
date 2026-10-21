# Hamlet — Connected Commercial Property Dealmaking

**Hamlet** is a commercial property CRM and broker-community platform developed by Impact in Business Recruitment Group Limited. Built around the principle **“less fragmentation, more connected deals,”** Hamlet brings property opportunities, deal progression, professional relationships and broker communications into a more connected workspace. Its tools include live property listings, a deal pipeline with critical-path deadlines, member profiles and directory, social updates, and direct messaging—helping brokers organise information and maintain momentum from opportunity to transaction.

- **Production site:** [https://hamlet-ai.co.uk](https://hamlet-ai.co.uk)
- **Repository:** [ibrgroupintl/ibrgroupintl.github.io](https://github.com/hamletofficial/ibrgroupintl.github.io)
- **Primary app:** Hamlet
- **Authentication:** Firebase Authentication
- **Data services:** Firebase / Firestore (and Firebase Storage where configured)

## Homepage and GitHub commit announcement

The public homepage is `/index.html`. Its royal-blue header uses the shared navigation links **How it works**, **Contact sales** (links to `/contact.html`), and **Log in** (links to `/login.html`). The header uses sticky positioning so it remains at the top while scrolling.

A white announcement bar sits immediately below the header. Its contents are centrally aligned and it retrieves the latest commit on the repository's `main` branch through the GitHub REST API. The bar displays the commit subject line, commit timestamp, short SHA, and a link to the corresponding commit. It checks for updates on page load and every five minutes, so commits pushed to `main` are reflected automatically without a separate manual edit to the announcement text. If the API is unavailable, the bar falls back to a link to the commit history.

The announcement displays the latest commit's subject line as written in GitHub; it does not generate an independent summary of the full diff. Use clear, concise commit messages to make the public update useful. Because the bar reads the latest commit on `main`, it reflects commits by any contributor to that branch, not only commits made by a particular person.

## Core capabilities

| Capability | Location | Purpose |
|---|---|---|
| Live property listings | `/app/public/live.html` | Browse and search commercial property listings available to the broker community |
| Deal pipeline | `/app/hamlet/index.html` | Manage commercial real-estate deals and critical-path deadlines; switch between Kanban and list views, link owned property records and public member contacts, and export workspace CSV |
| Member directory | `/directory.html` | Find community members and access the live properties shortcut |
| Member hub | `/members.html` | Entry point for signed-in community tools |
| Member profiles | `/profile.html`, `/editprofile.html` | View and manage member profile information |
| Social feed | `/posts.html` | Share short community updates, media, likes, and replies |
| Messaging | `/messages.html` | Send and manage member-to-member communications |
| Resource management | `/app/public/resources.html` where available | Manage resources associated with property listings |
| Account settings | `/settings.html` | Account preferences and security settings |
| Sign-in | `/login.html` | Firebase-backed authentication |

## Hamlet entry points

### Live property listings

Open `/app/public/live.html` to access the commercial property listings experience. The page provides listing search and property details. The directory shortcut labelled **🏢 Open Hamlet Live Properties** should link to this route; keep its visible label, accessible `aria-label`, and destination consistent when changing it.

### Deal pipeline

Open `/app/hamlet/index.html` for Hamlet’s commercial real-estate deal pipeline and critical-path deadline management. Brokers can switch between Kanban and list views, link deals to property records they own, and optionally connect a deal to a public member profile. Live listings include an **Add to Deal Pipeline** action that pre-fills a draft deal with property context for review. The page checks Firebase Authentication and preserves the requested destination through the `next` query parameter.

## Repository layout

- Root-level HTML, CSS, and JavaScript files provide the public site and broker-community features.
- `app/public/` contains the live commercial property listings experience and related app assets.
- `app/hamlet/` contains the deal pipeline interface.
- `firebase-config.js` provides the Firebase configuration consumed by client pages.
- `firestore.rules`, `firestore.indexes.json`, and Firebase configuration files govern the relevant backend setup.
- `functions/` contains Cloud Functions for backend workflows.
- `CNAME` configures the GitHub Pages custom domain.

Check the relevant page and its imported scripts/styles before changing behaviour. Authentication, Firestore rules, and Storage rules must agree: a client-side sign-in gate is not a substitute for server-side security rules.

## Local preview

From a local clone, start a simple static server at the repository root:

```bash
git clone https://github.com/hamletofficial/ibrgroupintl.github.io.git
cd ibrgroupintl.github.io
python -m http.server 8080
```

Then open `http://localhost:8080/`. Features that depend on Firebase, remote assets, authentication, or deployed backend services may require the configured live project and may not work fully in a local static preview.

## Deployment notes

- Root-level pages are published through GitHub Pages on the configured custom domain.
- Changes to Firebase Authentication integrations, Firestore rules, Storage rules, or Cloud Functions may require a separate Firebase deployment; a GitHub Pages commit alone does not deploy those backend changes.
- After deployment, test the live listings page, deal pipeline sign-in redirect, member directory shortcut, and relevant authenticated workflows.


## Dark-theme standard

Hamlet is a **dark-only** experience. All new HTML pages must load the shared theme stylesheet and the dark-theme initializer in the document head:

```html
<link rel="stylesheet" href="/theme.css">
<script src="/theme.js"></script>
```

Keep page-specific surfaces, text, form controls, dialogs, and responsive states readable against the dark palette. Do not add a light-mode toggle, light-theme preference, or light-only page styling. The shared `theme.js` enforces `data-appearance="dark"`; `theme.css` supplies the common dark surfaces, contrast, and control styling. When adding a new page, verify that it remains dark on first load, on mobile, and after authentication state changes.
