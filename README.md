# Hamlet — Broker Community

Hamlet is the broker community app from Impact in Business Recruitment. It brings commercial property brokers together around **live property listings**, a **deal pipeline**, member profiles, a directory, and community messaging.

- **Production site:** [https://uk.ibrecruitment.com](https://uk.ibrecruitment.com)
- **Repository:** [ibrgroupintl/ibrgroupintl.github.io](https://github.com/ibrgroupintl/ibrgroupintl.github.io)
- **Primary app:** Hamlet
- **Authentication:** Firebase Authentication
- **Data services:** Firebase / Firestore (and Firebase Storage where configured)

## Core capabilities

| Capability | Location | Purpose |
|---|---|---|
| Live property listings | `/app/public/live.html` | Browse and search commercial property listings available to the broker community |
| Deal pipeline | `/app/hamlet/index.html` | Manage commercial real-estate deals and critical-path deadlines |
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

Open `/app/hamlet/index.html` for Hamlet’s commercial real-estate deal pipeline and critical-path deadline management. The page checks Firebase Authentication and redirects unauthenticated visitors to `/login.html`, preserving the requested destination through the `next` query parameter.

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
git clone https://github.com/ibrgroupintl/ibrgroupintl.github.io.git
cd ibrgroupintl.github.io
python -m http.server 8080
```

Then open `http://localhost:8080/`. Features that depend on Firebase, remote assets, authentication, or deployed backend services may require the configured live project and may not work fully in a local static preview.

## Deployment notes

- Root-level pages are published through GitHub Pages on the configured custom domain.
- Changes to Firebase Authentication integrations, Firestore rules, Storage rules, or Cloud Functions may require a separate Firebase deployment; a GitHub Pages commit alone does not deploy those backend changes.
- After deployment, test the live listings page, deal pipeline sign-in redirect, member directory shortcut, and relevant authenticated workflows.
