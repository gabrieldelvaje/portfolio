# Private portfolio analytics

The footer year opens a native dialog. Authentication is performed by this Worker; no password, password hash or API signing secret is published in the static site. The frontend currently has an empty endpoint and shows an honest setup message. Collection is disabled until deployment.

## Activate once

Requires a Cloudflare account with Workers and D1. From this directory:

1. Run `npx wrangler login`.
2. Run `npx wrangler d1 create portfolio-analytics`, then set the returned database ID in `wrangler.toml`.
3. Run `npx wrangler d1 execute portfolio-analytics --remote --file=schema.sql`.
4. Run `npx wrangler secret put ADMIN_PASSWORD` and enter the eight-digit password selected by the owner in the private prompt. Do not put the password in a commit or command argument.
5. Run `npx wrangler secret put TOKEN_SECRET` and enter a random secret of at least 32 bytes. Repeat with a different secret for `VISITOR_SECRET`. Keep the visitor secret stable to preserve historical distinct counts.
6. Run `npx wrangler deploy`.
7. Set `window.PORTFOLIO_ANALYTICS_URL` in `../analytics-config.js` to the returned HTTPS Worker URL and publish that file.

Docs: https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/ and https://developers.cloudflare.com/workers/configuration/secrets/

## Definitions and limitations

- One page load is one visit; in-page navigation does not create additional visits.
- Unique visitor means anonymous browser ID saved in localStorage, hashed with a private server secret. Clearing browser storage, switching browser/device or unavailable storage can count the same person again. These are estimates, not identified people.
- Today, calendar week (Monday to Sunday), and calendar month use America/Sao_Paulo. Whole-period unique counts are calculated directly with COUNT(DISTINCT), not summed from daily counts. All-time totals begin at activation.
- Chart covers the last 7, 30 or 90 days including today; dates without visits are zero-filled.
- No IP, email, full URL, user agent, referrer or password is stored in the database. Cloudflare sees request IPs and uses them transiently for rate limits.
- Do Not Track and Global Privacy Control skip collection. The owner may exclude future visits from their browser after signing in. Previously collected visits remain included.
- Tokens expire after 30 minutes, exist only in memory, and are cleared on modal close/logout. Statistics responses are not cached. Login is limited to five attempts per minute per IP using the Workers rate limit binding.
- Origin checks and collection rate limits reduce accidental cross-site collection but cannot prevent spoofed events or all bots on a public website. Do not treat this as audited traffic.
- There is no way to reconstruct visitors from before activation. No mock data is displayed.

## Verification

Run `node --test analytics-backend/worker.test.mjs` and `python analytics-backend/check_counts.py` from the repository root. These cover authentication, expiry, disallowed origins, login throttling, calendar boundaries, idempotency and distinct counts. Production activation still needs a real Worker and D1 smoke test.
