# Hamlet AI Gateway

A separate Cloudflare Worker gateway for Hamlet's opt-in AI drafting tools. The frontend is connected through the Deal Copilot panel in the pipeline, the Listing Studio panel in Live Properties, and the standalone assistant page at `/app/hamlet/ai-assistant.html`. This configuration targets the staging Worker; it does not itself deploy the Worker.

## AI provider

- Uses the OpenAI Responses API at `https://api.openai.com/v1/responses`.
- Default model: `gpt-5.2-chat-latest`, matching the staging implementation currently verified end-to-end. The non-secret `AI_MODEL` Worker variable can override it., configurable with the non-secret `AI_MODEL` Worker variable.
- Requires an OpenAI API key stored as the Cloudflare Worker secret `OPENAI_API_KEY`. A ChatGPT subscription does not include API credits; API usage is billed separately through the OpenAI API platform.

## Security properties

- Requires a Firebase Authentication ID token in `Authorization: Bearer <token>`.
- Verifies token signature, issuer and audience against Firebase Secure Token public keys for project `wale-491805`.
- Restricts browser requests to the configured origin `https://www.hamlet-ai.co.uk`.
- Accepts only `deal_copilot` and `listing_assistant` tasks.
- Limits prompt and context lengths; caps generation at 900 output tokens.
- Sends `store: false` to the Responses API.
- Does not query Firestore or accept record IDs as authority. The client must only send information the signed-in user is already entitled to access.
- AI responses are drafts only; no write/publish/transaction actions are implemented.
- Provider failures return generic error messages to clients and do not log provider response bodies.

## Configure and test before deployment

1. Use a supported Node.js version and install dependencies from this directory with `npm install`. Wrangler `4.151.1` is pinned as a production dependency so it is available in deployment environments that omit development dependencies.
2. Create an API key in the [OpenAI API platform](https://platform.openai.com/api-keys). API billing and usage limits are managed separately from ChatGPT subscriptions.
3. In the Cloudflare account that will host the Worker, create the secret without committing it:
   `npx wrangler secret put OPENAI_API_KEY`
4. Confirm the Cloudflare account, API billing/usage limits and desired Worker name before deploying.
5. Add a Cloudflare rate-limiting rule for `POST /v1/assist` (per IP and, where available, per authenticated user) and configure OpenAI API usage alerts/limits.
6. Run `npm run check` and `npm run dev`. Test missing/invalid Firebase tokens, blocked origins, both task types, oversized requests, and provider failures.
7. Deploy only after those tests and review, from this directory, using `npm run deploy` (equivalent to `wrangler deploy` using the installed package).
8. After deployment, configure the resulting Worker URL in Hamlet's frontend and integrate a user-approved UI. The embedded and standalone frontends submit Firebase ID tokens and request bodies to the configured gateway URL. Test both tasks after any gateway code or model configuration change.

## Request format

```json
{
  "task": "deal_copilot",
  "message": "Summarise the open risks and suggest the next three actions.",
  "context": "Only the deal notes this member is authorised to access."
}
```

Send the Firebase ID token in the Authorization header. Never send the OpenAI API key to the browser.

## Data handling

Only include the minimum context needed for the current request. Do not send identity documents, payment data, special-category personal data, or third-party contact details unless a separately approved data-protection assessment explicitly permits it. The Worker sends `store: false` to the Responses API and does not write prompts or responses to Hamlet records. Provider response bodies and prompt text are not logged; upstream status/metadata may be logged for diagnostics. OpenAI API data handling is subject to the account's applicable API data controls and terms.
