# Hamlet AI Gateway

A separate Cloudflare Worker gateway for Hamlet's opt-in AI drafting tools. It is intentionally not wired into the UI or deployed by this change.

## Security properties

- Requires a Firebase Authentication ID token in `Authorization: Bearer <token>`.
- Verifies token signature, issuer and audience against Firebase Secure Token public keys for project `wale-491805`.
- Restricts browser origins to `https://hamlet-ai.co.uk` and `https://www.hamlet-ai.co.uk`.
- Accepts only `deal_copilot` and `listing_assistant` tasks.
- Limits prompt and context lengths; caps generation at 900 tokens.
- Does not query Firestore or accept record IDs as authority. The client must only send information the signed-in user is already entitled to access.
- AI responses are drafts only; no write/publish/transaction actions are implemented.
- API failures do not return provider error details to clients.

## Configure and test before deployment

1. Install Node.js and dependencies: `npm install`.
2. In the Cloudflare account that will host the Worker, create the secret without committing it:
   `npx wrangler secret put ANTHROPIC_API_KEY`
3. Confirm the Cloudflare account, billing controls and desired Worker name before deploying.
4. Add a Cloudflare rate-limiting rule for `POST /v1/assist` (per IP and, where available, per authenticated user) and configure spending alerts at the Anthropic account.
5. Run `npm run check` and `npm run dev`. Test missing/invalid Firebase tokens, blocked origins, both task types, oversized requests, and provider failures.
6. Deploy only after those tests and review: `npm run deploy`.
7. After deployment, configure the resulting Worker URL in Hamlet's frontend and integrate a user-approved UI. The URL is not yet connected to Hamlet.

## Request format

```json
{
  "task": "deal_copilot",
  "message": "Summarise the open risks and suggest the next three actions.",
  "context": "Only the deal notes this member is authorised to access."
}
```

Send the Firebase ID token in the Authorization header. Never send the Anthropic API key to the browser.

## Data handling

Only include the minimum context needed for the current request. Do not send identity documents, payment data, special-category personal data, or third-party contact details unless a separately approved data-protection assessment explicitly permits it. The Worker does not persist prompts or responses; operational error logs contain only status and the authenticated UID.
