# Tablemint

Server-backed QR menus and table service for independent restaurants. Existing visual design retained from the initial preview.

## Available

- Platform-managed Sign in with ChatGPT; one restaurant per signed-in account.
- Owner-scoped menus in Cloudflare D1 with optimistic concurrency and draft/publish states.
- Product editor, CSV import, JPEG/PNG/WebP uploads to R2, manually entered translations in 16 languages (en, ro, de, es, fr, it, fi, sv, pl, pt, nl, el, da, no, cs, hu).
- Stable general menu link; 12 individual table codes, SVG downloads, disable/rotate controls.
- Guest waiter/bill requests, duplicate prevention, 4-second service-board polling, take/resolve flow and optional sound.
- 14-day Service trial, then Free (30 products). Paid plan limit: 1,000 products; up to 100 photo uploads / 100 MB per restaurant.
- Menu view counter, JSON data export.
- Stripe subscription checkout, signed webhooks and Customer Portal integration. Disabled unless configured; never simulates a payment or grants a paid plan from a client request.

## Not included

Order-taking, guest card payments, POS, fiscal devices, automatic PDF extraction, automatic translation, employee invitations, background push notifications and offline operation.

## Access and launch

Site sharing is public by owner instruction. Guest menus do not require login. Restaurant administration uses ChatGPT identity; public menus need anonymous site access enabled before a restaurant pilot. A custom domain does not change sharing.

Custom domain requested: qr.cotiso.co.uk. DNS validation and TLS are managed by the hosting provider.

## Stripe activation

Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in hosted runtime secrets, never source control. Start with test-mode keys and test a full subscription cycle before live payments. The webhook URL is https://qr.cotiso.co.uk/api/stripe/webhook (or the current working Site origin until DNS is ready).

Subscribe to checkout.session.completed, customer.subscription.created, customer.subscription.updated and customer.subscription.deleted. Enable cancellation and payment-method updates in Stripe's Customer Portal. Plan metadata is validated against price, interval and currency; current subscriptions are retrieved from Stripe before entitlements are updated. Stripe billing is site-wide; restaurants' own customer payment accounts are not part of this release.

## Development and verification

npm run db:generate — generate schema migrations after editing db/schema.ts.
node --test tests/backend.test.mjs — ownership, guest flow, duplicate/race handling, rate limits, billing disabled path and validation tests using SQLite.
node scripts/check-ui.mjs — validate both inline browser scripts without executing them.

Use the hosting project's standard build and preview helpers. D1 migrations live in drizzle/ and must be applied locally before preview; hosted publication applies them separately. Do not modify applied migrations.

## Company invoices

The subscription page stores the restaurant legal company name, registered address, country, postal code and optional company-registration/local-tax reference. Checkout collects VAT IDs using Stripe and requires a billing address. The owner-scoped invoice list exposes only invoices for the restaurant Stripe customer, with Stripe PDF and hosted invoice links. Configure the seller legal details, tax registration and applicable tax treatment in Stripe before live billing. This is not a domestic e-invoicing integration.

## Presentation and enquiries

The public presentation includes a local interactive phone/tablet simulation, illustrative restaurant/cafe/guesthouse examples, a 16-language preview, plan comparison, help centre, FAQs and factual data/service information. No customer endorsements or performance statistics are invented. The enquiry form stores real requests in D1 and does not send automatic email. Set SUPPORT_ADMIN_EMAIL to the operator verified sign-in email to expose the Enquiries tab; all inbox API routes verify this server-side. No support response SLA is promised. Seller identity and legal billing details still need to be supplied before paid launch.

## Growth presentation and operational insights

The conversion presentation adds a local automated product guide (rules, not an LLM or live agent), sourced external competitor case studies with clear ordering/payment scope differences, and a user-assumption sales scenario calculator. No Tablemint revenue uplift is claimed. Service pulse is owner-scoped and reports request volume, UTC hourly counts and median first-pickup time; legacy records without taken_at are excluded. Menu health checks information completeness, not allergen accuracy or legal compliance. Open requests are prioritised oldest first.

Styles embedded in the HTML route use .styles.txt?raw imports. Importing .css?raw into a Vinext route handler incorrectly adds an RSC wrapper around GET; preserve the text imports.
