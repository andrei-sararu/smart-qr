# Production readiness gates

Status: development branch, NOT approved for production.

- [ ] Auth0/OIDC configured; validate ID token/nonce, identity migration, revocation, MFA for administrators, browser flow and provider restrictions.
- [ ] Stripe SmartQR product catalog, checkout, verified idempotent webhooks, customer binding, entitlements, portal, invoice PDF, tax and refunds verified in test mode. The billing profile and account page are implemented, not payment processing.
- [ ] Public dynamic access feature gate, abuse reporting, rate limiting, phishing mitigation, operator suspension and monitoring.
- [ ] Privacy/terms/AUP, legal entity/tax data, retention and deletion/export procedures. Newsletter disabled for sends until verified sender and suppression sync.
- [ ] Run npm test, npm run check:ui, dependency install and production build; verify local Worker/D1 migration and smoke tests. CI must pass. 
- [ ] Staging end-to-end tests for QR scanning, billing, permissions, old printed menu URLs and migration compatibility.
- [ ] Configure permanent DNS/TLS, backups, restoration drill, alerts, uptime checks, rollback and incident owner.
- [ ] Pilot with actual customers before opening public paid signup.

Never publish based on a static code review alone. Do not merge this draft until verified.
