# Hamlet UX/UI Improvement Roadmap

Reviewed against the current `main` branch on 18 October 2026.

## Audit scope

Static source review of the homepage, members area, member property portfolio, authenticated live listings, main deal pipeline, shared theme stylesheet, mobile compatibility stylesheet, and page standards. This is not a live browser or accessibility test.

## Findings and priorities

### P0 — Visual consistency and mobile clarity
- The members area uses white guide and welcome cards with dark text over the dark animated background, while the pipeline and member portfolio use dark surfaces. This creates an avoidable visual discontinuity and conflicts with Hamlet's established dark interface.
- Shared design tokens exist in `theme.css`, but extensive page-level CSS overrides allow spacing, contrast, card surfaces, and status styles to drift between modules.
- The Kanban board retains a 1,240px minimum width to keep columns usable. On mobile, the list-view route should be easy to find rather than forcing users into a cramped board.

### P1 — Core member journeys
- Make the first screen answer three questions: what is live, which deals need attention, and what is the next action?
- Make property submission progress, draft state, photo upload, validation, and publishing status obvious without changing the existing data model.
- Align property cards and status labels across member portfolios and live listings, while preserving the distinction between public portfolios and member-only resources.
- Keep deadline reminders actionable and linked to their source deal or task.

### P2 — Accessibility and interaction quality
- Validate focus order, keyboard access, touch targets, contrast, reduced-motion behaviour, and screen-reader status announcements across core flows.
- Check mobile navigation, sticky headers, long property details, and form layouts at narrow widths.
- Ensure search and data-driven screens provide clear loading, empty, error, and success states.

### P3 — Measured optimisation
- Establish baseline measures for property submission completion, deal update time, abandoned forms, data completeness, and deadline follow-through.
- Prioritise further work using observed friction rather than adding dashboard metrics that do not change a member's next action.

## Incremental delivery plan

1. **Consistency pass:** correct the members-area card palette and typography while keeping particles visible and controls legible.
2. **Mobile pipeline pass:** verify the list-view affordance and mobile board behaviour without changing deal-stage logic.
3. **Property experience pass:** align cards, filters, loading/empty/error states, and sustainability-claim presentation across portfolio and live listings.
4. **Dashboard/workflow pass:** improve prioritisation of next actions and critical dates after confirming the current Firestore data and UI paths.
5. **Verification pass:** inspect diffs, validate HTML/CSS structure, and run available repository checks; manually verify deployed pages where browser access is available.

## Safety boundaries

- Do not modify Firebase Authentication, Firestore security rules, storage permissions, transaction history, reminder delivery, or deal persistence as part of a visual-only change.
- Do not present member-entered sustainability claims as independently certified.
- Preserve public portfolio access without sign-in and existing member-only access controls for private workspace resources.
- Review changes for unintended functional effects before publishing.
